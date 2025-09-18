export function extractTextNodes(root, excludeSelector = 'script, style, noscript, iframe, object, embed, code, pre, a') {
  const textNodes = [];

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text.length > 0 && !isExcluded(node, excludeSelector)) {
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

  function isExcluded(node, selector) {
    let parent = node.parentElement;
    while (parent) {
      if (parent.matches(selector)) {
        return true;
      }
      parent = parent.parentElement;
    }
    return false;
  }

  walk(root);
  return textNodes;
}

export function extractSelectionTextNodes(range, excludeSelector = 'script, style, noscript, iframe, object, embed, code, pre, a') {
  const container = range.commonAncestorContainer;
  const root = container.nodeType === Node.TEXT_NODE ? container.parentNode : container;
  const allTextNodes = extractTextNodes(root, excludeSelector);

  return allTextNodes.filter(node => {
    const nodeRange = document.createRange();
    nodeRange.selectNode(node);
    return range.compareBoundaryPoints(Range.START_TO_END, nodeRange) >= 0 &&
           range.compareBoundaryPoints(Range.END_TO_START, nodeRange) <= 0;
  });
}

export function applyChunksToNode(node, chunks) {
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
  return wrapper;
}

export function restoreNode(wrapper) {
  if (!wrapper || !wrapper.classList.contains('sr-wrapper')) {
    return;
  }

  const text = wrapper.textContent;
  const textNode = document.createTextNode(text);
  wrapper.parentNode.replaceChild(textNode, wrapper);
  return textNode;
}

export function restoreAllNodes() {
  const wrappers = document.querySelectorAll('.sr-wrapper');
  wrappers.forEach(wrapper => restoreNode(wrapper));
}

export function findTextNodesInElement(element, targetText) {
  const textNodes = extractTextNodes(element);
  return textNodes.filter(node => {
    const normalized = node.textContent.replace(/\s+/g, ' ').trim();
    return normalized.includes(targetText);
  });
}