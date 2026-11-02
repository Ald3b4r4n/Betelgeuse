/* Betelgeuse — service worker (background).
 *
 * Impede que visitas sensíveis permaneçam no histórico do navegador:
 *  - `chrome.history.onVisited`: apaga cada visita correspondente assim
 *    que ela é registrada;
 *  - `onInstalled`/`onStartup`: limpa entradas pré-existentes correspondentes.
 *
 * O que é apagado (quando o toggle está ligado):
 *  1. Visitas ao xvideos.com (host exato ou subdomínio);
 *  2. Pesquisas em qualquer buscador com menção a "xvideos"
 *     (termo no parâmetro de busca, na URL ou no título);
 *  3. Pesquisas com "conto(s) erótico(s)" e variações
 *     (conto/contos + erótico/erótica/eróticos/eróticas, com ou sem
 *     acento, em qualquer ordem) e visitas a sites com essas variações
 *     na URL ou no título.
 *
 * Todo o processamento é local e respeita o toggle liga/desliga
 * (quando desligado, nada é apagado).
 */
(() => {
  'use strict';

  const HOST_SUFFIX = 'xvideos.com';

  // Parâmetros de busca usados pelos buscadores mais comuns
  // (Google/Bing/DuckDuckGo/Brave/Ecosia = `q`; Yahoo = `p`;
  // Startpage = `query`; outros = `text`/`search`).
  const SEARCH_PARAMS = ['q', 'query', 'text', 'search', 'p'];

  // Termos para a limpeza de entradas pré-existentes via history.search.
  const PURGE_QUERIES = [
    HOST_SUFFIX,
    'xvideos',
    'conto erotico',
    'contos eroticos',
    'conto erotica',
    'erotico'
  ];

  // Normaliza para comparação: minúsculas, decodifica %XX e `+`,
  // remove acentos. Assim "Eróticos" == "eroticos".
  function normalize(str) {
    let s = String(str || '').toLowerCase();
    try {
      s = decodeURIComponent(s.replace(/\+/g, ' '));
    } catch {
      s = s.replace(/\+/g, ' ');
    }
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  // conto/contos + erotico/erotica/eroticos/eroticas, em qualquer ordem.
  // `\b` cobre espaços, `+`, `-`, `_`, `/` (slugs como /contos-eroticos/).
  const EROTIC_TALE_RE =
    /\bcontos?\b.*\berotic[ao]s?\b|\berotic[ao]s?\b.*\bcontos?\b/;

  function containsEroticTale(normalizedText) {
    return EROTIC_TALE_RE.test(normalizedText || '');
  }

  function isTargetHost(url) {
    try {
      const host = new URL(url).hostname.toLowerCase();
      return host === HOST_SUFFIX || host.endsWith(`.${HOST_SUFFIX}`);
    } catch {
      return false;
    }
  }

  // Junta os parâmetros de busca da URL (já decodificados) em um texto só.
  function getSearchText(urlObj) {
    const parts = [];
    try {
      for (const key of SEARCH_PARAMS) {
        const vals = urlObj.searchParams.getAll(key);
        for (const v of vals) {
          if (v) parts.push(v);
        }
      }
    } catch {
      // URL sem query legível: segue sem texto de busca.
    }
    return parts.join(' ');
  }

  // Decisão central: esta visita deve sumir do histórico?
  function shouldBlock(url, title) {
    if (!url) return false;
    if (isTargetHost(url)) return true;
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch {
      return false;
    }
    const normUrl = normalize(urlObj.href);
    const normTitle = normalize(title || '');
    const normQuery = normalize(getSearchText(urlObj));
    if (
      normUrl.includes('xvideos') ||
      normTitle.includes('xvideos') ||
      normQuery.includes('xvideos')
    ) {
      return true;
    }
    return (
      containsEroticTale(normUrl) ||
      containsEroticTale(normTitle) ||
      containsEroticTale(normQuery)
    );
  }

  async function isEnabled() {
    try {
      const res = await chrome.storage.local.get({ enabled: true });
      return !res || res.enabled !== false;
    } catch {
      return true;
    }
  }

  async function deleteUrl(url) {
    try {
      await chrome.history.deleteUrl({ url });
    } catch {
      // URL já ausente ou histórico indisponível: nada a fazer.
    }
  }

  chrome.history.onVisited.addListener((item) => {
    if (item && item.url && shouldBlock(item.url, item.title)) {
      isEnabled().then((on) => {
        if (on) void deleteUrl(item.url);
      });
    }
  });

  async function purgeExisting() {
    if (!(await isEnabled())) return;
    const seen = new Set();
    for (const text of PURGE_QUERIES) {
      let items;
      try {
        items = await chrome.history.search({
          text,
          maxResults: 1000,
          startTime: 0
        });
      } catch {
        continue;
      }
      for (const item of items || []) {
        if (!item.url || seen.has(item.url)) continue;
        seen.add(item.url);
        if (shouldBlock(item.url, item.title)) await deleteUrl(item.url);
      }
    }
  }

  chrome.runtime.onInstalled.addListener(() => {
    void purgeExisting();
  });

  chrome.runtime.onStartup.addListener(() => {
    void purgeExisting();
  });
})();
