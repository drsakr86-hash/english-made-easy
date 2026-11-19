import { readStrict, setRaw, removeKey } from './localStorage.js';

/**
 * كتابة عدة مفاتيح كوحدة واحدة (كل شيء أو لا شيء) فوق Storage الذي لا يدعم المعاملات.
 *
 * ops: [{ key, value }] حيث value نص للكتابة أو null للحذف. المفاتيح فريدة.
 * 1) تُقرأ القيم السابقة قراءة صارمة؛ فشل أي قراءة يوقف العملية قبل أي كتابة.
 * 2) تُنفَّذ العمليات بالترتيب، ويُتحقق بعد كل كتابة من أن القراءة ترجع القيمة المكتوبة.
 * 3) عند أي فشل تُعاد كل القيم السابقة بدقة (القيمة الأصلية أو الغياب) ويُتحقق من التراجع.
 *
 * تُرجع { ok:true, changed:[keys] } أو
 * { ok:false, reason, failedKey, rolledBack, rollbackFailed:[keys] }.
 * rolledBack=false يعني أن التراجع نفسه فشل جزئياً، ولا تُعرض أي رسالة نجاح عندها.
 */
export function applyWrites(backend, ops) {
  const prev = new Map();
  for (const { key } of ops) {
    const r = readStrict(backend, key);
    if (!r.ok) {
      return { ok: false, reason: 'تعذرت قراءة التخزين قبل الكتابة', failedKey: key, rolledBack: true, rollbackFailed: [] };
    }
    prev.set(key, r.value);
  }
  // عمليات لا تغيّر شيئاً لا تُكتب أصلاً (تقلل الكتابة وتجعل التكرار آمناً)
  const todo = ops.filter(({ key, value }) => prev.get(key) !== value);
  const touched = [];
  let failure = null;

  for (const { key, value } of todo) {
    touched.push(key);
    const wrote = value === null ? removeKey(backend, key) : setRaw(backend, key, value);
    if (!wrote) {
      failure = { key, reason: 'تعذرت الكتابة في التخزين (قد يكون ممتلئاً)' };
      break;
    }
    const r = readStrict(backend, key);
    if (!r.ok || r.value !== value) {
      failure = { key, reason: 'فشل التحقق بعد الكتابة' };
      break;
    }
  }

  if (!failure) {
    // تحقق نهائي شامل: لا نعتمد على نجاح الخطوات منفردة
    for (const { key, value } of todo) {
      const r = readStrict(backend, key);
      if (!r.ok || r.value !== value) {
        failure = { key, reason: 'فشل التحقق النهائي بعد الكتابة' };
        break;
      }
    }
  }
  if (!failure) return { ok: true, changed: todo.map((o) => o.key) };

  const rollbackFailed = [];
  for (const key of [...touched].reverse()) {
    const old = prev.get(key);
    if (old === null) removeKey(backend, key);
    else setRaw(backend, key, old);
  }
  for (const key of touched) {
    const r = readStrict(backend, key);
    if (!r.ok || r.value !== prev.get(key)) rollbackFailed.push(key);
  }
  return { ok: false, reason: failure.reason, failedKey: failure.key, rolledBack: rollbackFailed.length === 0, rollbackFailed };
}

/**
 * عملية لقطة تُوضع أولاً في المعاملة: تحفظ القيم الحالية للمفاتيح التي ستتغير.
 * تُرجع null إن لم يكن هناك ما يُحفظ (كل المفاتيح المتأثرة غائبة حالياً)،
 * أو { ok:false, reason } إن تعذرت القراءة. تتراجع هي نفسها مع المعاملة فتبقى اللقطة السابقة.
 */
export function snapshotOp(backend, key, ops, label) {
  const keys = {};
  let hasData = false;
  for (const op of ops) {
    const r = readStrict(backend, op.key);
    if (!r.ok) return { ok: false, reason: 'تعذرت قراءة التخزين لإنشاء اللقطة' };
    if (r.value === op.value) continue;
    keys[op.key] = r.value;
    if (r.value !== null) hasData = true;
  }
  if (!hasData) return null;
  return { ok: true, op: { key, value: JSON.stringify({ at: new Date().toISOString(), label, keys }) } };
}
