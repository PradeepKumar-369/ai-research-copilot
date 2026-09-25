function getProvider() {
  if (process.env.LLM_PROVIDER) return process.env.LLM_PROVIDER;
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.XAI_API_KEY) return 'grok';
  if (process.env.GROQ_API_KEY) return 'groq';
  return null;
}

function extractJson(text) {
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleaned);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Rate-limit errors usually name a wait time ("try again in 15.5s"); fall back
// to a flat delay when a provider doesn't say.
function parseRetryAfterMs(message) {
  const match = /try again in ([\d.]+)s/i.exec(message || '');
  return match ? Math.ceil(parseFloat(match[1]) * 1000) + 250 : 5000;
}

async function withRateLimitRetry(fn, retries = 2) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.isRateLimit && attempt < retries) {
        await sleep(error.retryAfterMs || 5000);
        continue;
      }
      throw error;
    }
  }
}

// Shared by OpenAI, Grok (xAI), and Groq — all speak the same chat-completions API.
async function invokeOpenAICompatible({ prompt, schema, apiKey, baseUrl, model, providerName }) {
  return withRateLimitRetry(async () => {
    const body = {
      model,
      messages: [{ role: 'user', content: schema ? `${prompt}\n\nRespond with a single JSON object only, no prose, matching this JSON schema:\n${JSON.stringify(schema)}` : prompt }],
    };
    if (schema) body.response_format = { type: 'json_object' };

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      const message = json?.error?.message || `${providerName} request failed (${res.status})`;
      const err = new Error(message);
      if (res.status === 429) {
        err.isRateLimit = true;
        err.retryAfterMs = parseRetryAfterMs(message);
      }
      throw err;
    }
    const content = json.choices?.[0]?.message?.content || '';
    return schema ? extractJson(content) : content;
  });
}

function invokeOpenAI({ prompt, schema }) {
  return invokeOpenAICompatible({
    prompt,
    schema,
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: 'https://api.openai.com/v1',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    providerName: 'OpenAI',
  });
}

function invokeGrok({ prompt, schema }) {
  return invokeOpenAICompatible({
    prompt,
    schema,
    apiKey: process.env.XAI_API_KEY,
    baseUrl: 'https://api.x.ai/v1',
    model: process.env.XAI_MODEL || 'grok-4',
    providerName: 'Grok',
  });
}

function invokeGroq({ prompt, schema }) {
  return invokeOpenAICompatible({
    prompt,
    schema,
    apiKey: process.env.GROQ_API_KEY,
    baseUrl: 'https://api.groq.com/openai/v1',
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    providerName: 'Groq',
  });
}

async function invokeAnthropic({ prompt, schema }) {
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
  const fullPrompt = schema
    ? `${prompt}\n\nRespond with a single JSON object only, no prose, no markdown fences, matching this JSON schema:\n${JSON.stringify(schema)}`
    : prompt;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: fullPrompt }],
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Anthropic request failed (${res.status}). If this is a model-not-found error, set ANTHROPIC_MODEL in server/.env to a model your key can access.`);
  const content = (json.content || []).map(b => b.text || '').join('');
  return schema ? extractJson(content) : content;
}

// Mirrors base44's asServiceRole.integrations.Core.InvokeLLM({ prompt, response_json_schema }).
export async function invokeLLM({ prompt, schema }) {
  const provider = getProvider();
  if (!provider) {
    throw new Error('No LLM configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, XAI_API_KEY, or GROQ_API_KEY in server/.env');
  }
  if (provider === 'openai') return invokeOpenAI({ prompt, schema });
  if (provider === 'anthropic') return invokeAnthropic({ prompt, schema });
  if (provider === 'grok' || provider === 'xai') return invokeGrok({ prompt, schema });
  if (provider === 'groq') return invokeGroq({ prompt, schema });
  throw new Error(`Unknown LLM_PROVIDER "${provider}". Use "openai", "anthropic", "grok", or "groq".`);
}
