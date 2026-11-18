import { describe, it, expect } from 'vitest';
import * as content from '../../src/data/legacy-content/index.js';
import { indicators, weeklyReport, recommend, learningLog, windowDays, itemName } from '../../src/engines/progress/intelligence.js';
import { applyResult } from '../../src/engines/review/review.js';
import { emptySkills, recordAttempt, recordFixed, addSubmission } from '../../src/engines/skills/skills.js';
import { emptyTutor, startConversation, addUser, addAssistant, endConversation } from '../../src/engines/ai/conversation.js';
import { buildDailyPlan, markTaskDone, closeSession } from '../../src/engines/learning/plan.js';
import { emptyActivity, logActivity, dayKey } from '../../src/engines/progress/progress.js';

const NOW = new Date(2026, 0, 14, 12);
const at = (d, h = 12) => new Date(2026, 0, d, h);
const base = () => ({ now: NOW, content, review: {}, plans: {}, skills: emptySkills(), tutor: emptyTutor(), activity: emptyActivity(), userwords: { items: {}, next: 1 }, placements: [] });
const answer = (review, id, oks, day = 12) => {
  let r = review[id];
  for (const ok of oks) r = applyResult(r, id, ok, at(day));
  return { ...review, [id]: r };
};

describe('المؤشرات', () => {
  it('بلا بيانات: كل المؤشرات null (لا أرقام وهمية)', () => {
    const i = indicators(base());
    for (const k of ['vocabMastery', 'grammarMastery', 'reading', 'listening', 'speaking', 'writing']) expect(i[k].value).toBeNull();
    expect(i.consistency.value).toBe(0);
  });
  it('إتقان المفردات يتطلب مستوى 4+ لا مجرد الإكمال', () => {
    let review = answer({}, 'w-001', [true, true, true, true]); // مستوى 4
    review = answer(review, 'w-002', [true, true]); // مستوى 2
    review = answer(review, 'e-001', [false]);
    const v = indicators({ ...base(), review }).vocabMastery;
    expect(v.n).toBe(3);
    expect(v.value).toBeCloseTo(1 / 3);
  });
  it('القواعد: نسبة الصواب من إجابات حقيقية', () => {
    const review = answer({}, 'g-001', [true, true, false, true]);
    const g = indicators({ ...base(), review }).grammarMastery;
    expect(g).toMatchObject({ n: 4 });
    expect(g.value).toBeCloseTo(0.75);
  });
  it('القراءة والاستماع: متوسط آخر نتيجة لكل درس (وليس أفضل نتيجة)', () => {
    let s = recordAttempt(emptySkills(), 'reading', 'r-001', 3, 3, at(10));
    s = recordAttempt(s, 'reading', 'r-001', 1, 3, at(11)); // آخر نتيجة 1/3
    s = recordAttempt(s, 'reading', 'r-002', 3, 3, at(11));
    const r = indicators({ ...base(), skills: s }).reading;
    expect(r.n).toBe(2);
    expect(r.value).toBeCloseTo((1 / 3 + 1) / 2);
  });
  it('الكتابة: المهام الثابتة منفصلة عن الفحص الشكلي للحرة', () => {
    let s = recordFixed(emptySkills(), 't-004', true, at(10));
    s = recordFixed(s, 't-004', false, at(10));
    s = addSubmission(s, { taskId: 't-007', text: 'Hello there my dear friend.', checks: [{ ok: true }, { ok: true }, { ok: false }, { ok: true }] }, at(11));
    const w = indicators({ ...base(), skills: s }).writing;
    expect(w.value).toBeCloseTo(0.5);
    expect(w.free.count).toBe(1);
    expect(w.free.formAvg).toBeCloseTo(0.75);
    expect(w.detail).toContain('فحص الشكل فقط');
  });
  it('النطق: جلسات منجزة فقط ودقائقها وتوضيح أنه غير مقيس', () => {
    const p = buildDailyPlan({ now: at(13), content, progress: { words: [], expressions: [], idioms: [], grammar: [] }, review: {} });
    const speak = p.tasks.find((t) => t.kind === 'speak');
    const plans = { [p.date]: markTaskDone(p, speak.id, at(13)) };
    const i = indicators({ ...base(), plans });
    expect(i.speaking.sessions).toBe(1);
    expect(i.speaking.minutes).toBe(speak.minutes);
    expect(i.speaking.detail).toContain('غير مقيس');
    expect(indicators({ ...base(), plans: { [p.date]: p } }).speaking.sessions).toBe(0);
  });
  it('الالتزام: جلسات مسجلة في آخر 7 أيام فقط', () => {
    const mk = (d) => {
      let p = buildDailyPlan({ now: at(d), content, progress: { words: [], expressions: [], idioms: [], grammar: [] }, review: {} });
      p = markTaskDone(p, p.tasks[0].id, at(d));
      return closeSession(p, at(d));
    };
    const plans = Object.fromEntries([14, 13, 10, 1].map((d) => [dayKey(at(d)), mk(d)]));
    const c = indicators({ ...base(), plans }).consistency;
    expect(c.closedDays).toBe(3); // 14 و13 و10 داخل النافذة (8..14) والأول من يناير خارجها
    expect(c.value).toBeCloseTo(3 / 7);
  });
});

describe('التقرير الأسبوعي', () => {
  const windowDaysList = windowDays(NOW);
  it('النافذة سبعة أيام تنتهي اليوم', () => {
    expect(windowDaysList).toHaveLength(7);
    expect(windowDaysList[6]).toBe('2026-01-14');
    expect(windowDaysList[0]).toBe('2026-01-08');
  });
  it('الأرقام من البيانات فقط: أيام، وقت، كلمات جديدة، أخطاء متكررة', () => {
    let review = answer({}, 'w-001', [false, false, true], 13);
    review = answer(review, 'w-002', [false], 13);
    review = answer(review, 'g-001', [true], 9);
    review = answer(review, 'w-009', [true], 1); // خارج النافذة
    let plan = buildDailyPlan({ now: at(13), content, progress: { words: [], expressions: [], idioms: [], grammar: [] }, review: {} });
    plan = closeSession(markTaskDone(plan, plan.tasks[0].id, at(13)), at(13));
    let activity = logActivity(logActivity(emptyActivity(), at(13), 'answer', 'w-001'), at(13, 15), 'answer', 'w-001');
    activity = logActivity(activity, at(9), 'answer', 'g-001');
    const rep = weeklyReport({ ...base(), review, plans: { [plan.date]: plan }, activity });
    expect(rep.learningDays).toBe(2);
    expect(rep.sessionsClosed).toBe(1);
    expect(rep.totalMinutes).toBe(plan.tasks[0].minutes);
    expect(rep.newWords).toBe(2); // w-001 وw-002 (تعلُّمهما الأول داخل النافذة)
    expect(rep.frequentErrors[0]).toMatchObject({ id: 'w-001', count: 2 });
    expect(rep.frequentErrors[0].name).toBe(itemName('w-001', content));
    expect(rep.frequentErrors.map((e) => e.id)).not.toContain('w-009');
  });
  it('الجلسة تُحتسب مرة واحدة حتى لو أُغلقت مرتين', () => {
    let plan = buildDailyPlan({ now: at(13), content, progress: { words: [], expressions: [], idioms: [], grammar: [] }, review: {} });
    plan = markTaskDone(plan, plan.tasks[0].id, at(13));
    const once = closeSession(plan, at(13));
    const twice = closeSession(markTaskDone(once, once.tasks[1].id, at(13)), at(14));
    const rep = weeklyReport({ ...base(), plans: { [twice.date]: twice } });
    expect(rep.sessionsClosed).toBe(1);
    expect(rep.totalMinutes).toBe(once.session.minutesDone);
  });
  it('أفضل وأضعف مهارة تتطلب بيانات كافية لمهارتين على الأقل', () => {
    expect(weeklyReport(base()).best).toBeNull();
    let review = answer({}, 'w-001', [true, true, true], 13);
    review = answer(review, 'g-001', [false, false, true], 13);
    const rep = weeklyReport({ ...base(), review });
    expect(rep.best.skill).toBe('vocab');
    expect(rep.weakest.skill).toBe('grammar');
    expect(rep.weakest.ratio).toBeCloseTo(1 / 3);
    const oneSkill = weeklyReport({ ...base(), review: answer({}, 'w-001', [true, true, true], 13) });
    expect(oneSkill.best).toBeNull();
  });
  it('نتائج القراءة المكررة بنفس المعرّف والوقت لا تُحسب مرتين', () => {
    let s = recordAttempt(emptySkills(), 'reading', 'r-001', 1, 3, at(13));
    s = { ...s, log: [...s.log, ...s.log, ...s.log] };
    s = recordAttempt(s, 'reading', 'r-002', 1, 3, at(13));
    const rep = weeklyReport({ ...base(), skills: { ...s, log: [...s.log, ...s.log] } });
    const r = rep.skillsThisWeek.find((x) => x.skill === 'reading');
    expect(r.total).toBe(6); // محاولتان فريدتان × 3 أسئلة
  });
  it('المدرس: يعد المحادثات والتصحيحات داخل الأسبوع فقط', () => {
    let { state, id } = startConversation(emptyTutor(), { mode: 'conversation', level: 'A2', correctionMode: 'instant' }, at(13));
    state = addAssistant(addUser(state, id, 'I goed', at(13)), id, { reply: 'ok', corrections: [{ original: 'a', corrected: 'b', explanation: '', example: '' }], newWords: [] }, at(13));
    const rep = weeklyReport({ ...base(), tutor: endConversation(state, id, at(13)) });
    expect(rep.tutorConversations).toBe(1);
    expect(rep.tutorCorrections).toBe(1);
  });
});

describe('التوصيات مرتبطة بنقاط الضعف المسجلة', () => {
  it('كل توصية لها سبب مبني على بيانات وتبويب، ولا شيء مختلق عند عدم وجود ضعف', () => {
    let review = answer({}, 'w-001', [false, false], 13);
    review = answer(review, 'g-005', [false, false, true], 13);
    const rep = weeklyReport({ ...base(), review });
    const ids = rep.recommendations.map((r) => r.id);
    expect(ids).toContain('due');
    expect(ids).toContain('hard');
    expect(ids).toContain('weak-grammar');
    for (const r of rep.recommendations) { expect(r.reason.length).toBeGreaterThan(5); expect(r.tab).toBeTruthy(); }
    const hard = rep.recommendations.find((r) => r.id === 'hard');
    expect(hard.text).toContain(itemName('w-001', content));
    const g = rep.recommendations.find((r) => r.id === 'weak-grammar');
    expect(g.text).toContain(itemName('g-005', content));
    expect(g.reason).toContain('33%');
  });
  it('لا توصية "صعبة" ولا "قواعد" لمن لا ضعف مسجل لديه', () => {
    const ids = recommend({ ...base(), report: weeklyReport(base()) }).map((r) => r.id);
    expect(ids).not.toContain('hard');
    expect(ids).not.toContain('weak-grammar');
    expect(ids).not.toContain('due');
    expect(ids).toContain('plan');
    expect(ids).toContain('none-reading');
  });
  it('توصية الخطة تختفي إن وُجدت خطة اليوم', () => {
    const p = buildDailyPlan({ now: NOW, content, progress: { words: [], expressions: [], idioms: [], grammar: [] }, review: {} });
    const ids = recommend({ ...base(), plans: { [p.date]: p }, report: weeklyReport(base()) }).map((r) => r.id);
    expect(ids).not.toContain('plan');
  });
});

describe('سجل التعلم', () => {
  it('موحَّد ومرتب والأحدث أولاً وبلا تكرار', () => {
    let s = recordAttempt(emptySkills(), 'reading', 'r-001', 2, 3, at(12));
    s = recordAttempt(s, 'listening', 'l-001', 3, 3, at(13));
    s = { ...s, log: [...s.log, s.log[0]] };
    let plan = buildDailyPlan({ now: at(14), content, progress: { words: [], expressions: [], idioms: [], grammar: [] }, review: {} });
    plan = closeSession(markTaskDone(plan, plan.tasks[0].id, at(14)), at(14));
    const log = learningLog({ plans: { [plan.date]: plan }, skills: s, tutor: emptyTutor(), placements: [{ at: at(11).toISOString(), level: 'B1' }] });
    expect(log.map((x) => x.kind)).toEqual(['session', 'listening', 'reading', 'placement']);
    expect(log.find((x) => x.kind === 'reading').detail).toBe('2 من 3');
  });
});
