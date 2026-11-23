import './globals.css';

export const metadata = {
  title: 'Shera IT ল্যান্ডিং SaaS',
  description: 'এক ক্লিকে ল্যান্ডিং পেজ, অর্ডার ম্যানেজমেন্ট, পিক্সেল ও কুরিয়ার — মাসিক সাবস্ক্রিপশনে।',
  manifest: '/manifest.webmanifest',
};

export const viewport = { themeColor: '#6d28d9' };

export default function RootLayout({ children }) {
  return (
    <html lang="bn">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{})})}`,
          }}
        />
      </body>
    </html>
  );
}
