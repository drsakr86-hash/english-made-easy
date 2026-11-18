import { allKeys, getRaw, setRaw } from './localStorage.js';

const FORMAT = 'eme-backup';
const isOurs = (k) => k.startsWith('eme.') || k === 'tab' || k.startsWith('k_');

/** نص JSON لكل مفاتيح التطبيق (V1 وV2) للتنزيل. */
export function exportBackup(backend) {
  const entries = {};
  for (const k of allKeys(backend)) if (isOurs(k)) entries[k] = getRaw(backend, k);
  return JSON.stringify({ format: FORMAT, version: 1, at: new Date().toISOString(), entries }, null, 1);
}

/** يتحقق من الملف ثم يكتبه. لا يكتب شيئاً إن كان غير صالح. */
export function importBackup(backend, text) {
  let b;
  try {
    b = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'الملف ليس JSON صالحاً' };
  }
  if (!b || b.format !== FORMAT || typeof b.entries !== 'object' || b.entries === null) {
    return { ok: false, reason: 'الملف ليس نسخة احتياطية من English Made Easy' };
  }
  const keys = Object.keys(b.entries);
  if (!keys.every((k) => isOurs(k) && typeof b.entries[k] === 'string')) {
    return { ok: false, reason: 'الملف يحتوي مفاتيح غير مقبولة' };
  }
  for (const k of keys) if (!setRaw(backend, k, b.entries[k])) return { ok: false, reason: 'تعذر الكتابة في التخزين' };
  return { ok: true, count: keys.length };
}
