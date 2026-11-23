import { notFound } from 'next/navigation';
import { getPageBySlug, getProductById, getUserById } from '@/lib/store';
import { getSubscriptionStatus } from '@/lib/billing';
import SectionRenderer from '@/components/SectionRenderer';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = getPageBySlug(slug);
  return { title: page ? page.title : 'পেজ পাওয়া যায়নি' };
}

export default async function PublicPage({ params }) {
  const { slug } = await params;
  const page = getPageBySlug(slug);
  if (!page) notFound();
  const owner = getUserById(page.userId);
  const status = owner ? getSubscriptionStatus(owner) : 'locked';

  // Locked subscription → expiry notice (grace still serves the page).
  if (!owner || status === 'locked') {
    return (
      <main style={{ maxWidth: 560, margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
        <h1>⏰ এই পেজটির মেয়াদ শেষ হয়ে গেছে</h1>
        <p>দুঃখিত, এই শপের সাবস্ক্রিপশনের মেয়াদ শেষ হওয়ায় পেজটি আপাতত বন্ধ আছে।
           শপ কর্তৃপক্ষ নবায়ন করলেই পেজটি আবার চালু হবে।</p>
      </main>
    );
  }

  const product = page.productId ? getProductById(page.productId) : null;
  return (
    <main>
      {owner.pixelId && (
        <>
          <script
            dangerouslySetInnerHTML={{
              __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${owner.pixelId.replace(/[^0-9]/g, '')}');fbq('track','PageView');`,
            }}
          />
          <noscript>
            <img height="1" width="1" style={{ display: 'none' }} alt=""
              src={`https://www.facebook.com/tr?id=${owner.pixelId.replace(/[^0-9]/g, '')}&ev=PageView&noscript=1`} />
          </noscript>
        </>
      )}
      {(page.sections || []).map((section, i) => (
        <SectionRenderer key={i} section={section} page={page} product={product} />
      ))}
      <footer style={{ textAlign: 'center', padding: 22 }} className="muted">
        {owner.shopName || page.title} — ক্যাশ অন ডেলিভারি সারা দেশে
      </footer>
    </main>
  );
}
