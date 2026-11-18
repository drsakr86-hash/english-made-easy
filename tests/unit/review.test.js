import { describe, it, expect } from 'vitest';
import { applyResult, dueItems, isDue, isHard, nextDueAt, summarize, LADDER_DAYS, MAX_LEVEL, HISTORY_LIMIT } from '../../src/engines/review/review.js';
import { loadReview, saveReview } from '../../src/storage/review.js';
import { createMemoryStorage } from '../../src/storage/localStorage.js';
import { reviewQuiz } from '../../src/modules/quiz.js';
import * as content from '../../src/data/legacy-content/index.js';

const T0 = new Date('2026-01-01T09:00:00.000Z');
const plus = (d, days) => new Date(d.getTime() + days * 86400000);
const lcg = (seed) => { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; };

describe('محرك المراجعة', () => {
  it('أول إجابة صحيحة تنشئ سجلاً بكل الحقول المطلوبة في الخطة', () => {
    const r = applyResult(undefined, 'w-001', true, T0);
    expect(Object.keys(r).sort()).toEqual(['correctCount', 'firstLearnedAt', 'incorrectCount', 'itemId', 'lastReviewedAt', 'masteryLevel', 'nextReviewAt', 'reviewHistory', 'reviewInterval'].sort());
    expect(r).toMatchObject({ itemId: 'w-001', firstLearnedAt: T0.toISOString(), lastReviewedAt: T0.toISOString(), correctCount: 1, incorrectCount: 0, masteryLevel: 1, reviewInterval: 1 });
    expect(r.nextReviewAt).toBe(plus(T0, 1).toISOString());
    expect(r.reviewHistory).toEqual([{ at: T0.toISOString(), ok: true }]);
  });

  it('الإجابات الصحيحة المتتالية تصعد السلّم 1 ثم 3 ثم 7 ثم 14 ثم 30 وتتوقف عند الحد', () => {
    let r;
    const seen = [];
    for (let i = 0; i < 8; i++) {
      r = applyResult(r, 'w-001', true, plus(T0, i * 100));
      seen.push(r.reviewInterval);
    }
    expect(seen).toEqual([1, 3, 7, 14, 30, 30, 30, 30]);
    expect(r.masteryLevel).toBe(MAX_LEVEL);
    expect(LADDER_DAYS[MAX_LEVEL]).toBe(30);
  });

  it('الخطأ يخفض المستوى درجتين ويعيد المراجعة بعد يوم ويحفظ firstLearnedAt', () => {
    let r;
    for (let i = 0; i < 4; i++) r = applyResult(r, 'w-001', true, plus(T0, i));
    expect(r.masteryLevel).toBe(4);
    const later = plus(T0, 50);
    const f = applyResult(r, 'w-001', false, later);
    expect(f.masteryLevel).toBe(2);
    expect(f.incorrectCount).toBe(1);
    expect(f.reviewInterval).toBe(1);
    expect(f.nextReviewAt).toBe(plus(later, 1).toISOString());
    expect(f.firstLearnedAt).toBe(r.firstLearnedAt);
  });

  it('المستوى لا ينزل تحت الصفر', () => {
    let r = applyResult(undefined, 'w-001', false, T0);
    r = applyResult(r, 'w-001', false, plus(T0, 1));
    expect(r.masteryLevel).toBe(0);
  });

  it('العناصر الصعبة تعود بوتيرة أعلى من السهلة عند نفس المستوى', () => {
    // صعب: خطآن ثم صوابان => المستوى 2 والأخطاء ≥ الصواب
    let hard;
    hard = applyResult(hard, 'a', false, T0);
    hard = applyResult(hard, 'a', false, plus(T0, 1));
    hard = applyResult(hard, 'a', true, plus(T0, 2));
    hard = applyResult(hard, 'a', true, plus(T0, 3));
    expect(isHard(hard)).toBe(true);
    // سهل: صوابان => المستوى 2 أيضاً
    let easy;
    for (let i = 0; i < 2; i++) easy = applyResult(easy, 'b', true, plus(T0, i));
    expect(hard.masteryLevel).toBe(easy.masteryLevel);
    expect(easy.reviewInterval).toBe(3);
    expect(hard.reviewInterval).toBeLessThan(easy.reviewInterval);
    expect(hard.reviewInterval).toBeGreaterThanOrEqual(1);
  });

  it('لا يعدّل السجل الأصلي (نقي)', () => {
    const r = applyResult(undefined, 'w-001', true, T0);
    const copy = JSON.stringify(r);
    applyResult(r, 'w-001', false, plus(T0, 2));
    expect(JSON.stringify(r)).toBe(copy);
  });

  it('سجل المحفوظات محدود بآخر 20 محاولة', () => {
    let r;
    for (let i = 0; i < 30; i++) r = applyResult(r, 'w-001', i % 2 === 0, plus(T0, i));
    expect(r.reviewHistory).toHaveLength(HISTORY_LIMIT);
    expect(r.correctCount + r.incorrectCount).toBe(30);
  });

  it('المستحق: يحدَّد بالوقت ويُرتَّب الأكثر تأخراً أولاً ثم الأضعف', () => {
    const recs = {
      a: applyResult(undefined, 'a', true, plus(T0, 0)), // مستحق 1 يناير+1
      b: applyResult(undefined, 'b', true, plus(T0, -5)), // أكثر تأخراً
      c: applyResult(undefined, 'c', true, plus(T0, 10)), // مستقبلي
    };
    const now = plus(T0, 2);
    expect(isDue(recs.c, now)).toBe(false);
    expect(dueItems(recs, now).map((r) => r.itemId)).toEqual(['b', 'a']);
    expect(dueItems(recs, now, 1).map((r) => r.itemId)).toEqual(['b']);
    expect(nextDueAt(recs, now).toISOString()).toBe(recs.c.nextReviewAt);
  });

  it('عند حلول الموعد بالضبط يصبح مستحقاً', () => {
    const r = applyResult(undefined, 'a', true, T0);
    expect(isDue(r, new Date(r.nextReviewAt))).toBe(true);
    expect(isDue(r, new Date(new Date(r.nextReviewAt).getTime() - 1))).toBe(false);
  });

  it('الملخص صحيح', () => {
    let m;
    for (let i = 0; i < 5; i++) m = applyResult(m, 'm', true, plus(T0, i));
    const recs = { m, n: applyResult(undefined, 'n', false, T0) };
    const s = summarize(recs, plus(T0, 100));
    expect(s).toMatchObject({ total: 2, due: 2, mastered: 1 });
    expect(s.levels[5]).toBe(1);
    expect(s.levels[0]).toBe(1);
  });
});

describe('تخزين المراجعة', () => {
  it('حفظ ثم قراءة يعيد نفس السجلات', () => {
    const s = createMemoryStorage();
    const recs = { 'w-001': applyResult(undefined, 'w-001', true, T0) };
    expect(saveReview(s, recs)).toBe(true);
    expect(loadReview(s)).toEqual(recs);
  });

  it('يتجاهل السجل التالف ويحتفظ بالسليم', () => {
    const good = applyResult(undefined, 'w-002', true, T0);
    const s = createMemoryStorage({ 'eme.review': JSON.stringify({ version: 1, items: { 'w-002': good, 'w-001': { itemId: 'w-001' }, 'w-003': { ...good, itemId: 'zzz' } } }) });
    expect(Object.keys(loadReview(s))).toEqual(['w-002']);
  });

  it('JSON تالف أو فارغ يعطي {} دون استثناء', () => {
    expect(loadReview(createMemoryStorage({ 'eme.review': '{bad' }))).toEqual({});
    expect(loadReview(createMemoryStorage())).toEqual({});
  });
});

describe('اختبار المراجعة', () => {
  it('يبني سؤالاً لكل معرّف مستحق ويحمل itemId وإجابته صحيحة', () => {
    const ids = ['w-002', 'w-132', 'e-003', 'i-004', 'g-001', 'g-012'];
    const qs = reviewQuiz(ids, content, lcg(5));
    expect(qs.map((q) => q.itemId)).toEqual(ids);
    for (const q of qs) {
      if (q.itemId[0] === 'g') {
        const lesson = content.grammar.find((g) => g.id === q.itemId);
        expect(lesson.questions.some((x) => x.q === q.q && x.options[x.answer] === q.opts[q.a])).toBe(true);
      } else {
        const list = { w: content.words, e: content.expressions, i: content.idioms }[q.itemId[0]];
        const it = list.find((x) => x.id === q.itemId);
        expect(q.opts[q.a]).toBe(it.ar);
        expect(q.opts).toHaveLength(4);
      }
    }
  });

  it('يتجاهل معرّفاً غير موجود', () => {
    expect(reviewQuiz(['w-999', 'x-001'], content)).toEqual([]);
  });
});
