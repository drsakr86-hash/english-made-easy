// سيناريوهات لعب الأدوار. aiRole = دور المدرس، learnerRole = دور المتعلم.
export const scenarios = [
  { id: 'airport', title: 'At the Airport', titleAr: 'في المطار', level: 'A2', aiRole: 'an airline check-in agent', learnerRole: 'a traveller checking in', goal: 'Check in, mention luggage, ask about the gate', criteria: ['Polite requests', 'Numbers and times', 'Asking questions'] },
  { id: 'hotel', title: 'At the Hotel', titleAr: 'في الفندق', level: 'A2', aiRole: 'a hotel receptionist', learnerRole: 'a guest arriving at the hotel', goal: 'Check in and ask about breakfast and wifi', criteria: ['Polite requests', 'Asking about facilities', 'Spelling your name'] },
  { id: 'restaurant', title: 'At a Restaurant', titleAr: 'في مطعم', level: 'A2', aiRole: 'a waiter', learnerRole: 'a customer', goal: 'Order food and drinks and ask for the bill', criteria: ['Ordering politely', 'Food vocabulary', 'Would like / Can I have'] },
  { id: 'shopping', title: 'Shopping', titleAr: 'التسوق', level: 'A2', aiRole: 'a shop assistant in a clothes shop', learnerRole: 'a customer', goal: 'Ask about size, colour and price', criteria: ['Prices and sizes', 'Asking for help', 'Comparing'] },
  { id: 'directions', title: 'Asking for Directions', titleAr: 'السؤال عن الطريق', level: 'A1', aiRole: 'a friendly local person', learnerRole: 'a tourist who is lost', goal: 'Find the way to a pharmacy', criteria: ['Direction words', 'Excuse me / Could you tell me', 'Understanding instructions'] },
  { id: 'meeting', title: 'Meeting New People', titleAr: 'لقاء أشخاص جدد', level: 'A1', aiRole: 'a new colleague at a party', learnerRole: 'yourself', goal: 'Introduce yourself and ask about the other person', criteria: ['Introductions', 'Present simple', 'Small talk questions'] },
  { id: 'doctor', title: 'At the Doctor', titleAr: 'عند الطبيب', level: 'B1', aiRole: 'a doctor', learnerRole: 'a patient with a cold', goal: 'Describe symptoms and understand advice', criteria: ['Describing symptoms', 'Duration (for/since)', 'Understanding advice'] },
  { id: 'work', title: 'At Work', titleAr: 'في العمل', level: 'B1', aiRole: 'a manager', learnerRole: 'an employee giving a progress update', goal: 'Report progress and ask for help with a deadline', criteria: ['Present perfect', 'Polite requests', 'Work vocabulary'] },
  { id: 'phone', title: 'Making a Phone Call', titleAr: 'إجراء مكالمة', level: 'B1', aiRole: 'a receptionist at a company', learnerRole: 'a caller who wants to speak to someone', goal: 'Ask for a person, leave a message', criteria: ['Phone expressions', 'Spelling', 'Polite language'] },
  { id: 'appointment', title: 'Booking an Appointment', titleAr: 'حجز موعد', level: 'A2', aiRole: 'a clinic receptionist', learnerRole: 'a patient booking a visit', goal: 'Choose a day and time and confirm', criteria: ['Days and times', 'Polite requests', 'Confirming details'] },
];

export const topics = [
  { id: 'daily', title: 'Daily life', titleAr: 'الحياة اليومية' },
  { id: 'food', title: 'Food and cooking', titleAr: 'الطعام والطبخ' },
  { id: 'travel', title: 'Travel and holidays', titleAr: 'السفر والعطلات' },
  { id: 'work', title: 'Work and study', titleAr: 'العمل والدراسة' },
  { id: 'health', title: 'Health and sport', titleAr: 'الصحة والرياضة' },
];
