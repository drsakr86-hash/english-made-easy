// محرك المهارات (قراءة/استماع/كتابة): دوال نقية. الوقت يُمرَّر.
import { startTracking } from '../review/review.js';

export const LOG_LIMIT = 300;
export const emptySkills = () => ({ reading: {}, listening: {}, writing: {}, submissions: [], log: [] });

const norm = (s) => s.toLowerCase().replace(/[.,!?;:"“”]/g, '').replace(/\s+/g, ' ').trim();
export const normalizeEn = (s) => norm(String(s));

/** يسجّل محاولة درس (قراءة/استماع). يحتفظ بأفضل نتيجة وعدد المحاولات، ويضيف للسجل. */
export function recordAttempt(skills, kind, id, score, total, now) {
  const prev = skills[kind][id] || { attempts: 0, best: 0, bestTotal: total };
  const ratio = (s, t) => (t ? s / t : 0);
  const better = ratio(score, total) > ratio(prev.best, prev.bestTotal) || prev.attempts === 0;
  return {
    ...skills,
    [kind]: {
      ...skills[kind],
      [id]: {
        attempts: prev.attempts + 1,
        best: better ? score : prev.best,
        bestTotal: better ? total : prev.bestTotal,
        lastScore: score,
        lastTotal: total,
        lastAt: now.toISOString(),
      },
    },
    log: [...skills.log, { kind, id, score, total, at: now.toISOString() }].slice(-LOG_LIMIT),
  };
}

/** مقارنة إجابة ثابتة (ترتيب/تصحيح): لا حساسية للأحرف أو علامات الترقيم أو المسافات. */
export const checkFixed = (task, text) => ({ correct: norm(text) === norm(task.answer), expected: task.answer });

/** فحص آلي تقريبي للكتابة الحرة. ليس تقييماً لغوياً. */
export function checkFree(task, text) {
  const t = text.trim();
  const words = t ? t.split(/\s+/).length : 0;
  const lower = ' ' + norm(t) + ' ';
  return [
    { id: 'length', label: `الطول: ${words} كلمة (المطلوب ${task.minWords} على الأقل)`, ok: words >= task.minWords },
    { id: 'capital', label: 'تبدأ بحرف كبير', ok: /^[A-Z]/.test(t) },
    { id: 'end', label: 'تنتهي بعلامة ترقيم (. ؟ !)', ok: /[.!?]$/.test(t) },
    { id: 'pronoun', label: 'الضمير I بحرف كبير', ok: !/(^|\s)i(\s|'|$)/.test(t) },
    ...task.keywords.map((k) => ({ id: 'kw-' + k, label: `تستخدم كلمة: ${k}`, ok: lower.includes(' ' + k + ' ') || lower.includes(' ' + k + 's ') })),
  ];
}

/** يحفظ كتابة جديدة دون استبدال القديمة. تجاهل تكرار نفس النص لنفس المهمة (نقر مزدوج). */
export function addSubmission(skills, { taskId, text, checks }, now) {
  if (!text.trim()) return skills;
  if (skills.submissions.some((s) => s.taskId === taskId && s.text === text)) return skills;
  const n = skills.submissions.reduce((m, s) => Math.max(m, Number(s.id.slice(2))), 0) + 1;
  const sub = { id: 's-' + String(n).padStart(3, '0'), taskId, text, createdAt: now.toISOString(), passed: checks ? checks.filter((c) => c.ok).length : null, of: checks ? checks.length : null };
  return { ...skills, submissions: [...skills.submissions, sub], log: [...skills.log, { kind: 'writing', id: taskId, score: sub.passed, total: sub.of, at: now.toISOString() }].slice(-LOG_LIMIT) };
}

/** نتيجة مهمة ثابتة (ترتيب/تصحيح) تسجَّل في السجل وفي حالة المهمة. */
export function recordFixed(skills, taskId, correct, now) {
  const prev = skills.writing[taskId] || { attempts: 0, correct: 0 };
  return {
    ...skills,
    writing: { ...skills.writing, [taskId]: { attempts: prev.attempts + 1, correct: prev.correct + (correct ? 1 : 0), lastAt: now.toISOString() } },
    log: [...skills.log, { kind: 'writing', id: taskId, score: correct ? 1 : 0, total: 1, at: now.toISOString() }].slice(-LOG_LIMIT),
  };
}

const BANKS = ['words', 'expressions', 'idioms'];

/** يربط كلمة من درس ببنك المفردات: الأصلي أولاً ثم كلمات المستخدم، وإلا ينشئ معرّفاً جديداً u-NNN. */
export function resolveVocab(item, content, userwords) {
  const key = normalizeEn(item.en);
  for (const b of BANKS) {
    const hit = content[b].find((x) => normalizeEn(x.en) === key);
    if (hit) return { id: hit.id, source: 'bank' };
  }
  const own = Object.values(userwords.items).find((x) => normalizeEn(x.en) === key);
  if (own) return { id: own.id, source: 'user' };
  return { id: 'u-' + String(userwords.next).padStart(3, '0'), source: 'new' };
}

export const emptyUserWords = () => ({ items: {}, next: 1 });

/**
 * حفظ كلمة من درس: لا تكرار (يُعاد استخدام المعرّف)، وتدخل المراجعة إن لم تكن فيها.
 * يُرجع الحالات الجديدة دون تعديل المدخلات + status: added | already
 */
export function saveVocab(item, { content, userwords, review, source }, now) {
  const r = resolveVocab(item, content, userwords);
  let uw = userwords;
  if (r.source === 'new') {
    uw = { items: { ...userwords.items, [r.id]: { id: r.id, en: item.en, ar: item.ar, ex: item.ex, exAr: item.exAr, source } }, next: userwords.next + 1 };
  }
  const had = !!review[r.id];
  const rv = had ? review : { ...review, [r.id]: startTracking(undefined, r.id, now) };
  return { id: r.id, linked: r.source, status: had ? 'already' : 'added', userwords: uw, review: rv };
}
