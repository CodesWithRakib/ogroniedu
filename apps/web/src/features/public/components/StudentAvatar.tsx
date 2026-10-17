'use client';

import React from 'react';

export function StudentAvatar({
  index = 1,
  size = 'sm',
  className = '',
}: {
  index?: 1 | 2 | 3 | 4;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const sizeClasses = size === 'sm' ? 'w-6 h-6' : 'w-9 h-9';
  const positions: Record<number, string> = {
    1: '0% 0%',
    2: '100% 0%',
    3: '0% 100%',
    4: '100% 100%',
  };

  return (
    <div
      className={`${sizeClasses} rounded-full overflow-hidden border-2 border-border relative shrink-0 shadow-sm bg-card ${className}`}
    >
      <div
        className="w-full h-full bg-cover bg-no-repeat"
        style={{
          backgroundImage: "url('/images/avatars-group.jpg')",
          backgroundPosition: positions[index] || '0% 0%',
          backgroundSize: '200% 200%',
        }}
      />
    </div>
  );
}
