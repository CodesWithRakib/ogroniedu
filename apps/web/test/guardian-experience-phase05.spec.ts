import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GuardianChildProfileSwitcher } from '../src/features/guardian/components/GuardianChildProfileSwitcher';
import { GuardianChildSafetyRadar } from '../src/features/guardian/components/GuardianChildSafetyRadar';
import { GuardianEscrowSafetyCard } from '../src/features/guardian/components/GuardianEscrowSafetyCard';
import { toGuardianRelationship } from '../src/components/guardian/guardian-children.types';
import type { LinkedChild } from '../src/store/services/guardians-api';

describe('Phase 5 — Guardian Experience & Child Supervision Components', () => {
  describe('GuardianChildProfileSwitcher', () => {
    it('renders empty child state prompting to link a child profile', () => {
      const html = renderToStaticMarkup(
        React.createElement(GuardianChildProfileSwitcher, {
          locale: 'bn',
          childrenList: [],
          activeChildId: null,
          onSelectChild: vi.fn(),
        }),
      );

      expect(html).toContain('কোনো সন্তান প্রোফাইল যুক্ত নেই');
      expect(html).toContain('সন্তান যোগ করুন');
      expect(html).toContain('/bn/dashboard/guardian/children');
    });

    it('renders child list pills with name and academic details', () => {
      const mockChildren: LinkedChild[] = [
        {
          linkId: 'link-101',
          studentId: 'stud-101',
          displayName: 'আবরার আহমেদ (Abrar Ahmed)',
          relationshipType: 'father',
          status: 'active',
          consentPolicyVersion: 'v1.0-bd-minor-consent',
          consentRecordedAt: '2026-10-15T00:00:00.000Z',
          isMinor: true,
          institutionName: 'নটর ডেম কলেজ',
          educationLevelName: 'একাদশ শ্রেণি (এইচএসসি)',
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(GuardianChildProfileSwitcher, {
          locale: 'bn',
          childrenList: mockChildren,
          activeChildId: 'stud-101',
          onSelectChild: vi.fn(),
        }),
      );

      expect(html).toContain('আবরার আহমেদ (Abrar Ahmed)');
      expect(html).toContain('একাদশ শ্রেণি (এইচএসসি)');
      expect(html).toContain('নটর ডেম কলেজ');
      expect(html).toContain('/bn/dashboard/guardian/children');
    });
  });

  describe('GuardianChildSafetyRadar', () => {
    it('renders child safeguarding radar, verified NID status, and emergency helplines', () => {
      const html = renderToStaticMarkup(
        React.createElement(GuardianChildSafetyRadar, {
          locale: 'bn',
          childName: 'আবরার আহমেদ',
          tutorVerified: true,
        }),
      );

      expect(html).toContain('সেফগার্ড রেডার ও জরুরি সহায়তা');
      expect(html).toContain('১০০% জাতীয় পরিচয়পত্র ও সনদ যাচাইকৃত');
      expect(html).toContain('1098');
      expect(html).toContain('999');
      expect(html).toContain('/bn/safety');
    });

    it('renders English localization correctly with safety guidelines link', () => {
      const html = renderToStaticMarkup(
        React.createElement(GuardianChildSafetyRadar, {
          locale: 'en',
          childName: 'Abrar Ahmed',
          tutorVerified: true,
        }),
      );

      expect(html).toContain('Safety Radar &amp; Direct Helplines');
      expect(html).toContain('100% NID &amp; Background Checked');
      expect(html).toContain('1098');
      expect(html).toContain('999');
      expect(html).toContain('/en/safety');
    });
  });

  describe('GuardianEscrowSafetyCard', () => {
    it('renders escrow safety release dashboard with held and released amounts', () => {
      const html = renderToStaticMarkup(
        React.createElement(GuardianEscrowSafetyCard, {
          locale: 'bn',
          heldEscrowBdt: 8500,
          releasedBdt: 12000,
          pendingMilestonesCount: 1,
          nextMilestoneAmountBdt: 4500,
          nextMilestoneTutorName: 'রাশেদ করিম',
          nextMilestoneSubject: 'পদার্থবিজ্ঞান',
        }),
      );

      expect(html).toContain('অগ্রণী এসক্রো ও পেমেন্ট সুরক্ষা');
      expect(html).toContain('৮৫০০');
      expect(html).toContain('১২০০০');
      expect(html).toContain('৪৫০০');
      expect(html).toContain('রাশেদ করিম');
      expect(html).toContain('পদার্থবিজ্ঞান');
      expect(html).toContain('/bn/safety');
    });
  });

  describe('Guardian Relationship & Minor Consent Invariants', () => {
    it('normalizes valid guardianship relationship types correctly with safe default', () => {
      expect(toGuardianRelationship('father')).toBe('father');
      expect(toGuardianRelationship('mother')).toBe('mother');
      expect(toGuardianRelationship('legal_guardian')).toBe('legal_guardian');
      expect(toGuardianRelationship('invalid_type')).toBe('father');
    });
  });
});
