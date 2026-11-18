# English Made Easy — V2.0 (الدفعة 1)

تشغيل: `npm install` ثم `npm run dev` · بناء: `npm run build` · اختبارات: `npm test`

- `legacy/English Made Easy.v1.html` النسخة الأصلية V1 (للرجوع وللاختبارات). بصمتها في `legacy/V1.sha256`.
- `src/data/legacy-content/` المحتوى بمعرّفات ثابتة (مولَّد من V1 بـ `npm run extract:v1`، لا يُعاد توليده بعد الاعتماد).
- `src/storage/` التخزين والترحيل والنسخ الاحتياطي. مفاتيح V1 لا تُمسّ ولا تُحذف.
- `tests/fixtures/v1-snapshot.json` لقطة V1 المجمّدة للمقارنة.
