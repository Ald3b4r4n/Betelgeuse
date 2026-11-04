/* Betelgeuse — service worker (módulo ES).
 *
 * Impede que visitas sensíveis permaneçam no histórico do navegador:
 *  - `chrome.history.onVisited`: apaga a visita assim que ela é registrada;
 *  - `onInstalled`/`onStartup`: varre o histórico inteiro em páginas de
 *    1.000 itens, do mais recente para o mais antigo, e apaga o que casar;
 *  - alarme periódico + rechecagem: cobre o caso em que o título da página
 *    só é conhecido depois do evento de visita;
 *  - `storage.onChanged`: ao religar o toggle, faz uma nova varredura.
 *
 * O que é apagado (quando o toggle está ligado):
 *  1. Visitas aos hosts de `src/sites.js` (sites adultos, contos/câmeras e
 *     redirecionadores conhecidos), por host exato ou subdomínio;
 *  2. Pesquisas em qualquer buscador com menção a "xvideos";
 *  3. Pesquisas/visitas com os termos sensíveis de `history-filter.js`
 *     (pornô, pornografia, sexo, sexual, erótico, inglês/gírias etc.);
 *  4. Títulos típicos de spam de notificação ("Click Allow").
 *
 * Todo o processamento é local e respeita o toggle liga/desliga
 * (quando desligado, nada é apagado).
 */

import { shouldBlock } from './history-filter.js';

// Alarme que revisa o histórico recente (o título chega depois da visita).
const SWEEP_ALARM = 'betelgeuse-history-sweep';
const SWEEP_PERIOD_MIN = 1;
const RECENT_WINDOW_MS = 15 * 60 * 1000;

// Rechecagens pontuais logo após a visita, quando o título ainda está vazio.
const RECHECK_DELAYS_MS = [3000, 10000];

// A API de histórico não tem offset; paginamos para trás usando o
// `lastVisitTime` do item mais antigo da página atual.
const PURGE_PAGE_SIZE = 1000;

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

// Varredura completa: instalação/atualização/inicialização e ao religar.
async function purgeAll() {
  if (!(await isEnabled())) return;

  let endTime = Date.now();
  while (endTime > 0) {
    const items = await searchHistory({
      text: '',
      maxResults: PURGE_PAGE_SIZE,
      startTime: 0,
      endTime
    });
    if (!items.length) break;

    const oldest = items.reduce((min, item) => {
      const t = Number(item.lastVisitTime) || 0;
      return t > 0 && t < min ? t : min;
    }, Number.POSITIVE_INFINITY);

    await purgeItems(items);

    // Menos que o limite significa que não há mais histórico para trás.
    if (items.length < PURGE_PAGE_SIZE) break;
    if (!Number.isFinite(oldest) || oldest <= 0) break;

    const nextEnd = oldest - 1;
    if (!Number.isFinite(nextEnd) || nextEnd >= endTime) break;
    endTime = nextEnd;
  }
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

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes.enabled) return;
  if (changes.enabled.newValue === false) {
    chrome.alarms.clear(SWEEP_ALARM, () => {
      void chrome.runtime.lastError;
    });
    return;
  }
  if (changes.enabled.newValue === true) {
    ensureAlarm();
    void purgeAll();
  }
});

function ensureAlarm() {
  void isEnabled().then((on) => {
    if (!on) {
      chrome.alarms.clear(SWEEP_ALARM, () => {
        void chrome.runtime.lastError;
      });
      return;
    }
    try {
      // Callback em vez de Promise: `chrome.alarms.get` só virou
      // promise-based no Chrome 111, mas o callback funciona em todas.
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
  });
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
