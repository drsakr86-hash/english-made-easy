// حدود الاستخدام لحماية الميزانية:
//  - perMinute: نافذة دقيقة لكل مفتاح (معرّف المستخدم الموثَّق)
//  - perUserDay: سقف يومي لكل مستخدم
//  - perDay: سقف يومي عام للتكلفة
//  - authFailPerMinute: حد محاولات الرموز الفاشلة لكل عنوان IP
// الحالة اليومية تُحفظ في ملف (persistPath) فتصمد أمام إعادة التشغيل العادية على الجهاز نفسه.
// قيود معروفة: الملف محلي لنسخة واحدة (لا يُشارَك بين نسخ)، وقرص الاستضافة المجاني قد يُمسح عند إعادة النشر.
// الذاكرة محدودة (maxKeys). إن كان الملف موجوداً لكن تالفاً نُغلق الخدمة لباقي اليوم (فشل آمن) بدل تصفير العدّاد.
import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const dayKey = (t) => new Date(t).toISOString().slice(0, 10);

export function createLimiter({
  perMinute = 20,
  perDay = 1000,
  perUserDay = Infinity,
  authFailPerMinute = 30,
  maxKeys = 10000,
  persistPath = null,
  now = () => Date.now(),
  log = () => {},
} = {}) {
  const hits = new Map(); // مفتاح -> أزمنة آخر دقيقة
  const failHits = new Map(); // IP -> أزمنة محاولات فاشلة
  let day = { key: '', n: 0, users: new Map() };
  let degraded = false; // ملف الحالة تالف: نرفض باقي اليوم
  let persistFailing = false;

  const rollDay = (t) => {
    const k = dayKey(t);
    if (day.key !== k) {
      day = { key: k, n: 0, users: new Map() };
      degraded = false;
    }
  };

  if (persistPath) {
    let text = null;
    try {
      text = readFileSync(persistPath, 'utf8');
    } catch (e) {
      if (e && e.code !== 'ENOENT') {
        degraded = true;
        log('limits state unreadable: closing for today');
      }
    }
    if (text !== null) {
      try {
        const s = JSON.parse(text);
        const ok = s && typeof s.day === 'string' && Number.isInteger(s.n) && s.n >= 0 && s.users && typeof s.users === 'object' && !Array.isArray(s.users);
        if (!ok) throw new Error('bad shape');
        if (s.day === dayKey(now())) {
          day = { key: s.day, n: s.n, users: new Map(Object.entries(s.users).filter(([, v]) => Number.isInteger(v) && v >= 0)) };
        }
      } catch {
        degraded = true;
        day = { key: dayKey(now()), n: 0, users: new Map() };
        log('limits state corrupt: closing for today');
      }
    }
  }

  const persist = () => {
    if (!persistPath) return;
    try {
      mkdirSync(dirname(persistPath), { recursive: true });
      const tmp = persistPath + '.tmp';
      writeFileSync(tmp, JSON.stringify({ day: day.key, n: day.n, users: Object.fromEntries(day.users) }));
      renameSync(tmp, persistPath);
      persistFailing = false;
    } catch {
      if (!persistFailing) log('limits state not persisted: counting in memory only');
      persistFailing = true;
    }
  };

  const prune = (map, t) => {
    if (map.size < maxKeys) return;
    for (const [k, arr] of map) if (!arr.length || t - arr[arr.length - 1] >= 60000) map.delete(k);
  };

  return {
    check(key) {
      const t = now();
      rollDay(t);
      if (degraded || day.n >= perDay) return { ok: false, reason: 'daily_cap' };
      if ((day.users.get(key) || 0) >= perUserDay) return { ok: false, reason: 'user_daily_cap' };
      const arr = (hits.get(key) || []).filter((x) => t - x < 60000);
      if (arr.length >= perMinute) {
        hits.set(key, arr);
        return { ok: false, reason: 'rate_limited' };
      }
      if (!hits.has(key)) {
        prune(hits, t);
        if (hits.size >= maxKeys) return { ok: false, reason: 'rate_limited' };
      }
      if (!day.users.has(key) && day.users.size >= maxKeys) return { ok: false, reason: 'daily_cap' };
      arr.push(t);
      hits.set(key, arr);
      day.n++;
      day.users.set(key, (day.users.get(key) || 0) + 1);
      persist();
      return { ok: true };
    },
    /** يسجّل محاولة رمز فاشلة من هذا العنوان. يُرجع { ok:false } إن تجاوز الحد (فيُرد 429 بدل 401). */
    authFailure(ip) {
      const t = now();
      const arr = (failHits.get(ip) || []).filter((x) => t - x < 60000);
      if (!failHits.has(ip)) {
        prune(failHits, t);
        if (failHits.size >= maxKeys) {
          // الذاكرة ممتلئة بعناوين نشطة: نرفض الجديد بدل التوسع بلا حد
          return { ok: false, reason: 'rate_limited' };
        }
      }
      arr.push(t);
      failHits.set(ip, arr);
      return arr.length > authFailPerMinute ? { ok: false, reason: 'rate_limited' } : { ok: true };
    },
    status() {
      rollDay(now());
      return { day: day.key, used: day.n, cap: perDay, users: day.users.size, degraded, persistFailing, keys: hits.size + failHits.size };
    },
  };
}
