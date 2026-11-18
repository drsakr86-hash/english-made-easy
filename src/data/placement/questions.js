// بنك أسئلة تحديد المستوى — المسودة المعتمدة (claude/PLACEMENT_QUESTION_BANK_DRAFT.md).
// answer = فهرس الإجابة الصحيحة في options. الخيارات تُخلط عند العرض وتُحسب الإجابة بقيمتها.
export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const passages = {
  'rd-a2': {
    level: 'A2',
    text: 'Sara gets up at six o\'clock every morning. She has breakfast with her family and then takes the bus to school. School finishes at two o\'clock. In the afternoon she does her homework and helps her mother in the kitchen. On Fridays she visits her grandmother.',
  },
  'rd-b2': {
    level: 'B2',
    text: 'Remote work has changed the way many companies operate. Employees save time and money because they no longer commute, and many report being more productive at home. However, managers worry that teams lose the spontaneous conversations that often lead to new ideas. As a result, a growing number of firms now ask staff to work from the office two or three days a week, hoping to combine flexibility with collaboration.',
  },
};

const q = (id, level, skill, stem, options, answer, passage) => ({ id, level, skill, q: stem, options, answer, ...(passage ? { passage } : {}) });

export const questions = [
  // A1
  q('V1', 'A1', 'vocabulary', 'A place where you buy medicine is a ___.', ['pharmacy', 'library', 'bakery', 'stadium'], 0),
  q('V2', 'A1', 'vocabulary', 'Monday, Tuesday and Wednesday are days of the ___.', ['month', 'week', 'year', 'hour'], 1),
  q('V3', 'A1', 'vocabulary', 'My mother\'s sister is my ___.', ['uncle', 'cousin', 'aunt', 'niece'], 2),
  q('G1', 'A1', 'grammar', 'She ___ a doctor.', ['am', 'is', 'are', 'be'], 1),
  q('G2', 'A1', 'grammar', '___ you like coffee?', ['Does', 'Are', 'Is', 'Do'], 3),
  q('G3', 'A1', 'grammar', 'There are two ___ in the room.', ['chair', 'a chair', 'chaires', 'chairs'], 3),
  // A2
  q('V4', 'A2', 'vocabulary', 'The opposite of "cheap" is ___.', ['quick', 'expensive', 'empty', 'late'], 1),
  q('V5', 'A2', 'vocabulary', 'A ___ is a person who cooks food in a restaurant.', ['pilot', 'driver', 'chef', 'dentist'], 2),
  q('V6', 'A2', 'vocabulary', 'We use an ___ when it rains.', ['envelope', 'umbrella', 'elevator', 'address'], 1),
  q('G4', 'A2', 'grammar', 'Yesterday I ___ to the market.', ['go', 'gone', 'went', 'going'], 2),
  q('G5', 'A2', 'grammar', 'He is ___ than his brother.', ['tallest', 'more tall', 'tall', 'taller'], 3),
  q('G6', 'A2', 'grammar', 'I\'m ___ to visit Cairo next week.', ['going', 'go', 'went', 'goes'], 0),
  q('R1', 'A2', 'reading', 'How does Sara go to school?', ['On foot', 'By car', 'By bus', 'By train'], 2, 'rd-a2'),
  q('R2', 'A2', 'reading', 'What time does school finish?', ['At two o\'clock', 'At six o\'clock', 'At four o\'clock', 'At noon'], 0, 'rd-a2'),
  q('R3', 'A2', 'reading', 'When does Sara visit her grandmother?', ['Every morning', 'On Mondays', 'After school every day', 'On Fridays'], 3, 'rd-a2'),
  // B1
  q('V7', 'B1', 'vocabulary', 'She was so ___ about the exam that she couldn\'t sleep.', ['generous', 'anxious', 'ordinary', 'polite'], 1),
  q('V8', 'B1', 'vocabulary', 'I need to ___ my passport before the trip because it has expired.', ['refuse', 'reduce', 'repeat', 'renew'], 3),
  q('V9', 'B1', 'vocabulary', 'The company decided to ___ the meeting because the manager was ill.', ['postpone', 'prepare', 'protect', 'promise'], 0),
  q('G7', 'B1', 'grammar', 'If it rains tomorrow, we ___ at home.', ['stayed', 'will stay', 'would stay', 'staying'], 1),
  q('G8', 'B1', 'grammar', 'I have lived here ___ 2019.', ['for', 'during', 'since', 'from'], 2),
  q('G9', 'B1', 'grammar', 'The report ___ by the team last week.', ['finished', 'is finishing', 'was finished', 'has finish'], 2),
  // B2
  q('V10', 'B2', 'vocabulary', 'Her explanation was so ___ that nobody could understand what she meant.', ['reliable', 'ambiguous', 'generous', 'cautious'], 1),
  q('V11', 'B2', 'vocabulary', 'The company had to ___ many workers because of the economic crisis.', ['put on', 'take after', 'lay off', 'look up'], 2),
  q('V12', 'B2', 'vocabulary', 'Despite the heavy rain, the match went ahead as ___.', ['reluctant', 'scheduled', 'reliable', 'occasional'], 1),
  q('G10', 'B2', 'grammar', 'If I ___ harder, I would have passed the exam.', ['studied', 'had studied', 'have studied', 'would study'], 1),
  q('G11', 'B2', 'grammar', 'She suggested ___ the meeting until next week.', ['to postpone', 'postpone', 'postponing', 'postponed'], 2),
  q('G12', 'B2', 'grammar', 'By the time we arrived, the film ___.', ['already started', 'has already started', 'was already start', 'had already started'], 3),
  q('R4', 'B2', 'reading', 'What advantage for employees does the text mention?', ['They earn higher salaries', 'They save time and money on commuting', 'They have shorter meetings', 'They work fewer hours'], 1, 'rd-b2'),
  q('R5', 'B2', 'reading', 'What concern do managers have?', ['Employees will stop working', 'Offices will become too expensive', 'Teams may lose informal conversations that produce ideas', 'Staff will refuse to attend meetings'], 2, 'rd-b2'),
  q('R6', 'B2', 'reading', 'What are many firms doing now?', ['Closing their offices', 'Banning remote work completely', 'Hiring only remote staff', 'Requiring some office days each week'], 3, 'rd-b2'),
  // C1
  q('V13', 'C1', 'vocabulary', 'His argument was so ___ that it left no room for doubt.', ['tedious', 'frail', 'compelling', 'elusive'], 2),
  q('V14', 'C1', 'vocabulary', 'The new regulations are intended to ___ the damage to the environment.', ['exaggerate', 'accumulate', 'contemplate', 'mitigate'], 3),
  q('V15', 'C1', 'vocabulary', 'She has a ___ for languages; she learns them almost effortlessly.', ['knack', 'hurdle', 'grudge', 'mishap'], 0),
  q('G13', 'C1', 'grammar', 'Hardly ___ the building when the alarm went off.', ['we had entered', 'had we entered', 'did we enter', 'we entered'], 1),
  q('G14', 'C1', 'grammar', 'I wish I ___ more time to prepare yesterday.', ['have had', 'would have', 'had had', 'had'], 2),
  q('G15', 'C1', 'grammar', 'Not only ___ late, but he also forgot the documents.', ['he arrived', 'arrived he', 'he did arrive', 'did he arrive'], 3),
  // C2
  q('V16', 'C2', 'vocabulary', 'His ___ remarks offended everyone, although he claimed he was merely being candid.', ['benign', 'caustic', 'meticulous', 'lucid'], 1),
  q('V17', 'C2', 'vocabulary', 'The scandal had a ___ effect on the firm\'s reputation that took years to repair.', ['ephemeral', 'auspicious', 'negligible', 'deleterious'], 3),
  q('V18', 'C2', 'vocabulary', 'The two theories are not mutually exclusive; they can be ___.', ['dissolved', 'reconciled', 'compelled', 'fabricated'], 1),
  q('G16', 'C2', 'grammar', 'Were it not for your help, I ___ the deadline.', ['would miss', 'will have missed', 'would have missed', 'had missed'], 2),
  q('G17', 'C2', 'grammar', 'No sooner had she left ___ the phone rang.', ['when', 'than', 'then', 'as'], 1),
  q('G18', 'C2', 'grammar', 'It is essential that every candidate ___ the form before Friday.', ['submits', 'submit', 'submitted', 'will submit'], 1),
];
