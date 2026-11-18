import { useState } from 'react';
import { reading } from '../data/skills/reading.js';
import { speak } from './speech.js';
import { VocabList, LessonList, LessonQuiz } from './SkillParts.jsx';

export default function ReadingSection({ stats, onAttempt, onSaveVocab }) {
  const [open, setOpen] = useState(null);
  const [quiz, setQuiz] = useState(false);
  const [showAr, setShowAr] = useState(false);
  if (!open) return <LessonList lessons={reading} stats={stats} unit="درس" onOpen={(l) => { setOpen(l); setShowAr(false); }} />;
  if (quiz) return <LessonQuiz lesson={open} onFinish={(s, t) => { onAttempt('reading', open.id, s, t); setQuiz(false); }} />;
  return (
    <div>
      <button className="btn" style={{ marginBottom: 8 }} onClick={() => setOpen(null)}>رجوع للدروس</button>
      <div className="card">
        <div className="top">
          <div className="en" style={{ fontSize: 17 }}>{open.title}<span className="lvl">{open.level}</span></div>
          <button className="ic" title="نطق" onClick={() => speak(open.text)}>🔊</button>
        </div>
        <div className="ex" style={{ fontSize: 17, lineHeight: 1.9, color: '#1f2937' }}>{open.text}</div>
        <button className="btn" style={{ marginTop: 8 }} onClick={() => setShowAr(!showAr)}>{showAr ? 'إخفاء الترجمة' : 'إظهار الترجمة'}</button>
        {showAr && <div className="rule">{open.ar}</div>}
      </div>
      <VocabList vocab={open.vocab} onSave={(v) => onSaveVocab(v, open.id)} />
      <button className="next" onClick={() => setQuiz(true)}>أسئلة الفهم</button>
    </div>
  );
}
