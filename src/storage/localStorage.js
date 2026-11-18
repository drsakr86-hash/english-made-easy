// طبقة رفيعة فوق Storage (localStorage افتراضياً) تقبل بديلاً في الذاكرة للاختبار.
// على خلاف V1، تُرجع الكتابة true/false بدل ابتلاع الخطأ بصمت.
export function getRaw(backend, key) {
  try {
    return backend.getItem(key);
  } catch {
    return null;
  }
}

export function setRaw(backend, key, value) {
  try {
    backend.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeKey(backend, key) {
  try {
    backend.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function allKeys(backend) {
  const out = [];
  for (let i = 0; i < backend.length; i++) out.push(backend.key(i));
  return out;
}

export function createMemoryStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    get length() {
      return m.size;
    },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    dump: () => Object.fromEntries(m),
  };
}
