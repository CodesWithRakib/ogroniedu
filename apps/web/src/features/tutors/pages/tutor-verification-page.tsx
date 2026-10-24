'use client';

import React from 'react';
import type { Locale } from '@/lib/i18n';
import { TutorProfileSettingsPage } from './tutor-profile-settings-page';

/**
 * Tutor verification workspace: renders the unified Tutor Profile & Credentials Command
 * Center with the Verification Dossier tab active.
 */
export function TutorVerificationPage({ locale }: { locale: Locale }) {
  return <TutorProfileSettingsPage locale={locale} defaultTab="verification" />;
}
