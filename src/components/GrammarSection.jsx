import { useState } from 'react';
import Quiz from './Quiz.jsx';
import { grammarQuiz, passed } from '../modules/quiz.js';

// إصلاح F2: لا يكتمل الدرس إلا بنتيجة 60% فأكثر (V1 كان يكمله دائماً).
export default function GrammarSection({ lessons, done, onComplete, onResult }) {
  const [open, setOpen] = useState(null);
  const [active, setActive] = useState(null);
  if (active)
    return (
      <Quiz
        qs={grammarQuiz(active)}
        resultNote={(s, t) => (passed(s, t) ? 'أحسنت، اكتمل الدرس ✅' : 'تحتاج 60% على الأقل لإكمال الدرس. أعد المحاولة.')}
        onFinish={(s, t) => { if (onResult) onResult(active.id, passed(s, t)); if (passed(s, t)) onComplete(active.id); setActive(null); }}
      />
    );
  return (
    <div>
      <div className="small">أنهيت {done.length} من {lessons.length} درساً</div>
      <div className="bar"><i style={{ width: (done.length / lessons.length) * 100 + '%' }} /></div>
      {lessons.map((l, i) => (
        <div className={'card lesson' + (done.includes(l.id) ? ' known' : '')} key={l.id}>
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
