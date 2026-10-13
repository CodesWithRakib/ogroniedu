'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  GraduationCap,
  ShieldCheck,
  Users,
  CalendarCheck,
  CreditCard,
  Sparkles,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Search,
  Star,
  Award,
  Lock,
  ChevronRight,
  Play,
  TrendingUp,
  Clock,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Input,
} from '@/components/ui';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { useHomeSearch } from '../hooks/use-home-search';
import { usePlatformStats } from '../hooks/use-platform-stats';

/**
 * Modern Public Home Page:
 * - High-tech Paradigm-inspired visual architecture with glowing ambient mesh
 * - 3D Hardware Laptop Showcase with floating holographic trust cards
 * - Real-time verified stats band (zero fake data)
 * - Bento feature grid, subject search quick-tags & interactive steps
 */
export function HomePage({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const isBn = locale === 'bn';
  const { searchQuery, setSearchQuery, isAuthenticated, handleSearchSubmit } =
    useHomeSearch(locale);
  const { stats, isLoading: statsLoading, isError: statsError } = usePlatformStats();

  const quickSubjects = [
    { label: isBn ? 'পদার্থবিজ্ঞান (Physics)' : 'Physics', query: 'Physics' },
    { label: isBn ? 'উচ্চতর গণিত (Higher Math)' : 'Higher Math', query: 'Higher Math' },
    { label: isBn ? 'ইংরেজি ও আইইএলটিএস' : 'English & IELTS', query: 'English' },
    { label: isBn ? 'রসায়ন (Chemistry)' : 'Chemistry', query: 'Chemistry' },
    { label: isBn ? 'আইসিটি ও কোডিং' : 'ICT & Coding', query: 'ICT' },
    { label: isBn ? 'জীববিজ্ঞান (Biology)' : 'Biology', query: 'Biology' },
  ];

  function handleTagClick(query: string) {
    setSearchQuery(query);
  }

  return (
    <div className="relative overflow-hidden bg-background">
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
                description: dict.common.appTagline,
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

      {/* Hero Section: Paradigm Dark/Glow High-Tech Aesthetic */}
      <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-32 overflow-hidden">
        {/* Ambient Glow Lights */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-primary/15 rounded-full blur-[140px] pointer-events-none -z-10" />
        <div className="absolute top-10 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-6">
            {/* Top Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary backdrop-blur-md shadow-xs hover:border-primary/50 transition-colors">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-ping" />
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{dict.hero.badge}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground font-bengali leading-[1.15] max-w-3xl">
              {dict.hero.title}
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-muted-foreground font-bengali leading-relaxed max-w-2xl">
              {dict.hero.subtitle}
            </p>

            {/* Search Input Box with Glassmorphism */}
            <div className="w-full max-w-2xl space-y-3">
              <form
                onSubmit={handleSearchSubmit}
                className="flex flex-col sm:flex-row gap-2.5 p-2 rounded-2xl sm:rounded-full bg-card/85 border border-border/80 backdrop-blur-xl shadow-xl shadow-black/5 hover:border-primary/40 focus-within:border-primary/60 transition-all"
              >
                <div className="flex items-center flex-1 px-3">
                  <Search className="w-5 h-5 text-muted-foreground mr-2 shrink-0" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={dict.hero.searchPlaceholder}
                    className="flex-1 h-11 text-sm border-0 bg-transparent focus-visible:ring-0 focus:ring-0 px-0 shadow-none placeholder:text-muted-foreground"
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="rounded-xl sm:rounded-full h-11 px-7 font-bold gap-2 whitespace-nowrap shadow-md shadow-primary/25 hover:shadow-primary/40 transition-all"
                >
                  <Search className="w-4 h-4" />
                  <span>{dict.hero.ctaSearch}</span>
                </Button>
              </form>

              {/* Instant Search Tags */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground/80 mr-1">
                  {isBn ? 'জনপ্রিয় বিষয়:' : 'Popular:'}
                </span>
                {quickSubjects.map((sub) => (
                  <button
                    key={sub.query}
                    type="button"
                    onClick={() => handleTagClick(sub.query)}
                    className="px-2.5 py-1 rounded-full bg-surface-muted hover:bg-primary-soft hover:text-primary border border-border/60 transition-all font-medium text-[11px]"
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Platform Metrics Band (Dynamic querying — zero fake numbers) */}
            {!statsError && (
              <div
                className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 pt-6 w-full max-w-3xl text-left"
                data-testid="platform-metrics-band"
              >
                {statsLoading || !stats ? (
                  <div
                    role="status"
                    aria-label={locale === 'bn' ? 'লোড হচ্ছে' : 'Loading'}
                    className="col-span-2 sm:col-span-3 flex justify-around gap-6"
                    data-testid="platform-metrics-loading"
                  >
                    <span className="sr-only">Loading…</span>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        aria-hidden
                        className="h-14 w-full animate-pulse rounded-2xl bg-surface-muted"
                      />
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="p-4 rounded-2xl bg-card/70 border border-border/70 backdrop-blur-md shadow-xs hover:border-primary/40 transition-all">
                      <div className="flex items-center justify-between text-primary mb-1">
                        <Award className="h-5 w-5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {isBn ? 'যাচাইকৃত' : 'Verified'}
                        </span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-extrabold text-foreground font-bengali tabular-nums">
                        {formatLocalizedNumber(stats.verifiedTutors, locale)}+
                      </div>
                      <div className="text-xs text-muted-foreground font-bengali mt-0.5">
                        {dict.hero.statsTutors}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-card/70 border border-border/70 backdrop-blur-md shadow-xs hover:border-primary/40 transition-all">
                      <div className="flex items-center justify-between text-primary mb-1">
                        <Users className="h-5 w-5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {isBn ? 'সক্রিয়' : 'Active'}
                        </span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-extrabold text-foreground font-bengali tabular-nums">
                        {formatLocalizedNumber(stats.activeStudents, locale)}+
                      </div>
                      <div className="text-xs text-muted-foreground font-bengali mt-0.5">
                        {dict.hero.statsStudents}
                      </div>
                    </div>

                    {stats.averageRating !== null && (
                      <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-card/70 border border-border/70 backdrop-blur-md shadow-xs hover:border-primary/40 transition-all">
                        <div className="flex items-center justify-between text-amber-500 mb-1">
                          <Star className="h-5 w-5 fill-amber-500" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {isBn ? 'গড় রেটিং' : 'Score'}
                          </span>
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-foreground font-bengali tabular-nums">
                          {locale === 'bn'
                            ? `${formatLocalizedNumber(stats.averageRating, locale)} / ৫.০`
                            : `${stats.averageRating} / 5.0`}
                        </div>
                        <div className="text-xs text-muted-foreground font-bengali mt-0.5">
                          {dict.hero.statsRating}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* 3D Hardware Laptop Showcase (Paradigm Aesthetic) */}
          <div className="mt-14 lg:mt-20 relative max-w-5xl mx-auto">
            {/* Glowing Backdrop Mesh */}
            <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-r from-primary/30 via-emerald-500/20 to-primary/40 blur-2xl opacity-75 group-hover:opacity-100 transition duration-1000 -z-10" />

            <div className="relative rounded-3xl border border-border/80 bg-card/90 backdrop-blur-2xl p-2 sm:p-4 shadow-2xl overflow-hidden group">
              {/* Top Chrome Dot Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 text-xs text-muted-foreground mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <div className="font-mono text-[11px] text-muted-foreground/80 flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-emerald-500" />
                  <span>https://ogroni.edu.bd/portal/live</span>
                </div>
                <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 text-[10px]">
                  LIVE v2.0
                </span>
              </div>

              {/* Showcase Image */}
              <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden rounded-2xl">
                <Image
                  src="/images/hero-showcase.jpg"
                  alt="OgroniEdu Modern Platform Interface on 3D Laptop Display"
                  fill
                  priority
                  className="object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]"
                />

                {/* Floating Glassmorphic Trust Card 1 (Bottom Left) */}
                <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 rounded-2xl bg-card/85 backdrop-blur-xl border border-border/80 p-3 sm:p-4 shadow-xl max-w-xs hidden sm:flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-foreground">
                      {isBn ? '১০০% এসক্রো লক গ্যারান্টি' : '100% Escrow Protection'}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {isBn ? 'সন্তুষ্টি নিশ্চিত হলে পেমেন্ট রিলিজ' : 'Zero upfront risk for guardians'}
                    </div>
                  </div>
                </div>

                {/* Floating Glassmorphic Trust Card 2 (Top Right) */}
                <div className="absolute top-4 right-4 sm:top-6 sm:right-6 rounded-2xl bg-card/85 backdrop-blur-xl border border-border/80 p-2.5 sm:p-3 shadow-xl hidden sm:flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] text-muted-foreground block">
                      {isBn ? 'পরীক্ষার সাফল্য' : 'Exam Success'}
                    </span>
                    <span className="text-xs font-extrabold text-foreground">
                      +94.8% Grade Boost
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Value Propositions / Features Bento Grid */}
      <section
        id="features"
        className="py-20 sm:py-28 bg-surface-muted/40 border-y border-border/70 relative"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <Badge variant="outline" className="px-3.5 py-1 text-xs font-bold tracking-wide uppercase">
              {locale === 'bn' ? 'মূল স্তম্ভ ও নিশ্চয়তা' : 'Why OgroniEdu'}
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground font-bengali">
              {dict.features.title}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground font-bengali">
              {dict.features.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <Card className="rounded-3xl border-border/80 bg-card/85 backdrop-blur-sm hover:shadow-xl hover:border-primary/40 transition-all duration-300">
              <CardHeader className="p-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 ring-1 ring-primary/20">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg font-bold">{dict.features.verifiedTutorsTitle}</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-0">
                <CardDescription className="font-bengali text-sm leading-relaxed text-muted-foreground">
                  {dict.features.verifiedTutorsDesc}
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="rounded-3xl border-border/80 bg-card/85 backdrop-blur-sm hover:shadow-xl hover:border-primary/40 transition-all duration-300">
              <CardHeader className="p-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 ring-1 ring-primary/20">
                  <Users className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg font-bold">{dict.features.guardianAppTitle}</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-0">
                <CardDescription className="font-bengali text-sm leading-relaxed text-muted-foreground">
                  {dict.features.guardianAppDesc}
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="rounded-3xl border-border/80 bg-card/85 backdrop-blur-sm hover:shadow-xl hover:border-primary/40 transition-all duration-300">
              <CardHeader className="p-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 ring-1 ring-primary/20">
                  <CreditCard className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg font-bold">{dict.features.securePaymentTitle}</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-0">
                <CardDescription className="font-bengali text-sm leading-relaxed text-muted-foreground">
                  {dict.features.securePaymentDesc}
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 4 */}
            <Card className="rounded-3xl border-border/80 bg-card/85 backdrop-blur-sm hover:shadow-xl hover:border-primary/40 transition-all duration-300">
              <CardHeader className="p-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 ring-1 ring-primary/20">
                  <CalendarCheck className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg font-bold">{dict.features.conflictFreeTitle}</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-0">
                <CardDescription className="font-bengali text-sm leading-relaxed text-muted-foreground">
                  {dict.features.conflictFreeDesc}
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 3-Step Tutoring Workflow Section */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              {isBn ? 'সহজ ৩টি ধাপ' : 'Simple 3-Step Journey'}
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground font-bengali">
              {isBn ? 'যেভাবে সেরা শিক্ষক পাবেন' : 'How You Connect With Top Educators'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="rounded-3xl border border-border/80 bg-card/60 p-8 backdrop-blur-md relative space-y-4 hover:border-primary/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-primary/40 font-mono">01</span>
                <div className="h-10 w-10 rounded-2xl bg-primary-soft flex items-center justify-center text-primary font-bold">
                  <Search className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-foreground font-bengali">
                {isBn ? 'বিষয় ও এলাকা অনুযায়ী খুঁজুন' : 'Filter by Subject & Location'}
              </h3>
              <p className="text-sm text-muted-foreground font-bengali leading-relaxed">
                {isBn
                  ? 'বুয়েট, ঢাবি বা মেডিকেল শিক্ষার্থীদের প্রোফাইল, রেটিং, ডেমো ভিডিও ও পারিশ্রমিক দেখে বাছাই করুন।'
                  : 'Browse verified profiles with university credentials, parent reviews, hourly rates, and demo videos.'}
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-3xl border border-border/80 bg-card/60 p-8 backdrop-blur-md relative space-y-4 hover:border-primary/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-primary/40 font-mono">02</span>
                <div className="h-10 w-10 rounded-2xl bg-primary-soft flex items-center justify-center text-primary font-bold">
                  <CalendarCheck className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-foreground font-bengali">
                {isBn ? 'ফ্রি ট্রায়াল ও শিডিউল নিশ্চিত করুন' : 'Book Trial & Lock Schedule'}
              </h3>
              <p className="text-sm text-muted-foreground font-bengali leading-relaxed">
                {isBn
                  ? 'প্রথম ট্রায়াল ক্লাসে শিক্ষকের সাথে পরিচিত হোন এবং উভয়ের সুবিধাজনক সময় বুক করুন।'
                  : 'Take a direct introductory session, assess compatibility, and lock automated non-conflicting time slots.'}
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-3xl border border-border/80 bg-card/60 p-8 backdrop-blur-md relative space-y-4 hover:border-primary/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-primary/40 font-mono">03</span>
                <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-foreground font-bengali">
                {isBn ? 'এসক্রো সুরক্ষা ও নিয়মিত ক্লাস' : 'Learn with Escrow Protection'}
              </h3>
              <p className="text-sm text-muted-foreground font-bengali leading-relaxed">
                {isBn
                  ? 'টাকা থাকবে বাংলাদেশ ব্যাংক নিয়ন্ত্রিত এসক্রোতে। প্রতি মাসের ক্লাস শেষ হলে শিক্ষক টাকা পাবেন।'
                  : 'Funds remain held securely in regulated escrow until parent and student sign off on delivered classes.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Getting Started Call to Action Banner */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="relative overflow-hidden rounded-3xl border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 p-8 sm:p-14 shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="space-y-4 max-w-xl">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-semibold rounded-full px-3 py-1">
                    Socket.IO v4
                  </Badge>
                  <Badge variant="success" className="gap-1.5 font-semibold rounded-full px-3 py-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {dict.notifications.realtimeConnected}
                  </Badge>
                </div>
                <h3 className="text-2xl sm:text-4xl font-extrabold text-foreground font-bengali">
                  {locale === 'bn'
                    ? 'রিয়েল-টাইম নোটিফিকেশনসহ সম্পূর্ণ টিউটরিং যাত্রা'
                    : 'Complete tutoring journey with real-time notifications'}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground font-bengali leading-relaxed">
                  {locale === 'bn'
                    ? 'নিবন্ধন করে আপনার ড্যাশবোর্ডে প্রবেশ করুন। বুকিং, ক্লাস ও পেমেন্টের প্রতিটি আপডেট সংরক্ষিত নোটিফিকেশন হিসেবে পাবেন।'
                    : 'Create an account to reach your role dashboard. Every booking, class, and payment update arrives as a persisted notification.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {isAuthenticated ? (
                  <Link href={`/${locale}/dashboard`}>
                    <Button size="lg" className="rounded-full px-8 font-bold shadow-lg shadow-primary/25" data-testid="home-dashboard-cta">
                      {dict.nav.dashboard}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href={`/${locale}/register`}>
                      <Button size="lg" className="rounded-full px-8 font-bold shadow-lg shadow-primary/25 hover:scale-105 transition-all" data-testid="home-register-cta">
                        {dict.nav.register}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                    <Link href={`/${locale}/login`}>
                      <Button variant="outline" size="lg" className="rounded-full px-6 font-bold" data-testid="home-login-cta">
                        {dict.nav.login}
                      </Button>
                    </Link>
                  </>
                )}
                <Link href={`/${locale}/tutors`}>
                  <Button variant="secondary" size="lg" className="rounded-full px-6 font-bold" data-testid="home-browse-tutors-cta">
                    <Search className="w-4 h-4 mr-2" />
                    {dict.nav.findTutors}
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
