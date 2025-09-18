(async function() {
  let isEnabled = false;
  let observer = null;
  let processedElements = new WeakSet();
  let settings = {};

  async function initialize() {
    const response = await chrome.runtime.sendMessage({ action: 'GET_STATE' });
    isEnabled = response.enabled;

    settings = await chrome.runtime.sendMessage({ action: 'GET_SETTINGS' });

    if (isEnabled) {
      await processPage();
    }

    setupMessageListener();
    setupMutationObserver();
  }

  function setupMessageListener() {
    chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
      switch (request.action) {
        case 'TOGGLE':
          isEnabled = request.enabled;
          if (isEnabled) {
            await processPage();
          } else {
            restorePage();
          }
          sendResponse({ success: true });
          break;

        case 'PROCESS_SELECTION':
          await processSelection();
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ error: 'Unknown action' });
      }
    });
  }

  function setupMutationObserver() {
    if (!settings.dynamicPageMonitoring) return;

    observer = new MutationObserver(async (mutations) => {
      if (!isEnabled) return;

      const hasNewContent = mutations.some(mutation => {
        return mutation.addedNodes.length > 0;
      });

      if (hasNewContent) {
        await processPage();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  async function processPage() {
    const textNodes = extractTextNodes(document.body);
    await processTextNodes(textNodes);
  }

  async function processSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const textNodes = extractTextNodes(
      container.nodeType === Node.TEXT_NODE ? container.parentNode : container,
      range
    );

    await processTextNodes(textNodes);
  }

  function extractTextNodes(root, range = null) {
    const textNodes = [];
    const excludeSelector = settings.excludeSelector || 'script, style, noscript, iframe, object, embed, code, pre, a';

    function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.trim();
        if (text.length > 0 && !isExcluded(node)) {
          if (!range || isInRange(node, range)) {
            textNodes.push(node);
          }
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (!node.matches(excludeSelector)) {
          for (const child of node.childNodes) {
            walk(child);
          }
        }
      }
    }

    function isExcluded(node) {
      let parent = node.parentElement;
      while (parent) {
        if (parent.matches(excludeSelector)) {
          return true;
        }
        parent = parent.parentElement;
      }
      return false;
    }

    function isInRange(node, range) {
      const nodeRange = document.createRange();
      nodeRange.selectNode(node);
      return range.compareBoundaryPoints(Range.START_TO_END, nodeRange) >= 0 &&
             range.compareBoundaryPoints(Range.END_TO_START, nodeRange) <= 0;
    }

    walk(root);
    return textNodes;
  }

  async function processTextNodes(textNodes) {
    const batches = createBatches(textNodes);

    for (const batch of batches) {
      if (batch.sentences.length === 0) continue;

      try {
        const response = await chrome.runtime.sendMessage({
          action: 'PROCESS_BATCH',
          batch: {
            sentences: batch.sentences,
            style: {
              max_chunks_per_sentence: 6,
              min_chunk_length: 2
            }
          }
        });

        if (response.success && response.result) {
          applyResults(batch.nodes, response.result.results);
        }
      } catch (error) {
        console.error('Error processing batch:', error);
      }
    }
  }

  function createBatches(textNodes) {
    const batches = [];
    let currentBatch = { nodes: [], sentences: [] };
    let tokenCount = 0;

    for (const node of textNodes) {
      if (processedElements.has(node)) continue;

      const text = node.textContent;
      const sentences = splitIntoSentences(text);

      for (const sentence of sentences) {
        const sentenceTokens = estimateTokens(sentence);

        if (tokenCount + sentenceTokens > (settings.maxTokensPerBatch || 1000)) {
          if (currentBatch.sentences.length > 0) {
            batches.push(currentBatch);
            currentBatch = { nodes: [], sentences: [] };
            tokenCount = 0;
          }
        }

        currentBatch.nodes.push({ node, text: sentence });
        currentBatch.sentences.push({
          id: `s${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          text: sentence
        });
        tokenCount += sentenceTokens;
      }
    }

    if (currentBatch.sentences.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }

  function splitIntoSentences(text) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    return sentences.map(s => s.trim()).filter(s => s.length > 0);
  }

  function estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  function applyResults(nodes, results) {
    const resultMap = new Map(results.map(r => [r.id, r]));

    for (const { node, text } of nodes) {
      const matchingResult = Array.from(resultMap.entries()).find(([id, result]) => {
        const resultText = result.chunks.join(' ').replace(/\s+/g, ' ');
        const nodeText = text.replace(/\s+/g, ' ');
        return resultText === nodeText || nodeText.includes(resultText);
      });

      if (matchingResult) {
        const [id, result] = matchingResult;
        applyChunksToNode(node, result.chunks);
        processedElements.add(node);
      }
    }
  }

  function applyChunksToNode(node, chunks) {
    const parent = node.parentNode;
    const wrapper = document.createElement('span');
    wrapper.className = 'sr-wrapper';

    chunks.forEach((chunk, index) => {
      const span = document.createElement('span');
      span.className = 'sr-chunk';
      span.textContent = chunk;
      wrapper.appendChild(span);

      if (index < chunks.length - 1) {
        wrapper.appendChild(document.createTextNode(' '));
      }
    });

    parent.replaceChild(wrapper, node);
  }

  function restorePage() {
    const wrappers = document.querySelectorAll('.sr-wrapper');
    wrappers.forEach(wrapper => {
      const text = wrapper.textContent;
      const textNode = document.createTextNode(text);
      wrapper.parentNode.replaceChild(textNode, wrapper);
    });
    processedElements = new WeakSet();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();