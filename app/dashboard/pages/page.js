'use client';
import { useEffect, useState } from 'react';
import { TEMPLATES } from '@/lib/templates';

async function api(path, opts) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  return res.json();
}

export default function PagesPage() {
  const [pages, setPages] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ title: '', slug: '', templateId: 'classic-sales', productId: '' });
  const [msg, setMsg] = useState('');

  async function load() {
    const p = await api('/api/me/pages');
    const pr = await api('/api/me/products');
    setPages(p.pages || []);
    setProducts(pr.products || []);
  }
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    const data = await api('/api/me/pages', { method: 'POST', body: JSON.stringify(form) });
    if (data.page) {
      setMsg(`পেজ তৈরি হয়েছে! লাইভ লিংক: /s/${data.page.slug}`);
      setForm({ title: '', slug: '', templateId: 'classic-sales', productId: '' });
      load();
    }
  }
  async function rename(page) {
    const title = prompt('নতুন টাইটেল', page.title);
    if (!title) return;
    await api('/api/me/pages', { method: 'PATCH', body: JSON.stringify({ id: page.id, title }) });
    load();
  }
  async function remove(page) {
    if (!confirm(`"${page.title}" পেজটি মুছে ফেলবেন?`)) return;
    await api('/api/me/pages', { method: 'DELETE', body: JSON.stringify({ id: page.id }) });
    load();
  }

  return (
    <>
      <h1>আমার ল্যান্ডিং পেজ</h1>
      <div className="card">
        <h3>১ ক্লিকে নতুন পেজ তৈরি করুন</h3>
        <form onSubmit={create}>
          <label>পেজের টাইটেল / শপের নাম</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="যেমন: আমার অর্গানিক শপ" />
          <label>লিংকের নাম (স্লাগ) — খালি রাখলে টাইটেল থেকে তৈরি হবে</label>
          <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="my-shop" />
          <label>টেমপ্লেট</label>
          <select value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value })}>
            {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.description}</option>)}
          </select>
          <label>প্রোডাক্ট</label>
          <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
            <option value="">— প্রোডাক্ট ছাড়া —</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name} (৳{p.price})</option>)}
          </select>
          <p><button className="btn" type="submit">পেজ তৈরি করুন</button></p>
          {msg && <p className="ok">{msg}</p>}
        </form>
      </div>
      {pages.map((p) => (
        <div className="card" key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <b>{p.title}</b><br />
            <a href={`/s/${p.slug}`} target="_blank" rel="noreferrer">/s/{p.slug}</a>
            <span className="muted"> — {p.sections.length}টি সেকশন</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn secondary small" onClick={() => rename(p)}>টাইটেল বদলান</button>
            <button className="btn danger small" onClick={() => remove(p)}>মুছুন</button>
          </div>
        </div>
      ))}
      {pages.length === 0 && <p className="muted">এখনো কোনো পেজ তৈরি হয়নি।</p>}
    </>
  );
}
