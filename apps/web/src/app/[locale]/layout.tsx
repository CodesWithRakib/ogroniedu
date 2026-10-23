import type { ReactNode } from 'react';
import Script from 'next/script';
import { NextIntlClientProvider } from 'next-intl';
import { StoreProvider } from '../../store';
import { AuthBootstrap } from '@/components/auth/AuthBootstrap';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';
import { NotificationToastContainer } from '@/components/notifications/NotificationToast';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { Toaster } from '@/components/ui/sonner';
import { BottomNavbar } from '@/components/shell/BottomNavbar';
import { PWARegister } from '@/components/pwa/PWARegister';
import { BetaFeedbackModal } from '@/components/feedback/BetaFeedbackModal';
import { fontVariables } from '@/lib/fonts';
import bnMessages from '../../../messages/bn.json';
import enMessages from '../../../messages/en.json';

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const resolved = await params;
  const locale = resolved.locale === 'en' ? 'en' : 'bn';
  const messages = locale === 'en' ? enMessages : bnMessages;

  return (
    <>
      {/* Immediately sync document lang on client parse */}
      <Script
        id="sync-lang"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.lang = ${JSON.stringify(locale)};`,
        }}
      />
      <div
        className={`${fontVariables} ${locale === 'bn' ? 'font-bengali' : 'font-sans'} min-h-screen text-foreground antialiased`}
      >
        <StoreProvider>
          <AuthBootstrap>
            <NextIntlClientProvider locale={locale} messages={messages}>
              <NotificationProvider locale={locale}>
                {children}
                <NotificationToastContainer locale={locale} />
                <NotificationCenter locale={locale} />
                <Toaster />
                <BottomNavbar locale={locale} />
                <PWARegister locale={locale} />
                {/* <BetaFeedbackModal locale={locale} /> */}
              </NotificationProvider>
            </NextIntlClientProvider>
          </AuthBootstrap>
        </StoreProvider>
      </div>
    </>
  );
}
