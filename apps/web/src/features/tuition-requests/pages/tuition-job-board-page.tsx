'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Search,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  UserCheck,
  CheckCircle2,
  Sparkles,
  Filter,
  PlusCircle,
  Shield,
  Send,
  Lock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button, Input, LoadingSpinner } from '@/components/ui';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppSelector } from '@/store';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';
import {
  useGetTuitionJobBoardQuery,
  useApplyForTuitionMutation,
  type TuitionRequest,
} from '@/store/services/tuition-requests-api';

export function TuitionJobBoardPage({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  const { user, isAuthenticated } = useAppSelector((s) => s.auth);

  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('all');
  const [learningMode, setLearningMode] = useState('all');

  // Apply Modal State
  const [selectedRequest, setSelectedRequest] = useState<TuitionRequest | null>(null);
  const [coverPitch, setCoverPitch] = useState('');
  const [proposedSalary, setProposedSalary] = useState<number | undefined>(undefined);
  const [applyFeedback, setApplyFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { data, isLoading, refetch } = useGetTuitionJobBoardQuery({
    search: search.trim() || undefined,
    district: district !== 'all' ? district : undefined,
    learningMode: learningMode !== 'all' ? learningMode : undefined,
  });

  const [applyForTuition, { isLoading: isApplying }] = useApplyForTuitionMutation();

  const items = data?.data?.items || [];
  const total = data?.data?.total || 0;

  const handleApply = async () => {
    if (!selectedRequest) return;
    if (!coverPitch.trim()) {
      setApplyFeedback({
        type: 'error',
        message: isBn ? 'কেন আপনি উপযুক্ত তা লিখুন' : 'Please write your proposal pitch',
      });
      return;
    }

    try {
      await applyForTuition({
        requestId: selectedRequest.id,
        coverPitch: coverPitch.trim(),
        proposedSalary: proposedSalary ? Number(proposedSalary) : undefined,
      }).unwrap();

      setApplyFeedback({
        type: 'success',
        message: isBn
          ? 'আপনার আবেদন সফলভাবে জমা হয়েছে! অ্যাডমিন যাচাই করে অভিভাবকের কাছে উপস্থাপন করবেন।'
          : 'Application submitted! Admin will evaluate and present to the guardian.',
      });
      refetch();
      setTimeout(() => {
        setSelectedRequest(null);
        setCoverPitch('');
        setApplyFeedback(null);
      }, 1800);
    } catch (err: any) {
      setApplyFeedback({
        type: 'error',
        message: err?.data?.message || (isBn ? 'আবেদন করতে সমস্যা হয়েছে' : 'Failed to apply'),
      });
    }
  };

  return (
    <div className="py-8 bg-background min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-card to-muted/50 border border-border mb-8 shadow-sm">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-2">
              <Briefcase className="w-3.5 h-3.5" />
              <span>{isBn ? 'সক্রিয় টিউশন জব বোর্ড' : 'Live Tuition Job Board'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {isBn ? 'উপলব্ধ টিউশন সার্কুলার সমূহ' : 'Available Tutoring Leads & Jobs'}
            </h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
              {isBn
                ? 'অভিভাবকদের সরাসরি টিউশন রিকোয়েস্টে আবেদন করুন। ন্যায্য পারিশ্রমিক, এস্ক্রো নিশ্চয়তা ও সার্বক্ষণিক প্ল্যাটফর্ম সাপোর্ট।'
                : 'Browse verified student tutoring requests across Bangladesh and apply directly with fair payout guarantees.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link href={withLocale('/request-tutor', locale)}>
              <Button className="flex items-center gap-2 font-bold shadow-sm">
                <PlusCircle className="w-4 h-4" />
                {isBn ? 'টিউশন রিকোয়েস্ট পোস্ট করুন' : 'Post Tuition Request'}
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6 p-4 rounded-xl bg-card border border-border shadow-xs">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isBn ? 'শ্রেণি, বিষয় অথবা এলাকা দিয়ে খুঁজুন...' : 'Search by subject, level, or area...'}
              className="pl-9"
            />
          </div>

          <div>
            <Select value={learningMode} onValueChange={setLearningMode}>
              <SelectTrigger>
                <SelectValue placeholder={isBn ? 'পদ্ধতি' : 'Mode'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isBn ? 'সব মাধ্যম' : 'All Modes'}</SelectItem>
                <SelectItem value="in_person">{isBn ? 'বাসায় এসে পড়ানো' : 'Home Tutoring'}</SelectItem>
                <SelectItem value="online">{isBn ? 'অনলাইন লাইভ ক্লাস' : 'Online 1-on-1'}</SelectItem>
                <SelectItem value="hybrid">{isBn ? 'হাইব্রিড' : 'Hybrid'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={district} onValueChange={setDistrict}>
              <SelectTrigger>
                <SelectValue placeholder={isBn ? 'জেলা' : 'District'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isBn ? 'সকল জেলা' : 'All Districts'}</SelectItem>
                <SelectItem value="Dhaka">Dhaka (ঢাকা)</SelectItem>
                <SelectItem value="Chattogram">Chattogram (চট্টগ্রাম)</SelectItem>
                <SelectItem value="Rajshahi">Rajshahi (রাজশাহী)</SelectItem>
                <SelectItem value="Sylhet">Sylhet (সিলেট)</SelectItem>
                <SelectItem value="Khulna">Khulna (খুলনা)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-muted-foreground">
            {isBn ? `মোট টিউশন পাওয়া গেছে: ${total} টি` : `Total active jobs: ${total}`}
          </span>
        </div>

        {/* Job Cards Grid */}
        {isLoading ? (
          <div className="py-20 text-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : items.length === 0 ? (
          <Card className="border-dashed p-12 text-center text-muted-foreground">
            <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold">{isBn ? 'কোনো টিউশন পাওয়া যায়নি' : 'No active tuition requests found'}</p>
            <p className="text-xs mt-1">{isBn ? 'অন্য ফিল্টার ব্যবহার করে চেষ্টা করুন' : 'Try broadening your filter criteria'}</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((job) => (
              <Card
                key={job.id}
                className={`border transition-all hover:shadow-md relative overflow-hidden flex flex-col justify-between ${
                  job.isVip
                    ? 'border-amber-500/40 bg-gradient-to-br from-card to-amber-500/5'
                    : 'border-border bg-card'
                }`}
              >
                {job.isVip && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-black text-[10px] font-extrabold px-2.5 py-0.5 rounded-bl-lg uppercase tracking-wider flex items-center gap-1 shadow-xs">
                    <Sparkles className="w-3 h-3" />
                    <span>VIP Express</span>
                  </div>
                )}

                <CardContent className="p-5 space-y-4">
                  {/* Reference & Time */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="font-mono font-semibold text-primary">{job.requestReference}</span>
                    <span>{new Date(job.createdAt).toLocaleDateString(isBn ? 'bn-BD' : 'en-US')}</span>
                  </div>

                  {/* Title & Level */}
                  <div>
                    <h3 className="font-bold text-base text-foreground">
                      {job.educationLevel ? (isBn ? job.educationLevel.nameBn : job.educationLevel.nameEn) : 'Academic Student'}
                      {' • '}
                      <span className="text-primary font-semibold">
                        {job.curriculum ? (isBn ? job.curriculum.nameBn : job.curriculum.nameEn) : ''}
                      </span>
                    </h3>
                    {job.institutionName && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isBn ? 'প্রতিষ্ঠান:' : 'Institution:'} {job.institutionName}
                      </p>
                    )}
                  </div>

                  {/* Subject Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {(job.subjects || []).map((sub) => (
                      <span
                        key={sub.id}
                        className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-muted text-foreground border border-border/60"
                      >
                        {isBn ? sub.nameBn : sub.nameEn}
                      </span>
                    ))}
                  </div>

                  {/* Key Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50 text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">
                        {job.learningMode === 'online'
                          ? (isBn ? 'অনলাইন লাইভ' : 'Online 1-on-1')
                          : `${job.area || 'City Area'}, ${job.district}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{job.daysPerWeek} {isBn ? 'দিন/সপ্তাহ' : 'days/wk'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 col-span-2">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="font-bold text-foreground">
                        ৳ {job.salaryBudgetMin || 'Negotiable'} - ৳ {job.salaryBudgetMax || ''} / {job.salaryType === 'monthly' ? (isBn ? 'মাস' : 'month') : (isBn ? 'সেশন' : 'session')}
                      </span>
                    </div>
                  </div>

                  {/* Preferred Tutor Requirements */}
                  {job.preferredTutorBackground && (
                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40 text-[11px]">
                      <span className="text-muted-foreground font-semibold">
                        {isBn ? 'শিক্ষক পছন্দ:' : 'Tutor Criteria:'}
                      </span>{' '}
                      <span className="text-foreground">
                        {job.preferredTutorBackground} ({job.preferredTutorGender === 'female' ? (isBn ? 'মহিলা শিক্ষক' : 'Female') : job.preferredTutorGender === 'male' ? (isBn ? 'পুরুষ শিক্ষক' : 'Male') : (isBn ? 'যেকোনো' : 'Any')})
                      </span>
                    </div>
                  )}

                  {job.requirementsNotes && (
                    <p className="text-xs text-muted-foreground line-clamp-2 italic">
                      "{job.requirementsNotes}"
                    </p>
                  )}
                </CardContent>

                {/* Footer Action */}
                <div className="p-4 bg-muted/10 border-t border-border flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {job.learningMode === 'in_person' ? (isBn ? 'হোম টিউশন' : 'In-person Home Tutoring') : (isBn ? 'অনলাইন ক্লাস' : 'Live Online')}
                  </span>

                  {job.hasApplied ? (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      {isBn ? 'আবেদন করা হয়েছে' : 'Applied'}
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!isAuthenticated) {
                          window.location.href = withLocale('/login?redirect=/tuitions', locale);
                          return;
                        }
                        setSelectedRequest(job);
                        setProposedSalary(Number(job.salaryBudgetMax || job.salaryBudgetMin || 6000));
                      }}
                      className="font-bold"
                    >
                      {isBn ? 'আবেদন করুন' : 'Apply Now'}
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Apply Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <Card className="w-full max-w-lg bg-card border-border shadow-2xl p-6 relative animate-in zoom-in-95">
              <button
                type="button"
                onClick={() => {
                  setSelectedRequest(null);
                  setApplyFeedback(null);
                }}
                className="absolute right-4 top-4 text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>

              <h3 className="text-lg font-bold text-foreground mb-1">
                {isBn ? 'টিউশনে আবেদন করুন' : 'Apply for Tuition Request'}
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                {selectedRequest.requestReference} • {selectedRequest.studentName} ({selectedRequest.area || selectedRequest.district})
              </p>

              {applyFeedback && (
                <Alert
                  variant={applyFeedback.type === 'error' ? 'destructive' : 'default'}
                  className="mb-4"
                >
                  <AlertDescription>{applyFeedback.message}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    {isBn ? 'আপনার প্রস্তাবিত মাসিক পারিশ্রমিক (টাকায়)' : 'Proposed Monthly Salary (BDT)'}
                  </label>
                  <Input
                    type="number"
                    value={proposedSalary || ''}
                    onChange={(e) => setProposedSalary(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    {isBn ? 'কেন আপনি এই বিষয়ের জন্য উপযুক্ত শিক্ষক? *' : 'Why are you suitable for this tuition? *'}
                  </label>
                  <textarea
                    rows={4}
                    value={coverPitch}
                    onChange={(e) => setCoverPitch(e.target.value)}
                    placeholder={isBn ? 'আপনার শিক্ষাগত পটভূমি, অভিজ্ঞতা এবং কীভাবে ছাত্রকে পড়াবেন সংক্ষেপে লিখুন...' : 'Highlight your university background, subject expertise, and teaching approach...'}
                    className="w-full text-xs p-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedRequest(null);
                      setApplyFeedback(null);
                    }}
                    disabled={isApplying}
                  >
                    {isBn ? 'বাতিল' : 'Cancel'}
                  </Button>
                  <Button
                    onClick={handleApply}
                    disabled={isApplying}
                    className="flex items-center gap-1.5 font-bold"
                  >
                    {isApplying ? <LoadingSpinner size="sm" /> : <Send className="w-3.5 h-3.5" />}
                    {isBn ? 'আবেদন জমা দিন' : 'Submit Application'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
