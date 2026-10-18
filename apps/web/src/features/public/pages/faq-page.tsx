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
          variant="secondary"
          className="text-primary border border-primary/20 bg-primary-soft px-3.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-full"
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
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all font-bengali cursor-pointer ${
              activeCategory === cat.id
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-card text-muted-foreground border border-border hover:bg-muted/50 hover:text-foreground'
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
              className="bg-card border-border rounded-2xl shadow-xs transition-all overflow-hidden hover:border-primary/40"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 font-bengali cursor-pointer"
                aria-expanded={isOpen}
              >
                <span className="text-base sm:text-lg font-bold text-foreground">{faq.q}</span>
                <span className="text-muted-foreground shrink-0">
                  {isOpen ? (
                    <ChevronUp className="h-5 w-5 text-primary" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </span>
              </button>
              {isOpen && (
                <CardContent className="pt-0 pb-6 px-5 sm:px-6">
                  <div className="border-t border-border pt-4">
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
      <div className="rounded-2xl border border-border bg-card p-8 sm:p-10 text-center space-y-4 shadow-card">
        <h3 className="text-xl font-bold text-foreground font-bengali">
          {locale === 'bn' ? 'আরও কোনো প্রশ্ন আছে?' : 'Still have questions?'}
        </h3>
        <p className="text-sm text-muted-foreground font-bengali max-w-md mx-auto leading-relaxed">
          {locale === 'bn'
            ? 'আমাদের কাস্টমার কেয়ার টিম সপ্তাহের প্রতিদিন আপনাকে সহায়তা করতে প্রস্তুত।'
            : 'Our customer support team is available 7 days a week to assist you.'}
        </p>
        <Button
          asChild
          size="lg"
          className="rounded-full px-8 font-semibold shadow-xs font-bengali"
        >
          <Link href={`/${locale}/contact`} className="flex items-center gap-2">
            <span>{dict.nav.contact}</span>
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
