'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to monitoring without exposing sensitive user state
    console.error('[ErrorBoundary caught error]:', error.message, error.digest);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-lg">
        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          কিছু সমস্যা হয়েছে (Something went wrong)
        </h1>

        <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
          পৃষ্ঠাটি লোড করতে অপ্রত্যাশিত ত্রুটি ঘটেছে। পুনরায় চেষ্টা করুন অথবা হোমপেজে ফিরে যান।
          <br />
          <span className="text-xs text-slate-500 mt-2 block">
            An unexpected error occurred while loading this page.
          </span>
        </p>

        {error.digest && (
          <p className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg mb-6 break-all">
            Reference ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="primary"
            onClick={() => reset()}
            className="flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            আবার চেষ্টা করুন (Try Again)
          </Button>

          <Link href="/" className="inline-flex">
            <Button variant="outline" className="w-full flex items-center justify-center gap-2">
              <Home className="w-4 h-4" />
              হোম (Home)
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
