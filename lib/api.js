export async function callOpenAI(apiKey, model, batch, cefrLevel = 'B1', minWords = 4, maxWords = 6) {

  // Compact prompt with explicit word counts
  const systemPrompt = `Slash reading expert.
Rules:
1. Each chunk MUST have minimum ${minWords} words
2. Each chunk MUST NOT exceed ${maxWords} words
3. Keep meaningful phrases together (verb phrases, prepositional phrases)
4. Never break articles from nouns
Example for ${minWords}-${maxWords} words: ${minWords === 2 ? '["I am", "a student"]' : minWords === 4 ? '["I have been studying", "English for three years"]' : '["When the meeting ends today", "we will go to lunch"]'}
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
      max_tokens: 300,  // Further reduced for efficiency
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