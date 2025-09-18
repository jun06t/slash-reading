document.addEventListener('DOMContentLoaded', async () => {
  const toggleEnabled = document.getElementById('toggle-enabled');
  const applySelection = document.getElementById('apply-selection');
  const modelSelect = document.getElementById('model-select');
  const cefrLevel = document.getElementById('cefr-level');
  const openOptions = document.getElementById('open-options');
  const statusSection = document.getElementById('status-section');
  const statusMessage = document.getElementById('status-message');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const response = await chrome.runtime.sendMessage({ action: 'GET_STATE' });
  toggleEnabled.checked = response.enabled;

  const settings = await chrome.runtime.sendMessage({ action: 'GET_SETTINGS' });
  if (settings.model) {
    modelSelect.value = settings.model;
  }
  if (settings.cefrLevel) {
    cefrLevel.value = settings.cefrLevel;
  }

  if (!settings.apiKey) {
    showStatus('API key not configured. Please go to settings.', 'error');
  }

  toggleEnabled.addEventListener('change', async () => {
    const enabled = toggleEnabled.checked;
    await chrome.runtime.sendMessage({
      action: 'SET_STATE',
      enabled: enabled
    });

    await chrome.tabs.sendMessage(tab.id, {
      action: 'TOGGLE',
      enabled: enabled
    }).catch(async (error) => {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      await chrome.tabs.sendMessage(tab.id, {
        action: 'TOGGLE',
        enabled: enabled
      });
    });

    showStatus(enabled ? 'Slash reading enabled' : 'Slash reading disabled', 'success');
  });

  applySelection.addEventListener('click', async () => {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        action: 'PROCESS_SELECTION'
      });
      showStatus('Processing selection...', 'info');
    } catch (error) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      await chrome.tabs.sendMessage(tab.id, {
        action: 'PROCESS_SELECTION'
      });
      showStatus('Processing selection...', 'info');
    }
  });

  modelSelect.addEventListener('change', async () => {
    await chrome.storage.sync.set({ model: modelSelect.value });
    showStatus('Model updated', 'success');
  });

  cefrLevel.addEventListener('change', async () => {
    await chrome.storage.sync.set({ cefrLevel: cefrLevel.value });
    showStatus('Reading level updated', 'success');
  });

  openOptions.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message status-${type}`;
    statusSection.style.display = 'block';

    setTimeout(() => {
      statusSection.style.display = 'none';
    }, 3000);
  }
});