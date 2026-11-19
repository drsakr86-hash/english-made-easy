import { allKeys, readStrict } from './localStorage.js';
import { KEYS, SCHEMA_VERSION, PROGRESS_SECTIONS } from './keys.js';
import { applyWrites, snapshotOp } from './transaction.js';
import { isValidProgressText } from './migration.js';

const FORMAT = 'eme-backup';
const VERSION = 1;
const MAX_KEYS = 200;
const MAX_VALUE_CHARS = 4_000_000;
const MAX_TOTAL_CHARS = 8_000_000;

const isOurs = (k) => k.startsWith('eme.') || k === 'tab' || k.startsWith('k_');
/** مفاتيح تقبلها النسخة الاحتياطية. اللقطة المؤقتة ليست جزءاً من النسخ ولا تُستورد. */
const isAccepted = (k) => isOurs(k) && k !== KEYS.prerestore;
/** لا تُحذف أبداً بسبب غيابها عن الملف: مفاتيح V1 الأصلية ونسخها الاحتياطية. */
const isProtected = (k) => k === 'tab' || k.startsWith('k_') || k === KEYS.backup || k === KEYS.preimport || k === KEYS.prerestore;
/** مفاتيح V2 المعروفة التي يجب أن تحوي كائن JSON صالحاً (باستثناء schema). */
const JSON_OBJECT_KEYS = new Set(Object.values(KEYS).filter((k) => k !== KEYS.schema && k !== KEYS.prerestore));

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** نص JSON لكل مفاتيح التطبيق (V1 وV2) للتنزيل. لا يشمل اللقطة المؤقتة. */
export function exportBackup(backend) {
  const entries = {};
  for (const k of allKeys(backend)) if (isAccepted(k)) entries[k] = readStrict(backend, k).value;
  return JSON.stringify({ format: FORMAT, version: VERSION, at: new Date().toISOString(), entries }, null, 1);
}

function validateEntry(k, v) {
  if (typeof v !== 'string') return 'قيمة غير نصية';
  if (v.length > MAX_VALUE_CHARS) return 'قيمة أكبر من الحد المسموح';
  // مفاتيح V1 تُحفظ كما هي بايتاً ببايت (قد تكون تالفة أصلاً) فلا تُفحص بنيتها
  if (k === KEYS.schema) {
    return /^\d+$/.test(v) && Number(v) <= SCHEMA_VERSION ? null : 'إصدار مخطط غير مدعوم (أحدث من هذا التطبيق أو غير صالح)';
  }
  if (!JSON_OBJECT_KEYS.has(k)) return null;
  if (k === KEYS.progress) return isValidProgressText(v) ? null : 'بنية التقدم غير صالحة';
  let o;
  try {
    o = JSON.parse(v);
  } catch {
    return 'JSON داخلي غير صالح';
  }
  if (!isPlainObject(o)) return 'بنية غير صالحة';
  if (k === KEYS.backup && !isPlainObject(o.keys)) return 'بنية النسخة الداخلية غير صالحة';
  if (k === KEYS.migration && typeof o.state !== 'string') return 'بنية حالة الترحيل غير صالحة';
  return null;
}

/** يتحقق من الملف كاملاً دون أي كتابة. يُرجع { ok:true, entries } أو { ok:false, reason }. */
export function validateBackup(text) {
  let b;
  try {
    b = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'الملف ليس JSON صالحاً' };
  }
  if (!isPlainObject(b) || b.format !== FORMAT || !isPlainObject(b.entries)) {
    return { ok: false, reason: 'الملف ليس نسخة احتياطية من English Made Easy' };
  }
  if (b.version !== VERSION) return { ok: false, reason: 'إصدار النسخة الاحتياطية غير مدعوم' };
  const keys = Object.keys(b.entries);
  if (keys.length > MAX_KEYS) return { ok: false, reason: 'الملف يحتوي مفاتيح أكثر من المسموح' };
  if (!keys.every(isAccepted)) return { ok: false, reason: 'الملف يحتوي مفاتيح غير مقبولة' };
  let total = 0;
  for (const k of keys) {
    const why = validateEntry(k, b.entries[k]);
    if (why) return { ok: false, reason: `${why} (${k})` };
    total += b.entries[k].length;
  }
  if (total > MAX_TOTAL_CHARS) return { ok: false, reason: 'حجم الملف أكبر من الحد المسموح' };
  return { ok: true, entries: b.entries };
}

/** اتحاد التقدم دون حذف أي عنصر محلي. يُرجع null إن كان التقدم المحلي تالفاً (فيُبقى كما هو). */
function mergeProgress(localText, fileText) {
  if (!isValidProgressText(localText)) return null;
  const local = JSON.parse(localText);
  const file = JSON.parse(fileText);
  const out = { ...local };
  const unmatched = { ...(local.unmatched || {}) };
  for (const s of PROGRESS_SECTIONS) {
    const cur = Array.isArray(local[s]) ? local[s] : [];
    const add = Array.isArray(file[s]) ? file[s] : [];
    out[s] = [...cur, ...add.filter((id) => !cur.includes(id))];
    const um = (local.unmatched && local.unmatched[s]) || [];
    const fm = (file.unmatched && file.unmatched[s]) || [];
    unmatched[s] = [...new Set([...um, ...fm])];
  }
  return JSON.stringify({ ...out, unmatched });
}

/**
 * يخطط الاستيراد دون أي كتابة.
 * - merge (الافتراضي): يضيف المفاتيح الغائبة محلياً، ويوحّد eme.progress بلا حذف، ويُبقي ما هو موجود محلياً كما هو.
 * - replace (استعادة كاملة): الملف هو المرجع لمفاتيحه، وتُحذف مفاتيح التطبيق الغائبة عنه ما عدا المحمية (V1 ونسخها).
 * تُرجع { ok, mode, ops, write, kept, unchanged, remove } أو { ok:false, reason }.
 */
export function planImport(backend, text, mode = 'merge') {
  if (mode !== 'merge' && mode !== 'replace') return { ok: false, reason: 'وضع الاستعادة غير معروف' };
  const v = validateBackup(text);
  if (!v.ok) return v;
  const { entries } = v;
  const ops = [];
  const plan = { ok: true, mode, ops, write: [], kept: [], unchanged: [], remove: [] };

  for (const [k, value] of Object.entries(entries)) {
    const r = readStrict(backend, k);
    if (!r.ok) return { ok: false, reason: 'تعذرت قراءة التخزين' };
    const local = r.value;
    if (local === value) {
      plan.unchanged.push(k);
      continue;
    }
    if (mode === 'replace' || local === null) {
      ops.push({ key: k, value });
      plan.write.push(k);
      continue;
    }
    // دمج، والمفتاح موجود محلياً بقيمة مختلفة
    if (k === KEYS.progress) {
      const merged = mergeProgress(local, value);
      if (merged === null) plan.kept.push(k);
      else if (merged === local) plan.unchanged.push(k);
      else {
        ops.push({ key: k, value: merged });
        plan.write.push(k);
      }
    } else {
      plan.kept.push(k);
    }
  }

  if (mode === 'replace') {
    let local;
    try {
      local = allKeys(backend);
    } catch {
      return { ok: false, reason: 'تعذرت قراءة التخزين' };
    }
    for (const k of local) {
      if (isOurs(k) && !isProtected(k) && !(k in entries)) {
        ops.push({ key: k, value: null });
        plan.remove.push(k);
      }
    }
  }
  return plan;
}

/**
 * يستورد نسخة احتياطية بعد التحقق الكامل، في معاملة واحدة مع لقطة بما سيتغير وتراجع كامل عند أي فشل.
 * لا تُرجع ok:true إلا بعد قراءة كل المفاتيح المكتوبة والتأكد من مطابقتها.
 */
export function importBackup(backend, text, { mode = 'merge' } = {}) {
  const plan = planImport(backend, text, mode);
  if (!plan.ok) return { ok: false, reason: plan.reason };
  const snap = snapshotOp(backend, KEYS.prerestore, plan.ops, `import-${mode}`);
  if (snap && !snap.ok) return { ok: false, reason: snap.reason, rolledBack: true };
  const w = applyWrites(backend, snap ? [snap.op, ...plan.ops] : plan.ops);
  if (!w.ok) {
    return { ok: false, reason: `تعذرت الاستعادة (${w.reason}). ${w.rolledBack ? 'أُعيدت بياناتك كما كانت.' : 'تعذر إكمال التراجع!'}`, rolledBack: w.rolledBack, rollbackFailed: w.rollbackFailed };
  }
  return {
    ok: true,
    mode,
    count: plan.write.length + plan.unchanged.length + plan.kept.length,
    written: plan.write,
    kept: plan.kept,
    unchanged: plan.unchanged,
    removed: plan.remove,
    snapshotSaved: !!snap,
    verified: true,
  };
}

/**
 * يرجع إلى اللقطة المحفوظة قبل آخر استعادة (eme.backup.prerestore). العملية ذرية، وتحفظ لقطة بما قبلها
 * فيمكن التراجع عن التراجع.
 */
export function restoreFromSnapshot(backend) {
  const t = readStrict(backend, KEYS.prerestore);
  if (!t.ok) return { ok: false, reason: 'تعذرت قراءة التخزين' };
  if (!t.value) return { ok: false, reason: 'لا توجد لقطة محفوظة' };
  let s;
  try {
    s = JSON.parse(t.value);
  } catch {
    return { ok: false, reason: 'اللقطة المحفوظة تالفة' };
  }
  if (!isPlainObject(s) || !isPlainObject(s.keys)) return { ok: false, reason: 'بنية اللقطة غير صالحة' };
  for (const [k, v] of Object.entries(s.keys)) {
    if (!isAccepted(k) || (v !== null && typeof v !== 'string')) return { ok: false, reason: 'اللقطة تحتوي مفاتيح أو قيماً غير صالحة' };
  }
  const ops = Object.entries(s.keys).map(([key, value]) => ({ key, value }));
  const snap = snapshotOp(backend, KEYS.prerestore, ops, 'undo-restore');
  if (snap && !snap.ok) return { ok: false, reason: snap.reason };
  const w = applyWrites(backend, snap ? [snap.op, ...ops] : ops);
  if (!w.ok) return { ok: false, reason: w.reason, rolledBack: w.rolledBack, rollbackFailed: w.rollbackFailed };
  return { ok: true, restored: ops.length };
}
