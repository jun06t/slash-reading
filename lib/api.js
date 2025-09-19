export async function callOpenAI(apiKey, model, batch, cefrLevel = 'B1', minWords = 4, maxWords = 6) {

  // Improved prompt for meaningful phrase grouping
  const systemPrompt = `Slash reading expert for English comprehension.
CRITICAL Rules:
1. Chunks should be ${minWords}-${maxWords} words (flexible for meaningful units)
2. NEVER break these units:
   - Determiner + noun (the book, this goal, a student)
   - Adjective + noun (significant progress, business needs)
   - Preposition + object (toward this goal, in GraphQL APIs)
   - Auxiliary + verb (have made, will share)
   - Compound nouns (blog post, page updates)
3. Preserve ALL punctuation exactly where it appears
4. Group by meaning, not just word count

Good examples:
- "toward this goal" → ["toward this goal"] (keep together)
- "we have made significant progress" → ["we have made", "significant progress"]
- "driven by evolving business needs" → ["driven by", "evolving business needs"]

Bad examples (NEVER do):
- "this / goal" (breaks determiner from noun)
- "significant / progress" (breaks adjective from noun)

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