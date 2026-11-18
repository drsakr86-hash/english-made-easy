import { useState } from 'react';
import Quiz from './Quiz.jsx';

const lessonQuiz = (lesson) => lesson.questions.map((x) => ({ q: x.q, enQ: true, opts: x.options, a: x.answer, enOpts: true }));

/** قائمة مفردات الدرس مع زر حفظ في المراجعة. onSave يرجع الحالة: added | already */
export function VocabList({ vocab, onSave }) {
  const [state, setState] = useState({});
  return (
    <div className="card">
      <div style={{ fontWeight: 700 }}>كلمات الدرس</div>
      {vocab.map((v) => (
        <div key={v.en} style={{ marginTop: 10 }}>
          <div className="top">
            <div><span className="en" style={{ fontSize: 16 }}>{v.en}</span><div className="ar">{v.ar}</div></div>
            <button className="btn" style={{ flex: 'none' }} disabled={!!state[v.en]} onClick={() => setState((s) => ({ ...s, [v.en]: onSave(v) }))}>
              {state[v.en] === 'added' ? 'حُفظت ✅' : state[v.en] === 'already' ? 'موجودة في المراجعة' : 'احفظ للمراجعة'}
            </button>
          </div>
          <div className="ex">{v.ex}</div>
        </div>
      ))}
    </div>
  );
}

export function LessonList({ lessons, stats, onOpen, unit }) {
  return (
    <div>
      {lessons.map((l) => {
        const st = stats[l.id];
        return (
          <div className="card" key={l.id}>
            <div className="top">
              <div>
                <div className="en" style={{ fontSize: 17 }}>{l.title}<span className="lvl">{l.level}</span></div>
                <div className="ar">{l.titleAr}</div>
                <div className="small">{st ? `أفضل نتيجة: ${st.best} من ${st.bestTotal} · محاولات: ${st.attempts}` : `لم تبدأ هذا ${unit} بعد`}</div>
              </div>
            </div>
            <button className="next" onClick={() => onOpen(l)}>{st ? 'افتح مرة أخرى' : 'ابدأ'}</button>
          </div>
        );
      })}
    </div>
  );
}

export function LessonQuiz({ lesson, onFinish }) {
  return <Quiz qs={lessonQuiz(lesson)} resultNote={(s, t) => (s === t ? 'ممتاز!' : 'راجع النص ثم أعد المحاولة لتحسين نتيجتك.')} onFinish={onFinish} />;
}
