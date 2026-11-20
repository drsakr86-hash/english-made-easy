// بناء أوراق التدريب للطباعة. دوال نقية (rng قابل للحقن) ومنفصلة عن الواجهة.
import { shuffle } from './quiz.js';

export const VOCAB_SECTIONS = ['words', 'expressions', 'idioms'];

export const SECTION_LABELS = {
  words: 'كلمات',
  expressions: 'تعبيرات',
  idioms: 'مصطلحات',
  grammar: 'قواعد',
  basics: 'أساسيات',
  compound: 'جمل مركبة',
};

// أنواع الورقة لكل وحدة: [المفتاح، الاسم]
export const KINDS = {
  words: [['en2ar', 'ترجم للعربية'], ['ar2en', 'اكتب بالإنجليزية'], ['fill', 'أكمل الجملة'], ['study', 'قائمة للمذاكرة']],
  expressions: null,
  idioms: null,
  grammar: [['quiz', 'أسئلة اختيار']],
  basics: null,
  compound: [['choose', 'اختر الأداة'], ['write', 'اكتب الأداة']],
};
KINDS.expressions = KINDS.words;
KINDS.idioms = KINDS.words;
KINDS.basics = KINDS.grammar;

// مولد أرقام عشوائي بذرة ثابتة: يعطي نفس الورقة لنفس البذرة (لتبقى المعاينة ثابتة عند إعادة الرسم).
export function seededRng(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const BLANK = '__________';

// يبحث عن الكلمة (أو صيغتها مع s/es/ed/d/ing) داخل جملة المثال. يرجع { text, answer } أو null.
export function blankOut(en, ex) {
  const base = en.trim().replace(/[.?!]+$/, '');
  if (!base || !ex) return null;
  const m = new RegExp('(^|[^A-Za-z])(' + esc(base) + '(?:es|s|ed|d|ing)?)(?![A-Za-z])', 'i').exec(ex);
  if (!m) return null;
  const start = m.index + m[1].length;
  return { text: ex.slice(0, start) + BLANK + ex.slice(start + m[2].length), answer: m[2] };
}

/** يختار عناصر الورقة: كلها أو غير المتقنة فقط، بترتيبها أو مخلوطة، وبعدد محدد (0 = الكل). */
export function pickItems(list, { onlyNew = false, known = [], count = 0, random = false }, rng = Math.random) {
  let out = onlyNew ? list.filter((x) => !known.includes(x.id)) : list.slice();
  if (random) out = shuffle(out, rng);
  return count > 0 ? out.slice(0, count) : out;
}

/**
 * يبني ورقة: { title, kind, intro, bank?, rows: [...], answers: [...] }
 * rows لكل نوع: study {en, ar, ex, exAr} · en2ar/ar2en {n, prompt, dir} · fill {n, prompt}
 * · choose {n, prompt, sub, options} · write {n, prompt, sub} · grammar quiz {lesson, rule, qs:[{n, prompt, options}]}
 */
export function buildWorksheet({ section, kind, items, rng = Math.random }) {
  const label = SECTION_LABELS[section];
  if (VOCAB_SECTIONS.includes(section)) {
    if (kind === 'study') {
      return { title: `قائمة مذاكرة: ${label}`, kind, intro: 'اقرأ العناصر بصوت عالٍ ثم غطِّ المعنى وحاول تذكره.', rows: items.map((x) => ({ en: x.en, ar: x.ar, ex: x.ex, exAr: x.exAr })), answers: [] };
    }
    if (kind === 'en2ar') {
      return { title: `تدريب: ${label}`, kind, intro: 'اكتب معنى كل عنصر بالعربية.', rows: items.map((x, i) => ({ n: i + 1, prompt: x.en, dir: 'ltr' })), answers: items.map((x, i) => ({ n: i + 1, text: x.ar })) };
    }
    if (kind === 'ar2en') {
      return { title: `تدريب: ${label}`, kind, intro: 'اكتب ما يقابل كل عنصر بالإنجليزية.', rows: items.map((x, i) => ({ n: i + 1, prompt: x.ar, dir: 'rtl' })), answers: items.map((x, i) => ({ n: i + 1, text: x.en })) };
    }
    if (kind === 'fill') {
      const ok = items.map((x) => ({ x, b: blankOut(x.en, x.ex) })).filter((r) => r.b);
      return {
        title: `أكمل الجملة: ${label}`,
        kind,
        intro: 'اكتب الكلمة أو التعبير المناسب في الفراغ (قد تحتاج تغيير الصيغة).',
        bank: shuffle(ok.map((r) => r.x.en), rng),
        rows: ok.map((r, i) => ({ n: i + 1, prompt: r.b.text, dir: 'ltr' })),
        answers: ok.map((r, i) => ({ n: i + 1, text: r.b.answer })),
        skipped: items.length - ok.length,
      };
    }
  }
  if (section === 'compound') {
    if (kind === 'choose') {
      return {
        title: 'جمل مركبة',
        kind,
        intro: 'اختر أداة الربط المناسبة لكل جملة.',
        rows: items.map((x, i) => ({ n: i + 1, prompt: x.en.replace('___', BLANK), sub: x.ar, options: shuffle(x.options, rng) })),
        answers: items.map((x, i) => ({ n: i + 1, text: x.options[x.answer] })),
      };
    }
    if (kind === 'write') {
      return {
        title: 'جمل مركبة',
        kind,
        intro: 'اكتب أداة الربط المناسبة في الفراغ (and / but / so / because / or ...).',
        rows: items.map((x, i) => ({ n: i + 1, prompt: x.en.replace('___', BLANK), sub: x.ar })),
        answers: items.map((x, i) => ({ n: i + 1, text: x.options[x.answer] })),
      };
    }
  }
  // قواعد وأساسيات: items هي الدروس
  let n = 0;
  const answers = [];
  const rows = items.map((l) => ({
    lesson: l.title,
    rule: l.rule,
    qs: l.questions.map((q) => {
      n += 1;
      answers.push({ n, text: q.options[q.answer] });
      return { n, prompt: q.q, options: q.options };
    }),
  }));
  return { title: `تدريب: ${label}`, kind: 'quiz', intro: 'ضع دائرة حول الإجابة الصحيحة.', rows, answers };
}
