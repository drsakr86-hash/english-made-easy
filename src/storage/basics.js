import { getRaw, setRaw } from './localStorage.js';
import { KEYS } from './keys.js';

/** الدروس الأساسية المكتملة: { done: ['b-001', ...] }. التالف يُهمل بصمت. */
export function loadBasics(backend) {
  try {
    const v = JSON.parse(getRaw(backend, KEYS.basics) || 'null');
    return { done: Array.isArray(v && v.done) ? [...new Set(v.done.filter((x) => typeof x === 'string' && /^b-\d+$/.test(x)))] : [] };
  } catch {
    return { done: [] };
  }
}
export const saveBasics = (backend, state) => setRaw(backend, KEYS.basics, JSON.stringify({ done: state.done }));
