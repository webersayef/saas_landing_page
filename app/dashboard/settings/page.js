'use client';
import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/me/settings').then((r) => r.json()).then((d) => {
      if (d.user) {
        setForm({
          shopName: d.user.shopName || '',
          pixelId: d.user.pixelId || '',
          courier: d.user.courier || {},
        });
      }
    });
  }, []);

  async function save(e) {
    e.preventDefault();
    const res = await fetch('/api/me/settings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setMsg(res.ok ? 'সেভ হয়েছে।' : 'সেভ হয়নি, আবার চেষ্টা করুন।');
  }

  if (!form) return <p>লোড হচ্ছে…</p>;
  const c = form.courier || {};
  const setC = (k) => (e) => setForm({ ...form, courier: { ...c, [k]: e.target.value } });

  return (
    <>
      <h1>সেটিংস</h1>
      <form onSubmit={save}>
        <div className="card">
          <h3>সাধারণ</h3>
          <label>শপের নাম</label>
          <input value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} />
          <label>ফেসবুক পিক্সেল আইডি</label>
          <input value={form.pixelId} onChange={(e) => setForm({ ...form, pixelId: e.target.value })} placeholder="যেমন: 123456789012345" />
          <p className="muted">পিক্সেল আইডি বসালে আপনার সব পেজে অটো যুক্ত হয়ে যাবে।</p>
        </div>
        <div className="card">
          <h3>কুরিয়ার</h3>
          <label>Steadfast API Key</label>
          <input value={c.steadfastApiKey || ''} onChange={setC('steadfastApiKey')} />
          <label>Steadfast Secret Key</label>
          <input value={c.steadfastSecret || ''} onChange={setC('steadfastSecret')} />
          <label>Pathao Client ID</label>
          <input value={c.pathaoClientId || ''} onChange={setC('pathaoClientId')} />
          <label>Pathao Secret</label>
          <input value={c.pathaoSecret || ''} onChange={setC('pathaoSecret')} />
          <label>কুরিয়ার নোট</label>
          <textarea value={c.note || ''} onChange={setC('note')} rows={2} />
        </div>
        {msg && <p className="ok">{msg}</p>}
        <button className="btn" type="submit">সেভ করুন</button>
      </form>
    </>
  );
}
