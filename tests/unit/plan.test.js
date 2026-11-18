import { describe, it, expect } from 'vitest';
import * as content from '../../src/data/legacy-content/index.js';
import { allocate, buildDailyPlan, markTaskDone, closeSession, tasksDone, BASE_MINUTES } from '../../src/engines/learning/plan.js';
import { applyResult } from '../../src/engines/review/review.js';
import { loadPlans, savePlans, loadPlanMinutes, savePlanMinutes } from '../../src/storage/plans.js';
import { createMemoryStorage } from '../../src/storage/localStorage.js';

const NOW = new Date(2026, 0, 10, 12, 0, 0);
const empty = { words: [], expressions: [], idioms: [], grammar: [] };
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const plan = (over = {}) => buildDailyPlan({ now: NOW, content, progress: empty, review: {}, ...over });

describe('توزيع الدقائق', () => {
  it('الافتراضي 30 = 8 + 5 + 7 + 10 كما في الخطة', () => {
    expect(BASE_MINUTES).toEqual({ vocab: 8, grammar: 5, review: 7, speak: 10 });
    expect(allocate(['vocab', 'grammar', 'review', 'speak'], 30, null, 0)).toEqual({ vocab: 8, grammar: 5, review: 7, speak: 10 });
  });

  it('المجموع يساوي الوقت المتاح دائماً (15 و30 و45 وأي مجموعة أنواع)', () => {
    for (const minutes of [15, 30, 45]) {
      for (const level of [null, 'A1', 'B1', 'C2']) {
        for (const due of [0, 12]) {
          for (const kinds of [['vocab', 'grammar', 'review', 'speak'], ['grammar', 'review', 'speak'], ['vocab', 'speak'], ['grammar']]) {
            expect(sum(allocate(kinds, minutes, level, due))).toBe(minutes);
          }
        }
      }
    }
  });

  it('المستوى المبتدئ يزيد المفردات، والمتقدم يزيد القواعد، والمراجعات الكثيرة تزيد المراجعة', () => {
    const k = ['vocab', 'grammar', 'review', 'speak'];
    const base = allocate(k, 30, null, 0);
    expect(allocate(k, 30, 'A1', 0).vocab).toBeGreaterThan(base.vocab);
    expect(allocate(k, 30, 'A1', 0).speak).toBeLessThan(base.speak);
    expect(allocate(k, 30, 'C1', 0).grammar).toBeGreaterThan(base.grammar);
    expect(allocate(k, 30, null, 10).review).toBeGreaterThan(base.review);
    expect(allocate(k, 30, null, 9).review).toBe(base.review);
  });

  it('لا نوع يقل عن دقيقتين في التعديلات', () => {
    const a = allocate(['vocab', 'grammar', 'review', 'speak'], 30, 'A1', 20);
    expect(Math.min(...Object.values(a))).toBeGreaterThanOrEqual(2);
  });
});

describe('بناء الخطة', () => {
  it('مستخدم جديد: أربع مهام بالترتيب ومجموع 30 دقيقة، والمراجعة بديلة لعدم وجود مستحق', () => {
    const p = plan();
    expect(p.date).toBe('2026-01-10');
    expect(p.tasks.map((t) => t.kind)).toEqual(['vocab', 'grammar', 'explore', 'speak']);
    expect(sum(Object.fromEntries(p.tasks.map((t) => [t.id, t.minutes])))).toBe(30);
    expect(p.tasks.every((t) => t.status === 'pending' && t.itemIds.length > 0)).toBe(true);
    expect(p.tasks[0].itemIds).toHaveLength(8);
    expect(p.tasks[0].itemIds[0]).toBe('w-001');
    expect(p.tasks[1].itemIds).toEqual(['g-001']);
    expect(p.session).toBeNull();
  });

  it('مهمة المراجعة تستخدم المستحق فعلاً إن وُجد وتستبعده من المفردات الجديدة', () => {
    const past = new Date(2025, 11, 1, 12);
    const review = { 'w-001': applyResult(undefined, 'w-001', true, past), 'w-002': applyResult(undefined, 'w-002', false, past) };
    const p = plan({ review });
    const r = p.tasks.find((t) => t.kind === 'review');
    expect(r.title).toBe('مراجعة متباعدة');
    expect(r.itemIds).toEqual(expect.arrayContaining(['w-001', 'w-002']));
    const vocab = p.tasks.find((t) => t.kind === 'vocab');
    expect(vocab.itemIds).not.toContain('w-001');
    expect(vocab.itemIds).not.toContain('w-002');
  });

  it('لا تتكرر عناصر بين المهام، والمتقن لا يُعرض كجديد', () => {
    const progress = { ...empty, words: ['w-001', 'w-002', 'w-003'] };
    const p = plan({ progress });
    const all = p.tasks.flatMap((t) => t.itemIds);
    expect(p.tasks[0].itemIds).not.toContain('w-001');
    expect(p.tasks[0].itemIds[0]).toBe('w-004');
    const nonSpeak = p.tasks.filter((t) => t.kind !== 'speak').flatMap((t) => t.itemIds);
    expect(new Set(nonSpeak).size).toBe(nonSpeak.length);
    expect(all.length).toBeGreaterThan(0);
  });

  it('القواعد: أول درس غير مكتمل، وعند اكتمال الكل الأضعف مراجعة', () => {
    expect(plan({ progress: { ...empty, grammar: ['g-001', 'g-002'] } }).tasks[1].itemIds).toEqual(['g-003']);
    const all = { ...empty, grammar: content.grammar.map((g) => g.id) };
    const past = new Date(2025, 11, 1, 12);
    const review = { 'g-005': applyResult(undefined, 'g-005', false, past), 'g-007': applyResult(applyResult(undefined, 'g-007', true, past), 'g-007', true, past) };
    expect(plan({ progress: all, review }).tasks.find((t) => t.kind === 'grammar').itemIds).toEqual(['g-005']);
    expect(plan({ progress: all }).tasks.find((t) => t.kind === 'grammar').itemIds).toEqual(['g-001']);
  });

  it('عند نفاد المفردات الجديدة تمتد إلى التعبيرات ثم المصطلحات، وعند نفاد الكل تُسقط المهمة وتُعاد الدقائق', () => {
    const w = content.words.map((x) => x.id);
    const e = content.expressions.map((x) => x.id);
    const progress = { ...empty, words: w };
    const p1 = plan({ progress });
    expect(p1.tasks[0].itemIds[0]).toMatch(/^e-/);
    const doneAll = { words: w, expressions: e, idioms: content.idioms.map((x) => x.id), grammar: [] };
    const p2 = plan({ progress: doneAll });
    expect(p2.tasks.map((t) => t.kind)).toEqual(['grammar', 'speak']);
    expect(p2.tasks.reduce((a, t) => a + t.minutes, 0)).toBe(30);
  });

  it('تدوير مادة النطق يتغير بحسب عدد الأيام السابقة', () => {
    const a = plan({ historyCount: 0 }).tasks.find((t) => t.kind === 'speak').itemIds;
    const b = plan({ historyCount: 1 }).tasks.find((t) => t.kind === 'speak').itemIds;
    expect(a).not.toEqual(b);
    expect(a).toHaveLength(5);
  });

  it('15 و45 دقيقة: المجموع صحيح وعدد العناصر يتبع الوقت', () => {
    for (const minutes of [15, 45]) {
      const p = plan({ minutes });
      expect(p.tasks.reduce((a, t) => a + t.minutes, 0)).toBe(minutes);
    }
    expect(plan({ minutes: 45 }).tasks[0].itemIds.length).toBeGreaterThan(plan({ minutes: 15 }).tasks[0].itemIds.length);
  });

  it('حتمية: نفس المدخلات تعطي الخطة نفسها، ولا تُعدّل المدخلات', () => {
    const progress = { ...empty, words: ['w-001'] };
    const before = JSON.stringify(progress);
    expect(JSON.stringify(plan({ progress }))).toBe(JSON.stringify(plan({ progress })));
    expect(JSON.stringify(progress)).toBe(before);
  });
});

describe('إنجاز المهام وإنهاء الجلسة', () => {
  it('لا تُغلق الجلسة بلا مهمة منجزة', () => {
    const p = plan();
    expect(closeSession(p, NOW).session).toBeNull();
  });

  it('تسجيل مهمة منجزة ثم إنهاء الجلسة يسجل الأعداد والدقائق', () => {
    let p = plan();
    p = markTaskDone(p, p.tasks[0].id, NOW);
    p = markTaskDone(p, p.tasks[1].id, NOW);
    expect(tasksDone(p)).toBe(2);
    const c = closeSession(p, new Date(NOW.getTime() + 60000));
    expect(c.session).toMatchObject({ tasksDone: 2, tasksTotal: 4, minutesPlanned: 30, minutesDone: p.tasks[0].minutes + p.tasks[1].minutes });
  });

  it('الإنهاء مرتان لا يسجل جلسة ثانية ولا يغير الأولى', () => {
    let p = plan();
    p = markTaskDone(p, p.tasks[0].id, NOW);
    const c1 = closeSession(p, NOW);
    const c2 = closeSession(markTaskDone(c1, c1.tasks[1].id, NOW), new Date(NOW.getTime() + 999999));
    expect(c2.session).toEqual(c1.session);
  });

  it('إنجاز المهمة نفسها مرتين لا يغير وقت الإنجاز الأول', () => {
    let p = plan();
    const t = p.tasks[0].id;
    p = markTaskDone(p, t, NOW);
    const first = p.tasks[0].doneAt;
    p = markTaskDone(p, t, new Date(NOW.getTime() + 5000));
    expect(p.tasks[0].doneAt).toBe(first);
  });
});

describe('تخزين الخطط', () => {
  it('حفظ وقراءة، وتجاهل التالف', () => {
    const s = createMemoryStorage();
    const p = plan();
    expect(savePlans(s, { [p.date]: p })).toBe(true);
    expect(loadPlans(s)).toEqual({ [p.date]: p });
    const bad = createMemoryStorage({ 'eme.plans': JSON.stringify({ days: { [p.date]: p, '2026-01-11': { date: '2026-01-12' }, x: p } }) });
    expect(Object.keys(loadPlans(bad))).toEqual([p.date]);
    expect(loadPlans(createMemoryStorage({ 'eme.plans': '{bad' }))).toEqual({});
  });

  it('دقائق الخطة: افتراضي 30 وقيم صحيحة فقط', () => {
    const s = createMemoryStorage();
    expect(loadPlanMinutes(s)).toBe(30);
    savePlanMinutes(s, 45);
    expect(loadPlanMinutes(s)).toBe(45);
    expect(loadPlanMinutes(createMemoryStorage({ 'eme.settings': JSON.stringify({ planMinutes: 99 }) }))).toBe(30);
  });
});
