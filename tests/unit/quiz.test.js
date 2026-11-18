import { describe, it, expect } from 'vitest';
import { compoundQuiz, vocabQuiz, grammarQuiz, reviewQuiz, shuffle, passed } from '../../src/modules/quiz.js';
import * as content from '../../src/data/legacy-content/index.js';

// مولّد عشوائي ثابت للاختبار
function lcg(seed) {
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

describe('إصلاح خلل الجمل المركبة (F1)', () => {
  it('الإجابة الصحيحة تطابق القيمة الصحيحة دائماً', () => {
    for (let n = 0; n < 50; n++) {
      const qs = compoundQuiz(content.compound, lcg(n + 1), 34);
      for (const q of qs) {
        const src = content.compound.find((c) => c.en === q.q);
        expect(q.opts[q.a]).toBe(src.options[src.answer]);
        expect([...q.opts].sort()).toEqual([...src.options].sort());
      }
    }
  });

  it('موضع الإجابة الصحيحة يتوزع على كل المواضع ولا يبقى الأول دائماً', () => {
    const counts = [0, 0, 0];
    for (let n = 0; n < 100; n++) {
      for (const q of compoundQuiz(content.compound, lcg(1000 + n), 34)) counts[q.a]++;
    }
    const total = counts.reduce((a, b) => a + b, 0);
    for (const c of counts) {
      expect(c / total).toBeGreaterThan(0.25);
      expect(c / total).toBeLessThan(0.42);
    }
  });

  it('عدد الأسئلة عشرة افتراضياً ولا تتكرر الجمل', () => {
    const qs = compoundQuiz(content.compound);
    expect(qs).toHaveLength(10);
    expect(new Set(qs.map((q) => q.q)).size).toBe(10);
  });

  it('لا يعدّل بيانات المحتوى الأصلية', () => {
    const before = JSON.stringify(content.compound);
    compoundQuiz(content.compound, lcg(7), 34);
    expect(JSON.stringify(content.compound)).toBe(before);
  });
});

describe('سلوك V1 المحفوظ', () => {
  it('اختبار الكلمات: عشرة أسئلة بأربعة خيارات والإجابة صحيحة', () => {
    const qs = vocabQuiz(content.words, lcg(3));
    expect(qs).toHaveLength(10);
    for (const q of qs) {
      expect(q.opts).toHaveLength(4);
      const src = content.words.find((w) => w.en === q.q);
      expect(q.opts[q.a]).toBe(src.ar);
    }
  });

  it('اختبار القواعد: ترتيب الأسئلة والخيارات ثابت كما في V1', () => {
    const lesson = content.grammar[0];
    const qs = grammarQuiz(lesson);
    expect(qs.map((q) => q.q)).toEqual(lesson.questions.map((q) => q.q));
    expect(qs[0].opts).toEqual(lesson.questions[0].options);
    expect(qs[0].a).toBe(lesson.questions[0].answer);
  });

  it('shuffle لا يغيّر المصفوفة الأصلية ويحافظ على العناصر', () => {
    const a = [1, 2, 3, 4, 5];
    const b = shuffle(a, lcg(9));
    expect(a).toEqual([1, 2, 3, 4, 5]);
    expect([...b].sort()).toEqual(a);
  });
});

describe('إصلاح F2 وتحسين الكلمات', () => {
  it('حد إكمال الدرس 60%', () => {
    expect(passed(3, 3)).toBe(true);
    expect(passed(2, 3)).toBe(true);
    expect(passed(1, 3)).toBe(false);
    expect(passed(0, 3)).toBe(false);
    expect(passed(2, 2)).toBe(true);
    expect(passed(1, 2)).toBe(false);
    expect(passed(0, 0)).toBe(false);
  });

  it('مشتتات الكلمات لا تضم المعنى الآخر لنفس الكلمة (improve)', () => {
    for (let n = 0; n < 300; n++) {
      for (const q of vocabQuiz(content.words, lcg(n + 1))) {
        if (q.q !== 'improve') continue;
        const both = ['يُحسّن', 'يتحسن'].filter((m) => q.opts.includes(m));
        expect(both).toHaveLength(1);
      }
    }
  });
});

describe('itemId في الاختبارات', () => {
  it('اختبار الكلمات والقواعد يحملان معرّف العنصر', () => {
    expect(vocabQuiz(content.words, lcg(1)).every((q) => /^w-\d{3}$/.test(q.itemId))).toBe(true);
    expect(grammarQuiz(content.grammar[2]).every((q) => q.itemId === 'g-003')).toBe(true);
  });
});

describe('الجمل المركبة في المراجعة المتباعدة', () => {
  it('أسئلة اختبار الجمل المركبة تحمل معرّف العنصر', () => {
    for (const q of compoundQuiz(content.compound, lcg(3), 10)) expect(q.itemId).toMatch(/^c-\d+$/);
  });
  it('reviewQuiz يبني سؤالاً لعنصر مركّب بخياراته والصحيح بقيمته', () => {
    const id = content.compound[0].id;
    const [q] = reviewQuiz([id], content, lcg(5));
    const x = content.compound[0];
    expect(q.itemId).toBe(id);
    expect(q.opts[q.a]).toBe(x.options[x.answer]);
    expect([...q.opts].sort()).toEqual([...x.options].sort());
  });
});
