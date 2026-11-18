import { useMemo, useState } from 'react';
import { indicators, weeklyReport, learningLog } from '../engines/progress/intelligence.js';

const pct = (v) => (v === null || v === undefined ? 'لا بيانات بعد' : Math.round(v * 100) + '%');
const IND = [['vocabMastery', 'إتقان المفردات'], ['grammarMastery', 'إتقان القواعد'], ['reading', 'القراءة'], ['listening', 'الاستماع'], ['speaking', 'ممارسة النطق'], ['writing', 'جودة الكتابة'], ['consistency', 'الالتزام اليومي']];

export function AdviceList({ advice, onGo }) {
  if (!advice.length) return <div className="card small">لا توصيات الآن. استمر على خطتك.</div>;
  return (
    <div>
      {advice.map((a) => (
        <div className="card" key={a.id}>
          <div style={{ fontWeight: 700 }}>{a.text}</div>
          <div className="small">لأن: {a.reason}</div>
          <button className="btn" style={{ marginTop: 8 }} onClick={() => onGo(a.tab)}>انتقل</button>
        </div>
      ))}
    </div>
  );
}

export default function ReportSection({ getIntel, onGo }) {
  const [sub, setSub] = useState('week');
  const data = useMemo(() => getIntel(), [getIntel]);
  const ind = useMemo(() => indicators(data), [data]);
  const rep = useMemo(() => weeklyReport(data), [data]);
  const log = useMemo(() => learningLog(data), [data]);
  return (
    <div>
      <div className="row">
        {[['week', 'أسبوعي'], ['ind', 'المؤشرات'], ['advice', 'توصيات'], ['log', 'السجل']].map(([k, l]) => <button key={k} className={'btn' + (sub === k ? ' on' : '')} onClick={() => setSub(k)}>{l}</button>)}
      </div>
      {sub === 'week' && (
        <div>
          <div className="card">
            <div style={{ fontWeight: 700 }}>آخر 7 أيام</div>
            <div>أيام التعلم: <b>{rep.learningDays}</b> من 7</div>
            <div>جلسات مسجلة: <b>{rep.sessionsClosed}</b> · الوقت الإجمالي: <b>{rep.totalMinutes}</b> دقيقة</div>
            <div>كلمات جديدة: <b>{rep.newWords}</b> · مراجعات مستحقة الآن: <b>{rep.dueNow}</b></div>
            <div>محادثات المدرس: <b>{rep.tutorConversations}</b> · تصحيحات: <b>{rep.tutorCorrections}</b></div>
          </div>
          <div className="card">
            <div style={{ fontWeight: 700 }}>أكثر الأخطاء تكراراً</div>
            {rep.frequentErrors.length === 0 ? <div className="small">لا أخطاء مسجلة هذا الأسبوع.</div> : rep.frequentErrors.map((e) => <div key={e.id} className="ex">{e.name} — {e.count} مرات</div>)}
          </div>
          <div className="card">
            {rep.best ? (
              <div>
                <div>أفضل مهارة: <b>{rep.best.label}</b> ({pct(rep.best.ratio)})</div>
                <div>المهارة الأضعف: <b>{rep.weakest.label}</b> ({pct(rep.weakest.ratio)})</div>
              </div>
            ) : <div className="small">لا بيانات كافية لتحديد الأفضل والأضعف (يلزم 3 محاولات على الأقل في مهارتين).</div>}
          </div>
          <div style={{ fontWeight: 700, margin: '8px 0' }}>توصيات الأسبوع التالي</div>
          <AdviceList advice={rep.recommendations.slice(0, 4)} onGo={onGo} />
        </div>
      )}
      {sub === 'ind' && (
        <div>
          <div className="notice">إكمال الدرس وحده لا يُحسب إتقاناً. المؤشرات أدناه تُحسب من إجاباتك الفعلية وتتحسن مع الاستخدام.</div>
          {IND.map(([k, l]) => (
            <div className="card" key={k}>
              <div className="top"><b>{l}</b><b>{k === 'speaking' ? (ind[k].sessions ? ind[k].sessions + ' جلسة' : 'لا بيانات بعد') : pct(ind[k].value)}</b></div>
              <div className="small">{ind[k].detail}</div>
            </div>
          ))}
        </div>
      )}
      {sub === 'advice' && <AdviceList advice={rep.recommendations} onGo={onGo} />}
      {sub === 'log' && (
        <div>
          {log.length === 0 && <div className="card small">لا نشاط مسجل بعد.</div>}
          {log.map((x) => (
            <div className="card" key={x.key}>
              <b>{x.label}</b> <span className="small">{x.detail}</span>
              <div className="small">{new Date(x.at).toLocaleString('ar-EG', { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
