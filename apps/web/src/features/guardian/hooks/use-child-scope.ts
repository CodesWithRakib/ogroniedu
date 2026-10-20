'use client';

import React from 'react';
import { useAppSelector } from '@/store';
import { useGetLinkedChildrenQuery } from '@/store/services/guardians-api';

/**
 * Shared guardian child scope.
 *
 * The selected child is only a *request* filter. The API revalidates every
 * supplied studentId against active guardian links, and RTK Query includes the
 * id in the cache key so one child's bookings can never be served for another.
 */
export function useChildScope() {
  const user = useAppSelector((state) => state.auth.user);
  const isGuardian = Boolean(user?.roles?.includes('guardian'));
  const { data, isLoading } = useGetLinkedChildrenQuery(undefined, {
    skip: !isGuardian,
  });

  const children = React.useMemo(
    () => (data ?? []).filter((child) => child.status === 'active'),
    [data],
  );

  const [selectedStudentId, setSelectedStudentId] = React.useState<string | undefined>();

  React.useEffect(() => {
    if (!isGuardian) {
      setSelectedStudentId(undefined);
      return;
    }
    if (children.length === 0) {
      setSelectedStudentId(undefined);
      return;
    }
    if (!selectedStudentId || !children.some((child) => child.studentId === selectedStudentId)) {
      setSelectedStudentId(children[0].studentId);
    }
  }, [children, isGuardian, selectedStudentId]);

  return {
    isGuardian,
    children,
    isLoading,
    selectedStudentId: isGuardian ? selectedStudentId : undefined,
    setSelectedStudentId,
    /** Guardians with zero active links fall back to their own account scope. */
    hasChildScope: isGuardian && children.length > 0,
  };
}
