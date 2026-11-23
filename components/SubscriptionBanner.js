// Subscription banner — states come straight from the billing engine:
//   active   → hidden
//   due_soon → amber warning
//   grace    → RED (pages still live, recharge now)
//   locked   → RED (pages closed, dashboard still open for recharge)
import { getSubscriptionStatus, STATUS_BN } from '@/lib/billing';
import { PLANS } from '@/lib/plans';

export default function SubscriptionBanner({ user, monthlyPrice }) {
  const status = getSubscriptionStatus(user);
  if (status === 'active') return null;
  const dueText = new Date(user.paidThrough).toLocaleDateString('bn-BD');

  if (status === 'due_soon') {
    return (
      <div className="banner amber">
        ⚠️ আপনার সাবস্ক্রিপশনের মেয়াদ {dueText} তারিখে শেষ হবে।
        ওয়ালেটে কমপক্ষে ৳{monthlyPrice} ব্যালেন্স রাখুন, যাতে অটো-নবায়ন সফল হয়।{' '}
        <a href="/dashboard/wallet">ওয়ালেটে যান</a>
      </div>
    );
  }
  if (status === 'grace') {
    return (
      <div className="banner red">
        🔴 সাবস্ক্রিপশনের মেয়াদ শেষ! ওয়ালেটে ব্যালেন্স কম থাকায় পেমেন্ট কাটা যায়নি।
        আপনি {PLANS.graceDays} দিনের গ্রেস পিরিয়ডে আছেন — এর মধ্যে রিচার্জ না করলে আপনার
        সব পেজ বন্ধ হয়ে যাবে। <a href="/dashboard/wallet">এখনই রিচার্জ করুন</a>
      </div>
    );
  }
  return (
    <div className="banner red">
      🔴 আপনার সাবস্ক্রিপশন লক হয়ে গেছে ({STATUS_BN[status]})। আপনার পেজগুলো
      আপাতত বন্ধ আছে, তবে কোনো ডেটা মুছে যায়নি। ওয়ালেটে টাকা জমা দিলেই পেজ আবার চালু হবে।{' '}
      <a href="/dashboard/wallet">এখনই রিচার্জ করুন</a>
    </div>
  );
}
