'use client';
import { useState } from 'react';

export default function OrderForm({ slug, buttonText }) {
  const [form, setForm] = useState({ customerName: '', phone: '', address: '', quantity: 1 });
  const [state, setState] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setState('পাঠানো হচ্ছে…');
    const res = await fetch('/api/public/order', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, ...form, quantity: Number(form.quantity) }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setState('✅ ধন্যবাদ! আপনার অর্ডারটি পেয়েছি। শীঘ্রই কল করে কনফার্ম করা হবে।');
      setForm({ customerName: '', phone: '', address: '', quantity: 1 });
    } else {
      setState(d.error || 'অর্ডার করা যায়নি, আবার চেষ্টা করুন।');
    }
  }

  return (
    <form onSubmit={submit} className="card">
      <label>আপনার নাম</label>
      <input value={form.customerName} onChange={set('customerName')} required />
      <label>মোবাইল নম্বর</label>
      <input value={form.phone} onChange={set('phone')} required placeholder="01XXXXXXXXX" />
      <label>সম্পূর্ণ ঠিকানা</label>
      <textarea value={form.address} onChange={set('address')} required rows={2} style={{ width: '100%' }} />
      <label>পরিমাণ</label>
      <input type="number" min="1" value={form.quantity} onChange={set('quantity')} />
      <p><button className="big-order-btn" type="submit">{buttonText || 'অর্ডার কনফার্ম করুন'}</button></p>
      {state && <p style={{ fontWeight: 600 }}>{state}</p>}
    </form>
  );
}
