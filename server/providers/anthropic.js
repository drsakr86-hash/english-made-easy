// مزود Anthropic عبر REST. المفتاح من متغيّر بيئة الخادم فقط ولا يُسجَّل ولا يُرجَع للعميل.
export function createAnthropicProvider({ apiKey, model = 'claude-haiku-5-5', timeoutMs = 20000, fetchImpl = fetch }) {
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is required');
  return {
    name: 'anthropic',
    async complete({ system, messages, signal }) {
      const ctl = new AbortController();
      // انقطاع العميل يوقف الطلب إلى المزود
      if (signal) { if (signal.aborted) ctl.abort(); else signal.addEventListener('abort', () => ctl.abort(), { once: true }); }
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
        // قد يسبق النصَّ كتل أخرى (مثل thinking): نجمع كل كتل type=text.
        const blocks = data && Array.isArray(data.content) ? data.content : [];
        const text = blocks.filter((b) => b && b.type === 'text' && typeof b.text === 'string').map((b) => b.text).join('');
        if (!text) throw new Error('provider_bad_shape');
        return text;
      } finally {
        clearTimeout(t);
      }
    },
  };
}
