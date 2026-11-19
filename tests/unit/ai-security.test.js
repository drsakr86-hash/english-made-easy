import { describe, it, expect, afterEach } from 'vitest';
import { once } from 'node:events';
import { createHmac } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { issueToken, verifyToken, createAuth, bearer } from '../../server/auth.js';
import { createLimiter } from '../../server/limits.js';
import { loadConfig, normalizeOrigin } from '../../server/config.js';
import { createTutorServer } from '../../server/tutor-server.mjs';
import { createMockProvider } from '../../server/providers/mock.js';
import { createTutorClient } from '../../src/engines/ai/client.js';

const SECRET = 'a'.repeat(40);
const OLD_SECRET = 'b'.repeat(40);
const msgs = (t = 'hello') => [{ role: 'user', content: t }];
const tmp = () => mkdtempSync(join(tmpdir(), 'eme-sec-'));
const T0 = Date.UTC(2026, 10, 19, 10);

describe('رموز الدعوة الموقّعة', () => {
  const auth = (extra = {}) => createAuth({ secrets: [SECRET], revoked: () => new Set(), ...extra });

  it('رمز صحيح يمر ويعيد المعرّف', () => {
    const t = issueToken({ secret: SECRET });
    const r = auth().verify(t.token);
    expect(r).toEqual({ ok: true, sub: t.id });
    expect(t.id).toMatch(/^u-[0-9a-f]{12}$/);
  });
  it('الحمولة لا تحوي بيانات شخصية: معرّف وتواريخ فقط', () => {
    const t = issueToken({ secret: SECRET });
    const p = JSON.parse(Buffer.from(t.token.split('.')[1], 'base64url').toString());
    expect(Object.keys(p).sort()).toEqual(['exp', 'iat', 'sub']);
  });
  it('مفقود، تالف الشكل، توقيع خاطئ، عبث بالحمولة، سر آخر', () => {
    const t = issueToken({ secret: SECRET }).token;
    const v = (x) => auth().verify(x).reason;
    expect(v('')).toBe('missing');
    expect(v(undefined)).toBe('missing');
    expect(v('abc')).toBe('malformed');
    expect(v('x.y.z')).toBe('malformed');
    expect(v('eme1.a.b.c')).toBe('malformed');
    expect(v(t + 'x'.repeat(600))).toBe('malformed');
    const [h, p, s] = t.split('.');
    expect(v(`${h}.${p}.${s.slice(0, -2)}AA`)).toBe('bad_signature');
    const forged = Buffer.from(JSON.stringify({ sub: 'u-aaaaaaaaaaaa', iat: 1, exp: 9999999999 })).toString('base64url');
    expect(v(`${h}.${forged}.${s}`)).toBe('bad_signature');
    expect(createAuth({ secrets: [OLD_SECRET] }).verify(t).reason).toBe('bad_signature');
  });
  it('رمز موقَّع بالسر الصحيح لكن بحمولة غير صالحة يُرفض', () => {
    const head = 'eme1.' + Buffer.from(JSON.stringify({ sub: 'admin', exp: 9999999999 })).toString('base64url');
    const sig = createHmac('sha256', SECRET).update(head).digest('base64url');
    expect(auth().verify(`${head}.${sig}`).reason).toBe('malformed');
  });
  it('منتهي الصلاحية', () => {
    const t = issueToken({ secret: SECRET, ttlDays: 1, now: T0 });
    expect(auth({ now: T0 + 3600e3 }).verify(t.token).ok).toBe(true);
    expect(auth({ now: T0 + 86400e3 }).verify(t.token).reason).toBe('expired');
  });
  it('مُبطَل بالمعرّف', () => {
    const t = issueToken({ secret: SECRET });
    expect(auth({ revoked: () => new Set([t.id]) }).verify(t.token).reason).toBe('revoked');
  });
  it('تدوير الأسرار: الرمز القديم يبقى صالحاً ما دام السر السابق مُدرجاً', () => {
    const old = issueToken({ secret: OLD_SECRET });
    expect(createAuth({ secrets: [SECRET] }).verify(old.token).ok).toBe(false);
    expect(createAuth({ secrets: [SECRET, OLD_SECRET] }).verify(old.token).ok).toBe(true);
  });
  it('أسرار قصيرة وحدود المدة تُرفض عند الإصدار والتشغيل', () => {
    expect(() => issueToken({ secret: 'short' })).toThrow();
    expect(() => issueToken({ secret: SECRET, ttlDays: 0 })).toThrow();
    expect(() => issueToken({ secret: SECRET, ttlDays: 400 })).toThrow();
    expect(() => createAuth({ secrets: ['short'] })).toThrow();
    expect(() => createAuth({ secrets: [] })).toThrow();
  });
  it('استخراج Bearer', () => {
    expect(bearer('Bearer abc.def')).toBe('abc.def');
    expect(bearer('bearer abc')).toBe('');
    expect(bearer('Bearer a b')).toBe('');
    expect(bearer(undefined)).toBe('');
  });
});
describe('إعداد الخادم (فشل مغلق)', () => {
  const prod = { AI_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'k', ALLOWED_ORIGIN: 'https://app.example', TUTOR_TOKEN_SECRET: SECRET };
  it('إنتاج صحيح يمر', () => {
    const c = loadConfig(prod);
    expect(c.production).toBe(true);
    expect(c.insecureNoAuth).toBe(false);
    expect(c.allowedOrigin).toBe('https://app.example');
  });
  it('إنتاج ناقص أو غير آمن يُرفض', () => {
    expect(() => loadConfig({ ...prod, ALLOWED_ORIGIN: '' })).toThrow(/ALLOWED_ORIGIN is required/);
    expect(() => loadConfig({ ...prod, TUTOR_TOKEN_SECRET: '' })).toThrow(/TUTOR_TOKEN_SECRET is required/);
    expect(() => loadConfig({ ...prod, TUTOR_TOKEN_SECRET: 'short' })).toThrow(/at least/);
    expect(() => loadConfig({ ...prod, ALLOWED_ORIGIN: 'http://app.example' })).toThrow(/https/);
    expect(() => loadConfig({ ...prod, ALLOWED_ORIGIN: 'https://app.example/path' })).toThrow(/origin only/);
    expect(() => loadConfig({ ...prod, ALLOWED_ORIGIN: 'not a url' })).toThrow();
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow();
  });
  it('الشرطة المائلة الأخيرة تُطبَّع', () => {
    expect(normalizeOrigin('https://x.github.io/')).toBe('https://x.github.io');
    expect(loadConfig({ ...prod, ALLOWED_ORIGIN: 'https://x.github.io/' }).allowedOrigin).toBe('https://x.github.io');
  });
  it('مزود تجريبي خارج الإنتاج: بلا مصادقة مع تحذير صريح، ويصبح مغلقاً بمجرد ضبط السر', () => {
    const c = loadConfig({ AI_PROVIDER: 'mock' });
    expect(c.insecureNoAuth).toBe(true);
    expect(c.warnings.join(' ')).toContain('AUTH DISABLED');
    expect(loadConfig({ AI_PROVIDER: 'mock', TUTOR_TOKEN_SECRET: SECRET }).insecureNoAuth).toBe(false);
    expect(() => loadConfig({ AI_PROVIDER: 'mock', NODE_ENV: 'production' })).toThrow();
  });
  it('قائمة الإبطال: من المتغير ومن ملف، وتعذر قراءة الملف يُبقي آخر قائمة', () => {
    let now = T0;
    let fileText = '# comment\nu-111111111111\n';
    let readable = true;
    const c = loadConfig({ ...prod, REVOKED_TOKEN_IDS: 'u-222222222222', TUTOR_REVOKED_FILE: '/x' }, { readFile: () => { if (!readable) throw new Error('nope'); return fileText; } });
    expect([...c.revoked(now)].sort()).toEqual(['u-111111111111', 'u-222222222222']);
    fileText += 'u-333333333333\n';
    expect(c.revoked(now + 1000).has('u-333333333333')).toBe(false); // ضمن نافذة التخزين المؤقت
    now += 31000;
    expect(c.revoked(now).has('u-333333333333')).toBe(true);
    readable = false;
    now += 31000;
    expect(c.revoked(now).has('u-333333333333')).toBe(true);
  });
});

describe('الخادم عبر HTTP حقيقي', () => {
  let srv;
  afterEach(() => new Promise((r) => { if (!srv) return r(); srv.closeAllConnections(); srv.close(r); }));
  const tokens = { a: issueToken({ secret: SECRET }), b: issueToken({ secret: SECRET }) };
  const boot = async (opts = {}) => {
    const logs = [];
    srv = createTutorServer({
      provider: createMockProvider(),
      auth: createAuth({ secrets: [SECRET], revoked: opts.revoked || (() => new Set()), now: opts.now }),
      allowedOrigin: 'https://app.example',
      log: (m) => logs.push(m),
      ...opts.server,
    });
    srv.listen(0, '127.0.0.1');
    await once(srv, 'listening');
    return { url: `http://127.0.0.1:${srv.address().port}`, logs };
  };
  const post = (url, token, extra = {}, body = { messages: msgs() }) =>
    fetch(url + '/api/tutor/chat', { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}), ...extra }, body: JSON.stringify(body) });
  const err = async (r) => (await r.json()).error;

  it('بلا رمز: 401 ولا يستدعي المزود', async () => {
    let calls = 0;
    const { url } = await boot({ server: { provider: { name: 'x', complete: async () => { calls++; return '{}'; } } } });
    const r = await post(url, '');
    expect(r.status).toBe(401);
    expect(await err(r)).toBe('missing_token');
    expect(calls).toBe(0);
  });
  it('رمز غير صحيح / تالف / موقَّع بسر آخر: 401 invalid_token', async () => {
    const { url } = await boot();
    for (const t of ['garbage', tokens.a.token.slice(0, -3) + 'AAA', issueToken({ secret: OLD_SECRET }).token]) {
      const r = await post(url, t);
      expect(r.status).toBe(401);
      expect(await err(r)).toBe('invalid_token');
    }
  });
  it('رمز منتهي: 401 expired_token', async () => {
    const old = issueToken({ secret: SECRET, ttlDays: 1, now: Date.now() - 2 * 86400e3 });
    const { url } = await boot();
    const r = await post(url, old.token);
    expect(r.status).toBe(401);
    expect(await err(r)).toBe('expired_token');
  });
  it('رمز مُبطَل: 401 revoked_token، وغيره يعمل', async () => {
    const { url } = await boot({ revoked: () => new Set([tokens.a.id]) });
    expect(await err(await post(url, tokens.a.token))).toBe('revoked_token');
    expect((await post(url, tokens.b.token)).status).toBe(200);
  });
  it('رمز صحيح من أصل مسموح: 200 مع CORS', async () => {
    const { url } = await boot();
    const r = await post(url, tokens.a.token, { origin: 'https://app.example' });
    expect(r.status).toBe(200);
    expect(r.headers.get('access-control-allow-origin')).toBe('https://app.example');
  });
  it('أصل غير مسموح مع رمز صحيح: 403 بلا CORS', async () => {
    const { url } = await boot();
    const r = await post(url, tokens.a.token, { origin: 'https://evil.example' });
    expect(r.status).toBe(403);
    expect(r.headers.get('access-control-allow-origin')).toBeNull();
  });
  it('الأصل المفقود (curl أو سكربت): بلا رمز 401، ومع رمز صحيح 200 — فالأصل ليس مصادقة', async () => {
    const { url } = await boot();
    expect((await post(url, '')).status).toBe(401);
    expect((await post(url, tokens.a.token)).status).toBe(200);
  });
  it('لا أصل مضبوط في الخادم: يُرفض كل طلب يحمل Origin (فشل مغلق)', async () => {
    const { url } = await boot({ server: { allowedOrigin: '' } });
    const r = await post(url, tokens.a.token, { origin: 'https://app.example' });
    expect(r.status).toBe(403);
    expect(r.headers.get('access-control-allow-origin')).toBeNull();
  });
  it('preflight يسمح بترويسة Authorization للأصل المسموح فقط', async () => {
    const { url } = await boot();
    const ok = await fetch(url + '/api/tutor/chat', { method: 'OPTIONS', headers: { origin: 'https://app.example' } });
    expect(ok.status).toBe(204);
    expect(ok.headers.get('access-control-allow-headers')).toContain('authorization');
    const bad = await fetch(url + '/api/tutor/chat', { method: 'OPTIONS', headers: { origin: 'https://evil.example' } });
    expect(bad.headers.get('access-control-allow-origin')).toBeNull();
  });
  it('الصحة لا تكشف المزود', async () => {
    const { url } = await boot();
    expect(await (await fetch(url + '/api/tutor/health')).json()).toEqual({ ok: true });
  });
  it('الحدود لكل مستخدم موثَّق لا لكل IP: مستخدمان من العنوان نفسه لا يتشاركان الحصة', async () => {
    const { url } = await boot({ server: { limiter: createLimiter({ perMinute: 100, perUserDay: 2, perDay: 100 }) } });
    expect((await post(url, tokens.a.token)).status).toBe(200);
    expect((await post(url, tokens.a.token)).status).toBe(200);
    const over = await post(url, tokens.a.token);
    expect(over.status).toBe(429);
    expect(await err(over)).toBe('user_daily_cap');
    expect((await post(url, tokens.b.token)).status).toBe(200);
  });
  it('السقف العام للتكلفة يوقف الجميع', async () => {
    const { url } = await boot({ server: { limiter: createLimiter({ perMinute: 100, perUserDay: 100, perDay: 2 }) } });
    expect((await post(url, tokens.a.token)).status).toBe(200);
    expect((await post(url, tokens.b.token)).status).toBe(200);
    const r = await post(url, tokens.a.token);
    expect(r.status).toBe(429);
    expect(await err(r)).toBe('daily_cap');
  });
  it('إغراق برموز فاشلة يتحول من 401 إلى 429 ولا يستهلك حصة أحد', async () => {
    const limiter = createLimiter({ perMinute: 100, perUserDay: 100, perDay: 100, authFailPerMinute: 3 });
    const { url } = await boot({ server: { limiter } });
    const codes = [];
    for (let i = 0; i < 6; i++) codes.push((await post(url, 'bad' + i)).status);
    expect(codes).toEqual([401, 401, 401, 429, 429, 429]);
    expect(limiter.status().used).toBe(0);
  });
  it('الخادم يرفض البدء بلا مصادقة إلا بتصريح صريح للتجارب', () => {
    expect(() => createTutorServer({ provider: createMockProvider() })).toThrow(/requires auth/);
    expect(() => createTutorServer({ provider: createMockProvider(), insecureNoAuth: true })).not.toThrow();
  });
  it('السجلات: فيها معرّف المستخدم ولا فيها الرمز ولا نص المحادثة ولا الأسرار', async () => {
    const { url, logs } = await boot();
    await post(url, tokens.a.token, {}, { messages: msgs('my private sentence 0123') });
    await post(url, 'bad-token-value');
    const all = logs.join('\n');
    expect(all).toContain(tokens.a.id);
    expect(all).not.toContain(tokens.a.token);
    expect(all).not.toContain('private');
    expect(all).not.toContain('bad-token-value');
    expect(all).not.toContain(SECRET);
  });
  it('خطأ المزود الذي يحمل سراً لا يظهر في السجل ولا في الرد', async () => {
    const leak = 'sk-ant-LEAKLEAKLEAKLEAK1234';
    const { url, logs } = await boot({ server: { provider: { name: 'x', complete: async () => { throw new Error('boom ' + leak); } } } });
    const r = await post(url, tokens.a.token);
    expect(r.status).toBe(502);
    expect(await r.text()).not.toContain(leak);
    expect(logs.join('\n')).not.toContain(leak);
    expect(logs.join('\n')).toContain('kind=error');
  });
  it('انقطاع العميل يوقف طلب المزود', async () => {
    let aborted;
    const provider = { name: 'slow', complete: ({ signal }) => new Promise((_, rej) => { signal.addEventListener('abort', () => { aborted = true; rej(new Error('x')); }); }) };
    const { url } = await boot({ server: { provider } });
    const ctl = new AbortController();
    const q = fetch(url + '/api/tutor/chat', { method: 'POST', signal: ctl.signal, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tokens.a.token }, body: JSON.stringify({ messages: msgs() }) }).catch(() => {});
    await new Promise((r) => setTimeout(r, 150));
    ctl.abort();
    await q;
    await new Promise((r) => setTimeout(r, 150));
    expect(aborted).toBe(true);
  });
  it('حدود الحجم والرسائل ما زالت مفروضة بعد المصادقة', async () => {
    const { url } = await boot();
    expect((await post(url, tokens.a.token, {}, { messages: [] })).status).toBe(400);
    expect((await post(url, tokens.a.token, {}, { messages: msgs('x'.repeat(5000)) })).status).toBe(400);
    const big = await fetch(url + '/api/tutor/chat', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tokens.a.token }, body: 'x'.repeat(20000) });
    expect(big.status).toBe(413);
  });
});

describe('الحدود: الاستمرارية والذاكرة', () => {
  it('الحصة اليومية تصمد أمام إعادة التشغيل', () => {
    const f = join(tmp(), 'limits.json');
    let t = T0;
    const mk = () => createLimiter({ perMinute: 100, perUserDay: 2, perDay: 3, persistPath: f, now: () => t });
    const a = mk();
    expect(a.check('u-1').ok).toBe(true);
    expect(a.check('u-1').ok).toBe(true);
    const b = mk(); // "إعادة تشغيل"
    expect(b.check('u-1')).toEqual({ ok: false, reason: 'user_daily_cap' });
    expect(b.check('u-2').ok).toBe(true);
    const c = mk();
    expect(c.check('u-3')).toEqual({ ok: false, reason: 'daily_cap' });
    t += 86400e3; // يوم جديد
    expect(mk().check('u-1').ok).toBe(true);
  });
  it('ملف حالة تالف: إغلاق لباقي اليوم بدل تصفير العدّاد، ثم يعود في اليوم التالي', () => {
    const f = join(tmp(), 'limits.json');
    writeFileSync(f, '{broken');
    let t = T0;
    const logs = [];
    const l = createLimiter({ persistPath: f, now: () => t, log: (m) => logs.push(m) });
    expect(l.check('u-1')).toEqual({ ok: false, reason: 'daily_cap' });
    expect(l.status().degraded).toBe(true);
    expect(logs.join(' ')).toContain('corrupt');
    t += 86400e3;
    expect(l.check('u-1').ok).toBe(true);
    expect(l.status().degraded).toBe(false);
  });
  it('شكل خاطئ للملف يُعامل كتالف، وغيابه يعني بداية نظيفة', () => {
    const d = tmp();
    writeFileSync(join(d, 'bad.json'), JSON.stringify({ day: 5, n: 'x' }));
    expect(createLimiter({ persistPath: join(d, 'bad.json'), now: () => T0 }).check('u').ok).toBe(false);
    expect(createLimiter({ persistPath: join(d, 'none.json'), now: () => T0 }).check('u').ok).toBe(true);
  });
  it('تعذر الكتابة: يستمر العدّ في الذاكرة ويُسجَّل التحذير', () => {
    const logs = [];
    const blocker = join(tmp(), 'file'); // ملف عادي: لا يمكن إنشاء مجلد تحته فتفشل الكتابة فوراً
    writeFileSync(blocker, 'x');
    const l = createLimiter({ perDay: 2, persistPath: join(blocker, 'x', 'limits.json'), now: () => T0, log: (m) => logs.push(m) });
    expect(l.check('u').ok).toBe(true);
    expect(l.check('u').ok).toBe(true);
    expect(l.check('u')).toEqual({ ok: false, reason: 'daily_cap' });
    expect(l.status().persistFailing).toBe(true);
    expect(logs.filter((m) => m.includes('not persisted')).length).toBe(1);
  });
  it('حالة محفوظة من يوم سابق لا تؤثر', () => {
    const f = join(tmp(), 'l.json');
    writeFileSync(f, JSON.stringify({ day: '2020-01-01', n: 999, users: { 'u-1': 999 } }));
    expect(createLimiter({ perDay: 5, persistPath: f, now: () => T0 }).check('u-1').ok).toBe(true);
  });
  it('الذاكرة محدودة: لا تتضخم مفاتيح IP ولا المستخدمين', () => {
    let t = T0;
    const l = createLimiter({ maxKeys: 50, perDay: 1e9, perUserDay: 1e9, authFailPerMinute: 1e9, now: () => t });
    for (let i = 0; i < 500; i++) l.authFailure('ip-' + i);
    expect(l.status().keys).toBeLessThanOrEqual(50);
    for (let i = 0; i < 500; i++) l.check('u-' + i);
    expect(l.status().keys).toBeLessThanOrEqual(100);
    expect(l.status().users).toBeLessThanOrEqual(50);
    t += 61000; // تنظف المفاتيح القديمة فيتسع المجال لجدد
    expect(l.authFailure('fresh').ok).toBe(true);
  });
  it('حد الدقيقة لكل مفتاح كما كان', () => {
    let t = T0;
    const l = createLimiter({ perMinute: 2, now: () => t });
    expect(l.check('a').ok && l.check('a').ok).toBe(true);
    expect(l.check('a').reason).toBe('rate_limited');
    t += 61000;
    expect(l.check('a').ok).toBe(true);
  });
});

describe('عميل الواجهة والرمز', () => {
  const mkFetch = (status, body, seen) => async (url, init) => {
    seen.push({ url, init });
    return { ok: status < 400, status, json: async () => body };
  };
  it('يرسل Authorization عند وجود رمز ولا يرسله بدونه', async () => {
    const seen = [];
    const payload = { level: 'A2', messages: msgs() };
    const ok = { reply: 'hi' };
    await createTutorClient({ endpoint: 'https://s.example', token: 'tok.en', fetchImpl: mkFetch(200, ok, seen), isOnline: () => true }).chat(payload);
    await createTutorClient({ endpoint: 'https://s.example', fetchImpl: mkFetch(200, ok, seen), isOnline: () => true }).chat(payload);
    expect(seen[0].init.headers.authorization).toBe('Bearer tok.en');
    expect(seen[1].init.headers.authorization).toBeUndefined();
  });
  it('رسائل مفهومة لكل خطأ مصادقة', async () => {
    for (const code of ['missing_token', 'invalid_token', 'expired_token', 'revoked_token', 'user_daily_cap']) {
      const r = await createTutorClient({ endpoint: 'https://s.example', fetchImpl: mkFetch(code === 'user_daily_cap' ? 429 : 401, { error: code }, []), isOnline: () => true }).chat({ messages: msgs() });
      expect(r).toEqual({ ok: false, error: code });
    }
    const r401 = await createTutorClient({ endpoint: 'https://s.example', fetchImpl: mkFetch(401, null, []), isOnline: () => true }).chat({ messages: msgs() });
    expect(r401.error).toBe('invalid_token');
  });
});

describe('تشغيل الخادم فعلياً كعملية (index.mjs وسكربت الإصدار)', () => {
  const run = (args, env) => new Promise((resolve) => {
    const p = spawn(process.execPath, args, { env: { PATH: process.env.PATH, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', errOut = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (errOut += d));
    p.on('close', (code) => resolve({ code, out, errOut }));
  });

  it('يرفض البدء في إنتاج ناقص (الأصل أو السر)', async () => {
    for (const env of [
      { AI_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'k', TUTOR_TOKEN_SECRET: SECRET },
      { AI_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'k', ALLOWED_ORIGIN: 'https://app.example' },
      { NODE_ENV: 'production', AI_PROVIDER: 'mock' },
    ]) {
      const r = await run(['server/index.mjs'], env);
      expect(r.code).toBe(1);
      expect(r.errOut).toContain('refusing to start');
    }
  });

  it('سكربت الإصدار يطبع رمزاً يقبله الخادم الفعلي، ويرفض سراً قصيراً', async () => {
    const bad = await run(['scripts/issue-token.mjs'], { TUTOR_TOKEN_SECRET: 'short' });
    expect(bad.code).toBe(1);
    const iss = await run(['scripts/issue-token.mjs', '--days', '2', '--label', 'ahmed'], { TUTOR_TOKEN_SECRET: SECRET });
    expect(iss.code).toBe(0);
    const token = /token:\s+(\S+)/.exec(iss.out)[1];
    expect(verifyToken(token, { secrets: [SECRET] }).ok).toBe(true);
    expect(iss.out).toContain('ahmed');
    expect(token).not.toContain('ahmed');

    const port = 18700 + Math.floor(Math.random() * 200);
    const p = spawn(process.execPath, ['server/index.mjs'], {
      env: { PATH: process.env.PATH, AI_PROVIDER: 'mock', NODE_ENV: 'production', ALLOWED_ORIGIN: 'https://app.example', TUTOR_TOKEN_SECRET: SECRET, PORT: String(port), LIMITS_FILE: join(tmp(), 'l.json') },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    try {
      await new Promise((res, rej) => { p.stdout.on('data', (d) => String(d).includes('tutor server on') && res()); p.on('close', () => rej(new Error('exited'))); setTimeout(() => rej(new Error('timeout')), 8000); });
      const base = `http://127.0.0.1:${port}/api/tutor/chat`;
      const body = JSON.stringify({ messages: msgs() });
      expect((await fetch(base, { method: 'POST', headers: { 'content-type': 'application/json' }, body })).status).toBe(401);
      expect((await fetch(base, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, body })).status).toBe(200);
    } finally {
      p.kill();
    }
  });
});
