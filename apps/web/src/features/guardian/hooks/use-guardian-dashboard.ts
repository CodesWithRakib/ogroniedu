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

/** Feature-level guardian hook: linked children, booking/session counts, and child-link actions. */
export function useGuardianDashboard() {
  const user = useAppSelector((s) => s.auth.user);
  const childrenQuery = useGetLinkedChildrenQuery();
  const requests = useGetBookingRequestsQuery();
  const sessions = useGetSessionsQuery();
  const [linkChild] = useLinkChildRequestMutation();
  const [revokeLink] = useRevokeChildLinkMutation();
  const [activeChildId, setActiveChildId] = React.useState<string | null>(null);

  const children = childrenQuery.data ?? [];
  const activeChild = children.find((c) => c.studentId === activeChildId) ?? children[0] ?? null;

  React.useEffect(() => {
    if (!activeChildId && children[0]) setActiveChildId(children[0].studentId);
  }, [children, activeChildId]);

  async function handleAddChild(data: {
    studentIdentifier: string;
    relationshipType: string;
    consentPolicyVersion: string;
    consentAgreed: boolean;
  }) {
    await linkChild(data).unwrap();
    childrenQuery.refetch();
  }

  async function handleRevokeLink(studentId: string) {
    await revokeLink({ studentId, reason: 'guardian_requested' }).unwrap();
    childrenQuery.refetch();
  }

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
