// يقرأ إعداد الخادم من البيئة ويفشل عند البدء إن كان إعداد الإنتاج ناقصاً أو غير آمن (fail closed).
// الإنتاج = NODE_ENV=production أو مزود حقيقي (غير mock). التجربة المحلية بمزود mock تسمح بلا مصادقة مع تحذير صريح.
import { readFileSync } from 'node:fs';
import { MIN_SECRET_LEN } from './auth.js';

const num = (v, d) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : d);

/** يطبّع ALLOWED_ORIGIN إلى origin صرف (بلا مسار) أو يرمي. */
export function normalizeOrigin(v) {
  let u;
  try {
    u = new URL(v);
  } catch {
    throw new Error('ALLOWED_ORIGIN is not a valid URL');
  }
  if ((u.pathname !== '/' && u.pathname !== '') || u.search || u.hash || u.username) throw new Error('ALLOWED_ORIGIN must be an origin only (scheme://host[:port])');
  return u.origin;
}

export function loadConfig(env = process.env, { readFile = (p) => readFileSync(p, 'utf8') } = {}) {
  const kind = env.AI_PROVIDER || 'mock';
  const production = env.NODE_ENV === 'production' || kind !== 'mock';
  const warnings = [];

  let allowedOrigin = '';
  if (env.ALLOWED_ORIGIN) allowedOrigin = normalizeOrigin(env.ALLOWED_ORIGIN);
  const local = (o) => /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
  if (production) {
    if (!allowedOrigin) throw new Error('ALLOWED_ORIGIN is required in production');
    if (!allowedOrigin.startsWith('https://') && !local(allowedOrigin)) throw new Error('ALLOWED_ORIGIN must be https in production');
  }

  const secrets = [env.TUTOR_TOKEN_SECRET, env.TUTOR_TOKEN_SECRET_PREVIOUS].filter(Boolean);
  if (secrets.some((s) => s.length < MIN_SECRET_LEN)) throw new Error(`TUTOR_TOKEN_SECRET must be at least ${MIN_SECRET_LEN} characters`);
  let insecureNoAuth = false;
  if (!secrets.length) {
    if (production) throw new Error('TUTOR_TOKEN_SECRET is required in production');
    insecureNoAuth = true;
    warnings.push('AUTH DISABLED (mock provider, non-production): anyone who can reach this server can use it');
  }

  const revokedFile = env.TUTOR_REVOKED_FILE || '';
  const revokedEnv = (env.REVOKED_TOKEN_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
  let cache = { at: 0, set: new Set(revokedEnv) };
  /** قائمة الإبطال: من المتغير ومن ملف اختياري (سطر لكل معرّف) يُعاد قراءته كل 30 ثانية. */
  const revoked = (now = Date.now()) => {
    if (!revokedFile || now - cache.at < 30000) return cache.set;
    let set = new Set(revokedEnv);
    try {
      for (const l of readFile(revokedFile).split(/\r?\n/)) if (l.trim() && !l.startsWith('#')) set.add(l.trim());
    } catch {
      set = cache.set; // تعذرت القراءة: نُبقي آخر قائمة معروفة (لا نفرغها)
    }
    cache = { at: now, set };
    return set;
  };

  return {
    kind,
    production,
    warnings,
    allowedOrigin,
    secrets,
    insecureNoAuth,
    revoked,
    model: env.AI_MODEL || undefined,
    apiKey: env.ANTHROPIC_API_KEY,
    port: num(env.PORT, 8787),
    limits: {
      perMinute: num(env.RATE_PER_MINUTE, 20),
      perUserDay: num(env.PER_USER_DAILY, 50) >= 1 ? num(env.PER_USER_DAILY, 50) : 50,
      perDay: num(env.DAILY_CAP, 300),
      authFailPerMinute: num(env.AUTH_FAIL_PER_MINUTE, 30),
      maxKeys: num(env.LIMITS_MAX_KEYS, 10000) || 10000,
      persistPath: env.LIMITS_FILE || '.limits-state.json',
    },
  };
}
