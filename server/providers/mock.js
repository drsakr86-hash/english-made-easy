// مزود تجريبي حتمي: لا شبكة ولا مفتاح. للتطوير والاختبارات فقط.
const FIXES = [
  [/\bi goed\b/i, 'I went', 'الماضي من go هو went.', 'Yesterday I went to the market.'],
  [/\bhe go\b/i, 'He goes', 'مع he وshe نضيف s للفعل.', 'He goes to work by bus.'],
  [/\bshe go\b/i, 'She goes', 'مع he وshe نضيف s للفعل.', 'She goes to school every day.'],
  [/\bi am agree\b/i, 'I agree', 'agree فعل ولا يحتاج am.', 'I agree with you.'],
];

export function createMockProvider({ fail = false } = {}) {
  return {
    name: 'mock',
    async complete({ messages, system = '' }) {
      if (fail) throw new Error('mock failure');
      const last = messages[messages.length - 1].content;
      const corrections = [];
      if (system.includes('Writing review')) {
        // مراجعة كتابة: تصحيح كل جملة تحتوي خطأً معروفاً، بالجملة كاملة
        for (const s of last.split(/(?<=[.!?])\s+/)) {
          for (const [re, fixed, why, ex] of FIXES) if (re.test(s)) corrections.push({ original: s, corrected: s.replace(re, fixed), explanation: why, example: ex });
        }
        return JSON.stringify({ reply: 'Nice effort! Keep writing every day.', corrections: corrections.slice(0, 5), newWords: [] });
      }
      for (const [re, fixed, why, ex] of FIXES) {
        const m = last.match(re);
        if (m) corrections.push({ original: last, corrected: last.replace(re, fixed), explanation: why, example: ex });
      }
      return JSON.stringify({
        reply: `That sounds interesting! Can you tell me more about "${last.slice(0, 30)}"?`,
        corrections: corrections.slice(0, 2),
        newWords: [{ en: 'interesting', ar: 'مثير للاهتمام', ex: 'That is an interesting idea.', exAr: 'هذه فكرة مثيرة للاهتمام.' }],
      });
    },
  };
}
