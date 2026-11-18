import { getRaw, setRaw } from './localStorage.js';
import { KEYS } from './keys.js';
import { emptySkills, emptyUserWords } from '../engines/skills/skills.js';

const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

export function loadSkills(backend) {
  try {
    const raw = getRaw(backend, KEYS.skills);
    if (!raw) return emptySkills();
    const v = JSON.parse(raw);
    return {
      reading: obj(v.reading),
      listening: obj(v.listening),
      writing: obj(v.writing),
      submissions: Array.isArray(v.submissions) ? v.submissions.filter((s) => s && typeof s.id === 'string' && typeof s.text === 'string' && typeof s.taskId === 'string') : [],
      log: Array.isArray(v.log) ? v.log.filter((e) => e && typeof e.kind === 'string' && typeof e.at === 'string') : [],
    };
  } catch {
    return emptySkills();
  }
}
export const saveSkills = (backend, s) => setRaw(backend, KEYS.skills, JSON.stringify({ version: 1, ...s }));

export function loadUserWords(backend) {
  try {
    const raw = getRaw(backend, KEYS.userwords);
    if (!raw) return emptyUserWords();
    const v = JSON.parse(raw);
    const items = Object.fromEntries(Object.entries(obj(v.items)).filter(([id, x]) => /^u-\d{3,}$/.test(id) && x && x.id === id && typeof x.en === 'string' && typeof x.ar === 'string'));
    const max = Object.keys(items).reduce((m, id) => Math.max(m, Number(id.slice(2))), 0);
    return { items, next: Math.max(Number.isInteger(v.next) ? v.next : 1, max + 1) };
  } catch {
    return emptyUserWords();
  }
}
export const saveUserWords = (backend, u) => setRaw(backend, KEYS.userwords, JSON.stringify({ version: 1, ...u }));
