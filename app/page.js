import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '48px 20px' }}>
      <h1 style={{ fontSize: 38, marginBottom: 8 }}>এক ক্লিকে ল্যান্ডিং পেজ — মাসে মাত্র ৳২৯৯ থেকে</h1>
      <p style={{ fontSize: 18 }}>
        অ্যাকাউন্ট খুলুন, রেডি টেমপ্লেট থেকে ১ ক্লিকে পেজ বানান, অর্ডার ম্যানেজ করুন,
        পিক্সেল ও কুরিয়ার সেটআপ করুন — হোস্টিং কেনার ঝামেলা ছাড়াই।
      </p>
      <div style={{ display: 'flex', gap: 12, margin: '22px 0' }}>
        <Link className="btn" href="/register">ফ্রি অ্যাকাউন্ট খুলুন</Link>
        <Link className="btn secondary" href="/login">লগইন</Link>
      </div>
      <div className="grid cols3">
        <div className="card"><h3>১ পেজ — ৳২৯৯/মাস</h3><p className="muted">শুরুর জন্য যথেষ্ট।</p></div>
        <div className="card"><h3>২ পেজ — ৳৩৯৯/মাস</h3><p className="muted">দুটি প্রোডাক্ট একসাথে।</p></div>
        <div className="card"><h3>৩ পেজ — ৳৬৪৯/মাস</h3><p className="muted">এরপর প্রতি পেজ +৳২৫০।</p></div>
      </div>
      <p className="muted">ওয়ালেটে আগাম টাকা জমা রাখুন — প্রতি মাসে সিস্টেম নিজে থেকে কেটে মেয়াদ বাড়িয়ে দেবে।</p>
    </main>
  );
}
