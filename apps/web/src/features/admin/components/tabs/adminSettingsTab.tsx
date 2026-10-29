'use client';

import type { AdminSystemSettingItem } from '../../types/admin.types';

export function AdminSettingsTab({ settings }: { settings: AdminSystemSettingItem[] }) {
  return (
    <div className="flex flex-col gap-4" data-testid="settings-tab-content">
      <div className="bg-card border border-border rounded-xl p-5 sm:p-6 flex flex-col gap-4">
        <h3 className="text-base font-bold text-foreground">System Reference Settings</h3>
        <div className="divide-y divide-border/60">
          {settings.map((setting) => (
            <div key={setting.key} className="py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground font-mono">{setting.key}</p>
                <p className="text-xs text-muted-foreground">
                  {setting.description || 'Configurable operational threshold'}
                </p>
              </div>
              <span className="text-xs font-mono bg-surface px-3 py-1 rounded-lg border border-border text-primary ">
                {JSON.stringify(setting.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
