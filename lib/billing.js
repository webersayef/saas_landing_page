// Billing engine — pure status function + the cycle runner.
//
// Cycle: 30 days. Status from paidThrough:
//   active   : more than dueSoonDays left
//   due_soon : due within dueSoonDays (warning email + amber notice)
//   grace    : past due, within graceDays — pages still live, RED banner
//   locked   : past due + graceDays — public pages show expiry notice,
//              dashboard stays accessible, nothing is deleted.
// A suspended account is always 'locked'.
import { PLANS, priceForPageCount } from './plans.js';
import {
  listAllUsers, countPagesByUser, debitWallet, updateUser,
} from './store.js';
import { sendEmail } from './mailer.js';

const DAY = 86400000;

export function getSubscriptionStatus(user, now = new Date()) {
  if (!user) return 'locked';
  if (user.suspended) return 'locked';
  const due = new Date(user.paidThrough).getTime();
  const t = new Date(now).getTime();
  if (t < due - PLANS.dueSoonDays * DAY) return 'active';
  if (t < due) return 'due_soon';
  if (t < due + PLANS.graceDays * DAY) return 'grace';
  return 'locked';
}

export const STATUS_BN = {
  active: 'সক্রিয়',
  due_soon: 'মেয়াদ শেষের কাছাকাছি',
  grace: 'গ্রেস পিরিয়ডে আছে',
  locked: 'লক হয়ে গেছে',
};

// Run one billing pass over all users. `store` is accepted for signature
// compatibility with scheduled runners; the store module is used
// directly. Returns a summary { deducted, insufficient, warned, locked }.
export async function runBillingCycle(store, now = new Date()) {
  const summary = { deducted: [], insufficient: [], warned: [], locked: [] };
  const t = new Date(now).getTime();

  for (const user of await listAllUsers()) {
    if (user.suspended) continue;
    const pageCount = await countPagesByUser(user.id);
    let due = new Date(user.paidThrough).getTime();
    let currentPaidThrough = user.paidThrough;

    // Due-soon warning (once per cycle).
    if (pageCount > 0 && t >= due - PLANS.dueSoonDays * DAY && t < due && user.billingWarnFor !== user.paidThrough) {
      await sendEmail({
        userId: user.id, to: user.email, kind: 'due_warning',
        subject: 'আপনার সাবস্ক্রিপশনের মেয়াদ শেষ হতে যাচ্ছে',
        body: `আপনার ${pageCount}টি পেজের সাবস্ক্রিপশনের মেয়াদ ৩ দিনের মধ্যে শেষ হবে। ওয়ালেটে পর্যাপ্ত ব্যালেন্স রাখুন, যাতে অটো-ডিডাকশন সফল হয়।`,
      });
      await updateUser(user.id, { billingWarnFor: user.paidThrough });
      summary.warned.push(user.id);
    }

    // Deduct every fully-due cycle (normally at most one).
    let guard = 0;
    while (pageCount > 0 && t >= due && guard++ < 12) {
      const price = priceForPageCount(pageCount);
      const ok = await debitWallet(user.id, price, 'subscription',
        `${pageCount}টি পেজের মাসিক সাবস্ক্রিপশন`, null);
      if (!ok) {
        if (user.billingFailFor !== currentPaidThrough) {
          await sendEmail({
            userId: user.id, to: user.email, kind: 'payment_failed',
            subject: 'সাবস্ক্রিপশন পেমেন্ট ব্যর্থ — ওয়ালেটে ব্যালেন্স কম',
            body: `আপনার ওয়ালেটে পর্যাপ্ত ব্যালেন্স না থাকায় ${price} টাকার সাবস্ক্রিপশন কাটা যায়নি। ${PLANS.graceDays} দিনের গ্রেস পিরিয়ডে আপনার পেজ চালু থাকবে — এর মধ্যে রিচার্জ না করলে পেজ বন্ধ হয়ে যাবে।`,
          });
          await updateUser(user.id, { billingFailFor: currentPaidThrough });
        }
        summary.insufficient.push(user.id);
        break;
      }
      const newDue = new Date(due + PLANS.cycleDays * DAY).toISOString();
      await updateUser(user.id, { paidThrough: newDue, billingWarnFor: null, billingFailFor: null });
      currentPaidThrough = newDue;
      summary.deducted.push({ userId: user.id, amount: price, paidThrough: newDue });
      await sendEmail({
        userId: user.id, to: user.email, kind: 'subscription_paid',
        subject: 'সাবস্ক্রিপশন সফলভাবে নবায়ন হয়েছে',
        body: `আপনার ওয়ালেট থেকে ${price} টাকা কেটে সাবস্ক্রিপশনের মেয়াদ ${new Date(newDue).toLocaleDateString('bn-BD')} পর্যন্ত বাড়ানো হয়েছে।`,
      });
      due = new Date(newDue).getTime();
    }

    if (getSubscriptionStatus({ ...user, paidThrough: currentPaidThrough }, now) === 'locked' && pageCount > 0) {
      summary.locked.push(user.id);
    }
  }
  return summary;
}
