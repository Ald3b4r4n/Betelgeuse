/* Betelgeuse — page script (mundo MAIN da página).
 *
 * Injetado via <script> pelo content script porque content scripts rodam em
 * mundo isolado e NÃO conseguem interceptar o `window.open` visto pelos
 * scripts da página. Este arquivo roda no mesmo contexto da página e contém
 * `window.open` abusivo (popups/popunders disparados por cliques em
 * anúncios ou overlays do player).
 *
 * Heurística (conservadora de propósito):
 *  - Bloqueia se o destino parece URL de ad-server, OU
 *  - Bloqueia se o clique que originou a chamada partiu de um elemento
 *    com cara de anúncio. Caso contrário, delega ao `window.open` original.
 */
(() => {
  'use strict';

  const AD_HINT =
    /(^|[-_\s])(ad|ads|advert|banner|sponsor|promo|popup|popunder|overlay|vast|preroll|pre-?roll)([-_\s]|$)|exoclick|trafficjunky|trafficstars|popads|popcash|doubleclick|googlesyndication|taboola|outbrain|mgid|criteo|propellerads|adnxs/i;

  function elText(el) {
    const c = el.className;
    const klass = typeof c === 'string' ? c : '';
    return `${el.id || ''} ${klass} ${el.getAttribute('href') || ''} ${el.getAttribute('src') || ''}`;
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

  window.open = function xvGuardedOpen(url, target, features) {
    const dest = url === undefined || url === null ? '' : String(url);
    if (Date.now() < suspiciousClickUntil || (dest !== '' && AD_HINT.test(dest))) {
      document.dispatchEvent(new CustomEvent('xv-popup-blocked'));
      return null;
    }
    return rawOpen(url, target, features);
  };
})();
