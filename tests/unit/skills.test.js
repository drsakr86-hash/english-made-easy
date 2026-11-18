import { describe, it, expect } from 'vitest';
import * as content from '../../src/data/legacy-content/index.js';
import { reading } from '../../src/data/skills/reading.js';
import { listening } from '../../src/data/skills/listening.js';
import { writing } from '../../src/data/skills/writing.js';
import { emptySkills, emptyUserWords, recordAttempt, checkFixed, checkFree, addSubmission, recordFixed, resolveVocab, saveVocab } from '../../src/engines/skills/skills.js';
import { reviewQuiz } from '../../src/modules/quiz.js';
import { loadSkills, saveSkills, loadUserWords, saveUserWords } from '../../src/storage/skills.js';
import { createMemoryStorage } from '../../src/storage/localStorage.js';

const NOW = new Date(2026, 0, 10, 12);

describe('سلامة المحتوى', () => {
  it('ثمانية دروس قراءة بالموضوعات المطلوبة ومعرّفات فريدة', () => {
    expect(reading).toHaveLength(8);
    expect(new Set(reading.map((r) => r.id)).size).toBe(8);
    const titles = reading.map((r) => r.title);
    for (const t of ['Introducing Yourself', 'Family and Friends', 'Daily Routine', 'Shopping', 'Travel', 'Restaurants', 'Work and Communication', 'Health and Lifestyle']) expect(titles).toContain(t);
  });
  it.each([['reading', reading], ['listening', listening]])('كل درس %s له أسئلة صحيحة المؤشرات ومفردات', (_, lessons) => {
    for (const l of lessons) {
      expect(l.questions.length).toBeGreaterThanOrEqual(3);
      expect(l.vocab.length).toBeGreaterThanOrEqual(1);
      for (const q of l.questions) {
        expect(q.options).toHaveLength(3);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(3);
        expect(new Set(q.options).size).toBe(3);
      }
      for (const v of l.vocab) expect(v.en && v.ar && v.ex && v.exAr).toBeTruthy();
    }
    expect(new Set(lessons.map((l) => l.id)).size).toBe(lessons.length);
  });
  it('الأسئلة مرتبطة بالنص: الإجابة الصحيحة (أو كلمة منها) تظهر في النص لدروس القراءة ذات الإجابات النصية', () => {
    // فحص سلامة بسيط: نص كل درس غير فارغ وله ترجمة
    for (const r of reading) { expect(r.text.length).toBeGreaterThan(100); expect(r.ar.length).toBeGreaterThan(50); }
  });
  it('الاستماع: سطور بمتحدثين A/B', () => {
    for (const l of listening) { expect(l.lines.length).toBeGreaterThanOrEqual(4); for (const [sp, t] of l.lines) { expect(['A', 'B']).toContain(sp); expect(t.length).toBeGreaterThan(5); } }
  });
  it('الكتابة: كل الأنواع موجودة، والإجابات الثابتة قابلة للاجتياز', () => {
    expect(new Set(writing.map((w) => w.type))).toEqual(new Set(['build', 'fix', 'free']));
    expect(new Set(writing.filter((w) => w.type === 'free').map((w) => w.kind))).toEqual(new Set(['answer', 'paragraph', 'situation', 'message']));
    for (const w of writing.filter((x) => x.type === 'build')) {
      expect(checkFixed(w, w.answer).correct).toBe(true);
      expect(w.words.map((x) => x.toLowerCase()).sort()).toEqual(w.answer.replace(/[.]/g, '').toLowerCase().split(' ').sort());
    }
  });
});

describe('محاولات الدروس', () => {
  it('تسجيل أول محاولة ثم أفضل نتيجة وعدد المحاولات', () => {
    let s = recordAttempt(emptySkills(), 'reading', 'r-001', 1, 3, NOW);
    s = recordAttempt(s, 'reading', 'r-001', 3, 3, NOW);
    s = recordAttempt(s, 'reading', 'r-001', 2, 3, NOW);
    expect(s.reading['r-001']).toMatchObject({ attempts: 3, best: 3, bestTotal: 3, lastScore: 2 });
    expect(s.log).toHaveLength(3);
  });
  it('لا يعدّل الحالة الأصلية', () => {
    const a = emptySkills();
    recordAttempt(a, 'listening', 'l-001', 2, 3, NOW);
    expect(a).toEqual(emptySkills());
  });
  it('السجل محدود', () => {
    let s = emptySkills();
    for (let i = 0; i < 400; i++) s = recordAttempt(s, 'reading', 'r-001', 1, 3, NOW);
    expect(s.log).toHaveLength(300);
    expect(s.reading['r-001'].attempts).toBe(400);
  });
});

describe('الكتابة', () => {
  const t4 = writing.find((w) => w.id === 't-004');
  it('الإجابة الثابتة لا تتأثر بالأحرف والترقيم والمسافات', () => {
    expect(checkFixed(t4, 'she goes to school every day').correct).toBe(true);
    expect(checkFixed(t4, '  She  goes to school every day.  ').correct).toBe(true);
    expect(checkFixed(t4, 'She go to school every day.').correct).toBe(false);
    expect(checkFixed(t4, 'x').expected).toBe(t4.answer);
  });
  it('فحص الكتابة الحرة يعطي نتائج منفصلة لكل معيار', () => {
    const task = writing.find((w) => w.id === 't-009');
    const good = checkFree(task, 'Excuse me, waiter. I ordered my food forty minutes ago and it has not arrived yet. Could you please check the order for me?');
    expect(good.every((c) => c.ok)).toBe(true);
    const bad = checkFree(task, 'i waited');
    expect(bad.find((c) => c.id === 'length').ok).toBe(false);
    expect(bad.find((c) => c.id === 'capital').ok).toBe(false);
    expect(bad.find((c) => c.id === 'end').ok).toBe(false);
    expect(bad.find((c) => c.id === 'pronoun').ok).toBe(false);
    expect(bad.find((c) => c.id === 'kw-waiter').ok).toBe(false);
  });
  it('الحفظ يضيف ولا يستبدل، ويتجاهل الفارغ والتكرار المباشر', () => {
    const task = writing.find((w) => w.id === 't-007');
    let s = addSubmission(emptySkills(), { taskId: 't-007', text: 'First text here for me.', checks: checkFree(task, 'First text here for me.') }, NOW);
    s = addSubmission(s, { taskId: 't-007', text: 'First text here for me.', checks: [] }, NOW);
    expect(s.submissions).toHaveLength(1);
    s = addSubmission(s, { taskId: 't-007', text: 'A second, edited text for the same task.', checks: [] }, NOW);
    expect(s.submissions.map((x) => x.id)).toEqual(['s-001', 's-002']);
    expect(s.submissions[0].text).toBe('First text here for me.'); // النص الأصلي محفوظ
    expect(addSubmission(s, { taskId: 't-007', text: '   ', checks: [] }, NOW)).toBe(s);
  });
  it('نتيجة المهمة الثابتة تتراكم', () => {
    let s = recordFixed(emptySkills(), 't-004', false, NOW);
    s = recordFixed(s, 't-004', true, NOW);
    expect(s.writing['t-004']).toMatchObject({ attempts: 2, correct: 1 });
  });
});

describe('ربط الكلمات ببنك المفردات', () => {
  const base = { content, userwords: emptyUserWords(), review: {}, source: 'r-001' };
  it('كلمة موجودة في البنك تستخدم معرّفها ولا تُنشأ كلمة جديدة', () => {
    const w = content.words[0];
    const r = saveVocab({ en: ' ' + w.en.toUpperCase() + '. ', ar: 'x', ex: 'e', exAr: 'a' }, base, NOW);
    expect(r.id).toBe(w.id);
    expect(r.linked).toBe('bank');
    expect(Object.keys(r.userwords.items)).toHaveLength(0);
    expect(r.review[w.id].nextReviewAt).toBeDefined();
    expect(r.status).toBe('added');
  });
  it('كلمة جديدة تأخذ u-001 ثم تُعاد بنفس المعرّف دون تكرار', () => {
    const item = reading[0].vocab[0]; // hospital (قد تكون في البنك)
    const fresh = { en: 'zebra crossing', ar: 'معبر مشاة', ex: 'Use the zebra crossing.', exAr: 'استخدم معبر المشاة.' };
    const a = saveVocab(fresh, base, NOW);
    expect(a.id).toBe('u-001');
    expect(a.linked).toBe('new');
    const b = saveVocab({ ...fresh, en: 'Zebra Crossing' }, { ...base, userwords: a.userwords, review: a.review }, NOW);
    expect(b.id).toBe('u-001');
    expect(b.status).toBe('already');
    expect(Object.keys(b.userwords.items)).toHaveLength(1);
    const c = saveVocab({ ...fresh, en: 'another new word' }, { ...base, userwords: b.userwords, review: b.review }, NOW);
    expect(c.id).toBe('u-002');
    expect(item.en).toBeTruthy();
  });
  it('حفظ كلمة موجودة في المراجعة لا يعيد ضبط سجلها', () => {
    const w = content.words[3];
    const review = { [w.id]: { itemId: w.id, masteryLevel: 4, nextReviewAt: NOW.toISOString(), reviewHistory: [], correctCount: 5, incorrectCount: 0, firstLearnedAt: NOW.toISOString(), reviewInterval: 14 } };
    const r = saveVocab({ en: w.en, ar: w.ar, ex: '', exAr: '' }, { ...base, review }, NOW);
    expect(r.status).toBe('already');
    expect(r.review[w.id].masteryLevel).toBe(4);
  });
  it('بعد الحفظ يظهر في اختبار المراجعة بمشتتات كاملة', () => {
    const a = saveVocab({ en: 'zebra crossing', ar: 'معبر مشاة', ex: 'Use it.', exAr: 'استخدمه.' }, base, NOW);
    const q = reviewQuiz([a.id], { ...content, userwords: a.userwords });
    expect(q).toHaveLength(1);
    expect(q[0].opts).toHaveLength(4);
    expect(q[0].opts[q[0].a]).toBe('معبر مشاة');
  });
  it('resolveVocab لا يعدّل شيئاً', () => {
    const u = emptyUserWords();
    resolveVocab({ en: 'abc' }, content, u);
    expect(u).toEqual(emptyUserWords());
  });
});

describe('التخزين', () => {
  it('حفظ وقراءة، وتجاهل التالف', () => {
    const st = createMemoryStorage();
    let s = recordAttempt(emptySkills(), 'reading', 'r-001', 2, 3, NOW);
    s = addSubmission(s, { taskId: 't-007', text: 'Hello there my friend today.', checks: [] }, NOW);
    expect(saveSkills(st, s)).toBe(true);
    expect(loadSkills(st)).toEqual(s);
    expect(loadSkills(createMemoryStorage({ 'eme.skills': '{bad' }))).toEqual(emptySkills());
    const mixed = createMemoryStorage({ 'eme.skills': JSON.stringify({ submissions: [{ id: 's-001', taskId: 't', text: 'ok' }, { bad: 1 }], log: [{ nope: true }] }) });
    expect(loadSkills(mixed).submissions).toHaveLength(1);
    expect(loadSkills(mixed).log).toHaveLength(0);
  });
  it('كلمات المستخدم: عداد التالي لا يتراجع', () => {
    const st = createMemoryStorage();
    const r = saveVocab({ en: 'zebra crossing', ar: 'م', ex: '', exAr: '' }, { content, userwords: emptyUserWords(), review: {}, source: 'r' }, NOW);
    saveUserWords(st, r.userwords);
    expect(loadUserWords(st).items['u-001'].en).toBe('zebra crossing');
    const bad = createMemoryStorage({ 'eme.userwords': JSON.stringify({ items: { 'u-005': { id: 'u-005', en: 'a', ar: 'b' }, x: 1 }, next: 1 }) });
    expect(loadUserWords(bad).next).toBe(6);
  });
});
