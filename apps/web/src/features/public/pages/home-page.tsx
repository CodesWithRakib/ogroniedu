'use client';

import Link from 'next/link';
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

/** Public home entry: hero search, live trust metrics, value pillars, and auth-aware CTA. */
export function HomePage({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const { searchQuery, setSearchQuery, isAuthenticated, handleSearchSubmit } =
    useHomeSearch(locale);
  const { stats, isLoading: statsLoading, isError: statsError } = usePlatformStats();

  return (
    <div>
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

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-6">
            {/* Trust Badge */}
            <Badge variant="success" className="px-3.5 py-1 text-xs font-semibold gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              {dict.hero.badge}
            </Badge>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-bengali leading-tight">
              {dict.hero.title}
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-bengali leading-relaxed">
              {dict.hero.subtitle}
            </p>

            {/* Search Bar Input */}
            <form
              onSubmit={handleSearchSubmit}
              className="w-full max-w-xl flex flex-col sm:flex-row gap-2.5 pt-2"
            >
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={dict.hero.searchPlaceholder}
                leadingIcon={<Search className="w-4 h-4" />}
                className="flex-1 h-12 text-sm"
              />
              <Button
                type="submit"
                size="lg"
                className="h-12 px-6 font-semibold gap-2 whitespace-nowrap bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                <Search className="w-4 h-4" />
                {dict.hero.ctaSearch}
              </Button>
            </form>

            {/* Live platform metrics (hidden on error — never show fabricated numbers) */}
            {!statsError && (
              <div
                className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-8 pt-8 w-full max-w-2xl border-t border-slate-200/80 dark:border-slate-800 text-left"
                data-testid="platform-metrics-band"
              >
                {statsLoading || !stats ? (
                  <div
                    role="status"
                    aria-label={locale === 'bn' ? 'লোড হচ্ছে' : 'Loading'}
                    className="col-span-2 sm:col-span-3 flex gap-8"
                    data-testid="platform-metrics-loading"
                  >
                    <span className="sr-only">Loading…</span>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        aria-hidden
                        className="h-8 w-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800"
                      />
                    ))}
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 font-bengali">
                        {formatLocalizedNumber(stats.verifiedTutors, locale)}+
                      </div>
                      <div className="text-xs text-slate-500 font-bengali">
                        {dict.hero.statsTutors}
                      </div>
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 font-bengali">
                        {formatLocalizedNumber(stats.activeStudents, locale)}+
                      </div>
                      <div className="text-xs text-slate-500 font-bengali">
                        {dict.hero.statsStudents}
                      </div>
                    </div>
                    {stats.averageRating !== null && (
                      <div className="col-span-2 sm:col-span-1">
                        <div className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400 font-bengali">
                          {locale === 'bn'
                            ? `${formatLocalizedNumber(stats.averageRating, locale)} / ${formatLocalizedNumber(5, locale)}`
                            : `${stats.averageRating} / 5`}
                        </div>
                        <div className="text-xs text-slate-500 font-bengali">
                          {dict.hero.statsRating}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Core Value Propositions / Features */}
      <section
        id="features"
        className="py-16 bg-white dark:bg-slate-900 border-y border-slate-200/80 dark:border-slate-800"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <Badge variant="outline">{locale === 'bn' ? 'মূল বৈশিষ্ট্যসমূহ' : 'Key Pillars'}</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-bengali">
              {dict.features.title}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-bengali">
              {dict.features.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <Card>
              <CardHeader>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-700 dark:text-emerald-300 mb-2">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <CardTitle>{dict.features.verifiedTutorsTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="font-bengali">
                  {dict.features.verifiedTutorsDesc}
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card>
              <CardHeader>
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-700 dark:text-blue-300 mb-2">
                  <Users className="w-5 h-5" />
                </div>
                <CardTitle>{dict.features.guardianAppTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="font-bengali">
                  {dict.features.guardianAppDesc}
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card>
              <CardHeader>
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-700 dark:text-amber-300 mb-2">
                  <CreditCard className="w-5 h-5" />
                </div>
                <CardTitle>{dict.features.securePaymentTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="font-bengali">
                  {dict.features.securePaymentDesc}
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 4 */}
            <Card>
              <CardHeader>
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-700 dark:text-purple-300 mb-2">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <CardTitle>{dict.features.conflictFreeTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="font-bengali">
                  {dict.features.conflictFreeDesc}
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Getting started — authenticated users go to their dashboard */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="border-emerald-200/60 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/20 p-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="space-y-4 max-w-xl">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Socket.IO</Badge>
                  <Badge variant="success" className="gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    {dict.notifications.realtimeConnected}
                  </Badge>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-bengali">
                  {locale === 'bn'
                    ? 'রিয়েল-টাইম নোটিফিকেশনসহ সম্পূর্ণ টিউটরিং যাত্রা'
                    : 'Complete tutoring journey with real-time notifications'}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-bengali leading-relaxed">
                  {locale === 'bn'
                    ? 'নিবন্ধন করে আপনার ড্যাশবোর্ডে প্রবেশ করুন। বুকিং, ক্লাস ও পেমেন্টের প্রতিটি আপডেট সংরক্ষিত নোটিফিকেশন হিসেবে পাবেন।'
                    : 'Create an account to reach your role dashboard. Every booking, class, and payment update arrives as a persisted notification.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {isAuthenticated ? (
                  <Link href={`/${locale}/dashboard`}>
                    <Button variant="primary" size="sm" data-testid="home-dashboard-cta">
                      {dict.nav.dashboard}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href={`/${locale}/register`}>
                      <Button variant="primary" size="sm" data-testid="home-register-cta">
                        {dict.nav.register}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                    <Link href={`/${locale}/login`}>
                      <Button variant="outline" size="sm" data-testid="home-login-cta">
                        {dict.nav.login}
                      </Button>
                    </Link>
                  </>
                )}
                <Link href={`/${locale}/tutors`}>
                  <Button variant="secondary" size="sm" data-testid="home-browse-tutors-cta">
                    <Search className="w-3.5 h-3.5" />
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
