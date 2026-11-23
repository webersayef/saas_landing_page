'use client';
import { useEffect, useState } from 'react';

const TYPE_BN = { deposit: 'ডিপোজিট', subscription: 'সাবস্ক্রিপশন', adjustment: 'সমন্বয়' };

export default function WalletPage() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ method: 'bKash', trxId: '', amount: '' });
  const [msg, setMsg] = useState('');

  async function load() {
    const res = await fetch('/api/me/wallet');
    setData(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    const res = await fetch('/api/me/wallet', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    });
    const d = await res.json();
    if (!res.ok) return setMsg(d.error || 'ভুল হয়েছে।');
    setMsg('ডিপোজিট রিকোয়েস্ট পাঠানো হয়েছে। যাচাই শেষে ব্যালেন্সে যোগ হবে।');
    setForm({ method: 'bKash', trxId: '', amount: '' });
    load();
  }

  if (!data) return <p>লোড হচ্ছে…</p>;
  return (
    <>
      <h1>ওয়ালেট</h1>
      <div className="card"><h2>ব্যালেন্স: ৳{data.balance}</h2>
        <p className="muted">আগাম টাকা জমা রাখুন — প্রতি মাসে সাবস্ক্রিপশন এখান থেকেই অটো কেটে যাবে।</p>
      </div>
      <div className="card">
        <h3>টাকা জমা দিন (বিকাশ/নগদ)</h3>
        <p className="muted">আমাদের নম্বরে টাকা পাঠিয়ে নিচে মাধ্যম, TrxID ও পরিমাণ জমা দিন।</p>
        <form onSubmit={submit}>
          <label>মাধ্যম</label>
          <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            <option value="bKash">বিকাশ</option>
            <option value="Nagad">নগদ</option>
          </select>
          <label>TrxID</label>
          <input value={form.trxId} onChange={(e) => setForm({ ...form, trxId: e.target.value })} required />
          <label>পরিমাণ (টাকা)</label>
          <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          {msg && <p className={msg.includes('পাঠানো') ? 'ok' : 'error'}>{msg}</p>}
          <p><button className="btn" type="submit">ডিপোজিট রিকোয়েস্ট পাঠান</button></p>
        </form>
      </div>
      <div className="card">
        <h3>ডিপোজিট রিকোয়েস্ট</h3>
        {(data.deposits || []).length === 0 && <p className="muted">কোনো রিকোয়েস্ট নেই।</p>}
        {(data.deposits || []).map((d) => (
          <p key={d.id} style={{ margin: '5px 0' }}>{d.method} — ৳{d.amount} — TrxID: {d.trxId} — <b>{d.status}</b></p>
        ))}
      </div>
      <div className="card">
        <h3>লেনদেনের ইতিহাস</h3>
        {(data.ledger || []).length === 0 && <p className="muted">এখনো কোনো লেনদেন হয়নি।</p>}
        {(data.ledger || []).map((e) => (
          <p key={e.id} style={{ margin: '5px 0' }}>
            {TYPE_BN[e.type] || e.type}: <b>{e.amount > 0 ? '+' : ''}৳{e.amount}</b>
            <span className="muted"> — ব্যালেন্স ৳{e.balanceAfter} — {e.note}</span>
          </p>
        ))}
      </div>
    </>
  );
}
