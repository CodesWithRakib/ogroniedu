'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { useAppDispatch } from '@/store';
import { enqueueToast } from '@/store/slices/ui-slice';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default function HomePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const locale: Locale = resolvedParams.locale === 'en' ? 'en' : 'bn';
  const dict = getDictionary(locale);
  const dispatch = useAppDispatch();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [triggerLoading, setTriggerLoading] = useState<string | null>(null);
  const { isConnected, refreshNotifications } = useNotifications();

  const demoUserId = '11111111-1111-1111-1111-111111111111';

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/${locale}/tutors?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push(`/${locale}/tutors`);
    }
  };

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

      if (!res.ok) {
        throw new Error(`Failed to dispatch notification: ${res.statusText}`);
      }

      dispatch(
        enqueueToast({
          title: locale === 'bn' ? 'বিজ্ঞপ্তি পাঠানো হয়েছে' : 'Notification Sent',
          message: locale === 'bn' ? `ইভেন্ট: ${eventType}` : `Dispatched: ${eventType}`,
          type: 'success',
        }),
      );

      await refreshNotifications();
    } catch (err) {
      console.error(err);
      dispatch(
        enqueueToast({
          title: locale === 'bn' ? 'ত্রুটি' : 'Error',
          message: locale === 'bn' ? 'সার্ভার সংযোগ ব্যর্থ হয়েছে' : 'Connection failed',
          type: 'error',
        }),
      );
    } finally {
      setTriggerLoading(null);
    }
  };

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
            <form onSubmit={handleSearchSubmit} className="w-full max-w-xl flex flex-col sm:flex-row gap-2.5 pt-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={dict.hero.searchPlaceholder}
                leadingIcon={<Search className="w-4 h-4" />}
                className="flex-1 h-12 text-sm"
              />
              <Button type="submit" size="lg" className="h-12 px-6 font-semibold gap-2 whitespace-nowrap bg-emerald-700 hover:bg-emerald-800 text-white">
                <Search className="w-4 h-4" />
                {dict.hero.ctaSearch}
              </Button>
            </form>

            {/* Verified Trust Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-8 pt-8 w-full max-w-2xl border-t border-slate-200/80 dark:border-slate-800 text-left">
              <div>
                <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 font-bengali">
                  {formatLocalizedNumber(5000, locale)}+
                </div>
                <div className="text-xs text-slate-500 font-bengali">{dict.hero.statsTutors}</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 font-bengali">
                  {formatLocalizedNumber(20000, locale)}+
                </div>
                <div className="text-xs text-slate-500 font-bengali">
                  {dict.hero.statsStudents}
                </div>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <div className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400 font-bengali">
                  {locale === 'bn' ? '৪.৯ / ৫' : '4.9 / 5'}
                </div>
                <div className="text-xs text-slate-500 font-bengali">{dict.hero.statsRating}</div>
              </div>
            </div>
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
            <Badge variant="outline">
              {locale === 'bn' ? 'মূল বৈশিষ্ট্যসমূহ' : 'Key Pillars'}
            </Badge>
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

      {/* Real-time Notification Engine Showcase */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="border-emerald-200/60 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/20 p-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="space-y-4 max-w-xl">
                <div className="flex items-center gap-2">
                  <Badge variant={isConnected ? 'success' : 'destructive'} className="gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-600 animate-ping' : 'bg-rose-600'}`}
                    />
                    {isConnected
                      ? dict.notifications.realtimeConnected
                      : dict.notifications.realtimeDisconnected}
                  </Badge>
                  <Badge variant="outline">Socket.IO v4.8</Badge>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-bengali">
                  {locale === 'bn'
                    ? 'রিয়েল-টাইম নোটিফিকেশন ইঞ্জিন পরীক্ষা করুন'
                    : 'Test Real-Time Notification Engine'}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-bengali leading-relaxed">
                  {locale === 'bn'
                    ? 'নিচের বাটনগুলোতে ক্লিক করে ব্যাকএন্ড ইভেন্ট ট্রিগার করুন। উপরে ডানপাশে নোটিফিকেশন বেল আইকন ও ফ্লোটিং টোস্টে লাইভ আপডেট পর্যবেক্ষণ করুন।'
                    : 'Trigger real-time backend notification events below. Notice instant unread count badge increments and floating toasts.'}
                </p>
              </div>

              {/* Dispatch Trigger Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={triggerLoading === 'booking.requested'}
                  onClick={() =>
                    handleTriggerTestNotification('booking.requested', 'tutor', {
                      bookingId: 'bk-901',
                      subjectName:
                        locale === 'bn' ? 'পদার্থবিজ্ঞান (একাদশ শ্রেণি)' : 'Physics (Class 11)',
                      requesterName: 'মোঃ তানভীর আহমেদ',
                    })
                  }
                >
                  <Send className="w-3.5 h-3.5" />
                  {locale === 'bn' ? 'বুকিং অনুরোধ (শিক্ষক)' : 'Booking Requested'}
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  isLoading={triggerLoading === 'payment.succeeded'}
                  onClick={() =>
                    handleTriggerTestNotification('payment.succeeded', 'guardian', {
                      bookingId: 'bk-901',
                      amount: 2500,
                      paymentId: 'pay-bd-8871',
                    })
                  }
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  {locale === 'bn' ? 'ফি প্রদান নিশ্চিত (অভিভাবক)' : 'Payment Succeeded'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  isLoading={triggerLoading === 'system.announcement'}
                  onClick={() =>
                    handleTriggerTestNotification('system.announcement', 'guardian', {
                      messageBn: 'এইচএসসি ২০২৬ বিশেষ রিভিশন ব্যাচ শুরু হয়েছে।',
                      messageEn: 'HSC 2026 Special Revision Batch is now open.',
                    })
                  }
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {locale === 'bn' ? 'সিস্টেম ঘোষণা' : 'System Announcement'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
