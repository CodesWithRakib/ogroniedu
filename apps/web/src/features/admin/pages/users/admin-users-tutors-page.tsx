'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { withLocale } from '@/lib/auth';
import { extractExactErrorMessage } from '@/lib/api-error';
import type { Locale } from '@/lib/i18n';
import { useListAllTutorsQuery } from '@/store/services/admin-api';
import { AdminVerificationTab } from '../../components/tabs/adminVerificationTab';

interface TutorRow {
  id: string;
  display_name: string;
  email: string | null;
  phone_e164: string | null;
  user_status: string;
  headline: string | null;
  bio: string | null;
  gender: 'male' | 'female' | null;
  district: string | null;
  hourly_rate_minor: number | null;
  currency: string | null;
  years_experience: number | null;
  verification_status: string | null;
  publication_status: string | null;
  rating_average: number | null;
  rating_count: number | null;
  completed_lessons_count: number | null;
  subjects: Array<{ id: string; name_en: string; name_bn: string; code: string }>;
  created_at: string;
}

function AdminUsersTutorsContent({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'kyc' ? 'kyc' : 'directory';
  const [activeTab, setActiveTab] = useState<'directory' | 'kyc'>(initialTab);

  const [search, setSearch] = useState('');
  const [filterVerification, setFilterVerification] = useState<string>('all');
  const [filterGender, setFilterGender] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: tutorsResponse, isLoading, isError, error } = useListAllTutorsQuery({
    page,
    limit,
    search: search.trim() || undefined,
    verificationStatus: filterVerification !== 'all' ? filterVerification : undefined,
    gender: filterGender !== 'all' ? filterGender : undefined,
    status: filterStatus !== 'all' ? filterStatus : undefined,
  });

  const tutorsList: TutorRow[] = (tutorsResponse?.data as TutorRow[]) || [];
  const pagination = (tutorsResponse?.meta as any)?.pagination || {
    page,
    limit,
    total: tutorsList.length,
    totalPages: 1,
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleVerificationChange = (val: string) => {
    setFilterVerification(val);
    setPage(1);
  };

  const handleGenderChange = (val: string) => {
    setFilterGender(val);
    setPage(1);
  };

  return (
    <AdminLayout locale={locale}>
      <div className="flex flex-col gap-6 py-6" data-testid="admin-users-tutors-page">
        {/* Back Link with single Lucide icon (Zero double arrows) */}
        <div>
          <Link
            href={withLocale('/dashboard/admin/users', locale)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>{isBn ? 'ইউজার ও স্টাফ হাব-এ ফিরে যান' : 'Back to Users & Staff'}</span>
          </Link>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                {isBn ? 'শিক্ষক ও টিউটর ম্যানেজমেন্ট ডিরেক্টরি' : 'Tutors & KYC Verification Desk'}
              </h1>
              <Badge variant="secondary" className="text-xs font-semibold">
                {pagination.total} {isBn ? 'জন শিক্ষক' : 'Registered Tutors'}
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              {isBn
                ? 'প্ল্যাটফর্মের নিবন্ধিত শিক্ষকদের প্রোফাইল পর্যবেক্ষণ, প্রশাসনিক তথ্য এডিট, ভেরিফিকেশন ও অডিট হিস্ট্রি।'
                : 'Oversee certified tutors, edit profiles directly, review KYC verification documents, and inspect change logs.'}
            </p>
          </div>
        </div>

        {/* Global Error Banner */}
        {isError && (
          <Alert variant="destructive" className="border-0">
            <AlertCircle className="w-4 h-4 mr-2" />
            <AlertDescription className="text-xs font-semibold">
              {extractExactErrorMessage(
                error,
                isBn ? 'শিক্ষক তালিকা লোড করতে সমস্যা হয়েছে।' : 'Failed to load tutors list.',
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Unified Tab Controls */}
        <div className="flex items-center gap-2 border-b border-border/40 pb-2">
          <Button
            variant={activeTab === 'directory' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('directory')}
            className="text-xs font-bold gap-2"
            data-testid="tab-tutors-directory"
          >
            <GraduationCap className="w-4 h-4" />
            <span>{isBn ? 'শিক্ষক তালিকা' : 'Tutors Directory'}</span>
            <Badge variant="outline" className="text-[10px] ml-1">
              {pagination.total}
            </Badge>
          </Button>

          <Button
            variant={activeTab === 'kyc' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('kyc')}
            className="text-xs font-bold gap-2"
            data-testid="tab-tutors-kyc"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isBn ? 'কেওয়াইসি যাচাই কিউ' : 'KYC Verification Queue'}</span>
          </Button>
        </div>

        {activeTab === 'kyc' ? (
          <div className="bg-card/70 rounded-2xl p-5 sm:p-6 flex flex-col gap-4">
            <AdminVerificationTab />
          </div>
        ) : (
          <>
            {/* Search & Filter Bar - shadcn Input & Select */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-card/70 p-4 rounded-2xl">
              {/* Search */}
              <div className="sm:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={
                    isBn ? 'নাম, হেডলাইন, জেলা অথবা ইমেইল দিয়ে খুঁজুন...' : 'Search by name, headline, district, email...'
                  }
                  value={search}
                  onChange={handleSearchChange}
                  className="pl-9 text-xs"
                />
              </div>

              {/* Verification Status Filter */}
              <div>
                <Select value={filterVerification} onValueChange={handleVerificationChange}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder={isBn ? 'সকল ভেরিফিকেশন' : 'All Verification'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isBn ? 'সকল ভেরিফিকেশন' : 'All Verification'}</SelectItem>
                    <SelectItem value="approved">{isBn ? 'অনুমোদিত (Approved)' : 'Approved'}</SelectItem>
                    <SelectItem value="pending_approval">{isBn ? 'অপেক্ষমাণ (Pending)' : 'Pending Approval'}</SelectItem>
                    <SelectItem value="needs_information">{isBn ? 'তথ্য প্রয়োজন (Needs Info)' : 'Needs Info'}</SelectItem>
                    <SelectItem value="draft">{isBn ? 'খসড়া (Draft)' : 'Draft'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Gender Filter */}
              <div>
                <Select value={filterGender} onValueChange={handleGenderChange}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder={isBn ? 'সকল জেন্ডার' : 'All Genders'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isBn ? 'সকল জেন্ডার' : 'All Genders'}</SelectItem>
                    <SelectItem value="male">{isBn ? 'পুরুষ (Male)' : 'Male'}</SelectItem>
                    <SelectItem value="female">{isBn ? 'নারী (Female)' : 'Female'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tutors Table - Seamless Flat Design */}
            <div className="bg-card/70 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-foreground">
                  <thead className="bg-muted/30 uppercase tracking-wider text-[10px] font-bold text-muted-foreground border-b border-border/40">
                    <tr>
                      <th scope="col" className="px-5 py-3.5">
                        {isBn ? 'শিক্ষক প্রোফাইল' : 'TUTOR PROFILE'}
                      </th>
                      <th scope="col" className="px-5 py-3.5">
                        {isBn ? 'বিষয় ও অবস্থান' : 'SUBJECTS & LOCATION'}
                      </th>
                      <th scope="col" className="px-5 py-3.5">
                        {isBn ? 'ভেরিফিকেশন' : 'VERIFICATION'}
                      </th>
                      <th scope="col" className="px-5 py-3.5">
                        {isBn ? 'সম্মানী রেট' : 'HOURLY RATE'}
                      </th>
                      <th scope="col" className="px-5 py-3.5">
                        {isBn ? 'স্ট্যাটাস' : 'ACCOUNT STATUS'}
                      </th>
                      <th scope="col" className="px-5 py-3.5 text-right">
                        {isBn ? 'অ্যাকশন' : 'ACTIONS'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center">
                          <LoadingSpinner />
                        </td>
                      </tr>
                    ) : tutorsList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-muted-foreground">
                          {isBn ? 'কোনো শিক্ষক পাওয়া যায়নি।' : 'No registered tutors found.'}
                        </td>
                      </tr>
                    ) : (
                      tutorsList.map((tutor) => {
                        const isApproved = tutor.verification_status === 'approved';
                        const isActive = tutor.user_status === 'active';

                        return (
                          <tr
                            key={tutor.id}
                            className="hover:bg-muted/20 transition-colors"
                            data-testid={`tutor-row-${tutor.id}`}
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                                  {tutor.display_name.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-bold text-foreground text-xs flex items-center gap-1.5">
                                    <span>{tutor.display_name}</span>
                                    {isApproved && (
                                      <ShieldCheck className="w-3.5 h-3.5 text-success inline shrink-0" />
                                    )}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                                    {tutor.headline || tutor.email || '—'}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                    {tutor.email || tutor.phone_e164 || 'No contact'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex flex-col gap-1">
                                <div className="flex flex-wrap gap-1 max-w-[220px]">
                                  {tutor.subjects && tutor.subjects.length > 0 ? (
                                    tutor.subjects.slice(0, 2).map((s) => (
                                      <Badge
                                        key={s.id}
                                        variant="outline"
                                        className="text-[10px] font-medium"
                                      >
                                        {isBn ? s.name_bn : s.name_en}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-muted-foreground text-[10px]">
                                      {isBn ? 'বিষয় নির্ধারিত নেই' : 'No subjects'}
                                    </span>
                                  )}
                                  {tutor.subjects && tutor.subjects.length > 2 && (
                                    <span className="text-[10px] text-muted-foreground">
                                      +{tutor.subjects.length - 2}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                  {tutor.district || (isBn ? 'জেলা অজানা' : 'District not set')}
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              {isApproved ? (
                                <Badge variant="default" className="text-[10px] font-bold gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>VERIFIED</span>
                                </Badge>
                              ) : tutor.verification_status === 'pending_approval' ? (
                                <Badge variant="secondary" className="text-[10px] font-bold gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>PENDING</span>
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] font-bold gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>{tutor.verification_status?.toUpperCase() || 'DRAFT'}</span>
                                </Badge>
                              )}
                            </td>

                            <td className="px-5 py-4 font-mono font-bold text-foreground text-xs">
                              {tutor.hourly_rate_minor
                                ? `৳${Math.round(tutor.hourly_rate_minor / 100)}/hr`
                                : '৳500/hr'}
                            </td>

                            <td className="px-5 py-4">
                              <Badge
                                variant={isActive ? 'outline' : 'destructive'}
                                className="text-[10px] font-bold"
                              >
                                {isActive ? 'ACTIVE' : tutor.user_status.toUpperCase()}
                              </Badge>
                            </td>

                            <td className="px-5 py-4 text-right">
                              <Link
                                href={withLocale(`/dashboard/admin/users/tutors/${tutor.id}`, locale)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-semibold text-xs transition-colors"
                                data-testid={`inspect-tutor-${tutor.id}`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>{isBn ? 'পরিদর্শন ও এডিট' : 'Manage 360°'}</span>
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Backend Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-border/40 text-xs">
                  <span className="text-muted-foreground font-mono">
                    {isBn
                      ? `পৃষ্ঠা ${pagination.page} / ${pagination.totalPages} (মোট ${pagination.total} জন শিক্ষক)`
                      : `Page ${pagination.page} of ${pagination.totalPages} (${pagination.total} total tutors)`}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="gap-1 text-xs"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>{isBn ? 'পূর্ববর্তী' : 'Previous'}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="gap-1 text-xs"
                    >
                      <span>{isBn ? 'পরবর্তী' : 'Next'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

export function AdminUsersTutorsPage({ locale }: { locale: Locale }) {
  return (
    <Suspense
      fallback={
        <AdminLayout locale={locale}>
          <div className="flex items-center justify-center py-24">
            <LoadingSpinner />
          </div>
        </AdminLayout>
      }
    >
      <AdminUsersTutorsContent locale={locale} />
    </Suspense>
  );
}
