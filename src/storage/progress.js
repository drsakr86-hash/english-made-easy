import { getRaw, setRaw } from './localStorage.js';
import { KEYS, PROGRESS_SECTIONS } from './keys.js';

export function emptyProgress() {
  return Object.fromEntries(PROGRESS_SECTIONS.map((s) => [s, []]));
}

export function loadProgress(backend) {
  try {
    const raw = getRaw(backend, KEYS.progress);
    if (!raw) return emptyProgress();
    const v = JSON.parse(raw);
    const out = emptyProgress();
    for (const s of PROGRESS_SECTIONS) if (Array.isArray(v[s])) out[s] = v[s];
    return out;
  } catch {
    return emptyProgress();
  }
}

export function loadUnmatched(backend) {
  try {
    return JSON.parse(getRaw(backend, KEYS.progress) || '{}').unmatched || {};
  } catch {
    return {};
  }
}

/** يحافظ على حقل unmatched كما هو ويستبدل المعرّفات فقط. */
export function saveProgress(backend, progress) {
  let unmatched = {};
  try {
    unmatched = JSON.parse(getRaw(backend, KEYS.progress) || '{}').unmatched || {};
  } catch {
    /* نبدأ من فارغ */
  }
  return setRaw(backend, KEYS.progress, JSON.stringify({ ...progress, unmatched }));
}

export function loadTab(backend) {
  try {
    const t = JSON.parse(getRaw(backend, KEYS.settings) || '{}').tab;
    return ['words', 'expressions', 'idioms', 'grammar', 'compound', 'review'].includes(t) ? t : 'words';
  } catch {
    return 'words';
  }
}

export function saveTab(backend, tab) {
  let s = {};
  try {
    s = JSON.parse(getRaw(backend, KEYS.settings) || '{}');
  } catch {
    /* نبدأ من فارغ */
  }
  return setRaw(backend, KEYS.settings, JSON.stringify({ ...s, tab }));
}
