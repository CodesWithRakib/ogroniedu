import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BetaFeedbackModal } from '../src/components/feedback/BetaFeedbackModal';

describe('BetaFeedbackModal Component Tests (Phase 12)', () => {
  it('renders trigger button in Bangla locale without hydration errors', () => {
    const html = renderToStaticMarkup(React.createElement(BetaFeedbackModal, { locale: 'bn' }));

    expect(html).toContain('মতামত দিন (Beta)');
    expect(html).toContain('aria-label="বেটা মতামত পাঠান"');
    expect(html).toContain('data-testid="beta-feedback-trigger"');
  });

  it('renders trigger button in English locale with appropriate aria labels', () => {
    const html = renderToStaticMarkup(React.createElement(BetaFeedbackModal, { locale: 'en' }));

    expect(html).toContain('Feedback (Beta)');
    expect(html).toContain('aria-label="Send Beta Feedback"');
  });
});
