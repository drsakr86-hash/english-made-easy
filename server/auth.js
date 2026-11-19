// رموز دعوة موقّعة (HMAC-SHA256) لتعريف المتعلم دون حسابات ولا خدمات خارجية.
// الصيغة: eme1.<payload base64url>.<signature base64url>، والحمولة { sub, iat, exp } فقط (لا بيانات شخصية).
// السر لا يوضع في الواجهة أبداً: يُقرأ من بيئة الخادم، والرمز يُسلَّم لكل متعلم على حدة ويمكن إبطاله.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const PREFIX = 'eme1';
const MAX_TOKEN_LEN = 512;
const SUB_RE = /^u-[0-9a-f]{8,32}$/;
export const MIN_SECRET_LEN = 32;

const b64 = (buf) => Buffer.from(buf).toString('base64url');
const sign = (secret, data) => createHmac('sha256', secret).update(data).digest();

/** يصدر رمزاً جديداً. now بالمللي ثانية، ttlDays بين 1 و365. يُرجع { token, id, expiresAt }. */
export function issueToken({ secret, ttlDays = 30, now = Date.now(), id } = {}) {
  if (typeof secret !== 'string' || secret.length < MIN_SECRET_LEN) throw new Error('secret too short');
  if (!Number.isFinite(ttlDays) || ttlDays < 1 || ttlDays > 365) throw new Error('ttlDays must be 1..365');
  const sub = id || 'u-' + randomBytes(6).toString('hex');
  if (!SUB_RE.test(sub)) throw new Error('bad id');
  const iat = Math.floor(now / 1000);
  const exp = iat + Math.round(ttlDays * 86400);
  const head = `${PREFIX}.${b64(JSON.stringify({ sub, iat, exp }))}`;
  return { token: `${head}.${b64(sign(secret, head))}`, id: sub, expiresAt: new Date(exp * 1000).toISOString() };
}

/**
 * يتحقق من الرمز. secrets: السر الحالي ثم السابق (لتدوير الأسرار دون قطع المستخدمين).
 * revoked: دالة تُرجع Set بمعرّفات مُبطَلة. تُرجع { ok:true, sub } أو { ok:false, reason }
 * حيث reason: missing | malformed | bad_signature | expired | revoked.
 */
export function verifyToken(token, { secrets, revoked = () => new Set(), now = Date.now() }) {
  if (typeof token !== 'string' || token === '') return { ok: false, reason: 'missing' };
  if (token.length > MAX_TOKEN_LEN) return { ok: false, reason: 'malformed' };
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== PREFIX) return { ok: false, reason: 'malformed' };
  let sig;
  try {
    sig = Buffer.from(parts[2], 'base64url');
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  const head = `${parts[0]}.${parts[1]}`;
  // نجرّب كل الأسرار دون الخروج مبكراً، حتى لا يتغير زمن الاستجابة بحسب أي سر طابق
  let valid = false;
  for (const s of secrets) {
    const expected = sign(s, head);
    if (expected.length === sig.length && timingSafeEqual(expected, sig)) valid = true;
  }
  if (!valid) return { ok: false, reason: 'bad_signature' };
  let p;
  try {
    p = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (!p || typeof p.sub !== 'string' || !SUB_RE.test(p.sub) || !Number.isInteger(p.exp)) return { ok: false, reason: 'malformed' };
  if (Math.floor(now / 1000) >= p.exp) return { ok: false, reason: 'expired' };
  if (revoked().has(p.sub)) return { ok: false, reason: 'revoked' };
  return { ok: true, sub: p.sub };
}

/** يستخرج الرمز من ترويسة Authorization: Bearer <token>. */
export function bearer(header) {
  const m = /^Bearer ([^\s]+)$/.exec(typeof header === 'string' ? header : '');
  return m ? m[1] : '';
}

export function createAuth({ secrets, revoked, now }) {
  const list = (Array.isArray(secrets) ? secrets : [secrets]).filter(Boolean);
  if (!list.length || list.some((s) => s.length < MIN_SECRET_LEN)) throw new Error('auth secret too short');
  return { verify: (token) => verifyToken(token, { secrets: list, revoked, now }) };
}
