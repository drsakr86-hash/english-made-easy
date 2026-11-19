import { describe, it, expect } from 'vitest';
import * as content from '../../src/data/legacy-content/index.js';
import { runMigration, restoreLegacyFromBackup, readMigrationState } from '../../src/storage/migration.js';
import { exportBackup, importBackup, planImport, restoreFromSnapshot } from '../../src/storage/backup.js';
import { applyWrites } from '../../src/storage/transaction.js';
import { createMemoryStorage } from '../../src/storage/localStorage.js';
import { loadProgress } from '../../src/storage/progress.js';
import { KEYS } from '../../src/storage/keys.js';
import { createFaultyStorage } from '../helpers/fault-storage.js';
import { v1Only, v2Full, v2Progress, v1AndV2NoMarker } from '../fixtures/storage-states.js';

const V1_KEYS = ['k_words', 'k_expr', 'k_idioms', 'k_grammar', 'k_compound', 'tab'];
const pick = (d, keys) => Object.fromEntries(keys.filter((k) => k in d).map((k) => [k, d[k]]));
const without = (d, keys) => Object.fromEntries(Object.entries(d).filter(([k]) => !keys.includes(k)));
/** كل مفاتيح V2 المحتوية على بيانات مستخدم (بلا علامة الترحيل التي هي سجل حالة فقط). */
const userDataOf = (d) => without(d, [KEYS.migration]);
const idsOf = (storage) => loadProgress(storage);
const subset = (a, b) => a.every((x) => b.includes(x));
/** كل معرّفات التقدم السابقة ما زالت موجودة. */
function expectNoProgressLoss(before, after) {
  for (const k of Object.keys(before)) if (Array.isArray(before[k])) expect(subset(before[k], after[k] || [])).toBe(true);
}

/** عدد استدعاءات setItem اللازمة لتشغيل ناجح، لنحقن فشلاً عند كل واحدة منها. */
function countSets(initial, run) {
  const s = createFaultyStorage(initial);
  run(s);
  return s.counters.set;
}

describe('الترحيل: الحالات الأساسية', () => {
  it('V1 فقط (أول مرة): ينجح، يحفظ نسخة خاماً، ولا يمسّ V1، وعلامة الإنجاز تُكتب أخيراً', () => {
    const s = createFaultyStorage(v1Only());
    const r = runMigration(s, content);
    expect(r.state).toBe('done');
    expect(pick(s.dump(), V1_KEYS)).toEqual(v1Only());
    expect(JSON.parse(s.getItem(KEYS.backup)).keys.k_words).toBe(v1Only().k_words);
    expect(s.counters.setLog.at(-1)).toBe(KEYS.migration);
    expect(r.counts.after).toEqual(r.counts.before);
  });

  it('V2 فقط مع علامة done: يُتخطى ولا يتغير شيء', () => {
    const s = createMemoryStorage(v2Full());
    const before = s.dump();
    expect(runMigration(s, content).state).toBe('skipped');
    expect(s.dump()).toEqual(before);
  });

  it('V2 فقط بعد ضياع العلامة: يُتبنّى دون أي استبدال للتقدم', () => {
    const init = without(v2Full(), [KEYS.migration]);
    const s = createMemoryStorage(init);
    const r = runMigration(s, content);
    expect(r.state).toBe('done');
    expect(s.getItem(KEYS.progress)).toBe(init[KEYS.progress]);
    expect(s.getItem(KEYS.settings)).toBe(init[KEYS.settings]);
    expect(s.getItem(KEYS.backup)).toBeNull();
  });

  it('V1 وV2 معاً بلا علامة: تعارض صريح، لا استبدال ولا دمج صامت، وتبقى V1 كما هي', () => {
    const init = v1AndV2NoMarker();
    const s = createMemoryStorage(init);
    const r = runMigration(s, content);
    expect(r.state).toBe('conflict');
    expect(userDataOf(s.dump())).toEqual(init);
    expect(readMigrationState(s).state).toBe('conflict');
  });

  it('V1 وV2 مع علامة failed قديمة: لا يُستبدل تقدم V2', () => {
    const init = { ...v1AndV2NoMarker(), [KEYS.migration]: JSON.stringify({ state: 'failed', reason: 'x', at: 'y' }) };
    const s = createMemoryStorage(init);
    expect(runMigration(s, content).state).toBe('conflict');
    expect(s.getItem(KEYS.progress)).toBe(init[KEYS.progress]);
  });

  it('علامة ترحيل تالفة مع V1 فقط: يرحّل بشكل طبيعي', () => {
    const s = createMemoryStorage({ ...v1Only(), [KEYS.migration]: '{{not json' });
    expect(runMigration(s, content).state).toBe('done');
    expect(idsOf(s).words).toContain('w-001');
  });

  it('علامة ترحيل تالفة مع V1 وV2: لا يُستبدل التقدم', () => {
    const init = { ...v1AndV2NoMarker(), [KEYS.migration]: 'garbage' };
    const s = createMemoryStorage(init);
    expect(runMigration(s, content).state).toBe('conflict');
    expect(s.getItem(KEYS.progress)).toBe(init[KEYS.progress]);
  });

  it('إعادة التشغيل متكررة (idempotent) في كل الحالات: لا يتغير التخزين بعد التشغيل الأول', () => {
    for (const init of [v1Only(), v2Full(), v1AndV2NoMarker(), without(v2Full(), [KEYS.migration]), {}]) {
      const s = createMemoryStorage(init);
      runMigration(s, content);
      const once = JSON.stringify(s.dump());
      runMigration(s, content);
      runMigration(s, content);
      expect(JSON.stringify(s.dump())).toBe(once);
    }
  });

  it('V1 تالف: يفشل بلا حذف أي مفتاح V2 موجود (إعدادات ومخطط)', () => {
    const init = { ...v1Only(), k_expr: '{bad', [KEYS.settings]: JSON.stringify({ planMinutes: 15 }), [KEYS.schema]: '2' };
    const s = createMemoryStorage(init);
    const r = runMigration(s, content);
    expect(r.state).toBe('failed');
    expect(s.getItem(KEYS.settings)).toBe(init[KEYS.settings]);
    expect(s.getItem(KEYS.schema)).toBe('2');
    expect(s.getItem(KEYS.progress)).toBeNull();
    expect(pick(s.dump(), V1_KEYS)).toEqual(pick(init, V1_KEYS));
  });

  it('تقدم V2 تالف الشكل: يتوقف بلا تغيير ولا حذف', () => {
    const init = { ...v1Only(), [KEYS.progress]: '{broken' };
    const s = createMemoryStorage(init);
    const r = runMigration(s, content);
    expect(r.state).toBe('failed');
    expect(s.getItem(KEYS.progress)).toBe('{broken');
  });

  it('فشل قراءة التخزين لا يُعامَل كأنه "لا توجد بيانات"', () => {
    const s = createFaultyStorage(v1Only(), { failGetKeys: ['k_words'] });
    const r = runMigration(s, content);
    expect(r.state).toBe('failed');
    expect(s.getItem(KEYS.progress)).toBeNull();
    expect(s.dump().k_words).toBe(v1Only().k_words);
  });

  it('تخزين ممتلئ: يفشل بلا حالة جزئية ويبقى V1 والنسخة سليمين', () => {
    const init = v1Only();
    const used = Object.entries(init).reduce((n, [k, v]) => n + k.length + v.length, 0);
    const s = createFaultyStorage(init, { quota: used + 150 });
    const r = runMigration(s, content);
    expect(r.state).toBe('failed');
    expect(s.getItem(KEYS.progress)).toBeNull();
    expect(s.getItem(KEYS.settings)).toBeNull();
    expect(s.getItem(KEYS.schema)).toBeNull();
    expect(pick(s.dump(), V1_KEYS)).toEqual(init);
  });
});

describe('الترحيل: حقن فشل الكتابة عند كل خطوة', () => {
  const scenarios = {
    'V1 فقط': v1Only(),
    'V1 مع إعدادات V2 موجودة بلا تقدم': { ...v1Only(), [KEYS.settings]: JSON.stringify({ planMinutes: 15 }) },
    'مستخدم جديد': {},
  };
  for (const [name, init] of Object.entries(scenarios)) {
    it(`${name}: فشل setItem عند كل استدعاء لا يترك حالة جزئية ولا يفقد بيانات`, () => {
      const total = countSets(init, (s) => runMigration(s, content));
      expect(total).toBeGreaterThan(2);
      const clean = createMemoryStorage(init);
      runMigration(clean, content);
      for (let n = 1; n <= total; n++) {
        const s = createFaultyStorage(init, { failSetCalls: [n] });
        const r = runMigration(s, content);
        expect(r.state, `n=${n}`).toBe('failed');
        const d = s.dump();
        // لا شيء من مفاتيح التقدم/المخطط/النسخة كُتب جزئياً
        for (const k of [KEYS.progress, KEYS.schema, KEYS.backup]) expect(d[k] ?? null, `${k} n=${n}`).toBe(init[k] ?? null);
        expect(d[KEYS.settings] ?? null, `settings n=${n}`).toBe(init[KEYS.settings] ?? null);
        expect(pick(d, V1_KEYS), `v1 n=${n}`).toEqual(pick(init, V1_KEYS));
        expect(d[KEYS.migration] === undefined || JSON.parse(d[KEYS.migration]).state === 'failed').toBe(true);
        // إعادة المحاولة بعد زوال العطل تعطي نفس النتيجة النظيفة
        const retry = runMigration(s, content);
        expect(retry.state, `retry n=${n}`).toBe('done');
        expect(s.getItem(KEYS.progress)).toBe(clean.getItem(KEYS.progress));
      }
    });
  }

  it('فشل الكتابة مع وجود تقدم V2 (تعارض) لا يمسّ التقدم أبداً', () => {
    const init = v1AndV2NoMarker();
    const total = countSets(init, (s) => runMigration(s, content));
    for (let n = 1; n <= Math.max(total, 2); n++) {
      const s = createFaultyStorage(init, { failSetCalls: [n] });
      runMigration(s, content);
      expect(userDataOf(s.dump()), `n=${n}`).toEqual(init);
    }
  });
});

describe('المعاملة الذرية applyWrites', () => {
  it('تنجح وتتحقق من القراءة بعد الكتابة', () => {
    const s = createMemoryStorage({ a: '1' });
    const r = applyWrites(s, [{ key: 'a', value: '2' }, { key: 'b', value: '3' }, { key: 'c', value: null }]);
    expect(r.ok).toBe(true);
    expect(s.dump()).toEqual({ a: '2', b: '3' });
  });

  it('عند الفشل تعيد القيم السابقة بدقة (القيمة الأصلية، والغياب)', () => {
    const s = createFaultyStorage({ a: 'old', z: 'keep' }, { failSetCalls: [3] });
    const r = applyWrites(s, [{ key: 'a', value: 'new' }, { key: 'b', value: 'new' }, { key: 'c', value: 'new' }]);
    expect(r.ok).toBe(false);
    expect(r.rolledBack).toBe(true);
    expect(s.dump()).toEqual({ a: 'old', z: 'keep' });
  });

  it('يكشف الكتابة التي تُتجاهل بصمت ويتراجع', () => {
    const s = createFaultyStorage({ a: 'old' }, { silentDropKeys: ['b'] });
    const r = applyWrites(s, [{ key: 'a', value: 'new' }, { key: 'b', value: 'new' }]);
    expect(r.ok).toBe(false);
    expect(s.dump()).toEqual({ a: 'old' });
  });

  it('يبلّغ بصدق إن فشل التراجع نفسه ولا يدّعي النجاح', () => {
    // الكتابة الثانية تفشل ثم يفشل استرجاع القيمة القديمة للمفتاح الأول
    const s = createFaultyStorage({ a: 'old' }, { failSetCalls: [2, 3] });
    const r = applyWrites(s, [{ key: 'a', value: 'new' }, { key: 'b', value: 'x' }]);
    expect(r.ok).toBe(false);
    expect(r.rolledBack).toBe(false);
    expect(r.rollbackFailed).toEqual(['a']);
  });

  it('فشل قراءة اللقطة يوقف العملية قبل أي كتابة', () => {
    const s = createFaultyStorage({ a: 'old' }, { failGetKeys: ['a'] });
    const r = applyWrites(s, [{ key: 'a', value: 'new' }, { key: 'b', value: '1' }]);
    expect(r.ok).toBe(false);
    expect(s.counters.set).toBe(0);
  });
});

describe('النسخ الاحتياطي: التحقق قبل الكتابة', () => {
  const populated = () => ({ ...v1Only(), ...v2Full() });
  const good = () => JSON.parse(exportBackup(createMemoryStorage(v2Full())));
  const mk = (patch) => {
    const b = good();
    patch(b);
    return JSON.stringify(b);
  };
  const bad = {
    'ليس JSON': 'not json',
    'صيغة أخرى': JSON.stringify({ format: 'other', version: 1, entries: {} }),
    'إصدار غير مدعوم': mk((b) => (b.version = 99)),
    'بلا إصدار': mk((b) => delete b.version),
    'entries مصفوفة': mk((b) => (b.entries = [])),
    'مفتاح غريب': mk((b) => (b.entries.evil = 'x')),
    'قيمة غير نصية': mk((b) => (b.entries[KEYS.basics] = 5)),
    'JSON داخلي تالف': mk((b) => (b.entries[KEYS.review] = '{bad')),
    'تقدم بشكل خاطئ': mk((b) => (b.entries[KEYS.progress] = JSON.stringify({ words: 'x' }))),
    'تقدم معرّفات غير نصية': mk((b) => (b.entries[KEYS.progress] = JSON.stringify({ words: [1, 2] }))),
    'مخطط أحدث من التطبيق': mk((b) => (b.entries[KEYS.schema] = '99')),
    'قيمة ضخمة جداً': mk((b) => (b.entries[KEYS.tutor] = JSON.stringify({ pad: 'x'.repeat(5_000_000) }))),
    'مفتاح اللقطة المؤقتة': mk((b) => (b.entries[KEYS.prerestore] = '{}')),
  };
  for (const [name, text] of Object.entries(bad)) {
    for (const mode of ['merge', 'replace']) {
      it(`ملف غير صالح (${name}) في وضع ${mode}: لا يغيّر أي مفتاح`, () => {
        const s = createFaultyStorage(populated());
        const before = s.dump();
        const r = importBackup(s, text, { mode });
        expect(r.ok).toBe(false);
        expect(s.dump()).toEqual(before);
        expect(s.counters.set).toBe(0);
      });
    }
  }

  it('وضع غير معروف يُرفض', () => {
    const s = createMemoryStorage();
    expect(importBackup(s, exportBackup(createMemoryStorage(v2Full())), { mode: 'wipe' }).ok).toBe(false);
  });
});

describe('النسخ الاحتياطي: تصدير ثم استيراد', () => {
  it('يعيد كل المفاتيح المدعومة في وضعي الدمج والاستعادة الكاملة (V1 وV2 معاً)', () => {
    const src = createMemoryStorage({ ...v1Only(), ...v2Full() });
    const file = exportBackup(src);
    for (const mode of ['merge', 'replace']) {
      const t = createMemoryStorage();
      const r = importBackup(t, file, { mode });
      expect(r.ok, mode).toBe(true);
      expect(t.dump(), mode).toEqual(src.dump());
    }
  });

  it('استعادة نسخة V1 فقط ونسخة V2 فقط', () => {
    for (const init of [v1Only(), v2Full()]) {
      const src = createMemoryStorage(init);
      const t = createMemoryStorage();
      expect(importBackup(t, exportBackup(src)).ok).toBe(true);
      expect(t.dump()).toEqual(src.dump());
    }
  });

  it('لا يُصدَّر مفتاح اللقطة المؤقتة', () => {
    const s = createMemoryStorage({ ...v2Full(), [KEYS.prerestore]: '{}' });
    expect(Object.keys(JSON.parse(exportBackup(s)).entries)).not.toContain(KEYS.prerestore);
  });

  it('الملف الأصلي يبقى صالحاً بعد فشل الاستعادة ويمكن إعادة المحاولة', () => {
    const src = createMemoryStorage(v2Full());
    const file = exportBackup(src);
    const t = createFaultyStorage({}, { failSetCalls: [2] });
    expect(importBackup(t, file).ok).toBe(false);
    expect(t.dump()).toEqual({});
    expect(importBackup(t, file).ok).toBe(true);
    expect(t.dump()).toEqual(src.dump());
  });
});

describe('النسخ الاحتياطي: الدمج مقابل الاستعادة الكاملة', () => {
  const backupFile = () => {
    const src = createMemoryStorage({
      ...v2Full(),
      [KEYS.progress]: JSON.stringify({ words: ['w-001', 'w-050'], expressions: [], idioms: [], grammar: [], unmatched: { words: ['س'], expressions: [], idioms: [], grammar: [] } }),
      [KEYS.basics]: JSON.stringify({ done: ['b-009'] }),
    });
    return exportBackup(src);
  };
  const local = () => ({ ...v1Only(), ...v2Full(), [KEYS.userwords]: JSON.stringify({ version: 1, items: {}, next: 7 }), other_app: 'x' });

  it('الدمج: يتحد التقدم ولا يضيع شيء، ويُبقي المفاتيح الموجودة محلياً، ولا يحذف شيئاً', () => {
    const s = createMemoryStorage(local());
    const before = s.dump();
    const beforeIds = idsOf(s);
    const r = importBackup(s, backupFile(), { mode: 'merge' });
    expect(r.ok).toBe(true);
    expect(r.mode).toBe('merge');
    const after = idsOf(s);
    expectNoProgressLoss(beforeIds, after);
    expect(after.words).toContain('w-050');
    expect(s.getItem(KEYS.basics)).toBe(before[KEYS.basics]);
    expect(s.getItem(KEYS.userwords)).toBe(before[KEYS.userwords]);
    expect(without(s.dump(), [KEYS.progress, KEYS.prerestore])).toEqual(without(before, [KEYS.progress]));
    expect(r.kept).toContain(KEYS.basics);
  });

  it('الدمج مرتين لا يغيّر شيئاً (idempotent)', () => {
    const s = createMemoryStorage(local());
    importBackup(s, backupFile(), { mode: 'merge' });
    const once = JSON.stringify(s.dump());
    expect(importBackup(s, backupFile(), { mode: 'merge' }).ok).toBe(true);
    expect(JSON.stringify(s.dump())).toBe(once);
  });

  it('الاستعادة الكاملة: الملف هو المرجع، وتُحذف مفاتيح التطبيق الغائبة عنه ما عدا المحمية، ولا تُمسّ مفاتيح التطبيقات الأخرى', () => {
    const s = createMemoryStorage(local());
    const plan = planImport(s, backupFile(), 'replace');
    expect(plan.ok).toBe(true);
    const r = importBackup(s, backupFile(), { mode: 'replace' });
    expect(r.ok).toBe(true);
    expect(s.getItem(KEYS.basics)).toBe(JSON.stringify({ done: ['b-009'] }));
    expect(s.getItem('other_app')).toBe('x');
    for (const k of V1_KEYS) expect(s.getItem(k)).toBe(local()[k]);
  });

  it('الاستعادة الكاملة لا تحذف نسخة V1 الخام ولا مفاتيح V1 حتى لو غابت عن الملف', () => {
    const s = createMemoryStorage({ ...local(), [KEYS.backup]: JSON.stringify({ at: 'x', keys: {} }) });
    const file = exportBackup(createMemoryStorage(v2Full()));
    expect(importBackup(s, file, { mode: 'replace' }).ok).toBe(true);
    expect(s.getItem(KEYS.backup)).not.toBeNull();
    expect(s.getItem('k_words')).toBe(v1Only().k_words);
  });

  it('تُحفظ لقطة بما كان قبل الاستعادة ويمكن الرجوع إليها', () => {
    const s = createMemoryStorage(local());
    const before = s.dump();
    const r = importBackup(s, backupFile(), { mode: 'replace' });
    expect(r.ok).toBe(true);
    expect(r.snapshotSaved).toBe(true);
    const u = restoreFromSnapshot(s);
    expect(u.ok).toBe(true);
    expect(without(s.dump(), [KEYS.prerestore])).toEqual(without(before, [KEYS.prerestore]));
  });

  it('لا لقطة عندما لا يوجد ما يُحفظ (تخزين فارغ)', () => {
    const s = createMemoryStorage();
    importBackup(s, backupFile());
    expect(s.getItem(KEYS.prerestore)).toBeNull();
  });
});

describe('النسخ الاحتياطي: فشل الاستعادة في منتصف العملية', () => {
  const populated = () => ({ ...v1Only(), ...v2Full(), other_app: 'x' });
  const file = () =>
    exportBackup(
      createMemoryStorage({
        ...v2Full(),
        [KEYS.progress]: JSON.stringify({ words: ['w-077'], expressions: [], idioms: [], grammar: [], unmatched: {} }),
        [KEYS.basics]: JSON.stringify({ done: ['b-005'] }),
        [KEYS.userwords]: JSON.stringify({ version: 1, items: {}, next: 3 }),
      }),
    );

  for (const mode of ['merge', 'replace']) {
    it(`${mode}: فشل setItem عند كل استدعاء يعيد الحالة السابقة كاملة ولا يترك مزيجاً`, () => {
      const total = countSets(populated(), (s) => importBackup(s, file(), { mode }));
      expect(total).toBeGreaterThan(1);
      for (let n = 1; n <= total; n++) {
        const s = createFaultyStorage(populated(), { failSetCalls: [n] });
        const before = s.dump();
        const r = importBackup(s, file(), { mode });
        expect(r.ok, `n=${n}`).toBe(false);
        expect(r.rolledBack, `n=${n}`).toBe(true);
        expect(s.dump(), `n=${n}`).toEqual(before);
      }
    });
  }

  it('replace: فشل removeItem عند كل استدعاء يعيد الحالة السابقة', () => {
    // ملف بلا placement وplans، فتُحذف محلياً في الاستعادة الكاملة
    const slim = JSON.parse(file());
    delete slim.entries[KEYS.placement];
    delete slim.entries[KEYS.plans];
    const slimText = JSON.stringify(slim);
    const base = createFaultyStorage(populated());
    expect(importBackup(base, slimText, { mode: 'replace' }).removed).toEqual([KEYS.placement, KEYS.plans]);
    const removes = base.counters.remove;
    expect(removes).toBe(2);
    for (let n = 1; n <= removes; n++) {
      const s = createFaultyStorage(populated(), { failRemoveCalls: [n] });
      const before = s.dump();
      const r = importBackup(s, slimText, { mode: 'replace' });
      expect(r.ok, `n=${n}`).toBe(false);
      expect(s.dump(), `n=${n}`).toEqual(before);
    }
  });

  it('تخزين ممتلئ أثناء الاستعادة: يتراجع كاملاً', () => {
    // المفتاحان غائبان محلياً فيُكتبان في الدمج، والمساحة لا تكفي لهما
    const init = without(populated(), [KEYS.userwords, KEYS.basics]);
    const used = Object.entries(init).reduce((n, [k, v]) => n + k.length + v.length, 0);
    const big = JSON.stringify({ version: 1, items: {}, next: 1, pad: 'x'.repeat(400) });
    const f = JSON.stringify({ format: 'eme-backup', version: 1, entries: { [KEYS.userwords]: big, [KEYS.basics]: JSON.stringify({ done: ['b-001', 'b-002'] }) } });
    const s = createFaultyStorage(init, { quota: used + 200 });
    const before = s.dump();
    const r = importBackup(s, f, { mode: 'merge' });
    expect(r.ok).toBe(false);
    expect(s.dump()).toEqual(before);
  });

  it('لا تُعرض رسالة نجاح إن فشل التحقق بعد الكتابة', () => {
    const s = createFaultyStorage(populated(), { silentDropKeys: [KEYS.userwords] });
    const before = s.dump();
    const r = importBackup(s, file(), { mode: 'replace' });
    expect(r.ok).toBe(false);
    expect(s.dump()).toEqual(before);
  });

  it('فشل التراجع نفسه يُبلَّغ صراحةً', () => {
    const s = createFaultyStorage(populated(), { failSetCalls: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12] });
    const r = importBackup(s, file(), { mode: 'replace' });
    expect(r.ok).toBe(false);
    if (!r.rolledBack) expect(r.rollbackFailed.length).toBeGreaterThan(0);
  });
});

describe('restoreLegacyFromBackup', () => {
  const migrated = () => {
    const s = createMemoryStorage(v1Only());
    runMigration(s, content);
    return s;
  };

  it('ينجح: يعيد V1 كما كان، ثم يزيل V2 مع حفظ لقطة بتقدم V2 للرجوع', () => {
    const s = migrated();
    const v2Progress = s.getItem(KEYS.progress);
    s.setItem('k_words', JSON.stringify(['تالف']));
    const r = restoreLegacyFromBackup(s);
    expect(r.ok).toBe(true);
    expect(s.getItem('k_words')).toBe(v1Only().k_words);
    expect(s.getItem(KEYS.progress)).toBeNull();
    expect(s.getItem(KEYS.migration)).toBeNull();
    expect(r.restored).toBeGreaterThan(0);
    const u = restoreFromSnapshot(s);
    expect(u.ok).toBe(true);
    expect(s.getItem(KEYS.progress)).toBe(v2Progress);
  });

  it('نسخة داخلية تالفة أو بشكل خاطئ: لا تغيير', () => {
    for (const bad of ['{x', JSON.stringify({ keys: [] }), JSON.stringify({ keys: { evil: 'x' } }), JSON.stringify({ keys: { k_words: 5 } }), JSON.stringify([1])]) {
      const s = migrated();
      s.setItem(KEYS.backup, bad);
      const before = s.dump();
      expect(restoreLegacyFromBackup(s).ok).toBe(false);
      expect(s.dump()).toEqual(before);
    }
  });

  it('لا نسخة احتياطية: لا تغيير', () => {
    const s = createMemoryStorage(v2Full());
    const before = s.dump();
    expect(restoreLegacyFromBackup(s).ok).toBe(false);
    expect(s.dump()).toEqual(before);
  });

  it('فشل الكتابة عند كل خطوة: V2 لا يُحذف وV1 يعود كما كان', () => {
    const mk = () => {
      const s = migrated();
      s.setItem('k_words', JSON.stringify(['تالف']));
      return s.dump();
    };
    const total = countSets(mk(), (s) => restoreLegacyFromBackup(s));
    expect(total).toBeGreaterThan(1);
    for (let n = 1; n <= total; n++) {
      const s = createFaultyStorage(mk(), { failSetCalls: [n] });
      const before = s.dump();
      const r = restoreLegacyFromBackup(s);
      expect(r.ok, `n=${n}`).toBe(false);
      expect(s.dump(), `n=${n}`).toEqual(before);
    }
  });

  it('فشل الحذف عند كل خطوة: تراجع كامل', () => {
    const mk = () => {
      const s = migrated();
      s.setItem('k_words', JSON.stringify(['تالف']));
      return s.dump();
    };
    const probe = createFaultyStorage(mk());
    restoreLegacyFromBackup(probe);
    for (let n = 1; n <= probe.counters.remove; n++) {
      const s = createFaultyStorage(mk(), { failRemoveCalls: [n] });
      const before = s.dump();
      expect(restoreLegacyFromBackup(s).ok, `n=${n}`).toBe(false);
      expect(s.dump(), `n=${n}`).toEqual(before);
    }
  });
});

describe('عدم فقدان أي تقدم سابق', () => {
  it('ترحيل → تقدم جديد → إعادة ترحيل → دمج نسخة احتياطية: كل المعرّفات تبقى', () => {
    const s = createMemoryStorage(v1Only());
    runMigration(s, content);
    const p = loadProgress(s);
    p.words.push('w-099');
    s.setItem(KEYS.progress, JSON.stringify({ ...p, unmatched: {} }));
    const before = idsOf(s);
    runMigration(s, content);
    expectNoProgressLoss(before, idsOf(s));
    importBackup(s, exportBackup(createMemoryStorage(v2Full())), { mode: 'merge' });
    expectNoProgressLoss(before, idsOf(s));
    expect(v2Progress().words.every((w) => idsOf(s).words.includes(w))).toBe(true);
  });
});
