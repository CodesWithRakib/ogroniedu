import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TutorSearchCatalog } from '../src/features/tutor-discovery';
import { GuardianChildrenManager } from '../src/components/guardian/GuardianChildrenManager';
import { SessionScheduleCalendar } from '../src/components/scheduling/SessionScheduleCalendar';

describe('Real-data defaults (no fabricated business records)', () => {
  it('tutor catalog renders empty state without demo tutors', () => {
    const html = renderToStaticMarkup(React.createElement(TutorSearchCatalog, { locale: 'bn' }));
    expect(html).not.toContain('Rahat Mahmud');
    expect(html).not.toContain('Nusrat Jahan');
    expect(html).not.toContain('Tanzimul Kabir');
  });

  it('guardian manager renders empty state without demo child', () => {
    const html = renderToStaticMarkup(
      React.createElement(GuardianChildrenManager, { locale: 'en' }),
    );
    expect(html).not.toContain('Tanvir Hossain');
    expect(html).not.toContain('demo-link-1');
  });

  it('session calendar renders empty state without demo classes', () => {
    const html = renderToStaticMarkup(
      React.createElement(SessionScheduleCalendar, { locale: 'bn' }),
    );
    expect(html).not.toContain('room-math-101');
    expect(html).not.toContain('Rahat Mahmud');
  });
});
