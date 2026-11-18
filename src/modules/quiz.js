// منطق الاختبارات منفصل عن الواجهة وقابل للاختبار (rng قابل للحقن).
export function shuffle(a, rng = Math.random) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

// سلوك V1 محفوظ: عشرة أسئلة من القائمة كلها، ومشتتات عشوائية.
export function vocabQuiz(list, rng = Math.random) {
  return shuffle(list, rng)
    .slice(0, 10)
    .map((it) => {
      const wrong = shuffle(list.filter((x) => x.ar !== it.ar), rng).slice(0, 3).map((x) => x.ar);
      const opts = shuffle([it.ar, ...wrong], rng);
      return { q: it.en, enQ: true, opts, a: opts.indexOf(it.ar), note: it.ex + ' — ' + it.exAr };
    });
}

// سلوك V1 محفوظ: أسئلة الدرس بترتيبها وخياراتها الثابتة.
export function grammarQuiz(lesson) {
  return lesson.questions.map((x) => ({
    q: x.q,
    enQ: true,
    opts: x.options,
    a: x.answer,
    enOpts: true,
    note: lesson.rule,
  }));
}

// إصلاح الخلل F1: V1 كان يعرض الخيارات دون خلط والصحيح دائماً الأول.
// هنا تُخلط الخيارات ويُحسب موضع الصحيح بقيمته لا بترتيبه الأصلي.
export function compoundQuiz(list, rng = Math.random, count = 10) {
  return shuffle(list, rng)
    .slice(0, count)
    .map((x) => {
      const correct = x.options[x.answer];
      const opts = shuffle(x.options, rng);
      return { q: x.en, enQ: true, sub: x.ar, opts, a: opts.indexOf(correct), enOpts: true, note: x.note };
    });
}
