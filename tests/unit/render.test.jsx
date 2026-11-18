import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import App from '../../src/app/App.jsx';
import * as content from '../../src/data/legacy-content/index.js';
import { runMigration } from '../../src/storage/migration.js';
import { createMemoryStorage } from '../../src/storage/localStorage.js';

// يوازي Baseline B02–B06 وB07 وB17 على النسخة الجديدة (عرض على الخادم، بدون متصفح).
const render = (initial) => {
  const s = createMemoryStorage(initial);
  const migration = runMigration(s, content);
  return renderToString(<App backend={s} migration={migration} />).replaceAll('<!-- -->', '');
};
const cards = (html) => (html.match(/class="card/g) || []).length;

describe('العرض الأولي لكل وحدة', () => {
  const cases = [
    ['words', 132],
    ['expr', 60],
    ['idioms', 53],
    ['grammar', 19],
    ['compound', 34],
  ];
  for (const [tab, n] of cases) {
    it(`تبويب ${tab} يعرض ${n} بطاقة`, () => {
      expect(cards(render({ tab: JSON.stringify(tab) }))).toBe(n);
    });
  }

  it('يعرض التقدم المرحَّل من V1 (3 من 132 كلمة)', () => {
    const html = render({ k_words: JSON.stringify(['achieve', 'improve', 'therefore']), tab: JSON.stringify('words') });
    expect(html).toContain('أتقنت 3 من 132');
    expect((html.match(/✅/g) || []).length).toBe(3);
  });

  it('يُفتح آخر تبويب محفوظ في V1', () => {
    expect(render({ tab: JSON.stringify('grammar') })).toContain('أنهيت 0 من 19 درساً');
  });

  it('الرئيسية افتراضية لمستخدم جديد وتعرض أصفاراً حقيقية بلا أرقام وهمية', () => {
    const html = render({});
    expect(html).toContain('التقدم العام: 0%');
    expect(html).toContain('أيام الالتزام المتتالية: <b>0</b>');
    expect(html).toContain('لا يوجد نشاط بعد');
    expect(html).toContain('لم يُحدَّد بعد');
  });

  it('الرئيسية تعرض التقدم المرحَّل من V1', () => {
    const html = render({ k_words: JSON.stringify(['achieve', 'improve']), k_grammar: JSON.stringify(['الماضي البسيط Past Simple']) });
    expect(html).toContain('الكلمات المتقنة: <b>2</b> من 132');
    expect(html).toContain('الدروس المكتملة: <b>1</b> من 19');
    expect(html).toContain('التقدم العام: ' + Math.round((3 / 264) * 100) + '%');
  });

  const done = { 'eme.migration': JSON.stringify({ state: 'done', at: '2026-01-01T00:00:00.000Z' }) };
  const result = (at) => JSON.stringify({ version: 1, results: [{ at, level: 'B1', perLevel: { A1: { correct: 5, answered: 6, total: 6, passed: true }, A2: { correct: 7, answered: 9, total: 9, passed: true }, B1: { correct: 4, answered: 6, total: 6, passed: true }, B2: { correct: 2, answered: 9, total: 9, passed: false }, C1: { correct: 1, answered: 6, total: 6, passed: false }, C2: { correct: 0, answered: 0, total: 6, passed: false } }, perSkill: { vocabulary: { correct: 8, answered: 18 } } }] });

  it('تبويب مستواي لمستخدم جديد: شرح وزر بدء وتنبيه أنه تقديري', () => {
    const html = render({ ...done, 'eme.settings': JSON.stringify({ tab: 'placement' }) });
    expect(html).toContain('اختبار تحديد المستوى');
    expect(html).toContain('ابدأ الاختبار');
    expect(html).toContain('ليست شهادة رسمية');
  });

  it('بعد نتيجة قديمة (أكثر من 7 أيام) تظهر النتيجة وزر الإعادة', () => {
    const html = render({ ...done, 'eme.settings': JSON.stringify({ tab: 'placement' }), 'eme.placement': result('2020-01-01T10:00:00.000Z') });
    expect(html).toContain('>إعادة الاختبار<');
    expect(html).toContain('>B1<');
    expect(html).toContain('لم يُعرض');
  });

  it('نتيجة حديثة تمنع الإعادة وتعرض موعدها', () => {
    const html = render({ ...done, 'eme.settings': JSON.stringify({ tab: 'placement' }), 'eme.placement': result(new Date().toISOString()) });
    expect(html).not.toContain('>إعادة الاختبار<');
    expect(html).toContain('يمكنك إعادة الاختبار بعد');
  });

  it('الرئيسية تعرض المستوى المحفوظ', () => {
    const html = render({ ...done, 'eme.placement': result('2020-01-01T10:00:00.000Z') });
    expect(html).toContain('مستواك التقديري: <b>B1 (متوسط)</b>');
  });

  it('تبويب المراجعة يعرض حالة فارغة لمستخدم جديد', () => {
    const html = render({ 'eme.migration': JSON.stringify({ state: 'done', at: '2026-01-01T00:00:00.000Z' }), 'eme.settings': JSON.stringify({ tab: 'review' }) });
    expect(html).toContain('مراجعات اليوم: 0');
    expect(html).toContain('تبدأ العناصر بالدخول هنا');
  });

  it('عند فشل الترحيل يظهر تنبيه ولا يُفقد شيء', () => {
    const html = render({ k_words: '{bad' });
    expect(html).toContain('تعذر ترحيل بياناتك القديمة');
  });
});
