import type { ReactNode } from 'react';
import {
  Plus_Jakarta_Sans,
  Inter,
  Noto_Sans_Bengali,
  Hind_Siliguri,
  Instrument_Serif,
  Caveat,
} from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { StoreProvider } from '../../store';
import { AuthBootstrap } from '@/components/auth/AuthBootstrap';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';
import { NotificationToastContainer } from '@/components/notifications/NotificationToast';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { AppThemeProvider } from '@/lib/theme/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';
import bnMessages from '../../../messages/bn.json';
import enMessages from '../../../messages/en.json';

/**
 * Premium Typography Stack (with display: 'swap' on all fonts):
 * - Plus Jakarta Sans: modern high-clarity UI headline & lead font
 * - Inter: crisp body copy & tabular numeric readability
 * - Noto Sans Bengali & Hind Siliguri: authentic Bengali script shaping
 * - Instrument Serif: editorial luxury italic accent for headline emphasis
 * - Caveat: playful hand-drawn annotations and doodles
 */
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const notoSansBengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-bengali',
  display: 'swap',
});

const hindSiliguri = Hind_Siliguri({
  weight: ['400', '500', '600', '700'],
  subsets: ['bengali', 'latin'],
  variable: '--font-hind-siliguri',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

const caveat = Caveat({
  weight: ['600', '700'],
  subsets: ['latin'],
  variable: '--font-caveat',
  display: 'swap',
});

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const resolved = await params;
  const locale = resolved.locale === 'en' ? 'en' : 'bn';
  const messages = locale === 'en' ? enMessages : bnMessages;
  const fontVariables = `${plusJakartaSans.variable} ${inter.variable} ${notoSansBengali.variable} ${hindSiliguri.variable} ${instrumentSerif.variable} ${caveat.variable}`;

  return (
    <div className={fontVariables}>
      <StoreProvider>
        <AuthBootstrap>
          <AppThemeProvider>
            <NextIntlClientProvider locale={locale} messages={messages}>
              <NotificationProvider locale={locale}>
                {children}
                <NotificationToastContainer locale={locale} />
                <NotificationCenter locale={locale} />
                <Toaster />
              </NotificationProvider>
            </NextIntlClientProvider>
          </AppThemeProvider>
        </AuthBootstrap>
      </StoreProvider>
    </div>
  );
}
