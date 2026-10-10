# دليل تشغيل ونشر التطبيق على Cloudflare Worker & Pages

تم تجهيز هذا المشروع بجميع الملفات والتهيئات اللازمة للنشر المباشر على منصة **Cloudflare Workers** و **Cloudflare Pages**.

---

## 📁 الملفات التي تمت إضافتها:

1. **`wrangler.jsonc`**
   - ملف التكوين الحديث (Wrangler v3/v4) لـ Cloudflare Workers مع خاصية **Static Assets**.
   - يدعم تشغيل الـ Single Page Application (SPA) تلقائياً، وتحديد نقطة دخول Worker (`worker/index.ts`).

2. **`wrangler.toml`**
   - ملف تكوين متوافق بصيغة TOML للأدوات التي تفضل صيغة TOML.

3. **`worker/index.ts`**
   - كود الـ Worker المكتوب بـ TypeScript:
     - فحص صحة الخدمة عبر نقطة: `/api/health`
     - تقديم الملفات الثابتة (Static Assets) عبر محرك Cloudflare.
     - إعادة التوجيه للـ SPA (`index.html`) عند الدخول لأي مسار فرعي.
     - إضافة ترويسات الحماية المتقدمة (Security Headers: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
     - إدارة الـ Caching الذكي (تخزين ملفات الـ Assets المجمعة بـ Hash لمدة سنة، وعدم تخزين index.html لضمان التحديث اللحظي).

4. **`public/_headers`**
   - إعدادات الترويسات الأمنية والكاش لـ Cloudflare Pages و Cloudflare Assets.

5. **`public/_redirects`**
   - قواعد التوجيه لتطبيق الصفحة الواحدة (SPA Routing) حتى تعمل جميع الروابط بدون أخطاء 404:
     ```
     /*   /index.html   200
     ```

6. **`public/_routes.json`**
   - تحديد مسارات استدعاء الـ Worker واستثناء الملفات الثابتة لتوفير استهلاك الـ Requests وتسريع الاستجابة.

---

## 🚀 كيفية النشر والتشغيل:

### 1. تسجيل الدخول إلى Cloudflare (لمرة واحدة):
```bash
npx wrangler login
```

### 2. البناء والنشر التلقائي للـ Worker:
```bash
npm run worker:deploy
```
أو يدوياً:
```bash
npm run build
npx wrangler deploy
```

### 3. المعاينة والتجربة المحلية (Local Worker Dev):
```bash
npm run worker:dev
```
سيقوم Wrangler بتشغيل محاكي Cloudflare Workerd على جهازك لمعاينة أداء الـ Worker محلياً.

---

## 🛠️ إعدادات البناء في لوحة تحكم Cloudflare Pages (Build Configuration):
عند ربط المستودع في Cloudflare Pages Dashboard، تأكد من ضبط الإعدادات التالية:
- **Framework preset:** `Vite` (أو None)
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** `/` (اتركه فارغاً أو `/`)

> 💡 **ملاحظة هامة لحل أخطاء البناء في Cloudflare (npm clean-install / bun):**
> 1. تم استبعاد ملفات الـ lockfile غير المتوافقة (`bun.lock` و `package-lock.json`) من المستودع في `.gitignore`، وتجهيز ملف `.npmrc` بإعدادات التوافق (`legacy-peer-deps=true`).
> 2. عند عدم وجود lockfile مقيد بمنصة معينة، ستقوم Cloudflare بتشغيل `npm install` بمرونة وتثبيت حزم Linux المتوافقة دون أي خطأ في حزم المنصات الاختيارية (مثل `@tailwindcss/oxide`).
> 3. يمكنك في لوحة تحكم Cloudflare Pages كتابة أمر البناء كالتالي لضمان التثبيت والبناء دوماً:
>    - **Build command:** `npm install && npm run build`
>    - **Build output directory:** `dist`

---

## ⚙️ إضافة متغيرات البيئة أو قواعد البيانات (اختياري):
إذا أردت ربط Cloudflare D1 أو KV أو Secrets، يمكنك إضافتها في ملف `wrangler.jsonc`:
```jsonc
{
  "kv_namespaces": [
    { "binding": "APP_KV", "id": "<YOUR_KV_ID>" }
  ]
}
```
أو ضبط المفاتيح السرية عبر الأوامر:
```bash
npx wrangler secret put SUPABASE_KEY
```
