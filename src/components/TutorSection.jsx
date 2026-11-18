import { useMemo, useRef, useState } from 'react';
import { scenarios, topics } from '../data/tutor/scenarios.js';
import { LEVELS } from '../engines/ai/prompts.js';
import { createTutorClient, errorText, validEndpoint, DEFAULT_ENDPOINT } from '../engines/ai/client.js';
import { addAssistant, addUser, bumpUsage, canSend, contextFor, endConversation, markSaved, startConversation, DAILY_USER_CAP } from '../engines/ai/conversation.js';
import { compareSpoken, PRONUNCIATION_NOTE } from '../engines/ai/pronunciation.js';
import { checkFixed } from '../engines/skills/skills.js';
import { loadTutor, saveTutor, loadEndpoint, saveEndpoint } from '../storage/tutor.js';
import { speak } from './speech.js';
import { AdviceList } from './ReportSection.jsx';
import { weeklyReport } from '../engines/progress/intelligence.js';

const SUB = [['chat', 'محادثة'], ['roleplay', 'أدوار'], ['pron', 'نطق'], ['advisor', 'مرشدي'], ['history', 'سجلي']];

function CorrectionCard({ c }) {
  const [typed, setTyped] = useState('');
  const [res, setRes] = useState(null);
  return (
    <div className="rule">
      <div className="ex"><span className="badc">✗</span> {c.original}</div>
      <div className="ex"><span className="okc">✓</span> {c.corrected}</div>
      {c.explanation && <div>{c.explanation}</div>}
      {c.example && <div className="ex">مثال: {c.example}</div>}
      <div className="small" style={{ marginTop: 6 }}>تمرين قصير: اكتب الجملة الصحيحة من ذاكرتك</div>
      <input className="inp" value={typed} onChange={(e) => setTyped(e.target.value)} disabled={!!res} />
      {!res && <button className="btn" style={{ marginTop: 6 }} disabled={!typed.trim()} onClick={() => setRes(checkFixed({ answer: c.corrected }, typed))}>تحقق</button>}
      {res && <div>{res.correct ? <b className="okc">صحيح ✅</b> : <b className="badc">قارن مع التصحيح أعلاه</b>}</div>}
      <div className="small">التصحيح آلي وتقديري وقد يخطئ.</div>
    </div>
  );
}

function Suggested({ conv, onSave, markSavedFn }) {
  if (!conv.suggested.length) return null;
  return (
    <div className="card">
      <div style={{ fontWeight: 700 }}>كلمات مقترحة من المحادثة</div>
      <div className="small">لا تُحفظ تلقائياً. اختر ما تريد.</div>
      {conv.suggested.map((w) => (
        <div key={w.en} className="top" style={{ marginTop: 8 }}>
          <div><span className="en" style={{ fontSize: 16 }}>{w.en}</span><div className="ar">{w.ar}</div>{w.ex && <div className="ex">{w.ex}</div>}</div>
          <button className="btn" style={{ flex: 'none' }} disabled={conv.saved.includes(w.en.toLowerCase())} onClick={() => { onSave(w, conv.id); markSavedFn(w.en); }}>
            {conv.saved.includes(w.en.toLowerCase()) ? 'تم ✅' : 'احفظ للمراجعة'}
          </button>
        </div>
      ))}
    </div>
  );
}

function Pronunciation({ phrases }) {
  const [i, setI] = useState(0);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  const [listening, setListening] = useState(false);
  const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
  const target = phrases[i % phrases.length];
  const start = () => {
    setErr(''); setRes(null);
    try {
      const r = new SR();
      r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 1;
      r.onresult = (e) => { setRes({ heard: e.results[0][0].transcript, cmp: compareSpoken(target, e.results[0][0].transcript) }); };
      r.onerror = (e) => setErr(e.error === 'not-allowed' ? 'لم يُسمح باستخدام الميكروفون. فعّله من إعدادات المتصفح.' : 'تعذر التعرف على الصوت. أعد المحاولة.');
      r.onend = () => setListening(false);
      setListening(true);
      r.start();
    } catch {
      setListening(false);
      setErr('تعذر تشغيل الميكروفون.');
    }
  };
  return (
    <div className="card">
      <div className="small">كرّر الجملة بصوت عالٍ</div>
      <div className="en" style={{ marginTop: 6 }}>{target}</div>
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn" onClick={() => speak(target)}>🔊 استمع للنموذج</button>
        <button className="btn" onClick={() => { setI(i + 1); setRes(null); setErr(''); }}>جملة أخرى</button>
      </div>
      {SR ? <button className="next" disabled={listening} onClick={start}>{listening ? 'أستمع…' : '🎤 تحدث'}</button> : <div className="notice">متصفحك لا يدعم التعرف على الكلام. استخدم الاستماع للنموذج ثم كرر بصوتك.</div>}
      {err && <div className="notice err">{err}</div>}
      {res && (
        <div className="rule">
          <div className="ex">فهم المتصفح: {res.heard}</div>
          <div>{res.cmp.matched} من {res.cmp.total} كلمات</div>
          {res.cmp.missed.length > 0 && <div className="ex">كلمات تحتاج تدريباً: {res.cmp.missed.join(', ')}</div>}
        </div>
      )}
      <div className="small" style={{ marginTop: 8 }}>{PRONUNCIATION_NOTE}</div>
    </div>
  );
}

export default function TutorSection({ backend, readOnly, level, onSaveVocab, log, client: injected, getIntel, onGo }) {
  const [sub, setSub] = useState('chat');
  const [tutor, setTutor] = useState(() => (readOnly ? loadTutor({ getItem: () => null }) : loadTutor(backend)));
  const tutorRef = useRef(tutor);
  const [endpoint, setEndpoint] = useState(() => (readOnly ? DEFAULT_ENDPOINT : loadEndpoint(backend, DEFAULT_ENDPOINT)));
  const [epDraft, setEpDraft] = useState(endpoint);
  const [health, setHealth] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [setup, setSetup] = useState({ mode: 'conversation', scenarioId: 'airport', topicId: 'daily', level: LEVELS.includes(level) ? level : level === 'Pre-A1' ? 'A1' : 'A2', correctionMode: 'instant' });
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const client = useMemo(() => injected || createTutorClient({ endpoint }), [injected, endpoint]);

  const put = (next) => {
    tutorRef.current = next;
    setTutor(next);
    if (!readOnly) saveTutor(backend, next);
  };
  const conv = tutor.conversations.find((c) => c.id === openId) || null;

  const begin = (mode) => {
    const r = startConversation(tutorRef.current, { ...setup, mode, scenarioId: mode === 'roleplay' ? setup.scenarioId : undefined, topicId: mode === 'conversation' ? setup.topicId : undefined }, new Date());
    put(r.state);
    setOpenId(r.id);
    setError(null);
  };
  const request = async (id) => {
    const c = tutorRef.current.conversations.find((x) => x.id === id);
    const now = new Date();
    if (!canSend(tutorRef.current.usage, now)) { setError('daily_user_cap'); return; }
    setBusy(true); setError(null);
    const out = await client.chat({ level: c.level, mode: c.mode, scenarioId: c.scenarioId || undefined, topicId: c.topicId || undefined, correctionMode: c.correctionMode, messages: contextFor(c) });
    setBusy(false);
    if (!out.ok) { setError(out.error); return; }
    put({ ...addAssistant(tutorRef.current, id, out, new Date()), usage: bumpUsage(tutorRef.current.usage, new Date()) });
    log('tutor_reply', null);
  };
  const send = () => {
    if (!text.trim() || busy || !conv) return;
    put(addUser(tutorRef.current, conv.id, text, new Date()));
    setText('');
    request(conv.id);
  };
  const lastIsUser = conv && conv.messages.length && conv.messages[conv.messages.length - 1].role === 'user';

  const configCard = (
    <div className="card">
      <div className="small">عنوان الخادم الوسيط للمدرس الذكي. المفاتيح تبقى في الخادم ولا تُوضع هنا. لا تكتب بياناتك الشخصية في المحادثة.</div>
      <input className="inp" placeholder="https://your-server.example" value={epDraft} onChange={(e) => setEpDraft(e.target.value)} />
      <div className="row" style={{ marginTop: 6 }}>
        <button className="btn" disabled={!!epDraft && !validEndpoint(epDraft)} onClick={() => { const v = epDraft.trim(); setEndpoint(v); if (!readOnly) saveEndpoint(backend, v); setHealth(null); }}>حفظ العنوان</button>
        <button className="btn" disabled={!client.configured} onClick={async () => setHealth(await client.health())}>اختبار الاتصال</button>
      </div>
      {epDraft && !validEndpoint(epDraft) && <div className="small badc">العنوان يجب أن يبدأ بـ https:// (أو http://localhost للتجربة).</div>}
      {health !== null && <div className={health ? 'okc' : 'badc'}>{health ? 'الخادم يعمل ✅' : 'تعذر الاتصال بالخادم'}</div>}
    </div>
  );

  if (conv) {
    const sc = scenarios.find((s) => s.id === conv.scenarioId);
    const ended = !!conv.endedAt;
    const showCorr = conv.correctionMode === 'instant' ? conv.corrections : ended ? conv.corrections : [];
    return (
      <div>
        <button className="btn" style={{ marginBottom: 8 }} onClick={() => { setOpenId(null); setError(null); }}>رجوع</button>
        {sc && (
          <div className="card">
            <b>{sc.title}</b><span className="lvl">{conv.level}</span>
            <div className="small">دورك: {sc.learnerRole} · الهدف: {sc.goal}</div>
          </div>
        )}
        <div className="chat">
          {conv.messages.map((m, i) => (
            <div key={i} className={'msg ' + (m.role === 'user' ? 'me' : 'ai')}>
              {m.content}
              {m.role === 'assistant' && <button className="ic" style={{ marginInlineStart: 6, fontSize: 16 }} title="نطق" onClick={() => speak(m.content)}>🔊</button>}
            </div>
          ))}
          {busy && <div className="msg ai">…</div>}
        </div>
        {error && (
          <div className="notice err">
            {error === 'daily_user_cap' ? `وصلت إلى حد ${DAILY_USER_CAP} رسالة اليوم.` : errorText(error)}
          </div>
        )}
        {lastIsUser && !busy && !ended && <button className="btn" style={{ marginBottom: 8 }} onClick={() => request(conv.id)}>إعادة المحاولة</button>}
        {configCard}
        {showCorr.map((c, i) => <CorrectionCard key={conv.id + i} c={c} />)}
        {conv.correctionMode === 'after' && !ended && conv.corrections.length > 0 && <div className="small">لديك {conv.corrections.length} تصحيحات ستظهر عند إنهاء المحادثة.</div>}
        <Suggested conv={conv} onSave={onSaveVocab} markSavedFn={(en) => put(markSaved(tutorRef.current, conv.id, en))} />
        {!ended ? (
          <div>
            <textarea className="inp" style={{ minHeight: 70 }} placeholder="Type your answer…" value={text} onChange={(e) => setText(e.target.value)} />
            <div className="row" style={{ marginTop: 6 }}>
              <button className="btn on" disabled={busy || !text.trim()} onClick={send}>إرسال</button>
              <button className="btn" onClick={() => put(endConversation(tutorRef.current, conv.id, new Date()))}>أنهِ المحادثة</button>
            </div>
          </div>
        ) : (
          <div className="card">
            <b>انتهت المحادثة</b>
            <div className="small">{conv.messages.filter((m) => m.role === 'user').length} رسائل منك · {conv.corrections.length} تصحيحات</div>
            {sc && (
              <div style={{ marginTop: 8 }}>
                <div className="small">قيّم نفسك على معايير هذا السيناريو (تقييم ذاتي، لا يقيّمه التطبيق آلياً):</div>
                {sc.criteria.map((c) => <div key={c}>⬜ {c}</div>)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="row">{SUB.map(([k, l]) => <button key={k} className={'btn' + (sub === k ? ' on' : '')} onClick={() => setSub(k)}>{l}</button>)}</div>
      {(sub === 'chat' || sub === 'roleplay') && (
        <div>
          {!client.configured && <div className="notice">المدرس الذكي غير مفعّل بعد. أدخل عنوان الخادم الوسيط أدناه عند جاهزيته. باقي التطبيق يعمل دونه.</div>}
          <div className="card">
            <div className="lbl">المستوى التقديري</div>
            <div className="wrap">{LEVELS.map((l) => <button key={l} className={'pill' + (setup.level === l ? ' on' : '')} onClick={() => setSetup({ ...setup, level: l })}>{l}</button>)}</div>
            <div className="lbl">طريقة التصحيح</div>
            <div className="wrap">
              <button className={'pill' + (setup.correctionMode === 'instant' ? ' on' : '')} onClick={() => setSetup({ ...setup, correctionMode: 'instant' })}>فوري</button>
              <button className={'pill' + (setup.correctionMode === 'after' ? ' on' : '')} onClick={() => setSetup({ ...setup, correctionMode: 'after' })}>بعد الانتهاء</button>
            </div>
            {sub === 'chat' ? (
              <div>
                <div className="lbl">الموضوع</div>
                <div className="wrap">{topics.map((t) => <button key={t.id} className={'pill' + (setup.topicId === t.id ? ' on' : '')} onClick={() => setSetup({ ...setup, topicId: t.id })}>{t.titleAr}</button>)}</div>
                <button className="next" onClick={() => begin('conversation')}>ابدأ المحادثة</button>
              </div>
            ) : (
              <div>
                {scenarios.map((s) => (
                  <div key={s.id} className="card" style={{ marginTop: 8, padding: 12 }}>
                    <div className="top">
                      <div><b>{s.title}</b><span className="lvl">{s.level}</span><div className="ar">{s.titleAr}</div></div>
                      <button className="pill on" onClick={() => { setSetup({ ...setup, scenarioId: s.id }); const r = startConversation(tutorRef.current, { ...setup, mode: 'roleplay', scenarioId: s.id, topicId: undefined }, new Date()); put(r.state); setOpenId(r.id); setError(null); }}>ابدأ</button>
                    </div>
                    <div className="small">دورك: {s.learnerRole} · الهدف: {s.goal}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {configCard}
        </div>
      )}
      {sub === 'pron' && <Pronunciation phrases={['Could I have the bill, please?', 'I would like a cup of coffee.', 'Excuse me, where is the pharmacy?', 'Nice to meet you.', 'I have an appointment tomorrow.']} />}
      {sub === 'advisor' && getIntel && (
        <div>
          <div className="small" style={{ marginBottom: 8 }}>اقتراحات مبنية على أخطائك ونتائجك المسجلة فقط.</div>
          <AdviceList advice={weeklyReport({ ...getIntel(), tutor }).recommendations.slice(0, 4)} onGo={onGo} />
        </div>
      )}
      {sub === 'history' && (
        <div>
          {tutor.conversations.length === 0 && <div className="card small">لا توجد محادثات بعد.</div>}
          {[...tutor.conversations].reverse().map((c) => (
            <div className="card" key={c.id}>
              <b>{c.mode === 'roleplay' ? (scenarios.find((s) => s.id === c.scenarioId) || {}).title : 'Free conversation'}</b><span className="lvl">{c.level}</span>
              <div className="small">{new Date(c.startedAt).toLocaleString('ar-EG')} · {c.messages.length} رسائل · {c.endedAt ? 'منتهية' : 'مفتوحة'}</div>
              <button className="next" onClick={() => setOpenId(c.id)}>افتح</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
