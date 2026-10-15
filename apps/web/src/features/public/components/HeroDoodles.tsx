'use client';

import React from 'react';

export function BetterLearningDoodle({ className = '' }: { className?: string }) {
  return (
    <div className={`relative inline-block select-none pointer-events-none ${className}`}>
      <div className="flex flex-col items-center rotate-[-8deg]">
        <span
          className="text-sm sm:text-base font-semibold tracking-wide text-white drop-shadow-[0_2px_10px_rgba(13,245,196,0.3)] whitespace-nowrap leading-tight text-center"
          style={{
            fontFamily: "var(--font-caveat), 'Caveat', 'Patrick Hand', cursive, sans-serif",
          }}
        >
          Better Learning
          <br />
          <span className="text-[#0df5c4]">Brighter Future</span>{' '}
          <span className="text-white text-xs">♡</span>
        </span>
        {/* Playful curved hand-drawn arrow pointing to student */}
        <svg
          width="42"
          height="36"
          viewBox="0 0 42 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-white mt-1 translate-x-2"
        >
          <path
            d="M6 4C14 10 24 18 32 26"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M26 26L33 27L33 20"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

export function YourSuccessDoodle({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative inline-flex flex-col items-start select-none pointer-events-none -rotate-[10deg] ${className}`}
    >
      <span
        className="text-xs sm:text-[13px] font-semibold tracking-wide text-slate-100 drop-shadow-[0_2px_8px_rgba(13,245,196,0.3)] whitespace-nowrap leading-tight"
        style={{ fontFamily: "var(--font-caveat), 'Caveat', 'Patrick Hand', cursive, sans-serif" }}
      >
        Your Success
        <br />
        <span className="ml-2 text-white">Our Priority</span>
      </span>
      {/* Hand-drawn underline swoosh curving up to the right */}
      <svg
        width="65"
        height="10"
        viewBox="0 0 65 10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-[#0df5c4] ml-2 -mt-0.5"
      >
        <path
          d="M2 8C20 3 45 2 63 5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
