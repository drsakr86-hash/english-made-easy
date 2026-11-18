# English Made Easy — V3.5

تطبيق تعلّم إنجليزية للعرب (React + Vite). يعمل بالكامل محلياً في المتصفح؛ المدرس الذكي اختياري ويحتاج خادماً وسيطاً.

- التشغيل والنشر والاستعادة: `docs/RUN_DEPLOY_RESTORE.md`
- مقارنة مزودي AI: `docs/AI_PROVIDER_COMPARISON.md`
- تقارير المراحل في مشروع Claude (claude/…)

## البنية
- `src/data/legacy-content/` محتوى V1 بمعرّفات ثابتة · `src/data/skills/` قراءة/استماع/كتابة · `src/data/tutor/` سيناريوهات · `src/data/placement/` أسئلة المستوى
- `src/engines/` review، progress (+intelligence)، placement، learning (الخطة)، skills، ai (prompts, client, conversation, pronunciation)
- `src/storage/` تخزين وترحيل ونسخ احتياطي. مفاتيح V1 لا تُمسّ.
- `server/` خادم المدرس الوسيط (مفاتيح AI في البيئة فقط)
- `tests/unit` (vitest) و`tests/e2e/browser-smoke.mjs` (Chrome حقيقي)
- `legacy/` نسخة V1 الأصلية للمقارنة

أوامر: `npm run dev | build | preview | test | lint` و`node scripts/security-scan.mjs src dist`
