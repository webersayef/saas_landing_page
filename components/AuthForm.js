'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { priceForPageCount } from '@/lib/plans';

export default function AuthForm({ mode }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', shopName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const isRegister = mode === 'register';

  async function submit(e) {
    e.preventDefault();
    setError('');
    const res = await fetch(`/api/auth/${mode}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error || 'কিছু ভুল হয়েছে।');
    router.push('/dashboard');
    router.refresh();
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
          <h1>{isRegister ? 'নতুন অ্যাকাউন্ট খুলুন' : 'স্বাগতম ফিরে আসায়!'}</h1>
          <p className="sub">
            {isRegister
              ? 'ফ্রি রেজিস্ট্রেশন করুন — ড্যাশবোর্ড সাথে সাথেই তৈরি হয়ে যাবে।'
              : 'আপনার ড্যাশবোর্ডে যেতে লগইন করুন।'}
          </p>
          <form onSubmit={submit}>
            {isRegister && (<>
              <label htmlFor="auth-name">আপনার নাম</label>
              <input id="auth-name" value={form.name} onChange={set('name')} required placeholder="যেমন: মোঃ রহিম" />
              <label htmlFor="auth-shop">শপের নাম</label>
              <input id="auth-shop" value={form.shopName} onChange={set('shopName')} placeholder="যেমন: রহিম ফ্যাশন" />
            </>)}
            <label htmlFor="auth-email">ইমেইল</label>
            <input id="auth-email" type="email" value={form.email} onChange={set('email')} required placeholder="you@example.com" />
            <label htmlFor="auth-pass">পাসওয়ার্ড</label>
            <input id="auth-pass" type="password" value={form.password} onChange={set('password')} required placeholder="কমপক্ষে ৬ অক্ষর" />
            {error && <div className="auth-error" role="alert">⚠️ {error}</div>}
            <button className="btn" type="submit">
              {isRegister ? 'অ্যাকাউন্ট খুলুন' : 'লগইন করুন'}
            </button>
          </form>
          <p className="muted" style={{ marginTop: 16, textAlign: 'center' }}>
            {isRegister
              ? <>আগেই অ্যাকাউন্ট আছে? <a href="/login"><b>লগইন করুন</b></a></>
              : <>অ্যাকাউন্ট নেই? <a href="/register"><b>নতুন অ্যাকাউন্ট খুলুন</b></a></>}
          </p>
          <p style={{ textAlign: 'center', margin: '10px 0 0' }}>
            <a href="/" className="muted" style={{ fontSize: 13.5 }}>← হোমপেজে ফিরুন</a>
          </p>
        </div>
      </main>
    </div>
  );
}
