import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProgressGaugeCard } from '../src/components/dashboard/ProgressGaugeCard';
import {
  WeeklyActivityChart,
  type DayActivity,
} from '../src/components/dashboard/WeeklyActivityChart';
import { StudyTimeTrackerCard } from '../src/components/dashboard/StudyTimeTrackerCard';

/**
 * These widgets render on the student/tutor/guardian dashboards, the study
 * tracker, and the progress report page — previously no test imported them.
 * Rendered via react-dom/server so the assertions read the real markup.
 */
describe('Feature #7: Progress & Dashboard Widgets', () => {
  describe('ProgressGaugeCard', () => {
    it('should derive the semi-circle arc offset from the percentage prop', () => {
      const html = renderToStaticMarkup(
        React.createElement(ProgressGaugeCard, {
          locale: 'en',
          percentage: 74,
          completedLabel: 'Done',
          inProgressLabel: 'Active',
          pendingLabel: 'Queued',
        }),
      );

      const circumference = Math.PI * 64;
      const expectedOffset = circumference - (74 / 100) * circumference;

      expect(html).toContain('74%');
      expect(html).toContain(`stroke-dasharray="${circumference}"`);
      expect(html).toContain(`stroke-dashoffset="${expectedOffset}"`);
      expect(html).toContain('Done');
      expect(html).toContain('Active');
      expect(html).toContain('Queued');
    });

    it('should render an empty arc track at 0 percent and a full arc at 100 percent', () => {
      const emptyHtml = renderToStaticMarkup(
        React.createElement(ProgressGaugeCard, { locale: 'en', percentage: 0 }),
      );
      const fullHtml = renderToStaticMarkup(
        React.createElement(ProgressGaugeCard, { locale: 'en', percentage: 100 }),
      );

      const circumference = Math.PI * 64;
      expect(emptyHtml).toContain(`stroke-dashoffset="${circumference}"`);
      expect(fullHtml).toContain('stroke-dashoffset="0"');
      expect(emptyHtml).toContain('0%');
      expect(fullHtml).toContain('100%');
    });
  });

  describe('WeeklyActivityChart', () => {
    it('should render one column per day with the peak day labelled', () => {
      const html = renderToStaticMarkup(React.createElement(WeeklyActivityChart, { locale: 'en' }));

      // Seven default day columns, each with a localized full-day title.
      for (const fullDay of [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ]) {
        expect(html).toContain(`title="${fullDay}"`);
      }
      // The 88% peak day surfaces its percentage tooltip.
      expect(html).toContain('88%');
      expect(html).toContain('This Week');
    });

    it('should clamp custom bar heights between 15 and 100 percent', () => {
      const data: DayActivity[] = [
        { day: 'S', fullDayBn: 'রবিবার', fullDayEn: 'Sunday', percentage: 4, count: 0 },
        { day: 'M', fullDayBn: 'সোমবার', fullDayEn: 'Monday', percentage: 140, count: 9 },
      ];

      const html = renderToStaticMarkup(
        React.createElement(WeeklyActivityChart, { locale: 'en', data }),
      );

      expect(html).toContain('height:15%');
      expect(html).toContain('height:100%');
      // Anything >= 85 gets the tooltip badge.
      expect(html).toContain('140%');
    });
  });

  describe('StudyTimeTrackerCard', () => {
    it('should render the tracked duration and running controls', () => {
      const html = renderToStaticMarkup(
        React.createElement(StudyTimeTrackerCard, {
          locale: 'en',
          title: 'Focus Jam',
          subtitle: 'Deep work',
        }),
      );

      // 5048s initial state: 01:24:08
      expect(html).toContain('01:24:08');
      expect(html).toContain('Focus Jam');
      expect(html).toContain('Deep work');
      expect(html).toContain('aria-label="Pause timer"');
      expect(html).toContain('aria-label="Reset timer"');
    });

    it('should render localized defaults without crashing for Bengali', () => {
      const html = renderToStaticMarkup(
        React.createElement(StudyTimeTrackerCard, { locale: 'bn' }),
      );

      expect(html).toContain('01:24:08');
      expect(html).toContain('aria-label="Reset timer"');
    });
  });
});
