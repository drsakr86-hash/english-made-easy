import { describe, it, expect } from 'vitest';
import { dayKey, emptyActivity, logActivity, streak, activeDays, overview } from '../../src/engines/progress/progress.js';
import { loadActivity, saveActivity } from '../../src/storage/activity.js';
import { createMemoryStorage } from '../../src/storage/localStorage.js';
import * as content from '../../src/data/legacy-content/index.js';

// ظهراً بالتوقيت المحلي لتفادي حدود اليوم
const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h, 0, 0);

describe('أيام الالتزام', () => {
  it('dayKey بالتوقيت المحلي بصيغة ثابتة', () => {
    expect(dayKey(at(2026, 3, 5))).toBe('2026-03-05');
    expect(dayKey(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
    expect(dayKey(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });

  it('لا نشاط => 0', () => {
    expect(streak(emptyActivity(), at(2026, 1, 10))).toBe(0);
  });

  it('نشاط اليوم فقط => 1، ونشاط متعدد في اليوم لا يزيد السلسلة', () => {
    let a = emptyActivity();
    a = logActivity(a, at(2026, 1, 10, 8), 'answer', 'w-001');
    a = logActivity(a, at(2026, 1, 10, 20), 'answer', 'w-002');
    expect(streak(a, at(2026, 1, 10, 21))).toBe(1);
    expect(a.days['2026-01-10']).toBe(2);
    expect(activeDays(a)).toBe(1);
  });

  it('أيام متتالية تتراكم، والفجوة تقطع السلسلة', () => {
    let a = emptyActivity();
    for (const d of [5, 6, 7, 9, 10]) a = logActivity(a, at(2026, 1, d), 'answer');
    expect(streak(a, at(2026, 1, 10))).toBe(2); // 9 و10 فقط، 8 ناقص
    expect(activeDays(a)).toBe(5);
  });

  it('السلسلة حيّة إن كان آخر نشاط أمس، وتنكسر بعد يوم كامل بلا نشاط', () => {
    let a = emptyActivity();
    for (const d of [8, 9]) a = logActivity(a, at(2026, 1, d), 'answer');
    expect(streak(a, at(2026, 1, 10, 9))).toBe(2);
    expect(streak(a, at(2026, 1, 11, 9))).toBe(0);
  });

  it('تعبر حدود الشهور والسنوات', () => {
    let a = emptyActivity();
    for (const [m, d, y] of [[12, 30, 2025], [12, 31, 2025], [1, 1, 2026]]) a = logActivity(a, at(y, m, d), 'answer');
    expect(streak(a, at(2026, 1, 1))).toBe(3);
  });

  it('logActivity نقية وتحدّث آخر نشاط', () => {
    const a0 = emptyActivity();
    const t = at(2026, 1, 10, 9);
    const a1 = logActivity(a0, t, 'mark', 'w-005');
    expect(a0).toEqual(emptyActivity());
    expect(a1.last).toEqual({ at: t.toISOString(), kind: 'mark', itemId: 'w-005' });
  });
});

describe('ملخص اللوحة', () => {
  const empty = { words: [], expressions: [], idioms: [], grammar: [] };
  const rs = { due: 0, total: 0, mastered: 0 };

  it('مستخدم جديد: أصفار حقيقية', () => {
    const o = overview({ progress: empty, content, reviewSummary: rs, activity: emptyActivity(), now: at(2026, 1, 1) });
    expect(o).toMatchObject({ overallPct: 0, dueToday: 0, streak: 0, activeDays: 0, last: null });
    expect(o.sizes).toEqual({ words: 132, expressions: 60, idioms: 53, grammar: 19 });
  });

  it('النسبة العامة = المتقن+المكتمل ÷ كل العناصر', () => {
    const progress = { words: ['w-001', 'w-002'], expressions: ['e-001'], idioms: [], grammar: ['g-001'] };
    const o = overview({ progress, content, reviewSummary: { due: 3, total: 7, mastered: 1 }, activity: emptyActivity(), now: at(2026, 1, 1) });
    expect(o.overallPct).toBe(Math.round((4 / 264) * 100));
    expect(o).toMatchObject({ dueToday: 3, reviewTracked: 7, masteredByReview: 1 });
    expect(o.done).toEqual({ words: 2, expressions: 1, idioms: 0, grammar: 1 });
  });

  it('عند اكتمال كل شيء 100%', () => {
    const progress = {
      words: content.words.map((x) => x.id),
      expressions: content.expressions.map((x) => x.id),
      idioms: content.idioms.map((x) => x.id),
      grammar: content.grammar.map((x) => x.id),
    };
    expect(overview({ progress, content, reviewSummary: rs, activity: emptyActivity(), now: at(2026, 1, 1) }).overallPct).toBe(100);
  });
});

describe('تخزين النشاط', () => {
  it('حفظ وقراءة', () => {
    const s = createMemoryStorage();
    const a = logActivity(emptyActivity(), at(2026, 1, 10), 'answer', 'w-001');
    expect(saveActivity(s, a)).toBe(true);
    expect(loadActivity(s)).toEqual(a);
  });

  it('يتجاهل المدخلات التالفة ويحتفظ بالسليم', () => {
    const s = createMemoryStorage({ 'eme.activity': JSON.stringify({ days: { '2026-01-10': 2, 'bad': 1, '2026-01-11': -3, '2026-01-12': 'x' }, last: { at: 'nope' } }) });
    expect(loadActivity(s)).toEqual({ days: { '2026-01-10': 2 }, last: null });
    expect(loadActivity(createMemoryStorage({ 'eme.activity': '{bad' }))).toEqual(emptyActivity());
  });
});
