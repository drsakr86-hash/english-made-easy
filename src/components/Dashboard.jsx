import { useState } from 'react';
import { overview } from '../engines/progress/progress.js';
import { summarize } from '../engines/review/review.js';
import { levelLabel } from '../modules/levels.js';
import * as content from '../data/legacy-content/index.js';

const KIND = { answer: 'إجابة في اختبار', mark: 'تعليم عنصر', lesson: 'درس قواعد', placement: 'اختبار تحديد المستوى' };

function itemName(id) {
  if (!id) return '';
  const all = [...content.words, ...content.expressions, ...content.idioms];
  const it = all.find((x) => x.id === id) || content.grammar.find((g) => g.id === id);
  return it ? it.en || it.title : '';
}

export default function Dashboard({ progress, review, activity, placement, onGo }) {
  const [now] = useState(() => new Date()); // يُحسب عند فتح اللوحة
  const o = overview({ progress, content, reviewSummary: summarize(review, now), activity, now });
  const last = o.last
    ? `${new Date(o.last.at).toLocaleString('ar-EG', { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })} — ${KIND[o.last.kind] || 'نشاط'}${o.last.itemId ? ': ' + itemName(o.last.itemId) : ''}`
    : 'لا يوجد نشاط بعد';
  return (
    <div>
      <div className="card">
        <div className="ar" style={{ fontWeight: 700 }}>التقدم العام: {o.overallPct}%</div>
        <div className="bar"><i style={{ width: o.overallPct + '%' }} /></div>
        <div className="small">نسبة ما أتقنته أو أكملته من كلمات وتعبيرات ومصطلحات ودروس قواعد</div>
      </div>
      <div className="card">
        <div>أيام الالتزام المتتالية: <b>{o.streak}</b></div>
        <div className="small">إجمالي أيام التعلم: {o.activeDays}</div>
      </div>
      <div className="card">
        <div>الكلمات المتقنة: <b>{o.done.words}</b> من {o.sizes.words}</div>
        <div>التعبيرات: <b>{o.done.expressions}</b> من {o.sizes.expressions}</div>
        <div>المصطلحات: <b>{o.done.idioms}</b> من {o.sizes.idioms}</div>
        <div>الدروس المكتملة: <b>{o.done.grammar}</b> من {o.sizes.grammar}</div>
      </div>
      <div className="card">
        <div>مراجعات اليوم: <b>{o.dueToday}</b></div>
        <div className="small">عناصر في المراجعة: {o.reviewTracked} · متقنة بالمراجعة: {o.masteredByReview}</div>
        <button className="next" onClick={() => onGo('review')}>{o.dueToday ? 'ابدأ المراجعة' : 'فتح المراجعة'}</button>
      </div>
      <div className="card"><span className="small">آخر نشاط: </span>{last}</div>
      <div className="card">
        <div>مستواك التقديري: <b>{placement ? levelLabel(placement.level) : 'لم يُحدَّد بعد'}</b></div>
        <button className="next" onClick={() => onGo('placement')}>{placement ? 'تفاصيل المستوى' : 'ابدأ اختبار تحديد المستوى'}</button>
      </div>
      <div className="card small">خطة اليوم: قادمة في الدفعة التالية</div>
    </div>
  );
}
