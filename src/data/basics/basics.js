// دروس الأساسيات للمبتدئين (محتوى جديد V3.6، معرّفاتها b-NNN ثابتة).
// الشكل مثل دروس القواعد، مع items اختيارية (عبارة + معناها + نص النطق say) لعرضها مع زر 🔊.
const q = (text, options, answer) => ({ q: text, options, answer });
const it = (en, ar, say) => ({ en, ar, say: say || en });

const letters = [
  ['A a', 'إيه', 'ay', 'Apple', 'تفاحة'], ['B b', 'بي', 'bee', 'Book', 'كتاب'], ['C c', 'سي', 'see', 'Cat', 'قطة'], ['D d', 'دي', 'dee', 'Dog', 'كلب'],
  ['E e', 'إي', 'ee', 'Egg', 'بيضة'], ['F f', 'إف', 'eff', 'Fish', 'سمكة'], ['G g', 'جي', 'jee', 'Girl', 'بنت'], ['H h', 'إيتش', 'aitch', 'Hand', 'يد'],
  ['I i', 'آي', 'eye', 'Ice', 'ثلج'], ['J j', 'جاي', 'jay', 'Juice', 'عصير'], ['K k', 'كيه', 'kay', 'Key', 'مفتاح'], ['L l', 'إل', 'el', 'Lemon', 'ليمون'],
  ['M m', 'إم', 'em', 'Milk', 'حليب'], ['N n', 'إن', 'en', 'Name', 'اسم'], ['O o', 'أو', 'oh', 'Orange', 'برتقالة'], ['P p', 'بي', 'pee', 'Pen', 'قلم'],
  ['Q q', 'كيو', 'cue', 'Queen', 'ملكة'], ['R r', 'آر', 'are', 'Rice', 'أرز'], ['S s', 'إس', 'ess', 'Sun', 'شمس'], ['T t', 'تي', 'tee', 'Tea', 'شاي'],
  ['U u', 'يو', 'you', 'Umbrella', 'مظلة'], ['V v', 'في', 'vee', 'Van', 'سيارة نقل'], ['W w', 'دابل يو', 'double you', 'Water', 'ماء'], ['X x', 'إكس', 'ex', 'X-ray', 'أشعة إكس'],
  ['Y y', 'واي', 'why', 'Yellow', 'أصفر'], ['Z z', 'زد', 'zed', 'Zebra', 'حمار وحشي'],
].map(([en, name, say, word, wordAr]) => it(`${en} — ${word}`, `${name} · ${wordAr}`, `${say}. ${word}`));

export const basics = [
  {
    id: 'b-001',
    title: 'الحروف الإنجليزية A–Z',
    rule: 'الأبجدية الإنجليزية 26 حرفاً. لكل حرف شكل كبير (A) وشكل صغير (a) واسم ينطق، وتبدأ به كلمات. اضغط 🔊 لتسمع اسم الحرف وكلمة تبدأ به. (نطق بعض الأسماء يختلف قليلاً بين الإنجليزية الأمريكية والبريطانية، مثل Z.)',
    items: letters,
    questions: [
      q('Which letter does "Dog" start with?', ['B', 'D', 'G'], 1),
      q('How many letters are in the English alphabet?', ['24', '26', '28'], 1),
      q('Which letter does "Water" start with?', ['V', 'W', 'U'], 1),
      q('Which is the capital letter of "m"?', ['N', 'M', 'W'], 1),
    ],
  },
  {
    id: 'b-002',
    title: 'الحروف المتحركة والساكنة',
    rule: 'الحروف المتحركة (Vowels) خمسة: a, e, i, o, u. وباقي الحروف ساكنة (Consonants). كل كلمة إنجليزية تقريباً فيها حرف متحرك واحد على الأقل. هذه المعرفة تفيدك لاحقاً في a / an.',
    items: [it('a — apple', 'حرف متحرك', 'a. apple'), it('e — egg', 'حرف متحرك', 'e. egg'), it('i — ink', 'حرف متحرك', 'i. ink'), it('o — orange', 'حرف متحرك', 'o. orange'), it('u — umbrella', 'حرف متحرك', 'u. umbrella')],
    questions: [
      q('Which one is a vowel?', ['b', 'e', 'k'], 1),
      q('How many vowels are in English?', ['3', '5', '7'], 1),
      q('Which one is a consonant?', ['a', 'o', 't'], 2),
    ],
  },
  {
    id: 'b-003',
    title: 'ضمائر الفاعل I / you / he / she',
    rule: 'ضمير الفاعل يأتي قبل الفعل ويدل على من يفعل. I أنا · you أنتَ/أنتِ/أنتم · he هو · she هي · it للشيء أو الحيوان · we نحن · they هم/هن. حرف I يُكتب كبيراً دائماً.',
    items: [it('I am a doctor.', 'أنا طبيب.'), it('You are my friend.', 'أنت صديقي.'), it('He works here.', 'هو يعمل هنا.'), it('She lives in Cairo.', 'هي تسكن في القاهرة.'), it('It is a book.', 'هذا كتاب.'), it('We study English.', 'نحن ندرس الإنجليزية.'), it('They are students.', 'هم طلاب.')],
    questions: [
      q('___ is my sister. (هي)', ['He', 'She', 'It'], 1),
      q('___ are students. (هم)', ['We', 'He', 'They'], 2),
      q('___ am happy. (أنا)', ['I', 'You', 'She'], 0),
      q('Which word is used for a thing?', ['he', 'she', 'it'], 2),
    ],
  },
  {
    id: 'b-004',
    title: 'ضمائر المفعول والملكية',
    rule: 'ضمير المفعول بعد الفعل: me, you, him, her, it, us, them (She loves him). صفة الملكية قبل الاسم: my, your, his, her, its, our, their (my book). ملاحظة: لا نكتب فاصلة عليا في its الدالة على الملكية.',
    items: [it('She helps me.', 'هي تساعدني.'), it('I see him.', 'أنا أراه.'), it('Call us tomorrow.', 'اتصل بنا غداً.'), it('This is my book.', 'هذا كتابي.'), it('His name is Omar.', 'اسمه عمر.'), it('Her car is new.', 'سيارتها جديدة.'), it('Our house is big.', 'بيتنا كبير.')],
    questions: [
      q('Please help ___. (ساعدني)', ['I', 'me', 'my'], 1),
      q('This is ___ pen. (قلمي)', ['me', 'my', 'I'], 1),
      q('I know ___. (أعرفها)', ['she', 'her', 'hers'], 1),
      q('___ house is big. (بيتنا)', ['We', 'Us', 'Our'], 2),
    ],
  },
  {
    id: 'b-005',
    title: 'الفعل to be: am / is / are',
    rule: 'نستخدمه بمعنى "يكون" للتعريف والوصف والمكان. I am · he/she/it is · you/we/they are. للنفي نضيف not (I am not / He is not = isn\'t). وللسؤال نقدّم الفعل: Are you ready? الاختصارات: I\'m, He\'s, They\'re.',
    items: [it('I am a student.', 'أنا طالب.'), it('She is tired.', 'هي متعبة.'), it('We are at home.', 'نحن في البيت.'), it('He is not here.', 'هو ليس هنا.'), it('Are you ready?', 'هل أنت مستعد؟'), it("They're from Egypt.", 'هم من مصر.')],
    questions: [
      q('I ___ a doctor.', ['is', 'am', 'are'], 1),
      q('They ___ happy.', ['is', 'am', 'are'], 2),
      q('She ___ my teacher.', ['is', 'are', 'am'], 0),
      q('Which is a question?', ['You are tired.', 'Are you tired?', 'You tired are.'], 1),
    ],
  },
  {
    id: 'b-006',
    title: 'this / that / these / those',
    rule: 'للإشارة: this (هذا، قريب، مفرد) · that (ذلك، بعيد، مفرد) · these (هؤلاء، قريب، جمع) · those (أولئك، بعيد، جمع). وبعدها am/is/are المناسب: This is a pen. These are pens.',
    items: [it('This is my phone.', 'هذا هاتفي.'), it('That is a big tree.', 'تلك شجرة كبيرة.'), it('These are my keys.', 'هذه مفاتيحي.'), it('Those are mountains.', 'تلك جبال.')],
    questions: [
      q('___ book here is new. (قريب، مفرد)', ['This', 'That', 'Those'], 0),
      q('___ are my shoes. (قريب، جمع)', ['This', 'These', 'That'], 1),
      q('Look at ___ stars over there. (بعيد، جمع)', ['that', 'these', 'those'], 2),
    ],
  },
  {
    id: 'b-007',
    title: 'الأرقام 1–20 والعشرات',
    rule: 'الأرقام الأساسية: one, two, three... ثم العشرات twenty, thirty, forty, fifty... ومن 13 إلى 19 تنتهي بـ teen (thirteen, fourteen). انتبه للفرق في النطق بين thirteen و thirty، وبين fifteen و fifty.',
    items: [it('1 — one', 'واحد', 'one'), it('2 — two', 'اثنان', 'two'), it('3 — three', 'ثلاثة', 'three'), it('4 — four', 'أربعة', 'four'), it('5 — five', 'خمسة', 'five'), it('6 — six', 'ستة', 'six'), it('7 — seven', 'سبعة', 'seven'), it('8 — eight', 'ثمانية', 'eight'), it('9 — nine', 'تسعة', 'nine'), it('10 — ten', 'عشرة', 'ten'), it('11 — eleven', 'أحد عشر', 'eleven'), it('12 — twelve', 'اثنا عشر', 'twelve'), it('13 — thirteen', 'ثلاثة عشر', 'thirteen'), it('14 — fourteen', 'أربعة عشر', 'fourteen'), it('15 — fifteen', 'خمسة عشر', 'fifteen'), it('16 — sixteen', 'ستة عشر', 'sixteen'), it('17 — seventeen', 'سبعة عشر', 'seventeen'), it('18 — eighteen', 'ثمانية عشر', 'eighteen'), it('19 — nineteen', 'تسعة عشر', 'nineteen'), it('20 — twenty', 'عشرون', 'twenty'), it('30 — thirty', 'ثلاثون', 'thirty'), it('40 — forty', 'أربعون', 'forty'), it('50 — fifty', 'خمسون', 'fifty'), it('100 — one hundred', 'مئة', 'one hundred')],
    questions: [
      q('What is 7 in English?', ['six', 'seven', 'eleven'], 1),
      q('What is "twelve"?', ['2', '12', '20'], 1),
      q('Which number is 30?', ['thirteen', 'thirty', 'three'], 1),
      q('What is 15?', ['fifty', 'fifteen', 'five'], 1),
    ],
  },
  {
    id: 'b-008',
    title: 'أيام الأسبوع والشهور',
    rule: 'الأيام: Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday. الشهور: January, February, March, April, May, June, July, August, September, October, November, December. تُكتب بحرف كبير في أولها، ونستخدم on مع اليوم و in مع الشهر.',
    items: [it('Sunday', 'الأحد'), it('Monday', 'الاثنين'), it('Tuesday', 'الثلاثاء'), it('Wednesday', 'الأربعاء'), it('Thursday', 'الخميس'), it('Friday', 'الجمعة'), it('Saturday', 'السبت'), it('January', 'يناير'), it('February', 'فبراير'), it('March', 'مارس'), it('April', 'أبريل'), it('May', 'مايو'), it('June', 'يونيو'), it('July', 'يوليو'), it('August', 'أغسطس'), it('September', 'سبتمبر'), it('October', 'أكتوبر'), it('November', 'نوفمبر'), it('December', 'ديسمبر')],
    questions: [
      q('What day is "Friday" in Arabic?', ['الخميس', 'الجمعة', 'السبت'], 1),
      q('I have class ___ Monday.', ['in', 'on', 'at'], 1),
      q('Which month comes after March?', ['May', 'April', 'June'], 1),
      q('My birthday is ___ July.', ['in', 'on', 'at'], 0),
    ],
  },
  {
    id: 'b-009',
    title: 'الألوان',
    rule: 'الألوان الأساسية صفات، وتأتي قبل الاسم: a red car. وبعد الفعل to be: The car is red. الصفة في الإنجليزية لا تتغير مع المفرد والجمع (red cars).',
    items: [it('red', 'أحمر'), it('blue', 'أزرق'), it('green', 'أخضر'), it('yellow', 'أصفر'), it('black', 'أسود'), it('white', 'أبيض'), it('orange', 'برتقالي'), it('brown', 'بني'), it('pink', 'وردي'), it('gray', 'رمادي')],
    questions: [
      q('What colour is the sky on a clear day?', ['green', 'blue', 'black'], 1),
      q('"أخضر" in English is:', ['green', 'gray', 'brown'], 0),
      q('Choose the correct sentence.', ['a car red', 'a red car', 'a reds car'], 1),
    ],
  },
  {
    id: 'b-010',
    title: 'العائلة',
    rule: 'كلمات العائلة الأساسية. للمذكر والمؤنث كلمات مختلفة غالباً (father / mother). وparents تعني الوالدين، وchildren أبناء.',
    items: [it('father / dad', 'أب / بابا'), it('mother / mom', 'أم / ماما'), it('brother', 'أخ'), it('sister', 'أخت'), it('son', 'ابن'), it('daughter', 'ابنة'), it('husband', 'زوج'), it('wife', 'زوجة'), it('grandfather', 'جد'), it('grandmother', 'جدة'), it('uncle', 'عم / خال'), it('aunt', 'عمة / خالة'), it('cousin', 'ابن/ابنة العم أو الخال'), it('parents', 'الوالدان')],
    questions: [
      q('My father\'s brother is my ___.', ['uncle', 'cousin', 'son'], 0),
      q('"جدة" in English is:', ['aunt', 'grandmother', 'sister'], 1),
      q('Your mother and father are your ___.', ['parents', 'cousins', 'children'], 0),
    ],
  },
  {
    id: 'b-011',
    title: 'الجمع: s / es وغير المنتظم',
    rule: 'الأغلب نضيف s: book → books. إن انتهى الاسم بـ s, x, ch, sh نضيف es: box → boxes. المنتهي بحرف ساكن + y نحوله إلى ies: city → cities. وهناك جموع شاذة: man → men, woman → women, child → children, foot → feet, person → people.',
    items: [it('book → books', 'كتب'), it('box → boxes', 'صناديق'), it('city → cities', 'مدن'), it('child → children', 'أطفال'), it('man → men', 'رجال'), it('woman → women', 'نساء'), it('foot → feet', 'أقدام'), it('person → people', 'أشخاص')],
    questions: [
      q('Plural of "box":', ['boxs', 'boxes', 'boxies'], 1),
      q('Plural of "child":', ['childs', 'childes', 'children'], 2),
      q('Plural of "city":', ['cities', 'citys', 'cityes'], 0),
      q('Plural of "man":', ['mans', 'men', 'manes'], 1),
    ],
  },
  {
    id: 'b-012',
    title: 'كلمات السؤال',
    rule: 'What ماذا · Where أين · Who من · When متى · Why لماذا · How كيف · How many كم (للعدود) · How much كم (للسعر/غير المعدود). تأتي في أول السؤال: Where do you live?',
    items: [it('What is your name?', 'ما اسمك؟'), it('Where do you live?', 'أين تسكن؟'), it('Who is he?', 'من هو؟'), it('When is the class?', 'متى الحصة؟'), it('Why are you late?', 'لماذا تأخرت؟'), it('How are you?', 'كيف حالك؟'), it('How many books do you have?', 'كم كتاباً عندك؟'), it('How much is this?', 'بكم هذا؟')],
    questions: [
      q('___ do you live? (أين)', ['Who', 'Where', 'When'], 1),
      q('___ is your name? (ما)', ['What', 'Why', 'How'], 0),
      q('___ are you late? (لماذا)', ['When', 'Why', 'What'], 1),
      q('___ much is this? (بكم)', ['How', 'What', 'Who'], 0),
    ],
  },
  {
    id: 'b-013',
    title: 'have / has و there is / there are',
    rule: 'have للملكية مع I/you/we/they، وhas مع he/she/it: She has a car. للوجود: there is مع المفرد (There is a book) وthere are مع الجمع (There are two books).',
    items: [it('I have a brother.', 'عندي أخ.'), it('She has two sisters.', 'عندها أختان.'), it('There is a pen on the table.', 'يوجد قلم على الطاولة.'), it('There are three chairs.', 'يوجد ثلاثة كراسٍ.')],
    questions: [
      q('He ___ a new phone.', ['have', 'has', 'haves'], 1),
      q('They ___ a big house.', ['have', 'has', 'is'], 0),
      q('There ___ five students in the room.', ['is', 'are', 'am'], 1),
      q('There ___ a cat in the garden.', ['are', 'is', 'have'], 1),
    ],
  },
  {
    id: 'b-014',
    title: 'التحية والتعارف',
    rule: 'عبارات أولى تحتاجها في أي حوار: التحية، التعريف بالنفس، الشكر، والاعتذار. تدرّب على نطقها بصوت عالٍ.',
    items: [it('Hello! / Hi!', 'مرحباً'), it('Good morning.', 'صباح الخير'), it('Good evening.', 'مساء الخير'), it('Good night.', 'تصبح على خير'), it('How are you?', 'كيف حالك؟'), it("I'm fine, thank you.", 'أنا بخير، شكراً.'), it('My name is Ahmed.', 'اسمي أحمد.'), it('Nice to meet you.', 'سعدت بلقائك.'), it('Please.', 'من فضلك'), it('Thank you.', 'شكراً'), it("You're welcome.", 'عفواً'), it('Sorry. / Excuse me.', 'آسف / عن إذنك'), it('Goodbye. / See you later.', 'مع السلامة / أراك لاحقاً')],
    questions: [
      q('You meet someone in the morning. You say:', ['Good night.', 'Good morning.', 'Goodbye.'], 1),
      q('"Thank you." — the reply is:', ["You're welcome.", 'Sorry.', 'Nice to meet you.'], 0),
      q('You meet a new person. You say:', ['Nice to meet you.', 'See you later.', "You're welcome."], 0),
    ],
  },
];
