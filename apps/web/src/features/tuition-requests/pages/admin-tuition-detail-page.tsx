'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  Sparkles,
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  Shield,
  Send,
  Briefcase,
  Phone,
  Mail,
  User,
  GraduationCap,
  BookOpen,
  ThumbsUp,
  AlertCircle,
  ExternalLink,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Search,
  Filter,
  Star,
  Check,
  Award,
  Zap,
  MessageSquare,
  HelpCircle,
} from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button, Input, LoadingSpinner } from '@/components/ui';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';
import {
  useGetTuitionRequestByIdQuery,
  useGetAdminMatchCandidatesQuery,
  useSuggestTutorForRequestMutation,
  useUpdateAdminTuitionStatusMutation,
  type MatchCandidate,
} from '@/store/services/tuition-requests-api';

const QUICK_NOTE_TEMPLATES = [
  'বুয়েট গ্র্যাজুয়েট ও অভিজ্ঞ শিক্ষক, উচ্চতর গণিত ও পদার্থবিজ্ঞানে বিশেষ পারদর্শী।',
  'ঢাকা বিশ্ববিদ্যালয় থেকে বিজ্ঞানে স্নাতক, ধানমন্ডি এলাকার অত্যন্ত জনপ্রিয় গৃহশিক্ষক।',
  'এসএসসি ও বোর্ড পরীক্ষার প্রস্তুতিতে ৫+ বছরের সফল অভিজ্ঞতাসম্পন্ন শিক্ষক।',
  'ইংরেজি ভার্সন ও ক্যামব্রিজ কারিকুলামে অত্যন্ত দক্ষ ও আন্তরিক শিক্ষক।',
];

export function AdminTuitionDetailPage({
  id,
  locale,
}: {
  id: string;
  locale: Locale;
}) {
  const isBn = locale === 'bn';
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'matches' | 'applications' | 'suggestions'>('matches');
  const [candidateFilter, setCandidateFilter] = useState<'all' | 'verified' | 'top_matches' | 'male' | 'female'>('all');
  const [candidateSearch, setCandidateSearch] = useState('');
  const [selectedGender, setSelectedGender] = useState<'all' | 'male' | 'female'>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [minMatchScore, setMinMatchScore] = useState<number>(0);
  const [minExperience, setMinExperience] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'match_desc' | 'rate_asc' | 'rate_desc' | 'exp_desc'>('match_desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(6);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [expandedBreakdowns, setExpandedBreakdowns] = useState<Record<string, boolean>>({});
  const [adminNote, setAdminNote] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const {
    data: reqData,
    isLoading: reqLoading,
    refetch: refetchRequest,
  } = useGetTuitionRequestByIdQuery(id);

  const {
    data: candidatesData,
    isLoading: candidatesLoading,
  } = useGetAdminMatchCandidatesQuery(id);

  const [suggestTutor, { isLoading: isSuggesting }] = useSuggestTutorForRequestMutation();
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateAdminTuitionStatusMutation();

  const req = reqData?.data;
  const candidates = candidatesData?.data || [];

  const verifiedCount = candidates.filter(
    (c) => c.publicationStatus === 'published' || c.verificationStatus === 'approved',
  ).length;
  const topMatchCount = candidates.filter((c) => c.matchScore >= 70).length;

  const uniqueDistricts = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach((c) => {
      if (c.district) set.add(c.district);
    });
    return Array.from(set).sort();
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    return candidates
      .filter((c) => {
        if (
          candidateFilter === 'verified' &&
          c.publicationStatus !== 'published' &&
          c.verificationStatus !== 'approved'
        ) {
          return false;
        }
        if (candidateFilter === 'top_matches' && c.matchScore < 70) {
          return false;
        }
        if (candidateFilter === 'male' && c.gender !== 'male') {
          return false;
        }
        if (candidateFilter === 'female' && c.gender !== 'female') {
          return false;
        }

        if (selectedGender !== 'all' && c.gender !== selectedGender) {
          return false;
        }

        if (selectedDistrict !== 'all' && c.district !== selectedDistrict) {
          return false;
        }

        if (minMatchScore > 0 && c.matchScore < minMatchScore) {
          return false;
        }

        if (minExperience > 0 && (c.yearsExperience || 0) < minExperience) {
          return false;
        }

        if (candidateSearch.trim()) {
          const q = candidateSearch.toLowerCase();
          const matchName = c.tutorName?.toLowerCase().includes(q);
          const matchCode = c.tutorCode?.toLowerCase().includes(q);
          const matchHeadline = c.headline?.toLowerCase().includes(q);
          const matchDistrict = c.district?.toLowerCase().includes(q);
          const matchQual = (c.qualifications || []).some((ql) => ql.toLowerCase().includes(q));
          const matchAreas = (c.preferredAreas || []).some((ar) => ar.toLowerCase().includes(q));

          if (
            !matchName &&
            !matchCode &&
            !matchHeadline &&
            !matchDistrict &&
            !matchQual &&
            !matchAreas
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'match_desc') return b.matchScore - a.matchScore;
        if (sortBy === 'rate_asc') return Number(a.hourlyRate || 0) - Number(b.hourlyRate || 0);
        if (sortBy === 'rate_desc') return Number(b.hourlyRate || 0) - Number(a.hourlyRate || 0);
        if (sortBy === 'exp_desc') return (b.yearsExperience || 0) - (a.yearsExperience || 0);
        return 0;
      });
  }, [
    candidates,
    candidateFilter,
    candidateSearch,
    selectedGender,
    selectedDistrict,
    minMatchScore,
    minExperience,
    sortBy,
  ]);

  const totalPages = Math.ceil(filteredCandidates.length / pageSize) || 1;
  const paginatedCandidates = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCandidates.slice(start, start + pageSize);
  }, [filteredCandidates, currentPage, pageSize]);

  const toggleBreakdown = (tutorUserId: string) => {
    setExpandedBreakdowns((prev) => ({
      ...prev,
      [tutorUserId]: !prev[tutorUserId],
    }));
  };

  const handleResetFilters = () => {
    setCandidateFilter('all');
    setCandidateSearch('');
    setSelectedGender('all');
    setSelectedDistrict('all');
    setMinMatchScore(0);
    setMinExperience(0);
    setSortBy('match_desc');
    setCurrentPage(1);
  };

  const handleSuggest = async (candidate: MatchCandidate) => {
    try {
      await suggestTutor({
        requestId: id,
        tutorUserId: candidate.tutorUserId,
        matchScore: candidate.matchScore,
        adminNote:
          adminNote.trim() ||
          `${candidate.tutorName} (${candidate.headline || 'Verified Educator'}) recommended by OgroniEdu Academic Desk.`,
      }).unwrap();

      setFeedback({
        type: 'success',
        message: isBn
          ? `${candidate.tutorName} সফলভাবে অভিভাবকের কাছে প্রস্তাব করা হয়েছে!`
          : `Successfully suggested ${candidate.tutorName} to the guardian!`,
      });
      refetchRequest();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.data?.message || 'Failed to suggest tutor',
      });
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateStatus({ requestId: id, status: newStatus }).unwrap();
      setFeedback({
        type: 'success',
        message: isBn ? 'স্ট্যাটাস আপডেট সম্পন্ন হয়েছে' : 'Status updated successfully',
      });
      refetchRequest();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.data?.message || 'Failed to update status',
      });
    }
  };

  if (reqLoading) {
    return (
      <AdminLayout locale={locale}>
        <div className="py-24 text-center">
          <LoadingSpinner size="lg" />
        </div>
      </AdminLayout>
    );
  }

  if (!req) {
    return (
      <AdminLayout locale={locale}>
        <Card className="p-12 text-center border-dashed">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">
            {isBn ? 'টিউশন রিকোয়েস্ট পাওয়া যায়নি' : 'Tuition Request Not Found'}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(withLocale('/dashboard/admin/tuition-requests', locale))}
            className="mt-4 rounded-xl"
          >
            {isBn ? 'তালিকায় ফিরে যান' : 'Back to Requests'}
          </Button>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      locale={locale}
      title={`${req.requestReference} — ${isBn ? 'টিউশন ম্যাচিং ও শিক্ষক প্রস্তাব ডেস্ক' : 'Tuition Matching & Suggestion Desk'}`}
      subtitle={`${req.studentName} • ${req.educationLevel ? (isBn ? req.educationLevel.nameBn : req.educationLevel.nameEn) : ''} • ${req.district || 'Dhaka'}`}
      actions={
        <div className="flex items-center gap-2">
          <Link href={withLocale('/dashboard/admin/tuition-requests', locale)}>
            <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs font-semibold rounded-xl">
              <ArrowLeft className="w-3.5 h-3.5" />
              {isBn ? 'রিকোয়েস্ট তালিকায় ফিরে যান' : 'Back to Requests'}
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {feedback && (
          <Alert variant={feedback.type === 'error' ? 'destructive' : 'default'} className="animate-in fade-in-50">
            <AlertDescription className="font-semibold">{feedback.message}</AlertDescription>
          </Alert>
        )}

        {/* 2-Column Responsive Bento Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* =========================================================================
           * LEFT COLUMN: The Tuition Request Blueprint & Student Persona (lg:col-span-4)
           * ========================================================================= */}
          <div className="lg:col-span-4 space-y-4">
            {/* Header Hero Pill Card */}
            <Card className="border-border bg-gradient-to-br from-card via-card to-primary/5 shadow-xs overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-primary via-indigo-500 to-teal-400" />
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black text-primary px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20">
                      {req.requestReference}
                    </span>
                    {req.isVip && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-black shadow-xs flex items-center gap-1">
                        <Zap className="w-3 h-3 fill-black" /> VIP
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider border shadow-xs ${
                      req.status === 'confirmed'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : req.status === 'matched'
                        ? 'bg-primary/10 text-primary border-primary/30'
                        : req.status === 'demo_scheduled'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        : 'bg-muted text-muted-foreground border-border'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>

                {/* Student Persona Header */}
                <div className="flex items-center gap-3 pt-2 border-t border-border/60">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-indigo-500/20 text-primary flex items-center justify-center font-bold text-lg border border-primary/30 shadow-xs shrink-0">
                    {req.studentName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-base text-foreground truncate">{req.studentName}</h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {req.institutionName || (isBn ? 'শিক্ষা প্রতিষ্ঠান উল্লেখ নেই' : 'Institution not specified')}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border">
                        {req.studentGender === 'male' ? (isBn ? 'ছাত্র (ছেলে)' : 'Male Student') : req.studentGender === 'female' ? (isBn ? 'ছাত্রী (মেয়ে)' : 'Female Student') : (isBn ? 'যেকোনো জেন্ডার' : 'Any Gender')}
                      </span>
                      {req.educationLevel && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                          {isBn ? req.educationLevel.nameBn : req.educationLevel.nameEn}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Switcher Quick Bar */}
                <div className="pt-2">
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    {isBn ? 'রিকোয়েস্ট স্ট্যাটাস হালনাগাদ:' : 'Quick Status Update:'}
                  </label>
                  <Select value={req.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-full text-xs h-9 bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open (অপেক্ষমাণ)</SelectItem>
                      <SelectItem value="matched">Matched (প্রস্তাবিত)</SelectItem>
                      <SelectItem value="demo_scheduled">Demo Scheduled (ডেমো ক্লাস শিডিউলড)</SelectItem>
                      <SelectItem value="confirmed">Confirmed (নিশ্চিত ও চূড়ান্ত)</SelectItem>
                      <SelectItem value="cancelled">Cancelled (বাতিলকৃত)</SelectItem>
                      <SelectItem value="closed">Closed (বন্ধ)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Academic Details & Subject Badges */}
            <Card className="border-border bg-card shadow-xs">
              <CardHeader className="p-4 border-b border-border/60 bg-muted/20">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  {isBn ? 'পাঠ্যবিষয় ও কারিকুলাম' : 'Curriculum & Subjects'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">{isBn ? 'কারিকুলাম:' : 'Curriculum:'}</span>
                  <span className="font-bold text-foreground">
                    {req.curriculum ? (isBn ? req.curriculum.nameBn : req.curriculum.nameEn) : (isBn ? 'জাতীয় কারিকুলাম' : 'National Curriculum')}
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold mb-1.5">
                    {isBn ? 'পড়ার বিষয়সমূহ:' : 'Subjects Required:'}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(req.subjects || []).map((sub) => (
                      <span
                        key={sub.id}
                        className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-bold text-xs border border-primary/20 shadow-2xs"
                      >
                        {isBn ? sub.nameBn : sub.nameEn}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location, Schedule & Budget Card */}
            <Card className="border-border bg-card shadow-xs">
              <CardHeader className="p-4 border-b border-border/60 bg-muted/20">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  {isBn ? 'লোকেশন, শিডিউল ও বাজেট' : 'Location, Schedule & Budget'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">{isBn ? 'পদ্ধতি ও এলাকা:' : 'Mode & Area:'}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 capitalize">
                      {req.learningMode === 'in_person'
                        ? (isBn ? 'বাসায় গিয়ে পড়ানো' : 'Home Tutoring')
                        : req.learningMode === 'online'
                        ? (isBn ? 'অনলাইন লাইভ' : 'Online Live')
                        : 'Hybrid'}
                    </span>
                    <span className="font-bold text-foreground">{req.area ? `${req.area}, ` : ''}{req.district || 'Dhaka'}</span>
                  </div>
                  {req.addressDetails && (
                    <p className="text-[11px] text-muted-foreground mt-1.5 font-mono bg-muted/40 p-2 rounded-lg border border-border">
                      🏠 {req.addressDetails}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/60">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">{isBn ? 'সাপ্তাহিক দিন:' : 'Weekly Days:'}</span>
                    <span className="font-bold text-foreground text-sm">{req.daysPerWeek || 3} {isBn ? 'দিন/সপ্তাহ' : 'days/wk'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">{isBn ? 'পছন্দের সময়:' : 'Time Slot:'}</span>
                    <span className="font-bold text-foreground">{req.preferredTime || (isBn ? 'সন্ধ্যা' : 'Evening')}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <span className="text-emerald-600 dark:text-emerald-400 block text-[10px] uppercase font-black">
                    {isBn ? 'সম্মানী বাজেট:' : 'Salary Budget:'}
                  </span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400 text-base">
                    ৳ {req.salaryBudgetMin} - ৳ {req.salaryBudgetMax} / {req.salaryType === 'monthly' ? (isBn ? 'মাস' : 'month') : (isBn ? 'সেশন' : 'session')}
                  </span>
                </div>

                {req.preferredTutorBackground && (
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">{isBn ? 'পছন্দের শিক্ষক ব্যাকগ্রাউন্ড:' : 'Preferred Background:'}</span>
                    <span className="font-bold text-foreground">
                      {req.preferredTutorBackground} ({req.preferredTutorGender === 'male' ? (isBn ? 'পুরুষ শিক্ষক পছন্দ' : 'Male Preferred') : req.preferredTutorGender === 'female' ? (isBn ? 'নারী শিক্ষক পছন্দ' : 'Female Preferred') : (isBn ? 'যেকোনো জেন্ডার' : 'Any Gender')})
                    </span>
                  </div>
                )}

                {req.requirementsNotes && (
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
                    <span className="text-[10px] font-bold text-muted-foreground block mb-0.5 uppercase">
                      {isBn ? 'বিশেষ নির্দেশনা:' : 'Guardian Notes:'}
                    </span>
                    <p className="text-foreground italic font-medium">"{req.requirementsNotes}"</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Guardian Contact Card */}
            {req.guardianUser && (
              <Card className="border-border bg-card shadow-xs">
                <CardHeader className="p-4 border-b border-border/60 bg-muted/20">
                  <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    {isBn ? 'অভিভাবকের যোগাযোগ ও অ্যাকাউন্ট' : 'Guardian Contact'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-sm">{req.guardianUser.displayName}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      GUARDIAN
                    </span>
                  </div>
                  {req.guardianUser.phoneE164 && (
                    <div className="flex items-center gap-2 text-muted-foreground font-mono">
                      <Phone className="w-3.5 h-3.5 text-primary" />
                      <span>{req.guardianUser.phoneE164}</span>
                    </div>
                  )}
                  {req.guardianUser.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-3.5 h-3.5 text-primary" />
                      <span className="truncate">{req.guardianUser.email}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* =========================================================================
           * RIGHT COLUMN: Dedicated Curated Matchmaking & Search Desk (lg:col-span-8)
           * ========================================================================= */}
          <div className="lg:col-span-8 space-y-4">
            {/* Segmented Workspace Tabs */}
            <div className="flex items-center border-b border-border bg-card rounded-t-2xl p-1 shadow-xs">
              <button
                type="button"
                onClick={() => setActiveTab('matches')}
                className={`py-2.5 px-4 text-xs font-black rounded-xl transition-all flex items-center gap-2 ${
                  activeTab === 'matches'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                {isBn ? 'অ্যালগরিদমিক ম্যাচিং শিক্ষকগণ' : 'Matched Verified Teachers'}
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'matches' ? 'bg-primary-foreground text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {candidates.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('applications')}
                className={`py-2.5 px-4 text-xs font-black rounded-xl transition-all flex items-center gap-2 ${
                  activeTab === 'applications'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                {isBn ? 'জব বোর্ড আবেদনকারী' : 'Job Board Applicants'}
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'applications' ? 'bg-primary-foreground text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {(req.applications || []).length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('suggestions')}
                className={`py-2.5 px-4 text-xs font-black rounded-xl transition-all flex items-center gap-2 ${
                  activeTab === 'suggestions'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {isBn ? 'প্রেরিত প্রস্তাবসমূহ' : 'Sent Suggestions'}
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'suggestions' ? 'bg-primary-foreground text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {(req.suggestions || []).length}
                </span>
              </button>
            </div>

            {/* TAB 1: Scalable Multi-Faceted Matching Workspace */}
            {activeTab === 'matches' && (
              <div className="space-y-4">
                {/* Search, Filter & Quick Command Hub */}
                <Card className="border-border bg-card p-4 space-y-3.5 shadow-xs">
                  {/* Search bar + filter toggle */}
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative flex-1 w-full">
                      <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input
                        value={candidateSearch}
                        onChange={(e) => {
                          setCandidateSearch(e.target.value);
                          setCurrentPage(1);
                        }}
                        placeholder={
                          isBn
                            ? 'লক্ষাধিক শিক্ষকের মধ্য থেকে খুঁজুন (নাম, TUT কোড, বিষয়, এলাকা)...'
                            : 'Search among lakhs of tutors (name, TUT-code, subjects, area)...'
                        }
                        className="text-xs pl-10 h-10 rounded-xl"
                      />
                      {candidateSearch && (
                        <button
                          type="button"
                          onClick={() => setCandidateSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <Button
                      variant={showAdvancedFilters ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      className="text-xs flex items-center gap-1.5 shrink-0 h-10 px-4 rounded-xl font-bold"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      {isBn ? 'ফিল্টার ও সর্টিং' : 'Filters & Sort'}
                      {showAdvancedFilters ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                    </Button>
                  </div>

                  {/* Fast Filter Pills */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setCandidateFilter('all');
                          setCurrentPage(1);
                        }}
                        className={`text-xs px-3 py-1 rounded-full font-bold transition-all ${
                          candidateFilter === 'all'
                            ? 'bg-primary text-primary-foreground shadow-2xs'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {isBn ? 'সকল শিক্ষক' : 'All Tutors'} ({candidates.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCandidateFilter('verified');
                          setCurrentPage(1);
                        }}
                        className={`text-xs px-3 py-1 rounded-full font-bold transition-all flex items-center gap-1 ${
                          candidateFilter === 'verified'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        {isBn ? 'যাচাইকৃত (Verified)' : 'Verified Only'} ({verifiedCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCandidateFilter('top_matches');
                          setCurrentPage(1);
                        }}
                        className={`text-xs px-3 py-1 rounded-full font-bold transition-all flex items-center gap-1 ${
                          candidateFilter === 'top_matches'
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Award className="w-3 h-3" />
                        {isBn ? 'সুপার ম্যাচ (৭০%+)' : 'Top Match (70%+)'} ({topMatchCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCandidateFilter('male');
                          setCurrentPage(1);
                        }}
                        className={`text-xs px-3 py-1 rounded-full font-bold transition-all ${
                          candidateFilter === 'male'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {isBn ? 'পুরুষ শিক্ষক (Male)' : 'Male Tutors'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCandidateFilter('female');
                          setCurrentPage(1);
                        }}
                        className={`text-xs px-3 py-1 rounded-full font-bold transition-all ${
                          candidateFilter === 'female'
                            ? 'bg-purple-600 text-white shadow-2xs'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {isBn ? 'নারী শিক্ষক (Female)' : 'Female Tutors'}
                      </button>
                    </div>

                    <span className="text-[11px] font-bold text-muted-foreground">
                      {isBn ? `প্রদর্শিত: ${filteredCandidates.length} জন` : `Showing: ${filteredCandidates.length} tutors`}
                    </span>
                  </div>

                  {/* Expandable Advanced Filter Drawer */}
                  {showAdvancedFilters && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border text-xs animate-in slide-in-from-top-2">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase">
                          {isBn ? 'টিউশন জেলা' : 'District'}
                        </label>
                        <Select
                          value={selectedDistrict}
                          onValueChange={(val: any) => {
                            setSelectedDistrict(val);
                            setCurrentPage(1);
                          }}
                        >
                          <SelectTrigger className="text-xs h-8 bg-card">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{isBn ? 'সকল জেলা' : 'All Districts'}</SelectItem>
                            {uniqueDistricts.map((d) => (
                              <SelectItem key={d} value={d}>
                                {d}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase">
                          {isBn ? 'নূন্যতম ম্যাচ স্কোর' : 'Min Match Score'}
                        </label>
                        <Select
                          value={String(minMatchScore)}
                          onValueChange={(val: any) => {
                            setMinMatchScore(Number(val));
                            setCurrentPage(1);
                          }}
                        >
                          <SelectTrigger className="text-xs h-8 bg-card">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">{isBn ? 'যেকোনো স্কোর' : 'Any Score'}</SelectItem>
                            <SelectItem value="90">{isBn ? '৯০%+ (সুপার ম্যাচ)' : '90%+ Ultra'}</SelectItem>
                            <SelectItem value="80">{isBn ? '৮০%+ (উচ্চ ম্যাচ)' : '80%+ High'}</SelectItem>
                            <SelectItem value="70">{isBn ? '৭০%+ (ভালো ম্যাচ)' : '70%+ Strong'}</SelectItem>
                            <SelectItem value="50">{isBn ? '৫০%+ (সাধারণ)' : '50%+ Moderate'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase">
                          {isBn ? 'নূন্যতম অভিজ্ঞতা' : 'Min Experience'}
                        </label>
                        <Select
                          value={String(minExperience)}
                          onValueChange={(val: any) => {
                            setMinExperience(Number(val));
                            setCurrentPage(1);
                          }}
                        >
                          <SelectTrigger className="text-xs h-8 bg-card">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">{isBn ? 'যেকোনো অভিজ্ঞতা' : 'Any Experience'}</SelectItem>
                            <SelectItem value="1">{isBn ? '১+ বছর' : '1+ Year'}</SelectItem>
                            <SelectItem value="3">{isBn ? '৩+ বছর' : '3+ Years'}</SelectItem>
                            <SelectItem value="5">{isBn ? '৫+ বছর' : '5+ Years'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase">
                          {isBn ? 'সাজানোর ক্রম' : 'Sort By'}
                        </label>
                        <Select
                          value={sortBy}
                          onValueChange={(val: any) => {
                            setSortBy(val);
                            setCurrentPage(1);
                          }}
                        >
                          <SelectTrigger className="text-xs h-8 bg-card">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="match_desc">{isBn ? 'ম্যাচ স্কোর (সর্বোচ্চ আগে)' : 'Highest Match'}</SelectItem>
                            <SelectItem value="rate_asc">{isBn ? 'রেট (কম থেকে বেশি)' : 'Lowest Rate'}</SelectItem>
                            <SelectItem value="rate_desc">{isBn ? 'রেট (বেশি থেকে কম)' : 'Highest Rate'}</SelectItem>
                            <SelectItem value="exp_desc">{isBn ? 'অভিজ্ঞতা (বেশি আগে)' : 'Most Experienced'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="sm:col-span-2 md:col-span-4 flex justify-end pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleResetFilters}
                          className="text-[11px] h-7 text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          {isBn ? 'সব ফিল্টার রিসেট করুন' : 'Reset All Filters'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Recommendation Note Workspace with 1-Click Template Pills */}
                  <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                    <label className="text-xs font-black text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-primary" />
                        {isBn ? 'অভিভাবকের জন্য পার্সোনালাইজড রেকমেন্ডেশন নোট:' : 'Personalized Endorsement Note for Guardian:'}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        {isBn ? '১-ক্লিকে টেমপ্লেট নির্বাচন করুন' : 'Click template below to autofill'}
                      </span>
                    </label>
                    <Input
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder={
                        isBn
                          ? 'যেমন: বুয়েট সিভিল থেকে পাস করা অভিজ্ঞ শিক্ষক, পদার্থবিজ্ঞান ও উচ্চতর গণিতে বিশেষ পারদর্শী।'
                          : 'e.g., BUET graduate with 5 years experience in Class 10 Higher Math.'
                      }
                      className="text-xs bg-card"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {QUICK_NOTE_TEMPLATES.map((tmpl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setAdminNote(tmpl)}
                          className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-card hover:bg-primary/10 text-muted-foreground hover:text-primary border border-border hover:border-primary/30 transition-all text-left truncate max-w-[280px]"
                          title={tmpl}
                        >
                          + {tmpl}
                        </button>
                      ))}
                    </div>
                  </div>
                </Card>

                {/* Candidate List Display */}
                {candidatesLoading ? (
                  <div className="py-20 text-center">
                    <LoadingSpinner size="lg" />
                  </div>
                ) : paginatedCandidates.length === 0 ? (
                  <Card className="p-12 text-center border-dashed text-muted-foreground text-xs space-y-3">
                    <Users className="w-10 h-10 text-muted-foreground mx-auto" />
                    <p className="text-sm font-bold text-foreground">
                      {isBn ? 'কোনো শিক্ষক পাওয়া যায়নি।' : 'No matching tutors found with current filters.'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isBn ? 'ফিল্টার পরিবর্তন করুন অথবা রিসেট বাটনে ক্লিক করুন।' : 'Try loosening search keywords or clearing filters.'}
                    </p>
                    <Button variant="outline" size="sm" onClick={handleResetFilters} className="text-xs rounded-xl">
                      {isBn ? 'ফিল্টার রিসেট করুন' : 'Reset Filters'}
                    </Button>
                  </Card>
                ) : (
                  <div className="space-y-3.5">
                    {paginatedCandidates.map((c, index) => {
                      const alreadySuggested = (req.suggestions || []).some(
                        (s) => s.tutorUserId === c.tutorUserId,
                      );
                      const isExpanded = Boolean(expandedBreakdowns[c.tutorUserId]);

                      return (
                        <Card
                          key={c.tutorUserId}
                          className={`border transition-all overflow-hidden shadow-xs hover:shadow-md ${
                            alreadySuggested
                              ? 'border-emerald-500/40 bg-emerald-500/5'
                              : index === 0 && candidateFilter === 'all' && currentPage === 1
                              ? 'border-primary/50 bg-gradient-to-br from-card via-card to-primary/5'
                              : 'border-border bg-card'
                          }`}
                        >
                          <CardContent className="p-5 space-y-3.5">
                            {/* Card Top Row: Candidate Identity & Big Match Badge */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-start gap-3.5 min-w-0">
                                {/* Avatar */}
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-indigo-500/10 text-primary flex items-center justify-center font-black text-xl border border-primary/20 shadow-2xs shrink-0 relative">
                                  {c.tutorName.charAt(0)}
                                  {(c.verificationStatus === 'approved' || c.publicationStatus === 'published') && (
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shadow-xs" title="Verified Educator">
                                      <Shield className="w-3 h-3 fill-white" />
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="font-black text-base text-foreground truncate">{c.tutorName}</h4>
                                    {c.tutorCode && (
                                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                                        {c.tutorCode}
                                      </span>
                                    )}
                                    <span
                                      className={`text-[10px] font-black px-2 py-0.5 rounded-full capitalize ${
                                        c.gender === 'female'
                                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                      }`}
                                    >
                                      {c.gender === 'female' ? (isBn ? 'নারী শিক্ষক' : 'Female') : (isBn ? 'পুরুষ শিক্ষক' : 'Male')}
                                    </span>
                                  </div>

                                  {/* Headline */}
                                  {c.headline && (
                                    <div className="flex items-center gap-1.5 text-xs text-foreground font-semibold">
                                      <GraduationCap className="w-3.5 h-3.5 text-primary shrink-0" />
                                      <span className="truncate">{c.headline}</span>
                                    </div>
                                  )}

                                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5">
                                    {c.district && (
                                      <span className="flex items-center gap-1 font-medium">
                                        <MapPin className="w-3 h-3 text-primary" />
                                        {c.district}
                                      </span>
                                    )}
                                    {c.yearsExperience !== undefined && (
                                      <span className="flex items-center gap-1 font-medium">
                                        <Briefcase className="w-3 h-3 text-primary" />
                                        {c.yearsExperience} {isBn ? 'বছরের অভিজ্ঞতা' : 'yrs experience'}
                                      </span>
                                    )}
                                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs">
                                      ৳ {c.hourlyRate || 800} / {isBn ? 'ঘণ্টা' : 'hr'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Prominent Match Gauge Pill */}
                              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0">
                                <div
                                  className={`px-3.5 py-1.5 rounded-2xl flex items-center gap-1.5 font-black text-sm shadow-sm ${
                                    c.matchScore >= 90
                                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-500/20'
                                      : c.matchScore >= 75
                                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/20'
                                      : c.matchScore >= 50
                                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-amber-500/20'
                                      : 'bg-muted text-muted-foreground'
                                  }`}
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>{c.matchScore}%</span>
                                  <span className="text-[10px] font-normal uppercase opacity-90">{isBn ? 'ম্যাচ' : 'Match'}</span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => toggleBreakdown(c.tutorUserId)}
                                  className="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5 mt-1"
                                >
                                  {isExpanded
                                    ? (isBn ? 'স্কোর পয়েন্ট লুকান ▲' : 'Hide Breakdown ▲')
                                    : (isBn ? 'স্কোর পয়েন্ট দেখুন ▼' : 'View Breakdown ▼')}
                                </button>
                              </div>
                            </div>

                            {/* Preferred Areas */}
                            {(c.preferredAreas || []).length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                <span className="text-[10px] font-bold text-muted-foreground mr-1 uppercase">
                                  {isBn ? 'টিউশন এলাকা:' : 'Areas:'}
                                </span>
                                {(c.preferredAreas || []).map((area, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border"
                                  >
                                    {area}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Collapsible Match Score Points Breakdown */}
                            {isExpanded && (
                              <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs space-y-2 animate-in fade-in-50">
                                <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider">
                                  {isBn ? 'অ্যালগরিদমিক ম্যাচিং পয়েন্ট বিশ্লেষণ:' : 'Matching Score Point Distribution:'}
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                  {(c.matchBreakdown || []).map((point, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-card border border-border text-[11px] font-semibold text-foreground shadow-2xs"
                                    >
                                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[3]" />
                                      <span className="truncate">{point}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Card Action Row */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
                              <span className="text-xs text-muted-foreground font-medium">
                                {isBn ? 'অগ্রণী এডু ভেরিফিকেশন: যাচাইকৃত মেধা' : 'Verification: Level 2 Approved'}
                              </span>

                              <div className="flex items-center gap-2">
                                <Link
                                  href={withLocale('/dashboard/admin/users/tutors', locale)}
                                  target="_blank"
                                >
                                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground h-9 rounded-xl">
                                    <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                    {isBn ? 'প্রোফাইল ফাইল' : 'View Profile'}
                                  </Button>
                                </Link>

                                {alreadySuggested ? (
                                  <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                                    <Check className="w-4 h-4 stroke-[3]" />
                                    {isBn ? 'অভিভাবককে প্রস্তাব করা হয়েছে' : 'Already Suggested'}
                                  </span>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => handleSuggest(c)}
                                    disabled={isSuggesting}
                                    className="text-xs font-bold px-4 h-9 rounded-xl shadow-xs flex items-center gap-1.5"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                    {isBn ? 'অভিভাবককে সাজেস্ট করুন' : 'Suggest to Guardian'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}

                    {/* Pagination Bar */}
                    {totalPages > 1 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
                        <span className="text-xs text-muted-foreground font-medium">
                          {isBn
                            ? `পৃষ্ঠা ${currentPage} (মোট ${totalPages} পৃষ্ঠা • ফলাফল: ${filteredCandidates.length} জন)`
                            : `Page ${currentPage} of ${totalPages} • (${filteredCandidates.length} tutors)`}
                        </span>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            className="text-xs h-8 px-2.5 rounded-lg"
                          >
                            <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                            {isBn ? 'পূর্ববর্তী' : 'Prev'}
                          </Button>

                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter((page) => {
                              return (
                                page === 1 ||
                                page === totalPages ||
                                Math.abs(page - currentPage) <= 1
                              );
                            })
                            .map((page, idx, arr) => {
                              const prev = arr[idx - 1];
                              const showEllipsis = prev && page - prev > 1;

                              return (
                                <React.Fragment key={page}>
                                  {showEllipsis && (
                                    <span className="px-2 text-xs text-muted-foreground">...</span>
                                  )}
                                  <Button
                                    variant={currentPage === page ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setCurrentPage(page)}
                                    className="text-xs h-8 w-8 p-0 rounded-lg font-bold"
                                  >
                                    {page}
                                  </Button>
                                </React.Fragment>
                              );
                            })}

                          <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            className="text-xs h-8 px-2.5 rounded-lg"
                          >
                            {isBn ? 'পরবর্তী' : 'Next'}
                            <ChevronRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Applications */}
            {activeTab === 'applications' && (
              <Card className="border-border bg-card p-6 text-center text-xs text-muted-foreground space-y-2">
                <Briefcase className="w-8 h-8 text-muted-foreground mx-auto" />
                <p className="font-bold text-foreground">
                  {isBn ? 'জব বোর্ড সরাসরি আবেদনকারী' : 'Job Board Applications'}
                </p>
                <p>
                  {(req.applications || []).length > 0
                    ? `${(req.applications || []).length} applicants found`
                    : (isBn ? 'এখনো কোনো শিক্ষক সরাসরি আবেদন করেননি।' : 'No direct applications received yet.')}
                </p>
              </Card>
            )}

            {/* TAB 3: Sent Suggestions */}
            {activeTab === 'suggestions' && (
              <div className="space-y-3">
                {(req.suggestions || []).length === 0 ? (
                  <Card className="border-border bg-card p-6 text-center text-xs text-muted-foreground">
                    {isBn ? 'এখনো কোনো শিক্ষক প্রস্তাব পাঠানো হয়নি।' : 'No suggestions dispatched yet.'}
                  </Card>
                ) : (
                  (req.suggestions || []).map((s) => (
                    <Card key={s.id} className="border-border bg-card p-4 space-y-2 text-xs shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-sm">
                            {s.tutorProfile?.user?.displayName || 'Tutor'}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            {s.matchScore}% Match
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-muted text-muted-foreground">
                          {s.status}
                        </span>
                      </div>
                      {s.adminNote && (
                        <p className="text-muted-foreground bg-muted/30 p-2 rounded-lg italic">
                          "{s.adminNote}"
                        </p>
                      )}
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
