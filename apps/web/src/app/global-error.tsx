'use client';

import React, { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('[GlobalError]:', error);
  }, [error]);

  return (
    <html lang="bn">
      <body className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 font-sans antialiased">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center shadow-xs">
          <div className="w-14 h-14 bg-destructive/15 text-destructive border border-destructive/25 rounded-xl flex items-center justify-center mx-auto mb-5 text-xl font-bold">
            !
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2 tracking-tight">গুরুতর ত্রুটি ঘটেছে</h1>
          <h2 className="text-xs sm:text-sm font-medium text-muted-foreground mb-4">Critical System Error</h2>

          <p className="text-muted-foreground text-xs sm:text-sm mb-6 leading-relaxed">
            অ্যাপ্লিকেশনটি লোড করার সময় মারাত্মক সমস্যা হয়েছে। পুনরায় লোড করার চেষ্টা করুন।
          </p>

          {error.digest && (
            <p className="text-xs font-mono text-muted-foreground bg-muted/40 border border-border p-2 rounded-xl mb-6 break-all">
              ID: {error.digest}
            </p>
          )}

          <button
            type="button"
            onClick={() => reset()}
            className="w-full px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
          >
            পুনরায় চেষ্টা করুন (Reload)
          </button>
        </div>
      </body>
    </html>
  );
}
