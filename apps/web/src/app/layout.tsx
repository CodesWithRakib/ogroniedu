import type { Metadata } from 'next';
import './globals.css';
import {
  DEFAULT_THEME,
  DEFAULT_MODE,
  THEME_STORAGE_KEY,
  THEME_MODE_STORAGE_KEY,
} from '@/lib/theme/themes';

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
    statusBarStyle: 'black-translucent',
    title: 'OgroniEdu',
  },
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

// Inline, zero-flash theme & mode init script before first paint.
const themeInitScript = `(function(){
  try{
    var t=localStorage.getItem('${THEME_STORAGE_KEY}')||'${DEFAULT_THEME}';
    var m=localStorage.getItem('${THEME_MODE_STORAGE_KEY}')||'${DEFAULT_MODE}';
    var isDark = m === 'dark' || (m === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.setAttribute('data-mode', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }catch(e){
    document.documentElement.setAttribute('data-theme','${DEFAULT_THEME}');
    document.documentElement.setAttribute('data-mode','dark');
    document.documentElement.classList.add('dark');
  }
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" dir="ltr" data-theme={DEFAULT_THEME} data-mode="dark" className="dark" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />
        <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
        <meta name="theme-color" content="#031317" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="OgroniEdu" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased selection:bg-primary selection:text-white">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white shadow-md"
        >
          মূল কনটেন্টে যান / Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
