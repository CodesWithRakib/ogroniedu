import type { Metadata } from 'next';
import './globals.css';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';
import { NotificationToastContainer } from '@/components/notifications/NotificationToast';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

export const metadata: Metadata = {
  metadataBase: new URL('https://ogroni.edu.bd'),
  title: {
    default: 'OgroniEdu (অগ্রণী এডু) — বিশ্বস্ত শিক্ষক ও শিক্ষার্থী প্ল্যাটফর্ম',
    template: '%s | OgroniEdu Bangladesh',
  },
  description:
    'বাংলাদেশের প্রথম সমন্বিত টিউশন ও লার্নিং ম্যানেজমেন্ট প্ল্যাটফর্ম। ১ম-১২শ শ্রেণি, বাংলা ও ইংলিশ ভার্সন, ইংলিশ মিডিয়াম ও বিশ্ববিদ্যালয় ভর্তি প্রস্তুতি।',
  keywords: [
    'tutor in bangladesh',
    'home tutor dhaka',
    'buet tutor',
    'online tuition bd',
    'ssc math tutor',
    'hsc physics tutor',
    'admission test prep',
  ],
  authors: [{ name: 'OgroniEdu Team', url: 'https://ogroni.edu.bd' }],
  creator: 'OgroniEdu',
  openGraph: {
    type: 'website',
    locale: 'bn_BD',
    alternateLocale: 'en_US',
    url: 'https://ogroni.edu.bd',
    siteName: 'OgroniEdu',
    title: 'OgroniEdu (অগ্রণী এডু) — বিশ্বস্ত শিক্ষক ও শিক্ষার্থী প্ল্যাটফর্ম',
    description:
      '১ম-১২শ শ্রেণি ও ভর্তি প্রস্তুতির জন্য বুয়েট, ঢাবি ও মেডিকেল শিক্ষার্থী টিউটর খুঁজুন নিরাপদে।',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OgroniEdu — Bangladesh Tutoring Platform',
    description: 'NID-verified educators and escrow-protected tutoring in Bangladesh.',
  },
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
