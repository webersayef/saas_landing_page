'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { priceForPageCount } from '@/lib/plans';

function GoogleIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34.3 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34.3 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

export default function AuthForm({ mode }) {
  const router = useRouter();
  const isRegister = mode === 'register';
  const [view, setView] = useState('auth'); // auth | verify
  const [form, setForm] = useState({ name: '', shopName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [googleOn, setGoogleOn] = useState(false);
  const [showVerifyAction, setShowVerifyAction] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    fetch('/api/auth/config').then((r) => r.json()).then((d) => setGoogleOn(!!d.google)).catch(() => {});
    const q = new URLSearchParams(window.location.search);
    if (q.get('error') === 'google') setError('Google দিয়ে লগইন করা যায়নি। আবার চেষ্টা করুন বা ইমেইল-পাসওয়ার্ড ব্যবহার করুন।');
    if (q.get('verified') === '1') setSuccess('অ্যাকাউন্ট তৈরি হয়েছে — এখন লগইন করুন।');
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function submit(e) {
    e.preventDefault();
    setError(''); setSuccess(''); setShowVerifyAction(false);
    const res = await fetch(`/api/auth/${mode}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'কিছু ভুল হয়েছে।');
      if (data.needsVerification) setShowVerifyAction(true);
      return;
    }
    if (isRegister && data.needsVerification) {
      setVerifyEmail(form.email);
      setCode('');
      setCooldown(60);
      setView('verify');
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  async function resend(jumpToVerify) {
    setError('');
    const email = jumpToVerify ? form.email : verifyEmail;
    const res = await fetch('/api/auth/resend', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'কিছু ভুল হয়েছে।');
      if (data.retryAfter) setCooldown(data.retryAfter);
      return;
    }
    setCooldown(60);
    if (jumpToVerify) {
      setVerifyEmail(email);
      setCode('');
      setShowVerifyAction(false);
      setView('verify');
    } else {
      setSuccess('নতুন কোড পাঠানো হয়েছে — ইমেইল চেক করুন।');
    }
  }

  async function verify(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    setBusy(true);
    const res = await fetch('/api/auth/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: verifyEmail, code }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || 'কিছু ভুল হয়েছে।');
    if (isRegister) {
      router.push('/login?verified=1');
      return;
    }
    setView('auth');
    setSuccess('অ্যাকাউন্ট তৈরি হয়েছে — এখন লগইন করুন।');
  }

  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <span className="mkt-logo-badge">S</span>
        <h2>১ ক্লিকে ল্যান্ডিং পেজ,<br />ঝামেলাহীন অনলাইন সেলস।</h2>
        <p>SHERA IT-এর ল্যান্ডিং পেজ SaaS — হোস্টিং কেনা ছাড়াই নিজের ড্যাশবোর্ড থেকে পেজ বানান, অর্ডার নিন, ব্যবসা বাড়ান।</p>
        <ul>
          <li>কোনো হোস্টিং বা কোডিং লাগবে না</li>
          <li>অর্ডার ম্যানেজমেন্ট + Pixel ও কুরিয়ার রেডি</li>
          <li>নিজস্ব ড্যাশবোর্ড — ফোন থেকেও চলে</li>
        </ul>
        <div className="auth-price-note">
          💰 শুরু মাত্র <b>৳{priceForPageCount(1)}/মাসে</b> — ওয়ালেটে আগাম জমা রাখলে প্রতি মাসে অটো-নবায়ন।
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          {view === 'verify' ? (
            <>
              <h1>ইমেইল ভেরিফাই করুন</h1>
              <p className="sub">
                <b>{verifyEmail}</b> — এই ইমেইলে ৬ সংখ্যার একটি কোড পাঠানো হয়েছে।
                কোডটি বসালেই আপনার অ্যাকাউন্ট তৈরি হয়ে যাবে। কোডের মেয়াদ ১০ মিনিট।
              </p>
              <form onSubmit={verify}>
                <label htmlFor="auth-code">ভেরিফিকেশন কোড</label>
                <input id="auth-code" className="auth-code-input" inputMode="numeric" autoComplete="one-time-code"
                  maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  required placeholder="______" />
                {error && <div className="auth-error" role="alert">⚠️ {error}</div>}
                {success && <div className="auth-success" role="status">✅ {success}</div>}
                <button className="btn" type="submit" disabled={busy}>ভেরিফাই করুন</button>
              </form>
              <p className="muted" style={{ marginTop: 16, textAlign: 'center' }}>
                কোড পাননি?{' '}
                <button type="button" className="auth-link-btn" disabled={cooldown > 0} onClick={() => resend(false)}>
                  {cooldown > 0 ? `আবার কোড পাঠান (${cooldown} সে.)` : 'আবার কোড পাঠান'}
                </button>
              </p>
              <p style={{ textAlign: 'center', margin: '10px 0 0' }}>
                <button type="button" className="auth-link-btn" onClick={() => { setView('auth'); setError(''); setSuccess(''); }}>
                  ← অন্য ইমেইল ব্যবহার করুন
                </button>
              </p>
            </>
          ) : (
            <>
              <h1>{isRegister ? 'নতুন অ্যাকাউন্ট খুলুন' : 'স্বাগতম ফিরে আসায়!'}</h1>
              <p className="sub">
                {isRegister
                  ? 'ফ্রি রেজিস্ট্রেশন করুন — ইমেইলে পাঠানো কোড দিয়ে ভেরিফাই করলেই অ্যাকাউন্ট তৈরি।'
                  : 'আপনার ড্যাশবোর্ডে যেতে লগইন করুন।'}
              </p>
              <form onSubmit={submit}>
                {isRegister && (<>
                  <label htmlFor="auth-name">আপনার নাম</label>
                  <input id="auth-name" value={form.name} onChange={set('name')} required placeholder="যেমন: মোঃ রহিম" />
                  <label htmlFor="auth-shop">শপের নাম</label>
                  <input id="auth-shop" value={form.shopName} onChange={set('shopName')} required placeholder="যেমন: রহিম ফ্যাশন" />
                </>)}
                <label htmlFor="auth-email">ইমেইল</label>
                <input id="auth-email" type="email" value={form.email} onChange={set('email')} required placeholder="you@example.com" />
                <label htmlFor="auth-pass">পাসওয়ার্ড</label>
                <input id="auth-pass" type="password" value={form.password} onChange={set('password')} required placeholder="কমপক্ষে ৮ অক্ষর" />
                {error && <div className="auth-error" role="alert">⚠️ {error}</div>}
                {success && <div className="auth-success" role="status">✅ {success}</div>}
                {showVerifyAction && (
                  <p style={{ textAlign: 'center', margin: '12px 0 0' }}>
                    <button type="button" className="auth-link-btn" onClick={() => resend(true)}>
                      ভেরিফাই কোড পাঠান
                    </button>
                  </p>
                )}
                <button className="btn" type="submit">
                  {isRegister ? 'অ্যাকাউন্ট খুলুন' : 'লগইন করুন'}
                </button>
              </form>
              {googleOn && (
                <>
                  <div className="auth-or">অথবা</div>
                  <a className="auth-google-btn" href="/api/auth/google">
                    <GoogleIcon /> Google দিয়ে লগইন করুন
                  </a>
                </>
              )}
              <p className="muted" style={{ marginTop: 16, textAlign: 'center' }}>
                {isRegister
                  ? <>আগেই অ্যাকাউন্ট আছে? <a href="/login"><b>লগইন করুন</b></a></>
                  : <>অ্যাকাউন্ট নেই? <a href="/register"><b>নতুন অ্যাকাউন্ট খুলুন</b></a></>}
              </p>
              <p style={{ textAlign: 'center', margin: '10px 0 0' }}>
                <a href="/" className="muted" style={{ fontSize: 13.5 }}>← হোমপেজে ফিরুন</a>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
