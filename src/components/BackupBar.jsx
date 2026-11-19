import { useRef, useState } from 'react';
import { exportBackup, importBackup, planImport } from '../storage/backup.js';
import { importLegacyDump } from '../storage/migration.js';
import * as content from '../data/legacy-content/index.js';

const NAMES = { words: 'كلمات', expressions: 'تعبيرات', idioms: 'مصطلحات', grammar: 'دروس' };

export default function BackupBar({ backend }) {
  const fileRef = useRef(null);
  const [msg, setMsg] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [text, setText] = useState('');
  const [pending, setPending] = useState(null); // ملف تم التحقق منه وينتظر اختيار الدمج أو الاستعادة الكاملة
  const download = () => {
    const blob = new Blob([exportBackup(backend)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'english-made-easy-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const restore = async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const fileText = await f.text();
    const merge = planImport(backend, fileText, 'merge');
    if (!merge.ok) return setMsg('فشلت الاستعادة: ' + merge.reason);
    setMsg('');
    setPending({ fileText, merge, replace: planImport(backend, fileText, 'replace') });
  };
  const runRestore = (mode) => {
    const r = importBackup(backend, pending.fileText, { mode });
    setPending(null);
    if (!r.ok) return setMsg('فشلت الاستعادة: ' + r.reason);
    setMsg(
      (mode === 'merge' ? 'تم الدمج' : 'تمت الاستعادة الكاملة') +
        ` وتم التحقق من البيانات (كُتب ${r.written.length} مفتاح` +
        (r.removed.length ? `، حُذف ${r.removed.length}` : '') +
        (r.kept.length ? `، أُبقي ${r.kept.length} كما هو` : '') +
        '). أعد تحميل الصفحة.',
    );
  };
  const importV1 = () => {
    const r = importLegacyDump(backend, text, content);
    if (!r.ok) return setMsg('فشل الاستيراد: ' + r.reason);
    const added = Object.entries(r.added).map(([k, n]) => `${n} ${NAMES[k]}`).join(' · ');
    const miss = Object.values(r.unmatched).reduce((n, a) => n + a.length, 0);
    setMsg(`تم الاستيراد. أُضيف: ${added}.` + (miss ? ` ${miss} عنصر لم يُطابق وحُفظ للمراجعة.` : '') + ' أعد تحميل الصفحة.');
    setText('');
  };
  return (
    <div className="foot">
      <div className="row">
        <button className="btn" onClick={download}>تصدير نسخة احتياطية</button>
        <button className="btn" onClick={() => fileRef.current.click()}>استعادة من ملف</button>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={restore} />
      </div>
      <div className="row">
        <button className="btn" onClick={() => setShowImport(!showImport)}>استيراد بيانات V1</button>
      </div>
      {showImport && (
        <div className="card">
          <div className="small">في V1 افتح الكونسول ونفّذ <code dir="ltr">copy(JSON.stringify(localStorage))</code> ثم الصق الناتج هنا. يُدمج مع تقدمك الحالي ولا يمسح شيئاً.</div>
          <textarea dir="ltr" rows={4} style={{ width: '100%', marginTop: 8 }} value={text} onChange={(e) => setText(e.target.value)} />
          <button className="next" disabled={!text.trim()} onClick={importV1}>استيراد</button>
        </div>
      )}
      {pending && (
        <div className="card">
          <div className="small">الملف سليم. اختر طريقة الاستعادة (تُحفظ لقطة بما كان لديك قبل التنفيذ، وتتراجع العملية كاملة إن فشلت أي كتابة):</div>
          <div className="small" style={{ marginTop: 8 }}>
            <b>دمج (الأكثر أماناً):</b> يوحّد التقدم دون حذف شيء ويُبقي بياناتك الحالية الأخرى كما هي. سيُكتب {pending.merge.write.length} ويُبقى {pending.merge.kept.length}.
          </div>
          <div className="small" style={{ marginTop: 8 }}>
            <b>استعادة كاملة:</b> تجعل بيانات التطبيق مطابقة للملف. سيُكتب {pending.replace.write.length} ويُحذف {pending.replace.remove.length} من بياناتك الحالية غير الموجودة في الملف (بيانات V1 ونسخها لا تُحذف).
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn" onClick={() => runRestore('merge')}>دمج</button>
            <button className="btn" onClick={() => runRestore('replace')}>استعادة كاملة</button>
            <button className="btn" onClick={() => setPending(null)}>إلغاء</button>
          </div>
        </div>
      )}
      {msg && <div className="small">{msg}</div>}
    </div>
  );
}
