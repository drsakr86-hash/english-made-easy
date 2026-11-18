import { useState } from 'react';
import { writing } from '../data/skills/writing.js';
import { checkFixed, checkFree } from '../engines/skills/skills.js';
import { errorText } from '../engines/ai/client.js';
import { LEVELS, LIMITS } from '../engines/ai/prompts.js';

const KIND = { build: 'تكوين جملة', fix: 'تصحيح جملة', answer: 'الإجابة عن سؤال', paragraph: 'كتابة فقرة', situation: 'وصف موقف', message: 'رسالة يومية' };
const label = (t) => KIND[t.type === 'free' ? t.kind : t.type];

function Build({ task, onResult }) {
  const [picked, setPicked] = useState([]);
  const [res, setRes] = useState(null);
  const left = task.words.map((w, i) => ({ w, i })).filter((x) => !picked.includes(x.i));
  const text = picked.map((i) => task.words[i]).join(' ');
  return (
    <div className="card">
      <div className="small">{task.prompt}</div>
      <div className="ex" style={{ minHeight: 28, fontSize: 17 }}>{text || '…'}</div>
      <div>{left.map((x) => <button key={x.i} className="chip" disabled={!!res} onClick={() => setPicked([...picked, x.i])}>{x.w}</button>)}</div>
      {!res && (
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn" onClick={() => setPicked([])}>مسح</button>
          <button className="btn on" disabled={picked.length !== task.words.length} onClick={() => { const r = checkFixed(task, text); setRes(r); onResult(task.id, r.correct); }}>تحقق</button>
        </div>
      )}
      {res && <div className="rule">{res.correct ? <b className="okc">صحيح ✅</b> : <b className="badc">غير صحيح</b>}<div className="ex">الجملة الصحيحة: {res.expected}</div></div>}
    </div>
  );
}

function Fix({ task, onResult }) {
  const [text, setText] = useState(task.text);
  const [res, setRes] = useState(null);
  return (
    <div className="card">
      <div className="small">{task.prompt}</div>
      <input className="inp" value={text} onChange={(e) => setText(e.target.value)} disabled={!!res} />
      {!res && <button className="next" onClick={() => { const r = checkFixed(task, text); setRes(r); onResult(task.id, r.correct); }}>تحقق</button>}
      {res && (
        <div className="rule">
          {res.correct ? <b className="okc">صحيح ✅</b> : <b className="badc">غير صحيح</b>}
          <div className="ex">كتبتَ: {text}</div>
          <div className="ex">الصحيح: {res.expected}</div>
        </div>
      )}
    </div>
  );
}

function AiReview({ text, getClient, level }) {
  const [state, setState] = useState(null); // null | 'busy' | {error} | {reply, corrections}
  const client = getClient();
  const tooLong = text.length > LIMITS.maxChars;
  const run = async () => {
    setState('busy');
    const out = await client.chat({ level: LEVELS.includes(level) ? level : 'A2', mode: 'writing', messages: [{ role: 'user', content: text.trim() }] });
    setState(out.ok ? { reply: out.reply, corrections: out.corrections } : { error: out.error });
  };
  return (
    <div style={{ marginTop: 8 }}>
      <button className="btn" disabled={!text.trim() || tooLong || state === 'busy' || !client.configured} onClick={run}>
        {state === 'busy' ? 'جارٍ التصحيح…' : 'صحّح بالمدرس الذكي'}
      </button>
      {!client.configured && <div className="small">يحتاج المدرس الذكي (يُفعَّل من تبويب المدرس). الفحص الآلي أعلاه يعمل دونه.</div>}
      {tooLong && <div className="small badc">النص أطول من {LIMITS.maxChars} حرفاً: قسّمه إلى أجزاء للتصحيح.</div>}
      {state && state.error && <div className="notice">{errorText(state.error)}</div>}
      {state && state.reply !== undefined && (
        <div className="rule">
          <div className="ex">{state.reply}</div>
          {state.corrections.length === 0 && <div className="okc">لم يجد المدرس أخطاء واضحة ✅</div>}
          {state.corrections.map((c, i) => (
            <div key={i} style={{ marginTop: 6 }}>
              <div className="ex"><span className="badc">✗</span> {c.original}</div>
              <div className="ex"><span className="okc">✓</span> {c.corrected}</div>
              {c.explanation && <div>{c.explanation}</div>}
            </div>
          ))}
          <div className="small" style={{ marginTop: 6 }}>التصحيح آلي وتقديري وقد يخطئ، فراجعه بنفسك.</div>
        </div>
      )}
    </div>
  );
}

function Free({ task, onSave, saved, getClient, level }) {
  const [text, setText] = useState('');
  const [checks, setChecks] = useState(null);
  return (
    <div className="card">
      <div className="small">{task.prompt}</div>
      <textarea className="inp" value={text} onChange={(e) => { setText(e.target.value); setChecks(null); }} placeholder="Write here…" />
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn" disabled={!text.trim()} onClick={() => setChecks(checkFree(task, text))}>فحص آلي</button>
        <button className="btn on" disabled={!text.trim()} onClick={() => { onSave(task.id, text, checks || checkFree(task, text)); setText(''); setChecks(null); }}>احفظ كتابتي</button>
      </div>
      <AiReview key={text} text={text} getClient={getClient} level={level} />
      {checks && (
        <div className="rule">
          <div className="small">فحص آلي تقريبي للشكل فقط (الطول والحروف والترقيم والكلمات المطلوبة). لا يقيّم صحة القواعد ولا جودة المعنى.</div>
          {checks.map((c) => <div key={c.id}>{c.ok ? '✅' : '⬜'} {c.label}</div>)}
        </div>
      )}
      {saved.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div className="small">كتاباتك السابقة لهذه المهمة (محفوظة كما كتبتها):</div>
          {saved.map((s) => <div key={s.id} className="ex">{new Date(s.createdAt).toLocaleDateString('ar-EG')} — {s.text}</div>)}
        </div>
      )}
    </div>
  );
}

export default function WritingSection({ skills, onFixedResult, onSave, getClient, level }) {
  const [open, setOpen] = useState(null);
  const [mine, setMine] = useState(false);
  if (mine) {
    return (
      <div>
        <button className="btn" style={{ marginBottom: 8 }} onClick={() => setMine(false)}>رجوع للمهام</button>
        {skills.submissions.length === 0 && <div className="card small">لم تحفظ أي كتابة بعد.</div>}
        {[...skills.submissions].reverse().map((s) => <div key={s.id} className="card"><div className="small">{new Date(s.createdAt).toLocaleString('ar-EG')}</div><div className="ex">{s.text}</div></div>)}
      </div>
    );
  }
  if (open) {
    return (
      <div>
        <button className="btn" style={{ marginBottom: 8 }} onClick={() => setOpen(null)}>رجوع للمهام</button>
        {open.type === 'build' && <Build key={open.id} task={open} onResult={onFixedResult} />}
        {open.type === 'fix' && <Fix key={open.id} task={open} onResult={onFixedResult} />}
        {open.type === 'free' && <Free key={open.id} task={open} onSave={onSave} saved={skills.submissions.filter((s) => s.taskId === open.id)} getClient={getClient} level={level} />}
      </div>
    );
  }
  return (
    <div>
      <button className="btn" style={{ marginBottom: 8 }} onClick={() => setMine(true)}>كتاباتي ({skills.submissions.length})</button>
      {writing.map((t) => {
        const st = skills.writing[t.id];
        const n = skills.submissions.filter((s) => s.taskId === t.id).length;
        return (
          <div className="card" key={t.id}>
            <div className="top"><div><b>{label(t)}</b><span className="lvl">{t.level}</span><div className="small">{t.type === 'free' ? `محفوظ: ${n}` : st ? `صحيح ${st.correct} من ${st.attempts} محاولات` : 'لم تبدأ'}</div></div></div>
            <button className="next" onClick={() => setOpen(t)}>افتح</button>
          </div>
        );
      })}
    </div>
  );
}
