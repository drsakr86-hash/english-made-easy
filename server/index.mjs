// تشغيل (إنتاج): AI_PROVIDER=anthropic ANTHROPIC_API_KEY=... ALLOWED_ORIGIN=https://موقعك TUTOR_TOKEN_SECRET=<32+ حرفاً> node server/index.mjs
// تجربة محلية: AI_PROVIDER=mock node server/index.mjs (بلا مصادقة، للتجارب فقط). إصدار رموز المتعلمين: node scripts/issue-token.mjs
import { createTutorServer } from './tutor-server.mjs';
import { createLimiter } from './limits.js';
import { createAuth } from './auth.js';
import { loadConfig } from './config.js';
import { createMockProvider } from './providers/mock.js';
import { createAnthropicProvider } from './providers/anthropic.js';

let cfg;
try {
  cfg = loadConfig(process.env);
} catch (e) {
  // فشل مغلق: لا يبدأ الخادم بإعداد إنتاج ناقص أو غير آمن
  console.error('refusing to start: ' + e.message);
  process.exit(1);
}
for (const w of cfg.warnings) console.warn('WARNING: ' + w);
const provider = cfg.kind === 'anthropic' ? createAnthropicProvider({ apiKey: cfg.apiKey, model: cfg.model }) : createMockProvider();
const limiter = createLimiter({ ...cfg.limits, log: (m) => console.log(m) });
const auth = cfg.insecureNoAuth ? null : createAuth({ secrets: cfg.secrets, revoked: () => cfg.revoked() });
const server = createTutorServer({ provider, allowedOrigin: cfg.allowedOrigin, limiter, auth, insecureNoAuth: cfg.insecureNoAuth });
server.listen(cfg.port, () => console.log(`tutor server on :${cfg.port} provider=${provider.name} origin=${cfg.allowedOrigin || '(none)'} auth=${auth ? 'on' : 'OFF'}`));
