import { requireTenantUser } from '@/lib/auth-server';
import { listPagesByUser, listOrdersByUser } from '@/lib/store';
import { getSubscriptionStatus, STATUS_BN } from '@/lib/billing';
import { priceForPageCount } from '@/lib/plans';

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  const user = await requireTenantUser();
  const pages = await listPagesByUser(user.id);
  const orders = await listOrdersByUser(user.id);
  const status = getSubscriptionStatus(user);
  return (
    <>
      <h1>ওভারভিউ</h1>
      <div className="grid cols3">
        <div className="card"><h2>{pages.length}টি</h2><p className="muted">ল্যান্ডিং পেজ</p></div>
        <div className="card"><h2>{orders.length}টি</h2><p className="muted">মোট অর্ডার</p></div>
        <div className="card"><h2>৳{user.walletBalance}</h2><p className="muted">ওয়ালেট ব্যালেন্স</p></div>
        <div className="card">
          <h2>{STATUS_BN[status]}</h2>
          <p className="muted">
            সাবস্ক্রিপশন — মেয়াদ: {new Date(user.paidThrough).toLocaleDateString('bn-BD')},
            মাসিক ৳{priceForPageCount(pages.length)}
          </p>
        </div>
      </div>
      <div className="card">
        <h3>সাম্প্রতিক অর্ডার</h3>
        {orders.length === 0 && <p className="muted">এখনো কোনো অর্ডার আসেনি।</p>}
        {orders.slice(0, 5).map((o) => (
          <p key={o.id} style={{ margin: '6px 0' }}>
            <b>{o.customerName}</b> — {o.phone} — ৳{o.total} ({o.status})
          </p>
        ))}
      </div>
    </>
  );
}
