'use client';

import React from 'react';
import { getDictionary, type Locale } from '@/lib/i18n';

/** Feature-level FAQ hook: category filter, accordion state, and search over localized Q&A. */
export function useFaqBrowser(locale: Locale) {
  const dict = getDictionary(locale);
  const p = dict.faqPage;

  const [activeCategory, setActiveCategory] = React.useState<string>('all');
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);
  const [searchFilter, setSearchFilter] = React.useState<string>('');

  const faqs = React.useMemo(
    () => [
      { category: 'tutors', q: p.q1, a: p.a1 },
      { category: 'payments', q: p.q2, a: p.a2 },
      { category: 'guarantee', q: p.q3, a: p.a3 },
      { category: 'safety', q: p.q4, a: p.a4 },
      { category: 'tutors', q: p.q5, a: p.a5 },
      { category: 'tutors', q: p.q6, a: p.a6 },
    ],
    [p],
  );

  const categories = React.useMemo(
    () => [
      { id: 'all', label: p.catAll },
      { id: 'tutors', label: p.catTutors },
      { id: 'payments', label: p.catPayments },
      { id: 'safety', label: p.catSafety },
      { id: 'guarantee', label: p.catGuarantee },
    ],
    [p],
  );

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCat = activeCategory === 'all' || faq.category === activeCategory;
    const matchesSearch =
      !searchFilter ||
      faq.q.toLowerCase().includes(searchFilter.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return {
    faqs,
    categories,
    filteredFaqs,
    activeCategory,
    setActiveCategory,
    openIndex,
    setOpenIndex,
    searchFilter,
    setSearchFilter,
  };
}
