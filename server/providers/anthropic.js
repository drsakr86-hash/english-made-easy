// مزود Anthropic عبر REST. المفتاح من متغيّر بيئة الخادم فقط ولا يُسجَّل ولا يُرجَع للعميل.
export function createAnthropicProvider({ apiKey, model = 'claude-haiku-5-5', timeoutMs = 20000, fetchImpl = fetch }) {
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is required');
  return {
    name: 'anthropic',
    async complete({ system, messages }) {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), timeoutMs);
      try {
        const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          signal: ctl.signal,
          headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model, max_tokens: 600, system, messages }),
        });
        if (!res.ok) throw new Error('provider_http_' + res.status);
        const data = await res.json();
        const text = data && Array.isArray(data.content) && data.content[0] && data.content[0].text;
        if (typeof text !== 'string') throw new Error('provider_bad_shape');
        return text;
      } finally {
        clearTimeout(t);
      }
    },
  };
}
