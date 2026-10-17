import type { Metadata } from 'next';
import './globals.css';

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
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'OgroniEdu',
  },
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" dir="ltr">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />
        <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
        <meta name="theme-color" content="#f6f8fa" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="OgroniEdu" />
      </head>
      <body className="antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground shadow-md"
        >
          মূল কনটেন্টে যান / Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
