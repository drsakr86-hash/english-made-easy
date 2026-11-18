import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { extractV1, findDroppedDuplicates } from '../../scripts/lib/extractV1.mjs';
import * as content from '../../src/data/legacy-content/index.js';
import snapshot from '../fixtures/v1-snapshot.json';

const html = fs.readFileSync(path.resolve(import.meta.dirname, '../../legacy/English Made Easy.v1.html'), 'utf8');
const live = extractV1(html);

describe('تكافؤ المحتوى مع V1', () => {
  it('الأعداد مطابقة للقطة', () => {
    // V1 يعرض 131؛ الدفعة 2 تستعيد improve الثانية بمعرّف جديد في آخر القائمة فيصبح 132
    expect(content.words.length).toBe(snapshot.counts.words + snapshot.droppedByV1Dedupe.length);
    expect(content.expressions.length).toBe(snapshot.counts.expressions);
    expect(content.idioms.length).toBe(snapshot.counts.idioms);
    expect(content.grammar.length).toBe(snapshot.counts.grammar);
    expect(content.grammar.reduce((n, g) => n + g.questions.length, 0)).toBe(snapshot.counts.grammarQuestions);
    expect(content.compound.length).toBe(snapshot.counts.compound);
  });

  it('أعداد V1 الموثقة في تقرير المرحلة صفر (الكلمات 131 + المستعادة)', () => {
    expect([content.words.length - 1, content.expressions.length, content.idioms.length, content.grammar.length, content.compound.length])
      .toEqual([131, 60, 53, 19, 34]);
  });

  for (const key of ['words', 'expressions', 'idioms']) {
    it(`${key}: النصوص والترتيب مطابقة لملف V1 مباشرة`, () => {
      const items = content[key].slice(0, live[key].length);
      expect(items.map(({ en, ar, ex, exAr }) => ({ en, ar, ex, exAr }))).toEqual(live[key]);
      expect(content[key].length - live[key].length).toBe(key === 'words' ? 1 : 0);
    });
  }

  it('grammar: العناوين والشرح والأسئلة والإجابات مطابقة', () => {
    expect(content.grammar.map((g) => ({ t: g.title, r: g.rule, q: g.questions.map((x) => [x.q, x.options, x.answer]) })))
      .toEqual(live.grammar.map((g) => ({ t: g.t, r: g.r, q: g.q })));
  });

  it('compound: الجمل والخيارات والإجابات والملاحظات مطابقة', () => {
    expect(content.compound.map((c) => ({ en: c.en, ar: c.ar, o: c.options, a: c.answer, n: c.note }))).toEqual(live.compound);
  });

  it('المعرّفات فريدة وثابتة الصيغة، وlegacyKey فريد داخل كل وحدة', () => {
    const all = Object.values(content).flat();
    const ids = all.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const key of ['words', 'expressions', 'idioms', 'grammar']) {
      const keys = content[key].map((x) => x.legacyKey).filter((k) => k !== null);
      expect(new Set(keys).size).toBe(keys.length);
    }
    expect(content.words[0].id).toBe('w-001');
    expect(content.words[130].id).toBe('w-131');
    expect(content.words[131].id).toBe('w-132');
  });

  it('كل سؤال قواعد وجمل مركبة إجابته داخل نطاق الخيارات، والخيارات غير مكررة', () => {
    for (const g of content.grammar) for (const q of g.questions) expect(q.options[q.answer]).toBeDefined();
    for (const c of content.compound) {
      expect(c.options[c.answer]).toBeDefined();
      expect(new Set(c.options).size).toBe(c.options.length);
    }
  });

  it('improve الثانية (يتحسن) مستعادة بمعرّف جديد وبلا legacyKey ولا تغيّر الأولى', () => {
    const [a, b] = content.words.filter((w) => w.en === 'improve');
    expect([a.id, a.ar, a.legacyKey]).toEqual(['w-002', 'يُحسّن', 'improve']);
    expect([b.id, b.ar, b.legacyKey, b.ex]).toEqual(['w-132', 'يتحسن', null, 'His health is improving.']);
  });

  it('العنصر الوحيد الذي أسقطه V1 مسجّل: improve / يتحسن', () => {
    expect(findDroppedDuplicates(html).map((d) => d.ar)).toEqual(['يتحسن']);
    expect(snapshot.droppedByV1Dedupe.map((d) => d.en)).toEqual(['improve']);
    expect(content.words.filter((w) => w.en === 'improve')).toHaveLength(2);
  });
});
