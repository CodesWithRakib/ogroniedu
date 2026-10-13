'use client';

import { useTranslations } from 'next-intl';
import type { AnalyticsWindowPreset } from '../hooks/use-analytics-window';

const PRESETS: readonly AnalyticsWindowPreset[] = ['7d', '30d', '90d'];

/** Dashboard header: title, time-window presets, CSV/JSON export actions. */
export function AnalyticsHeader({
  selectedPreset,
  onPreset,
  onExportCsv,
  onExportJson,
}: {
  selectedPreset: AnalyticsWindowPreset;
  onPreset: (preset: AnalyticsWindowPreset) => void;
  onExportCsv: () => void;
  onExportJson: () => void;
}) {
  const t = useTranslations('analytics');
  const presetTestId = {
    '7d': 'filter-7d-btn',
    '30d': 'filter-30d-btn',
    '90d': 'filter-90d-btn',
  } as const;
  const presetLabel = {
    '7d': t('filter7Days'),
    '30d': t('filter30Days'),
    '90d': t('filter90Days'),
  } as const;

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
          {t('title')}
        </h1>
        <p className="text-slate-400 text-sm mt-1">{t('subtitle')}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div
          className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold"
          role="group"
        >
          {PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => onPreset(preset)}
              className={`px-3 py-1.5 rounded-lg transition ${
                selectedPreset === preset
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              data-testid={presetTestId[preset]}
            >
              {presetLabel[preset]}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onExportCsv}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg text-xs font-medium transition"
            data-testid="export-csv-btn"
          >
            📊 {t('exportCsv')}
          </button>
          <button
            onClick={onExportJson}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg text-xs font-medium transition"
            data-testid="export-json-btn"
          >
            📄 {t('exportJson')}
          </button>
        </div>
      </div>
    </div>
  );
}
