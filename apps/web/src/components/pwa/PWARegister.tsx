'use client';

import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone, Sparkles } from 'lucide-react';
import { type Locale } from '@/lib/i18n';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWARegister({ locale }: { locale: Locale }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const isBn = locale === 'bn';

  useEffect(() => {
    // Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // Check for updates periodically
          reg.addEventListener('updatefound', () => {
            const installing = reg.installing;
            if (installing) {
              installing.addEventListener('statechange', () => {
                if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                  // A new version is available
                  console.log('OgroniEdu PWA updated.');
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn('OgroniEdu Service Worker registration failed:', err);
        });
    }

    // Capture install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Check if user previously dismissed
      const dismissedUntil = localStorage.getItem('ogroni_pwa_dismissed');
      if (!dismissedUntil || Date.now() > Number(dismissedUntil)) {
        // Show install invitation after 12 seconds so it doesn't block hero interactions
        const timer = setTimeout(() => {
          setShowBanner(true);
        }, 12000);
        return () => clearTimeout(timer);
      }
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowBanner(false);
      localStorage.removeItem('ogroni_pwa_dismissed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setShowBanner(false);
    // Dismiss for 24 hours
    localStorage.setItem('ogroni_pwa_dismissed', String(Date.now() + 24 * 60 * 60 * 1000));
  }

  if (!showBanner || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 left-3 right-3 md:left-auto md:right-6 md:max-w-md z-40 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="relative rounded-2xl bg-card/95 border border-border p-3 sm:p-4 shadow-popover backdrop-blur-xl flex items-center justify-between gap-3 text-foreground">
        {/* App Icon */}
        <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xs">
          <Smartphone className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.2]" />
        </div>

        {/* Text Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm text-foreground truncate">
              {isBn ? 'অগ্রণী এডু অ্যাপ' : 'OgroniEdu App'}
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.2 text-[9px] font-bold text-blue-700 border border-blue-200/60">
              <Sparkles className="h-2.5 w-2.5" /> PWA
            </span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {isBn ? 'মোবাইলে সহজে ব্যবহার ও অফলাইন সুবিধা' : 'Fast mobile access & offline support'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 shadow-xs transition-transform active:scale-95 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>{isBn ? 'ইনস্টল' : 'Install'}</span>
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
