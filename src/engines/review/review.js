// محرك المراجعة المتباعدة (Leitner مبسّط). دوال نقية: الوقت يُمرَّر دائماً ولا يُقرأ من الساعة هنا.
// السجل لكل عنصر يطابق الحقول المطلوبة في خطة V2.0 (القسم D).

export const MAX_LEVEL = 5;
// الفاصل بالأيام بعد الوصول إلى كل مستوى: مستوى 1 بعد يوم ... مستوى 5 بعد 30 يوماً
export const LADDER_DAYS = [0, 1, 3, 7, 14, 30];
export const HISTORY_LIMIT = 20;
const DAY = 24 * 60 * 60 * 1000;

const addDays = (date, days) => new Date(date.getTime() + days * DAY).toISOString();

/** عنصر "صعب": أخطأ فيه مرتين على الأقل وأخطاؤه لا تقل عن صوابه. */
export function isHard(rec) {
  return !!rec && rec.incorrectCount >= 2 && rec.incorrectCount >= rec.correctCount;
}

/**
 * يطبّق نتيجة إجابة (ok = صح/خطأ) ويُرجع سجلاً جديداً دون تعديل القديم.
 * - صح: يرتفع المستوى درجة، والفاصل من السلّم (ويُقصَّر للنصف للعناصر الصعبة، بحد أدنى يوم).
 * - خطأ: ينخفض المستوى درجتين (حد أدنى 0)، وتعود المراجعة بعد يوم.
 */
export function applyResult(rec, itemId, ok, now) {
  const base = rec ?? {
    itemId,
    firstLearnedAt: now.toISOString(),
    lastReviewedAt: null,
    nextReviewAt: now.toISOString(),
    correctCount: 0,
    incorrectCount: 0,
    masteryLevel: 0,
    reviewInterval: 0,
    reviewHistory: [],
  };
  let level = base.masteryLevel;
  let interval;
  let correctCount = base.correctCount;
  let incorrectCount = base.incorrectCount;
  if (ok) {
    correctCount += 1;
    level = Math.min(MAX_LEVEL, level + 1);
    interval = LADDER_DAYS[level];
    if (isHard({ ...base, correctCount, incorrectCount })) interval = Math.max(1, Math.round(interval / 2));
  } else {
    incorrectCount += 1;
    level = Math.max(0, level - 2);
    interval = 1;
  }
  return {
    ...base,
    itemId,
    lastReviewedAt: now.toISOString(),
    nextReviewAt: addDays(now, interval),
    correctCount,
    incorrectCount,
    masteryLevel: level,
    reviewInterval: interval,
    reviewHistory: [...base.reviewHistory, { at: now.toISOString(), ok }].slice(-HISTORY_LIMIT),
  };
}

export const isDue = (rec, now) => new Date(rec.nextReviewAt).getTime() <= now.getTime();

/** المستحق الآن، الأكثر تأخراً أولاً ثم الأضعف مستوى. */
export function dueItems(records, now, limit = Infinity) {
  return Object.values(records)
    .filter((r) => isDue(r, now))
    .sort((a, b) => new Date(a.nextReviewAt) - new Date(b.nextReviewAt) || a.masteryLevel - b.masteryLevel || a.itemId.localeCompare(b.itemId))
    .slice(0, limit);
}

export function nextDueAt(records, now) {
  const future = Object.values(records)
    .map((r) => new Date(r.nextReviewAt))
    .filter((d) => d.getTime() > now.getTime())
    .sort((a, b) => a - b);
  return future[0] ?? null;
}

export function summarize(records, now) {
  const all = Object.values(records);
  const levels = Array(MAX_LEVEL + 1).fill(0);
  for (const r of all) levels[r.masteryLevel]++;
  return {
    total: all.length,
    due: all.filter((r) => isDue(r, now)).length,
    mastered: levels[MAX_LEVEL],
    hard: all.filter(isHard).length,
    levels,
  };
}

/** يبدأ تتبّع عنصر في المراجعة (مثلاً كلمة محفوظة من درس) دون احتساب إجابة. موعده بعد يوم. لا يغيّر عنصراً متتبَّعاً. */
export function startTracking(rec, itemId, now) {
  if (rec) return rec;
  return {
    itemId,
    firstLearnedAt: now.toISOString(),
    lastReviewedAt: null,
    nextReviewAt: addDays(now, 1),
    correctCount: 0,
    incorrectCount: 0,
    masteryLevel: 0,
    reviewInterval: 1,
    reviewHistory: [],
  };
}
