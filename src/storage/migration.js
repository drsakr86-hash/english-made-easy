import { getRaw, setRaw, readStrict } from './localStorage.js';
import { KEYS, LEGACY_KEYS, SCHEMA_VERSION, PROGRESS_SECTIONS } from './keys.js';
import { applyWrites, snapshotOp } from './transaction.js';

const TAB_VALUES = ['words', 'expr', 'idioms', 'grammar', 'compound'];
const TAB_V1_TO_V2 = { words: 'words', expr: 'expressions', idioms: 'idioms', grammar: 'grammar', compound: 'compound' };

function indexByLegacyKey(items) {
  // العناصر بلا legacyKey (مثل improve المستعادة) لا يوجد لها تقدم قديم يُربط بها
  return new Map(items.filter((x) => x.legacyKey !== null).map((x) => [x.legacyKey, x.id]));
}

/**
 * يسجّل حالة الفشل/التعارض في مفتاح الحالة المستقل eme.migration فقط.
 * لا يحذف ولا يعدّل أي بيانات مستخدم (تقدم V2 أو إعداداته أو مفاتيح V1) تحت أي ظرف.
 * لا يعيد كتابة العلامة إن كانت تحمل الحالة والسبب نفسيهما، فيبقى التخزين ثابتاً عند التكرار.
 */
function fail(backend, reason, state = 'failed', extra = {}) {
  const info = { state, reason, ...extra };
  const prev = readMigrationState(backend);
  if (!(prev && prev.state === state && prev.reason === reason)) {
    setRaw(backend, KEYS.migration, JSON.stringify({ state, reason, at: new Date().toISOString() }));
  }
  return info;
}

/** هل نص eme.progress بشكل صالح (كائن، وكل قسم معروف مصفوفة نصوص)؟ */
export function isValidProgressText(text) {
  let v;
  try {
    v = JSON.parse(text);
  } catch {
    return false;
  }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  for (const s of PROGRESS_SECTIONS) {
    if (s in v && !(Array.isArray(v[s]) && v[s].every((x) => typeof x === 'string'))) return false;
  }
  return !('unmatched' in v) || (v.unmatched !== null && typeof v.unmatched === 'object' && !Array.isArray(v.unmatched));
}

/**
 * دالة نقية: تحوّل قيم V1 الخام (نصوص JSON لكل مفتاح) إلى معرّفات.
 * تُرجع {ok:false, reason} عند أي شكل غير متوقع دون أي كتابة.
 */
export function convertLegacy(raw, content) {
  const parsed = {};
  for (const section of PROGRESS_SECTIONS) {
    const text = raw[LEGACY_KEYS[section]] ?? null;
    if (text === null) {
      parsed[section] = [];
      continue;
    }
    let v;
    try {
      v = JSON.parse(text);
    } catch {
      return { ok: false, reason: `قيمة ${LEGACY_KEYS[section]} ليست JSON صالحاً` };
    }
    if (!Array.isArray(v) || !v.every((x) => typeof x === 'string')) {
      return { ok: false, reason: `قيمة ${LEGACY_KEYS[section]} ليست مصفوفة نصوص` };
    }
    parsed[section] = v;
  }
  let tab = 'dashboard';
  if ((raw[LEGACY_KEYS.tab] ?? null) !== null) {
    try {
      const t = JSON.parse(raw[LEGACY_KEYS.tab]);
      if (TAB_VALUES.includes(t)) tab = TAB_V1_TO_V2[t];
    } catch {
      /* التبويب غير حرج: نعود للافتراضي */
    }
  }
  const maps = {
    words: indexByLegacyKey(content.words),
    expressions: indexByLegacyKey(content.expressions),
    idioms: indexByLegacyKey(content.idioms),
    grammar: indexByLegacyKey(content.grammar),
  };
  const progress = {};
  const unmatched = {};
  const counts = { before: {}, after: {}, unmatched: {}, duplicates: {} };
  for (const section of PROGRESS_SECTIONS) {
    const input = parsed[section];
    const ids = [];
    const miss = [];
    let dups = 0;
    for (const text of input) {
      const id = maps[section].get(text);
      if (!id) miss.push(text);
      else if (ids.includes(id)) dups++;
      else ids.push(id);
    }
    // التحقق: كل نص مدخل محسوب مرة واحدة بالضبط
    if (ids.length + miss.length + dups !== input.length) {
      return { ok: false, reason: `عدم تطابق الأعداد في ${section}` };
    }
    progress[section] = ids;
    unmatched[section] = miss;
    counts.before[section] = input.length;
    counts.after[section] = ids.length;
    counts.unmatched[section] = miss.length;
    counts.duplicates[section] = dups;
  }
  return { ok: true, progress, unmatched, counts, tab };
}

/**
 * استيراد لقطة V1 مصدَّرة يدوياً (ناتج copy(JSON.stringify(localStorage))) ودمجها مع التقدم الحالي.
 * - لا تكتب مفاتيح V1 ولا تمسح تقدماً قائماً (اتحاد المعرّفات).
 * - تحفظ حالة ما قبل الاستيراد في eme.backup.preimport.
 * - آمنة عند التكرار: استيراد نفس اللقطة مرتين لا يضيف شيئاً.
 */
export function importLegacyDump(backend, text, content) {
  let dump;
  try {
    dump = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'النص ليس JSON صالحاً' };
  }
  if (!dump || typeof dump !== 'object' || Array.isArray(dump)) {
    return { ok: false, reason: 'الشكل غير متوقع: المطلوب كائن مفاتيح التخزين' };
  }
  const raw = {};
  let found = 0;
  for (const k of Object.values(LEGACY_KEYS)) {
    if (typeof dump[k] === 'string') {
      raw[k] = dump[k];
      if (k !== LEGACY_KEYS.tab && k !== LEGACY_KEYS.compound) found++;
    }
  }
  if (found === 0) return { ok: false, reason: 'لم أجد بيانات تقدم V1 في النص (k_words وk_expr وk_idioms وk_grammar)' };
  const conv = convertLegacy(raw, content);
  if (!conv.ok) return { ok: false, reason: conv.reason };

  const currentRaw = getRaw(backend, KEYS.progress);
  let current = {};
  try {
    current = currentRaw ? JSON.parse(currentRaw) : {};
  } catch {
    return { ok: false, reason: 'تقدمك الحالي تالف، لن أدمج فوقه' };
  }
  if (currentRaw !== null && !setRaw(backend, KEYS.preimport, currentRaw)) {
    return { ok: false, reason: 'تعذر حفظ نسخة ما قبل الاستيراد' };
  }
  const merged = {};
  const added = {};
  const mergedUnmatched = {};
  for (const section of PROGRESS_SECTIONS) {
    const cur = Array.isArray(current[section]) ? current[section] : [];
    const out = [...cur];
    for (const id of conv.progress[section]) if (!out.includes(id)) out.push(id);
    merged[section] = out;
    added[section] = out.length - cur.length;
    const curMiss = (current.unmatched && current.unmatched[section]) || [];
    mergedUnmatched[section] = [...new Set([...curMiss, ...conv.unmatched[section]])];
  }
  if (!setRaw(backend, KEYS.progress, JSON.stringify({ ...merged, unmatched: mergedUnmatched }))) {
    return { ok: false, reason: 'تعذر الكتابة في التخزين' };
  }
  return { ok: true, added, counts: conv.counts, unmatched: conv.unmatched };
}

export function readMigrationState(backend) {
  try {
    const raw = getRaw(backend, KEYS.migration);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * ترحيل آمن وقابل للتكرار من مفاتيح V1 إلى eme.progress بالمعرّفات الثابتة.
 * - لا يمسّ مفاتيح V1 إطلاقاً.
 * - لا يكتب فوق أي مفتاح V2 موجود: وجود eme.progress بلا علامة done يعني تعارضاً أو تبنّياً، لا استبدالاً.
 * - يقرأ بصرامة: فشل القراءة يوقف العملية ولا يُفسَّر على أنه "لا توجد بيانات".
 * - يكتب كل شيء في معاملة واحدة (نسخة خام ← تقدم ← إعدادات ← مخطط ← علامة done أخيراً)
 *   مع تحقق بعد الكتابة وتراجع كامل عند أي فشل.
 * - أي نص غير مطابق يُحفظ في unmatched ولا يُحذف.
 * الحالات المُرجعة: done | skipped | conflict | failed.
 */
export function runMigration(backend, content) {
  const prev = readMigrationState(backend);
  if (prev && prev.state === 'done') return { ...prev, state: 'skipped' };

  const keyList = [...Object.values(LEGACY_KEYS), KEYS.progress, KEYS.settings, KEYS.schema, KEYS.backup];
  const raw = {};
  for (const k of keyList) {
    const r = readStrict(backend, k);
    if (!r.ok) return fail(backend, 'تعذرت قراءة التخزين، لم يُغيَّر أي شيء');
    raw[k] = r.value;
  }
  const legacyRaw = Object.fromEntries(Object.values(LEGACY_KEYS).map((k) => [k, raw[k]]));
  const hasLegacyProgress = PROGRESS_SECTIONS.some((sec) => raw[LEGACY_KEYS[sec]] !== null);

  // تقدم V2 موجود: لا استبدال أبداً.
  if (raw[KEYS.progress] !== null) {
    if (!isValidProgressText(raw[KEYS.progress])) {
      return fail(backend, 'تقدم النسخة الجديدة الحالي تالف الشكل؛ لم يُغيَّر شيء. استعد نسخة احتياطية.');
    }
    if (hasLegacyProgress) {
      return fail(
        backend,
        'وُجد تقدم محفوظ في النسخة الجديدة وبيانات قديمة معاً؛ لم يُدمجا تلقائياً حتى لا يتغير تقدمك. يمكنك دمج بيانات V1 يدوياً.',
        'conflict',
      );
    }
    // لا شيء من V1 يُرحَّل: نتبنّى التقدم الحالي كما هو ونسجّل الإنجاز.
    const r = { state: 'done', at: new Date().toISOString(), adopted: true };
    setRaw(backend, KEYS.migration, JSON.stringify(r));
    return r;
  }

  // 2+3) فحص الشكل والتحويل (دالة نقية بلا كتابة)
  const conv = convertLegacy(legacyRaw, content);
  if (!conv.ok) return fail(backend, conv.reason);
  const { progress, unmatched, counts, tab } = conv;

  // النسخة الخام: نحتفظ بنسخة سابقة سليمة، ونعيد كتابتها فقط إن كانت غائبة أو تالفة.
  let backupOk = false;
  if (raw[KEYS.backup] !== null) {
    try {
      const b = JSON.parse(raw[KEYS.backup]);
      backupOk = !!b && typeof b.keys === 'object' && b.keys !== null && !Array.isArray(b.keys);
    } catch {
      backupOk = false;
    }
  }
  const result = { state: 'done', at: new Date().toISOString(), counts };
  const ops = [];
  if (!backupOk) ops.push({ key: KEYS.backup, value: JSON.stringify({ at: new Date().toISOString(), keys: legacyRaw }) });
  ops.push({ key: KEYS.progress, value: JSON.stringify({ ...progress, unmatched }) });
  // الإعدادات والمخطط لا تُستبدل إن كانت موجودة (قد تحوي تفضيلات المستخدم)
  if (raw[KEYS.settings] === null) ops.push({ key: KEYS.settings, value: JSON.stringify({ tab }) });
  if (raw[KEYS.schema] === null) ops.push({ key: KEYS.schema, value: String(SCHEMA_VERSION) });
  ops.push({ key: KEYS.migration, value: JSON.stringify(result) }); // علامة الإنجاز أخيراً

  const w = applyWrites(backend, ops);
  if (!w.ok) {
    return fail(
      backend,
      w.rolledBack ? `تعذرت الكتابة (${w.reason}) وأُعيدت الحالة السابقة كاملة` : `تعذرت الكتابة ولم يكتمل التراجع (${w.rollbackFailed.join('، ')})`,
      'failed',
      { rollbackFailed: w.rollbackFailed },
    );
  }
  return result;
}

const LEGACY_SET = new Set(Object.values(LEGACY_KEYS));
const V2_RESET_KEYS = [KEYS.progress, KEYS.settings, KEYS.schema, KEYS.migration];

/**
 * استعادة مفاتيح V1 من النسخة الداخلية ثم إلغاء مفاتيح V2.
 * - تتحقق من بنية النسخة (مفاتيح V1 فقط، قيم نصية أو null) قبل أي كتابة.
 * - كل شيء في معاملة واحدة: كتابات V1 أولاً ثم حذف V2، مع تحقق وتراجع كامل عند أي فشل،
 *   فلا يُحذف V2 ما لم تنجح استعادة V1 بالكامل.
 * - تحفظ قبل البدء لقطة بقيم المفاتيح المتأثرة (بما فيها تقدم V2) في eme.backup.prerestore،
 *   ويمكن الرجوع إليها بـ restoreFromSnapshot. لا تُحذف النسخة الاحتياطية نفسها.
 * تُرجع { ok, restored, removed, snapshotSaved } أو { ok:false, reason, rolledBack }.
 */
export function restoreLegacyFromBackup(backend) {
  const t = readStrict(backend, KEYS.backup);
  if (!t.ok) return { ok: false, reason: 'تعذرت قراءة التخزين' };
  if (!t.value) return { ok: false, reason: 'لا توجد نسخة احتياطية' };
  let b;
  try {
    b = JSON.parse(t.value);
  } catch {
    return { ok: false, reason: 'النسخة الاحتياطية تالفة' };
  }
  const keys = b && b.keys;
  if (!keys || typeof keys !== 'object' || Array.isArray(keys)) return { ok: false, reason: 'بنية النسخة الاحتياطية غير صالحة' };
  for (const [k, v] of Object.entries(keys)) {
    if (!LEGACY_SET.has(k)) return { ok: false, reason: 'النسخة الاحتياطية تحتوي مفاتيح غير مقبولة' };
    if (v !== null && typeof v !== 'string') return { ok: false, reason: 'النسخة الاحتياطية تحتوي قيماً غير صالحة' };
  }
  const ops = [
    ...Object.entries(keys).map(([key, value]) => ({ key, value })),
    ...V2_RESET_KEYS.map((key) => ({ key, value: null })),
  ];
  const snap = snapshotOp(backend, KEYS.prerestore, ops, 'restore-legacy');
  if (snap && !snap.ok) return { ok: false, reason: snap.reason, rolledBack: true };
  const w = applyWrites(backend, snap ? [snap.op, ...ops] : ops);
  if (!w.ok) return { ok: false, reason: w.reason, rolledBack: w.rolledBack, rollbackFailed: w.rollbackFailed };
  return {
    ok: true,
    restored: Object.keys(keys).length,
    removed: V2_RESET_KEYS.length,
    snapshotSaved: !!snap,
  };
}
