// تشغيل: npm run build && npx vite preview --port 4173 --host 127.0.0.1 ثم node tests/e2e/browser-smoke.mjs (يحتاج playwright عالمياً وChrome)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const URL = 'http://127.0.0.1:4173/';
const results = [];
const ok = (name, pass, info = '') => { results.push({ name, pass, info }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info ? ' — ' + info : '')); };

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|net::ERR/.test(m.text())) errors.push(m.text()); });

// تهيئة بيانات V1 قبل أول تحميل (مرة واحدة فقط)
await page.addInitScript(() => {
  if (!sessionStorage.getItem('seeded')) {
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('k_words', JSON.stringify(['achieve', 'improve', 'therefore']));
    localStorage.setItem('k_expr', JSON.stringify(['Take your time.']));
    localStorage.setItem('k_grammar', JSON.stringify(['الماضي البسيط Past Simple']));
    localStorage.setItem('tab', JSON.stringify('words'));
  }
  window.__spoken = [];
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  Object.defineProperty(window, 'speechSynthesis', { value: { cancel() {}, speak(u) { window.__spoken.push([u.text, u.lang, u.rate]); } } });
});
await page.goto(URL, { waitUntil: 'load' });
await page.waitForSelector('.tabs');

const cards = () => page.locator('.card').count();
ok('الصفحة تفتح بلا أخطاء JS', errors.length === 0, errors.join(' | '));
ok('RTL مفعّل', (await page.evaluate(() => document.documentElement.dir)) === 'rtl');
ok('كلمات: 132 بطاقة', (await cards()) === 132, String(await cards()));
ok('الترحيل: أتقنت 3 من 132', (await page.locator('.small').first().innerText()).includes('3'), await page.locator('.small').first().innerText());
const mig = await page.evaluate(() => JSON.parse(localStorage.getItem('eme.migration')));
ok('حالة الترحيل done', mig.state === 'done', JSON.stringify(mig.counts.after));
ok('مفاتيح V1 لم تُمسّ', (await page.evaluate(() => localStorage.getItem('k_words'))) === JSON.stringify(['achieve', 'improve', 'therefore']));

// تبويبات وأعداد
const counts = { 'تعبيرات': 60, 'مصطلحات': 53, 'قواعد': 19, 'جمل مركبة': 34 };
for (const [label, n] of Object.entries(counts)) {
  await page.click(`.tab:has-text("${label}")`);
  ok(`${label}: ${n} بطاقة`, (await cards()) === n, String(await cards()));
}

// حفظ التقدم عبر إعادة التحميل
await page.click('.tab:has-text("كلمات")');
const before = await page.locator('.small').first().innerText();
await page.locator('.card .ic[title="أتقنتها"]').nth(5).click();
const after = await page.locator('.small').first().innerText();
await page.reload(); await page.waitForSelector('.tabs');
const reloaded = await page.locator('.small').first().innerText();
ok('التقدم يُحفظ بعد إعادة التحميل', after !== before && reloaded === after, `${before} → ${after} → ${reloaded}`);
const dup = await page.evaluate(() => JSON.parse(localStorage.getItem('eme.migration')).at);
ok('الترحيل لا يُعاد بعد التحميل', dup === mig.at);

// النطق
await page.locator('.card .ic[title="نطق"]').first().click();
const spoken = await page.evaluate(() => window.__spoken);
ok('النطق يستدعي en-US بسرعة 0.9', spoken.length === 1 && spoken[0][1] === 'en-US' && spoken[0][2] === 0.9, JSON.stringify(spoken));

// اختبار الكلمات
await page.click('text=ابدأ اختباراً');
let answered = 0;
for (let i = 0; i < 10; i++) {
  await page.locator('.opt').first().click();
  answered++;
  await page.click('.next');
}
ok('اختبار الكلمات: 10 أسئلة وشاشة نتيجة', (await page.locator('.score').innerText()).includes('من 10'), (await page.locator('.score').innerText()).replace(/\n/g, ' '));
await page.click('.next');

// الجمل المركبة: إصلاح F1
await page.click('.tab:has-text("جمل مركبة")');
let firstCorrect = 0, total = 0;
for (let r = 0; r < 4; r++) {
  await page.click('text=ابدأ اختباراً');
  for (let i = 0; i < 10; i++) {
    await page.locator('.opt').first().click();
    if (await page.locator('.opt').first().evaluate((e) => e.classList.contains('ok'))) firstCorrect++;
    total++;
    await page.click('.next');
  }
  await page.click('.next');
}
const ratio = firstCorrect / total;
ok('الجمل المركبة: الخيار الأول ليس الصحيح دائماً', ratio > 0.1 && ratio < 0.65, `${firstCorrect}/${total} = ${(ratio * 100).toFixed(0)}%`);

// قواعد: F2 — لا يكتمل الدرس بنتيجة ضعيفة، ويكتمل بنتيجة جيدة
await page.click('.tab:has-text("قواعد")');
const doLesson = async (idx, picks) => {
  const btn = page.locator('.card').nth(idx).locator('text=تمرين');
  if (!(await btn.count())) await page.locator('.card .top').nth(idx).click(); // الدرس قد يبقى مفتوحاً
  await page.locator('.card').nth(idx).locator('text=تمرين').click();
  for (const p of picks) { await page.locator('.opt').nth(p).click(); await page.click('.next'); }
  const note = await page.locator('.score .small').innerText();
  await page.click('.score .next');
  return note;
};
// الدرس الأول إجاباته الصحيحة [1,1,0]؛ نجيب خطأً في الثلاثة
const failNote = await doLesson(0, [0, 0, 1]);
const g1 = await page.evaluate(() => JSON.parse(localStorage.getItem('eme.progress')).grammar);
ok('نتيجة 0/3 لا تُكمل الدرس', !g1.includes('g-001') && failNote.includes('60%'), failNote + ' ' + JSON.stringify(g1));
const passNote = await doLesson(0, [1, 1, 0]);
const g2 = await page.evaluate(() => JSON.parse(localStorage.getItem('eme.progress')).grammar);
ok('نتيجة 3/3 تُكمل الدرس بالمعرّف', g2.includes('g-001') && g2.includes('g-003') && passNote.includes('اكتمل'), passNote + ' ' + JSON.stringify(g2));

// تجاوب الهاتف
for (const t of ['كلمات', 'جمل مركبة', 'قواعد']) {
  await page.click(`.tab:has-text("${t}")`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(`360px بلا فيض أفقي (${t})`, overflow <= 0, String(overflow));
}

// نسخ احتياطي: تصدير ثم مسح ثم استعادة
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('text=تصدير نسخة احتياطية')]);
const path = await dl.path();
const fs = await import('node:fs');
const file = fs.readFileSync(path, 'utf8');
ok('تصدير النسخة الاحتياطية يعمل', JSON.parse(file).format === 'eme-backup', dl.suggestedFilename());
await page.evaluate(() => localStorage.clear());
await page.setInputFiles('input[type=file]', { name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(file) });
await page.waitForSelector('text=تمت الاستعادة');
await page.reload(); await page.waitForSelector('.tabs');
const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('eme.progress')).words.length);
ok('الاستعادة من الملف بعد مسح التخزين', restored === 4, String(restored));

// استيراد V1: بعد المسح والاستعادة نستورد لقطة V1 جديدة (تحتوي therefore)
const kBefore = await page.evaluate(() => localStorage.getItem('k_words'));
await page.click('text=استيراد بيانات V1');
const dump = JSON.stringify({ k_words: JSON.stringify(['achieve', 'borrow', 'lend']), k_expr: JSON.stringify(['Keep in touch.']) });
await page.fill('textarea', dump);
await page.click('.card >> text=استيراد');
await page.waitForSelector('text=تم الاستيراد');
const imp = await page.evaluate(() => JSON.parse(localStorage.getItem('eme.progress')));
ok('استيراد V1 يدمج دون مسح (achieve وborrow موجودتان فلا تتكرران)', imp.words.length === 5 && imp.expressions.length === 2, JSON.stringify([imp.words.length, imp.expressions.length]));
ok('استيراد V1 لم يغيّر مفاتيح V1', (await page.evaluate(() => localStorage.getItem('k_words'))) === kBefore);

ok('لا أخطاء JS طوال الجلسة', errors.length === 0, errors.join(' | '));
await page.screenshot({ path: '/tmp/e2e/shot.png' });
await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} ناجح`);
process.exit(failed.length ? 1 : 0);
