'use client';

import { formatLocalizedNumber } from '@/lib/i18n';

/** 1–5 star picker used by the review form (display-only, controlled). */
export function StarSelector({
  label,
  value,
  onChange,
  locale = 'en',
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  locale?: 'bn' | 'en';
}) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span
          style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary, #475569)' }}
        >
          {label}
        </span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b' }}>
          {'★'.repeat(value)}
          {'☆'.repeat(5 - value)} ({value}/5)
        </span>
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            aria-label={
              locale === 'bn'
                ? `${label}: ${formatLocalizedNumber(5, 'bn')} এর মধ্যে ${formatLocalizedNumber(star, 'bn')}`
                : `${label}: ${star} of 5 stars`
            }
            aria-pressed={star <= value}
            style={{
              flex: 1,
              padding: '6px',
              border:
                star <= value ? '1px solid #f59e0b' : '1px solid var(--border-color, #e2e8f0)',
              backgroundColor: star <= value ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
              borderRadius: '6px',
              cursor: 'pointer',
              color: star <= value ? '#f59e0b' : 'var(--text-muted, #94a3b8)',
              fontSize: '1rem',
              fontWeight: 700,
              transition: 'all 0.15s ease',
            }}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}
