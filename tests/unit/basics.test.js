import { describe, it, expect } from 'vitest';
import { basics } from '../../src/data/basics/basics.js';
import * as content from '../../src/data/legacy-content/index.js';
import { reviewQuiz } from '../../src/modules/quiz.js';
import { itemName } from '../../src/engines/progress/intelligence.js';
import { loadBasics, saveBasics } from '../../src/storage/basics.js';
import { createMemoryStorage } from '../../src/storage/localStorage.js';

describe('دروس الأساسيات', () => {
  it('14 درساً بمعرّفات فريدة ثابتة b-001..b-014', () => {
    expect(basics.map((b) => b.id)).toEqual(Array.from({ length: 14 }, (_, i) => `b-${String(i + 1).padStart(3, '0')}`));
  });
  it('كل درس له شرح وأسئلة سليمة (الإجابة داخل الخيارات وبلا خيارات مكررة)', () => {
    for (const b of basics) {
      expect(b.title && b.rule).toBeTruthy();
      expect(b.questions.length).toBeGreaterThanOrEqual(3);
      for (const q of b.questions) {
        expect(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length, b.id + ' ' + q.q).toBe(true);
        expect(new Set(q.options).size).toBe(q.options.length);
      }
      for (const x of b.items || []) expect(x.en && x.ar && x.say).toBeTruthy();
    }
  });
  it('الحروف: 26 حرفاً بنطق لكل منها', () => {
    expect(basics[0].items).toHaveLength(26);
  });
  it('تدخل المراجعة المتباعدة: reviewQuiz يبني سؤالاً من درس أساسي واسمه يظهر في التقارير', () => {
    const [q] = reviewQuiz(['b-003'], content, () => 0.1);
    expect(q.itemId).toBe('b-003');
    expect(q.opts[q.a]).toBeTruthy();
    expect(itemName('b-003', content, null)).toBe(basics[2].title);
  });
  it('التخزين: يحفظ ويقرأ، ويُهمل التالف والمعرّفات الغريبة', () => {
    const be = createMemoryStorage();
    expect(loadBasics(be).done).toEqual([]);
    saveBasics(be, { done: ['b-001', 'b-002'] });
    expect(loadBasics(be).done).toEqual(['b-001', 'b-002']);
    be.setItem('eme.basics', JSON.stringify({ done: ['b-001', 'x', 5, 'b-001'] }));
    expect(loadBasics(be).done).toEqual(['b-001']);
    be.setItem('eme.basics', '{bad');
    expect(loadBasics(be).done).toEqual([]);
  });
});
