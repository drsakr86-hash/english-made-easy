import { useEffect, useRef, useState } from 'react';
import { listening } from '../data/skills/listening.js';
import { canSpeak, speakLines } from './speech.js';
import { VocabList, LessonList, LessonQuiz } from './SkillParts.jsx';

const STEPS = [
  { title: '1) استمع دون نص', text: false },
  { title: '2) استمع مع النص', text: true },
  { title: '3) استمع مرة أخرى دون نص', text: false },
  { title: '4) اختبار الفهم', quiz: true },
  { title: '5) احفظ الكلمات الجديدة', vocab: true },
];

export default function ListeningSection({ stats, onAttempt, onSaveVocab }) {
  const [open, setOpen] = useState(null);
  const [step, setStep] = useState(0);
  const [rate, setRate] = useState(0.85);
  const [playing, setPlaying] = useState(false);
  const stopRef = useRef(null);
  const supported = canSpeak();
  const stop = () => { if (stopRef.current) stopRef.current(); stopRef.current = null; setPlaying(false); };
  useEffect(() => () => { if (stopRef.current) stopRef.current(); }, []);

  if (!open) return <LessonList lessons={listening} stats={stats} unit="درس" onOpen={(l) => { setOpen(l); setStep(0); }} />;
  const S = STEPS[step];
  const go = (n) => { stop(); setStep(n); };
  const play = () => {
    stop();
    setPlaying(true);
    stopRef.current = speakLines(open.lines, rate, () => setPlaying(false));
  };
  return (
    <div>
      <button className="btn" style={{ marginBottom: 8 }} onClick={() => { stop(); setOpen(null); }}>رجوع للدروس</button>
      <div className="card">
        <div className="en" style={{ fontSize: 17 }}>{open.title}<span className="lvl">{open.level}</span></div>
        <div className="ar">{open.titleAr}</div>
        <div className="small" style={{ marginTop: 6 }}>{S.title}</div>
      </div>
      {!S.quiz && !S.vocab && (
        <div className="card">
          {supported ? (
            <div>
              <div className="row">
                <button className="btn on" onClick={play}>{playing ? '⏵ إعادة التشغيل' : '▶ تشغيل'}</button>
                <button className="btn" onClick={stop} disabled={!playing}>⏹ إيقاف</button>
              </div>
              <div className="row">
                {[0.7, 0.85, 1].map((r) => <button key={r} className={'btn' + (rate === r ? ' on' : '')} onClick={() => setRate(r)}>{r === 0.7 ? 'بطيء' : r === 0.85 ? 'عادي' : 'سريع'}</button>)}
              </div>
              <div className="small">الصوت من مشغّل الصوت في متصفحك، وجودته تختلف من جهاز لآخر.</div>
            </div>
          ) : (
            <div className="notice">متصفحك لا يدعم تشغيل الصوت. اقرأ النص أدناه ثم أكمل الاختبار.</div>
          )}
          {(S.text || !supported) && (
            <div style={{ marginTop: 8 }}>
              {open.lines.map(([sp, t], i) => <div key={i} className="ex"><b>{sp}:</b> {t}</div>)}
            </div>
          )}
        </div>
      )}
      {S.quiz && <LessonQuiz lesson={open} onFinish={(s, t) => { onAttempt('listening', open.id, s, t); go(4); }} />}
      {S.vocab && <VocabList vocab={open.vocab} onSave={(v) => onSaveVocab(v, open.id)} />}
      {!S.quiz && step < 4 && <button className="next" onClick={() => go(step + 1)}>التالي</button>}
      {S.vocab && <button className="next" onClick={() => { stop(); setOpen(null); }}>إنهاء الدرس</button>}
    </div>
  );
}
