import { describe, it, expect } from 'vitest';
import { scan } from '../../scripts/security-scan.mjs';
import { exportBackup, importBackup } from '../../src/storage/backup.js';
import { createMemoryStorage } from '../../src/storage/localStorage.js';

describe('الأمان', () => {
  it('الواجهة (src) بلا أسرار ولا عناوين مزودي AI ولا eval', () => {
    const r = scan(['src']);
    expect(r.files).toBeGreaterThan(30);
    expect(r.bad).toEqual([]);
  });
  it('الفاحص يكشف المخالفات فعلاً (اختبار سلبي)', async () => {
    const { mkdtempSync, writeFileSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const d = mkdtempSync(join(tmpdir(), 'scan-'));
    writeFileSync(join(d, 'a.js'), "const k='sk-ABCDEFGHIJKLMNOPQRSTUV'; fetch('https://api.anthropic.com/v1/messages')");
    const r = scan([d]);
    expect(r.bad.length).toBeGreaterThanOrEqual(2);
  });
});

describe('النسخ الاحتياطي يشمل كل بيانات V2.5 وV3', () => {
  it('تصدير ثم مسح ثم استيراد يعيد المفاتيح الجديدة كما هي', () => {
    const keys = ['eme.skills', 'eme.userwords', 'eme.tutor', 'eme.plans', 'eme.review', 'eme.settings', 'k_words'];
    const src = createMemoryStorage(Object.fromEntries(keys.map((k) => [k, JSON.stringify({ marker: k })])));
    const dump = exportBackup(src);
    const dst = createMemoryStorage();
    expect(importBackup(dst, dump).ok).toBe(true);
    for (const k of keys) expect(dst.getItem(k)).toBe(src.getItem(k));
  });
  it('ملف تالف أو غريب لا يكتب شيئاً', () => {
    const dst = createMemoryStorage({ 'eme.skills': 'keep' });
    expect(importBackup(dst, '{bad').ok).toBe(false);
    expect(importBackup(dst, JSON.stringify({ format: 'eme-backup', entries: { evil: 'x' } })).ok).toBe(false);
    expect(dst.getItem('eme.skills')).toBe('keep');
    expect(dst.getItem('evil')).toBeNull();
  });
});
