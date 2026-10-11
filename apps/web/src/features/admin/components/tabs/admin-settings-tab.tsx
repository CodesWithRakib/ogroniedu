'use client';

import type { AdminSystemSettingItem } from '../../types/admin.types';

export function AdminSettingsTab({ settings }: { settings: AdminSystemSettingItem[] }) {
  return (
    <div className="space-y-4" data-testid="settings-tab-content">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-base font-bold text-slate-200">System Reference Settings</h3>
        <div className="divide-y divide-slate-800">
          {settings.map((setting) => (
            <div key={setting.key} className="py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-200 font-mono">{setting.key}</p>
                <p className="text-xs text-slate-400">
                  {setting.description || 'Configurable operational threshold'}
                </p>
              </div>
              <span className="text-xs font-mono bg-slate-950 px-3 py-1 rounded border border-slate-800 text-teal-300">
                {JSON.stringify(setting.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
