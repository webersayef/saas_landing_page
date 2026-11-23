import Link from 'next/link';
import { requireTenantUser } from '@/lib/auth-server';
import { countPagesByUser } from '@/lib/store';
import { priceForPageCount } from '@/lib/plans';
import SubscriptionBanner from '@/components/SubscriptionBanner';
import LogoutButton from '@/components/LogoutButton';

export const dynamic = 'force-dynamic';

const NAV = [
  ['/dashboard', 'ওভারভিউ'],
  ['/dashboard/pages', 'আমার পেজ'],
  ['/dashboard/products', 'প্রোডাক্ট'],
  ['/dashboard/orders', 'অর্ডার'],
  ['/dashboard/wallet', 'ওয়ালেট'],
  ['/dashboard/settings', 'সেটিংস'],
];

export default async function DashboardLayout({ children }) {
  const user = await requireTenantUser();
  const monthlyPrice = priceForPageCount(countPagesByUser(user.id));
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: 215, flexShrink: 0, background: '#2e1065', color: '#fff',
        padding: '22px 16px', position: 'sticky', top: 0, height: '100vh',
      }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20 }}>{user.shopName || 'আমার শপ'}</h2>
        <p style={{ opacity: 0.8, fontSize: 13, margin: '0 0 18px' }}>{user.email}</p>
        <nav style={{ display: 'grid', gap: 6 }}>
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} style={{
              color: '#fff', textDecoration: 'none', padding: '8px 10px',
              borderRadius: 8, background: 'rgba(255,255,255,0.08)', fontWeight: 600,
            }}>{label}</Link>
          ))}
        </nav>
        <div style={{ marginTop: 22, fontSize: 14 }}>
          <div>ওয়ালেট ব্যালেন্স: <b>৳{user.walletBalance}</b></div>
          <div>মাসিক খরচ: <b>৳{monthlyPrice}</b></div>
        </div>
        <div style={{ marginTop: 18 }}><LogoutButton /></div>
      </aside>
      <main style={{ flex: 1, padding: '24px 26px', maxWidth: 1020 }}>
        <SubscriptionBanner user={user} monthlyPrice={monthlyPrice} />
        {children}
      </main>
    </div>
  );
}
