'use client';

import React, { useState } from 'react';
import { getDictionary, type Locale } from '@/lib/i18n';
import type {
  ChildItem,
  GuardianChildrenCallbacks,
  GuardianRelationship,
} from './GuardianChildrenManager';

export type LinkChildFieldError = 'IDENTIFIER_REQUIRED' | 'CONSENT_REQUIRED';

/** Pure validation for the link-child form (tested, no React). */
export function validateLinkChildFields(input: {
  identifier: string;
  consentAgreed: boolean;
}): LinkChildFieldError | null {
  if (!input.identifier.trim()) return 'IDENTIFIER_REQUIRED';
  if (!input.consentAgreed) return 'CONSENT_REQUIRED';
  return null;
}

function messageFor(code: LinkChildFieldError, locale: Locale): string {
  if (code === 'IDENTIFIER_REQUIRED') {
    return locale === 'bn' ? 'শিক্ষার্থীর তথ্য আবশ্যক' : 'Student identifier is required';
  }
  return locale === 'bn'
    ? 'নীতিমালার অধীনে অভিভাবকের সম্মতি আবশ্যক'
    : 'Guardian consent agreement is mandatory';
}

/**
 * Guardian children state + link/revoke flows. Rendering stays in
 * GuardianChildrenManager.
 */
export function useGuardianChildren(
  locale: Locale,
  initialChildren: ChildItem[] = [],
  callbacks: GuardianChildrenCallbacks = {},
) {
  const dict = getDictionary(locale);
  const [children, setChildren] = useState<ChildItem[]>(initialChildren || []);

  React.useEffect(() => {
    const next = initialChildren || [];
    setChildren((prev) => {
      if (
        prev.length === next.length &&
        prev.every(
          (p, i) =>
            p.linkId === next[i]?.linkId &&
            p.status === next[i]?.status &&
            p.displayName === next[i]?.displayName &&
            p.studentId === next[i]?.studentId,
        )
      ) {
        return prev;
      }
      return next;
    });
  }, [initialChildren]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [relationship, setRelationship] = useState<GuardianRelationship>('father');
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { onAddChild, onRevokeLink } = callbacks;

  async function handleLinkChild(e: React.FormEvent) {
    e.preventDefault();
    const fieldError = validateLinkChildFields({ identifier, consentAgreed });
    if (fieldError) {
      setErrorMessage(messageFor(fieldError, locale));
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      if (onAddChild) {
        await onAddChild({
          studentIdentifier: identifier,
          relationshipType: relationship,
          consentPolicyVersion: 'v1.0-bd-minor-consent',
          consentAgreed,
        });
      } else {
        throw new Error(
          locale === 'bn' ? 'সন্তান যুক্ত করতে লগইন করুন।' : 'Sign in to link a child.',
        );
      }

      setIdentifier('');
      setConsentAgreed(false);
      setIsModalOpen(false);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to submit link request');
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(studentId: string) {
    if (confirm(dict.guardian.unlinkConfirm)) {
      if (onRevokeLink) {
        await onRevokeLink(studentId);
      }
      setChildren((prev) => prev.filter((c) => c.studentId !== studentId));
    }
  }

  function closeModal() {
    setIsModalOpen(false);
    setErrorMessage(null);
  }

  return {
    dict,
    children,
    isModalOpen,
    setIsModalOpen,
    identifier,
    setIdentifier,
    relationship,
    setRelationship,
    consentAgreed,
    setConsentAgreed,
    loading,
    errorMessage,
    handleLinkChild,
    handleRevoke,
    closeModal,
  };
}
