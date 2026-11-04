/* Betelgeuse — page script (mundo MAIN da página).
 *
 * Roda como content script separado (manifest `world: "MAIN"`) para conter
 * `window.open` abusivo (popups/popunders disparados por cliques em anúncios
 * ou overlays do player). O content script isolado liga a flag
 * `data-betelgeuse-enabled` no <html> quando o toggle está ativo; sem ela o
 * guard não interfere na navegação normal.
 *
 * Heurística (conservadora de propósito):
 *  - Bloqueia se o destino parece URL de ad-server, OU
 *  - Bloqueia se o clique que originou a chamada partiu de um elemento
 *    com cara de anúncio. Caso contrário, delega ao `window.open` original.
 */
(() => {
  'use strict';

  const AD_HINT =
    /(^|[._\-/\s?&=:])(ad|ads|advert\w*|banner|sponsor\w*|promo|popup|popunder|overlay|vast|vmap|preroll|pre-?roll)([._\-/\s?&=:]|$)|exoclick|exosrv|trafficjunky|trafficstars|trafficfactory|juicyads|adsterra|clickadu|hilltopads|realsrv|popads|popcash|propellerads|doubleclick|googlesyndication|googleadservices|adnxs|criteo|taboola|outbrain|mgid|amazon-adsystem|media\.net|revcontent|zergnet/i;

  function enabled() {
    const root = document.documentElement;
    return !!root && root.dataset.betelgeuseEnabled === '1';
  }

  function elText(el) {
    const c = el.className;
    const klass = typeof c === 'string' ? c : '';
    return `${el.id || ''} ${klass} ${el.getAttribute('href') || ''} ${
      el.getAttribute('src') || ''
    }`;
  }

  let suspiciousClickUntil = 0;

  document.addEventListener(
    'click',
    (e) => {
      const t = e.target;
      if (t instanceof Element) {
        const link = t.closest('a');
        const hay = elText(t) + (link && link !== t ? ` ${elText(link)}` : '');
        if (AD_HINT.test(hay)) suspiciousClickUntil = Date.now() + 2000;
      }
    },
    true
  );

  const rawOpen = window.open.bind(window);

  window.open = function betelgeuseGuardedOpen(url, target, features) {
    if (!enabled()) return rawOpen(url, target, features);

    const dest = url === undefined || url === null ? '' : String(url);
    if (Date.now() < suspiciousClickUntil || (dest !== '' && AD_HINT.test(dest))) {
      document.dispatchEvent(new CustomEvent('betelgeuse-popup-blocked'));
      return null;
    }
    return rawOpen(url, target, features);
  };
})();
