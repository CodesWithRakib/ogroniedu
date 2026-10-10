'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';

export interface AnalyticsOperationalData {
  timeWindow: {
    startDate: string;
    endDate: string;
  };
  conversion: {
    totalRequests: number;
    confirmedBookings: number;
    cancelledRequests: number;
    declinedRequests: number;
    conversionRate: number;
  };
  sessions: {
    totalSessions: number;
    completedSessions: number;
    cancelledSessions: number;
    noShowSessions: number;
    scheduledSessions: number;
    completionRate: number;
    sessionCancellationRate: number;
    noShowRate: number;
  };
  financials: {
    grossMerchandiseValueBdt: number;
    totalRefundedBdt: number;
    netProcessedVolumeBdt: number;
    platformCommissionRevenueBdt: number;
    refundRate: number;
    successfulOrdersCount: number;
    refundsCount: number;
  };
  trustAndQuality: {
    averageRating: number;
    totalReviews: number;
    punctualityRating: number;
    teachingClarityRating: number;
    subjectMasteryRating: number;
    replacementCasesCount: number;
    replacementRate: number;
    safetyReportsCount: number;
    criticalSafetyCount: number;
  };
  retention: {
    totalUniqueLearners: number;
    repeatLearners: number;
    retentionRate: number;
  };
  trends: Array<{
    date: string;
    requests: number;
    confirmed: number;
  }>;
  gateways?: Array<{
    provider: string;
    volumeBdt: number;
    ordersCount: number;
  }>;
}

export interface AnalyticsDashboardViewProps {
  initialData?: AnalyticsOperationalData;
  onDateRangeChange?: (rangePreset: '7d' | '30d' | '90d') => Promise<void>;
}

export function AnalyticsDashboardView({
  initialData = {
    timeWindow: {
      startDate: '2026-01-01T00:00:00Z',
      endDate: '2026-01-31T23:59:59Z',
    },
    conversion: {
      totalRequests: 120,
      confirmedBookings: 96,
      cancelledRequests: 16,
      declinedRequests: 8,
      conversionRate: 80.0,
    },
    sessions: {
      totalSessions: 240,
      completedSessions: 222,
      cancelledSessions: 12,
      noShowSessions: 6,
      scheduledSessions: 0,
      completionRate: 92.5,
      sessionCancellationRate: 5.0,
      noShowRate: 2.5,
    },
    financials: {
      grossMerchandiseValueBdt: 180000,
      totalRefundedBdt: 9000,
      netProcessedVolumeBdt: 171000,
      platformCommissionRevenueBdt: 14400,
      refundRate: 5.0,
      successfulOrdersCount: 96,
      refundsCount: 4,
    },
    trustAndQuality: {
      averageRating: 4.88,
      totalReviews: 84,
      punctualityRating: 4.9,
      teachingClarityRating: 4.85,
      subjectMasteryRating: 4.92,
      replacementCasesCount: 2,
      replacementRate: 2.08,
      safetyReportsCount: 1,
      criticalSafetyCount: 0,
    },
    retention: {
      totalUniqueLearners: 75,
      repeatLearners: 36,
      retentionRate: 48.0,
    },
    trends: [
      { date: '2026-01-05', requests: 14, confirmed: 11 },
      { date: '2026-01-12', requests: 28, confirmed: 23 },
      { date: '2026-01-19', requests: 35, confirmed: 29 },
      { date: '2026-01-26', requests: 43, confirmed: 33 },
    ],
    gateways: [
      { provider: 'bkash', volumeBdt: 117000, ordersCount: 65 },
      { provider: 'sslcommerz', volumeBdt: 63000, ordersCount: 31 },
    ],
  },
  onDateRangeChange,
}: AnalyticsDashboardViewProps) {
  const t = useTranslations('analytics');
  const tCommon = useTranslations('common');

  const [data, setData] = useState<AnalyticsOperationalData>(initialData);
  const [selectedPreset, setSelectedPreset] = useState<'7d' | '30d' | '90d'>('30d');

  const handlePresetSelect = async (preset: '7d' | '30d' | '90d') => {
    setSelectedPreset(preset);
    if (onDateRangeChange) {
      await onDateRangeChange(preset);
    }
  };

  const handleExportJson = () => {
    const jsonStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', jsonStr);
    dlAnchor.setAttribute('download', `ogroniedu-analytics-${selectedPreset}.json`);
    dlAnchor.click();
  };

  const handleExportCsv = () => {
    const csvRows = [
      ['Metric Category', 'Metric Name', 'Value'],
      ['Conversion', 'Total Booking Requests', data.conversion.totalRequests],
      ['Conversion', 'Confirmed Bookings', data.conversion.confirmedBookings],
      ['Conversion', 'Conversion Rate %', `${data.conversion.conversionRate}%`],
      ['Sessions', 'Total Sessions Scheduled', data.sessions.totalSessions],
      ['Sessions', 'Completed Sessions', data.sessions.completedSessions],
      ['Sessions', 'Completion Rate %', `${data.sessions.completionRate}%`],
      ['Sessions', 'No-Show Rate %', `${data.sessions.noShowRate}%`],
      ['Financials', 'Gross Merchandise Value (BDT)', data.financials.grossMerchandiseValueBdt],
      ['Financials', 'Total Refunded (BDT)', data.financials.totalRefundedBdt],
      ['Financials', 'Net Volume (BDT)', data.financials.netProcessedVolumeBdt],
      ['Financials', 'Platform Revenue (8%) (BDT)', data.financials.platformCommissionRevenueBdt],
      ['Trust & Quality', 'Average Rating', data.trustAndQuality.averageRating],
      [
        'Trust & Quality',
        'Replacement Guarantee Rate %',
        `${data.trustAndQuality.replacementRate}%`,
      ],
      ['Retention', 'Total Unique Learners', data.retention.totalUniqueLearners],
      ['Retention', 'Repeat Learners', data.retention.repeatLearners],
      ['Retention', 'Learner Retention Rate %', `${data.retention.retentionRate}%`],
    ];
    const csvContent = `data:text/csv;charset=utf-8,${csvRows.map((e) => e.join(',')).join('\n')}`;
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', encodeURI(csvContent));
    dlAnchor.setAttribute('download', `ogroniedu-operational-report-${selectedPreset}.csv`);
    dlAnchor.click();
  };

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6"
      data-testid="analytics-dashboard-view"
    >
      {/* 1. Header & Time Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            {t('title')}
          </h1>
          <p className="text-slate-400 text-sm mt-1">{t('subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Preset Buttons */}
          <div
            className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold"
            role="group"
          >
            <button
              onClick={() => handlePresetSelect('7d')}
              className={`px-3 py-1.5 rounded-lg transition ${
                selectedPreset === '7d'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              data-testid="filter-7d-btn"
            >
              {t('filter7Days')}
            </button>
            <button
              onClick={() => handlePresetSelect('30d')}
              className={`px-3 py-1.5 rounded-lg transition ${
                selectedPreset === '30d'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              data-testid="filter-30d-btn"
            >
              {t('filter30Days')}
            </button>
            <button
              onClick={() => handlePresetSelect('90d')}
              className={`px-3 py-1.5 rounded-lg transition ${
                selectedPreset === '90d'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              data-testid="filter-90d-btn"
            >
              {t('filter90Days')}
            </button>
          </div>

          {/* Export Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg text-xs font-medium transition"
              data-testid="export-csv-btn"
            >
              📊 {t('exportCsv')}
            </button>
            <button
              onClick={handleExportJson}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg text-xs font-medium transition"
              data-testid="export-json-btn"
            >
              📄 {t('exportJson')}
            </button>
          </div>
        </div>
      </div>

      {/* Source-of-Truth Note */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center space-x-3 text-xs text-emerald-300">
        <span className="text-base">🛡️</span>
        <span>{t('sourceOfTruthNotice')}</span>
      </div>

      {/* 2. Top-Line KPI Cards Grid */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        data-testid="kpi-cards-grid"
      >
        {/* Booking Conversion Rate */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
          <p className="text-xs font-medium text-slate-400">{t('conversionRate')}</p>
          <div className="flex items-baseline space-x-2">
            <p className="text-3xl font-extrabold text-teal-400" data-testid="kpi-conversion-rate">
              {data.conversion.conversionRate}%
            </p>
            <span className="text-xs text-slate-500">
              ({data.conversion.confirmedBookings} / {data.conversion.totalRequests})
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-teal-500 h-1.5 rounded-full"
              style={{ width: `${Math.min(data.conversion.conversionRate, 100)}%` }}
            />
          </div>
        </div>

        {/* Session Completion Rate */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
          <p className="text-xs font-medium text-slate-400">{t('completionRate')}</p>
          <div className="flex items-baseline space-x-2">
            <p
              className="text-3xl font-extrabold text-indigo-400"
              data-testid="kpi-completion-rate"
            >
              {data.sessions.completionRate}%
            </p>
            <span className="text-xs text-slate-500">
              ({data.sessions.completedSessions} / {data.sessions.totalSessions})
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-500 h-1.5 rounded-full"
              style={{ width: `${Math.min(data.sessions.completionRate, 100)}%` }}
            />
          </div>
        </div>

        {/* Gross Merchandise Value */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
          <p className="text-xs font-medium text-slate-400">{t('grossMerchandiseValue')}</p>
          <div className="flex items-baseline space-x-1">
            <p className="text-3xl font-extrabold text-emerald-400 font-mono" data-testid="kpi-gmv">
              {data.financials.grossMerchandiseValueBdt.toLocaleString()}
            </p>
            <span className="text-xs text-slate-400 font-semibold">BDT</span>
          </div>
          <p className="text-[11px] text-emerald-400/80">
            {t('platformRevenue')}: {data.financials.platformCommissionRevenueBdt.toLocaleString()}{' '}
            BDT
          </p>
        </div>

        {/* Learner Retention Rate */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
          <p className="text-xs font-medium text-slate-400">{t('retentionRate')}</p>
          <div className="flex items-baseline space-x-2">
            <p className="text-3xl font-extrabold text-amber-400" data-testid="kpi-retention-rate">
              {data.retention.retentionRate}%
            </p>
            <span className="text-xs text-slate-500">
              ({data.retention.repeatLearners} repeat / {data.retention.totalUniqueLearners})
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-amber-500 h-1.5 rounded-full"
              style={{ width: `${Math.min(data.retention.retentionRate, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. Operational Funnel & Reliability Detail Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Conversion Funnel Breakdown */}
        <div
          className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4"
          data-testid="conversion-funnel-card"
        >
          <h3 className="text-base font-bold text-slate-200">{t('conversionFunnelTitle')}</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-slate-300 font-medium mb-1">
                <span>{t('totalRequests')}</span>
                <span className="font-bold">{data.conversion.totalRequests}</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                <div className="bg-slate-600 h-full w-full" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-teal-300 font-medium mb-1">
                <span>{t('confirmedBookings')}</span>
                <span className="font-bold">{data.conversion.confirmedBookings}</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-teal-500 h-full"
                  style={{
                    width: `${(data.conversion.confirmedBookings / (data.conversion.totalRequests || 1)) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="flex justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
              <span>
                {t('cancelledRequests')}: {data.conversion.cancelledRequests}
              </span>
              <span>Declined: {data.conversion.declinedRequests}</span>
            </div>
          </div>
        </div>

        {/* Session Reliability & No-Show Matrix */}
        <div
          className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4"
          data-testid="session-reliability-card"
        >
          <h3 className="text-base font-bold text-slate-200">{t('sessionReliabilityTitle')}</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-400">{t('completedSessions')}</p>
              <p className="text-xl font-bold text-indigo-400 mt-1">
                {data.sessions.completedSessions}
              </p>
              <span className="text-[10px] text-slate-500">
                {data.sessions.completionRate}% of total
              </span>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-400">{t('noShowRate')}</p>
              <p className="text-xl font-bold text-amber-400 mt-1">{data.sessions.noShowRate}%</p>
              <span className="text-[10px] text-slate-500">
                {data.sessions.noShowSessions} instances
              </span>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-400">{t('sessionCancellationRate')}</p>
              <p className="text-xl font-bold text-rose-400 mt-1">
                {data.sessions.sessionCancellationRate}%
              </p>
              <span className="text-[10px] text-slate-500">
                {data.sessions.cancelledSessions} cancelled
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Financial & Trust Integrity Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Flow & Net Processed Volume */}
        <div
          className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4"
          data-testid="financial-overview-card"
        >
          <h3 className="text-base font-bold text-slate-200">{t('financialOverviewTitle')}</h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">{t('grossMerchandiseValue')}</span>
              <span className="font-mono font-bold text-slate-200">
                {data.financials.grossMerchandiseValueBdt.toLocaleString()} BDT
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">{t('totalRefunded')}</span>
              <span className="font-mono font-bold text-rose-400">
                - {data.financials.totalRefundedBdt.toLocaleString()} BDT
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">{t('netVolume')}</span>
              <span className="font-mono font-bold text-emerald-400">
                {data.financials.netProcessedVolumeBdt.toLocaleString()} BDT
              </span>
            </div>
            <div className="flex justify-between py-1.5 font-semibold text-slate-300">
              <span>{t('refundRate')}</span>
              <span className="font-mono">{data.financials.refundRate}%</span>
            </div>
          </div>
        </div>

        {/* Trust, Quality & Replacement Guarantee Metrics */}
        <div
          className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4"
          data-testid="trust-quality-card"
        >
          <h3 className="text-base font-bold text-slate-200">{t('qualityTitle')}</h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">{t('averageRating')}</span>
              <span className="font-bold text-amber-400">
                ★ {data.trustAndQuality.averageRating} / 5.0
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">{t('replacementRate')}</span>
              <span className="font-bold text-slate-200">
                {data.trustAndQuality.replacementRate}% (
                {data.trustAndQuality.replacementCasesCount} cases)
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">{t('criticalSafetyIncidents')}</span>
              <span className="font-bold text-rose-400">
                {data.trustAndQuality.criticalSafetyCount} critical alerts
              </span>
            </div>
            <div className="flex justify-between py-1.5 text-slate-400">
              <span>Total Verified Reviews</span>
              <span className="font-semibold text-slate-300">
                {data.trustAndQuality.totalReviews} reviews
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Daily Activity Trend Bar Visuals */}
      {data.trends.length > 0 && (
        <div
          className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4"
          data-testid="trends-card"
        >
          <h3 className="text-base font-bold text-slate-200">{t('trendTitle')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {data.trends.map((point) => (
              <div
                key={point.date}
                className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2"
              >
                <span className="text-[11px] font-mono text-slate-500 block">{point.date}</span>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Requests:</span>
                  <span className="font-bold text-slate-200">{point.requests}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-teal-400">Confirmed:</span>
                  <span className="font-bold text-teal-300">{point.confirmed}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
