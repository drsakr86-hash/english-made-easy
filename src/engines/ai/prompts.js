// منطق مشترك بين الواجهة والخادم الوسيط: بناء التعليمات والتحقق من الطلب وتحليل الرد.
// لا يعتمد على المتصفح ولا على Node (ES نقي).
import { scenarios, topics } from '../../data/tutor/scenarios.js';

export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
export const CORRECTION_MODES = ['instant', 'after'];
export const LIMITS = { maxMessages: 12, maxChars: 600, maxTotalChars: 4000 };

const LEVEL_STYLE = {
  A1: 'Use very short, simple sentences and only the most common words. Speak slowly. One question at a time.',
  A2: 'Use simple sentences and everyday vocabulary. Keep replies to 1-3 sentences.',
  B1: 'Use clear, natural English with some common phrasal verbs. Keep replies to 2-4 sentences.',
  B2: 'Use natural English with varied vocabulary and some idioms. Keep replies short.',
  C1: 'Use fluent, nuanced English including idioms. Keep replies short.',
  C2: 'Use fully natural, sophisticated English. Keep replies short.',
};

/** تعليمات النظام تُبنى في الخادم فقط من معلمات تم التحقق منها (لا يرسل العميل نص التعليمات). */
export function buildSystemPrompt({ level, mode, scenarioId, topicId }) {
  const sc = scenarios.find((s) => s.id === scenarioId);
  const tp = topics.find((t) => t.id === topicId);
  const lines = [
    'You are an English tutor inside a learning app for Arabic-speaking learners.',
    `Learner level (CEFR, estimated): ${level}. ${LEVEL_STYLE[level]}`,
    'Always stay in English for the conversation; never answer in Arabic. Be warm and encouraging. Encourage full-sentence answers.',
    'Never invent grammar rules or facts. If unsure, say so briefly.',
    'Do not ask for or use personal data (full name, phone, address, ID, passwords).',
  ];
  if (mode === 'roleplay' && sc) {
    lines.push(`Role-play: you play ${sc.aiRole}. The learner plays ${sc.learnerRole}. Goal: ${sc.goal}. Stay in your role and move the scene forward.`);
  } else {
    lines.push(`Free conversation about everyday life${tp ? `, topic: ${tp.title}` : ''}. Ask one level-appropriate question at a time.`);
  }
  lines.push(
    'Reply ONLY with one JSON object, no markdown, in this exact shape:',
    '{"reply": string (your next message, English), "corrections": [{"original": string, "corrected": string, "explanation": string (Arabic, one short sentence), "example": string (English)}], "newWords": [{"en": string, "ar": string, "ex": string, "exAr": string}]}',
    'corrections: only real mistakes in the learner\'s LAST message (max 2), else []. "original" and "corrected" must each be the learner\'s FULL sentence (before and after the fix), not a fragment. newWords: up to 2 useful words from your reply at the learner\'s level, else [].',
  );
  return lines.join('\n');
}

const isStr = (x, max = 600) => typeof x === 'string' && x.trim().length > 0 && x.length <= max;

/** تحقق من جسم الطلب. يرجع {ok:true,value} أو {ok:false,error}. لا يقبل أي حقل خارج المعروف. */
export function validateChatRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'bad_request' };
  const level = body.level ?? 'A2';
  if (!LEVELS.includes(level)) return { ok: false, error: 'bad_level' };
  const mode = body.mode ?? 'conversation';
  if (!['conversation', 'roleplay'].includes(mode)) return { ok: false, error: 'bad_mode' };
  if (mode === 'roleplay' && !scenarios.some((s) => s.id === body.scenarioId)) return { ok: false, error: 'bad_scenario' };
  if (body.topicId !== undefined && !topics.some((t) => t.id === body.topicId)) return { ok: false, error: 'bad_topic' };
  const correctionMode = body.correctionMode ?? 'instant';
  if (!CORRECTION_MODES.includes(correctionMode)) return { ok: false, error: 'bad_correction_mode' };
  const m = body.messages;
  if (!Array.isArray(m) || m.length < 1 || m.length > LIMITS.maxMessages) return { ok: false, error: 'bad_messages' };
  let total = 0;
  for (const x of m) {
    if (!x || typeof x !== 'object' || !['user', 'assistant'].includes(x.role) || !isStr(x.content, LIMITS.maxChars)) return { ok: false, error: 'bad_messages' };
    total += x.content.length;
  }
  if (total > LIMITS.maxTotalChars || m[m.length - 1].role !== 'user') return { ok: false, error: 'bad_messages' };
  return {
    ok: true,
    value: { level, mode, scenarioId: mode === 'roleplay' ? body.scenarioId : undefined, topicId: body.topicId, correctionMode, messages: m.map((x) => ({ role: x.role, content: x.content })) },
  };
}

const str = (x, max) => (typeof x === 'string' ? x.trim().slice(0, max) : '');

/** يحلل رد النموذج ويطبّعه. أي رد غير صالح يتحول إلى نص عادي بلا تصحيحات (لا ينهار التطبيق). */
export function parseTutorReply(text) {
  const raw = String(text ?? '').trim();
  let obj = null;
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    obj = m ? JSON.parse(m[0]) : null;
  } catch {
    obj = null;
  }
  if (!obj || typeof obj !== 'object' || !str(obj.reply, 1200)) {
    return { reply: raw.slice(0, 1200), corrections: [], newWords: [], structured: false };
  }
  const corrections = (Array.isArray(obj.corrections) ? obj.corrections : [])
    .map((c) => ({ original: str(c && c.original, 300), corrected: str(c && c.corrected, 300), explanation: str(c && c.explanation, 300), example: str(c && c.example, 300) }))
    .filter((c) => c.original && c.corrected && c.original !== c.corrected)
    .slice(0, 2);
  const newWords = (Array.isArray(obj.newWords) ? obj.newWords : [])
    .map((w) => ({ en: str(w && w.en, 60), ar: str(w && w.ar, 80), ex: str(w && w.ex, 200), exAr: str(w && w.exAr, 200) }))
    .filter((w) => w.en && w.ar)
    .slice(0, 2);
  return { reply: str(obj.reply, 1200), corrections, newWords, structured: true };
}
