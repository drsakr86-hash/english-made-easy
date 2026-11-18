import { getRaw, setRaw } from './localStorage.js';
import { KEYS } from './keys.js';
import { emptyActivity } from '../engines/progress/progress.js';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function loadActivity(backend) {
  try {
    const raw = getRaw(backend, KEYS.activity);
    if (!raw) return emptyActivity();
    const v = JSON.parse(raw);
    const days = {};
    if (v && v.days && typeof v.days === 'object') {
      for (const [k, n] of Object.entries(v.days)) if (DAY_RE.test(k) && Number.isInteger(n) && n > 0) days[k] = n;
    }
    const last = v && v.last && typeof v.last.at === 'string' && !Number.isNaN(Date.parse(v.last.at)) ? v.last : null;
    return { days, last };
  } catch {
    return emptyActivity();
  }
}

export function saveActivity(backend, state) {
  return setRaw(backend, KEYS.activity, JSON.stringify({ version: 1, ...state }));
}
