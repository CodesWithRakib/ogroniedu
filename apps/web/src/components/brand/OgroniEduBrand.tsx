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
      aria-label="Ogroni Home"
    >
      {/* Brand Icon: Sovereign Shield with vibrant blue-indigo gradient & Golden Spark */}
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center transition-transform duration-300 group-hover:scale-105">
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-10 w-10 drop-shadow-sm"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="brandShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
            <linearGradient id="brandSparkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          {/* Squircle Shield */}
          <rect x="8" y="8" width="84" height="84" rx="24" fill="url(#brandShieldGrad)" />
          {/* Subtle inner highlight */}
          <rect
            x="9"
            y="9"
            width="82"
            height="82"
            rx="23"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1"
            strokeOpacity="0.25"
          />
          {/* Mortarboard Diamond Top */}
          <path d="M50 25L20 40L50 55L80 40L50 25Z" fill="#ffffff" />
          {/* Mortarboard Neck & Arch */}
          <path
            d="M30 47V62C30 67 38.5 72 50 72C61.5 72 70 67 70 62V47"
            stroke="#ffffff"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Tassel with Golden End */}
          <path
            d="M78 41V60C78 61.5 76.5 63 75 63"
            stroke="#93c5fd"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="75" cy="63" r="3.5" fill="url(#brandSparkGrad)" />
          {/* Golden Guidance Star on Top Cap */}
          <path
            d="M50 35L52.5 39.5L57 40.5L53.5 43.5L54.5 48L50 45.5L45.5 48L46.5 43.5L43 40.5L47.5 39.5L50 35Z"
            fill="url(#brandSparkGrad)"
          />
        </svg>
      </div>

      {/* Brand Typography: Bengali strictly for bn, English strictly for en */}
      <div className="flex flex-col text-left leading-tight">
        <div className="flex items-center gap-1.5">
          <span className="text-xl font-black tracking-tight text-foreground font-sans transition-colors group-hover:text-primary">
            {isBn ? 'অগ্রণী' : 'Ogroni'}
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
