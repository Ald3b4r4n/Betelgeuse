/* Betelgeuse — service worker (background).
 *
 * Impede que visitas sensíveis permaneçam no histórico do navegador:
 *  - `chrome.history.onVisited`: apaga a visita assim que ela é registrada;
 *  - `onInstalled`/`onStartup`: varre o histórico inteiro e apaga o que casar;
 *  - alarme periódico + rechecagem: cobre o caso em que o título da página
 *    só é conhecido depois do evento de visita (por isso algumas entradas
 *    "escapavam" da versão 0.3.0).
 *
 * O que é apagado (quando o toggle está ligado):
 *  1. Visitas aos domínios listados em `BLOCKED_HOSTS` (host exato ou
 *     subdomínio): xvideos.com e os sites de contos/câmeras observados;
 *  2. Pesquisas em qualquer buscador com menção a "xvideos"
 *     (termo no parâmetro de busca, na URL ou no título);
 *  3. Pesquisas/visitas com "conto(s) erótico(s)" e variações
 *     (conto/contos + erótico/erótica/eróticos/eróticas, com ou sem
 *     acento, em qualquer ordem, inclusive colados — "contoseroticos");
 *  4. Páginas de redirecionamento/popup observadas (`BLOCKED_REDIRECT_HOSTS`)
 *     e títulos típicos de spam de notificação ("Click Allow").
 *
 * Todo o processamento é local e respeita o toggle liga/desliga
 * (quando desligado, nada é apagado).
 */
(() => {
  'use strict';

  // Hosts cujo histórico é sempre apagado (host exato ou subdomínio).
  const BLOCKED_HOSTS = [
    'xvideos.com',
    'contoseroticos.com',
    'meuscontoseroticos.com',
    'contoseroticoscnn.com',
    'casadoscontos.com.br',
    'cameraprive.com'
  ];

  // Intermediários de redirecionamento/popup que aparecem no caminho das
  // visitas acima (domínios voláteis: a lista pode ser estendida).
  const BLOCKED_REDIRECT_HOSTS = [
    'ethnicexpressions.org',
    'bondeddarkenedswerve.com',
    'betawatchhq.it.com'
  ];

  // Parâmetros de busca usados pelos buscadores mais comuns
  // (Google/Bing/DuckDuckGo/Brave/Ecosia = `q`; Yahoo = `p`;
  // Startpage = `query`; outros = `text`/`search`).
  const SEARCH_PARAMS = ['q', 'query', 'text', 'search', 'p'];

  // Alarme que revisa o histórico recente (o título chega depois da visita).
  const SWEEP_ALARM = 'betelgeuse-history-sweep';
  const SWEEP_PERIOD_MIN = 1;
  const RECENT_WINDOW_MS = 15 * 60 * 1000;

  // Rechecagens pontuais logo após a visita, quando o título ainda está vazio.
  const RECHECK_DELAYS_MS = [3000, 10000];

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
  // A terceira alternativa cobre slugs/domínios sem separador, como
  // "contoseroticos.com" (não há `\b` entre "contos" e "eroticos").
  const EROTIC_TALE_RE =
    /\bcontos?\b.*\berotic[ao]s?\b|\berotic[ao]s?\b.*\bcontos?\b|contos?erotic[ao]s?/;

  // "xvideos" como palavra (evita falsos positivos como "notxvideos.com",
  // mas casa com "xvideos", "xvideos-br", "www.xvideos.com").
  const XVIDEOS_RE = /\bxvideos/;

  // Títulos típicos de spam de notificação/popup (sem ambiguidade).
  const SPAM_TITLE_RE =
    /^click\W*allow\b|^clique\s+(?:em\s+)?\W*permitir\b|^wait a moment, loading/;

  function containsEroticTale(normalizedText) {
    return EROTIC_TALE_RE.test(normalizedText || '');
  }

  function hostMatches(host, suffix) {
    return host === suffix || host.endsWith(`.${suffix}`);
  }

  function isBlockedHost(host) {
    return (
      BLOCKED_HOSTS.some((h) => hostMatches(host, h)) ||
      BLOCKED_REDIRECT_HOSTS.some((h) => hostMatches(host, h))
    );
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
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch {
      return false;
    }
    const host = urlObj.hostname.toLowerCase();
    if (isBlockedHost(host)) return true;

    const normUrl = normalize(urlObj.href);
    const normTitle = normalize(title || '');
    const normQuery = normalize(getSearchText(urlObj));
    if (
      XVIDEOS_RE.test(normUrl) ||
      XVIDEOS_RE.test(normTitle) ||
      XVIDEOS_RE.test(normQuery)
    ) {
      return true;
    }
    if (SPAM_TITLE_RE.test(normTitle)) return true;
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

  async function searchHistory(options) {
    try {
      const items = await chrome.history.search(options);
      return items || [];
    } catch {
      return [];
    }
  }

  // Apaga o que casar dentro de uma lista de itens de histórico.
  async function purgeItems(items) {
    for (const item of items) {
      if (item && item.url && shouldBlock(item.url, item.title)) {
        await deleteUrl(item.url);
      }
    }
  }

  // Varredura completa: instalação/atualização/inicialização do navegador.
  async function purgeAll() {
    if (!(await isEnabled())) return;
    await purgeItems(
      await searchHistory({ text: '', maxResults: 10000, startTime: 0 })
    );
  }

  // Varredura curta: revisa os últimos minutos (títulos que chegaram tarde).
  async function sweepRecent() {
    if (!(await isEnabled())) return;
    await purgeItems(
      await searchHistory({
        text: '',
        maxResults: 500,
        startTime: Date.now() - RECENT_WINDOW_MS
      })
    );
  }

  // Relê o título já gravado para esta URL e reavalia a visita.
  async function recheck(url) {
    if (!(await isEnabled())) return;
    const items = await searchHistory({
      text: url,
      maxResults: 20,
      startTime: 0
    });
    const item = items.find((i) => i.url === url);
    if (item && shouldBlock(item.url, item.title)) await deleteUrl(item.url);
  }

  function scheduleRecheck(url) {
    for (const delay of RECHECK_DELAYS_MS) {
      setTimeout(() => {
        void recheck(url);
      }, delay);
    }
  }

  chrome.history.onVisited.addListener((item) => {
    if (!item || !item.url) return;
    if (shouldBlock(item.url, item.title)) {
      isEnabled().then((on) => {
        if (on) void deleteUrl(item.url);
      });
      return;
    }
    // Sem título no evento: a decisão por título ainda não é possível.
    if (!item.title) scheduleRecheck(item.url);
  });

  function ensureAlarm() {
    try {
      // Callback em vez de Promise: `chrome.alarms.get` só virou
      // promise-based no Chrome 111 e o manifest declara 88.
      chrome.alarms.get(SWEEP_ALARM, (existing) => {
        if (chrome.runtime.lastError) return;
        if (!existing) {
          chrome.alarms.create(SWEEP_ALARM, {
            periodInMinutes: SWEEP_PERIOD_MIN
          });
        }
      });
    } catch {
      // Sem permissão de alarmes: a rechecagem pontual continua valendo.
    }
  }

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm && alarm.name === SWEEP_ALARM) void sweepRecent();
  });

  chrome.runtime.onInstalled.addListener(() => {
    ensureAlarm();
    void purgeAll();
  });

  chrome.runtime.onStartup.addListener(() => {
    ensureAlarm();
    void purgeAll();
  });

  // Garante o alarme também quando o worker acorda por qualquer evento.
  ensureAlarm();
})();
