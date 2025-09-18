export async function callOpenAI(apiKey, model, batch) {
  console.log('[API] Calling OpenAI with:', { model, sentences: batch.sentences });

  const systemPrompt = `You are a helpful assistant that inserts forward slashes (/) into English text for learning purposes.
Given English sentences, break them into meaningful chunks separated by slashes.
Each chunk should be 2-5 words that form a natural phrase or unit of meaning.
Return the result in the exact JSON format specified.`;

  const userPrompt = `Break the following sentences into readable chunks:
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