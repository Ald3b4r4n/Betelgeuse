/* XV AdBlock — content script (mundo ISOLADO).
 *
 * Roda em todas as páginas de *.xvideos.com e faz três coisas:
 *  1. Filtro cosmético: oculta banners, overlays, iframes e slots de anúncio.
 *  2. Auto-skip: clica automaticamente em botões "skip/pular" de pre-roll.
 *  3. Telemetria local: conta itens ocultados, skips e popups barrados
 *     (estes últimos detectados pelo page script via evento DOM).
 *
 * NOTA: este script NÃO enxerga as variáveis JS da página (mundo isolado).
 * O bloqueio de `window.open` vive em `src/page.js`, injetado no mundo MAIN.
 *
 * Os seletores abaixo são um conjunto inicial HEURÍSTICO. A Fase 0 do
 * ROADMAP (inspeção real com DevTools) deve refiná-los com seletores
 * observados no DOM real do site.
 */
(() => {
  'use strict';

  const STATS = { hidden: 0, skips: 0, popupsBlocked: 0 };
  const STYLE_ID = 'xv-adblock-css';
  const SKIP_TEXT = /skip|pular/i;

  // Seletores cosméticos genéricos. Propositalmente conservadores:
  // nada como [class*="ad"], que daria falso-positivo em "header", "load" etc.
  const AD_SELECTORS = [
    'iframe[src*="ads"]',
    'iframe[src*="doubleclick"]',
    'iframe[src*="exoclick"]',
    'iframe[src*="trafficjunky"]',
    'iframe[src*="trafficstars"]',
    'iframe[src*="banner"]',
    'iframe[src*="sponsor"]',
    'iframe[src*="vast"]',
    '[id="ad"]',
    '[id="ads"]',
    '[id^="ad-"]',
    '[id$="-ad"]',
    '[id*="-ad-"]',
    '[class*="sponsored"]',
    '[class*="advertisement"]',
    '[class*="ad-overlay"]',
    '[class*="adOverlay"]',
    '[class*="video-ad"]',
    '[class*="videoAd"]',
    '[class*="preroll"]',
    '[class*="pre-roll"]',
    '[class*="ad-slot"]',
    '[class*="adSlot"]',
    '[class*="ad-container"]',
    '[class*="adContainer"]',
    'a[href*="exoclick"]',
    'a[href*="trafficjunky"]',
    'a[href*="trafficstars"]',
    'a[href*="popads"]',
    'a[href*="popcash"]',
    'a[href*="doubleclick"]'
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
    if (el.dataset.xvHidden) return;
    el.dataset.xvHidden = '1';
    el.style.setProperty('display', 'none', 'important');
    STATS.hidden += 1;
  }

  function injectCss() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = AD_SELECTORS.map((s) => `${s}{display:none!important}`).join('\n');
    (document.head || document.documentElement).appendChild(style);
  }

  // Injeta o page script (mundo MAIN) para conter window.open abusivo.
  function injectPageScript() {
    try {
      const s = document.createElement('script');
      s.src = chrome.runtime.getURL('src/page.js');
      s.onload = () => s.remove();
      (document.head || document.documentElement).appendChild(s);
    } catch {
      // Sem acesso a chrome.runtime (página restrita): segue sem page script.
    }
  }

  function sweep(scope) {
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
        'button, a, [role="button"], [class*="skip" i], [id*="skip" i]'
      );
    } catch {
      return;
    }
    for (const el of nodes) {
      const label = ((el.innerText || el.textContent || '').trim()).slice(0, 40);
      const selfHint = /skip/i.test(`${el.id} ${cls(el)}`);
      if (!SKIP_TEXT.test(label) && !selfHint) continue;
      if (!isVisible(el)) continue;
      el.click();
      STATS.skips += 1;
      break; // Um clique por ciclo; o intervalo tenta de novo se preciso.
    }
  }

  function start() {
    injectCss();
    injectPageScript();
    sweep(document);
    observe();
    setInterval(autoSkip, 1000);
    setInterval(() => sweep(document), 5000); // Rede de segurança.
  }

  document.addEventListener('xv-popup-blocked', () => {
    STATS.popupsBlocked += 1;
  });

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg && msg.type === 'xv-stats') sendResponse({ ...STATS });
    return true;
  });

  chrome.storage.local.get({ enabled: true }, (res) => {
    if (res && res.enabled !== false) start();
  });
})();
