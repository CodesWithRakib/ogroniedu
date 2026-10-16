'use client';

import React, { useState } from 'react';
import {
  GraduationCap,
  Building2,
  BookOpen,
  Target,
  Edit3,
  ShieldCheck,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';
import { useUpsertStudentProfileMutation, type StudentProfileData } from '@/store/services/users-api';
import { useGetEducationLevelsQuery, useGetCurriculaQuery } from '@/store/services/taxonomy-api';
import { useAppDispatch } from '@/store';
import { enqueueToast } from '@/store/slices/ui-slice';
import type { Locale } from '@/lib/i18n';
import type { LinkedGuardian } from '@/store/services/guardians-api';

interface StudentAcademicProfileCardProps {
  locale: Locale;
  studentProfile: StudentProfileData | null;
  isMinor: boolean;
  guardians: LinkedGuardian[];
  studentName?: string;
}

export function StudentAcademicProfileCard({
  locale,
  studentProfile,
  isMinor,
  guardians,
  studentName,
}: StudentAcademicProfileCardProps) {
  const isBn = locale === 'bn';
  const dispatch = useAppDispatch();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: levelsData } = useGetEducationLevelsQuery();
  const { data: curriculaData } = useGetCurriculaQuery();
  const [upsertProfile, { isLoading: isSaving }] = useUpsertStudentProfileMutation();

  const educationLevels = levelsData?.data ?? [];
  const curricula = curriculaData?.data ?? [];

  // Form state
  const [institution, setInstitution] = useState(studentProfile?.institutionName ?? '');
  const [educationLevelId, setEducationLevelId] = useState(studentProfile?.educationLevelId ?? '');
  const [curriculumId, setCurriculumId] = useState(studentProfile?.curriculumId ?? '');
  const [stream, setStream] = useState(studentProfile?.stream ?? '');
  const [learningGoals, setLearningGoals] = useState(studentProfile?.learningGoals ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state when studentProfile changes or modal opens
  const openModal = () => {
    setInstitution(studentProfile?.institutionName ?? '');
    setEducationLevelId(studentProfile?.educationLevelId ?? '');
    setCurriculumId(studentProfile?.curriculumId ?? '');
    setStream(studentProfile?.stream ?? '');
    setLearningGoals(studentProfile?.learningGoals ?? '');
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      await upsertProfile({
        institutionName: institution.trim() || undefined,
        educationLevelId: educationLevelId || undefined,
        curriculumId: curriculumId || undefined,
        stream: stream.trim() || undefined,
        learningGoals: learningGoals.trim() || undefined,
      }).unwrap();

      dispatch(
        enqueueToast({
          title: isBn ? 'প্রোফাইল আপডেট সফল' : 'Academic Profile Updated',
          message: isBn
            ? 'আপনার একাডেমিক তথ্য সফলভাবে সংরক্ষিত হয়েছে।'
            : 'Your academic credentials have been saved.',
          type: 'success',
        }),
      );
      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'data' in err
          ? String((err as { data?: { message?: string } }).data?.message ?? '')
          : isBn
            ? 'প্রোফাইল সংরক্ষণে সমস্যা হয়েছে।'
            : 'Failed to update academic profile.';
      setErrorMessage(msg);
    }
  };

  // Find resolved names
  const currentLevel = educationLevels.find((l) => l.id === studentProfile?.educationLevelId);
  const currentCurriculum = curricula.find((c) => c.id === studentProfile?.curriculumId);

  const levelName =
    (isBn ? currentLevel?.nameBn : currentLevel?.nameEn) ??
    currentLevel?.nameBn ??
    currentLevel?.nameEn ??
    (isBn ? 'শ্রেণী নির্ধারিত হয়নি' : 'Level Not Set');

  const curriculumName =
    (isBn ? currentCurriculum?.nameBn : currentCurriculum?.nameEn) ??
    currentCurriculum?.nameBn ??
    currentCurriculum?.nameEn ??
    (isBn ? 'জাতীয় পাঠ্যক্রম' : 'National Curriculum');

  return (
    <>
      <div className="bg-card border border-border/70 rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden flex flex-col justify-between">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/25 text-primary flex items-center justify-center shrink-0">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {isBn ? 'একাডেমিক প্রোফাইল' : 'Academic Profile'}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-foreground">
                  {studentName ?? (isBn ? 'শিক্ষার্থী' : 'Student')}
                </h3>
              </div>
            </div>

            <button
              onClick={openModal}
              data-testid="edit-student-profile-btn"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-primary hover:text-primary-foreground hover:bg-primary border border-primary/30 transition-all duration-200"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>{isBn ? 'সম্পাদনা' : 'Edit'}</span>
            </button>
          </div>

          {/* Academic Details Grid */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-surface/50 border border-border/40">
              <Building2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground font-medium">
                  {isBn ? 'শিক্ষা প্রতিষ্ঠান' : 'Institution'}
                </p>
                <p className="font-bold text-foreground truncate mt-0.5">
                  {studentProfile?.institutionName || (isBn ? 'যুক্ত করা হয়নি' : 'Not specified')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-surface/50 border border-border/40">
              <BookOpen className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground font-medium">
                  {isBn ? 'শ্রেণী ও কারিকুলাম' : 'Class & Curriculum'}
                </p>
                <p className="font-bold text-foreground truncate mt-0.5">
                  {levelName} • {curriculumName}
                </p>
              </div>
            </div>

            {studentProfile?.stream && (
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-surface/50 border border-border/40">
                <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground font-medium">
                    {isBn ? 'বিভাগ / শাখা' : 'Stream / Group'}
                  </p>
                  <p className="font-bold text-foreground truncate mt-0.5">
                    {studentProfile.stream}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-surface/50 border border-border/40">
              <ShieldCheck className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground font-medium">
                  {isBn ? 'অভিভাবক স্থিতি' : 'Guardian Status'}
                </p>
                <p className="font-bold text-foreground truncate mt-0.5">
                  {isMinor
                    ? isBn
                      ? 'অপ্রাপ্তবয়স্ক (অভিভাবক লিঙ্কযুক্ত)'
                      : 'Minor (Guardian Linked)'
                    : guardians.length > 0
                      ? isBn
                        ? `${guardians.length} জন অভিভাবক লিঙ্ক`
                        : `${guardians.length} Linked Guardian(s)`
                      : isBn
                        ? 'স্বতন্ত্র শিক্ষার্থী'
                        : 'Independent Learner'}
                </p>
              </div>
            </div>
          </div>

          {/* Learning Goals Banner */}
          {studentProfile?.learningGoals && (
            <div className="mt-3 p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs flex items-start gap-2">
              <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-primary block text-[11px]">
                  {isBn ? 'লক্ষ্য ও প্রস্তুতি' : 'Learning Goals'}
                </span>
                <p className="text-foreground/90 mt-0.5 line-clamp-2">
                  {studentProfile.learningGoals}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-card border border-border/80 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative text-foreground">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-surface text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-border/50">
              <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/25 text-primary flex items-center justify-center">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold">
                  {isBn ? 'একাডেমিক প্রোফাইল আপডেট' : 'Update Academic Profile'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isBn
                    ? 'আপনার স্কুল/কলেজ ও পাঠ্যক্রমের তথ্য আপডেট করুন'
                    : 'Keep your school, class, and learning goals up to date'}
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-500 font-semibold">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  {isBn ? 'শিক্ষা প্রতিষ্ঠানের নাম' : 'Institution Name'}
                </label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder={
                    isBn
                      ? 'উদা: ঢাকা কলেজ / ভিকারুননিসা নূন'
                      : 'e.g. Dhaka College / Notre Dame College'
                  }
                  className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    {isBn ? 'শ্রেণী / পর্যায়' : 'Education Level'}
                  </label>
                  <select
                    value={educationLevelId}
                    onChange={(e) => setEducationLevelId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">{isBn ? '-- শ্রেণী নির্বাচন করুন --' : '-- Select Level --'}</option>
                    {educationLevels.map((lvl) => (
                      <option key={lvl.id} value={lvl.id}>
                        {isBn ? lvl.nameBn : lvl.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    {isBn ? 'পাঠ্যক্রম (কারিকুলাম)' : 'Curriculum'}
                  </label>
                  <select
                    value={curriculumId}
                    onChange={(e) => setCurriculumId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">{isBn ? '-- কারিকুলাম নির্বাচন --' : '-- Select Curriculum --'}</option>
                    {curricula.map((cur) => (
                      <option key={cur.id} value={cur.id}>
                        {isBn ? cur.nameBn : cur.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  {isBn ? 'শাখা / বিভাগ' : 'Stream / Group'}
                </label>
                <input
                  type="text"
                  value={stream}
                  onChange={(e) => setStream(e.target.value)}
                  placeholder={
                    isBn ? 'উদা: বিজ্ঞান (Science) / ব্যবসায় শিক্ষা' : 'e.g. Science / Business Studies'
                  }
                  className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  {isBn ? 'পড়ার লক্ষ্য ও প্রস্তুতি' : 'Learning Goals'}
                </label>
                <textarea
                  rows={3}
                  value={learningGoals}
                  onChange={(e) => setLearningGoals(e.target.value)}
                  placeholder={
                    isBn
                      ? 'উদা: এইচএসসি পরীক্ষায় গোল্ডেন জিপিএ ৫ এবং ইঞ্জিনিয়ারিং ভর্তি প্রস্তুতি।'
                      : 'e.g. Aiming for GPA 5.0 in Board exams and Engineering admission.'
                  }
                  className="w-full p-3 rounded-xl bg-surface border border-border text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-surface transition-colors"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs shadow-sm shadow-primary/25 transition-transform active:scale-95 disabled:opacity-50"
                >
                  {isSaving
                    ? isBn
                      ? 'সংরক্ষণ হচ্ছে...'
                      : 'Saving...'
                    : isBn
                      ? 'সংরক্ষণ করুন'
                      : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
