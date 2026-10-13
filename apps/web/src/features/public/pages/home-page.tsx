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
    <div className="relative overflow-hidden">
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

      {/* Hero Section with Ambient Glow Mesh */}
      <section className="relative hero-gradient pt-14 pb-20 lg:pt-24 lg:pb-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-6">
            {/* Trust Badge */}
            <Badge variant="primary" className="px-4 py-1.5 text-xs font-semibold gap-2 shadow-xs">
              <ShieldCheck className="w-4 h-4 text-primary" />
              {dict.hero.badge}
            </Badge>

            {/* Main Headline with Editorial Accent */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground font-bengali leading-tight">
              {dict.hero.title}
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-muted-foreground font-bengali leading-relaxed max-w-2xl">
              {dict.hero.subtitle}
            </p>

            {/* Search Bar Input with Glassmorphic Floating Panel */}
            <form
              onSubmit={handleSearchSubmit}
              className="w-full max-w-2xl flex flex-col sm:flex-row gap-2.5 p-2 rounded-2xl glass-panel shadow-lg shadow-black/5"
            >
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={dict.hero.searchPlaceholder}
                leadingIcon={<Search className="w-4 h-4" />}
                className="flex-1 h-12 text-sm border-0 bg-transparent focus:ring-0"
              />
              <Button
                type="submit"
                size="lg"
                variant="primary"
                className="h-12 px-7 font-bold gap-2 whitespace-nowrap shadow-md"
              >
                <Search className="w-4 h-4" />
                {dict.hero.ctaSearch}
              </Button>
            </form>

            {/* Live platform metrics (Dynamic querying — zero fake numbers) */}
            {!statsError && (
              <div
                className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-10 w-full max-w-2xl border-t border-border/80 text-left"
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
                        className="h-10 w-28 animate-pulse rounded-xl bg-surface-muted"
                      />
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="p-3 rounded-2xl bg-card/60 border border-border/60 backdrop-blur-xs">
                      <div className="text-2xl sm:text-3xl font-bold text-foreground font-bengali tabular-nums">
                        {formatLocalizedNumber(stats.verifiedTutors, locale)}+
                      </div>
                      <div className="text-xs text-muted-foreground font-bengali mt-0.5">
                        {dict.hero.statsTutors}
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-card/60 border border-border/60 backdrop-blur-xs">
                      <div className="text-2xl sm:text-3xl font-bold text-foreground font-bengali tabular-nums">
                        {formatLocalizedNumber(stats.activeStudents, locale)}+
                      </div>
                      <div className="text-xs text-muted-foreground font-bengali mt-0.5">
                        {dict.hero.statsStudents}
                      </div>
                    </div>
                    {stats.averageRating !== null && (
                      <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-card/60 border border-border/60 backdrop-blur-xs">
                        <div className="text-2xl sm:text-3xl font-bold text-primary font-bengali tabular-nums">
                          {locale === 'bn'
                            ? `${formatLocalizedNumber(stats.averageRating, locale)} / ${formatLocalizedNumber(5, locale)}`
                            : `${stats.averageRating} / 5`}
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
        </div>
      </section>

      {/* Core Value Propositions / Features Bento Grid */}
      <section
        id="features"
        className="py-20 bg-surface-muted/50 border-y border-border"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <Badge variant="outline" className="px-3 py-1 font-semibold">
              {locale === 'bn' ? 'মূল বৈশিষ্ট্যসমূহ' : 'Key Pillars'}
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
            <Card className="card-hover-elevate">
              <CardHeader>
                <div className="w-12 h-12 rounded-2xl bg-primary-soft text-primary-soft-foreground flex items-center justify-center mb-3 shadow-xs">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>{dict.features.verifiedTutorsTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="font-bengali text-sm leading-relaxed">
                  {dict.features.verifiedTutorsDesc}
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="card-hover-elevate">
              <CardHeader>
                <div className="w-12 h-12 rounded-2xl bg-primary-soft text-primary-soft-foreground flex items-center justify-center mb-3 shadow-xs">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>{dict.features.guardianAppTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="font-bengali text-sm leading-relaxed">
                  {dict.features.guardianAppDesc}
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="card-hover-elevate">
              <CardHeader>
                <div className="w-12 h-12 rounded-2xl bg-primary-soft text-primary-soft-foreground flex items-center justify-center mb-3 shadow-xs">
                  <CreditCard className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>{dict.features.securePaymentTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="font-bengali text-sm leading-relaxed">
                  {dict.features.securePaymentDesc}
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 4 */}
            <Card className="card-hover-elevate">
              <CardHeader>
                <div className="w-12 h-12 rounded-2xl bg-primary-soft text-primary-soft-foreground flex items-center justify-center mb-3 shadow-xs">
                  <CalendarCheck className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>{dict.features.conflictFreeTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="font-bengali text-sm leading-relaxed">
                  {dict.features.conflictFreeDesc}
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Getting Started Call to Action */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="relative overflow-hidden border-border bg-card p-8 sm:p-12 shadow-xl shadow-black/5">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="space-y-4 max-w-xl">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-semibold">Socket.IO</Badge>
                  <Badge variant="success" className="gap-1.5 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {dict.notifications.realtimeConnected}
                  </Badge>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground font-bengali">
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
                    <Button variant="primary" size="lg" data-testid="home-dashboard-cta">
                      {dict.nav.dashboard}
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href={`/${locale}/register`}>
                      <Button variant="primary" size="lg" data-testid="home-register-cta">
                        {dict.nav.register}
                        <ArrowRight className="w-4 h-4 ml-1.5" />
                      </Button>
                    </Link>
                    <Link href={`/${locale}/login`}>
                      <Button variant="outline" size="lg" data-testid="home-login-cta">
                        {dict.nav.login}
                      </Button>
                    </Link>
                  </>
                )}
                <Link href={`/${locale}/tutors`}>
                  <Button variant="secondary" size="lg" data-testid="home-browse-tutors-cta">
                    <Search className="w-4 h-4 mr-1.5" />
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
