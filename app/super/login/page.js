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
    <main style={{ maxWidth: 400, margin: '60px auto', padding: '0 20px' }}>
      <div className="card">
        <h1>Super Admin লগইন</h1>
        <form onSubmit={submit}>
          <label>পাসওয়ার্ড</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="error">{error}</p>}
          <p><button className="btn" type="submit" style={{ width: '100%' }}>লগইন</button></p>
        </form>
      </div>
    </main>
  );
}
