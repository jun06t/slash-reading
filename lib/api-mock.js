// Mock API for testing without OpenAI credits
export async function callOpenAIMock(apiKey, model, batch) {
  console.log('[Mock API] Processing batch:', batch);

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
        let chunkSize = 3; // Default chunk size

        // Adjust chunk size based on words
        if (i === 0 && words[i].match(/^(the|a|an)$/i)) {
          // Article at start - include next 2-3 words
          chunkSize = Math.min(4, words.length - i);
        } else if (words[i].match(/^(in|on|at|to|for|with|from|by|of)$/i)) {
          // Preposition - keep with object
          chunkSize = Math.min(3, words.length - i);
        } else if (words[i].match(/^(will|can|should|must|would|could|have|has|had|is|are|was|were|been)$/i)) {
          // Auxiliary verb - keep with main verb
          chunkSize = Math.min(3, words.length - i);
        } else if (words.length - i <= 2) {
          // Last few words - keep together
          chunkSize = words.length - i;
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

  console.log('[Mock API] Generated results:', results);
  return { results };
}