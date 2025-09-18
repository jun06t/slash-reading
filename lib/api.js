export async function callOpenAI(apiKey, model, batch) {
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
      max_tokens: 2000,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Invalid response from OpenAI API');
  }

  try {
    const result = JSON.parse(data.choices[0].message.content);
    return result;
  } catch (error) {
    throw new Error('Failed to parse OpenAI response: ' + error.message);
  }
}