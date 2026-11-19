import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { addLearner, listLearners, revokeLearner, revokedLine, loadRegistry } from '../../scripts/learners.mjs';
import { verifyToken } from '../../server/auth.js';

const SECRET = 'k'.repeat(40);
const file = () => join(mkdtempSync(join(tmpdir(), 'eme-l-')), 'learners.json');
const T0 = Date.UTC(2026, 10, 19, 10);

describe('سجل المتعلمين', () => {
  it('الإضافة تُصدر رمزاً صالحاً ولا تحفظ الرمز في الملف', () => {
    const f = file();
    const t = addLearner(f, { secret: SECRET, label: 'أحمد', days: 10, now: T0 });
    expect(verifyToken(t.token, { secrets: [SECRET], now: T0 }).sub).toBe(t.id);
    const raw = readFileSync(f, 'utf8');
    expect(raw).toContain(t.id);
    expect(raw).not.toContain(t.token);
    expect(raw).not.toContain(SECRET);
  });
  it('القائمة تُظهر الحالة: فعّال، منتهٍ، مُبطَل', () => {
    const f = file();
    addLearner(f, { secret: SECRET, label: 'أ', days: 1, now: T0 });
    const b = addLearner(f, { secret: SECRET, label: 'ب', days: 30, now: T0 });
    addLearner(f, { secret: SECRET, label: 'ج', days: 30, now: T0 });
    revokeLearner(f, b.id, T0);
    const s = listLearners(f, T0 + 2 * 86400e3).map((l) => [l.label, l.status]);
    expect(s).toEqual([['أ', 'منتهٍ'], ['ب', 'مُبطَل'], ['ج', 'فعّال']]);
  });
  it('الإبطال بالاسم أو المعرّف، ويطبع سطر Render للمُبطَلين غير المنتهين فقط', () => {
    const f = file();
    const a = addLearner(f, { secret: SECRET, label: 'أحمد', now: T0 });
    const b = addLearner(f, { secret: SECRET, label: 'منى', days: 1, now: T0 });
    revokeLearner(f, 'أحمد', T0);
    revokeLearner(f, b.id, T0);
    expect(revokedLine(f, T0)).toBe(`REVOKED_TOKEN_IDS=${a.id},${b.id}`);
    expect(revokedLine(f, T0 + 2 * 86400e3)).toBe(`REVOKED_TOKEN_IDS=${a.id}`);
  });
  it('اسم غير موجود أو مكرر يُرفض دون تغيير', () => {
    const f = file();
    addLearner(f, { secret: SECRET, label: 'س', now: T0 });
    addLearner(f, { secret: SECRET, label: 'س', now: T0 });
    const before = readFileSync(f, 'utf8');
    expect(() => revokeLearner(f, 'غير موجود')).toThrow();
    expect(() => revokeLearner(f, 'س')).toThrow(/more than one/);
    expect(readFileSync(f, 'utf8')).toBe(before);
  });
  it('الاسم مطلوب، والسر القصير يُرفض دون إنشاء ملف', () => {
    const f = file();
    expect(() => addLearner(f, { secret: SECRET, label: '  ' })).toThrow();
    expect(() => addLearner(f, { secret: 'short', label: 'x' })).toThrow();
    expect(loadRegistry(f).learners).toEqual([]);
  });
  it('ملف تالف لا يُستبدل بفارغ', () => {
    const f = file();
    writeFileSync(f, '{broken');
    expect(() => addLearner(f, { secret: SECRET, label: 'x' })).toThrow();
    expect(readFileSync(f, 'utf8')).toBe('{broken');
  });
});
