'use client';
import { useEffect, useState } from 'react';

async function api(path, opts) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  return res.json();
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: '', price: '', imageUrl: '' });

  async function load() {
    const d = await api('/api/me/products');
    setProducts(d.products || []);
  }
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    await api('/api/me/products', { method: 'POST', body: JSON.stringify({ ...form, price: Number(form.price) }) });
    setForm({ name: '', price: '', imageUrl: '' });
    load();
  }
  async function edit(p) {
    const name = prompt('প্রোডাক্টের নাম', p.name); if (name == null) return;
    const price = prompt('দাম (টাকা)', p.price); if (price == null) return;
    const imageUrl = prompt('ছবির লিংক (URL)', p.imageUrl); if (imageUrl == null) return;
    await api('/api/me/products', { method: 'PATCH', body: JSON.stringify({ id: p.id, name, price: Number(price), imageUrl }) });
    load();
  }
  async function remove(p) {
    if (!confirm(`"${p.name}" মুছে ফেলবেন?`)) return;
    await api('/api/me/products', { method: 'DELETE', body: JSON.stringify({ id: p.id }) });
    load();
  }

  return (
    <>
      <h1>প্রোডাক্ট</h1>
      <div className="card">
        <h3>নতুন প্রোডাক্ট যোগ করুন</h3>
        <form onSubmit={create}>
          <label>নাম</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <label>দাম (টাকা)</label>
          <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          <label>ছবির লিংক (URL)</label>
          <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://…" />
          <p><button className="btn" type="submit">যোগ করুন</button></p>
        </form>
      </div>
      {products.map((p) => (
        <div className="card" key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div><b>{p.name}</b> — ৳{p.price}{p.imageUrl && <> — <a href={p.imageUrl} target="_blank" rel="noreferrer">ছবি</a></>}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn secondary small" onClick={() => edit(p)}>এডিট</button>
            <button className="btn danger small" onClick={() => remove(p)}>মুছুন</button>
          </div>
        </div>
      ))}
      {products.length === 0 && <p className="muted">এখনো কোনো প্রোডাক্ট যোগ হয়নি।</p>}
    </>
  );
}
