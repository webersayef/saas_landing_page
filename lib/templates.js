// Section library + template library — data-driven.
// A page stores sections as [{ type, data }]; the public renderer maps
// each type to a component. Templates are just preset section lists.

export const SECTIONS = {
  hero: {
    name: 'হিরো',
    defaults: (p) => ({
      headline: p?.name ? `${p.name} — সেরা অফারে আজই অর্ডার করুন` : 'আপনার প্রোডাক্টের হেডলাইন',
      subtext: 'ক্যাশ অন ডেলিভারি সারা দেশে',
      imageUrl: p?.imageUrl || '',
      ctaText: 'এখনই অর্ডার করুন',
    }),
  },
  offer: {
    name: 'অফার / কাউন্টডাউন',
    defaults: (p) => ({
      text: 'সীমিত সময়ের অফার!',
      price: p?.price || 0,
      oldPrice: p?.price ? Math.round(p.price * 1.4) : 0,
      endsAtMidnight: true,
    }),
  },
  benefits: {
    name: 'সুবিধা / বৈশিষ্ট্য',
    defaults: () => ({
      title: 'কেন এই প্রোডাক্টটি নেবেন?',
      items: ['প্রিমিয়াম কোয়ালিটি', 'সহজে ব্যবহারযোগ্য', 'দ্রুত ডেলিভারি', 'মানিব্যাক গ্যারান্টি'],
    }),
  },
  gallery: {
    name: 'গ্যালারি',
    defaults: (p) => ({ title: 'প্রোডাক্টের ছবি', images: p?.imageUrl ? [p.imageUrl] : [] }),
  },
  howToUse: {
    name: 'ব্যবহারবিধি',
    defaults: () => ({
      title: 'কীভাবে ব্যবহার করবেন',
      steps: ['প্রথম ধাপ: প্রোডাক্টটি হাতে নিন', 'দ্বিতীয় ধাপ: নির্দেশনা অনুযায়ী ব্যবহার করুন', 'তৃতীয় ধাপ: ফলাফল উপভোগ করুন'],
    }),
  },
  reviews: {
    name: 'কাস্টমার রিভিউ',
    defaults: () => ({
      title: 'ক্রেতাদের মতামত',
      items: [
        { name: 'সন্তুষ্ট ক্রেতা', text: 'খুবই ভালো প্রোডাক্ট, ডেলিভারিও দ্রুত পেয়েছি।' },
        { name: 'নিয়মিত ক্রেতা', text: 'কোয়ালিটি নিয়ে আমি পুরোপুরি সন্তুষ্ট।' },
      ],
    }),
  },
  faq: {
    name: 'সাধারণ জিজ্ঞাসা',
    defaults: () => ({
      title: 'সাধারণ জিজ্ঞাসা',
      items: [
        { q: 'ডেলিভারি পেতে কতদিন লাগবে?', a: 'সারা দেশে ২-৪ কর্মদিবস।' },
        { q: 'পেমেন্ট কীভাবে করবো?', a: 'ক্যাশ অন ডেলিভারি — প্রোডাক্ট হাতে পেয়ে টাকা দিন।' },
      ],
    }),
  },
  orderForm: {
    name: 'অর্ডার ফর্ম',
    defaults: () => ({ title: 'অর্ডার করতে ফর্মটি পূরণ করুন', buttonText: 'অর্ডার কনফার্ম করুন' }),
  },
};

export const SECTION_TYPES = Object.keys(SECTIONS);

export const TEMPLATES = [
  {
    id: 'classic-sales',
    name: 'ক্লাসিক সেলস',
    description: 'সব ধরনের প্রোডাক্টের জন্য পরীক্ষিত সেলস লেআউট।',
    sections: ['hero', 'offer', 'benefits', 'gallery', 'reviews', 'orderForm'],
  },
  {
    id: 'story-style',
    name: 'স্টোরি স্টাইল',
    description: 'ব্যবহারবিধি আর গল্প দিয়ে বোঝানো পেজ — স্কিনকেয়ার/হেলথ প্রোডাক্টে ভালো কাজ করে।',
    sections: ['hero', 'benefits', 'howToUse', 'gallery', 'reviews', 'faq', 'orderForm'],
  },
  {
    id: 'quick-order',
    name: 'কুইক অর্ডার',
    description: 'ছোট, দ্রুত — অফার আর অর্ডার ফর্ম সামনে রেখে তৈরি।',
    sections: ['hero', 'offer', 'orderForm', 'faq'],
  },
];

export function getTemplate(id) {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
}

// Build the stored section list for a new page from a template + product.
export function buildSections(templateId, product) {
  const t = getTemplate(templateId);
  return t.sections.map((type) => ({ type, data: SECTIONS[type].defaults(product || null) }));
}

export function slugify(text) {
  const base = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09FF]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base || 'shop';
}

// Make a globally unique slug (append -2, -3, ... when taken).
export async function uniqueSlug(base, exists) {
  const root = slugify(base);
  if (!(await exists(root))) return root;
  for (let i = 2; i < 1000; i++) {
    const cand = `${root}-${i}`;
    if (!(await exists(cand))) return cand;
  }
  return `${root}-${Date.now()}`;
}
