import { useState } from 'react';
import { questions, passages, LEVELS } from '../data/placement/questions.js';
import { levelLabel } from '../modules/levels.js';
import { buildSession, evaluate, levelPassed, shouldStop, canRetake, canRetakeAt } from '../engines/placement/placement.js';

const SKILL = { vocabulary: 'مفردات', grammar: 'قواعد', reading: 'قراءة' };
const fmt = (d) => d.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });

function Disclaimer() {
  return <div className="small">النتيجة تقديرية لمساعدتك على اختيار نقطة البداية، وليست شهادة رسمية.</div>;
}

function Result({ result }) {
  return (
    <div>
      <div className="card score">
        مستواك التقديري<div style={{ fontSize: 28, fontWeight: 700, direction: 'ltr' }}>{result.level}</div>
        <div className="small">{levelLabel(result.level)}</div>
      </div>
      <div className="card">
        {LEVELS.map((l) => {
          const r = result.perLevel[l];
          return (
            <div key={l} className="top">
              <span style={{ direction: 'ltr' }}>{l}</span>
              <span className="small">{r.answered === 0 ? 'لم يُعرض' : `${r.correct} من ${r.total}`} {r.passed ? '✅' : ''}</span>
            </div>
          );
        })}
      </div>
      <div className="card small">
        {Object.entries(result.perSkill).map(([k, v]) => <div key={k}>{SKILL[k]}: {v.correct} من {v.answered}</div>)}
      </div>
      <Disclaimer />
    </div>
  );
}

function Runner({ onDone }) {
  const [session] = useState(() => buildSession(questions));
  const [li, setLi] = useState(0);
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [levelResults, setLevelResults] = useState([]);
  const lv = session[li];
  const q = lv.questions[qi];
  const total = questions.length;

  const pick = (i) => {
    const a = { id: q.id, level: q.level, skill: q.skill, ok: i === q.answer };
    const nextAnswers = [...answers, a];
    setAnswers(nextAnswers);
    if (qi + 1 < lv.questions.length) return setQi(qi + 1);
    // انتهى المستوى
    const mine = nextAnswers.filter((x) => x.level === lv.level);
    const correct = mine.filter((x) => x.ok).length;
    const results = [...levelResults, { level: lv.level, passed: levelPassed(correct, lv.questions.length) }];
    setLevelResults(results);
    if (li + 1 >= session.length || shouldStop(results)) return onDone(evaluate(nextAnswers, questions));
    setLi(li + 1);
    setQi(0);
  };

  return (
    <div className="card">
      <div className="small">سؤال {answers.length + 1} (حتى {total} كحد أقصى)</div>
      {q.passage && <div className="rule" style={{ direction: 'ltr', textAlign: 'left' }}>{passages[q.passage].text}</div>}
      <div className="en" style={{ marginTop: 8 }}>{q.q}</div>
      {q.options.map((o, i) => (
        <button key={q.id + i} className="opt en2" onClick={() => pick(i)}>{o}</button>
      ))}
    </div>
  );
}

export default function PlacementSection({ latest, onFinish }) {
  const [state, setState] = useState('home');
  const [result, setResult] = useState(null);
  const [now] = useState(() => new Date());

  if (state === 'run') {
    return <Runner onDone={(r) => { const full = { ...r, at: new Date().toISOString() }; setResult(full); onFinish(full); setState('result'); }} />;
  }
  if (state === 'result' && result) {
    return (
      <div>
        <Result result={result} />
        <button className="next" onClick={() => setState('home')}>رجوع</button>
      </div>
    );
  }
  const allowed = canRetake(latest, now);
  return (
    <div>
      <div className="card">
        <div className="ar" style={{ fontWeight: 700 }}>اختبار تحديد المستوى</div>
        <div className="small" style={{ marginTop: 6 }}>
          أسئلة مفردات وقواعد وقراءة تبدأ سهلة وتصعد تدريجياً، ويتوقف الاختبار تلقائياً إذا صعبت عليك مستويان متتاليان. لا يظهر تصحيح أثناء الاختبار، ويستغرق نحو 10 دقائق. لا يوجد استماع في هذه النسخة.
        </div>
        <Disclaimer />
        {latest && <div style={{ marginTop: 8 }}>آخر نتيجة: <b style={{ direction: 'ltr', display: 'inline-block' }}>{latest.level}</b> — {fmt(new Date(latest.at))}</div>}
        {allowed ? (
          <button className="next" onClick={() => setState('run')}>{latest ? 'إعادة الاختبار' : 'ابدأ الاختبار'}</button>
        ) : (
          <div className="notice">يمكنك إعادة الاختبار بعد {fmt(canRetakeAt(latest))} حتى تعكس النتيجة تقدمك فعلاً.</div>
        )}
      </div>
      {latest && <Result result={latest} />}
    </div>
  );
}
