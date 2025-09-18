export async function callOpenAI(apiKey, model, batch) {
  console.log('[API] Calling OpenAI with:', { model, sentences: batch.sentences });

  const systemPrompt = `You are an expert in slash reading, a technique that helps language learners read English more effectively by breaking text into meaningful phrase units.

RULES FOR SLASH PLACEMENT:
1. Break at natural phrase boundaries (subject / verb / object)
2. Keep grammatical units together:
   - Article + adjective + noun (the beautiful house)
   - Auxiliary + main verb (will be going)
   - Preposition + object (in the morning)
   - Compound nouns (high school student)
3. Typical chunk size: 2-4 words (occasionally 1 or 5 for natural phrasing)
4. Prioritize meaning over equal length

EXAMPLES:
- "The quick brown fox jumps over the lazy dog."
  → ["The quick brown fox", "jumps over", "the lazy dog"]
- "I have been studying English for three years."
  → ["I have been studying", "English", "for three years"]
- "When the meeting ends, we will go to lunch together."
  → ["When the meeting ends", "we will go", "to lunch", "together"]
- "The company's new product launch was extremely successful."
  → ["The company's", "new product launch", "was extremely successful"]

Return ONLY the JSON format specified, no explanations.`;

  const userPrompt = `Break the following sentences into slash reading chunks using the rules above:
${JSON.stringify(batch.sentences, null, 2)}

Return in this exact format:
{
  "results": [
    { "id": "sentence_id", "chunks": ["chunk1", "chunk2", "chunk3"] }
  ]
}`;

  console.log('[API] Request body:', { model, userPrompt });

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
      temperature: 0.3,
      max_tokens: 500,  // Reduced to prevent large responses
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[API] Error response:', response.status, error);
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  console.log('[API] Response data:', data);

  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    console.error('[API] Invalid response structure:', data);
    throw new Error('Invalid response from OpenAI API');
  }

  try {
    const result = JSON.parse(data.choices[0].message.content);
    console.log('[API] Parsed result:', result);
    return result;
  } catch (error) {
    console.error('[API] Failed to parse response:', data.choices[0].message.content);
    throw new Error('Failed to parse OpenAI response: ' + error.message);
  }
}