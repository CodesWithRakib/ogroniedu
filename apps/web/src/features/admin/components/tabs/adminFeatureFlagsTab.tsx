'use client';

import type { AdminFeatureFlagItem } from '../../types/admin.types';

export function AdminFeatureFlagsTab({
  featureFlags,
  isSuperAdmin,
  onToggle,
}: {
  featureFlags: AdminFeatureFlagItem[];
  isSuperAdmin: boolean;
  onToggle: (key: string, enabled: boolean) => void;
}) {
  return (
    <div className="space-y-4" data-testid="feature-flags-tab-content">
      <div className="bg-card border border-border/70 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
        <h3 className="text-base font-bold text-foreground">Feature Flags &amp; Canary Toggles</h3>
        <div className="divide-y divide-border/60">
          {featureFlags.map((flag) => (
            <div
              key={flag.key}
              className="py-3 flex items-center justify-between"
              data-testid={`flag-row-${flag.key}`}
            >
              <div>
                <p className="text-sm font-semibold text-foreground font-mono">{flag.key}</p>
                <p className="text-xs text-muted-foreground">
                  Status: {flag.enabled ? 'ENABLED' : 'DISABLED'}
                </p>
              </div>
              <button
                disabled={!isSuperAdmin}
                onClick={() => onToggle(flag.key, !flag.enabled)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs ${
                  flag.enabled
                    ? 'bg-primary hover:bg-primary-hover text-white'
                    : 'bg-surface hover:bg-surface-hover text-muted-foreground border border-border'
                }`}
                data-testid={`toggle-flag-${flag.key}`}
              >
                {flag.enabled ? 'ACTIVE' : 'OFF'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
