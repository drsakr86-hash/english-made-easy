import { getRaw, setRaw } from './localStorage.js';
import { KEYS } from './keys.js';
import { LEVELS } from '../data/placement/questions.js';

const LEVEL_VALUES = ['Pre-A1', ...LEVELS];
const validResult = (r) =>
  r && typeof r === 'object' && LEVEL_VALUES.includes(r.level) && !Number.isNaN(Date.parse(r.at)) && r.perLevel && typeof r.perLevel === 'object';

/** كل النتائج (الأقدم أولاً). السجل التالف يُتجاهل دون إسقاط الباقي. */
export function loadPlacements(backend) {
  try {
    const raw = getRaw(backend, KEYS.placement);
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v.results) ? v.results.filter(validResult) : [];
  } catch {
    return [];
  }
}

export const latestPlacement = (results) => (results.length ? results[results.length - 1] : null);

export function addPlacement(backend, result) {
  const all = loadPlacements(backend);
  return setRaw(backend, KEYS.placement, JSON.stringify({ version: 1, results: [...all, result] }));
}
