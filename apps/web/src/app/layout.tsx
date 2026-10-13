import type { Metadata } from 'next';
import './globals.css';
import { DEFAULT_THEME, THEME_STORAGE_KEY } from '@/lib/theme/themes';

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

// Inline, no-flash theme init: reads persisted data-theme before hydration.
const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');var m=document.cookie.match(/(?:^|;\\s*)${THEME_STORAGE_KEY}=([^;]+)/);var v=t||(m&&m[1])||'${DEFAULT_THEME}';document.documentElement.setAttribute('data-theme',v);}catch(e){document.documentElement.setAttribute('data-theme','${DEFAULT_THEME}');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" dir="ltr" data-theme={DEFAULT_THEME} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased selection:bg-emerald-500 selection:text-white">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-emerald-700 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          মূল কনটেন্টে যান / Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
