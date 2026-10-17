'use client';

import React from 'react';
import { useAppSelector } from '@/store';
import {
  useGetLinkedChildrenQuery,
  useLinkChildRequestMutation,
  useRevokeChildLinkMutation,
} from '@/store/services/guardians-api';
import { useGetBookingRequestsQuery } from '@/store/services/bookings-api';
import { useGetSessionsQuery } from '@/store/services/sessions-api';

import type { LinkedChild } from '@/store/services/guardians-api';

const EMPTY_CHILDREN: LinkedChild[] = [];

/** Feature-level guardian hook: linked children, booking/session counts, and child-link actions. */
export function useGuardianDashboard() {
  const user = useAppSelector((s) => s.auth.user);
  const childrenQuery = useGetLinkedChildrenQuery();
  const requests = useGetBookingRequestsQuery();
  const sessions = useGetSessionsQuery();
  const [linkChild] = useLinkChildRequestMutation();
  const [revokeLink] = useRevokeChildLinkMutation();
  const [activeChildId, setActiveChildId] = React.useState<string | null>(null);

  const children = childrenQuery.data ?? EMPTY_CHILDREN;
  const activeChild = children.find((c) => c.studentId === activeChildId) ?? children[0] ?? null;

  const firstChildId = children[0]?.studentId;
  React.useEffect(() => {
    if (!activeChildId && firstChildId) {
      setActiveChildId(firstChildId);
    }
  }, [firstChildId, activeChildId]);

  const handleAddChild = React.useCallback(
    async (data: {
      studentIdentifier: string;
      relationshipType: string;
      consentPolicyVersion: string;
      consentAgreed: boolean;
    }) => {
      await linkChild(data).unwrap();
      childrenQuery.refetch();
    },
    [linkChild, childrenQuery],
  );

  const handleRevokeLink = React.useCallback(
    async (studentId: string) => {
      await revokeLink({ studentId, reason: 'guardian_requested' }).unwrap();
      childrenQuery.refetch();
    },
    [revokeLink, childrenQuery],
  );

  return {
    user,
    children,
    activeChild,
    childrenQuery,
    requests,
    sessions,
    setActiveChildId,
    handleAddChild,
    handleRevokeLink,
  };
}
