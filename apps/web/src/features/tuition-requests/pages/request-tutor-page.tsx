'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, ShieldCheck, CheckCircle2, Clock, Lock, ArrowRight, UserPlus } from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import { useAppSelector } from '@/store';
import { withLocale } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { RequestTutorWizard } from '../components/RequestTutorWizard';

export function RequestTutorPage({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  const { isAuthenticated } = useAppSelector((s) => s.auth);

  return (
    <div className="py-8 md:py-12 bg-background min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isBn ? 'স্মার্ট টিউটর ম্যাচিং সার্ভিস' : 'Smart Tutor Matchmaking Service'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
            {isBn ? 'আপনার প্রয়োজন জানান — সেরা শিক্ষক খুঁজে দেবে অগ্রণী' : 'Tell Us What You Need — We Will Find Your Ideal Tutor'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
            {isBn
              ? 'বাংলা মিডিয়াম, ইংলিশ ভার্সন, ইংলিশ মিডিয়াম, ভর্তি প্রস্তুতি বা যেকোনো স্কিল — আপনার বাজেট ও সুবিধাজনক সময়ে এনআইডি ও সনদ যাচাইকৃত শিক্ষক।'
              : 'Post your requirements in simple steps. Our academic coordinators will evaluate and suggest top-matched educators for home or online tutoring.'}
          </p>

          {/* Value Badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-4 text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>{isBn ? '১০০% ভেরিফাইড শিক্ষক' : '100% Verified Tutors'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary" />
              <span>{isBn ? '২৪-৪৮ ঘণ্টায় ম্যাচ' : 'Matched in 24-48 Hours'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-amber-500" />
              <span>{isBn ? 'নিরাপদ এস্ক্রো নিশ্চয়তা' : '100% Escrow Protection'}</span>
            </div>
          </div>
        </div>

        {/* Auth Guard Check: Must be logged in to create tuition request */}
        {!isAuthenticated ? (
          <Card className="max-w-xl mx-auto border-border bg-card shadow-lg p-6 sm:p-8 text-center animate-in zoom-in-95">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
              {isBn ? 'টিউশন রিকোয়েস্ট করতে লগইন আবশ্যক' : 'Sign In Required to Request a Tutor'}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
              {isBn
                ? 'শিক্ষার্থী বা অভিভাবক অ্যাকাউন্টে সাইন ইন করে আপনার চাহিদা অনুযায়ী রিকোয়েস্ট পোস্ট করুন। এতে সরাসরি ড্যাশবোর্ড থেকে প্রস্তাবিত টিউটরের প্রোফাইল ও অগ্রগতি ট্র্যাক করা যাবে।'
                : 'Please sign in to your student or guardian account to post a tuition request. This ensures secure status tracking, tutor suggestions, and escrow protection.'}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href={withLocale('/login?redirect=/request-tutor', locale)} className="w-full sm:w-auto">
                <Button className="w-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2">
                  <span>{isBn ? 'অ্যাকাউন্টে লগইন করুন' : 'Sign In to Continue'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href={withLocale('/register?role=guardian&redirect=/request-tutor', locale)} className="w-full sm:w-auto">
                <Button variant="outline" className="w-full font-semibold text-xs sm:text-sm flex items-center justify-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  <span>{isBn ? 'নতুন অভিভাবক অ্যাকাউন্ট' : 'Register as Guardian'}</span>
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <RequestTutorWizard locale={locale} />
        )}
      </div>
    </div>
  );
}
