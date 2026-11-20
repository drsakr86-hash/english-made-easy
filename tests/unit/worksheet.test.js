import { describe, it, expect } from 'vitest';
import * as content from '../../src/data/legacy-content/index.js';
import { blankOut, buildWorksheet, pickItems, seededRng } from '../../src/modules/worksheet.js';

describe('أوراق التدريب', () => {
  it('البذرة الثابتة تعطي نفس الترتيب', () => {
    const a = pickItems(content.words, { count: 10, random: true }, seededRng(5)).map((x) => x.id);
    const b = pickItems(content.words, { count: 10, random: true }, seededRng(5)).map((x) => x.id);
    const c = pickItems(content.words, { count: 10, random: true }, seededRng(6)).map((x) => x.id);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('غير المتقن فقط يستبعد المتقن، والعدد 0 يعني الكل', () => {
    const known = content.words.slice(0, 5).map((x) => x.id);
    const r = pickItems(content.words, { onlyNew: true, known, count: 0 });
    expect(r.length).toBe(content.words.length - 5);
    expect(r.some((x) => known.includes(x.id))).toBe(false);
  });

  it('ترجمة: الإجابات تطابق عناصر الأسئلة بالترتيب', () => {
    const items = content.words.slice(0, 8);
    const en = buildWorksheet({ section: 'words', kind: 'en2ar', items });
    expect(en.rows.map((r) => r.prompt)).toEqual(items.map((x) => x.en));
    expect(en.answers.map((a) => a.text)).toEqual(items.map((x) => x.ar));
    const ar = buildWorksheet({ section: 'idioms', kind: 'ar2en', items: content.idioms.slice(0, 4) });
    expect(ar.answers.map((a) => a.text)).toEqual(content.idioms.slice(0, 4).map((x) => x.en));
  });

  it('أكمل الجملة: الفراغ مكان الإجابة، وغير المطابق يُستبعد', () => {
    expect(blankOut('achieve', 'She worked hard to achieve her goal.')).toEqual({ text: 'She worked hard to __________ her goal.', answer: 'achieve' });
    expect(blankOut('decide', 'We decided to travel by train.').answer).toBe('decided');
    expect(blankOut('decide', 'Nothing here.')).toBeNull();
    const ws = buildWorksheet({ section: 'words', kind: 'fill', items: content.words });
    expect(ws.rows.length + ws.skipped).toBe(content.words.length);
    for (const [i, r] of ws.rows.entries()) {
      expect(r.prompt).toContain('__________');
      expect(r.prompt.replace('__________', ws.answers[i].text).toLowerCase()).toMatch(/[a-z]/);
    }
    expect(ws.bank.length).toBe(ws.rows.length);
  });

  it('جمل مركبة: الإجابة المطبوعة هي أداة الجملة الصحيحة حتى بعد خلط الخيارات', () => {
    const items = content.compound.slice(0, 12);
    const ws = buildWorksheet({ section: 'compound', kind: 'choose', items, rng: seededRng(3) });
    ws.rows.forEach((r, i) => {
      expect(r.options).toContain(ws.answers[i].text);
      expect(items[i].options[items[i].answer]).toBe(ws.answers[i].text);
      expect([...r.options].sort()).toEqual([...items[i].options].sort());
    });
    const w = buildWorksheet({ section: 'compound', kind: 'write', items });
    expect(w.rows[0].options).toBeUndefined();
  });

  it('قواعد: ترقيم متصل وإجابات صحيحة لكل سؤال', () => {
    const ws = buildWorksheet({ section: 'grammar', kind: 'quiz', items: content.grammar.slice(0, 3) });
    const qs = ws.rows.flatMap((l) => l.qs);
    expect(qs.map((q) => q.n)).toEqual(qs.map((_, i) => i + 1));
    expect(ws.answers.length).toBe(qs.length);
    const flat = content.grammar.slice(0, 3).flatMap((l) => l.questions);
    qs.forEach((q, i) => expect(ws.answers[i].text).toBe(flat[i].options[flat[i].answer]));
    expect(buildWorksheet({ section: 'basics', kind: 'quiz', items: content.basics.slice(0, 2) }).rows.length).toBe(2);
  });

  it('لا يغيّر المحتوى الأصلي', () => {
    const before = JSON.stringify(content.compound);
    buildWorksheet({ section: 'compound', kind: 'choose', items: content.compound });
    expect(JSON.stringify(content.compound)).toBe(before);
  });
});
