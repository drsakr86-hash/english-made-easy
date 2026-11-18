// تشغيل: node scripts/extract-v1.mjs
// يولّد ملفات البيانات بمعرّفات ثابتة + لقطة V1 المجمّدة من legacy/English Made Easy.v1.html
// تحذير: المعرّفات تُولَّد مرة واحدة فقط. بعد اعتماد الملفات لا يُعاد التشغيل إلا بقرار صريح.
import fs from 'node:fs';
import path from 'node:path';
import { extractV1, findDroppedDuplicates } from './lib/extractV1.mjs';

const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'legacy/English Made Easy.v1.html'), 'utf8');
const v1 = extractV1(html);
const dropped = findDroppedDuplicates(html);

const pad = (n) => String(n).padStart(3, '0');
const line = (o) => '  ' + JSON.stringify(o);
const write = (file, name, items) => {
  const out = `// مولَّد من V1 بواسطة scripts/extract-v1.mjs — لا تعدّل المعرّفات (id) ولا legacyKey يدوياً.\nexport const ${name} = [\n${items.map(line).join(',\n')}\n];\n`;
  fs.writeFileSync(path.join(root, 'src/data/legacy-content', file), out);
};

const simple = (prefix, list) =>
  list.map((x, i) => ({ id: `${prefix}-${pad(i + 1)}`, legacyKey: x.en, en: x.en, ar: x.ar, ex: x.ex, exAr: x.exAr }));

const words = simple('w', v1.words);
// V1 كان يُسقط كلمة improve الثانية (يتحسن) بصمت. تُستعاد هنا بمعرّف جديد في آخر القائمة
// حتى لا تتغير معرّفات العناصر الأخرى. لا legacyKey لها لأن V1 لم يحفظ لها تقدماً أبداً.
dropped.forEach((d, i) => words.push({ id: `w-${pad(v1.words.length + i + 1)}`, legacyKey: null, en: d.en, ar: d.ar, ex: d.ex, exAr: d.exAr }));
const expressions = simple('e', v1.expressions);
const idioms = simple('i', v1.idioms);
const grammar = v1.grammar.map((g, i) => ({
  id: `g-${pad(i + 1)}`,
  legacyKey: g.t,
  title: g.t,
  rule: g.r,
  questions: g.q.map((q) => ({ q: q[0], options: q[1], answer: q[2] })),
}));
const compound = v1.compound.map((c, i) => ({
  id: `c-${pad(i + 1)}`,
  en: c.en,
  ar: c.ar,
  options: c.o,
  answer: c.a,
  note: c.n,
}));

write('words.js', 'words', words);
write('expressions.js', 'expressions', expressions);
write('idioms.js', 'idioms', idioms);
write('grammar.js', 'grammar', grammar);
write('compound.js', 'compound', compound);

const snapshot = {
  source: 'legacy/English Made Easy.v1.html',
  counts: {
    words: v1.words.length,
    expressions: expressions.length,
    idioms: idioms.length,
    grammar: grammar.length,
    grammarQuestions: grammar.reduce((n, g) => n + g.questions.length, 0),
    compound: compound.length,
  },
  droppedByV1Dedupe: dropped,
  v1,
};
fs.writeFileSync(path.join(root, 'tests/fixtures/v1-snapshot.json'), JSON.stringify(snapshot, null, 1));
console.log(JSON.stringify(snapshot.counts), 'dropped:', dropped.map((d) => d.en + '/' + d.ar));
