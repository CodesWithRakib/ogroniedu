'use client';

import React, { useState } from 'react';
import {
  GraduationCap,
  Building2,
  BookOpen,
  Target,
  Edit3,
  ShieldCheck,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/Badge';
import {
  useUpsertStudentProfileMutation,
  type StudentProfileData,
} from '@/store/services/users-api';
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
        educationLevelId: educationLevelId && educationLevelId !== 'none' ? educationLevelId : undefined,
        curriculumId: curriculumId && curriculumId !== 'none' ? curriculumId : undefined,
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
      <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
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

            <Button
              variant="outline"
              size="xs"
              onClick={openModal}
              data-testid="edit-student-profile-btn"
              className="rounded-full gap-1.5 font-semibold"
            >
              <Edit3 className="h-3.5 w-3.5 text-primary" />
              <span>{isBn ? 'সম্পাদনা' : 'Edit'}</span>
            </Button>
          </div>

          {/* Academic Details Grid */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/20 border border-border/60">
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

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/20 border border-border/60">
              <BookOpen className="h-4 w-4 text-success shrink-0 mt-0.5" />
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
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/20 border border-border/60">
                <Sparkles className="h-4 w-4 text-warning shrink-0 mt-0.5" />
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

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/20 border border-border/60">
              <ShieldCheck className="h-4 w-4 text-info shrink-0 mt-0.5" />
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
            <div className="mt-3.5 p-3 rounded-xl bg-primary-soft/50 border border-primary/20 text-xs flex items-start gap-2.5">
              <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-primary block text-[11px]">
                  {isBn ? 'লক্ষ্য ও প্রস্তুতি' : 'Learning Goals'}
                </span>
                <p className="text-foreground/90 mt-0.5 line-clamp-2 leading-relaxed">
                  {studentProfile.learningGoals}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal using shadcn Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl p-6 bg-card border-border/80">
          <DialogHeader className="text-left pb-3 border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {isBn ? 'একাডেমিক প্রোফাইল আপডেট' : 'Update Academic Profile'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {isBn
                    ? 'আপনার স্কুল/কলেজ ও পাঠ্যক্রমের তথ্য আপডেট করুন'
                    : 'Keep your school, class, and learning goals up to date'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {errorMessage && (
            <Alert variant="destructive" className="mt-2 rounded-xl bg-destructive-soft border-destructive/30">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs font-semibold text-destructive">
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSave} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="academic-institution" className="text-xs font-semibold text-foreground">
                {isBn ? 'শিক্ষা প্রতিষ্ঠানের নাম' : 'Institution Name'}
              </Label>
              <Input
                id="academic-institution"
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder={
                  isBn
                    ? 'উদা: ঢাকা কলেজ / ভিকারুননিসা নূন'
                    : 'e.g. Dhaka College / Notre Dame College'
                }
                className="rounded-xl h-10"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="academic-level" className="text-xs font-semibold text-foreground">
                  {isBn ? 'শ্রেণী / পর্যায়' : 'Education Level'}
                </Label>
                <Select
                  value={educationLevelId || 'none'}
                  onValueChange={(val) => setEducationLevelId(val === 'none' ? '' : val)}
                >
                  <SelectTrigger id="academic-level" className="w-full h-10 rounded-xl bg-card border-border/80 text-xs">
                    <SelectValue
                      placeholder={isBn ? '-- শ্রেণী নির্বাচন করুন --' : '-- Select Level --'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      {isBn ? '-- শ্রেণী নির্বাচন করুন --' : '-- Select Level --'}
                    </SelectItem>
                    {educationLevels.map((lvl) => (
                      <SelectItem key={lvl.id} value={lvl.id}>
                        {isBn ? lvl.nameBn : lvl.nameEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="academic-curriculum" className="text-xs font-semibold text-foreground">
                  {isBn ? 'পাঠ্যক্রম (কারিকুলাম)' : 'Curriculum'}
                </Label>
                <Select
                  value={curriculumId || 'none'}
                  onValueChange={(val) => setCurriculumId(val === 'none' ? '' : val)}
                >
                  <SelectTrigger id="academic-curriculum" className="w-full h-10 rounded-xl bg-card border-border/80 text-xs">
                    <SelectValue
                      placeholder={isBn ? '-- কারিকুলাম নির্বাচন --' : '-- Select Curriculum --'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      {isBn ? '-- কারিকুলাম নির্বাচন --' : '-- Select Curriculum --'}
                    </SelectItem>
                    {curricula.map((cur) => (
                      <SelectItem key={cur.id} value={cur.id}>
                        {isBn ? cur.nameBn : cur.nameEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="academic-stream" className="text-xs font-semibold text-foreground">
                {isBn ? 'শাখা / বিভাগ' : 'Stream / Group'}
              </Label>
              <Input
                id="academic-stream"
                type="text"
                value={stream}
                onChange={(e) => setStream(e.target.value)}
                placeholder={
                  isBn
                    ? 'উদা: বিজ্ঞান (Science) / ব্যবসায় শিক্ষা'
                    : 'e.g. Science / Business Studies'
                }
                className="rounded-xl h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="academic-goals" className="text-xs font-semibold text-foreground">
                {isBn ? 'পড়ার লক্ষ্য ও প্রস্তুতি' : 'Learning Goals'}
              </Label>
              <Textarea
                id="academic-goals"
                rows={3}
                value={learningGoals}
                onChange={(e) => setLearningGoals(e.target.value)}
                placeholder={
                  isBn
                    ? 'উদা: এইচএসসি পরীক্ষায় গোল্ডেন জিপিএ ৫ এবং ইঞ্জিনিয়ারিং ভর্তি প্রস্তুতি।'
                    : 'e.g. Aiming for GPA 5.0 in Board exams and Engineering admission.'
                }
                className="rounded-xl bg-card border-border/80 text-xs resize-none"
              />
            </div>

            <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="rounded-xl shadow-xs font-semibold"
              >
                {isSaving
                  ? isBn
                    ? 'সংরক্ষণ হচ্ছে...'
                    : 'Saving...'
                  : isBn
                    ? 'সংরক্ষণ করুন'
                    : 'Save Profile'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
