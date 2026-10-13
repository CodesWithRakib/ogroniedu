import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { AdminSupportTab } from '../src/features/admin/components/tabs/adminSupportTab';
import { mapSupportTickets } from '../src/features/admin/utils/admin-mappers';
import { parseItem } from '../src/lib/api/parse';
import type { PlatformStats } from '../src/store/services/public-api';

describe('Support triage + platform stats (Phase 22 H-3)', () => {
  it('maps ticket rows with safe status fallback', () => {
    const rows = mapSupportTickets([
      {
        id: 't1',
        name: 'Rahim',
        email: 'r@x.com',
        message: 'Help me',
        status: 'in_review',
        createdAt: '2026-01-01',
      },
      { id: 't2', status: 'bogus-status' },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0].status).toBe('in_review');
    expect(rows[0].phoneE164).toBeNull();
    expect(rows[1].status).toBe('submitted');
    expect(rows[1].name).toBe('—');
  });

  it('instantiates the support tab with triage wiring', () => {
    const onUpdateStatus = vi.fn();
    const el = React.createElement(AdminSupportTab, {
      tickets: [
        {
          id: 't1',
          name: 'Rahim',
          email: 'r@x.com',
          phoneE164: null,
          category: 'general',
          message: 'Help me',
          status: 'submitted',
          reporterUserId: null,
          resolutionNotes: null,
          createdAt: '2026-01-01',
        },
      ],
      onUpdateStatus,
    });
    expect(el).toBeDefined();
    expect(el.props.tickets).toHaveLength(1);
  });

  it('parses the platform stats envelope', () => {
    const stats = parseItem<PlatformStats>({
      success: true,
      data: {
        verifiedTutors: 128,
        activeStudents: 940,
        completedSessions: 12,
        averageRating: null,
      },
    });
    expect(stats.verifiedTutors).toBe(128);
    expect(stats.averageRating).toBeNull();
  });
});
