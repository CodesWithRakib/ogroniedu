'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { HelpCircle, ChevronDown, ChevronUp, Search, MessageSquare, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getDictionary, type Locale } from '@/lib/i18n';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default function FaqPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const locale: Locale = resolvedParams.locale === 'en' ? 'en' : 'bn';
  const dict = getDictionary(locale);
  const p = dict.faqPage;

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [searchFilter, setSearchFilter] = useState<string>('');

  const faqs = [
    {
      category: 'tutors',
      q: p.q1,
      a: p.a1,
    },
    {
      category: 'payments',
      q: p.q2,
      a: p.a2,
    },
    {
      category: 'guarantee',
      q: p.q3,
      a: p.a3,
    },
    {
      category: 'safety',
      q: p.q4,
      a: p.a4,
    },
    {
      category: 'tutors',
      q: p.q5,
      a: p.a5,
    },
    {
      category: 'tutors',
      q: p.q6,
      a: p.a6,
    },
  ];

  const categories = [
    { id: 'all', label: p.catAll },
    { id: 'tutors', label: p.catTutors },
    { id: 'payments', label: p.catPayments },
    { id: 'safety', label: p.catSafety },
    { id: 'guarantee', label: p.catGuarantee },
  ];

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCat = activeCategory === 'all' || faq.category === activeCategory;
    const matchesSearch =
      !searchFilter ||
      faq.q.toLowerCase().includes(searchFilter.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12">
      {/* Schema.org FAQPage Microdata */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((faq) => ({
              '@type': 'Question',
              name: faq.q,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.a,
              },
            })),
          }),
        }}
      />

      {/* Header Banner */}
      <div className="text-center space-y-4">
        <Badge variant="outline" className="text-emerald-700 border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300">
          {p.badge}
        </Badge>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 font-bengali">
          {p.title}
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-bengali leading-relaxed max-w-2xl mx-auto">
          {p.subtitle}
        </p>
      </div>

      {/* Category Filter Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors font-bengali ${
              activeCategory === cat.id
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* FAQ Accordion List */}
      <div className="space-y-4">
        {filteredFaqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <Card
              key={idx}
              className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 shadow-sm transition-all overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 font-bengali"
                aria-expanded={isOpen}
              >
                <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  {faq.q}
                </span>
                <span className="text-slate-400">
                  {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </span>
              </button>
              {isOpen && (
                <CardContent className="pt-0 pb-6 px-5 sm:px-6">
                  <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4">
                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-bengali leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Still Have Questions CTA */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-6 sm:p-8 text-center space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-bengali">
          {locale === 'bn' ? 'আরও কোনো প্রশ্ন আছে?' : 'Still have questions?'}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 font-bengali max-w-md mx-auto">
          {locale === 'bn'
            ? 'আমাদের কাস্টমার কেয়ার টিম সপ্তাহের প্রতিদিন আপনাকে সহায়তা করতে প্রস্তুত।'
            : 'Our customer support team is available 7 days a week to assist you.'}
        </p>
        <Link href={`/${locale}/contact`}>
          <Button className="bg-emerald-700 hover:bg-emerald-800 text-white font-bengali">
            {dict.nav.contact}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
