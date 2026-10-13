'use client';

import React from 'react';

/**
 * Shared dialog chrome for the trust modals (review / safety / replacement):
 * overlay, card, header with icon + close, and form alert boxes.
 * Visuals are byte-identical to the originals; only the structure is shared.
 */
export function TrustModalShell({
  icon,
  title,
  subtitle,
  headerExtra,
  maxWidth = 520,
  onClose,
  closeLabel = 'Close',
  children,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  headerExtra?: React.ReactNode;
  maxWidth?: number;
  onClose: () => void;
  closeLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--card-bg, #ffffff)',
          color: 'var(--text-primary, #0f172a)',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: `${maxWidth}px`,
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--border-color, #e2e8f0)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.25rem' }}>{icon}</span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                {title}
              </h2>
            </div>
            {subtitle && (
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>{subtitle}</p>
            )}
            {headerExtra}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              color: '#94a3b8',
            }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function TrustFormAlert({
  tone,
  children,
}: {
  tone: 'error' | 'success';
  children: React.ReactNode;
}) {
  const palette =
    tone === 'error'
      ? { backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', icon: '⚠️' }
      : { backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', icon: '✓' };
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      style={{
        backgroundColor: palette.backgroundColor,
        color: palette.color,
        padding: '10px 14px',
        borderRadius: '8px',
        fontSize: '0.85rem',
        marginBottom: '14px',
        border: palette.border,
      }}
    >
      {palette.icon} {children}
    </div>
  );
}
