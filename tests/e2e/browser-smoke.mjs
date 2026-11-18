// تشغيل: npm run build && npx vite preview --port 4173 --host 127.0.0.1 ثم node tests/e2e/browser-smoke.mjs (يحتاج playwright عالمياً وChrome)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import { questions } from '../../src/data/placement/questions.js';
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
  window.SpeechRecognition = class { start() { setTimeout(() => { this.onresult({ results: [[{ transcript: 'could i have the bill' }]] }); this.onend(); }, 10); } };
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  Object.defineProperty(window, 'speechSynthesis', { value: { cancel() {}, speak(u) { window.__spoken.push([u.text, u.lang, u.rate]); } } });
});
await page.goto(URL, { waitUntil: 'load' });
await page.waitForSelector('.tabs');

const goLearn = async (label) => { await page.click('.tab:has-text("تعلّم")'); await page.click(`.subtab:has-text("${label}")`); };
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
  await goLearn(label);
  ok(`${label}: ${n} بطاقة`, (await cards()) === n, String(await cards()));
}

// حفظ التقدم عبر إعادة التحميل
await goLearn('كلمات');
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

// Smart Review: تسجيل نتائج الاختبار بالمعرّفات ثم المراجعة المستحقة
const rev1 = await page.evaluate(() => JSON.parse(localStorage.getItem('eme.review')).items);
const ids1 = Object.keys(rev1);
ok('نتائج اختبار الكلمات سُجّلت في المراجعة (10 عناصر بمعرّفات)', ids1.length === 10 && ids1.every((i) => /^w-\d{3}$/.test(i)), ids1.join(','));
ok('كل سجل يحمل الحقول المطلوبة', ids1.every((i) => ['firstLearnedAt', 'lastReviewedAt', 'nextReviewAt', 'correctCount', 'incorrectCount', 'masteryLevel', 'reviewInterval', 'reviewHistory'].every((k) => k in rev1[i])));
await page.click('.tab:has-text("مراجعة")');
ok('لا مراجعات مستحقة فور الإجابة', (await page.locator('.card').first().innerText()).includes('مراجعات اليوم: 0'));
await page.evaluate(() => {
  const r = JSON.parse(localStorage.getItem('eme.review'));
  for (const k of Object.keys(r.items)) r.items[k].nextReviewAt = new Date(Date.now() - 86400000).toISOString();
  localStorage.setItem('eme.review', JSON.stringify(r));
});
await page.reload(); await page.waitForSelector('.tabs');
await page.click('.tab:has-text("مراجعة")');
ok('بعد مرور الموعد تظهر 10 مراجعات مستحقة', (await page.locator('.card').first().innerText()).includes('مراجعات اليوم: 10'));
await page.click('text=ابدأ مراجعة اليوم');
for (let i = 0; i < 10; i++) { await page.locator('.opt').first().click(); await page.click('.next'); }
await page.click('.score .next');
const rev2 = await page.evaluate(() => JSON.parse(localStorage.getItem('eme.review')).items);
ok('كل عنصر سُجّلت له إجابة ثانية', Object.values(rev2).every((r) => r.reviewHistory.length === 2), JSON.stringify(Object.values(rev2).map((r) => r.reviewHistory.length)));
ok('بعد المراجعة لا مستحق اليوم', (await page.locator('.card').first().innerText()).includes('مراجعات اليوم: 0'));

// Dashboard: بيانات حقيقية بعد النشاط
await page.click('.tab:has-text("الرئيسية")');
const dash = await page.locator('#root').innerText();
const act = await page.evaluate(() => JSON.parse(localStorage.getItem('eme.activity')));
ok('الرئيسية: أيام الالتزام 1 وإجمالي أيام التعلم 1', /أيام الالتزام المتتالية: 1/.test(dash) && /إجمالي أيام التعلم: 1/.test(dash), dash.split('\n').filter((l) => /الالتزام|إجمالي/.test(l)).join(' | '));
ok('الرئيسية: الكلمات المتقنة 4 من 132 كما في التخزين', /الكلمات المتقنة: 4 من 132/.test(dash), (dash.match(/الكلمات المتقنة: \d+ من \d+/) || [''])[0]);
ok('الرئيسية: آخر نشاط حقيقي', /آخر نشاط:.*(إجابة في اختبار|تعليم عنصر)/.test(dash) && act.last !== null, (dash.match(/آخر نشاط:.*/) || [''])[0]);
ok('سجل النشاط يعدّ كل إجابة (≥ 20 حدثاً: اختبار ومراجعة)', Object.values(act.days).reduce((a, b) => a + b, 0) >= 20, JSON.stringify(act.days));

// تحديد المستوى: إجابات صحيحة حتى B1 وخاطئة بعدها => B1
await page.click('.tab:has-text("مستواي")');
ok('مستواي: تنبيه أنه تقديري', (await page.locator('#root').innerText()).includes('ليست شهادة رسمية'));
await page.click('text=ابدأ الاختبار');
const byText = Object.fromEntries(questions.map((x) => [x.q, x]));
let asked = 0, sawPassage = false, guard = 0, feedbackSeen = 0;
while (guard++ < 60) {
  if (await page.locator('.score:has-text("مستواك التقديري")').count()) break;
  const stem = await page.locator('.card .en').first().innerText();
  const qd = byText[stem];
  if (!qd) throw new Error('سؤال غير معروف: ' + stem);
  if (qd.passage) sawPassage = sawPassage || (await page.locator('.rule').count()) > 0;
  const good = ['A1', 'A2', 'B1'].includes(qd.level);
  const correctText = qd.options[qd.answer];
  const opts = await page.locator('.opt').allInnerTexts();
  const idx = good ? opts.indexOf(correctText) : opts.findIndex((o) => o !== correctText);
  feedbackSeen += await page.locator('.opt.ok, .opt.bad, .rule:has-text("—")').count();
  await page.locator('.opt').nth(idx).click();
  feedbackSeen += await page.locator('.opt.ok, .opt.bad').count();
  asked++;
}
const placed = await page.evaluate(() => JSON.parse(localStorage.getItem('eme.placement')).results);
ok('تحديد المستوى: النتيجة B1 والاختبار توقف بعد مستويين راسبين (B2 وC1)', placed.length === 1 && placed[0].level === 'B1' && asked === 6 + 9 + 6 + 9 + 6, `${placed[0] && placed[0].level} / ${asked} سؤالاً`);
ok('تحديد المستوى: ظهر نص القراءة', sawPassage);
ok('تحديد المستوى: C2 لم يُعرض', placed[0].perLevel.C2.answered === 0 && placed[0].perLevel.C1.answered === 6);
ok('تحديد المستوى: لا تصحيح ظاهر أثناء الاختبار', feedbackSeen === 0, String(feedbackSeen));
await page.click('.tab:has-text("الرئيسية")');
ok('الرئيسية تعرض المستوى', (await page.locator('#root').innerText()).includes('B1 (متوسط)'));
await page.click('.tab:has-text("مستواي")');
ok('الإعادة مقفلة 7 أيام', (await page.locator('#root').innerText()).includes('يمكنك إعادة الاختبار بعد'));

// الخطة اليومية
await page.click('.tab:has-text("خطة اليوم")');
ok('الخطة: لا خطة قبل الإنشاء', (await page.locator('#root').innerText()).includes('كم من الوقت لديك اليوم'));
await page.click('text=15 دقيقة');
await page.click('text=أنشئ خطة اليوم');
const mins = async () => (await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('eme.plans')).days)[0].tasks.map((t) => t.minutes)));
const m15 = await mins();
ok('الخطة 15 دقيقة: مجموع الدقائق 15', m15.reduce((a, b) => a + b, 0) === 15, JSON.stringify(m15));
await page.click('.row >> text=30 دقيقة');
const m30 = await mins();
ok('تغيير الوقت قبل البدء يعيد بناء الخطة: 30 دقيقة (8+5+7+10)', JSON.stringify(m30) === JSON.stringify([8, 5, 7, 10]), JSON.stringify(m30));
const taskCards = await page.locator('.card:has(button.next:has-text("ابدأ"))').count();
ok('الخطة: أربع مهام', taskCards === 4, String(taskCards));
ok('إنهاء الجلسة معطّل قبل أي مهمة', await page.locator('button.next:has-text("أنهِ جلسة اليوم")').isDisabled());
const runQuiz = async () => {
  for (let i = 0; i < 40; i++) {
    if (await page.locator('.score').count()) break;
    await page.locator('.opt').first().click();
    await page.click('.next');
  }
  await page.click('.score .next');
};
// 1) مفردات 2) قواعد 3) تعبيرات جديدة 4) نطق
await page.locator('.card:has-text("مفردات جديدة") button.next').click();
await runQuiz();
ok('المهمة 1 أُنجزت', (await page.locator('#root').innerText()).includes('أُنجز 1 من 4'));
ok('الوقت لا يتغير بعد بدء المهام', (await page.locator('.row >> text=15 دقيقة').count()) === 0);
await page.locator('.card:has-text("قواعد") button.next').first().click();
await page.click('text=ابدأ التمرين');
for (let i = 0; i < 3; i++) { await page.locator('.opt').first().click(); await page.click('.next'); }
await page.click('.score .next');
await page.locator('.card:has-text("تعبيرات ومصطلحات جديدة") button.next').click();
await runQuiz();
await page.locator('.card:has-text("تدريب النطق") button.next').click();
const items = await page.locator('.card .ic[title="نطقتها"]').count();
ok('تدريب النطق: 5 عبارات ولا يكتمل بدون تعليمها', items === 5 && (await page.locator('button.next:has-text("تم")').isDisabled()));
for (let i = 0; i < items; i++) await page.locator('.card .ic[title="نطقتها"]').nth(i).click();
await page.click('button.next:has-text("تم")');
ok('أربع مهام منجزة', (await page.locator('#root').innerText()).includes('أُنجز 4 من 4'));
await page.click('text=أنهِ جلسة اليوم');
const planDay = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('eme.plans')).days)[0]);
ok('الجلسة سُجّلت مرة واحدة بالأعداد الصحيحة', planDay.session && planDay.session.tasksDone === 4 && planDay.session.minutesDone === 30, JSON.stringify(planDay.session));
await page.reload(); await page.waitForSelector('.tabs');
await page.click('.tab:has-text("خطة اليوم")');
const afterReload = await page.locator('#root').innerText();
ok('بعد إعادة التحميل تبقى الجلسة مسجّلة ومقفلة', afterReload.includes('سُجّلت جلسة اليوم') && (await page.locator('button.next:has-text("أنهِ جلسة اليوم")').count()) === 0);
const plansCount = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('eme.plans')).days).length);
ok('خطة واحدة لليوم رغم إعادة التحميل', plansCount === 1);
await page.click('.tab:has-text("الرئيسية")');
ok('الرئيسية تعرض الخطة 4 من 4', (await page.locator('#root').innerText()).includes('خطة اليوم: 4 من 4'));

// V2.5: القراءة والاستماع والكتابة
await page.click('.tab:has-text("مهارات")');
await page.click('.row >> text=قراءة');
ok('القراءة: 8 دروس', (await page.locator('.card:has-text("ابدأ")').count()) === 8);
await page.locator('.card:has-text("Introducing Yourself") button.next').click();
await page.click('text=إظهار الترجمة');
ok('القراءة: الترجمة تظهر', (await page.locator('#root').innerText()).includes('اسمي عمر'));
await page.click('text=🔊');
ok('القراءة: النص يُنطق', (await page.evaluate(() => window.__spoken.at(-1)[0])).startsWith('Hello! My name is Omar'));
await page.locator('.top:has-text("تشرفت بمعرفتك") button').click();
await page.locator('.top:has-text("يعيش") button').click();
const rv = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('eme.review')).items));
const uw = await page.evaluate(() => JSON.parse(localStorage.getItem('eme.userwords')).items);
ok('الكلمات المحفوظة دخلت المراجعة وبنك المستخدم دون تكرار', rv.some((k) => k.startsWith('u-')) && Object.keys(uw).length >= 1 && new Set(Object.values(uw).map((x) => x.en.toLowerCase())).size === Object.keys(uw).length, JSON.stringify(Object.keys(uw)));
await page.click('text=أسئلة الفهم');
for (let i = 0; i < 3; i++) { await page.locator('.opt').first().click(); await page.click('.next'); }
await page.click('.score .next');
const rd = await page.evaluate(() => JSON.parse(localStorage.getItem('eme.skills')).reading['r-001']);
ok('نتيجة درس القراءة حُفظت', rd && rd.attempts === 1 && rd.bestTotal === 3, JSON.stringify(rd));
await page.click('text=رجوع للدروس');
ok('القائمة تعرض أفضل نتيجة', (await page.locator('#root').innerText()).includes('أفضل نتيجة'));

await page.click('.row >> text=استماع');
await page.locator('.card:has-text("Meeting Someone") button.next').click();
ok('الاستماع: الخطوة الأولى بلا نص', !(await page.locator('#root').innerText()).includes("Nice to meet you. Where are you from?") && (await page.locator('#root').innerText()).includes('استمع دون نص'));
await page.click('text=▶ تشغيل');
ok('الاستماع: السطر الأول نُطق', (await page.evaluate(() => window.__spoken.at(-1)[0])) === "Hi, I'm Sara. What's your name?");
await page.click('.next:has-text("التالي")');
ok('الاستماع: الخطوة الثانية تعرض النص', (await page.locator('#root').innerText()).includes('Where are you from?'));
await page.click('.next:has-text("التالي")');
ok('الاستماع: الثالثة بلا نص ثانية', !(await page.locator('.ex:has-text("Where are you from?")').count()));
await page.click('.next:has-text("التالي")');
for (let i = 0; i < 3; i++) { await page.locator('.opt').first().click(); await page.click('.next'); }
await page.click('.score .next');
const ls = await page.evaluate(() => JSON.parse(localStorage.getItem('eme.skills')).listening['l-001']);
ok('نتيجة الاستماع حُفظت وانتقل لحفظ الكلمات', ls && ls.attempts === 1 && (await page.locator('#root').innerText()).includes('كلمات الدرس'));
await page.click('text=إنهاء الدرس');

await page.click('.row >> text=كتابة');
await page.locator('.card:has-text("تصحيح جملة") button.next').first().click();
await page.locator('input.inp').fill('She goes to school every day');
await page.click('text=تحقق');
ok('الكتابة: التصحيح الصحيح', (await page.locator('#root').innerText()).includes('صحيح ✅'));
await page.click('text=رجوع للمهام');
await page.locator('.card:has-text("تكوين جملة") button.next').first().click();
for (const w of ['I', 'drink', 'coffee', 'every', 'morning']) await page.locator(`.chip:text-is("${w}")`).click();
await page.click('button:has-text("تحقق")');
ok('الكتابة: ترتيب الجملة صحيح', (await page.locator('#root').innerText()).includes('صحيح ✅'));
await page.click('text=رجوع للمهام');
await page.locator('.card:has-text("الإجابة عن سؤال") button.next').click();
await page.locator('textarea').fill('In the evening I eat dinner and then I read a book.');
await page.click('text=فحص آلي');
ok('الكتابة: الفحص الآلي يوضح أنه تقريبي', (await page.locator('#root').innerText()).includes('فحص آلي تقريبي'));
await page.click('text=احفظ كتابتي');
await page.reload(); await page.waitForSelector('.tabs');
await page.click('.tab:has-text("مهارات")');
await page.click('.row >> text=كتابة');
await page.click('text=كتاباتي');
ok('الكتابة المحفوظة تبقى بعد إعادة التحميل بنصها الأصلي', (await page.locator('#root').innerText()).includes('In the evening I eat dinner and then I read a book.'));
await page.click('.tab:has-text("الرئيسية")');

// V3.0: المدرس الذكي (يتطلب خادماً تجريبياً على 8787 مع ALLOWED_ORIGIN=http://127.0.0.1:4173)
await page.click('.tab:has-text("المدرس")');
ok('المدرس: تنبيه أنه غير مفعّل قبل ضبط الخادم', (await page.locator('#root').innerText()).includes('غير مفعّل بعد'));
await page.click('text=ابدأ المحادثة');
await page.locator('textarea').fill('Hello there');
await page.click('button:has-text("إرسال")');
await page.waitForSelector('.notice.err');
ok('بلا خادم: رسالة واضحة وبقاء رسالة المستخدم', (await page.locator('.notice.err').innerText()).includes('غير مفعّل') && (await page.locator('.msg.me').count()) === 1);
await page.fill('input[placeholder="https://your-server.example"]', 'http://127.0.0.1:9');
await page.click('button:has-text("حفظ العنوان")');
await page.locator('textarea').fill('I goed to school yesterday');
await page.click('button:has-text("إرسال")');
await page.waitForSelector('.notice.err:has-text("تعذر الوصول")', { timeout: 8000 });
ok('خادم متعطل: خطأ شبكة وزر إعادة المحاولة', (await page.locator('button:has-text("إعادة المحاولة")').count()) === 1);
await goLearn('كلمات');
ok('التطبيق يعمل رغم تعطل المدرس', (await page.locator('.card').count()) === 132);
await page.click('.tab:has-text("المدرس")');
await page.click('button:has-text("سجلي")');
await page.locator('.card:has-text("Free conversation") button.next').first().click();
await page.fill('input[placeholder="https://your-server.example"]', 'http://127.0.0.1:8787');
await page.click('button:has-text("حفظ العنوان")');
await page.click('button:has-text("اختبار الاتصال")');
await page.waitForSelector('text=/الخادم يعمل|تعذر الاتصال بالخادم/');
ok('اختبار الاتصال بالخادم ينجح', (await page.locator('#root').innerText()).includes('الخادم يعمل'));
await page.click('button:has-text("إعادة المحاولة")');
await page.waitForSelector('.msg.ai:has-text("interesting")', { timeout: 8000 });
ok('رد المدرس ظهر بعد إعادة المحاولة (بدون تكرار رسالة المستخدم)', (await page.locator('.msg.me').count()) === 2);
ok('تصحيح فوري: الأصلي والصحيح والشرح', (await page.locator('.rule:has-text("I went")').count()) >= 1 && (await page.locator('#root').innerText()).includes('الماضي من go هو went'));
await page.locator('.rule input.inp').first().fill('I went to school yesterday');
await page.locator('.rule button:has-text("تحقق")').first().click();
ok('تمرين التصحيح القصير', (await page.locator('.rule:has-text("صحيح ✅")').count()) === 1);
const beforeSave = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('eme.userwords') || '{"items":{}}').items).map((x) => x.en));
ok('الكلمات المقترحة لا تُحفظ تلقائياً', !beforeSave.includes('interesting'), JSON.stringify(beforeSave));
await page.locator('.card:has-text("كلمات مقترحة") button:has-text("احفظ للمراجعة")').click();
const afterSave = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('eme.userwords')).items).map((x) => x.en));
ok('الحفظ بعد موافقة المستخدم فقط', afterSave.includes('interesting'), JSON.stringify(afterSave));
const conv = await page.evaluate(() => JSON.parse(localStorage.getItem('eme.tutor')).conversations.at(-1));
ok('المحادثة محفوظة محلياً بسياقها', conv.messages.length >= 3 && conv.messages[0].role === 'user');
await page.click('button:has-text("أنهِ المحادثة")');
ok('إنهاء المحادثة', (await page.locator('#root').innerText()).includes('انتهت المحادثة'));
await page.click('button:has-text("رجوع")');
await page.click('.row >> text=أدوار');
await page.click('button:has-text("بعد الانتهاء")');
await page.locator('.card .card:has-text("At the Doctor") button.pill').click();
ok('لعب الأدوار: الدور والهدف ظاهران', (await page.locator('#root').innerText()).includes('دورك: a patient with a cold'));
await page.locator('textarea').fill('He go to work');
await page.click('button:has-text("إرسال")');
await page.waitForSelector('.msg.ai');
ok('تصحيح بعد الانتهاء: لا يظهر أثناء المحادثة', (await page.locator('.rule:has-text("He goes")').count()) === 0);
await page.click('button:has-text("أنهِ المحادثة")');
ok('بعد الإنهاء تظهر التصحيحات ومعايير التقييم الذاتي', (await page.locator('.rule:has-text("He goes")').count()) === 1 && (await page.locator('#root').innerText()).includes('تقييم ذاتي'));
await page.click('button:has-text("رجوع")');
await page.click('.row >> text=نطق');
await page.click('button:has-text("تحدث")');
await page.waitForSelector('.rule:has-text("فهم المتصفح")');
ok('النطق: مقارنة الكلمات وتنبيه محدودية الدقة', (await page.locator('#root').innerText()).includes('ليست تقييماً متخصصاً') && (await page.locator('#root').innerText()).includes('كلمات تحتاج تدريباً'));
await page.click('.tab:has-text("الرئيسية")');

// V3.5: التقرير والمؤشرات
await page.click('.tab:has-text("تقريري")');
const repText = await page.locator('#root').innerText();
ok('التقرير الأسبوعي: أيام التعلم والجلسات من بيانات فعلية', /أيام التعلم: [1-9]/.test(repText) && /جلسات مسجلة: 1/.test(repText), repText.slice(0, 120).replace(/\n/g, ' '));
await page.click('.row >> text=المؤشرات');
ok('المؤشرات: تنبيه أن الإكمال ليس إتقاناً ووجود 7 مؤشرات', (await page.locator('#root').innerText()).includes('لا يُحسب إتقاناً') && (await page.locator('.card:has(.top b)').count()) === 7);
await page.click('.row >> text=توصيات');
ok('التوصيات مرتبطة بسبب مكتوب', (await page.locator('.card:has-text("لأن:")').count()) >= 1);
await page.click('.row >> text=السجل');
ok('سجل التعلم يعرض جلسة ودرس قراءة', (await page.locator('#root').innerText()).includes('جلسة يومية') && (await page.locator('#root').innerText()).includes('درس قراءة'));
await page.click('.tab:has-text("الرئيسية")');

// الجمل المركبة: إصلاح F1
await goLearn('جمل مركبة');
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
await goLearn('قواعد');
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
  await goLearn(t);
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

// فيض أفقي في التبويبات الجديدة على الهاتف
for (const label of ['مهارات', 'المدرس', 'تقريري', 'خطة اليوم', 'مراجعة', 'مستواي']) {
  await page.click(`.tab:has-text("${label}")`);
  ok(`360px بلا فيض أفقي (${label})`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0);
}
// سطح المكتب
await page.setViewportSize({ width: 1280, height: 800 });
for (const label of ['الرئيسية', 'مهارات', 'تقريري']) {
  await page.click(`.tab:has-text("${label}")`);
  ok(`1280px بلا فيض أفقي (${label})`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0);
}
await page.setViewportSize({ width: 360, height: 740 });
// Offline: بعد تفعيل Service Worker تعمل الواجهة دون شبكة
await page.evaluate(() => navigator.serviceWorker.ready);
await page.reload(); await page.waitForSelector('.tabs');
await page.waitForTimeout(500);
await ctx.setOffline(true);
await page.reload(); await page.waitForSelector('.tabs', { timeout: 8000 });
await goLearn('كلمات');
ok('Offline: المحتوى (132 كلمة) يعمل دون إنترنت', (await page.locator('.card').count()) === 132);
await page.click('.tab:has-text("مهارات")');
await page.locator('.card:has-text("Shopping") button.next').click();
ok('Offline: درس قراءة يعمل', (await page.locator('#root').innerText()).includes('shopping centre'));
await page.click('.tab:has-text("المدرس")');
await page.locator('textarea').first().waitFor({ timeout: 3000 }).catch(() => {});
await ctx.setOffline(false);

ok('لا أخطاء JS طوال الجلسة', errors.length === 0, errors.join(' | '));
await page.screenshot({ path: '/tmp/e2e/shot.png' });
await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} ناجح`);
process.exit(failed.length ? 1 : 0);
