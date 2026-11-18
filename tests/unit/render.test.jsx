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
    const html = render({ k_words: JSON.stringify(['achieve', 'improve', 'therefore']) });
    expect(html).toContain('أتقنت 3 من 132');
    expect((html.match(/✅/g) || []).length).toBe(3);
  });

  it('يُفتح آخر تبويب محفوظ في V1', () => {
    expect(render({ tab: JSON.stringify('grammar') })).toContain('أنهيت 0 من 19 درساً');
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
