document.addEventListener('DOMContentLoaded', async () => {
  const toggleEnabled = document.getElementById('toggle-enabled');
  const applySelection = document.getElementById('apply-selection');
  const modelSelect = document.getElementById('model-select');
  const cefrLevel = document.getElementById('cefr-level');
  const openOptions = document.getElementById('open-options');
  const statusSection = document.getElementById('status-section');
  const statusMessage = document.getElementById('status-message');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Check if tab exists and is valid
  if (!tab || !tab.id) {
    showStatus('このページでは使用できません', 'error');
    toggleEnabled.disabled = true;
    applySelection.disabled = true;
    return;
  }

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
    showStatus('APIキーが設定されていません。設定を確認してください。', 'error');
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
        files: ['content-progressive.js']
      });

      await chrome.tabs.sendMessage(tab.id, {
        action: 'TOGGLE',
        enabled: enabled
      });
    });

    showStatus(enabled ? 'スラッシュリーディングを有効化しました' : 'スラッシュリーディングを無効化しました', 'success');
  });

  applySelection.addEventListener('click', async () => {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        action: 'PROCESS_SELECTION'
      });
      showStatus('選択部分を処理中...', 'info');
    } catch (error) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content-progressive.js']
      });

      await chrome.tabs.sendMessage(tab.id, {
        action: 'PROCESS_SELECTION'
      });
      showStatus('選択部分を処理中...', 'info');
    }
  });

  modelSelect.addEventListener('change', async () => {
    await chrome.storage.sync.set({ model: modelSelect.value });
    showStatus('モデルを更新しました', 'success');
  });

  cefrLevel.addEventListener('change', async () => {
    await chrome.storage.sync.set({ cefrLevel: cefrLevel.value });
    showStatus('読解レベルを更新しました', 'success');
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