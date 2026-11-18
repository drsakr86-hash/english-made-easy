// عميل المدرس: يتحدث مع الخادم الوسيط فقط (لا مفاتيح ولا مزود هنا). أي فشل يرجع {ok:false,error} ولا يرمي.
import { parseTutorReply } from './prompts.js';

export const ERROR_TEXT = {
  not_configured: 'المدرس الذكي غير مفعّل بعد: لم يُضبط عنوان الخادم الوسيط. باقي التطبيق يعمل كالمعتاد.',
  offline: 'لا يوجد اتصال بالإنترنت. حاول لاحقاً.',
  timeout: 'استغرق الرد وقتاً طويلاً. أعد المحاولة.',
  rate_limited: 'عدد الطلبات كبير. انتظر دقيقة ثم أعد المحاولة.',
  daily_cap: 'وصل الخادم إلى حد الاستخدام اليومي. حاول غداً.',
  provider_error: 'تعذر الحصول على رد من المدرس الآن. أعد المحاولة بعد قليل.',
  bad_response: 'جاء رد غير مفهوم من الخادم. أعد المحاولة.',
  forbidden_origin: 'الخادم لا يسمح بهذا الموقع.',
  network: 'تعذر الوصول إلى الخادم.',
  server_error: 'حدث خطأ في الخادم. أعد المحاولة.',
};
export const DEFAULT_ENDPOINT = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_AI_ENDPOINT) || '';
export const errorText = (code) => ERROR_TEXT[code] || ERROR_TEXT.server_error;

/** يقبل http فقط لـ localhost، وhttps لغير ذلك. */
export function validEndpoint(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || (u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname));
  } catch {
    return false;
  }
}

export function createTutorClient({ endpoint, fetchImpl = (...a) => fetch(...a), timeoutMs = 25000, isOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false) }) {
  const base = String(endpoint || '').replace(/\/+$/, '');
  return {
    configured: !!base && validEndpoint(base),
    async chat(payload) {
      if (!base || !validEndpoint(base)) return { ok: false, error: 'not_configured' };
      if (!isOnline()) return { ok: false, error: 'offline' };
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), timeoutMs);
      try {
        const res = await fetchImpl(base + '/api/tutor/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: ctl.signal });
        let data = null;
        try { data = await res.json(); } catch { data = null; }
        if (!res.ok) return { ok: false, error: (data && typeof data.error === 'string' && ERROR_TEXT[data.error] ? data.error : res.status === 429 ? 'rate_limited' : 'server_error') };
        if (!data || typeof data.reply !== 'string') return { ok: false, error: 'bad_response' };
        const r = parseTutorReply(JSON.stringify({ reply: data.reply, corrections: data.corrections, newWords: data.newWords }), 5);
        return { ok: true, ...r };
      } catch (e) {
        return { ok: false, error: e && e.name === 'AbortError' ? 'timeout' : 'network' };
      } finally {
        clearTimeout(t);
      }
    },
    async health() {
      if (!base || !validEndpoint(base)) return false;
      try {
        const res = await fetchImpl(base + '/api/tutor/health');
        return res.ok;
      } catch {
        return false;
      }
    },
  };
}
