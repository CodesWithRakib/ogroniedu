import React from 'react';
import Link from 'next/link';

export default function RootNotFound() {
  return (
    <html lang="bn">
      <body className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-lg">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">404</h1>
          <h2 className="text-xl font-semibold text-slate-800 mb-4">পৃষ্ঠাটি খুঁজে পাওয়া যায়নি (Page Not Found)</h2>
          <p className="text-slate-600 text-sm mb-6">
            অনুগ্রহ করে মূল পাতায় ফিরে যান।
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/bn"
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-medium text-sm hover:bg-emerald-700 transition"
            >
              বাংলা সংস্করণ
            </Link>
            <Link
              href="/en"
              className="px-5 py-2.5 bg-slate-100 text-slate-800 rounded-lg font-medium text-sm hover:bg-slate-200 transition"
            >
              English Version
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
