import { useState } from 'react';
import Quiz from './Quiz.jsx';
import { grammarQuiz } from '../modules/quiz.js';

// سلوك V1 محفوظ عمداً: إنهاء التمرين يعلّم الدرس مكتملاً بغض النظر عن النتيجة (الخلل F2 بانتظار قرار).
export default function GrammarSection({ lessons, done, onComplete }) {
  const [open, setOpen] = useState(null);
  const [active, setActive] = useState(null);
  if (active) return <Quiz qs={grammarQuiz(active)} onFinish={() => { onComplete(active.id); setActive(null); }} />;
  return (
    <div>
      <div className="small">أنهيت {done.length} من {lessons.length} درساً</div>
      <div className="bar"><i style={{ width: (done.length / lessons.length) * 100 + '%' }} /></div>
      {lessons.map((l, i) => (
        <div className="card" key={l.id}>
          <div className="top" onClick={() => setOpen(open === i ? null : i)} style={{ cursor: 'pointer' }}>
            <div className="ar" style={{ fontWeight: 700 }}>{l.title}</div>
            <div>{done.includes(l.id) ? '✅' : '›'}</div>
          </div>
          {open === i && (
            <div>
              <div className="rule">{l.rule}</div>
              <button className="next" onClick={() => setActive(l)}>تمرين</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
