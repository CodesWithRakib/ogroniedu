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
      <body className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xl">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
            !
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">গুরুতর ত্রুটি ঘটেছে</h1>
          <h2 className="text-sm font-semibold text-slate-500 mb-4">Critical System Error</h2>

          <p className="text-slate-600 text-sm mb-6">
            অ্যাপ্লিকেশনটি লোড করার সময় মারাত্মক সমস্যা হয়েছে। পুনরায় লোড করার চেষ্টা করুন।
          </p>

          {error.digest && (
            <p className="text-xs font-mono text-slate-400 bg-slate-100 p-2 rounded mb-6 break-all">
              ID: {error.digest}
            </p>
          )}

          <button
            type="button"
            onClick={() => reset()}
            className="w-full px-5 py-3 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-700 transition"
          >
            পুনরায় চেষ্টা করুন (Reload)
          </button>
        </div>
      </body>
    </html>
  );
}
