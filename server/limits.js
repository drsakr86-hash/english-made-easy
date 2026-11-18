// حدود الاستخدام: نافذة زمنية لكل عنوان + سقف يومي عام (لضبط التكلفة). الذاكرة فقط.
export function createLimiter({ perMinute = 20, perDay = 1000, now = () => Date.now() } = {}) {
  const hits = new Map();
  let day = { key: '', n: 0 };
  return {
    check(ip) {
      const t = now();
      const dk = new Date(t).toISOString().slice(0, 10);
      if (day.key !== dk) day = { key: dk, n: 0 };
      if (day.n >= perDay) return { ok: false, reason: 'daily_cap' };
      const arr = (hits.get(ip) || []).filter((x) => t - x < 60000);
      if (arr.length >= perMinute) { hits.set(ip, arr); return { ok: false, reason: 'rate_limited' }; }
      arr.push(t);
      hits.set(ip, arr);
      day.n++;
      return { ok: true };
    },
  };
}
