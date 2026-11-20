import { useMemo, useState } from 'react';
import { KINDS, SECTION_LABELS, VOCAB_SECTIONS, buildWorksheet, pickItems, seededRng } from '../modules/worksheet.js';

const SECTIONS = ['words', 'expressions', 'idioms', 'grammar', 'basics', 'compound'];
const COUNTS = [10, 20, 30, 0];
const isLessons = (s) => s === 'grammar' || s === 'basics';
const LETTERS = ['a', 'b', 'c', 'd', 'e'];

function Lines({ n = 1 }) {
  return Array.from({ length: n }, (_, i) => <div className="wline" key={i} />);
}

function Sheet({ ws, showRule }) {
  return (
    <div>
      <div className="ws-meta">
        <span>الاسم: ................................</span>
        <span>التاريخ: ................</span>
        {ws.kind !== 'study' && <span>الدرجة: ...... / {ws.answers.length}</span>}
      </div>
      <div className="ws-title">{ws.title}</div>
      <div className="small">{ws.intro}</div>
      {ws.bank && ws.bank.length > 0 && <div className="ws-bank">{ws.bank.map((w) => <span key={w}>{w}</span>)}</div>}
      {ws.kind === 'study' && ws.rows.map((r, i) => (
        <div className="ws-q" key={i}>
          <div className="ws-study"><b dir="ltr">{r.en}</b><span>{r.ar}</span></div>
          <div className="ws-ex" dir="ltr">{r.ex}</div>
          <div className="small">{r.exAr}</div>
        </div>
      ))}
      {(ws.kind === 'en2ar' || ws.kind === 'ar2en' || ws.kind === 'fill') && ws.rows.map((r) => (
        <div className="ws-q" key={r.n}>
          <div className="ws-prompt" dir={r.dir}><b>{r.n}.</b> {r.prompt}</div>
          <Lines n={ws.kind === 'fill' ? 0 : 1} />
        </div>
      ))}
      {ws.kind === 'choose' && ws.rows.map((r) => (
        <div className="ws-q" key={r.n}>
          <div className="ws-prompt" dir="ltr"><b>{r.n}.</b> {r.prompt}</div>
          <div className="small">{r.sub}</div>
          <div className="ws-opts" dir="ltr">{r.options.map((o, i) => <span key={o}>{LETTERS[i]}) {o}</span>)}</div>
        </div>
      ))}
      {ws.kind === 'write' && ws.rows.map((r) => (
        <div className="ws-q" key={r.n}>
          <div className="ws-prompt" dir="ltr"><b>{r.n}.</b> {r.prompt}</div>
          <div className="small">{r.sub}</div>
        </div>
      ))}
      {ws.kind === 'quiz' && ws.rows.map((l) => (
        <div key={l.lesson}>
          <div className="ws-lesson">{l.lesson}</div>
          {showRule && <div className="ws-rule">{l.rule}</div>}
          {l.qs.map((q) => (
            <div className="ws-q" key={q.n}>
              <div className="ws-prompt" dir="ltr"><b>{q.n}.</b> {q.prompt}</div>
              <div className="ws-opts" dir="ltr">{q.options.map((o, i) => <span key={o}>{LETTERS[i]}) {o}</span>)}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function AnswerKey({ ws }) {
  return (
    <div className="ws-key">
      <div className="ws-title">ورقة الإجابات — {ws.title}</div>
      <div className="ws-answers" dir="ltr">
        {ws.answers.map((a) => <span key={a.n} dir="auto"><b>{a.n}.</b> {a.text}</span>)}
      </div>
    </div>
  );
}

export default function PrintSection({ content, progress }) {
  const [section, setSection] = useState('words');
  const [kinds, setKinds] = useState({});
  const [count, setCount] = useState(20);
  const [onlyNew, setOnlyNew] = useState(false);
  const [random, setRandom] = useState(true);
  const [seed, setSeed] = useState(1);
  const [withKey, setWithKey] = useState(true);
  const [showRule, setShowRule] = useState(true);
  const [picked, setPicked] = useState({}); // لكل وحدة قواعد: مصفوفة معرّفات (غير معرَّف = الكل)

  const kind = kinds[section] || KINDS[section][0][0];
  const list = content[section];
  const lessonIds = isLessons(section) ? (picked[section] || list.map((l) => l.id)) : [];

  const ws = useMemo(() => {
    const rng = seededRng(seed);
    const items = isLessons(section)
      ? list.filter((l) => lessonIds.includes(l.id))
      : pickItems(list, { onlyNew: onlyNew && VOCAB_SECTIONS.includes(section), known: progress[section] || [], count, random }, rng);
    return buildWorksheet({ section, kind, items, rng });
    // lessonIds يتغير مرجعه كل رسم؛ المفتاح النصي يكفي
    // eslint-disable-next-line
  }, [section, kind, count, onlyNew, random, seed, list, progress, lessonIds.join(',')]);

  const empty = ws.rows.length === 0;
  const toggleLesson = (id) => {
    const next = lessonIds.includes(id) ? lessonIds.filter((x) => x !== id) : [...lessonIds, id];
    setPicked({ ...picked, [section]: next });
  };

  return (
    <div>
      <div className="noprint">
        <div className="small">اختر الوحدة ونوع الورقة، ثم اضغط طباعة (ومن الطباعة يمكنك اختيار «حفظ كـ PDF»).</div>
        <div className="lbl">الوحدة</div>
        <div className="wrap">
          {SECTIONS.map((s) => <button key={s} className={'pill' + (section === s ? ' on' : '')} onClick={() => setSection(s)}>{SECTION_LABELS[s]}</button>)}
        </div>
        <div className="lbl">نوع الورقة</div>
        <div className="wrap">
          {KINDS[section].map(([k, label]) => <button key={k} className={'pill' + (kind === k ? ' on' : '')} onClick={() => setKinds({ ...kinds, [section]: k })}>{label}</button>)}
        </div>
        {!isLessons(section) && (
          <>
            <div className="lbl">عدد الأسئلة</div>
            <div className="wrap">
              {COUNTS.map((c) => <button key={c} className={'pill' + (count === c ? ' on' : '')} onClick={() => setCount(c)}>{c === 0 ? 'الكل' : c}</button>)}
            </div>
            <label className="small"><input type="checkbox" checked={random} onChange={(e) => setRandom(e.target.checked)} /> ترتيب عشوائي</label>
            {VOCAB_SECTIONS.includes(section) && (
              <div><label className="small"><input type="checkbox" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} /> العناصر التي لم أتقنها فقط</label></div>
            )}
            {random && <div><button className="pill" style={{ marginTop: 6 }} onClick={() => setSeed(seed + 1)}>🔀 ورقة جديدة</button></div>}
          </>
        )}
        {isLessons(section) && (
          <>
            <div className="lbl">الدروس</div>
            <div className="row" style={{ marginBottom: 4 }}>
              <button className="pill" onClick={() => setPicked({ ...picked, [section]: list.map((l) => l.id) })}>الكل</button>
              <button className="pill" onClick={() => setPicked({ ...picked, [section]: [] })}>إلغاء الكل</button>
            </div>
            {list.map((l) => (
              <div key={l.id}><label className="small"><input type="checkbox" checked={lessonIds.includes(l.id)} onChange={() => toggleLesson(l.id)} /> {l.title}</label></div>
            ))}
            <div style={{ marginTop: 6 }}><label className="small"><input type="checkbox" checked={showRule} onChange={(e) => setShowRule(e.target.checked)} /> اكتب شرح القاعدة فوق الأسئلة</label></div>
          </>
        )}
        {ws.answers.length > 0 && <div><label className="small"><input type="checkbox" checked={withKey} onChange={(e) => setWithKey(e.target.checked)} /> ورقة الإجابات في صفحة منفصلة</label></div>}
        {ws.skipped > 0 && <div className="notice">{ws.skipped} من العناصر لا تظهر كلمتها داخل جملة المثال فتم استبعادها من هذا النوع.</div>}
        <button className="next" disabled={empty} onClick={() => window.print()}>🖨️ طباعة / حفظ PDF</button>
        <div className="lbl" style={{ marginTop: 12 }}>معاينة الورقة</div>
      </div>
      {empty ? (
        <div className="notice noprint">لا توجد عناصر لهذه الورقة. غيّر الاختيارات.</div>
      ) : (
        <div className="ws card">
          <Sheet ws={ws} showRule={showRule} />
          {withKey && ws.answers.length > 0 && <AnswerKey ws={ws} />}
        </div>
      )}
    </div>
  );
}
