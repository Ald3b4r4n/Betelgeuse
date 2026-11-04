/* Betelgeuse — content script (mundo ISOLADO).
 *
 * Roda nos sites de `src/sites.js` e faz três coisas:
 *  1. Filtro cosmético: oculta banners, overlays, iframes e slots de anúncio.
 *  2. Auto-skip: clica automaticamente em botões "skip/pular" de pre-roll.
 *  3. Telemetria local: conta itens ocultados, skips e popups barrados
 *     (estes últimos detectados pelo page script via evento DOM).
 *
 * O guard de `window.open` vive em `src/page.js`, que roda no mundo MAIN
 * como content script separado (manifest `world: "MAIN"`). O content script
 * liga a flag `data-betelgeuse-enabled` no <html> para o page script saber
 * se o toggle está ativo.
 *
 * Os seletores abaixo são heurísticos. Refine com o DOM real de cada site
 * conforme a Fase 0 do ROADMAP.
 */
(() => {
  'use strict';

  const STATS = { hidden: 0, skips: 0, popupsBlocked: 0 };
  const STYLE_ID = 'betelgeuse-css';
  const SKIP_TEXT =
    /skip|pular|pular (?:an[úu]ncio|propaganda)|skip ad|close ad|fechar (?:an[úu]ncio|propaganda)/i;
  const SKIP_TO_CONTENT_RE =
    /skip to (?:main )?content|pular para o (?:conte[úu]do|conteudo)/i;

  // Seletores cosméticos genéricos. Evitamos coisas como [class*="ad"] (daria
  // falso-positivo em "header", "load" etc.) e "iframe[src*=ads]" (casaria
  // "uploads"). Preferimos nomes de redes, caminhos de anúncio e classes
  // exatas.
  const AD_SELECTORS = [
    'iframe[src*="doubleclick"]',
    'iframe[src*="googlesyndication"]',
    'iframe[src*="googleadservices"]',
    'iframe[src*="exoclick"]',
    'iframe[src*="exosrv"]',
    'iframe[src*="trafficjunky"]',
    'iframe[src*="trafficstars"]',
    'iframe[src*="trafficfactory"]',
    'iframe[src*="juicyads"]',
    'iframe[src*="adsterra"]',
    'iframe[src*="clickadu"]',
    'iframe[src*="hilltopads"]',
    'iframe[src*="realsrv"]',
    'iframe[src*="popads"]',
    'iframe[src*="popcash"]',
    'iframe[src*="propeller"]',
    'iframe[src*="amazon-adsystem"]',
    'iframe[src*="media.net"]',
    'iframe[src*="revcontent"]',
    'iframe[src*="banner"]',
    'iframe[src*="sponsor"]',
    'iframe[src*="vast"]',
    'iframe[src*="vmap"]',
    'iframe[src*="adserver"]',
    'iframe[src*="adframe"]',
    'iframe[src*="/ad/"]',
    'iframe[src*="ads."]',
    'iframe[src*="ads/"]',
    '[id="ad"]',
    '[id="ads"]',
    '[id^="ad-"]',
    '[id$="-ad"]',
    '[id*="-ad-"]',
    '[class~="ad"]',
    '[class~="ads"]',
    '[class*="sponsored"]',
    '[class*="sponsor"]',
    '[class*="advertisement"]',
    '[class*="advert"]',
    '[id*="advert"]',
    '[class*="ad-overlay"]',
    '[class*="adOverlay"]',
    '[class*="video-ad"]',
    '[class*="videoAd"]',
    '[class*="preroll"]',
    '[class*="pre-roll"]',
    '[id*="preroll"]',
    '[id*="pre-roll"]',
    '[class*="ad-slot"]',
    '[class*="adSlot"]',
    '[class*="ad-unit"]',
    '[class*="adUnit"]',
    '[class*="ad-container"]',
    '[class*="adContainer"]',
    '[class*="ad-placeholder"]',
    '[class*="adPlaceholder"]',
    '[class*="native-ad"]',
    '[class*="nativeAd"]',
    '[class*="popunder"]',
    '[class*="adsbox"]',
    '[class*="ads-box"]',
    '[data-ad]',
    '[data-ad-slot]',
    '[data-google-query-id]',
    'ins.adsbygoogle',
    'div[id^="div-gpt-ad"]',
    '[id*="google_ads"]',
    '[class*="google-ad"]',
    '[id*="taboola"]',
    '[class*="taboola"]',
    '[id*="outbrain"]',
    '[class*="outbrain"]',
    '[id*="revcontent"]',
    '[class*="zergnet"]',
    'a[href*="exoclick"]',
    'a[href*="exosrv"]',
    'a[href*="trafficjunky"]',
    'a[href*="trafficstars"]',
    'a[href*="trafficfactory"]',
    'a[href*="juicyads"]',
    'a[href*="adsterra"]',
    'a[href*="clickadu"]',
    'a[href*="hilltopads"]',
    'a[href*="popads"]',
    'a[href*="popcash"]',
    'a[href*="propellerads"]',
    'a[href*="doubleclick"]',
    'a[href*="googlesyndication"]',
    'a[href*="googleadservices"]',
    'a[href*="realsrv"]',
    'a[href*="adnxs"]',
    'a[href*="criteo"]',
    'a[href*="taboola"]',
    'a[href*="outbrain"]',
    'a[href*="mgid"]'
  ];

  function cls(el) {
    const c = el.className;
    return typeof c === 'string' ? c : '';
  }

  function isVisible(el) {
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  }

  function hide(el) {
    if (!el || !(el instanceof Element)) return;
    if (el.dataset.betelgeuseHidden) return;
    el.dataset.betelgeuseHidden = '1';
    el.style.setProperty('display', 'none', 'important');
    STATS.hidden += 1;
  }

  function injectCss() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = AD_SELECTORS.map(
      (s) => `${s}{display:none!important}`
    ).join('\n');
    (document.head || document.documentElement).appendChild(style);
  }

  function sweep(scope) {
    // Se a página removeu o <style> (anti-adblock), recoloca.
    if (!document.getElementById(STYLE_ID)) injectCss();
    const root = scope instanceof Element ? scope : document;
    for (const sel of AD_SELECTORS) {
      let nodes;
      try {
        nodes = root.querySelectorAll(sel);
      } catch {
        continue; // Seletor inválido: ignora em vez de quebrar a varredura.
      }
      for (const n of nodes) hide(n);
    }
  }

  let scheduled = false;
  function scheduleSweep() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      sweep(document);
    }, 250);
  }

  function observe() {
    if (!document.documentElement) return;
    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const n of m.addedNodes) {
          if (n instanceof Element) {
            scheduleSweep();
            break;
          }
        }
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }

  // Clica em botões de "skip/pular" visíveis. Roda a cada 1s porque o botão
  // de skip costuma habilitar após alguns segundos de contagem regressiva.
  function autoSkip() {
    let nodes;
    try {
      nodes = document.querySelectorAll(
        'button, [role="button"], [class*="skip" i], [id*="skip" i], ' +
          '[aria-label*="skip" i], [title*="skip" i]'
      );
    } catch {
      return;
    }
    for (const el of nodes) {
      const label = ((el.innerText || el.textContent || '').trim()).slice(0, 60);
      if (SKIP_TO_CONTENT_RE.test(label)) continue;
      if (el.matches('.skip-link, [class*="skip-link" i]')) continue;

      const hint = `${el.id || ''} ${cls(el)} ${
        el.getAttribute('aria-label') || ''
      } ${el.getAttribute('title') || ''}`;
      const selfHint = /skip|preroll|pre-?roll/i.test(hint);
      if (!SKIP_TEXT.test(label) && !selfHint) continue;
      if (!isVisible(el)) continue;

      el.click();
      STATS.skips += 1;
      break; // Um clique por ciclo; o intervalo tenta de novo se preciso.
    }
  }

  function start() {
    // Sinaliza ao page script (mundo MAIN) que o toggle está ligado.
    if (document.documentElement) {
      document.documentElement.dataset.betelgeuseEnabled = '1';
    }
    injectCss();
    sweep(document);
    observe();
    setInterval(autoSkip, 1000);
    setInterval(() => sweep(document), 5000); // Rede de segurança.
  }

  document.addEventListener('betelgeuse-popup-blocked', () => {
    STATS.popupsBlocked += 1;
  });

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg && msg.type === 'betelgeuse-stats') sendResponse({ ...STATS });
    return true;
  });

  chrome.storage.local.get({ enabled: true }, (res) => {
    if (res && res.enabled !== false) start();
  });
})();
