// محرك التقدم: دوال نقية. الوقت يُمرَّر ولا يُقرأ هنا. اليوم = اليوم المحلي على جهاز المستخدم.

const pad = (n) => String(n).padStart(2, '0');
export const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function emptyActivity() {
  return { days: {}, last: null };
}

/** يسجّل نشاطاً: يزيد عدّاد اليوم ويحدّث آخر نشاط. لا يعدّل الحالة الأصلية. */
export function logActivity(state, now, kind, itemId = null) {
  const key = dayKey(now);
  return {
    days: { ...state.days, [key]: (state.days[key] || 0) + 1 },
    last: { at: now.toISOString(), kind, itemId },
  };
}

const prevDay = (d) => {
  const p = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1, 12);
  return p;
};

/**
 * أيام الالتزام المتتالية. السلسلة حيّة إن كان اليوم أو أمس فيه نشاط
 * (لا تنكسر قبل نهاية اليوم الحالي). تُرجع 0 إن مرّ يوم كامل بلا نشاط.
 */
export function streak(state, now) {
  let d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  if (!state.days[dayKey(d)]) d = prevDay(d);
  let n = 0;
  while (state.days[dayKey(d)]) {
    n++;
    d = prevDay(d);
  }
  return n;
}

export const activeDays = (state) => Object.keys(state.days).length;

/** ملخص اللوحة الرئيسية من بيانات فعلية فقط. */
export function overview({ progress, content, reviewSummary, activity, now }) {
  const sizes = {
    words: content.words.length,
    expressions: content.expressions.length,
    idioms: content.idioms.length,
    grammar: content.grammar.length,
  };
  const done = {
    words: progress.words.length,
    expressions: progress.expressions.length,
    idioms: progress.idioms.length,
    grammar: progress.grammar.length,
  };
  const total = sizes.words + sizes.expressions + sizes.idioms + sizes.grammar;
  const doneTotal = done.words + done.expressions + done.idioms + done.grammar;
  return {
    sizes,
    done,
    overallPct: total ? Math.round((doneTotal / total) * 100) : 0,
    dueToday: reviewSummary.due,
    reviewTracked: reviewSummary.total,
    masteredByReview: reviewSummary.mastered,
    streak: streak(activity, now),
    activeDays: activeDays(activity),
    last: activity.last,
  };
}
