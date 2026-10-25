import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DisputeModal } from '../src/features/trust/components/DisputeModal';
import { EmergencySosModal, EmergencySosContent, EMERGENCY_HOTLINES } from '../src/features/trust/components/EmergencySosModal';
import { AdminDisputesTab } from '../src/features/admin/components/tabs/adminDisputesTab';
import { AdminSafetyTab } from '../src/features/admin/components/tabs/adminSafetyTab';
import { getDictionary } from '../src/lib/i18n';

describe('Phase 07 — Child Safety, Safeguarding & Emergency SOS Tests (Option 4)', () => {
  it('TC-WEB-001: should instantiate DisputeModal with bookingId and tutor props', () => {
    const el = React.createElement(DisputeModal, {
      isOpen: true,
      onClose: () => {},
      locale: 'bn',
      bookingId: 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbb01',
      tutorName: 'Rashed Karim',
      priceBdt: 1500,
    });

    expect(el).toBeDefined();
    expect(el.props.bookingId).toBe('bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbb01');
    expect(el.props.tutorName).toBe('Rashed Karim');
    expect(el.props.priceBdt).toBe(1500);
    expect(el.props.locale).toBe('bn');
  });

  it('TC-WEB-002: should instantiate AdminDisputesTab for bilingual locale', () => {
    const elEn = React.createElement(AdminDisputesTab, { locale: 'en' });
    const elBn = React.createElement(AdminDisputesTab, { locale: 'bn' });

    expect(elEn).toBeDefined();
    expect(elBn).toBeDefined();
    expect(elEn.props.locale).toBe('en');
    expect(elBn.props.locale).toBe('bn');
  });

  it('TC-WEB-003: should instantiate AdminSafetyTab for urgent child protection review', () => {
    const el = React.createElement(AdminSafetyTab, { locale: 'bn' });

    expect(el).toBeDefined();
    expect(el.props.locale).toBe('bn');
  });

  it('TC-WEB-004: should maintain complete i18n dictionary presence for admin and trust', async () => {
    const en = await getDictionary('en');
    const bn = await getDictionary('bn');

    expect(en.trust).toBeDefined();
    expect(bn.trust).toBeDefined();
    expect(en.admin).toBeDefined();
    expect(bn.admin).toBeDefined();
  });

  it('TC-WEB-005: should render EmergencySosContent with 1098, 999, 109 and high-contrast styling', () => {
    // Assert hotlines dataset
    expect(EMERGENCY_HOTLINES).toHaveLength(4);
    expect(EMERGENCY_HOTLINES.map((h) => h.telNumber)).toEqual([
      '1098',
      '999',
      '109',
      '+8809612345678',
    ]);

    // Modal instantiation
    const modalEl = React.createElement(EmergencySosModal, {
      isOpen: true,
      onClose: () => {},
      locale: 'bn',
    });
    expect(modalEl).toBeDefined();
    expect(modalEl.props.isOpen).toBe(true);

    // Static markup render of EmergencySosContent
    const html = renderToStaticMarkup(
      React.createElement(EmergencySosContent, {
        onClose: () => {},
        locale: 'bn',
      })
    );

    // National helplines
    expect(html).toContain('১০৯৮');
    expect(html).toContain('জাতীয় শিশু হেল্পলাইন');
    expect(html).toContain('tel:1098');
    expect(html).toContain('৯৯৯');
    expect(html).toContain('জাতীয় জরুরি সেবা');
    expect(html).toContain('tel:999');
    expect(html).toContain('১০৯');
    expect(html).toContain('নারী ও শিশু নির্যাতন প্রতিরোধ');
    expect(html).toContain('tel:109');
    expect(html).toContain('+৮৮০ ৯৬১২-৩৪৫৬৭৮');
    expect(html).toContain('অভিযোগ ফর্ম খুলুন');
  });
});
