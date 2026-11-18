import { useState } from 'react';
import Quiz from './Quiz.jsx';
import { reviewQuiz } from '../modules/quiz.js';
import { dueItems, nextDueAt, summarize } from '../engines/review/review.js';
import * as content from '../data/legacy-content/index.js';

const fmt = (d) => d.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });

export default function ReviewSection({ records, userwords, onAnswer }) {
  const [qs, setQs] = useState(null);
  const [now, setNow] = useState(() => new Date());
  if (qs) return <Quiz qs={qs} onAnswer={onAnswer} onFinish={() => { setNow(new Date()); setQs(null); }} />;
  const sum = summarize(records, now);
  const due = dueItems(records, now, 10);
  const next = nextDueAt(records, now);
  return (
    <div>
      <div className="card">
        <div className="ar" style={{ fontWeight: 700 }}>مراجعات اليوم: {sum.due}</div>
        <div className="small">عناصر في المراجعة: {sum.total} · متقنة تماماً: {sum.mastered} · صعبة: {sum.hard}</div>
        {sum.total === 0 && <div className="small" style={{ marginTop: 6 }}>تبدأ العناصر بالدخول هنا بعد أن تجيب عنها في أي اختبار.</div>}
        {sum.total > 0 && sum.due === 0 && next && <div className="small" style={{ marginTop: 6 }}>لا مراجعات مستحقة الآن. التالية: {fmt(next)}.</div>}
        {due.length > 0 && (
          <button className="next" onClick={() => setQs(reviewQuiz(due.map((r) => r.itemId), { ...content, userwords }))}>
            ابدأ مراجعة اليوم ({due.length})
          </button>
        )}
      </div>
    </div>
  );
}
