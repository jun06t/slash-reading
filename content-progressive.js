(async function() {
  let isEnabled = false;
  let isProcessing = false;
  let shouldStopProcessing = false;
  let processedSections = new WeakSet();
  let settings = {};
  let progressIndicator = null;

  async function initialize() {

    const response = await chrome.runtime.sendMessage({ action: 'GET_STATE' });
    isEnabled = response.enabled;

    settings = await chrome.runtime.sendMessage({ action: 'GET_SETTINGS' });

    if (!settings.apiKey) {
      console.error('[Slash Reading] No API key configured!');
    }

    if (isEnabled) {
      await processPageProgressive();
    }

    setupMessageListener();
    setupKeyboardShortcuts();
  }

  // Setup keyboard shortcuts
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Stop processing with Escape key
      if (event.key === 'Escape' && isProcessing) {
        event.preventDefault();
        stopProcessing();
      }
    });
  }

  function setupMessageListener() {
    chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
      switch (request.action) {
        case 'TOGGLE':
          isEnabled = request.enabled;
          if (isEnabled) {
            await processPageProgressive();
          } else {
            restorePage();
            hideProgress();
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

  // Analyze page structure and identify content sections
  function identifyContentSections() {

    // Priority selectors for common content areas
    const contentSelectors = [
      'main article',
      'article',
      'main',
      '[role="main"]',
      '.content',
      '#content',
      '.post-content',
      '.entry-content',
      '.article-body',
      '.story-body'
    ];

    // Try to find main content area
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        return collectSections(element);
      }
    }

    // Fallback: collect all meaningful sections
    return collectSections(document.body);
  }

  // Collect processable sections (paragraphs, divs with text, etc.)
  function collectSections(root) {
    const sections = [];
    const sectionSelectors = 'p, div, section, article, blockquote, li, h1, h2, h3, h4, h5, h6';
    const elements = root.querySelectorAll(sectionSelectors);

    for (const element of elements) {
      // Skip if already processed or excluded
      if (processedSections.has(element)) continue;
      if (isExcludedElement(element)) continue;

      // Check if element has meaningful text content
      const text = getDirectText(element);
      if (text.length > 20) {  // Minimum text length
        sections.push({
          element: element,
          text: text,
          depth: getElementDepth(element),
          type: element.tagName.toLowerCase()
        });
      }
    }

    // Sort by depth and document position to process in reading order
    sections.sort((a, b) => {
      const posCompare = a.element.compareDocumentPosition(b.element);
      if (posCompare & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (posCompare & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });

    return sections;
  }

  // Get text directly from element (not from children)
  function getDirectText(element) {
    let text = '';
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      }
    }
    return text.trim();
  }

  // Get element depth in DOM tree
  function getElementDepth(element) {
    let depth = 0;
    let current = element;
    while (current.parentElement) {
      depth++;
      current = current.parentElement;
    }
    return depth;
  }

  // Check if element should be excluded
  function isExcludedElement(element) {
    const excludeSelector = settings.excludeSelector || 'script, style, noscript, iframe, object, embed, code, pre, a, nav, header, footer, aside';
    return element.matches(excludeSelector) || element.closest(excludeSelector);
  }

  // Process page progressively, section by section
  async function processPageProgressive() {
    if (isProcessing) {
      return;
    }

    isProcessing = true;
    shouldStopProcessing = false;
    showProgress(0, 100);

    try {
      const sections = identifyContentSections();
      const totalSections = sections.length;
      let processedCount = 0;


      // Process sections in batches
      const batchSize = 5;
      for (let i = 0; i < sections.length; i += batchSize) {
        // Check if processing should be stopped
        if (shouldStopProcessing) {
          break;
        }

        const batch = sections.slice(i, Math.min(i + batchSize, sections.length));


        // Process each section in the batch
        await Promise.all(batch.map(async (section) => {
          if (!shouldStopProcessing) {
            await processSectionElement(section.element);
            processedSections.add(section.element);
            processedCount++;
          }
        }));

        // Update progress
        const progress = Math.round((processedCount / totalSections) * 100);
        updateProgress(progress, totalSections);

        // Small delay between batches to prevent UI freezing
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (shouldStopProcessing) {
      } else {
      }
      hideProgress();

    } catch (error) {
      console.error('[Slash Reading] Error during progressive processing:', error);
      hideProgress();
    } finally {
      isProcessing = false;
      shouldStopProcessing = false;
    }
  }

  // Process a single section element
  async function processSectionElement(element) {
    const textNodes = extractTextNodesFromElement(element);

    if (textNodes.length === 0) return;


    // Highlight section being processed
    element.style.transition = 'background-color 0.3s';
    element.style.backgroundColor = 'rgba(255, 255, 0, 0.1)';

    await processTextNodes(textNodes);

    // Remove highlight after processing
    setTimeout(() => {
      element.style.backgroundColor = '';
    }, 500);
  }

  // Extract text nodes from a specific element
  function extractTextNodesFromElement(element) {
    const textNodes = [];
    const excludeSelector = settings.excludeSelector || 'script, style, noscript, iframe, object, embed, code, pre, a';

    function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.trim();
        if (text.length > 0 && !isExcluded(node)) {
          textNodes.push(node);
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
      while (parent && parent !== element) {
        if (parent.matches(excludeSelector)) {
          return true;
        }
        parent = parent.parentElement;
      }
      return false;
    }

    walk(element);
    return textNodes;
  }

  // Process text nodes with smaller batches
  async function processTextNodes(textNodes) {
    const batches = createSmallBatches(textNodes);

    for (const batch of batches) {
      // Check if processing should be stopped
      if (shouldStopProcessing) {
        break;
      }

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
          applyResults(batch, response.result.results);
        } else if (response.error) {
          console.error('[Slash Reading] API Error:', response.error);
        }
      } catch (error) {
        console.error('[Slash Reading] Error processing batch:', error);
      }
    }
  }

  // Create smaller batches to avoid JSON parsing errors
  function createSmallBatches(textNodes) {
    const batches = [];
    let currentBatch = { nodeMap: new Map(), sentences: [] };
    let tokenCount = 0;
    const maxTokensPerBatch = 100; // Very small batch size to avoid JSON parsing errors

    for (const node of textNodes) {
      // Skip if node is already wrapped
      if (node.parentNode && node.parentNode.classList && node.parentNode.classList.contains('sr-wrapper')) {
        continue;
      }

      const text = node.textContent;
      const sentences = splitIntoSentences(text);

      const nodeId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      currentBatch.nodeMap.set(nodeId, { node, fullText: text, sentences: [] });

      for (const sentence of sentences) {
        const sentenceTokens = estimateTokens(sentence);

        if (tokenCount + sentenceTokens > maxTokensPerBatch) {
          if (currentBatch.sentences.length > 0) {
            batches.push(currentBatch);
            currentBatch = { nodeMap: new Map(), sentences: [] };
            tokenCount = 0;
            currentBatch.nodeMap.set(nodeId, { node, fullText: text, sentences: [] });
          }
        }

        const sentenceId = `s${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        currentBatch.nodeMap.get(nodeId).sentences.push({ id: sentenceId, text: sentence });
        currentBatch.sentences.push({
          id: sentenceId,
          text: sentence,
          nodeId: nodeId
        });
        tokenCount += sentenceTokens;
      }
    }

    if (currentBatch.sentences.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }

  // Split text into sentences while preserving punctuation
  function splitIntoSentences(text) {
    // Simple approach: treat entire text as one unit to preserve all punctuation
    // This prevents text duplication and missing periods
    const trimmed = text.trim();
    if (!trimmed) return [];

    // For now, don't split sentences - process the whole text as one unit
    // This ensures no text is lost or duplicated
    return [trimmed];
  }

  // Estimate token count
  function estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  // Apply results from API
  function applyResults(batch, results) {
    const resultMap = new Map(results.map(r => [r.id, r]));

    for (const [nodeId, nodeData] of batch.nodeMap) {
      const processedSentences = [];

      for (const sentence of nodeData.sentences) {
        const result = resultMap.get(sentence.id);
        if (result && result.chunks && result.chunks.length > 0) {
          // Join chunks with slashes and preserve the sentence structure
          const processedSentence = result.chunks.join(' / ');
          processedSentences.push(processedSentence);
        } else {
          // Keep original sentence if no chunks
          processedSentences.push(sentence.text);
        }
      }

      if (processedSentences.length > 0) {
        // Join all processed sentences with a space
        const fullText = processedSentences.join(' ');
        applyProcessedTextToNode(nodeData.node, fullText);
      }
    }
  }

  // Apply processed text to node
  function applyProcessedTextToNode(node, processedText) {
    if (!node.parentNode) {
      return;
    }

    if (node.parentNode.classList && node.parentNode.classList.contains('sr-wrapper')) {
      return;
    }

    const parent = node.parentNode;
    const wrapper = document.createElement('span');
    wrapper.className = 'sr-wrapper';

    // Check if processedText contains slashes (meaning it was processed)
    if (processedText.includes(' / ')) {
      // Create chunks separated by slashes for CSS styling
      const chunks = processedText.split(' / ');
      chunks.forEach((chunk, index) => {
        const span = document.createElement('span');
        span.className = 'sr-chunk';
        span.textContent = chunk;
        wrapper.appendChild(span);

        // Add space between chunks (not after the last one)
        if (index < chunks.length - 1) {
          wrapper.appendChild(document.createTextNode(' '));
        }
      });
    } else {
      // If no slashes, just add the text as is
      wrapper.textContent = processedText;
    }

    try {
      parent.replaceChild(wrapper, node);
    } catch (error) {
      // Silently fail
    }
  }

  // Process selection
  async function processSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const element = container.nodeType === Node.TEXT_NODE ? container.parentNode : container;

    showProgress(0, 1);
    await processSectionElement(element);
    hideProgress();
  }

  // Restore page to original state
  function restorePage() {
    const wrappers = document.querySelectorAll('.sr-wrapper');
    wrappers.forEach(wrapper => {
      const text = wrapper.textContent;
      const textNode = document.createTextNode(text);
      wrapper.parentNode.replaceChild(textNode, wrapper);
    });
    processedSections = new WeakSet();
  }

  // Show progress indicator
  function showProgress(current, total) {
    if (!progressIndicator) {
      progressIndicator = document.createElement('div');
      progressIndicator.id = 'sr-progress';
      progressIndicator.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 102, 204, 0.95);
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-family: -apple-system, sans-serif;
        font-size: 14px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 12px;
      `;
      document.body.appendChild(progressIndicator);
    }

    progressIndicator.innerHTML = `
      <div style="width: 20px; height: 20px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <span>Processing: ${current}/${total} sections</span>
      <button id="sr-stop-btn" style="
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.4);
        padding: 4px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.2s;
        margin-left: 8px;
      " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
        Stop
      </button>
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;

    // Add click event listener to stop button
    const stopBtn = progressIndicator.querySelector('#sr-stop-btn');
    if (stopBtn) {
      stopBtn.addEventListener('click', stopProcessing);
    }
  }

  // Update progress
  function updateProgress(percent, total) {
    if (progressIndicator) {
      const current = Math.round((percent / 100) * total);
      progressIndicator.innerHTML = `
        <div style="width: 200px; height: 4px; background: rgba(255,255,255,0.3); border-radius: 2px; overflow: hidden;">
          <div style="width: ${percent}%; height: 100%; background: white; transition: width 0.3s;"></div>
        </div>
        <span style="min-width: 120px;">${current}/${total} sections</span>
        <button id="sr-stop-btn" style="
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.4);
          padding: 4px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;
          margin-left: auto;
        " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
          Stop
        </button>
      `;

      // Add click event listener to stop button
      const stopBtn = progressIndicator.querySelector('#sr-stop-btn');
      if (stopBtn) {
        stopBtn.addEventListener('click', stopProcessing);
      }
    }
  }

  // Stop processing
  function stopProcessing() {
    shouldStopProcessing = true;
  }

  // Hide progress indicator
  function hideProgress() {
    if (progressIndicator) {
      progressIndicator.remove();
      progressIndicator = null;
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();