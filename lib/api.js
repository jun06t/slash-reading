export async function callOpenAI(apiKey, model, batch, cefrLevel = 'B1') {
  console.log('[API] Calling OpenAI with:', { model, sentences: batch.sentences, cefrLevel });

  // Level-specific chunking guidelines
  const levelGuidelines = {
    'A2': {
      chunkSize: '2-3 words',
      description: 'Elementary level - very short, simple chunks',
      examples: [
        { text: "The quick brown fox jumps over the lazy dog.", chunks: ["The quick", "brown fox", "jumps over", "the lazy", "dog"] },
        { text: "I have been studying English for three years.", chunks: ["I have", "been studying", "English", "for three", "years"] }
      ]
    },
    'B1': {
      chunkSize: '3-4 words',
      description: 'Intermediate level - balanced chunks for phrase understanding',
      examples: [
        { text: "The quick brown fox jumps over the lazy dog.", chunks: ["The quick brown fox", "jumps over", "the lazy dog"] },
        { text: "I have been studying English for three years.", chunks: ["I have been studying", "English", "for three years"] }
      ]
    },
    'B2': {
      chunkSize: '4-5 words',
      description: 'Upper intermediate - longer chunks with natural phrasing',
      examples: [
        { text: "The quick brown fox jumps over the lazy dog.", chunks: ["The quick brown fox jumps", "over the lazy dog"] },
        { text: "I have been studying English for three years.", chunks: ["I have been studying English", "for three years"] }
      ]
    },
    'C1': {
      chunkSize: '5+ words',
      description: 'Advanced level - minimal slashes, full clauses',
      examples: [
        { text: "The quick brown fox jumps over the lazy dog.", chunks: ["The quick brown fox jumps over the lazy dog"] },
        { text: "I have been studying English for three years.", chunks: ["I have been studying English for three years"] }
      ]
    }
  };

  const level = levelGuidelines[cefrLevel] || levelGuidelines['B1'];

  const systemPrompt = `You are an expert in slash reading for ${cefrLevel} level English learners.

LEVEL: ${cefrLevel} - ${level.description}
TARGET CHUNK SIZE: ${level.chunkSize}

RULES FOR ${cefrLevel} LEVEL:
1. Create chunks of approximately ${level.chunkSize}
2. ${cefrLevel === 'A2' ? 'Break frequently to aid comprehension' :
     cefrLevel === 'B1' ? 'Balance readability with natural phrasing' :
     cefrLevel === 'B2' ? 'Use longer chunks while maintaining clarity' :
     'Minimize breaks, only at major clause boundaries'}
3. Keep grammatical units together when possible
4. ${cefrLevel === 'A2' ? 'Prioritize short, manageable chunks' : 'Prioritize meaning and natural flow'}

EXAMPLES FOR ${cefrLevel}:
${level.examples.map(ex => `- "${ex.text}"\n  → ${JSON.stringify(ex.chunks)}`).join('\n')}

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