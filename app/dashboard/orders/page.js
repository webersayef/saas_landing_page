'use client';
import { useEffect, useState } from 'react';

const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  async function load() {
    const res = await fetch('/api/me/orders');
    const d = await res.json();
    setOrders(d.orders || []);
  }
  useEffect(() => { load(); }, []);

  async function setStatus(id, status) {
    await fetch('/api/me/orders', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  return (
    <>
      <h1>অর্ডার</h1>
      <div className="card">
        {orders.length === 0 && <p className="muted">এখনো কোনো অর্ডার আসেনি।</p>}
        {orders.length > 0 && (
          <table>
            <thead><tr><th>কাস্টমার</th><th>ফোন</th><th>ঠিকানা</th><th>মোট</th><th>স্ট্যাটাস</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.customerName}</td><td>{o.phone}</td><td>{o.address}</td>
                  <td>৳{o.total}</td>
                  <td>
                    <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)} style={{ width: 'auto' }}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
