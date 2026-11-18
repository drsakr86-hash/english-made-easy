import { useState } from 'react';
import Quiz from './Quiz.jsx';
import { compoundQuiz } from '../modules/quiz.js';

export default function CompoundSection({ items }) {
  const [qs, setQs] = useState(null);
  const [open, setOpen] = useState(false);
  if (qs) return <Quiz qs={qs} onFinish={() => setQs(null)} />;
  return (
    <div>
      <div className="row">
        <button className="btn on" onClick={() => setQs(compoundQuiz(items))}>ابدأ اختباراً</button>
        <button className="btn" onClick={() => setOpen(!open)}>{open ? 'أخفِ الأدوات' : 'أدوات الربط'}</button>
      </div>
      {open && (
        <div className="card rule">
          and: إضافة · but: تناقض · so: نتيجة · because: سبب · or: اختيار · although: رغم أن · however: ومع ذلك · when/while/until: زمن · who/which/where/whose: جمل وصل · if/unless: شرط
        </div>
      )}
      {items.map((x) => (
        <div className="card" key={x.id}>
          <div className="en">{x.en.replace('___', '____')}</div>
          <div className="ar">{x.ar}</div>
          <div className="small">الأداة: <b style={{ direction: 'ltr', display: 'inline-block' }}>{x.options[x.answer]}</b> — {x.note}</div>
        </div>
      ))}
    </div>
  );
}
