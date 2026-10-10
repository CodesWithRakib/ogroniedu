'use client';

import React, { use } from 'react';
import { Navbar } from '@/components/shell/Navbar';
import { Footer } from '@/components/shell/Footer';
import { AdminDashboardView } from '@/components/admin/AdminDashboardView';
import { type Locale } from '@/lib/i18n';

interface AdminPageProps {
  params: Promise<{ locale: string }>;
}

export default function AdminPage({ params }: AdminPageProps) {
  const resolvedParams = use(params);
  const locale = (resolvedParams.locale === 'en' ? 'en' : 'bn') as Locale;

  const mockAdminUser = {
    id: '00000000-0000-0000-0000-000000000001',
    displayName: 'Super Admin',
    roles: ['super_admin', 'admin'],
  };

  const sampleMetrics = {
    pendingTutorVerifications: 3,
    activeReplacementCases: 2,
    openSafetyReports: 1,
    activeBookingsCount: 18,
    totalRegisteredUsers: 145,
  };

  const sampleUsers = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      displayName: 'Super Admin',
      email: 'superadmin@ogroni.edu.bd',
      phoneE164: '+8801700000001',
      status: 'active' as const,
      roles: ['super_admin', 'admin'],
      createdAt: '2026-01-10T10:00:00Z',
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      displayName: 'Tutor Nusrat Jahan',
      email: 'nusrat.tutor@ogroni.edu.bd',
      phoneE164: '+8801700000002',
      status: 'active' as const,
      roles: ['tutor'],
      createdAt: '2026-01-15T12:00:00Z',
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      displayName: 'Kazi Mahfuzur Rahman',
      email: 'guardian.kazi@ogroni.edu.bd',
      phoneE164: '+8801700000003',
      status: 'active' as const,
      roles: ['guardian'],
      createdAt: '2026-02-01T14:30:00Z',
    },
  ];

  const sampleBookings = [
    {
      id: '00000000-0000-4000-8000-000000000001',
      studentName: 'Zafir Rahman',
      tutorName: 'Nusrat Jahan (BUET)',
      subjectName: 'Physics (Class 10)',
      status: 'confirmed' as const,
      priceBdt: 1200,
      mode: 'online' as const,
    },
    {
      id: '00000000-0000-4000-8000-000000000002',
      studentName: 'Tasnim Ahmed',
      tutorName: 'Rafiqul Islam (DU)',
      subjectName: 'Higher Mathematics',
      status: 'completed' as const,
      priceBdt: 1500,
      mode: 'in_person' as const,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <Navbar locale={locale} />
      <main className="flex-1">
        <AdminDashboardView
          currentUser={mockAdminUser}
          metrics={sampleMetrics}
          initialUsers={sampleUsers}
          initialBookings={sampleBookings}
        />
      </main>
      <Footer locale={locale} />
    </div>
  );
}
