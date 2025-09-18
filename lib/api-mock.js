// Mock API for testing without OpenAI credits
export async function callOpenAIMock(apiKey, model, batch, cefrLevel = 'B1', minWords = 4, maxWords = 6) {

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Generate mock chunked results with better phrase grouping
  const results = batch.sentences.map(sentence => {
    const text = sentence.text;
    const chunks = [];

    // Simple rule-based chunking for mock API
    // Split by common delimiters and group intelligently
    const parts = text.split(/(?=[,.])|(?<=[,.])/);

    for (const part of parts) {
      const words = part.trim().split(/\s+/);
      let i = 0;

      while (i < words.length) {
        // Use configured min/max words
        let baseChunkSize = minWords;
        let chunkSize = baseChunkSize;

        // Adjust chunk size based on words (within min/max limits)
        if (i === 0 && words[i].match(/^(the|a|an)$/i)) {
          // Article at start - include next words
          chunkSize = Math.min(Math.max(baseChunkSize + 1, minWords), maxWords, words.length - i);
        } else if (words[i].match(/^(in|on|at|to|for|with|from|by|of)$/i)) {
          // Preposition - keep with object
          chunkSize = Math.min(maxWords, words.length - i);
        } else if (words[i].match(/^(will|can|should|must|would|could|have|has|had|is|are|was|were|been)$/i)) {
          // Auxiliary verb - keep with main verb
          chunkSize = Math.min(maxWords, words.length - i);
        } else if (words.length - i <= maxWords) {
          // Last few words - keep together if within max
          chunkSize = Math.max(Math.min(words.length - i, maxWords), minWords);
        } else {
          // Default: random between min and max for variety
          chunkSize = Math.floor(Math.random() * (maxWords - minWords + 1)) + minWords;
          chunkSize = Math.min(chunkSize, words.length - i);
        }

        const chunk = words.slice(i, i + chunkSize).join(' ');
        if (chunk) chunks.push(chunk);
        i += chunkSize;
      }
    }

    // Clean up chunks - remove empty ones and punctuation-only chunks
    const cleanedChunks = chunks
      .map(c => c.trim())
      .filter(c => c && c.match(/\w/));

    return {
      id: sentence.id,
      chunks: cleanedChunks
    };
  });

  return { results };
}