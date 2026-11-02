/* XV AdBlock — popup: toggle liga/desliga + estatísticas da aba atual. */
(() => {
  'use strict';

  const toggle = document.getElementById('enabled');
  const elHidden = document.getElementById('stat-hidden');
  const elSkips = document.getElementById('stat-skips');
  const elPopups = document.getElementById('stat-popups');

  chrome.storage.local.get({ enabled: true }, (res) => {
    toggle.checked = !res || res.enabled !== false;
  });

  toggle.addEventListener('change', () => {
    chrome.storage.local.set({ enabled: toggle.checked }, () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const id = tabs && tabs[0] ? tabs[0].id : undefined;
        if (id !== undefined) {
          chrome.tabs.reload(id, () => {
            if (chrome.runtime.lastError) {
              /* Aba sem permissão (ex.: chrome://): ignora o reload. */
            }
          });
        }
      });
      window.close();
    });
  });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const id = tabs && tabs[0] ? tabs[0].id : undefined;
    if (id === undefined) return;
    chrome.tabs.sendMessage(id, { type: 'xv-stats' }, (resp) => {
      if (chrome.runtime.lastError || !resp) return; // Fora do xvideos: mantém "–".
      elHidden.textContent = String(resp.hidden);
      elSkips.textContent = String(resp.skips);
      elPopups.textContent = String(resp.popupsBlocked);
    });
  });
})();
