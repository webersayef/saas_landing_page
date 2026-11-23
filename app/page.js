import Link from 'next/link';
import { PLANS, priceForPageCount } from '@/lib/plans';
import { TEMPLATES } from '@/lib/templates';

const FEATURES = [
  ['🖱️', '১-ক্লিকে ল্যান্ডিং পেজ', 'রেডি টেমপ্লেট বেছে প্রোডাক্ট বসালেই পেজ লাইভ — কোডিং বা ডিজাইনের ঝামেলা নেই।'],
  ['🧾', 'অর্ডার ম্যানেজমেন্ট', 'সব অর্ডার এক ড্যাশবোর্ডে — স্ট্যাটাস বদলান, খুঁজুন, সামলান সহজেই।'],
  ['🎯', 'Facebook Pixel + CAPI সেটআপ', 'নিজের পিক্সেল আইডি বসালেই প্রতিটা পেজে ট্র্যাকিং চালু — অ্যাডের রেজাল্ট মাপুন ঠিকমতো।'],
  ['🚚', 'কুরিয়ার ইন্টিগ্রেশন', 'Steadfast ও Pathao-এর কী সেট করে রাখুন — কুরিয়ার পাঠানো হবে ঝামেলাহীন।'],
  ['📞', 'Incomplete Order ধরা', 'অর্ডার অসম্পূর্ণ রেখে চলে যাওয়া কাস্টমারের তথ্য ধরে রাখুন, পরে কল করে সেল ফিরিয়ে আনুন।'],
  ['📊', 'নিজস্ব ড্যাশবোর্ড', 'পেজ, প্রোডাক্ট, অর্ডার, ওয়ালেট — সবকিছু আপনার নিজের ড্যাশবোর্ড থেকে, ফোন থেকেও।'],
  ['🌐', 'কাস্টম ডোমেইন / ফ্রি সাবডোমেইন', 'নিজের ডোমেইন কানেক্ট করুন, অথবা আমাদের ফ্রি সাবডোমেইন দিয়েই ব্যবসা শুরু করুন।'],
  ['👛', 'ওয়ালেট সাবস্ক্রিপশন', 'আগাম টাকা জমা রাখুন ওয়ালেটে — প্রতি মাসে সিস্টেম নিজে থেকে কেটে মেয়াদ বাড়িয়ে দেবে।'],
];

const STEPS = [
  ['অ্যাকাউন্ট খুলুন', 'মাত্র ১ মিনিটে ফ্রি রেজিস্ট্রেশন — নিজের ড্যাশবোর্ড সাথে সাথেই তৈরি।'],
  ['টেমপ্লেট বেছে পেজ বানান', 'পছন্দের টেমপ্লেটে প্রোডাক্ট, দাম আর ছবি বসান — ১ ক্লিকে পেজ লাইভ।'],
  ['অর্ডার নেওয়া শুরু করুন', 'পেজের লিংক শেয়ার করুন বা অ্যাড চালান — অর্ডার আসবে সরাসরি আপনার ড্যাশবোর্ডে।'],
];

const PRICE_FEATURES = [
  ['১-ক্লিকে ল্যান্ডিং পেজ', 'অর্ডার ম্যানেজমেন্ট', 'নিজস্ব ড্যাশবোর্ড', 'Pixel সেটআপ'],
  ['১-ক্লিকে ল্যান্ডিং পেজ', 'অর্ডার ম্যানেজমেন্ট', 'নিজস্ব ড্যাশবোর্ড', 'Pixel + কুরিয়ার সেটআপ'],
  ['১-ক্লিকে ল্যান্ডিং পেজ', 'অর্ডার ম্যানেজমেন্ট', 'নিজস্ব ড্যাশবোর্ড', 'Pixel + কুরিয়ার + অগ্রাধিকার সাপোর্ট'],
];

const FAQS = [
  ['আমার কি আলাদা হোস্টিং কিনতে হবে?', 'না। পেজ আমাদের সার্ভারেই চলে — আপনার কোনো হোস্টিং, সার্ভার বা টেকনিক্যাল সেটআপ লাগবে না। আপনি শুধু পেজ বানাবেন আর অর্ডার নেবেন।'],
  ['নিজের ডোমেইন ব্যবহার করা যাবে?', 'যাবে। নিজের কাস্টম ডোমেইন কানেক্ট করতে পারবেন। ডোমেইন না থাকলে আমাদের ফ্রি সাবডোমেইন দিয়েও ব্যবসা চালাতে পারবেন।'],
  ['পেমেন্ট কীভাবে করব?', 'ওয়ালেট মডেলে — বিকাশ/নগদে টাকা পাঠিয়ে TrxID জমা দিলে ওয়ালেটে ব্যালেন্স যোগ হয়। প্রতি মাসে সিস্টেম ওয়ালেট থেকে সাবস্ক্রিপশন ফি নিজে থেকে কেটে মেয়াদ বাড়িয়ে দেয়, তাই বারবার পেমেন্টের ঝামেলা নেই। ২-৩ মাসের টাকা আগাম জমা রাখাও যায়।'],
  ['টাকা না দিলে কি পেজ বন্ধ হয়ে যাবে?', 'মেয়াদ শেষ হলে প্রথমে ইমেইল ও ড্যাশবোর্ডে সতর্কবার্তা আসবে, তারপর ৫ দিন গ্রেস পিরিয়ডে পেজ চালু থাকবে। এরপরও রিচার্জ না হলে পেজ সাময়িক বন্ধ হবে — তবে ডেটা মুছবে না, রিচার্জ করলেই সব আবার আগের মতো চালু হবে।'],
  ['সাপোর্ট পাব কীভাবে?', 'যেকোনো সমস্যায় SHERA IT-এর সাপোর্টে যোগাযোগ করুন — সেটআপ থেকে শুরু করে পেজ চালানো পর্যন্ত পাশে আছি।'],
];

function DashboardMock() {
  return (
    <div className="mock" aria-hidden="true">
      <div className="mock-bar">
        <i style={{ background: '#f87171' }} /><i style={{ background: '#fbbf24' }} /><i style={{ background: '#34d399' }} />
      </div>
      <div className="mock-body">
        <div className="mock-side"><i className="on" /><i /><i /><i /><i /></div>
        <div className="mock-main">
          <div className="mock-stats">
            <div className="mock-stat"><b>১২টি</b><span>ল্যান্ডিং পেজ</span></div>
            <div className="mock-stat"><b>৩৪৮টি</b><span>মোট অর্ডার</span></div>
            <div className="mock-stat"><b>৳১,২০০</b><span>ওয়ালেট ব্যালেন্স</span></div>
          </div>
          <div className="mock-row hot" />
          <div className="mock-row" />
          <div>
            <span className="mock-chip g">ডেলিভার্ড</span>{' '}
            <span className="mock-chip a">কুরিয়ারে আছে</span>{' '}
            <span className="mock-chip g">নতুন অর্ডার</span>
          </div>
          <div className="mock-row" />
          <div className="mock-row hot" style={{ width: '70%' }} />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const prices = [priceForPageCount(1), priceForPageCount(2), priceForPageCount(3)];
  return (
    <div className="mkt">
      <header className="mkt-header">
        <div className="mkt-wrap mkt-header-in">
          <Link className="mkt-logo" href="/">
            <span className="mkt-logo-badge">S</span>
            <span><b>SHERA IT</b><small>ল্যান্ডিং পেজ SaaS</small></span>
          </Link>
          <nav className="mkt-nav">
            <a className="navlink" href="#features">ফিচার</a>
            <a className="navlink" href="#how">কীভাবে কাজ করে</a>
            <a className="navlink" href="#templates">টেমপ্লেট</a>
            <a className="navlink" href="#pricing">প্যাকেজ</a>
            <a className="navlink" href="#faq">FAQ</a>
            <Link className="mkt-login-btn" href="/login">লগইন</Link>
            <Link className="mkt-cta" href="/register">ফ্রি শুরু করুন</Link>
          </nav>
        </div>
      </header>

      <section className="mkt-hero">
        <div className="mkt-wrap mkt-hero-grid">
          <div>
            <span className="mkt-pill">🚀 হোস্টিং ছাড়াই অনলাইন সেলস</span>
            <h1>মাত্র <span className="grad">১ ক্লিকে</span> বানান সেলস ল্যান্ডিং পেজ — হোস্টিং, কোডিং ছাড়াই!</h1>
            <p className="sub">
              অ্যাকাউন্ট খুলুন, রেডি টেমপ্লেট থেকে পেজ বানান, অর্ডার ম্যানেজ করুন,
              পিক্সেল ও কুরিয়ার সেটআপ করুন — সবকিছু এক ড্যাশবোর্ড থেকে, মাসে মাত্র ৳{prices[0]} থেকে।
            </p>
            <div className="mkt-hero-btns">
              <Link className="btn mkt-btn-big" href="/register">ফ্রি শুরু করুন</Link>
              <a className="btn secondary mkt-btn-big" href="#pricing">প্যাকেজ দেখুন</a>
            </div>
            <div className="mkt-trust">
              <span>কোনো হোস্টিং লাগবে না</span>
              <span>নিজস্ব ড্যাশবোর্ড</span>
              <span>পিক্সেল + কুরিয়ার রেডি</span>
            </div>
          </div>
          <DashboardMock />
        </div>
      </section>

      <section className="mkt-section" id="features">
        <div className="mkt-wrap">
          <h2>ব্যবসা চালাতে যা যা লাগে — সব এক জায়গায়</h2>
          <p className="lead">ল্যান্ডিং পেজ থেকে অর্ডার, পিক্সেল থেকে কুরিয়ার — আলাদা আলাদা টুল বা টেকনিক্যাল লোক ছাড়াই পুরো সিস্টেম আপনার হাতে।</p>
          <div className="feat-grid">
            {FEATURES.map(([ico, title, text]) => (
              <div className="feat" key={title}>
                <div className="ico">{ico}</div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mkt-section" id="how">
        <div className="mkt-wrap">
          <h2>কীভাবে কাজ করে</h2>
          <p className="lead">তিনটি সহজ ধাপেই আপনার অনলাইন সেলস চালু।</p>
          <div className="steps">
            {STEPS.map(([title, text], i) => (
              <div className="step" key={title}>
                <div className="num">{['১', '২', '৩'][i]}</div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mkt-section" id="templates">
        <div className="mkt-wrap">
          <h2>রেডি টেমপ্লেট — বেছে নিন, পেজ বানান</h2>
          <p className="lead">প্রতিটা টেমপ্লেটেই হিরো, অফার, রিভিউ আর অর্ডার ফর্ম সাজানো থাকে — শুধু প্রোডাক্ট বসালেই হলো।</p>
          <div className="tpl-grid">
            {TEMPLATES.map((t, i) => (
              <div className="tpl" key={t.id}>
                <div className={`tpl-prev tpl-p${i % 3}`}>
                  <div className="bar" style={{ background: '#7c3aed', width: '42%' }} />
                  <div className="bar" style={{ background: '#c4b5fd', width: '88%' }} />
                  <div className="bar" style={{ background: '#ddd6fe', width: '70%' }} />
                  <div className="btnline" style={{ background: '#16a34a' }} />
                  <div className="bar" style={{ background: '#e9e4f8', width: '95%' }} />
                  <div className="bar" style={{ background: '#e9e4f8', width: '80%' }} />
                </div>
                <div className="tpl-body">
                  <h3>{t.name}</h3>
                  <p>{t.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mkt-section" id="pricing">
        <div className="mkt-wrap">
          <h2>সহজ প্যাকেজ — পেজ অনুযায়ী দাম</h2>
          <p className="lead">যতটা পেজ লাগবে, ততটাই পেমেন্ট। লুকানো চার্জ নেই। এরপর প্রতি অতিরিক্ত পেজ মাত্র +৳{PLANS.extraPagePrice}/মাস।</p>
          <div className="price-grid">
            {prices.map((price, i) => (
              <div className={`price-card${i === 1 ? ' pop' : ''}`} key={i}>
                {i === 1 && <span className="price-tag">জনপ্রিয়</span>}
                <h3>{['স্টার্টার', 'গ্রোথ', 'বিজনেস'][i]} — {['১', '২', '৩'][i]}টি পেজ</h3>
                <div className="price-amt">৳{price}<small>/মাস</small></div>
                <ul>
                  {PRICE_FEATURES[i].map((f) => <li key={f}>{f}</li>)}
                </ul>
                <Link className="btn" href="/register">শুরু করুন</Link>
              </div>
            ))}
          </div>
          <p className="price-note">💡 ওয়ালেটে ২-৩ মাসের টাকা আগাম জমা রাখলে প্রতি মাসে সিস্টেম নিজে থেকে কেটে নেবে — বারবার পেমেন্টের ঝামেলা নেই।</p>
        </div>
      </section>

      <section className="mkt-section" id="faq">
        <div className="mkt-wrap">
          <h2>সাধারণ প্রশ্ন</h2>
          <p className="lead">আরও কিছু জানতে চাইলে সাপোর্টে মেসেজ করুন।</p>
          <div className="faq">
            {FAQS.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>

          <div className="mkt-final">
            <h2>আজই শুরু করুন আপনার অনলাইন সেলস</h2>
            <p>প্রথম পেজ বানাতে ২ মিনিটের বেশি লাগবে না। হোস্টিংয়ের ঝামেলা আমাদের, সেলস আপনার।</p>
            <Link className="btn mkt-btn-big" href="/register">ফ্রি অ্যাকাউন্ট খুলুন</Link>
          </div>
        </div>
      </section>

      <footer className="mkt-footer">
        <div className="mkt-wrap mkt-footer-in">
          <span><b>SHERA IT</b> — YOUR DIGITAL PARTNER</span>
          <span>ল্যান্ডিং পেজ • অর্ডার ম্যানেজমেন্ট • পিক্সেল ও কুরিয়ার</span>
          <span>© {new Date().getFullYear()} SHERA IT</span>
        </div>
      </footer>
    </div>
  );
}
