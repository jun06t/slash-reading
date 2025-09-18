export function splitIntoSentences(text) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  return sentences.map(s => s.trim()).filter(s => s.length > 0);
}

export function normalizeText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\u00A0/g, ' ')
    .trim();
}

export function estimateTokenCount(text) {
  return Math.ceil(text.length / 4);
}

export function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

export function chunkText(text, maxChunkSize = 100) {
  const words = text.split(/\s+/);
  const chunks = [];
  let currentChunk = [];

  for (const word of words) {
    currentChunk.push(word);
    if (currentChunk.join(' ').length > maxChunkSize) {
      if (currentChunk.length > 1) {
        currentChunk.pop();
        chunks.push(currentChunk.join(' '));
        currentChunk = [word];
      } else {
        chunks.push(currentChunk.join(' '));
        currentChunk = [];
      }
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks;
}