import { useState, useRef } from 'react';
import * as content from '../data/legacy-content/index.js';
import VocabSection from '../components/VocabSection.jsx';
import GrammarSection from '../components/GrammarSection.jsx';
import CompoundSection from '../components/CompoundSection.jsx';
import Dashboard from '../components/Dashboard.jsx';
import PlanSection from '../components/PlanSection.jsx';
import SkillsSection from '../components/SkillsSection.jsx';
import ReportSection from '../components/ReportSection.jsx';
import TutorSection from '../components/TutorSection.jsx';
import PlacementSection from '../components/PlacementSection.jsx';
import ReviewSection from '../components/ReviewSection.jsx';
import BackupBar from '../components/BackupBar.jsx';
import { applyResult, startTracking } from '../engines/review/review.js';
import { recordAttempt, recordFixed, addSubmission, saveVocab } from '../engines/skills/skills.js';
import { loadTutor, loadEndpoint, loadToken, consumeInviteFromHash } from '../storage/tutor.js';
import { createTutorClient, DEFAULT_ENDPOINT } from '../engines/ai/client.js';
import { loadSkills, saveSkills, loadUserWords, saveUserWords } from '../storage/skills.js';
import { logActivity, dayKey } from '../engines/progress/progress.js';
import { buildDailyPlan, markTaskDone, closeSession, tasksDone } from '../engines/learning/plan.js';
import { loadPlans, savePlans, loadPlanMinutes, savePlanMinutes } from '../storage/plans.js';
import { loadActivity, saveActivity } from '../storage/activity.js';
import { loadPlacements, addPlacement, latestPlacement } from '../storage/placement.js';
import { loadBasics, saveBasics } from '../storage/basics.js';
import { loadReview, saveReview } from '../storage/review.js';
import { loadProgress, saveProgress, loadTab, saveTab } from '../storage/progress.js';

const TABS = [
  ['dashboard', 'الرئيسية'],
  ['learn', 'تعلّم'],
  ['plan', 'خطة اليوم'],
  ['skills', 'مهارات'],
  ['tutor', 'المدرس'],
  ['review', 'مراجعة'],
  ['report', 'تقريري'],
  ['placement', 'مستواي'],
];
const LEARN = [
  ['basics', 'أساسيات'],
  ['words', 'كلمات'],
  ['expressions', 'تعبيرات'],
  ['idioms', 'مصطلحات'],
  ['grammar', 'قواعد'],
  ['compound', 'جمل مركبة'],
];
const inLearn = (t) => LEARN.some(([k]) => k === t);

export default function App({ backend, migration }) {
  const readOnly = migration.state === 'failed';
  const [inviteSaved] = useState(() => !readOnly && typeof window !== 'undefined' && consumeInviteFromHash(backend, window.location, window.history));
  const [progress, setProgress] = useState(() => (readOnly ? loadProgress({ getItem: () => null }) : loadProgress(backend)));
  const [tab, setTab] = useState(() => (readOnly ? 'words' : loadTab(backend)));
  const [saveFailed, setSaveFailed] = useState(false);
  const [review, setReview] = useState(() => (readOnly ? {} : loadReview(backend)));
  const reviewRef = useRef(review);
  const [activity, setActivity] = useState(() => (readOnly ? { days: {}, last: null } : loadActivity(backend)));
  const activityRef = useRef(activity);
  const [plans, setPlans] = useState(() => (readOnly ? {} : loadPlans(backend)));
  const [planMinutes, setPlanMinutes] = useState(() => (readOnly ? 30 : loadPlanMinutes(backend)));
  const [today, setToday] = useState(() => dayKey(new Date()));
  const [skills, setSkills] = useState(() => (readOnly ? loadSkills({ getItem: () => null }) : loadSkills(backend)));
  const skillsRef = useRef(skills);
  const [userwords, setUserwords] = useState(() => (readOnly ? { items: {}, next: 1 } : loadUserWords(backend)));
  const userwordsRef = useRef(userwords);
  const [basics, setBasics] = useState(() => (readOnly ? { done: [] } : loadBasics(backend)));
  const [placements, setPlacements] = useState(() => (readOnly ? [] : loadPlacements(backend)));

  // الحفظ يتم عند الحدث نفسه (لا داخل effect) ويُظهر تنبيهاً إن فشل.
  const commit = (next) => {
    setProgress(next);
    if (!readOnly) setSaveFailed(!saveProgress(backend, next));
  };
  const log = (kind, itemId) => {
    const next = logActivity(activityRef.current, new Date(), kind, itemId);
    activityRef.current = next;
    setActivity(next);
    if (!readOnly) setSaveFailed((f) => f || !saveActivity(backend, next));
  };
  // تسجيل نتيجة إجابة في سجل المراجعة بمعرّف العنصر (الوقت من الساعة هنا فقط)
  const record = (itemId, ok) => {
    if (!itemId) return;
    const next = { ...reviewRef.current, [itemId]: applyResult(reviewRef.current[itemId], itemId, ok, new Date()) };
    reviewRef.current = next;
    setReview(next);
    if (!readOnly) setSaveFailed(!saveReview(backend, next));
    log(itemId[0] === 'g' || itemId[0] === 'b' ? 'lesson' : 'answer', itemId);
  };
  // يبدأ تتبّع عنصر في المراجعة دون احتساب إجابة (لا يغيّر عنصراً متتبَّعاً)
  const track = (itemId) => {
    if (reviewRef.current[itemId]) return;
    const next = { ...reviewRef.current, [itemId]: startTracking(undefined, itemId, new Date()) };
    reviewRef.current = next;
    setReview(next);
    if (!readOnly) setSaveFailed((f) => f || !saveReview(backend, next));
  };
  const putSkills = (next) => {
    skillsRef.current = next;
    setSkills(next);
    if (!readOnly) setSaveFailed((f) => f || !saveSkills(backend, next));
  };
  const skillAttempt = (kind, id, score, total) => {
    putSkills(recordAttempt(skillsRef.current, kind, id, score, total, new Date()));
    log('skill_' + kind, id);
  };
  const fixedResult = (taskId, correct) => {
    putSkills(recordFixed(skillsRef.current, taskId, correct, new Date()));
    log('skill_writing', taskId);
  };
  const saveWriting = (taskId, text, checks) => {
    putSkills(addSubmission(skillsRef.current, { taskId, text, checks }, new Date()));
    log('skill_writing', taskId);
  };
  const saveWord = (item, source) => {
    const r = saveVocab(item, { content, userwords: userwordsRef.current, review: reviewRef.current, source }, new Date());
    if (r.status === 'added') {
      userwordsRef.current = r.userwords;
      setUserwords(r.userwords);
      reviewRef.current = r.review;
      setReview(r.review);
      if (!readOnly) setSaveFailed((f) => f || !saveUserWords(backend, r.userwords) || !saveReview(backend, r.review));
      log('save_word', r.id);
    }
    return r.status;
  };
  const getClient = () => createTutorClient({ endpoint: readOnly ? DEFAULT_ENDPOINT : loadEndpoint(backend, DEFAULT_ENDPOINT), token: readOnly ? '' : loadToken(backend) });
  const finishPlacement = (result) => {
    setPlacements((p) => [...p, result]);
    if (!readOnly) setSaveFailed(!addPlacement(backend, result));
    log('placement', null);
  };
  const level = () => (latestPlacement(placements) ? latestPlacement(placements).level : null);
  const makePlan = (minutes) =>
    buildDailyPlan({ now: new Date(), minutes, level: level(), content, progress, review: reviewRef.current, historyCount: Object.keys(plans).filter((d) => d !== today).length });
  const putPlan = (plan) => {
    const next = { ...plans, [plan.date]: plan };
    setPlans(next);
    if (!readOnly) setSaveFailed(!savePlans(backend, next));
  };
  const createPlan = () => putPlan(makePlan(planMinutes));
  const changeMinutes = (m) => {
    setPlanMinutes(m);
    if (!readOnly) savePlanMinutes(backend, m);
    const cur = plans[today];
    if (cur && tasksDone(cur) === 0 && !cur.session) putPlan(makePlan(m));
  };
  const planTaskDone = (taskId) => {
    const cur = plans[today];
    if (!cur) return;
    putPlan(markTaskDone(cur, taskId, new Date()));
    log('plan_task', null);
  };
  const endSession = () => {
    const cur = plans[today];
    if (!cur || cur.session) return;
    const closed = closeSession(cur, new Date());
    if (closed.session) {
      putPlan(closed);
      log('session', null);
    }
  };
  const grammarFinish = (lessonId, ok) => {
    record(lessonId, ok);
    if (ok) complete(lessonId);
  };
  // بيانات التحليل تُجمع عند فتح التبويب فقط (المحادثات تُقرأ من التخزين لأن مالكها تبويب المدرس)
  const getIntel = () => ({ now: new Date(), content, review: reviewRef.current, plans, skills: skillsRef.current, tutor: readOnly ? { conversations: [], usage: { day: '', count: 0 } } : loadTutor(backend), activity: activityRef.current, userwords: userwordsRef.current, placements });
  const lastLearn = useRef(inLearn(tab) ? tab : 'words');
  const changeTab = (k) => {
    if (k === 'learn') k = lastLearn.current;
    if (inLearn(k)) lastLearn.current = k;
    setToday(dayKey(new Date()));
    setTab(k);
    if (!readOnly) saveTab(backend, k);
  };
  const toggle = (section) => (id) => {
    if (!progress[section].includes(id)) {
      log('mark', id); // التعليم فقط نشاط، لا إلغاؤه
      track(id); // "أتقنتها" تدخل العنصر في المراجعة المتباعدة ليُختبر لاحقاً
    }
    commit({ ...progress, [section]: progress[section].includes(id) ? progress[section].filter((x) => x !== id) : [...progress[section], id] });
  };
  const completeBasic = (id) => {
    if (basics.done.includes(id)) return;
    const next = { done: [...basics.done, id] };
    setBasics(next);
    if (!readOnly) setSaveFailed((f) => f || !saveBasics(backend, next));
  };
  const complete = (id) => {
    if (!progress.grammar.includes(id)) commit({ ...progress, grammar: [...progress.grammar, id] });
  };

  return (
    <div>
      <h1>English Made Easy</h1>
      <div className="sub">كلمات · تعبيرات · مصطلحات · قواعد · جمل مركبة</div>
      {inviteSaved && <div className="notice">تم حفظ رمز الدخول على هذا الجهاز. افتح تبويب المدرس وابدأ.</div>}
      {readOnly && (
        <div className="notice err">
          تعذر ترحيل بياناتك القديمة ({migration.reason}). لن يُحفظ أي تقدم في هذه الجلسة حتى لا تضيع بياناتك. بياناتك القديمة سليمة ولم تُمسّ.
        </div>
      )}
      {migration.state === 'conflict' && (
        <div className="notice">{migration.reason}</div>
      )}
      {saveFailed && <div className="notice">تعذر حفظ التقدم في المتصفح (قد تكون المساحة ممتلئة أو التصفح خاصاً).</div>}
      <div className="tabs">
        {TABS.map(([k, label]) => (
          <button key={k} className={'tab' + ((k === 'learn' ? inLearn(tab) : tab === k) ? ' on' : '')} onClick={() => changeTab(k)}>{label}</button>
        ))}
      </div>
      {inLearn(tab) && (
        <div className="tabs">
          {LEARN.map(([k, label]) => (
            <button key={k} className={'subtab' + (tab === k ? ' on' : '')} onClick={() => changeTab(k)}>{label}</button>
          ))}
        </div>
      )}
      <div style={{ marginTop: 10 }}>
        {tab === 'dashboard' && <Dashboard progress={progress} review={review} activity={activity} placement={latestPlacement(placements)} plan={plans[today] || null} onGo={changeTab} />}
        {['words', 'expressions', 'idioms'].includes(tab) && (
          <VocabSection key={tab} list={content[tab]} known={progress[tab]} onToggle={toggle(tab)} onAnswer={(q, ok) => record(q.itemId, ok)} />
        )}
        {tab === 'basics' && <GrammarSection lessons={content.basics} done={basics.done} onComplete={completeBasic} onResult={record} unit="درساً" />}
        {tab === 'grammar' && <GrammarSection lessons={content.grammar} done={progress.grammar} onComplete={complete} onResult={record} />}
        {tab === 'plan' && <PlanSection userwords={userwords} plan={plans[today] || null} minutes={planMinutes} onMinutes={changeMinutes} onCreate={createPlan} onTaskDone={planTaskDone} onClose={endSession} onAnswer={(q, ok) => record(q.itemId, ok)} onGrammarResult={grammarFinish} />}
        {tab === 'skills' && <SkillsSection skills={skills} onAttempt={skillAttempt} onSaveVocab={saveWord} onFixedResult={fixedResult} onSaveWriting={saveWriting} getClient={getClient} level={level()} />}
        {tab === 'tutor' && <TutorSection backend={backend} readOnly={readOnly} level={level()} onSaveVocab={saveWord} log={log} getIntel={getIntel} onGo={changeTab} />}
        {tab === 'report' && <ReportSection key={tab + today + activity.last?.at} getIntel={getIntel} onGo={changeTab} />}
        {tab === 'placement' && <PlacementSection latest={latestPlacement(placements)} onFinish={finishPlacement} />}
        {tab === 'review' && <ReviewSection records={review} userwords={userwords} onAnswer={(q, ok) => record(q.itemId, ok)} />}
        {tab === 'compound' && <CompoundSection items={content.compound} onAnswer={(q, ok) => record(q.itemId, ok)} />}
      </div>
      <BackupBar backend={backend} />
    </div>
  );
}
