import { getRaw, setRaw, removeKey } from './localStorage.js';
import { KEYS, LEGACY_KEYS, SCHEMA_VERSION, PROGRESS_SECTIONS } from './keys.js';

const TAB_VALUES = ['words', 'expr', 'idioms', 'grammar', 'compound'];
const TAB_V1_TO_V2 = { words: 'words', expr: 'expressions', idioms: 'idioms', grammar: 'grammar', compound: 'compound' };

function indexByLegacyKey(items) {
  return new Map(items.map((x) => [x.legacyKey, x.id]));
}

function fail(backend, reason) {
  // لا نكتب أي تقدم جزئي عند الفشل، ونترك مفاتيح V1 كما هي.
  removeKey(backend, KEYS.progress);
  removeKey(backend, KEYS.settings);
  removeKey(backend, KEYS.schema);
  const info = { state: 'failed', reason };
  setRaw(backend, KEYS.migration, JSON.stringify({ ...info, at: new Date().toISOString() }));
  return info;
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
 * - يكتب نسخة احتياطية خاماً قبل أي شيء.
 * - أي نص غير مطابق يُحفظ في unmatched ولا يُحذف.
 * - يتوقف عند أي شكل غير متوقع دون كتابة نتيجة جزئية.
 */
export function runMigration(backend, content) {
  const prev = readMigrationState(backend);
  if (prev && prev.state === 'done') return { ...prev, state: 'skipped' };

  const legacyKeyList = Object.values(LEGACY_KEYS);
  const raw = {};
  for (const k of legacyKeyList) raw[k] = getRaw(backend, k);

  // 1) النسخة الاحتياطية الخام. إن وُجدت من محاولة سابقة فمفاتيح V1 لم تتغير فنبقيها كما هي.
  if (getRaw(backend, KEYS.backup) === null) {
    const ok = setRaw(backend, KEYS.backup, JSON.stringify({ at: new Date().toISOString(), keys: raw }));
    if (!ok) return fail(backend, 'تعذر كتابة النسخة الاحتياطية (التخزين ممتلئ أو غير متاح)');
  }

  // 2) قراءة وفحص الشكل
  const parsed = {};
  for (const section of PROGRESS_SECTIONS) {
    const text = raw[LEGACY_KEYS[section]];
    if (text === null) {
      parsed[section] = [];
      continue;
    }
    let v;
    try {
      v = JSON.parse(text);
    } catch {
      return fail(backend, `قيمة ${LEGACY_KEYS[section]} ليست JSON صالحاً`);
    }
    if (!Array.isArray(v) || !v.every((s) => typeof s === 'string')) {
      return fail(backend, `قيمة ${LEGACY_KEYS[section]} ليست مصفوفة نصوص`);
    }
    parsed[section] = v;
  }
  let tab = 'words';
  if (raw[LEGACY_KEYS.tab] !== null) {
    try {
      const t = JSON.parse(raw[LEGACY_KEYS.tab]);
      if (TAB_VALUES.includes(t)) tab = TAB_V1_TO_V2[t];
    } catch {
      /* التبويب غير حرج: نعود للافتراضي */
    }
  }

  // 3) التحويل مع حساب كل نص
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
      return fail(backend, `عدم تطابق الأعداد في ${section}`);
    }
    progress[section] = ids;
    unmatched[section] = miss;
    counts.before[section] = input.length;
    counts.after[section] = ids.length;
    counts.unmatched[section] = miss.length;
    counts.duplicates[section] = dups;
  }

  // 4) الكتابة: التقدم أولاً، وعلامة الإنجاز أخيراً
  const okWrites =
    setRaw(backend, KEYS.progress, JSON.stringify({ ...progress, unmatched })) &&
    setRaw(backend, KEYS.settings, JSON.stringify({ tab })) &&
    setRaw(backend, KEYS.schema, String(SCHEMA_VERSION));
  if (!okWrites) return fail(backend, 'تعذر كتابة مفاتيح V2');

  const result = { state: 'done', at: new Date().toISOString(), counts };
  if (!setRaw(backend, KEYS.migration, JSON.stringify(result))) return fail(backend, 'تعذر كتابة علامة الإنجاز');
  return result;
}

/** استعادة مفاتيح V1 من النسخة الداخلية وإلغاء مفاتيح V2. لا تحذف النسخة الاحتياطية نفسها. */
export function restoreLegacyFromBackup(backend) {
  const text = getRaw(backend, KEYS.backup);
  if (!text) return { ok: false, reason: 'لا توجد نسخة احتياطية' };
  let b;
  try {
    b = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'النسخة الاحتياطية تالفة' };
  }
  for (const [k, v] of Object.entries(b.keys || {})) {
    if (v === null) removeKey(backend, k);
    else setRaw(backend, k, v);
  }
  [KEYS.progress, KEYS.settings, KEYS.schema, KEYS.migration].forEach((k) => removeKey(backend, k));
  return { ok: true };
}
