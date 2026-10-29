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
    console.error('[ErrorBoundary caught error]:', error.message, error.digest);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 bg-background text-foreground">
      <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center shadow-xs">
        <div className="w-14 h-14 bg-warning/15 text-warning rounded-xl border border-warning/25 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2 tracking-tight">
          কিছু সমস্যা হয়েছে
        </h1>

        <p className="text-muted-foreground text-xs sm:text-sm mb-6 leading-relaxed">
          পৃষ্ঠাটি লোড করতে অপ্রত্যাশিত ত্রুটি ঘটেছে। পুনরায় চেষ্টা করুন অথবা হোমপেজে ফিরে যান।
          <br />
          <span className="text-xs text-muted-foreground/80 mt-1.5 block">
            An unexpected error occurred while loading this page.
          </span>
        </p>

        {error.digest && (
          <p className="text-xs font-mono text-muted-foreground bg-muted/40 border border-border px-3 py-1.5 rounded-xl mb-6 break-all">
            Reference ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="primary"
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 rounded-xl font-semibold"
          >
            <RotateCcw className="w-4 h-4" />
            <span>আবার চেষ্টা করুন</span>
          </Button>

          <Link href="/" className="inline-flex">
            <Button variant="outline" className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold">
              <Home className="w-4 h-4" />
              <span>হোমপেজ</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
