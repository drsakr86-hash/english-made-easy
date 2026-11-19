// إصدار رمز دعوة لمتعلم: TUTOR_TOKEN_SECRET=... node scripts/issue-token.mjs [--days 30] [--label اسم]
// يطبع المعرّف (للإبطال لاحقاً عبر REVOKED_TOKEN_IDS) والرمز (يُسلَّم للمتعلم). الاسم label يُطبع فقط ولا يدخل الرمز.
import { issueToken } from '../server/auth.js';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
try {
  const r = issueToken({ secret: process.env.TUTOR_TOKEN_SECRET, ttlDays: Number(opt('days', '30')) });
  const label = opt('label', '');
  console.log(`id:      ${r.id}${label ? '  (' + label + ')' : ''}`);
  console.log(`expires: ${r.expiresAt}`);
  console.log(`token:   ${r.token}`);
  console.log('احتفظ بالمعرّف وبمن يخصه: لإبطال الرمز أضف المعرّف إلى REVOKED_TOKEN_IDS.');
} catch (e) {
  console.error('error: ' + e.message + ' (يلزم TUTOR_TOKEN_SECRET بطول 32 حرفاً على الأقل)');
  process.exit(1);
}
