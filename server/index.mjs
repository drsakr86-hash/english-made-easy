// تشغيل: AI_PROVIDER=mock node server/index.mjs   أو   ANTHROPIC_API_KEY=... AI_PROVIDER=anthropic ALLOWED_ORIGIN=https://موقعك node server/index.mjs
import { createTutorServer } from './tutor-server.mjs';
import { createLimiter } from './limits.js';
import { createMockProvider } from './providers/mock.js';
import { createAnthropicProvider } from './providers/anthropic.js';

const env = process.env;
const kind = env.AI_PROVIDER || 'mock';
const provider = kind === 'anthropic' ? createAnthropicProvider({ apiKey: env.ANTHROPIC_API_KEY, model: env.AI_MODEL || undefined }) : createMockProvider();
const limiter = createLimiter({ perMinute: Number(env.RATE_PER_MINUTE) || 20, perDay: Number(env.DAILY_CAP) || 1000 });
const server = createTutorServer({ provider, allowedOrigin: env.ALLOWED_ORIGIN || '', limiter });
const port = Number(env.PORT) || 8787;
server.listen(port, () => console.log(`tutor server on :${port} provider=${provider.name} origin=${env.ALLOWED_ORIGIN || '(none)'}`));
