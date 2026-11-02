/* Betelgeuse — service worker (background).
 *
 * Impede que visitas ao xvideos.com permaneçam no histórico do navegador:
 *  - `chrome.history.onVisited`: apaga cada visita ao domínio-alvo assim
 *    que ela é registrada;
 *  - `onInstalled`/`onStartup`: limpa entradas pré-existentes do domínio.
 *
 * Atua SOMENTE em URLs do xvideos.com e respeita o toggle liga/desliga
 * (quando desligado, nada é apagado). Todo o processamento é local.
 */
(() => {
  'use strict';

  const HOST_SUFFIX = 'xvideos.com';

  function isTarget(url) {
    try {
      const host = new URL(url).hostname.toLowerCase();
      return host === HOST_SUFFIX || host.endsWith(`.${HOST_SUFFIX}`);
    } catch {
      return false;
    }
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
    if (item && item.url && isTarget(item.url)) {
      isEnabled().then((on) => {
        if (on) void deleteUrl(item.url);
      });
    }
  });

  async function purgeExisting() {
    if (!(await isEnabled())) return;
    let items;
    try {
      items = await chrome.history.search({
        text: HOST_SUFFIX,
        maxResults: 1000,
        startTime: 0
      });
    } catch {
      return;
    }
    for (const item of items || []) {
      if (item.url && isTarget(item.url)) await deleteUrl(item.url);
    }
  }

  chrome.runtime.onInstalled.addListener(() => {
    void purgeExisting();
  });

  chrome.runtime.onStartup.addListener(() => {
    void purgeExisting();
  });
})();
