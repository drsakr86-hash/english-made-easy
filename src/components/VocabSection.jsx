import { useState } from 'react';
import Quiz from './Quiz.jsx';
import { speak } from './speech.js';
import { vocabQuiz } from '../modules/quiz.js';

export default function VocabSection({ list, known, onToggle }) {
  const [qs, setQs] = useState(null);
  const [filter, setFilter] = useState('all');
  const pct = Math.round((known.length / list.length) * 100);
  if (qs) return <Quiz qs={qs} onFinish={() => setQs(null)} />;
  const shown = list.filter((x) => filter === 'all' || (filter === 'known' ? known.includes(x.id) : !known.includes(x.id)));
  return (
    <div>
      <div className="small">أتقنت {known.length} من {list.length}</div>
      <div className="bar"><i style={{ width: pct + '%' }} /></div>
      <div className="row">
        <button className="btn on" onClick={() => setQs(vocabQuiz(list))}>ابدأ اختباراً</button>
        <button className={'btn' + (filter === 'all' ? ' on' : '')} onClick={() => setFilter('all')}>الكل</button>
        <button className={'btn' + (filter === 'new' ? ' on' : '')} onClick={() => setFilter('new')}>لم أتقنها</button>
      </div>
      {shown.map((it) => (
        <div className="card" key={it.id}>
          <div className="top">
            <div><div className="en">{it.en}</div><div className="ar">{it.ar}</div></div>
            <div>
              <button className="ic" onClick={() => speak(it.en)} title="نطق">🔊</button>{' '}
              <button className="ic" onClick={() => onToggle(it.id)} title="أتقنتها">{known.includes(it.id) ? '✅' : '⬜'}</button>
            </div>
          </div>
          <div className="ex">{it.ex}</div>
          <div className="exar">{it.exAr}</div>
        </div>
      ))}
    </div>
  );
}
