import { createMemoryStorage } from '../../src/storage/localStorage.js';

/**
 * تخزين في الذاكرة مع حقن أعطال للاختبار.
 * faults:
 *  - failSetCalls: أرقام استدعاءات setItem (تبدأ من 1) التي تُرمى عندها QuotaExceeded
 *  - failRemoveCalls: أرقام استدعاءات removeItem التي تُرمى
 *  - failSetKeys / failRemoveKeys / failGetKeys: مفاتيح تفشل دائماً
 *  - silentDropKeys: مفاتيح تتجاهل الكتابة بصمت دون رمي خطأ (لاختبار التحقق بعد الكتابة)
 *  - quota: حد أقصى لمجموع أحرف المفاتيح والقيم
 */
export function createFaultyStorage(initial = {}, faults = {}) {
  const base = createMemoryStorage(initial);
  const f = {
    failSetCalls: [],
    failRemoveCalls: [],
    failSetKeys: [],
    failRemoveKeys: [],
    failGetKeys: [],
    silentDropKeys: [],
    quota: Infinity,
    ...faults,
  };
  const counters = { set: 0, remove: 0, setLog: [] };
  const size = () => Object.entries(base.dump()).reduce((n, [k, v]) => n + k.length + v.length, 0);
  const quotaErr = () => Object.assign(new Error('QuotaExceededError'), { name: 'QuotaExceededError' });
  return {
    get length() {
      return base.length;
    },
    key: (i) => base.key(i),
    getItem(k) {
      if (f.failGetKeys.includes(k)) throw new Error('SecurityError');
      return base.getItem(k);
    },
    setItem(k, v) {
      counters.set += 1;
      counters.setLog.push(k);
      if (f.failSetCalls.includes(counters.set) || f.failSetKeys.includes(k)) throw quotaErr();
      if (f.silentDropKeys.includes(k)) return;
      const old = base.getItem(k);
      const next = size() - (old === null ? 0 : k.length + old.length) + k.length + String(v).length;
      if (next > f.quota) throw quotaErr();
      base.setItem(k, v);
    },
    removeItem(k) {
      counters.remove += 1;
      if (f.failRemoveCalls.includes(counters.remove) || f.failRemoveKeys.includes(k)) throw new Error('remove failed');
      base.removeItem(k);
    },
    dump: () => base.dump(),
    counters,
  };
}
