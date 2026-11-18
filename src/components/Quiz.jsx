import { useState } from 'react';

function Options({ opts, answer, onDone, en }) {
  const [pick, setPick] = useState(null);
  return (
    <div>
      {opts.map((o, i) => {
        let c = 'opt' + (en ? ' en2' : '');
        if (pick !== null) {
          if (i === answer) c += ' ok';
          else if (i === pick) c += ' bad';
        }
        return (
          <button key={i} className={c} disabled={pick !== null} onClick={() => { setPick(i); onDone(i === answer); }}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

export default function Quiz({ qs, onFinish, resultNote }) {
  const [i, setI] = useState(0);
  const [s, setS] = useState(0);
  const [ans, setAns] = useState(false);
  if (i >= qs.length)
    return (
      <div className="card score">
        النتيجة: {s} من {qs.length}
        {resultNote && <div className="small" style={{ marginTop: 8 }}>{resultNote(s, qs.length)}</div>}
        <div><button className="next" onClick={() => onFinish(s, qs.length)}>رجوع</button></div>
      </div>
    );
  const q = qs[i];
  return (
    <div className="card">
      <div className="small">سؤال {i + 1} / {qs.length}</div>
      <div className={q.enQ ? 'en' : 'ar'} style={{ marginTop: 6 }}>{q.q}</div>
      {q.sub && <div className="small">{q.sub}</div>}
      <Options key={i} opts={q.opts} answer={q.a} en={q.enOpts} onDone={(ok) => { setAns(true); if (ok) setS(s + 1); }} />
      {ans && q.note && <div className="rule">{q.note}</div>}
      {ans && <button className="next" onClick={() => { setI(i + 1); setAns(false); }}>{i + 1 === qs.length ? 'إنهاء' : 'التالي'}</button>}
    </div>
  );
}
