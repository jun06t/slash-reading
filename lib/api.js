export async function callOpenAI(apiKey, model, batch, cefrLevel = 'B1') {
  console.log('[API] Calling OpenAI with:', { model, sentences: batch.sentences.length, cefrLevel });

  // Compact level-specific rules based on MEXT guidelines
  const levelRules = {
    'A1': {
      size: '2-3',
      rule: 'Break after every 2-3 words. Keep articles with nouns.',
      example: '["I am", "a student"] ["The big", "red car"]'
    },
    'A2': {
      size: '3-4',
      rule: 'Group basic phrases. Keep verb phrases together.',
      example: '["I have been", "studying English"] ["in the morning"]'
    },
    'B1': {
      size: '4-5',
      rule: 'Group by meaning units. Keep prepositional phrases.',
      example: '["I have been studying", "English for three years"]'
    },
    'B2': {
      size: '5-6',
      rule: 'Longer phrases. Break at clause boundaries.',
      example: '["When the meeting ends today", "we will go to lunch"]'
    }
  };

  const level = levelRules[cefrLevel] || levelRules['B1'];

  // Compact prompt to reduce tokens
  const systemPrompt = `Slash reading expert. Level ${cefrLevel}: ${level.size} words/chunk.
Rule: ${level.rule}
Example: ${level.example}
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