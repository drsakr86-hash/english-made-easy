import { useRef, useState } from 'react';
import { exportBackup, importBackup } from '../storage/backup.js';
import { importLegacyDump } from '../storage/migration.js';
import * as content from '../data/legacy-content/index.js';

const NAMES = { words: 'كلمات', expressions: 'تعبيرات', idioms: 'مصطلحات', grammar: 'دروس' };

export default function BackupBar({ backend }) {
  const fileRef = useRef(null);
  const [msg, setMsg] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [text, setText] = useState('');
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
    if (!f) return;
    const r = importBackup(backend, await f.text());
    setMsg(r.ok ? 'تمت الاستعادة، أعد تحميل الصفحة.' : 'فشلت الاستعادة: ' + r.reason);
    e.target.value = '';
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
      {msg && <div className="small">{msg}</div>}
    </div>
  );
}
