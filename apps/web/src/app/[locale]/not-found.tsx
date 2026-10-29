import React from 'react';
import Link from 'next/link';
import { FileQuestion, Home, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center p-6 bg-background text-foreground">
      <div className="max-w-lg w-full bg-card border border-border rounded-xl p-8 text-center shadow-xs">
        <div className="w-16 h-16 bg-primary/10 text-primary border border-primary/20 rounded-xl flex items-center justify-center mx-auto mb-5">
          <FileQuestion className="w-8 h-8" />
        </div>

        <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full inline-block mb-3">
          404 Error
        </span>

        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 tracking-tight">পৃষ্ঠাটি খুঁজে পাওয়া যায়নি</h1>
        <h2 className="text-sm font-medium text-muted-foreground mb-4">Page Not Found</h2>

        <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed mb-8">
          আপনি যে ঠিকানাটি খুঁজছেন তা মুছে ফেলা হতে পারে, নাম পরিবর্তন করা হতে পারে, অথবা সাময়িকভাবে অনুপলব্ধ থাকতে পারে।
          <br />
          <span className="text-xs text-muted-foreground/80 mt-2 block">
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </span>
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-sm mx-auto">
          <Link href="/tutors" className="w-full">
            <Button variant="primary" className="w-full rounded-xl font-semibold flex items-center justify-center gap-2">
              <Search className="w-4 h-4" />
              <span>শিক্ষক খুঁজুন</span>
            </Button>
          </Link>

          <Link href="/" className="w-full">
            <Button variant="outline" className="w-full rounded-xl font-semibold flex items-center justify-center gap-2">
              <Home className="w-4 h-4" />
              <span>হোমপেজ</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
