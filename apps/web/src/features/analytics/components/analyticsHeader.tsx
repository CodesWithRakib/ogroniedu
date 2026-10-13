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
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border transition-colors">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{t('subtitle')}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div
          className="flex bg-surface-muted p-1 rounded-xl border border-border text-xs font-semibold shadow-2xs"
          role="group"
        >
          {PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => onPreset(preset)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedPreset === preset
                  ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
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
            className="px-3 py-1.5 bg-card hover:bg-surface-hover text-foreground border border-border rounded-xl text-xs font-semibold shadow-2xs transition-colors"
            data-testid="export-csv-btn"
          >
            📊 {t('exportCsv')}
          </button>
          <button
            onClick={onExportJson}
            className="px-3 py-1.5 bg-card hover:bg-surface-hover text-foreground border border-border rounded-xl text-xs font-semibold shadow-2xs transition-colors"
            data-testid="export-json-btn"
          >
            📄 {t('exportJson')}
          </button>
        </div>
      </div>
    </div>
  );
}
