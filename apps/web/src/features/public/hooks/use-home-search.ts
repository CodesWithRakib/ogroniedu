'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store';
import type { Locale } from '@/lib/i18n';

/** Feature-level home hook: hero search query plus auth-aware CTA state. */
export function useHomeSearch(locale: Locale) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState('');
  const { isAuthenticated } = useAppSelector((s) => s.auth);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/${locale}/tutors?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push(`/${locale}/tutors`);
    }
  }

  return { searchQuery, setSearchQuery, isAuthenticated, handleSearchSubmit };
}
