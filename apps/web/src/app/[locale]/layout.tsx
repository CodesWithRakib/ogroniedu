import type { ReactNode } from 'react';
import { Inter, Hind_Siliguri } from 'next/font/google';
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
 * Centralized typography: Inter (Latin) + Hind Siliguri (Bangla).
 * CSS vars --font-inter / --font-hind-siliguri feed globals.css --font-sans/--font-bengali.
 */
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const hindSiliguri = Hind_Siliguri({
  weight: ['400', '500', '600', '700'],
  subsets: ['bengali', 'latin'],
  variable: '--font-hind-siliguri',
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

  return (
    <div className={`${inter.variable} ${hindSiliguri.variable}`}>
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
