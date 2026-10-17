'use client';

import React, { use } from 'react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { GuardianChildrenManager } from '@/components/guardian/GuardianChildrenManager';
import { LoadingSpinner } from '@/components/ui';
import {
  useGetLinkedChildrenQuery,
  useRegisterChildMutation,
  useLinkChildRequestMutation,
  useRevokeChildLinkMutation,
} from '@/store/services/guardians-api';
import {
  useGetEducationLevelsQuery,
  useGetCurriculaQuery,
  useGetStreamsQuery,
  useGetInstitutionsQuery,
} from '@/store/services/taxonomy-api';
import type { Locale } from '@/lib/i18n';

export default function GuardianChildrenRoute({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;

  const { data: childrenData, isLoading, refetch } = useGetLinkedChildrenQuery();
  const { data: levelsEnvelope } = useGetEducationLevelsQuery();
  const { data: curriculaEnvelope } = useGetCurriculaQuery();
  const { data: streamsEnvelope } = useGetStreamsQuery();
  const { data: institutionsEnvelope } = useGetInstitutionsQuery();
  const [registerChild] = useRegisterChildMutation();
  const [linkChild] = useLinkChildRequestMutation();
  const [revokeLink] = useRevokeChildLinkMutation();

  const educationLevels = React.useMemo(() => levelsEnvelope?.data || [], [levelsEnvelope]);
  const curricula = React.useMemo(() => curriculaEnvelope?.data || [], [curriculaEnvelope]);
  const streams = React.useMemo(() => streamsEnvelope?.data || [], [streamsEnvelope]);
  const institutions = React.useMemo(
    () => institutionsEnvelope?.data || [],
    [institutionsEnvelope],
  );

  const mappedChildren = React.useMemo(() => {
    if (!childrenData) return [];
    return childrenData.map((c) => ({
      linkId: c.linkId,
      studentId: c.studentId,
      displayName: c.displayName,
      relationshipType: c.relationshipType,
      status: c.status,
      consentPolicyVersion: c.consentPolicyVersion,
      consentRecordedAt: c.consentRecordedAt,
      isMinor: c.isMinor,
      institutionName: c.institutionName,
      educationLevelName: c.educationLevelName,
    }));
  }, [childrenData]);

  const handleRegisterChild = React.useCallback(
    async (data: {
      displayName: string;
      dateOfBirth?: string;
      gender?: string;
      institutionName?: string;
      educationLevelId?: string;
      curriculumId?: string;
      stream?: string;
      learningGoals?: string;
      email?: string;
      phone?: string;
      relationshipType: string;
      consentPolicyVersion: string;
      consentAgreed: boolean;
    }) => {
      await registerChild(data).unwrap();
      refetch();
    },
    [registerChild, refetch],
  );

  const handleAddChild = React.useCallback(
    async (data: {
      studentIdentifier: string;
      relationshipType: string;
      consentPolicyVersion: string;
      consentAgreed: boolean;
    }) => {
      await linkChild(data).unwrap();
      refetch();
    },
    [linkChild, refetch],
  );

  const handleRevokeLink = React.useCallback(
    async (studentId: string) => {
      await revokeLink({ studentId, reason: 'guardian_requested' }).unwrap();
      refetch();
    },
    [revokeLink, refetch],
  );

  return (
    <DashboardShell
      locale={locale}
      title={locale === 'bn' ? 'সন্তান ও শিক্ষার্থী প্রোফাইল' : 'Children Profiles'}
      subtitle={
        locale === 'bn'
          ? 'যুক্ত থাকা সন্তানের প্রোফাইল, অভিভাবকত্ব এবং নিরাপত্তা সম্মতি পরিচালনা করুন'
          : 'Manage linked children, guardian relationships and safety consent'
      }
      role="guardian"
    >
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <LoadingSpinner className="h-8 w-8 text-primary" />
          <p className="text-xs text-muted-foreground animate-pulse">
            {locale === 'bn' ? 'সন্তানদের প্রোফাইল লোড হচ্ছে...' : 'Loading children profiles...'}
          </p>
        </div>
      ) : (
        <GuardianChildrenManager
          locale={locale}
          initialChildren={mappedChildren}
          educationLevels={educationLevels.length > 0 ? educationLevels : undefined}
          curricula={curricula.length > 0 ? curricula : undefined}
          streams={streams.length > 0 ? streams : undefined}
          institutions={institutions.length > 0 ? institutions : undefined}
          onRegisterChild={handleRegisterChild}
          onAddChild={handleAddChild}
          onRevokeLink={handleRevokeLink}
        />
      )}
    </DashboardShell>
  );
}
