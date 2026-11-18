import { useState } from 'react';
import ReadingSection from './ReadingSection.jsx';
import ListeningSection from './ListeningSection.jsx';
import WritingSection from './WritingSection.jsx';

const SUB = [['reading', 'قراءة'], ['listening', 'استماع'], ['writing', 'كتابة']];

export default function SkillsSection({ skills, onAttempt, onSaveVocab, onFixedResult, onSaveWriting }) {
  const [sub, setSub] = useState('reading');
  return (
    <div>
      <div className="row">{SUB.map(([k, l]) => <button key={k} className={'btn' + (sub === k ? ' on' : '')} onClick={() => setSub(k)}>{l}</button>)}</div>
      {sub === 'reading' && <ReadingSection stats={skills.reading} onAttempt={onAttempt} onSaveVocab={onSaveVocab} />}
      {sub === 'listening' && <ListeningSection stats={skills.listening} onAttempt={onAttempt} onSaveVocab={onSaveVocab} />}
      {sub === 'writing' && <WritingSection skills={skills} onFixedResult={onFixedResult} onSave={onSaveWriting} />}
    </div>
  );
}
