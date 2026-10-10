import type { Metadata } from 'next';
import './globals.css';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';
import { NotificationToastContainer } from '@/components/notifications/NotificationToast';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

export const metadata: Metadata = {
  title: 'OgroniEdu (অগ্রণী এডু) — বিশ্বস্ত শিক্ষক ও শিক্ষার্থী প্ল্যাটফর্ম',
  description:
    'বাংলাদেশের প্রথম সমন্বিত টিউশন ও লার্নিং ম্যানেজমেন্ট প্ল্যাটফর্ম। ১ম-১২শ শ্রেণি ও বিশ্ববিদ্যালয় ভর্তি প্রস্তুতি।',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const demoUserId = '11111111-1111-1111-1111-111111111111';

  return (
    <html lang="bn" dir="ltr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased selection:bg-emerald-500 selection:text-white">
        <NotificationProvider userId={demoUserId} userRole="guardian" locale="bn">
          {children}
          <NotificationToastContainer locale="bn" />
          <NotificationCenter locale="bn" />
        </NotificationProvider>
      </body>
    </html>
  );
}
