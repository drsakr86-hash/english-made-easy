// محرك تحديد المستوى (دوال نقية). الوقت والعشوائية تُمرَّر ولا تُقرأ هنا.
import { LEVELS } from '../../data/placement/questions.js';

export { LEVELS };
export const RETAKE_DAYS = 7;
const DAY = 24 * 60 * 60 * 1000;

/** النجاح بثلثين فأكثر (4 من 6، و6 من 9) بحساب صحيح لا عشري. */
export const levelPassed = (correct, total) => total > 0 && correct * 3 >= total * 2;

function shuffle(a, rng) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/**
 * يبني جلسة الاختبار: مستويات من A1 صعوداً. داخل كل مستوى تأتي أسئلة المفردات والقواعد مخلوطة
 * ثم كتلة القراءة (نص وأسئلته بترتيبها). تُخلط الخيارات وتُحسب الإجابة بقيمتها.
 */
export function buildSession(questions, rng = Math.random) {
  return LEVELS.map((level) => {
    const inLevel = questions.filter((x) => x.level === level);
    const plain = shuffle(inLevel.filter((x) => !x.passage), rng);
    const reading = inLevel.filter((x) => x.passage);
    const mix = (x) => {
      const correct = x.options[x.answer];
      const options = shuffle(x.options, rng);
      return { ...x, options, answer: options.indexOf(correct) };
    };
    return { level, questions: [...plain, ...reading].map(mix) };
  });
}

/** يتوقف الاختبار بعد مستويين متتاليين غير مجتازين. levelResults مرتبة من A1. */
export function shouldStop(levelResults) {
  const n = levelResults.length;
  return n >= 2 && !levelResults[n - 1].passed && !levelResults[n - 2].passed;
}

/**
 * answers: [{ id, level, skill, ok }] لما أُجيب فعلاً.
 * totals: عدد أسئلة كل مستوى في البنك (الأسئلة غير المعروضة تُحسب غير مجتازة).
 */
export function evaluate(answers, questions) {
  const perLevel = {};
  const perSkill = {};
  for (const level of LEVELS) {
    const total = questions.filter((x) => x.level === level).length;
    const mine = answers.filter((a) => a.level === level);
    const correct = mine.filter((a) => a.ok).length;
    perLevel[level] = { correct, answered: mine.length, total, passed: mine.length === total && levelPassed(correct, total) };
  }
  for (const a of answers) {
    perSkill[a.skill] = perSkill[a.skill] || { correct: 0, answered: 0 };
    perSkill[a.skill].answered++;
    if (a.ok) perSkill[a.skill].correct++;
  }
  let estimated = 'Pre-A1';
  for (const level of LEVELS) {
    if (!perLevel[level].passed) break;
    estimated = level;
  }
  return { level: estimated, perLevel, perSkill };
}

export const canRetakeAt = (last) => (last ? new Date(new Date(last.at).getTime() + RETAKE_DAYS * DAY) : null);

export function canRetake(last, now) {
  const at = canRetakeAt(last);
  return !at || now.getTime() >= at.getTime();
}

/** احتمال اجتياز مستوى بتخمين عشوائي بحتّ (4 خيارات) — للتوثيق والاختبار. */
export function guessPassProbability(total, options = 4) {
  const p = 1 / options;
  const need = Math.ceil((total * 2) / 3);
  const C = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; };
  let s = 0;
  for (let k = need; k <= total; k++) s += C(total, k) * p ** k * (1 - p) ** (total - k);
  return s;
}
