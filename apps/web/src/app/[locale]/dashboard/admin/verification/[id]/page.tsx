'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui';

export default function AdminTutorVerificationDetailRoute({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const resolved = use(params);
  const locale = resolved.locale === 'en' ? 'en' : 'bn';
  const router = useRouter();

  useEffect(() => {
    router.replace(`/${locale}/dashboard/admin/users/tutors/${resolved.id}`);
  }, [locale, resolved.id, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <LoadingSpinner />
    </div>
  );
}
