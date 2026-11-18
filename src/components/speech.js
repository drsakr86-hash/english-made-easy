// سلوك V1 كما هو: نطق en-US بسرعة 0.9 وفشل صامت. (تحسين الكشف عن الدعم في مرحلة لاحقة)
export function speak(t) {
  try {
    const u = new SpeechSynthesisUtterance(t);
    u.lang = 'en-US';
    u.rate = 0.9;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch {
    /* V1 يبتلع الخطأ */
  }
}
