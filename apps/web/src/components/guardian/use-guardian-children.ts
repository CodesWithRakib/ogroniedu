'use client';

import React, { useState } from 'react';
import { getDictionary, type Locale } from '@/lib/i18n';
import type {
  ChildItem,
  GuardianChildrenCallbacks,
  GuardianRelationship,
} from './guardian-children.types';

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
 * Guardian children state + link/register/revoke flows.
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
  const [activeTab, setActiveTab] = useState<'register' | 'link'>('register');

  // Form state for registering new child
  const [regName, setRegName] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regGender, setRegGender] = useState<'male' | 'female' | ''>('male');
  const [regInstitution, setRegInstitution] = useState('');
  const [regEducationLevelId, setRegEducationLevelId] = useState('');
  const [regCurriculumId, setRegCurriculumId] = useState('');
  const [regStream, setRegStream] = useState('');
  const [regLearningGoals, setRegLearningGoals] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');

  // Form state for linking existing student
  const [identifier, setIdentifier] = useState('');

  // Shared state
  const [relationship, setRelationship] = useState<GuardianRelationship>('father');
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { onAddChild, onRegisterChild, onRevokeLink } = callbacks;

  async function handleLinkChild(e: React.FormEvent) {
    e.preventDefault();
    const fieldError = validateLinkChildFields({ identifier, consentAgreed });
    if (fieldError) {
      setErrorMessage(messageFor(fieldError, locale));
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (onAddChild) {
        await onAddChild({
          studentIdentifier: identifier.trim(),
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

  async function handleRegisterChild(e: React.FormEvent) {
    e.preventDefault();
    if (!regName.trim() || regName.trim().length < 2) {
      setErrorMessage(
        locale === 'bn'
          ? 'সন্তানের পুরো নাম কমপক্ষে ২ অক্ষরের হতে হবে।'
          : 'Child full name must be at least 2 characters.',
      );
      return;
    }
    if (!consentAgreed) {
      setErrorMessage(
        locale === 'bn'
          ? 'নীতিমালার অধীনে অভিভাবকের সম্মতি আবশ্যক।'
          : 'Guardian consent agreement is mandatory.',
      );
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (onRegisterChild) {
        await onRegisterChild({
          displayName: regName.trim(),
          dateOfBirth: regDob || undefined,
          gender: regGender || undefined,
          institutionName: regInstitution.trim() || undefined,
          educationLevelId: regEducationLevelId || undefined,
          curriculumId: regCurriculumId || undefined,
          stream: regStream.trim() || undefined,
          learningGoals: regLearningGoals.trim() || undefined,
          phone: regPhone.trim() || undefined,
          email: regEmail.trim() || undefined,
          relationshipType: relationship,
          consentPolicyVersion: 'v1.0-bd-minor-consent',
          consentAgreed: true,
        });
      } else if (onAddChild) {
        // Fallback if only onAddChild is provided
        await onAddChild({
          studentIdentifier: regPhone.trim() || regEmail.trim() || regName.trim(),
          relationshipType: relationship,
          consentPolicyVersion: 'v1.0-bd-minor-consent',
          consentAgreed,
        });
      } else {
        throw new Error(
          locale === 'bn' ? 'সন্তান যুক্ত করতে লগইন করুন।' : 'Sign in to register a child.',
        );
      }

      // Reset fields
      setRegName('');
      setRegDob('');
      setRegGender('male');
      setRegInstitution('');
      setRegEducationLevelId('');
      setRegCurriculumId('');
      setRegStream('');
      setRegLearningGoals('');
      setRegPhone('');
      setRegEmail('');
      setConsentAgreed(false);
      setIsModalOpen(false);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to register child profile');
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
    setSuccessMessage(null);
  }

  return {
    dict,
    children,
    isModalOpen,
    setIsModalOpen,
    activeTab,
    setActiveTab,
    // Register child fields
    regName,
    setRegName,
    regDob,
    setRegDob,
    regGender,
    setRegGender,
    regInstitution,
    setRegInstitution,
    regEducationLevelId,
    setRegEducationLevelId,
    regCurriculumId,
    setRegCurriculumId,
    regStream,
    setRegStream,
    regLearningGoals,
    setRegLearningGoals,
    regPhone,
    setRegPhone,
    regEmail,
    setRegEmail,
    // Link child fields
    identifier,
    setIdentifier,
    // Shared
    relationship,
    setRelationship,
    consentAgreed,
    setConsentAgreed,
    loading,
    errorMessage,
    successMessage,
    handleLinkChild,
    handleRegisterChild,
    handleRevoke,
    closeModal,
  };
}
