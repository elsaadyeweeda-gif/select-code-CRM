# دليل تهيئة قاعدة البيانات لـ Vercel و GitHub
# Database Configuration Guide for Vercel & GitHub

يقدم هذا المشروع دعماً مزدوجاً ومرناً لقواعد البيانات (Dual Database Engine) متوافقاً تماماً مع بيئات **Vercel** و **GitHub** و **Google Cloud / AI Studio**.

---

## ⚡ كيف تعمل قاعدة البيانات؟ (Architecture Overview)

النظام مصمم ليكتشف نوع قاعدة البيانات تلقائياً دون أي تعقيد:

1. **الخيار الأول (الموصى به على Vercel): PostgreSQL / Neon Database**
   - بمجرد إضافة متغير البيئة `DATABASE_URL` أو `POSTGRES_URL` (سواء من Neon أو Vercel Postgres أو Supabase)، يقوم النظام تلقائياً بإنشاء الجداول (Auto-Migrations) وجدولة البيانات الأولية وحساب الأدمن الافتراضي.
   - يعتمد على مكتبة `@neondatabase/serverless` المناسبة تماماً للوظائف عديمة الخادم (Serverless Functions) حيث تعمل عبر بروتوكول HTTP الآمن لمنع استنزاف الاتصالات (Connection Pool Exhaustion).

2. **الخيار الثاني: Google Firebase Firestore**
   - في حال عدم وجود متغير `DATABASE_URL`، يعمل النظام تلقائياً وبسلاسة على Firebase Firestore.
   - يدعم قراءة إعدادات Firebase من متغيرات البيئة (`FIREBASE_PROJECT_ID`، `FIREBASE_API_KEY`، إلخ) أو من ملف `firebase-applet-config.json`.

---

## 🚀 خطوات النشر على GitHub و Vercel

### أولاً: الرفع على GitHub (Push to GitHub)
```bash
# 1. تهيئة مستودع Git محلي
git init
git add .
git commit -m "feat: complete CRM system ready for Vercel and GitHub"

# 2. ربط المستودع بـ GitHub والرفع
git branch -M main
git remote add origin https://github.com/USERNAME/REPO_NAME.git
git push -u origin main
```

---

### ثانياً: النشر على Vercel (Deploy to Vercel)

1. توجه إلى [Vercel Dashboard](https://vercel.com) واضغط **"Add New Project"**.
2. اختر مستودع الـ GitHub الخاص بك واضغط **Import**.
3. في إعدادات البناء (Build & Output Settings):
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. اختر طريقة تشغيل قاعدة البيانات:

#### الطريقة (أ): استخدام Neon أو Vercel Postgres (الأسهل والأسرع):
1. من لوحة تحكم مشروعك في Vercel، اذهب إلى تبويب **Storage**.
2. اضغط **Connect Database** واختر **PostgreSQL** أو **Neon**.
3. سيقوم Vercel تلقائياً بحقن متغير البيئة `DATABASE_URL` و `POSTGRES_URL`.
4. عند أول تشغيل أو زيارة، سينشئ التطبيق كافة الجداول الـ 13 تلقائياً ويقوم بحقن حساب الأدمن:
   - **اسم المستخدم:** `Elsaady`
   - **كلمة المرور:** `555531`

#### الطريقة (ب): استخدام Firebase Firestore:
1. اذهب إلى **Settings > Environment Variables** في Vercel.
2. أضف المتغيرات التالية:
   - `FIREBASE_PROJECT_ID`: معرف المشروع
   - `FIREBASE_API_KEY`: مفتاح الواجهة
   - `FIREBASE_APP_ID`: معرف التطبيق
   - `FIREBASE_AUTH_DOMAIN`: نطاق المصادقة
   - `FIREBASE_DATABASE_ID`: معرف قاعدة بيانات Firestore
   - `JWT_SECRET`: مفتاح سري لتشفير الجلسات

---

## 🔍 التحقق من حالة قاعدة البيانات (Health Check)

يوفر التطبيق واجهة فحص مباشرة ومفيدة لمعرفة المحرك النشط وحالته:
```
GET /api/db/status
```
نموذج الاستجابة:
```json
{
  "status": "ok",
  "database": {
    "engine": "postgresql",
    "isPostgres": true,
    "isInitialized": true,
    "postgresConfigured": true
  },
  "serverless": true,
  "environment": "production"
}
```
أو في حال استخدام Firestore:
```json
{
  "status": "ok",
  "database": {
    "engine": "firestore",
    "isPostgres": false,
    "isInitialized": true,
    "firestoreProjectId": "...",
    "firestoreDatabaseId": "..."
  }
}
```
