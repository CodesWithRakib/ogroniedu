'use client';

import React from 'react';
import Link from 'next/link';

interface OgroniEduBrandProps {
  locale?: string;
  className?: string;
  showSubtitle?: boolean;
}

export function OgroniEduBrand({
  locale = 'en',
  className = '',
  showSubtitle = true,
}: OgroniEduBrandProps) {
  const isBn = locale === 'bn';

  return (
    <Link
      href={`/${locale}`}
      className={`inline-flex items-center gap-2.5 group transition-all duration-200 ${className}`}
      aria-label="OgroniEdu Home"
    >
      {/* Brand Icon: Modern Academic Squircle Emblem with Knowledge Diamond */}
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand via-brand-accent to-primary text-white shadow-xs shadow-primary/25 ring-1 ring-white/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-sm">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-white drop-shadow-xs"
        >
          {/* Mortarboard / Graduation Cap Top */}
          <path d="M12 3L2 8L12 13L22 8L12 3Z" fill="currentColor" fillOpacity="0.95" />
          {/* Mortarboard Arch Underneath */}
          <path
            d="M6 10.5V16C6 17.8 8.7 19.5 12 19.5C15.3 19.5 18 17.8 18 16V10.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          {/* Tassel */}
          <path
            d="M21 8.5V15.5C21 16 20.6 16.5 20.1 16.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* Diamond Knowledge Spark at center */}
          <circle cx="12" cy="8" r="1.3" className="fill-white" />
        </svg>
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col text-left leading-tight">
        <div className="flex items-center gap-1">
          <span className="text-lg font-black tracking-tight text-foreground font-sans transition-colors group-hover:text-primary">
            Ogroni<span className="text-primary font-black">Edu</span>
          </span>
          <span className="text-[10px] font-bold text-primary px-1.5 py-0.2 rounded-md bg-primary-soft border border-primary/20">
            {isBn ? 'অগ্রণী' : 'Edu'}
          </span>
        </div>
        {showSubtitle && (
          <span className="text-[10px] font-medium text-muted-foreground tracking-normal font-sans">
            {isBn ? 'বিশ্বস্ত শিক্ষক প্ল্যাটফর্ম' : 'Trusted Tutoring Platform'}
          </span>
        )}
      </div>
    </Link>
  );
}
