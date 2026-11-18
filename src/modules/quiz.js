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
      const wrong = shuffle(list.filter((x) => x.ar !== it.ar && x.en !== it.en), rng).slice(0, 3).map((x) => x.ar);
      const opts = shuffle([it.ar, ...wrong], rng);
      return { q: it.en, enQ: true, opts, a: opts.indexOf(it.ar), note: it.ex + ' — ' + it.exAr, itemId: it.id };
    });
}

// سلوك V1 محفوظ: أسئلة الدرس بترتيبها وخياراتها الثابتة.
export function grammarQuiz(lesson) {
  return lesson.questions.map((x) => ({
    itemId: lesson.id,
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

// إصلاح F2: كان V1 يعلّم الدرس مكتملاً بغض النظر عن النتيجة. الحد الآن 60% (2 من 3، و2 من 2).
export const PASS_RATIO = 0.6;
export const passed = (score, total) => total > 0 && score / total >= PASS_RATIO;

// اختبار مراجعة اليوم: سؤال لكل عنصر مستحق. الكلمات بنمط اختبار الكلمات (مشتتات من نفس الوحدة)،
// والدروس بسؤال عشوائي واحد من الدرس.
export function reviewQuiz(dueIds, content, rng = Math.random) {
  const lists = { w: content.words, e: content.expressions, i: content.idioms };
  const out = [];
  for (const id of dueIds) {
    const kind = id[0];
    if (kind === 'g') {
      const lesson = content.grammar.find((g) => g.id === id);
      if (!lesson) continue;
      const x = lesson.questions[Math.floor(rng() * lesson.questions.length)];
      out.push({ q: x.q, enQ: true, sub: lesson.title, opts: x.options, a: x.answer, enOpts: true, note: lesson.rule, itemId: id });
      continue;
    }
    const list = lists[kind];
    const it = list && list.find((x) => x.id === id);
    if (!it) continue;
    const wrong = shuffle(list.filter((x) => x.ar !== it.ar && x.en !== it.en), rng).slice(0, 3).map((x) => x.ar);
    const opts = shuffle([it.ar, ...wrong], rng);
    out.push({ q: it.en, enQ: true, opts, a: opts.indexOf(it.ar), note: it.ex + ' — ' + it.exAr, itemId: id });
  }
  return out;
}
