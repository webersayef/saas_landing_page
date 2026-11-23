# বদলানো ফাইলের তালিকা — GitHub রিপোতে আবার আপলোডের জন্য

রিপো: `webersayef/saas_landing_page` — শুধু নিচের ফাইলগুলো আগের (Phase 1) ভার্সন
থেকে বদলেছে। GitHub ওয়েব আপলোডে ফোল্ডার ধরে আপলোড করলে পাথ নিজে থেকেই ঠিক থাকবে;
`lib` ফোল্ডারের ফাইল `lib`-এ, `app/...` ফাইল নিজ নিজ সাবফোল্ডারে আপলোড করুন,
তারপর Commit → Vercel নিজে থেকে রিডিপ্লয় করবে।

## Phase 2 — Supabase ব্যাকএন্ড সোয়াপ

### বদলেছে
- `lib/store.js` — async API + Supabase (PostgREST) ব্যাকএন্ড, JSON ফলব্যাকসহ
- `lib/billing.js` — সব store কল await; বিলিং সাইকেল async
- `lib/mailer.js` — queueEmail/markEmailSent await
- `lib/auth-server.js` — getUserById await
- `lib/templates.js` — uniqueSlug এখন async (store-এর async slug চেকের জন্য)
- `app/api/auth/login/route.js`
- `app/api/auth/register/route.js`
- `app/api/me/[resource]/route.js`
- `app/api/super/data/route.js`
- `app/api/super/action/route.js`
- `app/api/cron/billing/route.js`
- `app/api/public/order/route.js`
- `app/dashboard/page.js`
- `app/dashboard/layout.js`
- `app/s/[slug]/page.js`
- `scripts/seed-demo.mjs` — async API (দুই ব্যাকএন্ডেই চলে)
- `tests/saas.test.mjs` — async API অনুযায়ী আপডেট (৯ টেস্ট)
- `README.md`
- `.env.example` — Supabase env-এর মন্তব্য আপডেট

### নতুন
- `tests/supabase.test.mjs` — fake PostgREST সার্ভার দিয়ে Supabase মোডের ৪ টেস্ট
- `CHANGED-FILES.md` — এই ফাইল

### বদলায়নি
- `supabase-saas-setup.sql` — কোনো বদল লাগেনি; store-এর সব ফিল্ড স্কিমায় আগেই ছিল।
  (আগে রান না করে থাকলে একবার রান করুন; idempotent।)
- বাকি সব ফাইল (components, dashboard-এর ভেতরের পেজ, public, vercel.json ইত্যাদি) Phase 1-এর মতোই।

## Phase 2.1 — পাবলিক ডিজাইন রিডিজাইন

### বদলেছে
- `app/page.js` — সম্পূর্ণ নতুন SaaS মার্কেটিং হোমপেজ (হিরো, ফিচার, ধাপ, টেমপ্লেট, প্রাইসিং, FAQ, CTA, ফুটার)
- `app/globals.css` — মার্কেটিং + auth লেআউটের নতুন স্টাইল যোগ (পুরনো ড্যাশবোর্ড স্টাইল অপরিবর্তিত)
- `components/AuthForm.js` — লগইন/রেজিস্টার split-লেআউট (বামে ব্র্যান্ডিং প্যানেল, ডানে ফর্ম কার্ড); লজিক একই
- `app/super/login/page.js` — একই কার্ড স্টাইলে হালকা পলিশ; লজিক একই
- `README.md`, `CHANGED-FILES.md`

## Auth আপগ্রেড — ইমেইল ভেরিফিকেশন + লগইন সিকিউরিটি + Google লগইন

ফ্লো: রেজিস্টার (নাম + শপের নাম + সঠিক ইমেইল + কমপক্ষে ৮ অক্ষরের পাসওয়ার্ড)
→ ইমেইলে ৬ সংখ্যার কোড → কোড ভেরিফাই হলে অ্যাকাউন্ট সক্রিয় → তারপর
ইমেইল/পাসওয়ার্ড দিয়ে লগইন। রেজিস্টারে আর সাথে সাথে লগইন হয় না।

### নতুন ফাইল
- `lib/auth-flow.js` — রেজিস্টার/ভেরিফাই/রিসেন্ড/লগইনের সব লজিক (next/* ছাড়া, টেস্টযোগ্য): কোড SHA-256 হ্যাশে থাকে, মেয়াদ ১০ মিনিট, ৫ বার ভুলে কোড বাতিল, রিসেন্ডে ৬০ সেকেন্ড কুলডাউন, ৫ বার ভুল লগইনে ১০ মিনিট লক — সব স্টেট ইউজার রেকর্ডে, দুই ব্যাকএন্ডেই চলে
- `lib/google.js` — Google OAuth-এর শেয়ার্ড হেল্পার (state কুকির নাম, redirect URI)
- `app/api/auth/verify/route.js` — POST {email, code} → অ্যাকাউন্ট সক্রিয় (অটো-লগইন নয়)
- `app/api/auth/resend/route.js` — POST {email} → নতুন কোড (শুধু pending ইউজার, ৬০ সে. কুলডাউন)
- `app/api/auth/config/route.js` — GET → {google: boolean} (GOOGLE_CLIENT_ID আছে কিনা)
- `app/api/auth/google/route.js` — Google OAuth শুরু (state কুকি + consent redirect)
- `app/api/auth/google/callback/route.js` — state যাচাই → টোকেন এক্সচেঞ্জ → userinfo (email_verified বাধ্যতামূলক) → পুরনো ইউজার লগইন / নতুন ইউজার তৈরি + লগইন
- `tests/auth.test.mjs` — পুরো অথ ফ্লোর টেস্ট (JSON ব্যাকএন্ড)

### বদলেছে
- `lib/store.js` — ইউজারে নতুন ফিল্ড: emailVerified, status, verifyCodeHash, verifyCodeExpiresAt, verifyAttempts, verifySentAt, failedLogins, lockUntil (userFromRow/userToRow ম্যাপিংসহ; পুরনো রো ডিফল্টে verified+active)
- `supabase-saas-setup.sql` — saas_users-এ উপরের কলামগুলো (create table-এ + `add column if not exists` alter — idempotent, পুরনো ডাটাবেসেও নিরাপদে রান করা যাবে)
- `lib/auth.js` — শেয়ার্ড `sessionCookieOpts()` (production-এ `secure: true`) + TENANT/SUPER_MAX_AGE
- `lib/auth-server.js` — publicUser এখন verifyCodeHash-ও লুকায়
- `app/api/auth/register/route.js` — ভ্যালিডেশন (নাম/শপ বাধ্যতামূলক, ইমেইল ফরম্যাট, পাসওয়ার্ড ≥ ৮) → pending ইউজার + কোড ইমেইল; সেশন কুকি আর সেট হয় না
- `app/api/auth/login/route.js` — unverified হলে 403 (needsVerification), ভুল পাসওয়ার্ডে জেনেরিক এরর + fail কাউন্ট/লক, সফল লগইনে কাউন্টার রিসেট, secure কুকি
- `app/api/super/login/route.js` — secure কুকি (শেয়ার্ড হেল্পার দিয়ে)
- `components/AuthForm.js` — ভেরিফিকেশন ভিউ (কোড ইনপুট, রিসেন্ড + কুলডাউন টাইমার), ভেরিফাই সফল হলে লগইন ভিউতে সবুজ সাফল্য-নোট, unverified লগইনে "ভেরিফাই কোড পাঠান" অ্যাকশন, Google বাটন (শুধু config-এ google:true হলে), ?error=google নোট
- `app/globals.css` — .auth-success, .auth-google-btn, .auth-or, .auth-code-input, .auth-link-btn স্টাইল
- `tests/supabase.test.mjs` — অথ ফিল্ডগুলোর Supabase (fake PostgREST) রাউন্ড-ট্রিপ টেস্ট যোগ
- `.env.example` — APP_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET যোগ; RESEND মন্তব্য হালনাগাদ
- `README.md` — Auth বর্ণনা হালনাগাদ

### নোট
- পেছনের সামঞ্জস্য: seed/demo (demo@example.com / demo1234) ও আগের সব ইউজার verified হিসেবেই থাকবে — শুধু register রাউট দিয়ে তৈরি নতুন ইউজার unverified হয়।
- SQL বদল লেগেছে (Supabase explicit কলাম ব্যবহার করে) — তবে পুরনো ডাটাবেসে ফাইলটা আবার রান করলেই কলাম যোগ হয়ে যাবে।
