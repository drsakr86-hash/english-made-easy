import { describe, it, expect } from 'vitest';
import { questions, passages, LEVELS } from '../../src/data/placement/questions.js';
import { buildSession, evaluate, levelPassed, shouldStop, canRetake, canRetakeAt, guessPassProbability, RETAKE_DAYS } from '../../src/engines/placement/placement.js';
import { loadPlacements, addPlacement, latestPlacement } from '../../src/storage/placement.js';
import { createMemoryStorage } from '../../src/storage/localStorage.js';

const lcg = (seed) => { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; };

describe('بنك الأسئلة المعتمد', () => {
  it('42 سؤالاً بتوزيع المسودة المعتمدة', () => {
    expect(questions).toHaveLength(42);
    const by = Object.fromEntries(LEVELS.map((l) => [l, questions.filter((x) => x.level === l).length]));
    expect(by).toEqual({ A1: 6, A2: 9, B1: 6, B2: 9, C1: 6, C2: 6 });
  });

  it('كل مستوى فيه 3 مفردات و3 قواعد، والقراءة 3 في A2 وB2 فقط', () => {
    for (const l of LEVELS) {
      const inL = questions.filter((x) => x.level === l);
      expect(inL.filter((x) => x.skill === 'vocabulary')).toHaveLength(3);
      expect(inL.filter((x) => x.skill === 'grammar')).toHaveLength(3);
      expect(inL.filter((x) => x.skill === 'reading')).toHaveLength(l === 'A2' || l === 'B2' ? 3 : 0);
    }
  });

  it('سلامة الهيكل: معرّفات فريدة، 4 خيارات غير مكررة، إجابة داخل النطاق، نصوص القراءة موجودة', () => {
    expect(new Set(questions.map((x) => x.id)).size).toBe(42);
    for (const x of questions) {
      expect(x.options).toHaveLength(4);
      expect(new Set(x.options).size).toBe(4);
      expect(Number.isInteger(x.answer) && x.answer >= 0 && x.answer < 4).toBe(true);
      expect(LEVELS).toContain(x.level);
      if (x.passage) expect(passages[x.passage].level).toBe(x.level);
      if (x.skill !== 'reading') expect(x.q).toContain('___');
    }
  });

  it('الإجابات الصحيحة تطابق المسودة المعتمدة (عيّنة من كل مستوى)', () => {
    const ans = Object.fromEntries(questions.map((x) => [x.id, x.options[x.answer]]));
    expect(ans).toMatchObject({
      V1: 'pharmacy', G2: 'Do', V5: 'chef', G5: 'taller', R3: 'On Fridays', V8: 'renew', G9: 'was finished',
      V11: 'lay off', G12: 'had already started', R5: 'Teams may lose informal conversations that produce ideas',
      V14: 'mitigate', G15: 'did he arrive', V17: 'deleterious', G17: 'than', G18: 'submit',
    });
  });

  it('موضع الإجابة الصحيحة متنوع في البنك الخام', () => {
    const counts = [0, 0, 0, 0];
    for (const x of questions) counts[x.answer]++;
    for (const c of counts) expect(c).toBeGreaterThanOrEqual(5);
  });
});

describe('بناء الجلسة', () => {
  it('ست مستويات بالترتيب، وكل سؤال إجابته الصحيحة محفوظة بقيمتها', () => {
    const s = buildSession(questions, lcg(3));
    expect(s.map((x) => x.level)).toEqual(LEVELS);
    const byId = Object.fromEntries(questions.map((x) => [x.id, x]));
    let n = 0;
    for (const lv of s) {
      for (const q of lv.questions) {
        n++;
        const src = byId[q.id];
        expect(q.options[q.answer]).toBe(src.options[src.answer]);
        expect([...q.options].sort()).toEqual([...src.options].sort());
        expect(q.level).toBe(lv.level);
      }
    }
    expect(n).toBe(42);
  });

  it('أسئلة القراءة تأتي متتالية في آخر المستوى بترتيبها', () => {
    const lv = buildSession(questions, lcg(9)).find((x) => x.level === 'A2');
    expect(lv.questions.slice(-3).map((q) => q.id)).toEqual(['R1', 'R2', 'R3']);
  });

  it('لا يعدّل البنك الأصلي ويختلف ترتيبه بين بذرتين', () => {
    const before = JSON.stringify(questions);
    const a = buildSession(questions, lcg(1));
    const b = buildSession(questions, lcg(2));
    expect(JSON.stringify(questions)).toBe(before);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });
});

describe('التقدير', () => {
  const answersFor = (passLevels, partial = {}) =>
    questions.flatMap((x) => {
      const lim = partial[x.level];
      if (lim === 0) return [];
      return [{ id: x.id, level: x.level, skill: x.skill, ok: passLevels.includes(x.level) }];
    });

  it('حد النجاح ثلثان بحساب صحيح', () => {
    expect(levelPassed(4, 6)).toBe(true);
    expect(levelPassed(3, 6)).toBe(false);
    expect(levelPassed(6, 9)).toBe(true);
    expect(levelPassed(5, 9)).toBe(false);
    expect(levelPassed(0, 0)).toBe(false);
  });

  it('كل الإجابات صحيحة => C2', () => {
    expect(evaluate(answersFor(LEVELS), questions).level).toBe('C2');
  });

  it('لا نجاح في A1 => Pre-A1 حتى لو نجح غيره', () => {
    expect(evaluate(answersFor(['A2', 'B1']), questions).level).toBe('Pre-A1');
  });

  it('المستوى الأعلى المتتالي فقط: نجاح A1 وA2 وB2 مع رسوب B1 => A2', () => {
    expect(evaluate(answersFor(['A1', 'A2', 'B2']), questions).level).toBe('A2');
  });

  it('الأسئلة غير المعروضة تُحسب غير مجتازة', () => {
    const e = evaluate(answersFor(LEVELS, { C1: 0, C2: 0 }), questions);
    expect(e.level).toBe('B2');
    expect(e.perLevel.C1).toMatchObject({ answered: 0, total: 6, passed: false });
  });

  it('مستوى أُجيب بعض أسئلته فقط لا يُعدّ مجتازاً', () => {
    const ans = answersFor(['A1']).filter((a) => a.level !== 'A1' || a.id !== 'G3');
    expect(evaluate(ans, questions).perLevel.A1.passed).toBe(false);
  });

  it('تفصيل المهارات صحيح', () => {
    const e = evaluate(answersFor(['A1', 'A2']), questions);
    expect(e.perSkill.reading).toEqual({ correct: 3, answered: 6 });
    expect(e.perSkill.vocabulary.answered).toBe(18);
  });

  it('الإيقاف بعد مستويين متتاليين راسبين فقط', () => {
    const r = (passed) => ({ passed });
    expect(shouldStop([r(true), r(false)])).toBe(false);
    expect(shouldStop([r(false), r(true), r(false)])).toBe(false);
    expect(shouldStop([r(true), r(false), r(false)])).toBe(true);
    expect(shouldStop([r(false)])).toBe(false);
  });
});

describe('إعادة الاختبار والتخمين', () => {
  const last = { at: '2026-01-01T10:00:00.000Z' };
  it('لا إعادة قبل 7 أيام ويسمح بعدها', () => {
    expect(RETAKE_DAYS).toBe(7);
    expect(canRetake(null, new Date())).toBe(true);
    expect(canRetake(last, new Date('2026-01-08T09:59:59.000Z'))).toBe(false);
    expect(canRetake(last, new Date('2026-01-08T10:00:00.000Z'))).toBe(true);
    expect(canRetakeAt(last).toISOString()).toBe('2026-01-08T10:00:00.000Z');
  });

  it('احتمال اجتياز مستوى بالتخمين: ~3.8% لستة أسئلة و~0.9% لتسعة', () => {
    expect(guessPassProbability(6)).toBeGreaterThan(0.035);
    expect(guessPassProbability(6)).toBeLessThan(0.04);
    expect(guessPassProbability(9)).toBeLessThan(0.01);
    expect(guessPassProbability(6) * guessPassProbability(9)).toBeLessThan(0.001);
  });
});

describe('تخزين النتائج', () => {
  const res = { at: '2026-01-01T10:00:00.000Z', level: 'B1', perLevel: {}, perSkill: {} };
  it('إضافة وقراءة وآخر نتيجة', () => {
    const s = createMemoryStorage();
    expect(addPlacement(s, res)).toBe(true);
    expect(addPlacement(s, { ...res, at: '2026-02-01T10:00:00.000Z', level: 'B2' })).toBe(true);
    expect(loadPlacements(s)).toHaveLength(2);
    expect(latestPlacement(loadPlacements(s)).level).toBe('B2');
  });

  it('يتجاهل التالف ويحتفظ بالسليم', () => {
    const s = createMemoryStorage({ 'eme.placement': JSON.stringify({ results: [res, { level: 'Z9', at: 'x' }, null] }) });
    expect(loadPlacements(s)).toEqual([res]);
    expect(loadPlacements(createMemoryStorage({ 'eme.placement': '{bad' }))).toEqual([]);
    expect(latestPlacement([])).toBeNull();
  });
});
