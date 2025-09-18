import { callOpenAI } from './lib/api.js';
import { getStorage, setStorage } from './lib/storage.js';
import { RequestQueue } from './lib/queue.js';

const requestQueue = new RequestQueue();
const tabStates = new Map();

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'toggle-page',
    title: 'Toggle Slash Reading (Page)',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'apply-selection',
    title: 'Apply Slash Reading (Selection)',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'toggle-page') {
    await toggleTabState(tab.id);
  } else if (info.menuItemId === 'apply-selection') {
    await processSelection(tab.id);
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (command === 'toggle_page') {
    await toggleTabState(tab.id);
  } else if (command === 'process_selection') {
    await processSelection(tab.id);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender, sendResponse);
  return true;
});

async function handleMessage(request, sender, sendResponse) {
  try {
    switch (request.action) {
      case 'GET_STATE':
        const state = tabStates.get(sender.tab.id) || false;
        sendResponse({ enabled: state });
        break;

      case 'SET_STATE':
        tabStates.set(sender.tab.id, request.enabled);
        sendResponse({ success: true });
        break;

      case 'TOGGLE_STATE':
        const tabId = request.tabId || sender.tab?.id;
        await toggleTabState(tabId);
        sendResponse({ success: true });
        break;

      case 'PROCESS_BATCH':
        const result = await processBatch(request.batch);
        sendResponse({ success: true, result });
        break;

      case 'PROCESS_SELECTION':
        await processSelection(sender.tab.id);
        sendResponse({ success: true });
        break;

      case 'GET_SETTINGS':
        const settings = await getStorage([
          'apiKey',
          'model',
          'slashColor',
          'maxTokensPerBatch',
          'targetSelector',
          'excludeSelector',
          'dynamicPageMonitoring'
        ]);
        sendResponse(settings);
        break;

      default:
        sendResponse({ error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ error: error.message });
  }
}

async function toggleTabState(tabId) {
  const currentState = tabStates.get(tabId) || false;
  const newState = !currentState;
  tabStates.set(tabId, newState);

  try {
    await chrome.tabs.sendMessage(tabId, {
      action: 'TOGGLE',
      enabled: newState
    });
  } catch (error) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });

    await chrome.tabs.sendMessage(tabId, {
      action: 'TOGGLE',
      enabled: newState
    });
  }
}

async function processSelection(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, {
      action: 'PROCESS_SELECTION'
    });
  } catch (error) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });

    await chrome.tabs.sendMessage(tabId, {
      action: 'PROCESS_SELECTION'
    });
  }
}

async function processBatch(batch) {
  console.log('[Background] Processing batch:', batch);
  const settings = await getStorage(['apiKey', 'model']);

  if (!settings.apiKey) {
    console.error('[Background] No API key configured');
    throw new Error('API key not configured');
  }

  const cacheKey = `batch_${JSON.stringify(batch.sentences)}`;
  const cached = await getCachedResult(cacheKey);
  if (cached) {
    console.log('[Background] Returning cached result');
    return cached;
  }

  console.log('[Background] Calling OpenAI API with model:', settings.model || 'gpt-4o-mini');
  const result = await requestQueue.add(async () => {
    return await callOpenAI(settings.apiKey, settings.model || 'gpt-4o-mini', batch);
  });

  console.log('[Background] API result:', result);
  await setCacheResult(cacheKey, result);
  return result;
}

async function getCachedResult(key) {
  const cache = await getStorage('responseCache') || {};
  const item = cache[key];

  if (item && Date.now() - item.timestamp < 24 * 60 * 60 * 1000) {
    return item.data;
  }

  return null;
}

async function setCacheResult(key, data) {
  const cache = await getStorage('responseCache') || {};
  cache[key] = {
    data,
    timestamp: Date.now()
  };

  const cacheSize = new Blob([JSON.stringify(cache)]).size;
  if (cacheSize > 20 * 1024 * 1024) {
    const keys = Object.keys(cache);
    const sorted = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp);
    for (let i = 0; i < sorted.length / 2; i++) {
      delete cache[sorted[i]];
    }
  }

  await setStorage({ responseCache: cache });
}

chrome.tabs.onRemoved.addListener((tabId) => {
  tabStates.delete(tabId);
});