export async function callOpenAI(apiKey, model, batch, cefrLevel = 'B1', minWords = 4, maxWords = 6) {

  // Compact prompt with explicit word counts
  const systemPrompt = `Slash reading expert.
Rules:
1. Each chunk MUST have minimum ${minWords} words
2. Each chunk MUST NOT exceed ${maxWords} words
3. Keep meaningful phrases together (verb phrases, prepositional phrases)
4. Never break articles from nouns
5. CRITICAL: Preserve ALL punctuation marks exactly as they appear
6. Include periods, commas, colons, semicolons in the chunks where they belong
7. The ending punctuation MUST be included with the last chunk
Examples:
- "I study English." → ["I study", "English."] (period with last chunk)
- "The cat, a tabby, sleeps." → ["The cat,", "a tabby,", "sleeps."] (all punctuation preserved)
Output JSON only: {"results":[{"id":"x","chunks":["chunk1","chunk2"]}]}`;

  // Simplified user prompt - just the sentences
  const userPrompt = JSON.stringify(batch.sentences);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,  // Lower temperature for more consistent results
      max_tokens: 1200,  // Further increased to ensure complete JSON responses
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[API] Error response:', response.status, error);
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    console.error('[API] Invalid response structure:', data);
    throw new Error('Invalid response from OpenAI API');
  }

  try {
    const result = JSON.parse(data.choices[0].message.content);
    return result;
  } catch (error) {
    console.error('[API] Failed to parse response:', data.choices[0].message.content);
    throw new Error('Failed to parse OpenAI response: ' + error.message);
  }
}