import { describe, it, expect } from 'vitest';
import { createMemoryStorage } from '../../src/storage/localStorage.js';
import { loadToken, saveToken, consumeInviteFromHash } from '../../src/storage/tutor.js';
import { inviteLink } from '../../scripts/learners.mjs';
import { issueToken } from '../../server/auth.js';

const SECRET = 'k'.repeat(40);
const mkHist = () => { const calls = []; return { calls, replaceState: (...a) => calls.push(a) }; };
const loc = (hash) => ({ hash, pathname: '/english-made-easy/', search: '' });

describe('رابط الدعوة', () => {
  it('يحفظ رمزاً صالحاً من الرابط ويمحو الجزء بعد # من شريط العنوان', () => {
    const { token } = issueToken({ secret: SECRET });
    const st = createMemoryStorage();
    const h = mkHist();
    expect(consumeInviteFromHash(st, loc('#t=' + token), h)).toBe(true);
    expect(loadToken(st)).toBe(token);
    expect(h.calls).toEqual([[null, '', '/english-made-easy/']]);
  });

  it('الرابط المولَّد من السكربت يعود كما هو بعد المعالجة', () => {
    const { token } = issueToken({ secret: SECRET });
    const link = inviteLink('https://drsakr86-hash.github.io/english-made-easy/#old', token);
    expect(link).toBe('https://drsakr86-hash.github.io/english-made-easy/#t=' + token);
    const st = createMemoryStorage();
    expect(consumeInviteFromHash(st, loc(new URL(link).hash), mkHist())).toBe(true);
    expect(loadToken(st)).toBe(token);
  });

  it('لا يلمس الرمز الحالي إذا كان الرابط بلا دعوة أو بشكل خاطئ', () => {
    const st = createMemoryStorage();
    saveToken(st, 'eme1.aaa.bbb');
    for (const hash of ['', '#', '#tab=words', '#t=', '#t=garbage', '#t=eme1.only-two', '#t=eme1.a.b&x=1', '#t=%E0%A4%A']) {
      const h = mkHist();
      expect(consumeInviteFromHash(st, loc(hash), h)).toBe(false);
      expect(loadToken(st)).toBe('eme1.aaa.bbb');
    }
  });

  it('لا ينهار إن فشل الحفظ ولا يزعم النجاح', () => {
    const { token } = issueToken({ secret: SECRET });
    const st = { getItem: () => null, setItem: () => { throw new Error('quota'); }, removeItem() {} };
    expect(consumeInviteFromHash(st, loc('#t=' + token), mkHist())).toBe(false);
  });
});
