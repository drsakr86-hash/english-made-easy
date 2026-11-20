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

/** رمز دخول المدرس (يُسلَّم من المسؤول). يُحفظ في الإعدادات على هذا الجهاز فقط ويدخل في النسخة الاحتياطية. */
export function loadToken(backend) {
  try {
    const t = JSON.parse(getRaw(backend, KEYS.settings) || '{}').aiToken;
    return typeof t === 'string' ? t : '';
  } catch {
    return '';
  }
}
export function saveToken(backend, token) {
  let s = {};
  try { s = JSON.parse(getRaw(backend, KEYS.settings) || '{}'); } catch { /* نبدأ من فارغ */ }
  return setRaw(backend, KEYS.settings, JSON.stringify({ ...s, aiToken: token }));
}

/**
 * رابط دعوة: ‎#t=<الرمز>. الجزء بعد # لا يُرسل إلى أي خادم. يُحفظ الرمز إن كان بالشكل الصحيح ثم يُمحى من شريط العنوان.
 * يعيد true فقط إذا حُفظ رمز.
 */
const INVITE_RE = /^eme1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
export function consumeInviteFromHash(backend, loc, hist) {
  try {
    const m = /^#t=([^&]*)$/.exec((loc && loc.hash) || '');
    if (!m) return false;
    const t = decodeURIComponent(m[1]).trim();
    const ok = INVITE_RE.test(t) && saveToken(backend, t);
    if (hist && typeof hist.replaceState === 'function') hist.replaceState(null, '', loc.pathname + (loc.search || ''));
    return !!ok;
  } catch {
    return false;
  }
}
