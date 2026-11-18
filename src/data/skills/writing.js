// مهام الكتابة. type: build (ترتيب كلمات، إجابة ثابتة) | fix (تصحيح، إجابة ثابتة)
// | free (فقرة/موقف/رسالة/سؤال: حفظ وفحص آلي تقريبي فقط). معرّفات ثابتة t-NNN.
export const writing = [
  { id: 't-001', type: 'build', level: 'A1', prompt: 'رتّب الكلمات لتكوين جملة صحيحة', words: ['I', 'every', 'morning', 'coffee', 'drink'], answer: 'I drink coffee every morning.' },
  { id: 't-002', type: 'build', level: 'A1', prompt: 'رتّب الكلمات لتكوين جملة صحيحة', words: ['is', 'my', 'a', 'teacher', 'father'], answer: 'My father is a teacher.' },
  { id: 't-003', type: 'build', level: 'A2', prompt: 'رتّب الكلمات لتكوين جملة صحيحة', words: ['yesterday', 'went', 'we', 'to', 'the', 'market'], answer: 'We went to the market yesterday.' },
  { id: 't-004', type: 'fix', level: 'A1', prompt: 'صحّح الخطأ في الجملة', text: 'She go to school every day.', answer: 'She goes to school every day.' },
  { id: 't-005', type: 'fix', level: 'A2', prompt: 'صحّح الخطأ في الجملة', text: 'I have visited Paris last year.', answer: 'I visited Paris last year.' },
  { id: 't-006', type: 'fix', level: 'A2', prompt: 'صحّح الخطأ في الجملة', text: 'He is more taller than me.', answer: 'He is taller than me.' },
  { id: 't-007', type: 'free', level: 'A1', kind: 'answer', prompt: 'أجب عن السؤال بجملتين على الأقل: What do you do in the evening?', minWords: 8, keywords: [] },
  { id: 't-008', type: 'free', level: 'A2', kind: 'paragraph', prompt: 'اكتب فقرة قصيرة (40 كلمة تقريباً) عن عائلتك.', minWords: 30, keywords: ['family'] },
  { id: 't-009', type: 'free', level: 'A2', kind: 'situation', prompt: 'صف موقفاً: ذهبت إلى مطعم وتأخر الطعام. ماذا قلت للنادل؟', minWords: 20, keywords: ['waiter', 'food'] },
  { id: 't-010', type: 'free', level: 'B1', kind: 'message', prompt: 'اكتب رسالة قصيرة لصديق تدعوه فيها لزيارتك في عطلة نهاية الأسبوع.', minWords: 30, keywords: ['weekend'] },
];
