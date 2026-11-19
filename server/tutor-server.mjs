// خادم وسيط للمدرس الذكي: يتحقق من الأصل والهوية (رمز موقّع) ثم الحدود ثم الطلب، ويستدعي المزود ويطبّع الرد.
// لا يُسجّل محتوى المحادثات ولا المفاتيح ولا الرموز. المفاتيح تُقرأ من البيئة في index.mjs فقط.
// ملاحظة: CORS/Origin تحكّم متصفحات فقط وليس حماية من curl أو السكربتات؛ الحماية الحقيقية هي الرمز والحدود.
import http from 'node:http';
import { validateChatRequest, buildSystemPrompt, parseTutorReply } from '../src/engines/ai/prompts.js';
import { createLimiter } from './limits.js';
import { bearer } from './auth.js';

const MAX_BODY = 16 * 1024;

/** يسجّل نوع الخطأ فقط من قائمة معروفة، فلا تتسرب نصوص قد تحوي مفاتيح أو عناوين. */
const safeKind = (e) => {
  const m = String((e && e.message) || '');
  return /^provider_(http_\d{3}|bad_shape)$/.test(m) ? m : e && e.name === 'AbortError' ? 'aborted' : 'error';
};

/**
 * auth: { verify(token) } مطلوب. الاستثناء الوحيد insecureNoAuth:true للتجارب المحلية بمزود mock (يُرفض البدء بدونهما).
 * allowedOrigin: إن كان فارغاً يُرفض أي طلب يحمل Origin (متصفح) ولا تُرسل ترويسات CORS.
 */
export function createTutorServer({ provider, allowedOrigin = '', limiter = createLimiter(), auth = null, insecureNoAuth = false, log = (m) => console.log(m) }) {
  if (!auth && !insecureNoAuth) throw new Error('createTutorServer requires auth (or insecureNoAuth for local mock use)');
  const send = (res, code, obj, origin) => {
    if (res.writableEnded || res.destroyed) return;
    const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
    if (allowedOrigin && origin === allowedOrigin) { headers['access-control-allow-origin'] = origin; headers.vary = 'Origin'; }
    res.writeHead(code, headers);
    res.end(JSON.stringify(obj));
  };
  return http.createServer((req, res) => {
    const origin = req.headers.origin || '';
    const url = (req.url || '').split('?')[0];
    if (req.method === 'OPTIONS') {
      const h = { 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type, authorization', 'access-control-max-age': '600' };
      if (allowedOrigin && origin === allowedOrigin) h['access-control-allow-origin'] = origin;
      res.writeHead(204, h);
      return res.end();
    }
    // الصحة: لا معلومات عن المزود ولا تتطلب رمزاً (للمراقبة ولزر اختبار الاتصال)
    if (url === '/api/tutor/health' && req.method === 'GET') return send(res, 200, { ok: true }, origin);
    if (url !== '/api/tutor/chat') return send(res, 404, { error: 'not_found' }, origin);
    if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' }, origin);
    // أي طلب يحمل Origin يجب أن يطابق الأصل المسموح تماماً؛ وإن لم يُضبط أصل يُرفض كل أصل (فشل مغلق)
    if (origin && origin !== allowedOrigin) return send(res, 403, { error: 'forbidden_origin' }, origin);

    const ip = req.socket.remoteAddress || 'unknown';
    let who = ip;
    if (auth) {
      const v = auth.verify(bearer(req.headers.authorization));
      if (!v.ok) {
        const f = limiter.authFailure ? limiter.authFailure(ip) : { ok: true };
        if (!f.ok) return send(res, 429, { error: 'rate_limited' }, origin);
        const error = v.reason === 'missing' ? 'missing_token' : v.reason === 'expired' ? 'expired_token' : v.reason === 'revoked' ? 'revoked_token' : 'invalid_token';
        return send(res, 401, { error }, origin);
      }
      who = v.sub;
    }
    const lim = limiter.check(who);
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
      // عند انقطاع العميل نوقف طلب المزود بدل إكماله وتحمّل تكلفته
      const ctl = new AbortController();
      res.on('close', () => { if (!res.writableEnded) ctl.abort(); });
      try {
        const text = await provider.complete({ system: buildSystemPrompt(v.value), messages: v.value.messages, signal: ctl.signal });
        const out = parseTutorReply(text, v.value.mode === 'writing' ? 5 : 2);
        log(`chat ok user=${auth ? who : 'anon'} provider=${provider.name} level=${v.value.level} mode=${v.value.mode} n=${v.value.messages.length}`);
        return send(res, 200, out, origin);
      } catch (e) {
        log(`chat provider_error user=${auth ? who : 'anon'} provider=${provider.name} kind=${safeKind(e)}`);
        return send(res, 502, { error: 'provider_error' }, origin);
      }
    });
  });
}
