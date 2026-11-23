'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthForm({ mode }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', shopName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

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
    <main style={{ maxWidth: 430, margin: '50px auto', padding: '0 20px' }}>
      <div className="card">
        <h1>{mode === 'register' ? 'নতুন অ্যাকাউন্ট' : 'লগইন'}</h1>
        <form onSubmit={submit}>
          {mode === 'register' && (<>
            <label>আপনার নাম</label>
            <input value={form.name} onChange={set('name')} required />
            <label>শপের নাম</label>
            <input value={form.shopName} onChange={set('shopName')} />
          </>)}
          <label>ইমেইল</label>
          <input type="email" value={form.email} onChange={set('email')} required />
          <label>পাসওয়ার্ড</label>
          <input type="password" value={form.password} onChange={set('password')} required />
          {error && <p className="error">{error}</p>}
          <p><button className="btn" type="submit" style={{ width: '100%' }}>
            {mode === 'register' ? 'অ্যাকাউন্ট খুলুন' : 'লগইন করুন'}
          </button></p>
        </form>
        <p className="muted">
          {mode === 'register'
            ? <>আগেই অ্যাকাউন্ট আছে? <a href="/login">লগইন করুন</a></>
            : <>অ্যাকাউন্ট নেই? <a href="/register">নতুন অ্যাকাউন্ট খুলুন</a></>}
        </p>
      </div>
    </main>
  );
}
