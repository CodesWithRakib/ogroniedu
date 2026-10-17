'use client';

import React from 'react';
import Link from 'next/link';
import { Smartphone, ArrowRight } from 'lucide-react';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';
import { Button } from '@/components/ui/Button';

export interface SidebarPromoCardProps {
  locale: Locale;
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
}

export function SidebarPromoCard({
  locale,
  title,
  subtitle,
  actionLabel,
  actionHref = '/learning',
}: SidebarPromoCardProps) {
  const isBn = locale === 'bn';

  const heading = title ?? (isBn ? 'মোবাইল অ্যাপ নামিয়ে নিন' : 'Download Mobile App');
  const sub = subtitle ?? (isBn ? 'যেকোনো সময় লাইভ ক্লাস ও নোট' : 'Live classes & verified tutors');
  const btnLabel = actionLabel ?? (isBn ? 'ডাউনলোড' : 'Download');

  return (
    <div className="relative rounded-xl p-3.5 bg-surface/75 border border-border/80 text-foreground select-none">
      {/* Mini Icon */}
      <div className="flex items-center gap-2 mb-2">
        <div className="h-6 w-6 rounded-lg bg-primary-soft text-primary border border-primary/20 flex items-center justify-center">
          <Smartphone className="h-3.5 w-3.5" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {isBn ? 'অগ্রণী এডু অ্যাপ' : 'OgroniEdu App'}
        </span>
      </div>

      {/* Content */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-foreground tracking-tight leading-snug">{heading}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-normal">{sub}</p>
      </div>

      {/* Action Button */}
      <div>
        <Button asChild variant="primary" size="xs" className="w-full font-semibold">
          <Link href={withLocale(actionHref, locale)}>
            <span>{btnLabel}</span>
            <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
