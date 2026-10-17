'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  GraduationCap,
  ShieldCheck,
  Users,
  CalendarDays,
  BookOpen,
  ArrowRight,
  Search,
  Award,
  TrendingUp,
  Heart,
  Sparkles,
} from 'lucide-react';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { Button } from '@/components/ui/Button';
import { usePlatformStats } from '../hooks/use-platform-stats';
import { HeroSearchBar } from '../components/HeroSearchBar';
import { BetterLearningDoodle, YourSuccessDoodle } from '../components/HeroDoodles';
import { StudentAvatar } from '../components/StudentAvatar';
import { HeroStudentTablet } from '../components/HeroStudentTablet';
import { QualifiedTutorsBadge, SafeSecureBadge } from '../components/HeroFloatingBadges';

export function HomePage({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  const { stats } = usePlatformStats();

  return (
    <div className="relative overflow-hidden bg-background text-foreground">
      {/* Schema.org EducationalOrganization & WebSite Microdata */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'WebSite',
                name: 'OgroniEdu',
                url: 'https://ogroni.edu.bd',
                potentialAction: {
                  '@type': 'SearchAction',
                  target: 'https://ogroni.edu.bd/bn/tutors?q={search_term_string}',
                  'query-input': 'required name=search_term_string',
                },
              },
              {
                '@type': 'EducationalOrganization',
                name: 'OgroniEdu',
                url: 'https://ogroni.edu.bd',
                logo: 'https://ogroni.edu.bd/logo.png',
                description: 'Trusted Tutoring Platform',
                address: {
                  '@type': 'PostalAddress',
                  addressLocality: 'Dhaka',
                  addressCountry: 'BD',
                },
              },
            ],
          }),
        }}
      />

      {/* Ambient Gradient Lights matching the design's dark emerald glow */}
      <div className="absolute top-0 right-1/4 w-[700px] h-[450px] bg-brand-soft rounded-full blur-[160px] pointer-events-none -z-10" />
      <div className="absolute top-36 left-10 w-[500px] h-[350px] bg-primary/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-[600px] left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-primary/10 rounded-full blur-[160px] pointer-events-none -z-10" />

      {/* ====================================================================
       * HERO SECTION: Pixel-Perfect to the Reference Design
       * ==================================================================== */}
      <section className="relative pt-4 pb-6 lg:pt-6 lg:pb-10 overflow-visible">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center">
            {/* Left Column: Trust Badge, Bold Headlines, Subtitle & Search */}
            <div className="lg:col-span-6 space-y-4 sm:space-y-5 text-left z-10">
              {/* Trust Pill Badge */}
              <div className="inline-flex flex-nowrap items-center gap-2.5 rounded-full border border-border/80 bg-card py-1.5 px-3.5 shadow-xs whitespace-nowrap">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>
                    {isBn
                      ? '১০,০০০+ অভিভাবক ও শিক্ষার্থীর আস্থা'
                      : 'Trusted by 10,000+ Parents & Students'}
                  </span>
                </div>

                {/* Overlapping Student Avatars */}
                <div className="flex items-center -space-x-1.5 pl-0.5">
                  <StudentAvatar index={1} size="sm" />
                  <StudentAvatar index={2} size="sm" />
                  <StudentAvatar index={3} size="sm" />
                </div>

                {/* Star Ratings */}
                <div className="flex items-center gap-1 pl-0.5 text-[11px] font-bold text-amber-500">
                  <span className="tracking-tighter">★★★★★</span>
                  <span className="text-foreground font-semibold ml-0.5">4.8/5</span>
                  <span className="text-muted-foreground font-normal text-[10px]">(2.5k+ reviews)</span>
                </div>
              </div>

              {/* Main Headline: Exactly 2 Lines on Desktop */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[42px] xl:text-[50px] font-black tracking-tight text-foreground leading-[1.12]">
                {isBn ? 'সঠিক শিক্ষক খুঁজুন।' : 'Find the Right Tutor.'}
                <br />
                {isBn ? (
                  <span className="text-primary">সুপ্ত মেধার বিকাশ ঘটান।</span>
                ) : (
                  <>
                    Unlock <span className="text-primary">Their Potential.</span>
                  </>
                )}
              </h1>

              {/* Subtitle Description */}
              <p className="text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed">
                {isBn
                  ? 'বাংলা ও ইংরেজি মাধ্যম, মাদ্রাসা এবং বিশ্ববিদ্যালয় ভর্তি পরীক্ষার জন্য অভিজ্ঞ ও ভেরিফাইড শিক্ষকদের সাথে সরাসরি যুক্ত হোন এক প্ল্যাটফর্মে।'
                  : 'Get connected with verified tutors for Bangla & English curriculum, Madrasah, and university admission prep — all in one place.'}
              </p>

              {/* Integrated Multi-Filter Search Bar & Popular Tags */}
              <div className="pt-1">
                <HeroSearchBar locale={locale} />
              </div>
            </div>

            {/* Right Column: Hero Visual Artwork Focused on Student Empowerment */}
            <div className="lg:col-span-6 relative mt-6 lg:mt-0 flex flex-col items-center lg:items-end">
              {/* Custom Interactive Visual Stage */}
              <div className="relative w-full max-w-[640px] select-none">
                {/* 1. Base Layer: Real Student Photo Sitting at Desk (Rock-Solid Intrinsic Dimensions) */}
                <div className="relative w-full rounded-3xl overflow-hidden shadow-card ring-1 ring-border">
                  <Image
                    src="/images/hero-student-pure.png"
                    alt="Student learning at desk with verified tutor"
                    width={1264}
                    height={848}
                    priority
                    sizes="(max-width: 768px) 100vw, 640px"
                    className="w-full h-auto object-cover block"
                  />
                  {/* Subtle edge blend overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/50 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* 2. Custom Floating Doodle: "Better Learning, Brighter Future ♡" with arrow */}
                <div className="absolute -top-7 left-6 sm:left-14 z-30 pointer-events-none">
                  <BetterLearningDoodle />
                </div>

                {/* 3. Custom Floating Trust Badges (Top Right & Mid Right) */}
                <div className="absolute top-[10px] right-2 sm:top-[14px] sm:right-3 z-30 transition-all duration-300 hover:-translate-y-1">
                  <QualifiedTutorsBadge locale={locale} />
                </div>

                <div className="absolute top-[60px] right-2 sm:top-[68px] sm:right-3 z-30 transition-all duration-300 hover:-translate-y-1">
                  <SafeSecureBadge locale={locale} />
                </div>

                {/* 4. Live Interactive Student Dashboard iPad Tablet */}
                <div className="absolute -bottom-6 -right-1 sm:-bottom-8 sm:-right-2 w-[380px] sm:w-[410px] scale-[0.82] sm:scale-[0.86] origin-bottom-right z-25 transition-all duration-500 drop-shadow-card hover:scale-[0.89]">
                  <HeroStudentTablet />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
       * STATS & SOCIAL PROOF STRIP (Directly Below Hero)
       * ==================================================================== */}
      <section
        className="relative py-6 sm:py-7 border-y border-border/60 bg-muted/20"
        data-testid="platform-metrics-band"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8">
            {/* 4 Large Platform Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-10 w-full lg:w-auto">
              {/* Stat 1: Happy Students */}
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                    {stats?.activeStudents
                      ? `${formatLocalizedNumber(stats.activeStudents, locale)}+`
                      : '10,000+'}
                  </div>
                  <div className="text-xs text-muted-foreground font-medium">
                    {isBn ? 'সন্তুষ্ট শিক্ষার্থী' : 'Happy Students'}
                  </div>
                </div>
              </div>

              {/* Stat 2: Verified Tutors */}
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                    {stats?.verifiedTutors
                      ? `${formatLocalizedNumber(stats.verifiedTutors, locale)}+`
                      : '2,500+'}
                  </div>
                  <div className="text-xs text-muted-foreground font-medium">
                    {isBn ? 'যাচাইকৃত শিক্ষক' : 'Verified Tutors'}
                  </div>
                </div>
              </div>

              {/* Stat 3: Satisfaction Rate */}
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <Heart className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                    95%
                  </div>
                  <div className="text-xs text-muted-foreground font-medium">
                    {isBn ? 'সন্তুষ্টির হার' : 'Satisfaction Rate'}
                  </div>
                </div>
              </div>

              {/* Stat 4: 24/7 Support */}
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                    24/7
                  </div>
                  <div className="text-xs text-muted-foreground font-medium">
                    {isBn ? 'সহায়তা ও সাপোর্ট' : 'Support'}
                  </div>
                </div>
              </div>
            </div>

            {/* Handwritten Doodle + Avatar Stack */}
            <div className="flex flex-col sm:flex-row items-center gap-4 lg:gap-6 shrink-0">
              <YourSuccessDoodle />

              <div className="flex items-center gap-3">
                <div className="flex items-center -space-x-2">
                  <StudentAvatar index={1} size="md" />
                  <StudentAvatar index={2} size="md" />
                  <StudentAvatar index={3} size="md" />
                  <StudentAvatar index={4} size="md" className="ring-2 ring-brand" />
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary text-[10px] font-bold border border-border/80">
                    +10k
                  </div>
                </div>
                <div className="text-left text-xs text-muted-foreground font-medium max-w-[160px] leading-snug">
                  {isBn
                    ? 'হাজারো সন্তুষ্ট শিক্ষার্থী ও অভিভাবকের সাথে যুক্ত হোন'
                    : 'Join thousands of happy students and parents'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
       * "WHY CHOOSE OGRONIEDU" FEATURES SECTION
       * ==================================================================== */}
      <section className="py-16 sm:py-24 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-left mb-12 space-y-2.5">
            <span className="text-xs font-bold tracking-widest text-primary uppercase">
              {isBn ? 'কেন অগ্রণী এডু বেছে নেবেন' : 'WHY CHOOSE OGRONIEDU'}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-sans">
              {isBn
                ? 'উন্নত শিক্ষার জন্য আপনার যা প্রয়োজন'
                : 'Everything You Need for Better Learning'}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1: Verified & Experienced Tutors */}
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs hover:border-primary/40 hover:shadow-card transition-all duration-300 space-y-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                {isBn ? 'যাচাইকৃত ও অভিজ্ঞ শিক্ষক' : 'Verified & Experienced Tutors'}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isBn
                  ? 'প্রতিটি শিক্ষকের একাডেমিক ব্যাকগ্রাউন্ড ও এনআইডি পুঙ্খানুপুঙ্খভাবে যাচাইকৃত।'
                  : 'All tutors are carefully verified and background checked.'}
              </p>
            </div>

            {/* Feature 2: Flexible Learning Options */}
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs hover:border-primary/40 hover:shadow-card transition-all duration-300 space-y-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <CalendarDays className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                {isBn ? 'সহজ ও সুবিধাজনক ক্লাস' : 'Flexible Learning Options'}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isBn
                  ? 'আপনার সুবিধামতো অনলাইন অথবা সরাসরি ইন-পার্সন ক্লাসের সুযোগ।'
                  : 'Online & in-person classes at your convenience.'}
              </p>
            </div>

            {/* Feature 3: Wide Subject Coverage */}
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs hover:border-primary/40 hover:shadow-card transition-all duration-300 space-y-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                {isBn ? 'সকল বিষয়ের সমাহার' : 'Wide Subject Coverage'}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isBn
                  ? 'প্রাথমিক শ্রেণি থেকে বিশ্ববিদ্যালয় ভর্তি প্রস্তুতি পর্যন্ত সকল বিষয়ের শিক্ষক।'
                  : 'From school to university admission prep.'}
              </p>
            </div>

            {/* Feature 4: Track Progress */}
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs hover:border-primary/40 hover:shadow-card transition-all duration-300 space-y-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                {isBn ? 'অগ্রগতি পর্যবেক্ষণ' : 'Track Progress'}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isBn
                  ? 'বিস্তারিত রিপোর্ট এবং অ্যানালিটিক্সের মাধ্যমে শিক্ষার্থীর পড়াশোনার অগ্রগতি দেখুন।'
                  : 'Monitor your learning journey with detailed reports.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
       * 3-STEP JOURNEY SECTION
       * ==================================================================== */}
      <section className="py-16 sm:py-20 border-t border-border/60 bg-muted/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              {isBn ? 'সহজ ৩টি ধাপ' : 'Simple 3-Step Journey'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {isBn ? 'যেভাবে সেরা শিক্ষক পাবেন' : 'How You Connect With Top Educators'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="rounded-2xl border border-border/80 bg-card p-7 shadow-xs space-y-3.5 hover:border-primary/40 hover:shadow-card transition-all">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-muted-foreground/30 font-mono">01</span>
                <div className="h-9 w-9 rounded-xl bg-primary-soft flex items-center justify-center text-primary font-bold">
                  <Search className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-foreground">
                {isBn ? 'বিষয় ও এলাকা অনুযায়ী খুঁজুন' : 'Filter by Subject & Location'}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isBn
                  ? 'বুয়েট, ঢাবি বা মেডিকেল শিক্ষার্থীদের প্রোফাইল, রেটিং ও পারিশ্রমিক দেখে বাছাই করুন।'
                  : 'Browse verified profiles with university credentials, parent reviews, hourly rates, and subject experience.'}
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl border border-border/80 bg-card p-7 shadow-xs space-y-3.5 hover:border-primary/40 hover:shadow-card transition-all">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-muted-foreground/30 font-mono">02</span>
                <div className="h-9 w-9 rounded-xl bg-primary-soft flex items-center justify-center text-primary font-bold">
                  <CalendarDays className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-foreground">
                {isBn ? 'ফ্রি ট্রায়াল ও শিডিউল নিশ্চিত করুন' : 'Book Trial & Lock Schedule'}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isBn
                  ? 'প্রথম ট্রায়াল ক্লাসে শিক্ষকের সাথে পরিচিত হোন এবং উভয়ের সুবিধাজনক সময় বুক করুন।'
                  : 'Take a direct introductory session, assess compatibility, and lock non-conflicting time slots.'}
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-2xl border border-border/80 bg-card p-7 shadow-xs space-y-3.5 hover:border-primary/40 hover:shadow-card transition-all">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-muted-foreground/30 font-mono">03</span>
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-foreground">
                {isBn ? 'এসক্রো সুরক্ষা ও নিয়মিত ক্লাস' : 'Learn with Escrow Protection'}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isBn
                  ? 'টাকা থাকবে বাংলাদেশ ব্যাংক নিয়ন্ত্রিত এসক্রোতে। প্রতি মাসের ক্লাস সন্তোষজনকভাবে শেষ হলে শিক্ষক টাকা পাবেন।'
                  : 'Funds remain held securely in escrow until parent and student sign off on delivered classes.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
       * CTA BANNER
       * ==================================================================== */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-8 sm:p-12 shadow-card">
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-soft rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="space-y-3.5 max-w-xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3.5 py-1 text-xs font-semibold text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{isBn ? 'অগ্রণী এডু প্ল্যাটফর্ম' : 'OgroniEdu Platform'}</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground">
                  {isBn
                    ? 'আজই আপনার সন্তানের জন্য সেরা গৃহশিক্ষক নিশ্চিত করুন'
                    : 'Find the ideal verified tutor for your child today'}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {isBn
                    ? 'বিনামূল্যে অ্যাকাউন্ট তৈরি করুন এবং ঢাকা ও সারা বাংলাদেশের শীর্ষ বিশ্ববিদ্যালয়ের মেধাবী শিক্ষকদের সাথে কথা বলুন।'
                    : 'Create a free account and directly connect with brilliant university tutors across Dhaka and Bangladesh.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="rounded-full shadow-xs">
                  <Link href={`/${locale}/register`} className="flex items-center gap-2">
                    <span>{isBn ? 'নিবন্ধন করুন' : 'Get Started'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full">
                  <Link href={`/${locale}/tutors`} className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-primary" />
                    <span>{isBn ? 'সকল শিক্ষক দেখুন' : 'Browse All Tutors'}</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
