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
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-base font-bold text-slate-200">Feature Flags &amp; Canary Toggles</h3>
        <div className="divide-y divide-slate-800">
          {featureFlags.map((flag) => (
            <div
              key={flag.key}
              className="py-3 flex items-center justify-between"
              data-testid={`flag-row-${flag.key}`}
            >
              <div>
                <p className="text-sm font-semibold text-slate-200 font-mono">{flag.key}</p>
                <p className="text-xs text-slate-400">
                  Status: {flag.enabled ? 'ENABLED' : 'DISABLED'}
                </p>
              </div>
              <button
                disabled={!isSuperAdmin}
                onClick={() => onToggle(flag.key, !flag.enabled)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  flag.enabled
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
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
