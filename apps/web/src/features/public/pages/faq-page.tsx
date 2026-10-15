'use client';

import Link from 'next/link';
import { ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getDictionary, type Locale } from '@/lib/i18n';
import { useFaqBrowser } from '../hooks/use-faq-browser';

/** Public FAQ entry: category filter, accordion list, and support CTA. */
export function FaqPage({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const p = dict.faqPage;
  const {
    faqs,
    categories,
    filteredFaqs,
    activeCategory,
    setActiveCategory,
    openIndex,
    setOpenIndex,
  } = useFaqBrowser(locale);

  return (
    <div className="py-14 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12">
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
        <Badge
          variant="outline"
          className="text-primary border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider rounded-full"
        >
          {p.badge}
        </Badge>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground font-bengali">
          {p.title}
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground font-bengali leading-relaxed max-w-2xl mx-auto">
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
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all font-bengali ${
              activeCategory === cat.id
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-105'
                : 'bg-card text-muted-foreground border border-border/80 hover:bg-surface-hover hover:text-foreground'
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
              className="bg-card/85 backdrop-blur-sm border-border/80 rounded-2xl sm:rounded-3xl shadow-sm transition-all overflow-hidden hover:border-primary/40"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 font-bengali"
                aria-expanded={isOpen}
              >
                <span className="text-base sm:text-lg font-bold text-foreground">{faq.q}</span>
                <span className="text-muted-foreground">
                  {isOpen ? (
                    <ChevronUp className="h-5 w-5 text-primary" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </span>
              </button>
              {isOpen && (
                <CardContent className="pt-0 pb-6 px-5 sm:px-6">
                  <div className="border-t border-border/60 pt-4">
                    <p className="text-sm sm:text-base text-muted-foreground font-bengali leading-relaxed">
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
      <div className="rounded-3xl border border-border/80 bg-card/90 backdrop-blur-xl p-8 sm:p-10 text-center space-y-4 shadow-xl">
        <h3 className="text-xl font-bold text-foreground font-bengali">
          {locale === 'bn' ? 'আরও কোনো প্রশ্ন আছে?' : 'Still have questions?'}
        </h3>
        <p className="text-sm text-muted-foreground font-bengali max-w-md mx-auto leading-relaxed">
          {locale === 'bn'
            ? 'আমাদের কাস্টমার কেয়ার টিম সপ্তাহের প্রতিদিন আপনাকে সহায়তা করতে প্রস্তুত।'
            : 'Our customer support team is available 7 days a week to assist you.'}
        </p>
        <Link href={`/${locale}/contact`}>
          <Button
            size="lg"
            className="rounded-full px-8 font-bold shadow-md shadow-primary/25 font-bengali"
          >
            {dict.nav.contact}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
