// Calls the Claude API from the server only — the API key never touches
// the browser. Asks for strict JSON, validates it against our schema, and
// retries once with a correction message if the model's output doesn't
// match. If it fails twice, we surface a clean error instead of crashing
// or showing broken/raw output.

const { validateOutfitResponse } = require('./outfitSchema');

const CLAUDE_MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 2000;

async function callClaudeForOutfits(systemPrompt, userPrompt) {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error('CLAUDE_API_KEY is not configured');
  }

  let messages = [{ role: 'user', content: userPrompt }];

  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Claude API error (${response.status}): ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const textBlock = (data.content || []).find((block) => block.type === 'text');
    const rawText = textBlock ? textBlock.text : '';

    let parsed;
    try {
      // Claude is instructed to return JSON only, but strip code fences
      // defensively in case it wraps the output anyway.
      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (err) {
      parsed = null;
    }

    if (parsed) {
      const { valid, errors } = validateOutfitResponse(parsed);
      if (valid) {
        return parsed;
      }
      if (attempt === 1) {
        messages = [
          { role: 'user', content: userPrompt },
          { role: 'assistant', content: rawText },
          {
            role: 'user',
            content:
              'That response did not match the required JSON schema. Specific problems: ' +
              errors.join('; ') +
              '. Please return ONLY corrected valid JSON matching the schema exactly, with no other text.',
          },
        ];
        continue;
      }
    } else if (attempt === 1) {
      messages = [
        { role: 'user', content: userPrompt },
        {
          role: 'user',
          content: 'Your last response was not valid JSON. Return ONLY valid JSON, with no markdown formatting, no code fences, and no explanation text.',
        },
      ];
      continue;
    }
  }

  throw new Error('Claude did not return valid outfit JSON after retry');
}

module.exports = { callClaudeForOutfits };
