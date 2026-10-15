'use client';

import React from 'react';
import { getDictionary, type Locale } from '@/lib/i18n';

const PLATFORM_FEE_RATE = 0.08;

/** Feature-level pricing hook: fee-calculator state plus localized tier benchmarks. */
export function usePricingCalculator(locale: Locale) {
  const dict = getDictionary(locale);
  const p = dict.pricingPage;

  const [hoursPerWeek, setHoursPerWeek] = React.useState<number>(6);
  const [hourlyRate, setHourlyRate] = React.useState<number>(800);

  const monthlyGross = hoursPerWeek * 4 * hourlyRate;
  const tutorEarnings = Math.round(monthlyGross * (1 - PLATFORM_FEE_RATE));
  const platformFee = Math.round(monthlyGross * PLATFORM_FEE_RATE);

  const tiers = React.useMemo(
    () => [
      {
        title: p.tierPrimaryTitle,
        range: p.tierPrimaryRange,
        desc: p.tierPrimaryDesc,
        tag: 'Class 1-5',
      },
      {
        title: p.tierJuniorTitle,
        range: p.tierJuniorRange,
        desc: p.tierJuniorDesc,
        tag: 'Class 6-8',
      },
      {
        title: p.tierSscTitle,
        range: p.tierSscRange,
        desc: p.tierSscDesc,
        tag: 'Class 9-10 (SSC)',
      },
      {
        title: p.tierHscTitle,
        range: p.tierHscRange,
        desc: p.tierHscDesc,
        tag: 'Class 11-12 (HSC)',
      },
      {
        title: p.tierAdmissionTitle,
        range: p.tierAdmissionRange,
        desc: p.tierAdmissionDesc,
        tag: 'Admission Test',
      },
      {
        title: p.tierEnglishMediumTitle,
        range: p.tierEnglishMediumRange,
        desc: p.tierEnglishMediumDesc,
        tag: 'O / A Levels',
      },
    ],
    [p],
  );

  return {
    hoursPerWeek,
    setHoursPerWeek,
    hourlyRate,
    setHourlyRate,
    monthlyGross,
    tutorEarnings,
    platformFee,
    tiers,
  };
}
