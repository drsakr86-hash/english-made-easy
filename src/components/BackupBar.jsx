import { useRef, useState } from 'react';
import { exportBackup, importBackup } from '../storage/backup.js';

export default function BackupBar({ backend }) {
  const fileRef = useRef(null);
  const [msg, setMsg] = useState('');
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
  return (
    <div className="foot">
      <div className="row">
        <button className="btn" onClick={download}>تصدير نسخة احتياطية</button>
        <button className="btn" onClick={() => fileRef.current.click()}>استعادة من ملف</button>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={restore} />
      </div>
      {msg && <div className="small">{msg}</div>}
    </div>
  );
}
