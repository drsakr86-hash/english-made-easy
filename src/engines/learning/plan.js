// محرك الخطة اليومية (دوال نقية). الوقت يُمرَّر. لا يقرأ التخزين.
import { dayKey } from '../progress/progress.js';
import { dueItems } from '../review/review.js';

export const BASE_MINUTES = { vocab: 8, grammar: 5, review: 7, speak: 10 }; // = 30 دقيقة
export const KINDS = ['vocab', 'grammar', 'review', 'speak'];
export const MINUTE_OPTIONS = [15, 30, 45];
const LOW = ['Pre-A1', 'A1', 'A2'];
const HIGH = ['C1', 'C2'];

const TITLES = {
  vocab: 'مفردات جديدة',
  grammar: 'قواعد',
  review: 'مراجعة متباعدة',
  explore: 'تعبيرات ومصطلحات جديدة',
  speak: 'تدريب النطق',
};

/** توزيع الدقائق على الأنواع المتاحة مع ضبط المجموع تماماً (طريقة أكبر باقٍ). */
export function allocate(kinds, minutes, level, dueCount) {
  const w = {};
  for (const k of kinds) w[k] = BASE_MINUTES[k];
  const shift = (from, to, n) => {
    if (w[from] !== undefined && w[to] !== undefined) {
      const m = Math.min(n, w[from] - 2);
      if (m > 0) { w[from] -= m; w[to] += m; }
    }
  };
  if (LOW.includes(level)) shift('speak', 'vocab', 2);
  if (HIGH.includes(level)) shift('vocab', 'grammar', 2);
  if (dueCount >= 10) shift('speak', 'review', 3);
  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  const raw = Object.fromEntries(kinds.map((k) => [k, (w[k] * minutes) / sum]));
  const out = Object.fromEntries(kinds.map((k) => [k, Math.floor(raw[k])]));
  let left = minutes - Object.values(out).reduce((a, b) => a + b, 0);
  const order = [...kinds].sort((a, b) => raw[b] - Math.floor(raw[b]) - (raw[a] - Math.floor(raw[a])) || kinds.indexOf(a) - kinds.indexOf(b));
  for (let i = 0; left > 0; i = (i + 1) % order.length, left--) out[order[i]]++;
  return out;
}

const ids = (list) => list.map((x) => x.id);

function newItems(content, progress, review, n, types, exclude = []) {
  const src = { w: ['words', content.words], e: ['expressions', content.expressions], i: ['idioms', content.idioms] };
  const out = [];
  for (const t of types) {
    const [section, list] = src[t];
    for (const id of ids(list)) {
      if (out.length >= n) return out;
      if (!progress[section].includes(id) && !review[id] && !exclude.includes(id) && !out.includes(id)) out.push(id);
    }
  }
  return out;
}

function pickGrammar(content, progress, review) {
  const next = content.grammar.find((g) => !progress.grammar.includes(g.id));
  if (next) return next.id;
  const tracked = Object.values(review).filter((r) => r.itemId[0] === 'g').sort((a, b) => a.masteryLevel - b.masteryLevel || a.nextReviewAt.localeCompare(b.nextReviewAt));
  return tracked.length ? tracked[0].itemId : content.grammar[0].id;
}

/**
 * يبني خطة اليوم. يُسقط أي نوع بلا مادة ويعيد توزيع الدقائق على الباقي (مجموعها = minutes دائماً).
 * historyCount: عدد الأيام السابقة لتدوير مادة النطق.
 */
export function buildDailyPlan({ now, minutes = 30, level = null, content, progress, review, historyCount = 0 }) {
  const dueCount = dueItems(review, now).length;
  let kinds = [...KINDS];
  for (let guard = 0; guard < 5; guard++) {
    const m = allocate(kinds, minutes, level, dueCount);
    const tasks = [];
    const used = [];
    let missing = null;
    for (const kind of kinds) {
      const mins = m[kind];
      let task;
      if (kind === 'vocab') {
        const itemIds = newItems(content, progress, review, Math.max(2, mins), ['w', 'e', 'i']);
        if (!itemIds.length) { missing = kind; break; }
        task = { kind, itemIds };
      } else if (kind === 'grammar') {
        task = { kind, itemIds: [pickGrammar(content, progress, review)] };
      } else if (kind === 'review') {
        const n = Math.max(3, Math.round(mins * 1.4));
        const due = dueItems(review, now, n).map((r) => r.itemId).filter((x) => !used.includes(x));
        if (due.length) task = { kind, itemIds: due };
        else {
          const ex = newItems(content, progress, review, n, ['e', 'i'], used);
          if (!ex.length) { missing = kind; break; }
          task = { kind: 'explore', itemIds: ex };
        }
      } else {
        const pool = [...ids(content.expressions), ...ids(content.idioms)];
        if (!pool.length) { missing = kind; break; }
        const n = Math.max(2, Math.round(mins / 2));
        const start = (historyCount * n) % pool.length;
        task = { kind, itemIds: Array.from({ length: Math.min(n, pool.length) }, (_, i) => pool[(start + i) % pool.length]) };
      }
      used.push(...task.itemIds);
      tasks.push({ id: `${dayKey(now)}-${kind}`, title: TITLES[task.kind], minutes: mins, status: 'pending', doneAt: null, ...task });
    }
    if (!missing) return { date: dayKey(now), minutes, level, tasks, session: null };
    kinds = kinds.filter((k) => k !== missing);
    if (!kinds.length) break;
  }
  return { date: dayKey(now), minutes, level, tasks: [], session: null };
}

export const tasksDone = (plan) => plan.tasks.filter((t) => t.status === 'done').length;

export function markTaskDone(plan, taskId, now) {
  return { ...plan, tasks: plan.tasks.map((t) => (t.id === taskId && t.status !== 'done' ? { ...t, status: 'done', doneAt: now.toISOString() } : t)) };
}

/** إنهاء جلسة اليوم وتسجيلها: مرة واحدة فقط لكل يوم، وتتطلب مهمة منجزة على الأقل. */
export function closeSession(plan, now) {
  if (plan.session) return plan; // سبق تسجيلها
  const done = tasksDone(plan);
  if (done === 0) return plan;
  return {
    ...plan,
    session: {
      at: now.toISOString(),
      minutesPlanned: plan.minutes,
      minutesDone: plan.tasks.filter((t) => t.status === 'done').reduce((a, t) => a + t.minutes, 0),
      tasksDone: done,
      tasksTotal: plan.tasks.length,
    },
  };
}
