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
  return (
    <Link
      href={`/${locale}`}
      className={`inline-flex items-center gap-2.5 group transition-transform duration-200 hover:scale-[1.02] ${className}`}
      aria-label="OgroniEdu Home"
    >
      {/* Brand Icon: Glowing Teal Circle with Owl Mascot */}
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand via-brand-accent to-primary shadow-sm ring-2 ring-brand/40 transition-all duration-300 group-hover:shadow-sm group-hover:scale-105">
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-brand-foreground"
        >
          {/* Owl Ears / Tufts */}
          <path
            d="M13 14L10 9L17 11"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M27 14L30 9L23 11"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Owl Body/Head Outline */}
          <circle cx="20" cy="21" r="11" stroke="currentColor" strokeWidth="2.2" fill="currentColor" fillOpacity="0.08" />
          {/* Glasses Frame Left */}
          <circle cx="16" cy="20" r="3.5" stroke="currentColor" strokeWidth="1.8" fill="none" />
          {/* Glasses Frame Right */}
          <circle cx="24" cy="20" r="3.5" stroke="currentColor" strokeWidth="1.8" fill="none" />
          {/* Glasses Bridge */}
          <path d="M19.5 20H20.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          {/* Pupils */}
          <circle cx="16" cy="20" r="1.3" className="fill-card" />
          <circle cx="24" cy="20" r="1.3" className="fill-card" />
          {/* Owl Beak */}
          <path
            d="M20 22.8L18.8 25H21.2L20 22.8Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Brand Text */}
      <div className="flex flex-col text-left leading-tight">
        <span className="text-lg font-bold tracking-tight text-foreground font-sans group-hover:text-primary transition-colors">
          OgroniEdu
        </span>
        {showSubtitle && (
          <span className="text-[11px] font-medium text-primary tracking-normal font-sans">
            Trusted Tutoring Platform
          </span>
        )}
      </div>
    </Link>
  );
}
