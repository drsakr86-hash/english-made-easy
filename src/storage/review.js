import { getRaw, setRaw } from './localStorage.js';
import { KEYS } from './keys.js';

const REQUIRED = ['itemId', 'firstLearnedAt', 'nextReviewAt', 'correctCount', 'incorrectCount', 'masteryLevel', 'reviewInterval', 'reviewHistory'];
const valid = (r) => r && typeof r === 'object' && REQUIRED.every((k) => k in r) && Array.isArray(r.reviewHistory) && !Number.isNaN(Date.parse(r.nextReviewAt));

/** يقرأ سجلات المراجعة ويتجاهل أي سجل تالف دون إسقاط الباقي. */
export function loadReview(backend) {
  try {
    const raw = getRaw(backend, KEYS.review);
    if (!raw) return {};
    const v = JSON.parse(raw);
    const items = v && typeof v.items === 'object' && v.items ? v.items : {};
    return Object.fromEntries(Object.entries(items).filter(([id, r]) => valid(r) && r.itemId === id));
  } catch {
    return {};
  }
}

export function saveReview(backend, items) {
  return setRaw(backend, KEYS.review, JSON.stringify({ version: 1, items }));
}
