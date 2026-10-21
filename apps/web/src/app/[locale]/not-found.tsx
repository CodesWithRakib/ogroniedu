import React from 'react';
import Link from 'next/link';
import { FileQuestion, Home, Search, Compass } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center p-6 bg-slate-50/50">
      <div className="max-w-lg w-full bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-xl">
        <div className="w-20 h-20 bg-blue-50 text-blue-600 border border-blue-200/80 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <FileQuestion className="w-10 h-10" />
        </div>

        <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200/80 px-3 py-1 rounded-full inline-block mb-3">
          404 Error
        </span>

        <h1 className="text-3xl font-black text-slate-900 mb-3">
          পৃষ্ঠাটি খুঁজে পাওয়া যায়নি
        </h1>
        <h2 className="text-base font-semibold text-slate-500 mb-6">
          Page Not Found
        </h2>

        <p className="text-slate-600 text-sm leading-relaxed mb-8">
          আপনি যে ঠিকানাটি খুঁজছেন তা মুছে ফেলা হতে পারে, নাম পরিবর্তন করা হতে পারে, অথবা সাময়িকভাবে অনুপলব্ধ থাকতে পারে।
          <br />
          <span className="text-xs text-slate-500 mt-2 block">
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </span>
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-sm mx-auto">
          <Link href="/tutors" className="w-full">
            <Button variant="primary" className="w-full flex items-center justify-center gap-2">
              <Search className="w-4 h-4" />
              শিক্ষক খুঁজুন (Find Tutors)
            </Button>
          </Link>

          <Link href="/" className="w-full">
            <Button variant="outline" className="w-full flex items-center justify-center gap-2">
              <Home className="w-4 h-4" />
              হোমপেজ (Home)
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
