// حالات تخزين تمثل مستخدمين حقيقيين. تُبنى من المحتوى الفعلي حتى تبقى المعرّفات صحيحة.
import * as content from '../../src/data/legacy-content/index.js';
import { KEYS } from '../../src/storage/keys.js';

export const wordId = (en) => content.words.find((w) => w.en === en).id;

/** V1 فقط: مستخدم لم يفتح V2 بعد. */
export const v1Only = () => ({
  k_words: JSON.stringify(['achieve', 'improve', 'therefore']),
  k_expr: JSON.stringify(['Take your time.', 'By the way,']),
  k_idioms: JSON.stringify(['Piece of cake']),
  k_grammar: JSON.stringify(['الماضي البسيط Past Simple', 'الماضي المستمر Past Continuous']),
  k_compound: '0',
  tab: JSON.stringify('grammar'),
});

export const v2Progress = () => ({
  words: ['w-001', 'w-002', 'w-010'],
  expressions: [content.expressions[0].id],
  idioms: [content.idioms[0].id, content.idioms[1].id],
  grammar: [content.grammar[0].id],
  unmatched: { words: ['كلمة غير مطابقة'], expressions: [], idioms: [], grammar: [] },
});

const iso = '2026-11-01T10:00:00.000Z';

/** V2 كامل بكل المفاتيح (مع علامة ترحيل منجزة). تقدم V2 يختلف عن V1 عمداً. */
export const v2Full = () => ({
  [KEYS.schema]: '2',
  [KEYS.progress]: JSON.stringify(v2Progress()),
  [KEYS.settings]: JSON.stringify({ tab: 'words', planMinutes: 45, aiEndpoint: 'https://example.invalid/api' }),
  [KEYS.migration]: JSON.stringify({ state: 'done', at: iso, counts: {} }),
  [KEYS.review]: JSON.stringify({
    version: 1,
    items: {
      'w-001': { itemId: 'w-001', firstLearnedAt: iso, nextReviewAt: iso, correctCount: 2, incorrectCount: 0, masteryLevel: 2, reviewInterval: 3, reviewHistory: [{ at: iso, correct: true }] },
    },
  }),
  [KEYS.activity]: JSON.stringify({ version: 1, days: { '2026-11-01': 4 }, last: { at: iso } }),
  [KEYS.placement]: JSON.stringify({ version: 1, results: [] }),
  [KEYS.plans]: JSON.stringify({ version: 1, days: {} }),
  [KEYS.skills]: JSON.stringify({ version: 1, reading: {}, listening: {}, writing: {}, submissions: [], log: [] }),
  [KEYS.userwords]: JSON.stringify({ version: 1, items: {}, next: 1 }),
  [KEYS.tutor]: JSON.stringify({ version: 1, conversations: [], usage: { day: '', count: 0 } }),
  [KEYS.basics]: JSON.stringify({ done: ['b-001'] }),
});

/** V1 وV2 معاً بلا علامة ترحيل (العلامة ضاعت): أخطر حالة للاستبدال. */
export const v1AndV2NoMarker = () => {
  const s = { ...v1Only(), ...v2Full() };
  delete s[KEYS.migration];
  return s;
};
