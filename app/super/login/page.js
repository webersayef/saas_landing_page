'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SuperLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault();
    const res = await fetch('/api/super/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      return setError(d.error || 'লগইন হয়নি।');
    }
    router.push('/super');
    router.refresh();
  }
  return (
    <main className="auth-main" style={{ minHeight: '100vh' }}>
      <div className="auth-card">
        <span className="mkt-logo-badge" style={{ marginBottom: 14 }}>S</span>
        <h1>Super Admin</h1>
        <p className="sub">SHERA IT SaaS — মালিকের প্যানেলে লগইন করুন।</p>
        <form onSubmit={submit}>
          <label htmlFor="super-pass">পাসওয়ার্ড</label>
          <input id="super-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <div className="auth-error" role="alert">⚠️ {error}</div>}
          <button className="btn" type="submit">লগইন</button>
        </form>
      </div>
    </main>
  );
}
