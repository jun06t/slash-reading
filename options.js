document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('api-key');
  const modelSelect = document.getElementById('model');
  const customModelInput = document.getElementById('custom-model');
  const cefrLevelSelect = document.getElementById('cefr-level');
  const minWordsSelect = document.getElementById('min-words');
  const maxWordsSelect = document.getElementById('max-words');
  const maxTokensInput = document.getElementById('max-tokens');
  const slashColorInput = document.getElementById('slash-color');
  const slashColorTextInput = document.getElementById('slash-color-text');
  const displayMethodSelect = document.getElementById('display-method');
  const targetSelectorInput = document.getElementById('target-selector');
  const excludeSelectorInput = document.getElementById('exclude-selector');
  const dynamicMonitoringInput = document.getElementById('dynamic-monitoring');
  const clearCacheBtn = document.getElementById('clear-cache');
  const cacheSizeSpan = document.getElementById('cache-size');
  const saveBtn = document.getElementById('save');
  const resetBtn = document.getElementById('reset');
  const statusDiv = document.getElementById('status');

  const defaultSettings = {
    apiKey: '',
    model: 'gpt-4o-mini',
    customModel: '',
    cefrLevel: 'B1',
    minWords: 4,
    maxWords: 6,
    maxTokensPerBatch: 1000,
    slashColor: '#0066cc',
    displayMethod: 'css',
    targetSelector: '',
    excludeSelector: 'script, style, code, pre, a',
    dynamicPageMonitoring: false
  };

  async function loadSettings() {
    const settings = await chrome.storage.sync.get(Object.keys(defaultSettings));
    const merged = { ...defaultSettings, ...settings };

    apiKeyInput.value = merged.apiKey;
    modelSelect.value = merged.model;
    customModelInput.value = merged.customModel || '';
    cefrLevelSelect.value = merged.cefrLevel;
    minWordsSelect.value = merged.minWords;
    maxWordsSelect.value = merged.maxWords;
    maxTokensInput.value = merged.maxTokensPerBatch;
    slashColorInput.value = merged.slashColor;
    slashColorTextInput.value = merged.slashColor;
    displayMethodSelect.value = merged.displayMethod;
    targetSelectorInput.value = merged.targetSelector;
    excludeSelectorInput.value = merged.excludeSelector;
    dynamicMonitoringInput.checked = merged.dynamicPageMonitoring;

    await updateCacheSize();
  }

  async function saveSettings() {
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      showStatus('APIキーは必須です', 'error');
      return;
    }

    if (!apiKey.startsWith('sk-') && apiKey !== 'mock') {
      showStatus('APIキーの形式が正しくありません（sk-で始まる必要があります）', 'error');
      return;
    }

    const settings = {
      apiKey: apiKey,
      model: customModelInput.value.trim() || modelSelect.value,
      customModel: customModelInput.value.trim(),
      cefrLevel: cefrLevelSelect.value,
      minWords: parseInt(minWordsSelect.value),
      maxWords: parseInt(maxWordsSelect.value),
      maxTokensPerBatch: parseInt(maxTokensInput.value),
      slashColor: slashColorInput.value,
      displayMethod: displayMethodSelect.value,
      targetSelector: targetSelectorInput.value.trim(),
      excludeSelector: excludeSelectorInput.value.trim(),
      dynamicPageMonitoring: dynamicMonitoringInput.checked
    };

    await chrome.storage.sync.set(settings);
    showStatus('設定を正常に保存しました', 'success');
  }

  async function resetSettings() {
    await chrome.storage.sync.set(defaultSettings);
    await loadSettings();
    showStatus('設定をデフォルトにリセットしました', 'success');
  }

  async function clearCache() {
    await chrome.storage.local.remove('responseCache');
    await updateCacheSize();
    showStatus('キャッシュをクリアしました', 'success');
  }

  async function updateCacheSize() {
    const cache = await chrome.storage.local.get('responseCache');
    const size = cache.responseCache ? new Blob([JSON.stringify(cache.responseCache)]).size : 0;
    const sizeInMB = (size / (1024 * 1024)).toFixed(2);
    cacheSizeSpan.textContent = `キャッシュサイズ: ${sizeInMB} MB / 20 MB`;
  }

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status status-${type}`;
    statusDiv.style.display = 'block';

    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }

  slashColorInput.addEventListener('input', () => {
    slashColorTextInput.value = slashColorInput.value;
  });

  slashColorTextInput.addEventListener('input', () => {
    if (/^#[0-9A-Fa-f]{6}$/.test(slashColorTextInput.value)) {
      slashColorInput.value = slashColorTextInput.value;
    }
  });

  // CEFRレベル変更時に推奨単語数を設定
  cefrLevelSelect.addEventListener('change', () => {
    const levelDefaults = {
      'A1': { min: 2, max: 3 },
      'A2': { min: 3, max: 4 },
      'B1': { min: 4, max: 6 },
      'B2': { min: 5, max: 8 },
      'custom': null
    };

    const defaults = levelDefaults[cefrLevelSelect.value];
    if (defaults) {
      minWordsSelect.value = defaults.min;
      maxWordsSelect.value = defaults.max;
    }
  });

  // 最小/最大値の整合性チェック
  minWordsSelect.addEventListener('change', () => {
    if (parseInt(minWordsSelect.value) > parseInt(maxWordsSelect.value)) {
      maxWordsSelect.value = minWordsSelect.value;
    }
  });

  maxWordsSelect.addEventListener('change', () => {
    if (parseInt(maxWordsSelect.value) < parseInt(minWordsSelect.value)) {
      minWordsSelect.value = maxWordsSelect.value;
    }
  });

  customModelInput.addEventListener('input', () => {
    if (customModelInput.value.trim()) {
      modelSelect.disabled = true;
    } else {
      modelSelect.disabled = false;
    }
  });

  saveBtn.addEventListener('click', saveSettings);
  resetBtn.addEventListener('click', resetSettings);
  clearCacheBtn.addEventListener('click', clearCache);

  await loadSettings();
});