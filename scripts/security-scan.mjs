// فحص أمني بسيط: لا أسرار ولا عناوين مزودي AI داخل الواجهة (src وdist). يُنهي بكود 1 عند وجود مخالفة.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const RULES = [
  [/sk-[A-Za-z0-9_-]{16,}/, 'مفتاح بصيغة sk-'],
  [/ANTHROPIC_API_KEY/, 'اسم متغير مفتاح'],
  [/x-api-key/i, 'ترويسة مفتاح'],
  [/api\.anthropic\.com/, 'عنوان مزود AI داخل الواجهة'],
  [/api\.openai\.com/, 'عنوان مزود AI داخل الواجهة'],
  // قواعد الشيفرة: تُطبَّق على شيفرتنا فقط (المكتبات المجمَّعة في dist تحتوي هذه الكلمات داخلياً)
  [/dangerouslySetInnerHTML/, 'حقن HTML', true],
  [/\beval\s*\(/, 'eval', true],
  [/new Function\s*\(/, 'new Function', true],
];

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

export function scan(roots) {
  const bad = [];
  let files = 0;
  for (const r of roots) {
    if (!existsSync(r)) continue;
    for (const f of walk(r)) {
      if (!/\.(js|jsx|mjs|html|css|json|webmanifest)$/.test(f)) continue;
      files++;
      const t = readFileSync(f, 'utf8');
      for (const [re, why, ourCodeOnly] of RULES) if (!(ourCodeOnly && f.startsWith('dist')) && re.test(t)) bad.push(`${f}: ${why}`);
    }
  }
  return { bad, files };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { bad, files } = scan(process.argv.slice(2).length ? process.argv.slice(2) : ['src', 'dist']);
  console.log(`فُحص ${files} ملفاً`);
  if (bad.length) { console.log(bad.join('\n')); process.exit(1); }
  console.log('لا مخالفات');
}
