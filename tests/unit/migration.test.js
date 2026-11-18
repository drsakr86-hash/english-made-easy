import { describe, it, expect } from 'vitest';
import * as content from '../../src/data/legacy-content/index.js';
import { runMigration, restoreLegacyFromBackup, readMigrationState, importLegacyDump } from '../../src/storage/migration.js';
import { createMemoryStorage } from '../../src/storage/localStorage.js';
import { KEYS } from '../../src/storage/keys.js';
import { loadProgress, saveProgress } from '../../src/storage/progress.js';
import { exportBackup, importBackup } from '../../src/storage/backup.js';

const v1State = () => ({
  k_words: JSON.stringify(['achieve', 'improve', 'therefore']),
  k_expr: JSON.stringify(['Take your time.', 'By the way,']),
  k_idioms: JSON.stringify(['Piece of cake']),
  k_grammar: JSON.stringify(['الماضي البسيط Past Simple', 'الماضي المستمر Past Continuous']),
  k_compound: '0',
  tab: JSON.stringify('grammar'),
});

describe('الترحيل', () => {
  it('ينقل التقدم بالمعرّفات ويطابق الأعداد قبل/بعد', () => {
    const s = createMemoryStorage(v1State());
    const r = runMigration(s, content);
    expect(r.state).toBe('done');
    expect(r.counts.before).toEqual({ words: 3, expressions: 2, idioms: 1, grammar: 2 });
    expect(r.counts.after).toEqual(r.counts.before);
    const p = loadProgress(s);
    expect(p.words).toEqual(['w-001', 'w-002', content.words.find((w) => w.en === 'therefore').id]);
    expect(p.grammar).toEqual(['g-003', 'g-012']);
  });

  it('لا يمسّ مفاتيح V1 إطلاقاً', () => {
    const before = v1State();
    const s = createMemoryStorage(before);
    runMigration(s, content);
    const d = s.dump();
    for (const [k, v] of Object.entries(before)) expect(d[k]).toBe(v);
  });

  it('آمن عند التكرار: التشغيل الثاني يُتخطى ولا يغيّر شيئاً', () => {
    const s = createMemoryStorage(v1State());
    runMigration(s, content);
    const snap1 = JSON.stringify(s.dump());
    const r2 = runMigration(s, content);
    expect(r2.state).toBe('skipped');
    expect(JSON.stringify(s.dump())).toBe(snap1);
  });

  it('لا يطغى الترحيل المتكرر على تقدم جديد بعد الترحيل', () => {
    const s = createMemoryStorage(v1State());
    runMigration(s, content);
    const p = loadProgress(s);
    p.words.push('w-010');
    saveProgress(s, p);
    runMigration(s, content);
    expect(loadProgress(s).words).toContain('w-010');
  });

  it('النصوص غير المطابقة تُحفظ ولا تُحذف', () => {
    const s = createMemoryStorage({ ...v1State(), k_words: JSON.stringify(['achieve', 'غير موجودة']) });
    const r = runMigration(s, content);
    expect(r.state).toBe('done');
    expect(r.counts.unmatched.words).toBe(1);
    expect(JSON.parse(s.getItem(KEYS.progress)).unmatched.words).toEqual(['غير موجودة']);
  });

  it('التكرار داخل بيانات V1 يُحسب ولا يضيع من الحساب', () => {
    const s = createMemoryStorage({ ...v1State(), k_words: JSON.stringify(['achieve', 'achieve']) });
    const r = runMigration(s, content);
    expect(r.counts.duplicates.words).toBe(1);
    expect(loadProgress(s).words).toEqual(['w-001']);
  });

  it('مستخدم جديد بلا بيانات: ينجح بأعداد صفرية', () => {
    const s = createMemoryStorage();
    const r = runMigration(s, content);
    expect(r.state).toBe('done');
    expect(loadProgress(s).words).toEqual([]);
  });

  it('JSON تالف: يتوقف دون كتابة تقدم جزئي ويترك V1 سليماً', () => {
    const s = createMemoryStorage({ ...v1State(), k_expr: '{bad' });
    const r = runMigration(s, content);
    expect(r.state).toBe('failed');
    expect(s.getItem(KEYS.progress)).toBeNull();
    expect(s.getItem('k_words')).toBe(v1State().k_words);
    expect(readMigrationState(s).state).toBe('failed');
  });

  it('شكل غير متوقع (ليس مصفوفة نصوص) يوقف الترحيل', () => {
    const s = createMemoryStorage({ ...v1State(), k_words: JSON.stringify({ a: 1 }) });
    expect(runMigration(s, content).state).toBe('failed');
  });

  it('فشل الكتابة (تخزين ممتلئ) يوقف الترحيل دون ضياع', () => {
    const s = createMemoryStorage(v1State());
    s.setItem = () => {
      throw new Error('QuotaExceeded');
    };
    const r = runMigration(s, content);
    expect(r.state).toBe('failed');
    expect(s.getItem('k_words')).toBe(v1State().k_words);
  });

  it('بعد فشل سابق يمكن إعادة المحاولة بنجاح عند إصلاح السبب', () => {
    const s = createMemoryStorage({ ...v1State(), k_expr: '{bad' });
    runMigration(s, content);
    s.setItem('k_expr', JSON.stringify(['Take your time.']));
    expect(runMigration(s, content).state).toBe('done');
  });

  it('الاستعادة من النسخة الداخلية تعيد V1 كما كان وتلغي V2', () => {
    const before = v1State();
    const s = createMemoryStorage(before);
    runMigration(s, content);
    s.setItem('k_words', JSON.stringify(['تالف']));
    expect(restoreLegacyFromBackup(s).ok).toBe(true);
    expect(s.getItem('k_words')).toBe(before.k_words);
    expect(s.getItem(KEYS.progress)).toBeNull();
    expect(s.getItem(KEYS.migration)).toBeNull();
  });

  it('التبويب القديم expr يتحول إلى expressions', () => {
    const s = createMemoryStorage({ ...v1State(), tab: JSON.stringify('expr') });
    runMigration(s, content);
    expect(JSON.parse(s.getItem(KEYS.settings)).tab).toBe('expressions');
  });
});

describe('النسخ الاحتياطي الخارجي', () => {
  it('تصدير ثم استيراد يعيد نفس المفاتيح', () => {
    const s = createMemoryStorage(v1State());
    runMigration(s, content);
    const file = exportBackup(s);
    const t = createMemoryStorage();
    expect(importBackup(t, file).ok).toBe(true);
    expect(t.dump()).toEqual(s.dump());
  });

  it('يرفض ملفات غير صالحة دون كتابة', () => {
    const t = createMemoryStorage();
    expect(importBackup(t, 'not json').ok).toBe(false);
    expect(importBackup(t, JSON.stringify({ format: 'other' })).ok).toBe(false);
    expect(importBackup(t, JSON.stringify({ format: 'eme-backup', entries: { evil: 'x' } })).ok).toBe(false);
    expect(t.dump()).toEqual({});
  });
});

describe('استيراد لقطة V1 المصدَّرة', () => {
  const dump = () => JSON.stringify(v1State());

  it('يدمج مع التقدم الحالي ولا يمسح شيئاً، ولا يكتب مفاتيح V1', () => {
    const s = createMemoryStorage(); // مستخدم جديد شغّل V2 أولاً
    runMigration(s, content);
    const p = loadProgress(s);
    p.words = ['w-010'];
    saveProgress(s, p);
    const r = importLegacyDump(s, dump(), content);
    expect(r.ok).toBe(true);
    expect(r.added.words).toBe(3);
    expect(loadProgress(s).words).toEqual(['w-010', 'w-001', 'w-002', content.words.find((w) => w.en === 'therefore').id]);
    expect(s.getItem('k_words')).toBeNull();
  });

  it('استيراد نفس اللقطة مرتين لا يضيف شيئاً', () => {
    const s = createMemoryStorage();
    runMigration(s, content);
    importLegacyDump(s, dump(), content);
    const once = s.getItem(KEYS.progress);
    const r2 = importLegacyDump(s, dump(), content);
    expect(r2.added).toEqual({ words: 0, expressions: 0, idioms: 0, grammar: 0 });
    expect(s.getItem(KEYS.progress)).toBe(once);
  });

  it('يحفظ حالة ما قبل الاستيراد', () => {
    const s = createMemoryStorage();
    runMigration(s, content);
    const before = s.getItem(KEYS.progress);
    importLegacyDump(s, dump(), content);
    expect(s.getItem(KEYS.preimport)).toBe(before);
  });

  it('يرفض نصاً تالفاً أو بلا بيانات V1 أو بشكل خاطئ دون كتابة', () => {
    const s = createMemoryStorage();
    runMigration(s, content);
    const before = s.getItem(KEYS.progress);
    expect(importLegacyDump(s, 'x{', content).ok).toBe(false);
    expect(importLegacyDump(s, JSON.stringify({ other: '1' }), content).ok).toBe(false);
    expect(importLegacyDump(s, JSON.stringify([1]), content).ok).toBe(false);
    expect(importLegacyDump(s, JSON.stringify({ k_words: '{bad' }), content).ok).toBe(false);
    expect(importLegacyDump(s, JSON.stringify({ k_words: JSON.stringify([1]) }), content).ok).toBe(false);
    expect(s.getItem(KEYS.progress)).toBe(before);
  });

  it('يقبل لقطة تحتوي مفاتيح أخرى من نفس النطاق ويتجاهلها', () => {
    const s = createMemoryStorage();
    runMigration(s, content);
    const r = importLegacyDump(s, JSON.stringify({ ...v1State(), other_app: 'x', 'iapp.data': '{}' }), content);
    expect(r.ok).toBe(true);
    expect(s.getItem('other_app')).toBeNull();
  });

  it('النصوص غير المطابقة تُدمج في unmatched', () => {
    const s = createMemoryStorage();
    runMigration(s, content);
    importLegacyDump(s, JSON.stringify({ k_words: JSON.stringify(['xx']) }), content);
    expect(JSON.parse(s.getItem(KEYS.progress)).unmatched.words).toEqual(['xx']);
  });
});
