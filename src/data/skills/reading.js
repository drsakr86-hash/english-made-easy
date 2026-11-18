// دروس القراءة (محتوى أصلي كتبه المشروع). معرّفات ثابتة r-NNN.
export const reading = [
  {
    id: 'r-001', title: 'Introducing Yourself', titleAr: 'تقديم نفسك', level: 'A1',
    text: "Hello! My name is Omar. I am twenty-eight years old. I am from Egypt, and I live in Alexandria. I work in a hospital. I am a doctor. I like football and I like reading books. Nice to meet you!",
    ar: 'مرحباً! اسمي عمر. عمري ثمانية وعشرون عاماً. أنا من مصر وأعيش في الإسكندرية. أعمل في مستشفى. أنا طبيب. أحب كرة القدم وأحب قراءة الكتب. تشرفت بمعرفتك!',
    vocab: [
      { en: 'hospital', ar: 'مستشفى', ex: 'She works in a hospital.', exAr: 'هي تعمل في مستشفى.' },
      { en: 'live', ar: 'يعيش', ex: 'They live in Cairo.', exAr: 'هم يعيشون في القاهرة.' },
      { en: 'Nice to meet you.', ar: 'تشرفت بمعرفتك.', ex: 'Nice to meet you, Sara.', exAr: 'تشرفت بمعرفتك يا سارة.' },
    ],
    questions: [
      { q: 'Where does Omar live?', options: ['In Cairo', 'In Alexandria', 'In a hospital'], answer: 1 },
      { q: 'What is his job?', options: ['He is a teacher', 'He is a football player', 'He is a doctor'], answer: 2 },
      { q: 'What does Omar like?', options: ['Football and books', 'Cooking and music', 'Travel and films'], answer: 0 },
    ],
  },
  {
    id: 'r-002', title: 'Family and Friends', titleAr: 'العائلة والأصدقاء', level: 'A1',
    text: "I have a small family. My father is a teacher and my mother is a nurse. I have one brother and one sister. My brother is older than me. My best friend is Ali. We play football together on Fridays. On weekends, we visit my grandparents.",
    ar: 'لدي عائلة صغيرة. أبي معلم وأمي ممرضة. لدي أخ واحد وأخت واحدة. أخي أكبر مني. أفضل أصدقائي علي. نلعب كرة القدم معاً أيام الجمعة. في عطلات نهاية الأسبوع نزور جدي وجدتي.',
    vocab: [
      { en: 'nurse', ar: 'ممرضة', ex: 'The nurse is very kind.', exAr: 'الممرضة لطيفة جداً.' },
      { en: 'older than', ar: 'أكبر من', ex: 'He is older than me.', exAr: 'هو أكبر مني.' },
      { en: 'grandparents', ar: 'الجد والجدة', ex: 'I visit my grandparents often.', exAr: 'أزور جدي وجدتي كثيراً.' },
    ],
    questions: [
      { q: "What is the writer's mother?", options: ['A teacher', 'A nurse', 'A doctor'], answer: 1 },
      { q: 'When do the friends play football?', options: ['On Fridays', 'Every morning', 'On Mondays'], answer: 0 },
      { q: 'Who visits the grandparents?', options: ['Only the brother', 'The writer and the family on weekends', 'Nobody'], answer: 1 },
    ],
  },
  {
    id: 'r-003', title: 'Daily Routine', titleAr: 'الروتين اليومي', level: 'A2',
    text: "I usually wake up at six o'clock. First, I take a shower and have breakfast. Then I go to work by bus. I start work at eight and finish at four. After work, I sometimes go to the gym. In the evening, I cook dinner and watch a film. I go to bed at eleven.",
    ar: 'أستيقظ عادةً في السادسة. أولاً آخذ دشاً وأتناول الفطور. ثم أذهب إلى العمل بالحافلة. أبدأ العمل في الثامنة وأنتهي في الرابعة. بعد العمل أذهب أحياناً إلى النادي الرياضي. في المساء أطبخ العشاء وأشاهد فيلماً. أنام في الحادية عشرة.',
    vocab: [
      { en: 'wake up', ar: 'يستيقظ', ex: 'I wake up early.', exAr: 'أستيقظ مبكراً.' },
      { en: 'usually', ar: 'عادةً', ex: 'I usually walk to school.', exAr: 'عادةً أمشي إلى المدرسة.' },
      { en: 'gym', ar: 'نادي رياضي', ex: 'He goes to the gym twice a week.', exAr: 'يذهب إلى النادي مرتين أسبوعياً.' },
    ],
    questions: [
      { q: 'How does the writer go to work?', options: ['By car', 'By bus', 'On foot'], answer: 1 },
      { q: 'What time does work finish?', options: ['At four', 'At eight', 'At eleven'], answer: 0 },
      { q: 'What does the writer do in the evening?', options: ['Goes to the gym', 'Cooks dinner and watches a film', 'Starts work'], answer: 1 },
    ],
  },
  {
    id: 'r-004', title: 'Shopping', titleAr: 'التسوق', level: 'A2',
    text: "Yesterday I went to the shopping centre to buy a jacket. I looked at many shops, but the jackets were expensive. Finally, I found a nice one on sale. It was half price, so I bought it. The shop assistant was very helpful. She also gave me a free bag.",
    ar: 'أمس ذهبت إلى مركز التسوق لأشتري سترة. نظرت في محلات كثيرة لكن السترات كانت غالية. أخيراً وجدت واحدة جميلة في التخفيضات. كانت بنصف السعر فاشتريتها. كانت البائعة مفيدة جداً. وأعطتني أيضاً حقيبة مجانية.',
    vocab: [
      { en: 'on sale', ar: 'في التخفيضات', ex: 'These shoes are on sale.', exAr: 'هذه الأحذية في التخفيضات.' },
      { en: 'expensive', ar: 'غالٍ', ex: 'This phone is too expensive.', exAr: 'هذا الهاتف غالٍ جداً.' },
      { en: 'half price', ar: 'نصف السعر', ex: 'The books are half price today.', exAr: 'الكتب بنصف السعر اليوم.' },
    ],
    questions: [
      { q: 'Why did the writer go to the shopping centre?', options: ['To buy a jacket', 'To meet a friend', 'To eat lunch'], answer: 0 },
      { q: 'Why did the writer buy the jacket?', options: ['It was a gift', 'It was half price', 'It was the first shop'], answer: 1 },
      { q: 'What did the shop assistant give?', options: ['A free bag', 'A discount card', 'A second jacket'], answer: 0 },
    ],
  },
  {
    id: 'r-005', title: 'Travel', titleAr: 'السفر', level: 'B1',
    text: "Last summer, I travelled to Turkey with my family. We booked the flights three months in advance, which saved us a lot of money. We stayed in a small hotel near the sea and visited several historical places. Although the weather was very hot, we enjoyed every moment. The only problem was that our luggage arrived a day late.",
    ar: 'في الصيف الماضي سافرت إلى تركيا مع عائلتي. حجزنا الرحلات قبل ثلاثة أشهر مما وفّر علينا مالاً كثيراً. أقمنا في فندق صغير قرب البحر وزرنا عدة أماكن تاريخية. ورغم أن الطقس كان حاراً جداً فقد استمتعنا بكل لحظة. المشكلة الوحيدة أن أمتعتنا وصلت متأخرة يوماً.',
    vocab: [
      { en: 'in advance', ar: 'مقدماً', ex: 'Please book in advance.', exAr: 'من فضلك احجز مقدماً.' },
      { en: 'luggage', ar: 'الأمتعة', ex: 'My luggage is heavy.', exAr: 'أمتعتي ثقيلة.' },
      { en: 'although', ar: 'رغم أن', ex: 'Although it rained, we went out.', exAr: 'رغم أن المطر هطل خرجنا.' },
    ],
    questions: [
      { q: 'Why did the family save money?', options: ['They stayed with friends', 'They booked the flights early', 'They travelled in winter'], answer: 1 },
      { q: 'What was the weather like?', options: ['Very hot', 'Rainy', 'Cold'], answer: 0 },
      { q: 'What was the only problem?', options: ['The hotel was dirty', 'The luggage arrived late', 'They missed the flight'], answer: 1 },
    ],
  },
  {
    id: 'r-006', title: 'Restaurants', titleAr: 'المطاعم', level: 'A2',
    text: "We went to a new restaurant on Saturday evening. The waiter showed us to a table by the window and gave us the menu. I ordered grilled chicken with rice, and my wife ordered fish. The food was delicious, but we waited forty minutes. At the end, I asked for the bill and left a tip.",
    ar: 'ذهبنا إلى مطعم جديد مساء السبت. أجلسنا النادل إلى طاولة بجانب النافذة وأعطانا قائمة الطعام. طلبت دجاجاً مشوياً مع الأرز وطلبت زوجتي سمكاً. كان الطعام لذيذاً لكننا انتظرنا أربعين دقيقة. في النهاية طلبت الفاتورة وتركت بقشيشاً.',
    vocab: [
      { en: 'waiter', ar: 'نادل', ex: 'The waiter brought the water.', exAr: 'أحضر النادل الماء.' },
      { en: 'menu', ar: 'قائمة الطعام', ex: 'Can I see the menu, please?', exAr: 'هل يمكنني رؤية القائمة من فضلك؟' },
      { en: 'bill', ar: 'الفاتورة', ex: 'Could we have the bill, please?', exAr: 'هل يمكن أن نحصل على الفاتورة من فضلك؟' },
    ],
    questions: [
      { q: 'Where did they sit?', options: ['By the door', 'By the window', 'Outside'], answer: 1 },
      { q: 'What was wrong with the visit?', options: ['The food was cold', 'They waited a long time', 'The restaurant was closed'], answer: 1 },
      { q: 'What did the writer do at the end?', options: ['Asked for the bill', 'Ordered dessert', 'Complained'], answer: 0 },
    ],
  },
  {
    id: 'r-007', title: 'Work and Communication', titleAr: 'العمل والتواصل', level: 'B1',
    text: "Good communication is essential at work. When you send an email, write a clear subject line and keep your message short. If you do not understand something, ask questions instead of guessing. In meetings, listen carefully before you give your opinion. Finally, always reply to messages as soon as possible, even if you only need to say that you will answer later.",
    ar: 'التواصل الجيد أساسي في العمل. عندما ترسل بريداً إلكترونياً اكتب عنواناً واضحاً واجعل رسالتك قصيرة. إن لم تفهم شيئاً فاسأل بدلاً من التخمين. في الاجتماعات استمع جيداً قبل أن تبدي رأيك. وأخيراً رد دائماً على الرسائل في أسرع وقت، حتى لو كنت ستقول فقط إنك ستجيب لاحقاً.',
    vocab: [
      { en: 'essential', ar: 'أساسي', ex: 'Water is essential for life.', exAr: 'الماء أساسي للحياة.' },
      { en: 'subject line', ar: 'عنوان الرسالة', ex: 'Write a clear subject line.', exAr: 'اكتب عنواناً واضحاً.' },
      { en: 'as soon as possible', ar: 'في أسرع وقت ممكن', ex: 'Call me as soon as possible.', exAr: 'اتصل بي في أسرع وقت ممكن.' },
    ],
    questions: [
      { q: 'What should an email have?', options: ['A clear subject line', 'A long message', 'Many pictures'], answer: 0 },
      { q: 'What should you do if you do not understand?', options: ['Guess', 'Ask questions', 'Say nothing'], answer: 1 },
      { q: 'What should you do in meetings before giving an opinion?', options: ['Listen carefully', 'Leave early', 'Send an email'], answer: 0 },
    ],
  },
  {
    id: 'r-008', title: 'Health and Lifestyle', titleAr: 'الصحة ونمط الحياة', level: 'B1',
    text: "A healthy lifestyle does not need to be difficult. Try to sleep at least seven hours every night and drink plenty of water. Walking for thirty minutes a day is better than doing no exercise at all. Eat more vegetables and fruit, and avoid sugary drinks. If you feel unwell for several days, you should see a doctor instead of waiting.",
    ar: 'نمط الحياة الصحي لا يجب أن يكون صعباً. حاول أن تنام سبع ساعات على الأقل كل ليلة وأن تشرب ماءً كثيراً. المشي ثلاثين دقيقة يومياً أفضل من عدم ممارسة أي رياضة. تناول خضروات وفاكهة أكثر وتجنب المشروبات السكرية. إذا شعرت بالتعب عدة أيام فيجب أن تزور الطبيب بدلاً من الانتظار.',
    vocab: [
      { en: 'lifestyle', ar: 'نمط الحياة', ex: 'She has a healthy lifestyle.', exAr: 'لديها نمط حياة صحي.' },
      { en: 'plenty of', ar: 'كثير من', ex: 'Drink plenty of water.', exAr: 'اشرب ماءً كثيراً.' },
      { en: 'unwell', ar: 'متعب / غير بخير', ex: 'I feel unwell today.', exAr: 'أشعر أنني لست بخير اليوم.' },
    ],
    questions: [
      { q: 'How many hours should you sleep at least?', options: ['Five', 'Seven', 'Ten'], answer: 1 },
      { q: 'What is better than doing no exercise?', options: ['Walking for thirty minutes', 'Sleeping all day', 'Drinking sugary drinks'], answer: 0 },
      { q: 'When should you see a doctor?', options: ['If you feel unwell for several days', 'Every morning', 'Never'], answer: 0 },
    ],
  },
];
