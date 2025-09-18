// Mock API for testing without OpenAI credits
export async function callOpenAIMock(apiKey, model, batch) {
  console.log('[Mock API] Processing batch:', batch);

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Generate mock chunked results
  const results = batch.sentences.map(sentence => {
    const words = sentence.text.split(' ');
    const chunks = [];

    // Group words into chunks of 2-4 words
    for (let i = 0; i < words.length; i += 3) {
      const chunk = words.slice(i, Math.min(i + 3, words.length)).join(' ');
      chunks.push(chunk);
    }

    return {
      id: sentence.id,
      chunks: chunks
    };
  });

  console.log('[Mock API] Generated results:', results);
  return { results };
}