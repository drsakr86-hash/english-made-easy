import { useState } from 'react';
import Quiz from './Quiz.jsx';
import { speak } from './speech.js';
import { reviewQuiz, grammarQuiz, passed } from '../modules/quiz.js';
import { MINUTE_OPTIONS, tasksDone } from '../engines/learning/plan.js';
import * as content from '../data/legacy-content/index.js';

const speakItems = (ids) => ids.map((id) => [...content.expressions, ...content.idioms].find((x) => x.id === id)).filter(Boolean);

function SpeakDrill({ task, onDone }) {
  const items = speakItems(task.itemIds);
  const [said, setSaid] = useState([]);
  const toggle = (id) => setSaid((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  return (
    <div>
      <div className="card small">اسمع كل عبارة ثم كرّرها بصوت عالٍ وعلّمها. هذا تدريب ذاتي ولا يقيس التطبيق نطقك.</div>
      {items.map((it) => (
        <div className="card" key={it.id}>
          <div className="top">
            <div><div className="en">{it.en}</div><div className="ar">{it.ar}</div></div>
            <div>
              <button className="ic" onClick={() => speak(it.en)} title="نطق">🔊</button>{' '}
              <button className="ic" onClick={() => toggle(it.id)} title="نطقتها">{said.includes(it.id) ? '✅' : '⬜'}</button>
            </div>
          </div>
          <div className="ex">{it.ex}</div>
        </div>
      ))}
      <button className="next" disabled={said.length < items.length} onClick={onDone}>تم ({said.length}/{items.length})</button>
    </div>
  );
}

function GrammarTask({ task, onDone, onResult }) {
  const lesson = content.grammar.find((g) => g.id === task.itemIds[0]);
  const [started, setStarted] = useState(false);
  if (!started) {
    return (
      <div className="card">
        <div className="ar" style={{ fontWeight: 700 }}>{lesson.title}</div>
        <div className="rule">{lesson.rule}</div>
        <button className="next" onClick={() => setStarted(true)}>ابدأ التمرين</button>
      </div>
    );
  }
  return (
    <Quiz
      qs={grammarQuiz(lesson)}
      resultNote={(s, t) => (passed(s, t) ? 'أحسنت، اكتمل الدرس ✅' : 'تحتاج 60% على الأقل لإكمال الدرس، وسيعود في خططك القادمة.')}
      onFinish={(s, t) => { onResult(lesson.id, passed(s, t)); onDone(); }}
    />
  );
}

export default function PlanSection({ userwords, plan, minutes, onMinutes, onCreate, onTaskDone, onClose, onAnswer, onGrammarResult }) {
  const [running, setRunning] = useState(null);

  if (running) {
    const finish = () => { onTaskDone(running.id); setRunning(null); };
    const back = <button className="btn" style={{ marginBottom: 8 }} onClick={() => setRunning(null)}>رجوع للخطة</button>;
    if (running.kind === 'speak') return <div>{back}<SpeakDrill task={running} onDone={finish} /></div>;
    if (running.kind === 'grammar') return <div>{back}<GrammarTask task={running} onDone={finish} onResult={onGrammarResult} /></div>;
    return <Quiz qs={reviewQuiz(running.itemIds, { ...content, userwords })} onAnswer={onAnswer} onFinish={finish} />;
  }

  const picker = (
    <div className="row">
      {MINUTE_OPTIONS.map((m) => (
        <button key={m} className={'btn' + (minutes === m ? ' on' : '')} onClick={() => onMinutes(m)}>{m} دقيقة</button>
      ))}
    </div>
  );

  if (!plan) {
    return (
      <div className="card">
        <div className="ar" style={{ fontWeight: 700 }}>خطة اليوم</div>
        <div className="small" style={{ margin: '6px 0' }}>كم من الوقت لديك اليوم؟</div>
        {picker}
        <button className="next" onClick={onCreate}>أنشئ خطة اليوم</button>
      </div>
    );
  }

  const done = tasksDone(plan);
  const closed = !!plan.session;
  return (
    <div>
      {done === 0 && !closed && <div className="card"><div className="small" style={{ marginBottom: 6 }}>الوقت المتاح (يمكن تغييره قبل بدء أي مهمة)</div>{picker}</div>}
      <div className="card">
        <div className="ar" style={{ fontWeight: 700 }}>خطة اليوم: {plan.minutes} دقيقة</div>
        <div className="small">أُنجز {done} من {plan.tasks.length} مهام</div>
        <div className="bar"><i style={{ width: (done / plan.tasks.length) * 100 + '%' }} /></div>
      </div>
      {plan.tasks.map((t) => (
        <div className="card" key={t.id}>
          <div className="top">
            <div>
              <div className="ar" style={{ fontWeight: 700 }}>{t.title}</div>
              <div className="small">{t.minutes} دقائق · {t.itemIds.length} {t.kind === 'grammar' ? 'درس' : 'عناصر'}{t.kind === 'speak' ? ' (تدريب ذاتي)' : ''}</div>
            </div>
            <div>{t.status === 'done' ? '✅' : ''}</div>
          </div>
          {!closed && <button className="next" onClick={() => setRunning(t)}>{t.status === 'done' ? 'أعد المحاولة' : 'ابدأ'}</button>}
        </div>
      ))}
      {closed ? (
        <div className="card">
          <b>سُجّلت جلسة اليوم ✅</b>
          <div className="small">{plan.session.tasksDone} من {plan.session.tasksTotal} مهام · {plan.session.minutesDone} من {plan.session.minutesPlanned} دقيقة</div>
        </div>
      ) : (
        <button className="next" disabled={done === 0} onClick={onClose}>أنهِ جلسة اليوم</button>
      )}
    </div>
  );
}
