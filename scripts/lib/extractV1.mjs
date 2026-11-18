// يستخرج المحتوى التعليمي من ملف V1 كما يراه المستخدم (بعد addUnique وpush).
import vm from 'node:vm';

export function extractV1(html) {
  const start = html.indexOf('const W = [');
  const end = html.indexOf('const SECTIONS=');
  if (start < 0 || end < 0) throw new Error('تعذر تحديد مقطع البيانات في ملف V1');
  const body = html.slice(start, end);
  // المقطع الخام قبل الدمج لحساب العناصر المحذوفة بسبب التكرار
  const code = `(function(){${body}\nreturn {W,E,I,G,C};})()`;
  const merged = vm.runInNewContext(code, {});
  return {
    words: merged.W,
    expressions: merged.E,
    idioms: merged.I,
    grammar: merged.G,
    compound: merged.C,
  };
}

// العناصر التي أسقطها addUnique بسبب تكرار en (للتوثيق فقط)
export function findDroppedDuplicates(html) {
  const start = html.indexOf('const W = [');
  const firstMap = html.indexOf('const mk=');
  const body = html.slice(start, firstMap);
  const raw = vm.runInNewContext(`(function(){${body}\nreturn W;})()`, {});
  const seen = new Set();
  const dropped = [];
  raw.forEach((x) => {
    if (seen.has(x.en)) dropped.push(x);
    seen.add(x.en);
  });
  return dropped;
}
