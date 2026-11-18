// حالة محادثات المدرس: دوال نقية. الوقت يُمرَّر.
export const MAX_CONVERSATIONS = 20;
export const MAX_STORED_MESSAGES = 60;
export const CONTEXT_MESSAGES = 10;
export const DAILY_USER_CAP = 40;

export const emptyTutor = () => ({ conversations: [], usage: { day: '', count: 0 } });
const pad = (n) => String(n).padStart(2, '0');
const dk = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function startConversation(state, { mode, scenarioId, topicId, level, correctionMode }, now) {
  const n = state.conversations.reduce((m, c) => Math.max(m, Number(c.id.slice(2))), 0) + 1;
  const conv = { id: 'c-' + String(n).padStart(3, '0'), mode, scenarioId: scenarioId || null, topicId: topicId || null, level, correctionMode, startedAt: now.toISOString(), endedAt: null, messages: [], corrections: [], suggested: [], saved: [] };
  return { state: { ...state, conversations: [...state.conversations, conv].slice(-MAX_CONVERSATIONS) }, id: conv.id };
}

const upd = (state, id, fn) => ({ ...state, conversations: state.conversations.map((c) => (c.id === id ? fn(c) : c)) });

export const addUser = (state, id, text, now) => upd(state, id, (c) => ({ ...c, messages: [...c.messages, { role: 'user', content: text.trim(), at: now.toISOString() }].slice(-MAX_STORED_MESSAGES) }));

export const addAssistant = (state, id, reply, now) =>
  upd(state, id, (c) => {
    const at = now.toISOString();
    const have = new Set(c.suggested.map((w) => w.en.toLowerCase()));
    return {
      ...c,
      messages: [...c.messages, { role: 'assistant', content: reply.reply, at }].slice(-MAX_STORED_MESSAGES),
      corrections: [...c.corrections, ...reply.corrections.map((x) => ({ ...x, at }))],
      suggested: [...c.suggested, ...reply.newWords.filter((w) => !have.has(w.en.toLowerCase()))],
    };
  });

export const endConversation = (state, id, now) => upd(state, id, (c) => (c.endedAt ? c : { ...c, endedAt: now.toISOString() }));
export const markSaved = (state, id, en) => upd(state, id, (c) => (c.saved.includes(en.toLowerCase()) ? c : { ...c, saved: [...c.saved, en.toLowerCase()] }));

/** السياق المرسل للخادم: آخر رسائل تنتهي برسالة المستخدم وتبدأ برسالة مستخدم. */
export function contextFor(conv) {
  let m = conv.messages.slice(-CONTEXT_MESSAGES);
  while (m.length && m[0].role !== 'user') m = m.slice(1);
  return m.map((x) => ({ role: x.role, content: x.content }));
}

export function canSend(usage, now) {
  return usage.day !== dk(now) || usage.count < DAILY_USER_CAP;
}
export function bumpUsage(usage, now) {
  return usage.day === dk(now) ? { day: usage.day, count: usage.count + 1 } : { day: dk(now), count: 1 };
}
