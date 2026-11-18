// خادم وسيط للمدرس الذكي: يتحقق من الطلب، يطبّق الحدود، يبني التعليمات، يستدعي المزود، ويطبّع الرد.
// لا يُسجّل محتوى المحادثات ولا المفاتيح. المفاتيح تُقرأ من البيئة في index.mjs فقط.
import http from 'node:http';
import { validateChatRequest, buildSystemPrompt, parseTutorReply } from '../src/engines/ai/prompts.js';
import { createLimiter } from './limits.js';

const MAX_BODY = 16 * 1024;

export function createTutorServer({ provider, allowedOrigin = '', limiter = createLimiter(), log = (m) => console.log(m) }) {
  const send = (res, code, obj, origin) => {
    const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
    if (allowedOrigin && origin === allowedOrigin) { headers['access-control-allow-origin'] = origin; headers.vary = 'Origin'; }
    res.writeHead(code, headers);
    res.end(JSON.stringify(obj));
  };
  return http.createServer((req, res) => {
    const origin = req.headers.origin || '';
    const url = (req.url || '').split('?')[0];
    if (req.method === 'OPTIONS') {
      const h = { 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '600' };
      if (allowedOrigin && origin === allowedOrigin) h['access-control-allow-origin'] = origin;
      res.writeHead(204, h);
      return res.end();
    }
    if (url === '/api/tutor/health' && req.method === 'GET') return send(res, 200, { ok: true, provider: provider.name }, origin);
    if (url !== '/api/tutor/chat') return send(res, 404, { error: 'not_found' }, origin);
    if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' }, origin);
    if (allowedOrigin && origin && origin !== allowedOrigin) return send(res, 403, { error: 'forbidden_origin' }, origin);

    const ip = req.socket.remoteAddress || 'unknown';
    const lim = limiter.check(ip);
    if (!lim.ok) return send(res, 429, { error: lim.reason }, origin);

    let size = 0;
    const chunks = [];
    let aborted = false;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { aborted = true; send(res, 413, { error: 'too_large' }, origin); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', async () => {
      if (aborted) return;
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return send(res, 400, { error: 'bad_json' }, origin); }
      const v = validateChatRequest(body);
      if (!v.ok) return send(res, 400, { error: v.error }, origin);
      try {
        const text = await provider.complete({ system: buildSystemPrompt(v.value), messages: v.value.messages });
        const out = parseTutorReply(text, v.value.mode === 'writing' ? 5 : 2);
        log(`chat ok provider=${provider.name} level=${v.value.level} mode=${v.value.mode} n=${v.value.messages.length}`);
        return send(res, 200, out, origin);
      } catch (e) {
        log(`chat provider_error provider=${provider.name} kind=${String(e && e.message).slice(0, 40)}`);
        return send(res, 502, { error: 'provider_error' }, origin);
      }
    });
  });
}
