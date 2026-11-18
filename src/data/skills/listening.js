// دروس الاستماع: محادثات قصيرة تُقرأ بصوت المتصفح (Speech Synthesis). معرّفات ثابتة l-NNN.
// speaker: A/B فقط ليتبدل الصوت إن وُجد صوتان.
export const listening = [
  {
    id: 'l-001', title: 'Meeting Someone', titleAr: 'لقاء شخص جديد', level: 'A1',
    lines: [
      ['A', "Hi, I'm Sara. What's your name?"],
      ['B', "Hello, Sara. I'm Khaled. Nice to meet you."],
      ['A', 'Nice to meet you too. Where are you from?'],
      ['B', "I'm from Egypt. And you?"],
      ['A', "I'm from Jordan, but I live in Dubai."],
    ],
    vocab: [{ en: 'Where are you from?', ar: 'من أين أنت؟', ex: 'Where are you from?', exAr: 'من أين أنت؟' }],
    questions: [
      { q: 'What is the first speaker\'s name?', options: ['Sara', 'Khaled', 'Dubai'], answer: 0 },
      { q: 'Where is Khaled from?', options: ['Jordan', 'Egypt', 'Dubai'], answer: 1 },
      { q: 'Where does Sara live?', options: ['In Dubai', 'In Egypt', 'In Jordan'], answer: 0 },
    ],
  },
  {
    id: 'l-002', title: 'At a Café', titleAr: 'في المقهى', level: 'A1',
    lines: [
      ['A', 'Good morning. What would you like?'],
      ['B', 'A coffee with milk, please.'],
      ['A', 'Anything else?'],
      ['B', 'Yes, a chocolate cake. How much is it?'],
      ['A', 'That is eight pounds, please.'],
    ],
    vocab: [{ en: 'Anything else?', ar: 'أي شيء آخر؟', ex: 'Anything else, sir?', exAr: 'أي شيء آخر يا سيدي؟' }],
    questions: [
      { q: 'What drink does the customer order?', options: ['Tea', 'Coffee with milk', 'Juice'], answer: 1 },
      { q: 'What food does the customer order?', options: ['A sandwich', 'A chocolate cake', 'Nothing'], answer: 1 },
      { q: 'How much is the total?', options: ['Five pounds', 'Eight pounds', 'Ten pounds'], answer: 1 },
    ],
  },
  {
    id: 'l-003', title: 'Asking for Directions', titleAr: 'السؤال عن الطريق', level: 'A2',
    lines: [
      ['A', 'Excuse me, is there a pharmacy near here?'],
      ['B', 'Yes, go straight and turn left at the traffic lights.'],
      ['A', 'Is it far?'],
      ['B', 'No, it is about five minutes on foot. It is next to the bank.'],
      ['A', 'Thank you very much.'],
    ],
    vocab: [{ en: 'turn left', ar: 'انعطف يساراً', ex: 'Turn left at the corner.', exAr: 'انعطف يساراً عند الناصية.' }],
    questions: [
      { q: 'What is the man looking for?', options: ['A bank', 'A pharmacy', 'A hotel'], answer: 1 },
      { q: 'Where should he turn left?', options: ['At the traffic lights', 'At the bank', 'At the station'], answer: 0 },
      { q: 'How long does it take on foot?', options: ['About five minutes', 'About fifty minutes', 'About one hour'], answer: 0 },
    ],
  },
  {
    id: 'l-004', title: 'Booking an Appointment', titleAr: 'حجز موعد', level: 'A2',
    lines: [
      ['A', 'Good afternoon. I would like to book an appointment with the doctor.'],
      ['B', 'Certainly. Is tomorrow at ten o\'clock okay?'],
      ['A', 'I am afraid I am busy at ten. Do you have anything in the afternoon?'],
      ['B', 'Yes, we have a free slot at three thirty.'],
      ['A', 'That is perfect. Thank you.'],
    ],
    vocab: [{ en: 'appointment', ar: 'موعد', ex: 'I have an appointment today.', exAr: 'لدي موعد اليوم.' }],
    questions: [
      { q: 'Why does the patient refuse ten o\'clock?', options: ['He is busy', 'The clinic is closed', 'He is sick'], answer: 0 },
      { q: 'What time is the new appointment?', options: ['Ten o\'clock', 'Three thirty', 'Four thirty'], answer: 1 },
      { q: 'Who does the patient want to see?', options: ['A teacher', 'The doctor', 'A manager'], answer: 1 },
    ],
  },
  {
    id: 'l-005', title: 'At the Airport', titleAr: 'في المطار', level: 'B1',
    lines: [
      ['A', 'Good evening. May I see your passport and ticket, please?'],
      ['B', 'Here you are. Do I need to check in this bag?'],
      ['A', 'Yes, it is too heavy for the cabin. It will cost twenty dollars extra.'],
      ['B', 'That is fine. Which gate should I go to?'],
      ['A', 'Gate twelve. Boarding starts in forty minutes, so please do not be late.'],
    ],
    vocab: [{ en: 'boarding', ar: 'الصعود إلى الطائرة', ex: 'Boarding starts at six.', exAr: 'يبدأ الصعود في السادسة.' }],
    questions: [
      { q: 'Why must the bag be checked in?', options: ['It is too heavy for the cabin', 'It is broken', 'It is empty'], answer: 0 },
      { q: 'How much extra does it cost?', options: ['Ten dollars', 'Twenty dollars', 'Forty dollars'], answer: 1 },
      { q: 'Which gate is it?', options: ['Gate two', 'Gate twelve', 'Gate twenty'], answer: 1 },
    ],
  },
  {
    id: 'l-006', title: 'A Phone Call', titleAr: 'مكالمة هاتفية', level: 'B1',
    lines: [
      ['A', 'Hello, this is Mr. Adel from the marketing department. May I speak to Ms. Hana?'],
      ['B', 'I am sorry, she is in a meeting right now. Can I take a message?'],
      ['A', 'Yes, please tell her that the report is ready, and ask her to call me back after lunch.'],
      ['B', 'Certainly. Could you spell your name for me?'],
      ['A', 'Of course. It is A, D, E, L.'],
    ],
    vocab: [{ en: 'take a message', ar: 'يدوّن رسالة', ex: 'Can I take a message?', exAr: 'هل أدوّن رسالة؟' }],
    questions: [
      { q: 'Why can Ms. Hana not answer?', options: ['She is in a meeting', 'She is at lunch', 'She is on holiday'], answer: 0 },
      { q: 'What is the message?', options: ['The report is ready', 'The meeting is cancelled', 'Lunch is ready'], answer: 0 },
      { q: 'When should she call back?', options: ['Before the meeting', 'After lunch', 'Tomorrow morning'], answer: 1 },
    ],
  },
];
