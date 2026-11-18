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

export const canSpeak = () => {
  try {
    return typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';
  } catch {
    return false;
  }
};

/** يقرأ سطور محادثة بالتتابع. الصوت الثاني بنبرة مختلفة. يرجع دالة إيقاف. onEnd عند الانتهاء الطبيعي فقط. */
export function speakLines(lines, rate, onEnd) {
  if (!canSpeak()) return () => {};
  let stopped = false;
  speechSynthesis.cancel();
  const next = (i) => {
    if (stopped) return;
    if (i >= lines.length) { if (onEnd) onEnd(); return; }
    const u = new SpeechSynthesisUtterance(lines[i][1]);
    u.lang = 'en-US';
    u.rate = rate;
    u.pitch = lines[i][0] === 'A' ? 1 : 0.75;
    u.onend = () => next(i + 1);
    u.onerror = () => next(i + 1);
    speechSynthesis.speak(u);
  };
  next(0);
  return () => { stopped = true; try { speechSynthesis.cancel(); } catch { /* لا شيء */ } };
}
