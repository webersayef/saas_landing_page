'use client';
import { useEffect, useState } from 'react';

async function action(body) {
  const res = await fetch('/api/super/action', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export default function SuperPage() {
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');

  async function load() {
    const res = await fetch('/api/super/data');
    if (res.status === 401) { window.location.href = '/super/login'; return; }
    setData(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function runBilling() {
    const d = await action({ action: 'runBilling' });
    setMsg(`বিলিং রান হয়েছে — কাটা হয়েছে ${d.summary?.deducted?.length || 0} জনের, ব্যালেন্স কম ${d.summary?.insufficient?.length || 0} জনের।`);
    load();
  }
  async function simulateExpiry(userId) {
    const past = new Date(Date.now() - 6 * 86400000).toISOString();
    await action({ action: 'setPaidThrough', userId, paidThrough: past });
    setMsg('মেয়াদ অতীতে বসানো হয়েছে (লক অবস্থা)। পাবলিক পেজ চেক করুন।');
    load();
  }

  if (!data) return <main style={{ padding: 30 }}><p>লোড হচ্ছে…</p></main>;
  const s = data.stats;
  return (
    <main style={{ maxWidth: 1060, margin: '0 auto', padding: '28px 20px' }}>
      <h1>Super Admin</h1>
      <div className="grid cols3">
        <div className="card"><h2>{s.users}</h2><p className="muted">ইউজার</p></div>
        <div className="card"><h2>{s.pages}</h2><p className="muted">মোট পেজ</p></div>
        <div className="card"><h2>{s.orders}</h2><p className="muted">মোট অর্ডার</p></div>
        <div className="card"><h2>৳{s.walletTotal}</h2><p className="muted">সব ওয়ালেটের মোট ব্যালেন্স</p></div>
        <div className="card"><h2>{s.pendingDeposits}</h2><p className="muted">পেন্ডিং ডিপোজিট</p></div>
      </div>

      <div className="card">
        <h3>বিলিং</h3>
        <button className="btn" onClick={runBilling}>এখনই বিলিং রান করুন</button>
        {msg && <p className="ok">{msg}</p>}
      </div>

      <div className="card">
        <h3>ডিপোজিট রিকোয়েস্ট</h3>
        {data.deposits.length === 0 && <p className="muted">কোনো ডিপোজিট নেই।</p>}
        <table>
          <thead><tr><th>ইউজার</th><th>মাধ্যম</th><th>TrxID</th><th>পরিমাণ</th><th>স্ট্যাটাস</th><th>অ্যাকশন</th></tr></thead>
          <tbody>
            {data.deposits.map((d) => (
              <tr key={d.id}>
                <td>{d.userEmail}</td><td>{d.method}</td><td>{d.trxId}</td><td>৳{d.amount}</td><td>{d.status}</td>
                <td>
                  {d.status === 'pending' && (<>
                    <button className="btn small" onClick={async () => { await action({ action: 'approveDeposit', id: d.id }); load(); }}>অনুমোদন</button>{' '}
                    <button className="btn danger small" onClick={async () => { await action({ action: 'rejectDeposit', id: d.id }); load(); }}>বাতিল</button>
                  </>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>ইউজার তালিকা</h3>
        <table>
          <thead><tr><th>নাম / ইমেইল</th><th>স্ট্যাটাস</th><th>পেজ</th><th>মেয়াদ</th><th>ওয়ালেট</th><th>অ্যাকশন</th></tr></thead>
          <tbody>
            {data.users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}<br /><span className="muted">{u.email}</span></td>
                <td>{u.suspended ? '⛔ সাসপেন্ডেড' : u.status}</td>
                <td>{u.pageCount}</td>
                <td>{new Date(u.paidThrough).toLocaleDateString('bn-BD')}</td>
                <td>৳{u.walletBalance}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn secondary small" onClick={async () => { await action({ action: 'extendUser', userId: u.id }); load(); }}>+৩০ দিন</button>{' '}
                  <button className="btn secondary small" onClick={async () => { await action({ action: 'setSuspended', userId: u.id, suspended: !u.suspended }); load(); }}>
                    {u.suspended ? 'চালু করুন' : 'সাসপেন্ড'}
                  </button>{' '}
                  <button className="btn danger small" onClick={() => simulateExpiry(u.id)}>মেয়াদ শেষ টেস্ট</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
