// سجل المتعلمين (محلي على جهازك فقط): إصدار رموز وإبطالها وطباعة قائمة الإبطال الجاهزة للصق في Render.
//   TUTOR_TOKEN_SECRET=... node scripts/learners.mjs add --label أحمد [--days 30]
//   node scripts/learners.mjs list
//   node scripts/learners.mjs revoke <معرّف|اسم>
//   node scripts/learners.mjs revoked      # يطبع سطر REVOKED_TOKEN_IDS
// الملف learners.json (أو LEARNERS_FILE) يحوي المعرّفات والأسماء فقط؛ الرمز نفسه لا يُحفظ. لا ترفعه إلى GitHub (مُستثنى في .gitignore).
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { issueToken } from '../server/auth.js';

export function loadRegistry(path) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch (e) {
    if (e && e.code === 'ENOENT') return { learners: [] };
    throw e;
  }
  const r = JSON.parse(text); // ملف تالف يرمي خطأً ولا يُستبدل بفارغ
  if (!r || !Array.isArray(r.learners)) throw new Error('learners file has wrong shape');
  return r;
}

function save(path, reg) {
  writeFileSync(path + '.tmp', JSON.stringify(reg, null, 2));
  renameSync(path + '.tmp', path);
}

export function addLearner(path, { secret, label, days = 30, now = Date.now() }) {
  if (!label || !String(label).trim()) throw new Error('--label is required');
  const reg = loadRegistry(path);
  const t = issueToken({ secret, ttlDays: days, now });
  reg.learners.push({ id: t.id, label: String(label).trim(), issuedAt: new Date(now).toISOString(), expiresAt: t.expiresAt, revoked: false });
  save(path, reg);
  return t; // الرمز يُعرض مرة واحدة ولا يُحفظ
}

const status = (l, now) => (l.revoked ? 'مُبطَل' : Date.parse(l.expiresAt) <= now ? 'منتهٍ' : 'فعّال');

export function listLearners(path, now = Date.now()) {
  return loadRegistry(path).learners.map((l) => ({ ...l, status: status(l, now) }));
}

export function revokeLearner(path, who, now = Date.now()) {
  const reg = loadRegistry(path);
  const hits = reg.learners.filter((l) => l.id === who || l.label === who);
  if (hits.length === 0) throw new Error('no learner matches: ' + who);
  if (hits.length > 1) throw new Error('more than one learner matches (use the id): ' + hits.map((h) => h.id).join(', '));
  hits[0].revoked = true;
  hits[0].revokedAt = new Date(now).toISOString();
  save(path, reg);
  return hits[0];
}

/** سطر جاهز للصق في Render: المُبطَلون الذين لم تنتهِ صلاحية رموزهم بعد. */
export function revokedLine(path, now = Date.now()) {
  const ids = loadRegistry(path).learners.filter((l) => l.revoked && Date.parse(l.expiresAt) > now).map((l) => l.id);
  return `REVOKED_TOKEN_IDS=${ids.join(',')}`;
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const file = process.env.LEARNERS_FILE || 'learners.json';
  const opt = (n, d) => { const i = rest.indexOf('--' + n); return i >= 0 && rest[i + 1] ? rest[i + 1] : d; };
  try {
    if (cmd === 'add') {
      const t = addLearner(file, { secret: process.env.TUTOR_TOKEN_SECRET, label: opt('label', ''), days: Number(opt('days', '30')) });
      console.log(`id:      ${t.id}\nexpires: ${t.expiresAt}\ntoken:   ${t.token}\nسلّم الرمز للمتعلم الآن؛ لا يُحفظ في السجل ولا يمكن عرضه مرة أخرى.`);
    } else if (cmd === 'list') {
      const rows = listLearners(file);
      if (!rows.length) return console.log('لا يوجد متعلمون بعد.');
      for (const l of rows) console.log(`${l.id}  ${l.status.padEnd(6)}  ينتهي ${l.expiresAt.slice(0, 10)}  ${l.label}`);
    } else if (cmd === 'revoke' && rest[0]) {
      const l = revokeLearner(file, rest[0]);
      console.log(`أُبطل ${l.id} (${l.label}). الصق هذا في Render ثم احفظ:\n${revokedLine(file)}`);
    } else if (cmd === 'revoked') {
      console.log(revokedLine(file));
    } else {
      console.log('الأوامر: add --label اسم [--days 30] | list | revoke <معرّف|اسم> | revoked');
      process.exit(cmd ? 1 : 0);
    }
  } catch (e) {
    console.error('error: ' + e.message);
    process.exit(1);
  }
}
if (import.meta.url === `file://${process.argv[1]}`) main();
