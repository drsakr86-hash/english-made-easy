import { useState, useRef } from 'react';
import * as content from '../data/legacy-content/index.js';
import VocabSection from '../components/VocabSection.jsx';
import GrammarSection from '../components/GrammarSection.jsx';
import CompoundSection from '../components/CompoundSection.jsx';
import Dashboard from '../components/Dashboard.jsx';
import PlacementSection from '../components/PlacementSection.jsx';
import ReviewSection from '../components/ReviewSection.jsx';
import BackupBar from '../components/BackupBar.jsx';
import { applyResult } from '../engines/review/review.js';
import { logActivity } from '../engines/progress/progress.js';
import { loadActivity, saveActivity } from '../storage/activity.js';
import { loadPlacements, addPlacement, latestPlacement } from '../storage/placement.js';
import { loadReview, saveReview } from '../storage/review.js';
import { loadProgress, saveProgress, loadTab, saveTab } from '../storage/progress.js';

const TABS = [
  ['dashboard', 'الرئيسية'],
  ['words', 'كلمات'],
  ['expressions', 'تعبيرات'],
  ['idioms', 'مصطلحات'],
  ['grammar', 'قواعد'],
  ['compound', 'جمل مركبة'],
  ['review', 'مراجعة'],
  ['placement', 'مستواي'],
];

export default function App({ backend, migration }) {
  const readOnly = migration.state === 'failed';
  const [progress, setProgress] = useState(() => (readOnly ? loadProgress({ getItem: () => null }) : loadProgress(backend)));
  const [tab, setTab] = useState(() => (readOnly ? 'words' : loadTab(backend)));
  const [saveFailed, setSaveFailed] = useState(false);
  const [review, setReview] = useState(() => (readOnly ? {} : loadReview(backend)));
  const reviewRef = useRef(review);
  const [activity, setActivity] = useState(() => (readOnly ? { days: {}, last: null } : loadActivity(backend)));
  const activityRef = useRef(activity);
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
    log(itemId[0] === 'g' ? 'lesson' : 'answer', itemId);
  };
  const finishPlacement = (result) => {
    setPlacements((p) => [...p, result]);
    if (!readOnly) setSaveFailed(!addPlacement(backend, result));
    log('placement', null);
  };
  const changeTab = (k) => {
    setTab(k);
    if (!readOnly) saveTab(backend, k);
  };
  const toggle = (section) => (id) => {
    if (!progress[section].includes(id)) log('mark', id); // التعليم فقط نشاط، لا إلغاؤه
    commit({ ...progress, [section]: progress[section].includes(id) ? progress[section].filter((x) => x !== id) : [...progress[section], id] });
  };
  const complete = (id) => {
    if (!progress.grammar.includes(id)) commit({ ...progress, grammar: [...progress.grammar, id] });
  };

  return (
    <div>
      <h1>English Made Easy</h1>
      <div className="sub">كلمات · تعبيرات · مصطلحات · قواعد · جمل مركبة</div>
      {readOnly && (
        <div className="notice err">
          تعذر ترحيل بياناتك القديمة ({migration.reason}). لن يُحفظ أي تقدم في هذه الجلسة حتى لا تضيع بياناتك. بياناتك القديمة سليمة ولم تُمسّ.
        </div>
      )}
      {saveFailed && <div className="notice">تعذر حفظ التقدم في المتصفح (قد تكون المساحة ممتلئة أو التصفح خاصاً).</div>}
      <div className="tabs">
        {TABS.map(([k, label]) => (
          <button key={k} className={'tab' + (tab === k ? ' on' : '')} onClick={() => changeTab(k)}>{label}</button>
        ))}
      </div>
      <div style={{ marginTop: 10 }}>
        {tab === 'dashboard' && <Dashboard progress={progress} review={review} activity={activity} placement={latestPlacement(placements)} onGo={changeTab} />}
        {['words', 'expressions', 'idioms'].includes(tab) && (
          <VocabSection key={tab} list={content[tab]} known={progress[tab]} onToggle={toggle(tab)} onAnswer={(q, ok) => record(q.itemId, ok)} />
        )}
        {tab === 'grammar' && <GrammarSection lessons={content.grammar} done={progress.grammar} onComplete={complete} onResult={record} />}
        {tab === 'placement' && <PlacementSection latest={latestPlacement(placements)} onFinish={finishPlacement} />}
        {tab === 'review' && <ReviewSection records={review} onAnswer={(q, ok) => record(q.itemId, ok)} />}
        {tab === 'compound' && <CompoundSection items={content.compound} />}
      </div>
      <BackupBar backend={backend} />
    </div>
  );
}
