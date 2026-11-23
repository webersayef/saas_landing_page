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
