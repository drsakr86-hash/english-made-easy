// مقارنة النص المتعرَّف عليه بالنص المستهدف. هذا مطابقة كلمات وليس تقييم نطق صوتي.
const words = (s) => String(s).toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').split(/\s+/).filter(Boolean);

export function compareSpoken(target, heard) {
  const t = words(target);
  const h = words(heard);
  const pool = [...h];
  const missed = [];
  let matched = 0;
  for (const w of t) {
    const i = pool.indexOf(w);
    if (i >= 0) { pool.splice(i, 1); matched++; } else missed.push(w);
  }
  return { total: t.length, matched, missed, extra: pool, ratio: t.length ? matched / t.length : 0 };
}

export const PRONUNCIATION_NOTE = 'هذه مقارنة بين ما فهمه المتصفح مما قلته وبين الجملة المطلوبة. دقتها تتأثر بالميكروفون والضوضاء وبخدمة التعرف على الكلام، وهي ليست تقييماً متخصصاً للنطق.';
