import React from 'react';
import Link from 'next/link';

export default function RootNotFound() {
  return (
    <html lang="bn">
      <body className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 font-sans antialiased">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center shadow-xs">
          <div className="w-14 h-14 bg-primary/10 text-primary border border-primary/20 rounded-xl flex items-center justify-center mx-auto mb-4 font-bold text-lg">
            404
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2 tracking-tight">
            পৃষ্ঠাটি খুঁজে পাওয়া যায়নি
          </h1>
          <h2 className="text-sm font-medium text-muted-foreground mb-4">Page Not Found</h2>
          <p className="text-muted-foreground text-xs sm:text-sm mb-6 leading-relaxed">
            অনুগ্রহ করে মূল পাতায় ফিরে যান।
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/bn"
              className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold text-xs sm:text-sm transition-colors text-center"
            >
              বাংলা সংস্করণ
            </Link>
            <Link
              href="/en"
              className="px-4 py-2.5 bg-card hover:bg-muted text-foreground border border-border rounded-xl font-semibold text-xs sm:text-sm transition-colors text-center"
            >
              English Version
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
