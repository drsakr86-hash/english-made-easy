import { getRaw, setRaw } from './localStorage.js';
import { KEYS } from './keys.js';
import { emptyTutor } from '../engines/ai/conversation.js';

const validMsg = (m) => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string' && typeof m.at === 'string';
const validConv = (c) => c && /^c-\d{3,}$/.test(c.id) && typeof c.level === 'string' && typeof c.startedAt === 'string' && Array.isArray(c.messages) && c.messages.every(validMsg);

export function loadTutor(backend) {
  try {
    const raw = getRaw(backend, KEYS.tutor);
    if (!raw) return emptyTutor();
    const v = JSON.parse(raw);
    const conversations = (Array.isArray(v.conversations) ? v.conversations : []).filter(validConv).map((c) => ({ ...c, corrections: Array.isArray(c.corrections) ? c.corrections : [], suggested: Array.isArray(c.suggested) ? c.suggested : [], saved: Array.isArray(c.saved) ? c.saved : [] }));
    const u = v.usage || {};
    return { conversations, usage: { day: typeof u.day === 'string' ? u.day : '', count: Number.isInteger(u.count) && u.count >= 0 ? u.count : 0 } };
  } catch {
    return emptyTutor();
  }
}
export const saveTutor = (backend, s) => setRaw(backend, KEYS.tutor, JSON.stringify({ version: 1, ...s }));

export function loadEndpoint(backend, fallback = '') {
  try {
    const e = JSON.parse(getRaw(backend, KEYS.settings) || '{}').aiEndpoint;
    return typeof e === 'string' ? e : fallback;
  } catch {
    return fallback;
  }
}
export function saveEndpoint(backend, endpoint) {
  let s = {};
  try { s = JSON.parse(getRaw(backend, KEYS.settings) || '{}'); } catch { /* نبدأ من فارغ */ }
  return setRaw(backend, KEYS.settings, JSON.stringify({ ...s, aiEndpoint: endpoint }));
}
