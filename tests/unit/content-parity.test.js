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
    expect(content.words.length).toBe(snapshot.counts.words);
    expect(content.expressions.length).toBe(snapshot.counts.expressions);
    expect(content.idioms.length).toBe(snapshot.counts.idioms);
    expect(content.grammar.length).toBe(snapshot.counts.grammar);
    expect(content.grammar.reduce((n, g) => n + g.questions.length, 0)).toBe(snapshot.counts.grammarQuestions);
    expect(content.compound.length).toBe(snapshot.counts.compound);
  });

  it('أعداد V1 الموثقة في تقرير المرحلة صفر', () => {
    expect([content.words.length, content.expressions.length, content.idioms.length, content.grammar.length, content.compound.length])
      .toEqual([131, 60, 53, 19, 34]);
  });

  for (const key of ['words', 'expressions', 'idioms']) {
    it(`${key}: النصوص والترتيب مطابقة لملف V1 مباشرة`, () => {
      expect(content[key].map(({ en, ar, ex, exAr }) => ({ en, ar, ex, exAr }))).toEqual(live[key]);
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
      const keys = content[key].map((x) => x.legacyKey);
      expect(new Set(keys).size).toBe(keys.length);
    }
    expect(content.words[0].id).toBe('w-001');
    expect(content.words.at(-1).id).toBe('w-131');
  });

  it('كل سؤال قواعد وجمل مركبة إجابته داخل نطاق الخيارات، والخيارات غير مكررة', () => {
    for (const g of content.grammar) for (const q of g.questions) expect(q.options[q.answer]).toBeDefined();
    for (const c of content.compound) {
      expect(c.options[c.answer]).toBeDefined();
      expect(new Set(c.options).size).toBe(c.options.length);
    }
  });

  it('العنصر الوحيد الذي أسقطه V1 مسجّل: improve / يتحسن', () => {
    expect(findDroppedDuplicates(html).map((d) => d.ar)).toEqual(['يتحسن']);
    expect(snapshot.droppedByV1Dedupe.map((d) => d.en)).toEqual(['improve']);
    expect(content.words.filter((w) => w.en === 'improve')).toHaveLength(1);
  });
});
