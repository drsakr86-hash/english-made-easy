// ذكاء التقدم (V3.5): دوال نقية تحسب من البيانات المحفوظة فقط. الوقت يُمرَّر.
// قاعدة: إكمال الدرس وحده ليس إتقاناً. الإتقان يُقاس بالأداء المتكرر في المراجعة (مستوى ≥ 4).
import { dayKey } from './progress.js';
import { isDue, isHard } from '../review/review.js';

export const MASTERY_LEVEL = 4;
const VOCAB = ['w', 'e', 'i', 'u'];
export const SKILL_LABEL = { vocab: 'المفردات', grammar: 'القواعد', reading: 'القراءة', listening: 'الاستماع', writing: 'الكتابة' };
const SKILL_TAB = { vocab: 'words', grammar: 'grammar', reading: 'skills', listening: 'skills', writing: 'skills' };

const ratio = (a, b) => (b > 0 ? a / b : null);

export function itemName(id, content, userwords) {
  const all = [...content.words, ...content.expressions, ...content.idioms];
  const it = all.find((x) => x.id === id) || (userwords && userwords.items[id]);
  if (it) return it.en;
  const g = content.grammar.find((x) => x.id === id) || (content.basics || []).find((x) => x.id === id);
  if (g) return g.title;
  const c = (content.compound || []).find((x) => x.id === id);
  return c ? c.en : id;
}

/** نافذة الأيام المحلية: آخر n يوماً تنتهي باليوم الحالي. */
export function windowDays(now, n = 7) {
  return Array.from({ length: n }, (_, i) => dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (n - 1 - i), 12)));
}
const inWindow = (iso, days) => days.includes(dayKey(new Date(iso)));
const uniq = (log) => {
  const seen = new Set();
  return log.filter((e) => { const k = `${e.kind}|${e.id}|${e.at}`; if (seen.has(k)) return false; seen.add(k); return true; });
};

/** المؤشرات السبعة. كل مؤشر: {value (0..1 أو null), n (حجم العينة), note}. null = لا بيانات كافية. */
export function indicators({ now, review, plans, skills }) {
  const recs = Object.values(review);
  const vocab = recs.filter((r) => VOCAB.includes(r.itemId[0]));
  const grammar = recs.filter((r) => r.itemId[0] === 'g');
  const vMastered = vocab.filter((r) => r.masteryLevel >= MASTERY_LEVEL).length;
  const gAns = grammar.reduce((s, r) => s + r.correctCount + r.incorrectCount, 0);
  const gOk = grammar.reduce((s, r) => s + r.correctCount, 0);
  const latest = (kind) => {
    const v = Object.values(skills[kind]).filter((x) => x.lastTotal > 0);
    return { value: v.length ? v.reduce((s, x) => s + x.lastScore / x.lastTotal, 0) / v.length : null, n: v.length };
  };
  const fixed = Object.values(skills.writing);
  const fixedAtt = fixed.reduce((s, x) => s + x.attempts, 0);
  const fixedOk = fixed.reduce((s, x) => s + x.correct, 0);
  const free = skills.submissions.filter((s) => s.of);
  const speakDone = Object.values(plans).flatMap((p) => p.tasks.filter((t) => t.kind === 'speak' && t.status === 'done'));
  const days = windowDays(now, 7);
  const recentPlans = days.map((d) => plans[d]).filter(Boolean);
  const closed = recentPlans.filter((p) => p.session).length;
  const tasksTotal = recentPlans.reduce((s, p) => s + p.tasks.length, 0);
  const tasksDone = recentPlans.reduce((s, p) => s + p.tasks.filter((t) => t.status === 'done').length, 0);
  const rd = latest('reading');
  const ls = latest('listening');
  return {
    vocabMastery: { value: ratio(vMastered, vocab.length), n: vocab.length, detail: `${vMastered} متقنة من ${vocab.length} عنصراً في المراجعة (مستوى ${MASTERY_LEVEL}+ بعد إجابات صحيحة متكررة)` },
    grammarMastery: { value: ratio(gOk, gAns), n: gAns, detail: `${gOk} إجابة صحيحة من ${gAns} في أسئلة القواعد` },
    reading: { ...rd, detail: `متوسط آخر نتيجة في ${rd.n} دروس` },
    listening: { ...ls, detail: `متوسط آخر نتيجة في ${ls.n} دروس` },
    speaking: { value: speakDone.length ? 1 : null, n: speakDone.length, sessions: speakDone.length, minutes: speakDone.reduce((s, t) => s + t.minutes, 0), detail: `${speakDone.length} جلسة نطق منجزة (${speakDone.reduce((s, t) => s + t.minutes, 0)} دقيقة تدريب ذاتي، غير مقيس)` },
    writing: {
      value: ratio(fixedOk, fixedAtt), n: fixedAtt,
      fixed: { ok: fixedOk, attempts: fixedAtt },
      free: { count: free.length, formAvg: free.length ? free.reduce((s, x) => s + x.passed / x.of, 0) / free.length : null },
      detail: `مهام ثابتة: ${fixedOk} صحيحة من ${fixedAtt} · كتابات حرة محفوظة: ${free.length} (فحص الشكل فقط)`,
    },
    consistency: { value: ratio(closed, 7), n: 7, closedDays: closed, taskRate: ratio(tasksDone, tasksTotal), detail: `${closed} جلسات مسجلة من آخر 7 أيام` + (tasksTotal ? ` · أُنجز ${tasksDone} من ${tasksTotal} مهمة` : '') },
  };
}

/** تقرير الأسبوع (آخر 7 أيام محلية). */
export function weeklyReport({ now, content, review, plans, skills, tutor, activity, userwords }) {
  const days = windowDays(now, 7);
  const recs = Object.values(review);
  const sessions = days.map((d) => plans[d]).filter((p) => p && p.session);
  const hist = recs.flatMap((r) => r.reviewHistory.filter((h) => inWindow(h.at, days)).map((h) => ({ id: r.itemId, ok: h.ok })));
  const wrongBy = {};
  for (const h of hist) if (!h.ok) wrongBy[h.id] = (wrongBy[h.id] || 0) + 1;
  const frequentErrors = Object.entries(wrongBy).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5).map(([id, n]) => ({ id, name: itemName(id, content, userwords), count: n }));
  const slog = uniq(skills.log).filter((e) => inWindow(e.at, days));
  const skillStat = (list) => ({ ok: list.reduce((s, x) => s + x.ok, 0), total: list.length });
  const bySkill = {
    vocab: skillStat(hist.filter((h) => VOCAB.includes(h.id[0]))),
    grammar: skillStat(hist.filter((h) => h.id[0] === 'g')),
  };
  for (const k of ['reading', 'listening', 'writing']) {
    const e = slog.filter((x) => x.kind === k && x.total > 0);
    bySkill[k] = { ok: e.reduce((s, x) => s + x.score, 0), total: e.reduce((s, x) => s + x.total, 0) };
  }
  const MIN = 3;
  const scored = Object.entries(bySkill).filter(([, v]) => v.total >= MIN).map(([k, v]) => ({ skill: k, label: SKILL_LABEL[k], ratio: v.ok / v.total, total: v.total })).sort((a, b) => b.ratio - a.ratio || a.skill.localeCompare(b.skill));
  const enough = scored.length >= 2;
  const newWords = recs.filter((r) => VOCAB.includes(r.itemId[0]) && inWindow(r.firstLearnedAt, days)).length;
  const convs = tutor.conversations.filter((c) => inWindow(c.startedAt, days));
  const rep = {
    days,
    learningDays: days.filter((d) => activity.days[d]).length,
    sessionsClosed: sessions.length,
    totalMinutes: sessions.reduce((s, p) => s + p.session.minutesDone, 0),
    newWords,
    dueNow: recs.filter((r) => isDue(r, now)).length,
    hardItems: recs.filter(isHard).map((r) => ({ id: r.itemId, name: itemName(r.itemId, content, userwords) })).slice(0, 5),
    frequentErrors,
    tutorConversations: convs.length,
    tutorCorrections: convs.reduce((s, c) => s + c.corrections.length, 0),
    skillsThisWeek: scored,
    best: enough ? scored[0] : null,
    weakest: enough ? scored[scored.length - 1] : null,
  };
  rep.recommendations = recommend({ now, content, review, plans, skills, tutor, userwords, report: rep });
  return rep;
}

/** توصيات: كل توصية مرتبطة ببيانات مسجلة (reason) وبتبويب للانتقال. */
export function recommend({ now, content, review, plans, skills, userwords, report }) {
  const out = [];
  const recs = Object.values(review);
  const due = recs.filter((r) => isDue(r, now)).length;
  if (due > 0) out.push({ id: 'due', text: `راجع ${due} ${due === 1 ? 'عنصراً مستحقاً' : 'عناصر مستحقة'} اليوم`, reason: 'مواعيد المراجعة المتباعدة حانت', tab: 'review' });
  const hard = recs.filter(isHard);
  if (hard.length) out.push({ id: 'hard', text: `تدرب على العناصر الصعبة: ${hard.slice(0, 3).map((r) => itemName(r.itemId, content, userwords)).join('، ')}`, reason: `أخطأت فيها أكثر مما أصبت (${hard.length} عنصراً)`, tab: 'review' });
  const weakG = recs
    .filter((r) => r.itemId[0] === 'g' && r.correctCount + r.incorrectCount >= 2)
    .map((r) => ({ r, q: r.correctCount / (r.correctCount + r.incorrectCount) }))
    .filter((x) => x.q < 0.6)
    .sort((a, b) => a.q - b.q)[0];
  if (weakG) out.push({ id: 'weak-grammar', text: `أعد درس: ${itemName(weakG.r.itemId, content, userwords)}`, reason: `نسبة صوابك فيه ${Math.round(weakG.q * 100)}% فقط`, tab: 'grammar' });
  if (report && report.weakest && report.weakest.ratio < 0.7) out.push({ id: 'weak-skill', text: `ركّز هذا الأسبوع على ${report.weakest.label}`, reason: `أضعف مهارة لديك هذا الأسبوع بنسبة ${Math.round(report.weakest.ratio * 100)}% (${report.weakest.total} محاولات)`, tab: SKILL_TAB[report.weakest.skill] });
  const days = windowDays(now, 7);
  for (const k of ['reading', 'listening']) {
    if (!(skills.log || []).some((e) => e.kind === k && inWindow(e.at, days))) out.push({ id: 'none-' + k, text: k === 'reading' ? 'اقرأ درساً هذا الأسبوع' : 'استمع لدرس هذا الأسبوع', reason: `لا توجد محاولات ${SKILL_LABEL[k]} في آخر 7 أيام`, tab: 'skills' });
  }
  if (!(skills.log || []).some((e) => e.kind === 'writing' && inWindow(e.at, days))) out.push({ id: 'none-writing', text: 'اكتب شيئاً هذا الأسبوع', reason: 'لا توجد مهام كتابة في آخر 7 أيام', tab: 'skills' });
  if (!plans[dayKey(now)]) out.push({ id: 'plan', text: 'أنشئ خطة اليوم', reason: 'لا توجد خطة لهذا اليوم', tab: 'plan' });
  return out;
}

const KIND_LABEL = { reading: 'درس قراءة', listening: 'درس استماع', writing: 'تمرين كتابة' };

/** سجل التعلم الموحَّد (الأحدث أولاً) بلا تكرار. */
export function learningLog({ plans, skills, tutor, placements }, limit = 50) {
  const e = [];
  for (const p of Object.values(plans)) if (p.session) e.push({ at: p.session.at, kind: 'session', label: 'جلسة يومية', detail: `${p.session.tasksDone} من ${p.session.tasksTotal} مهام · ${p.session.minutesDone} دقيقة`, key: 'session|' + p.date });
  for (const x of uniq(skills.log)) e.push({ at: x.at, kind: x.kind, label: KIND_LABEL[x.kind] || x.kind, detail: x.total ? `${x.score} من ${x.total}` : '', key: `${x.kind}|${x.id}|${x.at}` });
  for (const c of tutor.conversations) if (c.endedAt) e.push({ at: c.endedAt, kind: 'tutor', label: 'محادثة مع المدرس', detail: `${c.messages.filter((m) => m.role === 'user').length} رسائل · ${c.corrections.length} تصحيحات`, key: 'tutor|' + c.id });
  for (const r of placements) e.push({ at: r.at, kind: 'placement', label: 'اختبار تحديد المستوى', detail: r.level, key: 'placement|' + r.at });
  const seen = new Set();
  return e.filter((x) => (seen.has(x.key) ? false : (seen.add(x.key), true))).sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
