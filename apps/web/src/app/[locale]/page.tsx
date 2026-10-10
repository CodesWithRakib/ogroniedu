'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  ShieldCheck,
  Users,
  CalendarCheck,
  CreditCard,
  Send,
  Sparkles,
  BookOpen,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useNotifications } from '@/components/notifications/NotificationProvider';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default function HomePage({ params }: PageProps) {
  const [locale, setLocale] = useState<'bn' | 'en'>('bn');
  const [triggerLoading, setTriggerLoading] = useState<string | null>(null);
  const { isConnected, refreshNotifications } = useNotifications();

  React.useEffect(() => {
    params.then((p) => {
      setLocale(p.locale === 'en' ? 'en' : 'bn');
    });
  }, [params]);

  const isBn = locale === 'bn';

  // Demo user ID
  const demoUserId = '11111111-1111-1111-1111-111111111111';

  // Helper to trigger test notifications directly to API
  const handleTriggerTestNotification = async (
    eventType: string,
    recipientRole: string,
    payload: Record<string, string | number>,
  ) => {
    setTriggerLoading(eventType);
    try {
      const res = await fetch('http://localhost:4000/api/v1/notifications/test-dispatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': demoUserId,
          'x-user-roles': recipientRole,
        },
        body: JSON.stringify({
          userId: demoUserId,
          eventType,
          recipientRole,
          payload,
        }),
      });

      if (res.ok) {
        await refreshNotifications();
      }
    } catch {
      // In standalone client demo without active backend, trigger via local simulated state
    } finally {
      setTriggerLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white shadow-md shadow-emerald-700/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-800 to-teal-600 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
                OgroniEdu
              </span>
              <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold">
                অগ্রণী এডু
              </span>
            </div>
          </div>

          {/* Right Controls: Language Switcher & Notification Bell */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-200/60 dark:bg-slate-800/60 p-1 rounded-xl text-xs font-semibold">
              <Link
                href="/bn"
                onClick={() => setLocale('bn')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  isBn
                    ? 'bg-white dark:bg-slate-700 text-emerald-800 dark:text-emerald-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                বাংলা
              </Link>
              <Link
                href="/en"
                onClick={() => setLocale('en')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  !isBn
                    ? 'bg-white dark:bg-slate-700 text-emerald-800 dark:text-emerald-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                English
              </Link>
            </div>

            {/* Centralized Notification Bell Entry Point */}
            <NotificationBell locale={locale} />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-12">
        <section className="text-center max-w-3xl mx-auto space-y-5 pt-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold border border-emerald-300/40 dark:border-emerald-800/40">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {isBn
                ? 'জাতীয় শিক্ষাক্রম ও বিশ্ববিদ্যালয় ভর্তি প্রস্তুতি'
                : 'National Curriculum & University Admission Prep'}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
            {isBn ? (
              <>
                যোগ্য ও বিশ্বস্ত শিক্ষক খুঁজুন, <br />
                <span className="text-emerald-700 dark:text-emerald-400">
                  নিরাপদ ও সুশৃঙ্খল পাঠদান নিশ্চিত করুন
                </span>
              </>
            ) : (
              <>
                Find Verified Tutors, <br />
                <span className="text-emerald-700 dark:text-emerald-400">
                  Ensure Structured & Safe Learning
                </span>
              </>
            )}
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            {isBn
              ? '১ম থেকে ১২শ শ্রেণি, বাংলা ও ইংলিশ ভার্সন, মাদ্রাসা এবং বুয়েট-মেডিকেল-ঢাবি ভর্তি প্রস্তুতির জন্য বাংলাদেশের শীর্ষ বিশ্ববিদ্যালয়ের শিক্ষকদের সাথে সরাসরি সংযোগ।'
              : 'Direct connection with verified tutors from premier universities for Class 1–12, Bangla & English Medium, Madrasah, and BUET/Medical/DU Admission.'}
          </p>

          <div className="pt-2 flex flex-wrap justify-center gap-4 text-sm font-medium">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{isBn ? 'এনআইডি ও সনদ যাচাইকৃত' : 'NID & Degree Verified'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{isBn ? 'লাইভ উপস্থিতি ও পড়া' : 'Live Attendance & Homework'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>{isBn ? 'সুরক্ষিত এসক্রো পেমেন্ট' : 'Protected Escrow Payouts'}</span>
            </div>
          </div>
        </section>

        {/* Centralized Notification Interactive Test Console */}
        <section className="glass-panel p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {isBn
                    ? 'রিয়েল-টাইম নোটিফিকেশন ইঞ্জিন (লাইভ ট্রায়াল)'
                    : 'Real-Time Notification Engine (Live Trial)'}
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isBn
                  ? 'নিচের বাটনগুলোতে ক্লিক করে যেকোনো ইভেন্ট ট্রিগার করুন। সাথে সাথে নোটিফিকেশন বেল, ব্যাজ ও পপ-আপ টোস্টে আপডেট লক্ষ্য করুন।'
                  : 'Click any button below to trigger real domain events. Watch the live badge, toast alert, and notification drawer update instantly.'}
              </p>
            </div>

            <div className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {isBn ? 'সংযোগ অবস্থা: ' : 'Socket State: '}
              <span
                className={isConnected ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'}
              >
                {isConnected
                  ? isBn
                    ? 'সংযুক্ত (Online)'
                    : 'Connected (Online)'
                  : isBn
                    ? 'বিচ্ছিন্ন (Offline)'
                    : 'Disconnected'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Action 1 */}
            <button
              type="button"
              disabled={triggerLoading !== null}
              onClick={() =>
                handleTriggerTestNotification('booking.accepted', 'guardian', {
                  bookingId: 'BK-9021',
                  tutorName: isBn ? 'তানভির স্যার (বুয়েট)' : 'Tanvir Sir (BUET)',
                  subjectName: isBn ? 'পদার্থবিজ্ঞান (HSC)' : 'Physics (HSC)',
                })
              }
              className="flex flex-col items-start p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-all text-left group cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 mb-3 group-hover:scale-110 transition-transform">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {isBn ? '১. বুকিং গৃহীত হয়েছে' : '1. Booking Accepted'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isBn
                  ? 'শিক্ষক বুকিং গ্রহণ করেছেন (পেমেন্ট ডিউ)'
                  : 'Tutor accepted request (Payment due)'}
              </span>
              <div className="mt-3 flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                <Send className="w-3 h-3" />
                <span>{isBn ? 'ইভেন্ট পাঠান' : 'Dispatch Event'}</span>
              </div>
            </button>

            {/* Action 2 */}
            <button
              type="button"
              disabled={triggerLoading !== null}
              onClick={() =>
                handleTriggerTestNotification('attendance.marked', 'guardian', {
                  sessionId: 'SES-401',
                  studentName: isBn ? 'আবরার' : 'Abrar',
                  subjectName: isBn ? 'উচ্চতর গণিত' : 'Higher Math',
                  status: isBn ? 'উপস্থিত' : 'Present',
                })
              }
              className="flex flex-col items-start p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-500 hover:bg-teal-50/40 dark:hover:bg-teal-950/20 transition-all text-left group cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 mb-3 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {isBn ? '২. ক্লাসের উপস্থিতি' : '2. Mark Attendance'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isBn ? 'শিক্ষার্থী আবরার উপস্থিত হয়েছে' : 'Student Abrar marked present'}
              </span>
              <div className="mt-3 flex items-center gap-1 text-xs text-teal-700 dark:text-teal-400 font-medium">
                <Send className="w-3 h-3" />
                <span>{isBn ? 'ইভেন্ট পাঠান' : 'Dispatch Event'}</span>
              </div>
            </button>

            {/* Action 3 */}
            <button
              type="button"
              disabled={triggerLoading !== null}
              onClick={() =>
                handleTriggerTestNotification('payment.succeeded', 'guardian', {
                  bookingId: 'BK-9021',
                  paymentId: 'TXN-88412',
                  amount: '2,500',
                })
              }
              className="flex flex-col items-start p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition-all text-left group cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 mb-3 group-hover:scale-110 transition-transform">
                <CreditCard className="w-5 h-5" />
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {isBn ? '৩. পেমেন্ট রসিদ' : '3. Payment Receipt'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isBn ? 'বিকাশে ৳ ২,৫০০ ফি পরিশোধ হয়েছে' : 'BDT 2,500 processed via bKash'}
              </span>
              <div className="mt-3 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 font-medium">
                <Send className="w-3 h-3" />
                <span>{isBn ? 'ইভেন্ট পাঠান' : 'Dispatch Event'}</span>
              </div>
            </button>

            {/* Action 4 */}
            <button
              type="button"
              disabled={triggerLoading !== null}
              onClick={() =>
                handleTriggerTestNotification('progress.published', 'guardian', {
                  reportId: 'REP-102',
                  studentName: isBn ? 'আবরার' : 'Abrar',
                  period: isBn ? 'অক্টোবর ১ম পক্ষ' : 'October Fortnight',
                })
              }
              className="flex flex-col items-start p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-all text-left group cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 mb-3 group-hover:scale-110 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {isBn ? '৪. অগ্রগতি রিপোর্ট' : '4. Progress Report'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isBn
                  ? 'শিক্ষকের মূল্যায়ন রিপোর্ট প্রস্তুত'
                  : 'Tutor published learning evaluation'}
              </span>
              <div className="mt-3 flex items-center gap-1 text-xs text-indigo-700 dark:text-indigo-400 font-medium">
                <Send className="w-3 h-3" />
                <span>{isBn ? 'ইভেন্ট পাঠান' : 'Dispatch Event'}</span>
              </div>
            </button>
          </div>
        </section>

        {/* 4 Core Pillars Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              {isBn ? 'কঠোর শিক্ষক যাচাইকরণ' : 'Rigorous Tutor Verification'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {isBn
                ? 'জাতীয় পরিচয়পত্র, বিশ্ববিদ্যালয়ের সনদপত্র এবং ব্যাকগ্রাউন্ড ভেরিফিকেশনের পর শিক্ষক প্রোফাইল লাইভ করা হয়।'
                : 'National ID, university credentials, and background checks are strictly verified before profile approval.'}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950/80 flex items-center justify-center text-teal-700 dark:text-teal-400">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              {isBn ? 'অভিভাবক সুপারভিশন' : 'Guardian Supervision'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {isBn
                ? 'সন্তানের ক্লাস শিডিউল, বার্তা আদান-প্রদান এবং উপস্থিতির লাইভ নোটিফিকেশন সার্বক্ষণিক নজরদারিতে।'
                : 'Full visibility over minor children’s lessons, chat records, homework, and attendance logs.'}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/80 flex items-center justify-center text-amber-700 dark:text-amber-400">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              {isBn ? 'কনফ্লিক্ট-মুক্ত শিডিউলিং' : 'Conflict-Free Scheduling'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {isBn
                ? 'পোস্টগ্রেস GiST এক্সক্লুশন লকিং মেকানিজমে একই সময়ে একাধিক টিউশন কনফার্মেশনের কোনো ঝুঁকি নেই।'
                : 'PostgreSQL GiST exclusion locks mathematically eliminate double-booking overlaps.'}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 flex items-center justify-center text-indigo-700 dark:text-indigo-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              {isBn ? 'এসক্রো পেমেন্ট ও রিপ্লেসমেন্ট' : 'Escrow & Replacement'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {isBn
                ? 'ক্লাস সম্পন্ন না হওয়া পর্যন্ত ফি প্ল্যাটফর্ম এসক্রোতে সংরক্ষিত। শিক্ষক অনুপস্থিত হলে ১০০% রিফান্ড ও রিপ্লেসমেন্ট।'
                : 'Lesson funds held in escrow until completed. 100% refund guarantee and tutor replacement if needed.'}
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500">
        <p>
          © 2026 OgroniEdu Platform. {isBn ? 'সর্বস্বত্ব সংরক্ষিত।' : 'All rights reserved.'} —
          Bangladesh
        </p>
      </footer>
    </div>
  );
}
