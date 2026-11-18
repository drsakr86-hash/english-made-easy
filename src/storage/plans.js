import { getRaw, setRaw } from './localStorage.js';
import { KEYS } from './keys.js';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const validTask = (t) => t && typeof t.id === 'string' && typeof t.kind === 'string' && Array.isArray(t.itemIds) && ['pending', 'done'].includes(t.status) && Number.isInteger(t.minutes);
const validPlan = (p, key) => p && p.date === key && Number.isInteger(p.minutes) && Array.isArray(p.tasks) && p.tasks.every(validTask);

/** { 'YYYY-MM-DD': plan } — الخطط التالفة تُتجاهل دون إسقاط الباقي. */
export function loadPlans(backend) {
  try {
    const raw = getRaw(backend, KEYS.plans);
    if (!raw) return {};
    const v = JSON.parse(raw);
    const days = v && v.days && typeof v.days === 'object' ? v.days : {};
    return Object.fromEntries(Object.entries(days).filter(([k, p]) => DAY_RE.test(k) && validPlan(p, k)));
  } catch {
    return {};
  }
}

export const savePlans = (backend, days) => setRaw(backend, KEYS.plans, JSON.stringify({ version: 1, days }));

export function loadPlanMinutes(backend) {
  try {
    const m = JSON.parse(getRaw(backend, KEYS.settings) || '{}').planMinutes;
    return [15, 30, 45].includes(m) ? m : 30;
  } catch {
    return 30;
  }
}

export function savePlanMinutes(backend, minutes) {
  let s = {};
  try {
    s = JSON.parse(getRaw(backend, KEYS.settings) || '{}');
  } catch {
    /* نبدأ من فارغ */
  }
  return setRaw(backend, KEYS.settings, JSON.stringify({ ...s, planMinutes: minutes }));
}
