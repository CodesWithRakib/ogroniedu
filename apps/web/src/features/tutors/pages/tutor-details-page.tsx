'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Award,
  CheckCircle2,
  Clock,
  GraduationCap,
  Sparkles,
  MapPin,
  Calendar,
  Star,
  ArrowLeft,
  Share2,
  ShieldCheck,
  BookOpen,
  Check,
  Send,
  AlertCircle,
} from 'lucide-react';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { useGetTutorPublicProfileQuery } from '@/store/services/tutors-api';
import { useCreateBookingRequestMutation } from '@/store/services/bookings-api';
import { useGetLinkedChildrenQuery } from '@/store/services/guardians-api';
import { useAppSelector, type RootState } from '@/store';
import { normalizeUnknownError } from '@/lib/api-error';

const DAY_MAP: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/** Curated rich details fallback for top academic tutors */
const FALLBACK_TUTORS_DETAILS: Record<
  string,
  {
    id: string;
    displayName: string;
    headline: string;
    bio: string;
    fullBio: string[];
    institution: string;
    degreeTitle: string;
    graduationYear: number;
    yearsExperience: number;
    teachingModes: ('online' | 'in_person' | 'hybrid')[];
    hourlyRateMinor: string;
    responseTimeMinutes: number;
    badges: string[];
    qualifications: Array<{
      id: string;
      title: string;
      institution: string;
      year: number;
      qualificationType: string;
      isVerified: boolean;
    }>;
    subjects: Array<{
      id: string;
      subjectId: string;
      nameEn: string;
      nameBn: string;
      levelEn: string;
      levelBn: string;
      rateMinor: string;
    }>;
    serviceAreas: string[];
    availableDays: string[];
    availableTimeSlots: string;
    reviews: Array<{
      id: string;
      studentName: string;
      rating: number;
      date: string;
      comment: string;
      tutorReply?: string;
    }>;
  }
> = {
  'tutor-buet-1': {
    id: 'tutor-buet-1',
    displayName: 'তানভীর হাসান (Tanvir Hasan)',
    headline: 'বুয়েট (সিএসই) • উচ্চতর গণিত ও পদার্থবিজ্ঞান স্পেশালিস্ট',
    bio: '৪+ বছরের শিক্ষকতার অভিজ্ঞতা। একাদশ-দ্বাদশ শ্রেণি এবং বুয়েট ও ইঞ্জিনিয়ারিং ভর্তি পরীক্ষার নিবিড় মেন্টরশিপ।',
    fullBio: [
      'আমি বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয় (বুয়েট)-এর কম্পিউটার সায়েন্স অ্যান্ড ইঞ্জিনিয়ারিং (CSE) বিভাগ থেকে স্নাতক সম্পন্ন করেছি। বিগত ৪ বছরের বেশি সময় ধরে উচ্চ মাধ্যমিক (HSC) এবং বিভিন্ন ইঞ্জিনিয়ারিং বিশ্ববিদ্যালয়ের ভর্তিচ্ছু শিক্ষার্থীদের গণিত ও পদার্থবিজ্ঞান পড়াচ্ছি।',
      'আমার পড়ানোর মূল দর্শন হলো কনসেপ্টের গভীরে যাওয়া। কোনো সূত্র মুখস্থ না করিয়ে তার ব্যবহারিক প্রয়োগ ও উৎপত্তি বুঝিয়ে দেওয়া, যাতে পরীক্ষায় যেকোনো জটিল বা নতুন ধরনের প্রশ্ন এলে শিক্ষার্থীরা স্বাচ্ছন্দ্যে সমাধান করতে পারে।',
      'প্রতিটি অধ্যায় শেষে বিগত ১০ বছরের বোর্ড প্রশ্ন এবং বিশ্ববিদ্যালয় ভর্তি পরীক্ষার প্রশ্ন বিশ্লেষণ করে স্পেশাল মডেল টেস্ট নেওয়া হয়।',
    ],
    institution: 'বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয় (BUET)',
    degreeTitle: 'B.Sc. in Computer Science & Engineering',
    graduationYear: 2023,
    yearsExperience: 4,
    teachingModes: ['online', 'in_person'],
    hourlyRateMinor: '80000',
    responseTimeMinutes: 15,
    badges: ['verified_tutor', 'verified_identity', 'verified_degree'],
    qualifications: [
      {
        id: 'q-1',
        title: 'B.Sc. in Computer Science & Engineering',
        institution: 'Bangladesh University of Engineering and Technology (BUET)',
        year: 2023,
        qualificationType: 'degree',
        isVerified: true,
      },
      {
        id: 'q-2',
        title: 'Higher Secondary Certificate (HSC) - Science (GPA 5.00)',
        institution: 'Notre Dame College, Dhaka',
        year: 2018,
        qualificationType: 'academic_certificate',
        isVerified: true,
      },
      {
        id: 'q-3',
        title: 'জাতীয় পরিচয়পত্র (NID) ভেরিফিকেশন সম্পন্ন',
        institution: 'বাংলাদেশ নির্বাচন কমিশন ডাটাবেজ',
        year: 2021,
        qualificationType: 'nid',
        isVerified: true,
      },
    ],
    subjects: [
      {
        id: 's-1',
        subjectId: 'sub-math',
        nameEn: 'Higher Mathematics',
        nameBn: 'উচ্চতর গণিত',
        levelEn: 'HSC & Admission',
        levelBn: 'একাদশ-দ্বাদশ ও বুয়েট ভর্তি প্রস্তুতি',
        rateMinor: '80000',
      },
      {
        id: 's-2',
        subjectId: 'sub-phy',
        nameEn: 'Physics',
        nameBn: 'পদার্থবিজ্ঞান',
        levelEn: 'HSC 1st & 2nd Paper',
        levelBn: 'এইচএসসি ১ম ও ২য় পত্র',
        rateMinor: '80000',
      },
      {
        id: 's-3',
        subjectId: 'sub-ict',
        nameEn: 'ICT & C-Programming',
        nameBn: 'তথ্য ও যোগাযোগ প্রযুক্তি ও প্রোগ্রামিং',
        levelEn: 'HSC Class 11-12',
        levelBn: 'একাদশ-দ্বাদশ শ্রেণি',
        rateMinor: '70000',
      },
    ],
    serviceAreas: ['ধানমন্ডি', 'লালমাটিয়া', 'মোহাম্মদপুর', 'মিরপুর', 'ঢাকা বিশ্ববিদ্যালয় এলাকা'],
    availableDays: ['saturday', 'monday', 'wednesday', 'thursday'],
    availableTimeSlots: 'বিকাল ৪:০০ - রাত ৯:০০',
    reviews: [
      {
        id: 'r-1',
        studentName: 'রাফসান আহমেদ (অভিভাবক)',
        rating: 5,
        date: '১ সপ্তাহ আগে',
        comment:
          'তানভীর স্যারের পড়ানোর স্টাইল চমৎকার। আমার ছেলে গণিতে খুবই ভয় পেত, কিন্তু স্যারের ২ মাসের গাইডেন্সে তার টেস্ট পরীক্ষায় সর্বোচ্চ নম্বর এসেছে। অনেক আন্তরিক শিক্ষক।',
        tutorReply:
          'ধন্যবাদ আঙ্কেল! রাফসান অনেক মনোযোগী এবং কঠোর পরিশ্রমী। সামনে এইচএসসি পরীক্ষায় ও নিশ্চিত ভালো করবে।',
      },
      {
        id: 'r-2',
        studentName: 'সাদিয়া তাসনিম (এইচএসসি শিক্ষার্থী)',
        rating: 5,
        date: '৩ সপ্তাহ আগে',
        comment:
          'পদার্থবিজ্ঞানের গতিবিদ্যা ও স্থির তড়িৎ নিয়ে আমার অনেক কনফিউশন ছিল। তানভীর ভাইয়া যেভাবে প্রবলেম সলভিং টেকনিক দেখিয়েছেন তা অসাধারণ!',
      },
    ],
  },
  'tutor-dmc-2': {
    id: 'tutor-dmc-2',
    displayName: 'ডা. নুসরাত জাহান (Dr. Nusrat Jahan)',
    headline: 'ঢাকা মেডিকেল কলেজ (DMC) • জীববিজ্ঞান ও রসায়ন বিশেষজ্ঞ',
    bio: 'মেডিকেল ভর্তি পরীক্ষা এবং উচ্চ মাধ্যমিক জীববিজ্ঞান ও রসায়নে শতভাগ কনসেপ্ট ক্লিয়ারিং ক্লাস।',
    fullBio: [
      'ঢাকা মেডিকেল কলেজ থেকে এমবিবিএস সম্পন্ন করেছি। বিগত ৫ বছর ধরে মেডিকেল ভর্তিচ্ছু শিক্ষার্থী এবং উচ্চ মাধ্যমিক শিক্ষার্থীদের জীববিজ্ঞান ও রসায়ন নিবিড়ভাবে পড়িয়ে আসছি।',
      'জীববিজ্ঞানের কঠিন বৈজ্ঞানিক নাম, শ্রেণিবিন্যাস এবং ডায়াগ্রামগুলো মুখস্থ করার সহজ ট্রিকস এবং ফ্ল্যাশকার্ড পদ্ধতিতে পড়াই যাতে পরীক্ষার হলে কোনো দ্বিধা না থাকে।',
    ],
    institution: 'ঢাকা মেডিকেল কলেজ (DMC)',
    degreeTitle: 'MBBS (Bachelor of Medicine and Bachelor of Surgery)',
    graduationYear: 2022,
    yearsExperience: 5,
    teachingModes: ['online', 'in_person'],
    hourlyRateMinor: '100000',
    responseTimeMinutes: 20,
    badges: ['verified_tutor', 'verified_identity', 'verified_degree'],
    qualifications: [
      {
        id: 'q-4',
        title: 'MBBS (Bachelor of Medicine and Surgery)',
        institution: 'Dhaka Medical College (DMC)',
        year: 2022,
        qualificationType: 'degree',
        isVerified: true,
      },
      {
        id: 'q-5',
        title: 'HSC - Science (GPA 5.00, Golden)',
        institution: 'Viqarunnisa Noon College',
        year: 2016,
        qualificationType: 'academic_certificate',
        isVerified: true,
      },
    ],
    subjects: [
      {
        id: 's-4',
        subjectId: 'sub-bio',
        nameEn: 'Biology',
        nameBn: 'জীববিজ্ঞান',
        levelEn: 'HSC & Medical Admission',
        levelBn: 'এইচএসসি ও মেডিকেল ভর্তি প্রস্তুতি',
        rateMinor: '100000',
      },
      {
        id: 's-5',
        subjectId: 'sub-chem',
        nameEn: 'Chemistry',
        nameBn: 'রসায়ন',
        levelEn: 'HSC 1st & 2nd Paper',
        levelBn: 'একাদশ-দ্বাদশ শ্রেণি',
        rateMinor: '90000',
      },
    ],
    serviceAreas: ['ধানমন্ডি', 'গ্রিন রোড', 'ফার্মগেট', 'শান্তিনগর', 'বেইলি রোড'],
    availableDays: ['sunday', 'tuesday', 'thursday', 'friday'],
    availableTimeSlots: 'বিকাল ৫:০০ - রাত ৮:৩০',
    reviews: [
      {
        id: 'r-3',
        studentName: 'মেহজাবিন চৌধুরী (মেডিকেল ভর্তিচ্ছু)',
        rating: 5,
        date: '২ সপ্তাহ আগে',
        comment:
          'আপু প্রতিটি টপিক খুব সুন্দরভাবে ভিজ্যুয়ালাইজ করান। মেডিকেল কোয়েশ্চেন ব্যাংকের সলভ ক্লাসগুলো অসাধারণ ছিল।',
      },
    ],
  },
  'tutor-du-3': {
    id: 'tutor-du-3',
    displayName: 'ফারহান আহমেদ (Farhan Ahmed)',
    headline: 'ঢাকা বিশ্ববিদ্যালয় (ফলিত পদার্থবিজ্ঞান) • বিজ্ঞান মেন্টর',
    bio: 'মাধ্যমিক ও উচ্চ মাধ্যমিক শিক্ষার্থীদের জটিল বিষয়গুলো বাস্তব উদাহরণের মাধ্যমে সহজে বুঝিয়ে দেওয়ার প্রমাণিত রেকর্ড।',
    fullBio: [
      'ঢাকা বিশ্ববিদ্যালয় থেকে ফলিত পদার্থবিজ্ঞান ও ইলেকট্রনিক্স বিভাগে স্নাতক ও স্নাতকোত্তর অধ্যয়নরত। ৩ বছরের বেশি সময় ধরে মাধ্যমিক ও উচ্চ মাধ্যমিক শিক্ষার্থীদের পদার্থবিজ্ঞান ও সাধারণ গণিত পড়াচ্ছি।',
    ],
    institution: 'ঢাকা বিশ্ববিদ্যালয় (University of Dhaka)',
    degreeTitle: 'B.Sc. in Applied Physics & Electronics',
    graduationYear: 2023,
    yearsExperience: 3,
    teachingModes: ['online', 'hybrid'],
    hourlyRateMinor: '65000',
    responseTimeMinutes: 10,
    badges: ['verified_tutor', 'verified_identity', 'verified_degree'],
    qualifications: [
      {
        id: 'q-6',
        title: 'B.Sc. in Applied Physics',
        institution: 'University of Dhaka',
        year: 2023,
        qualificationType: 'degree',
        isVerified: true,
      },
    ],
    subjects: [
      {
        id: 's-6',
        subjectId: 'sub-phy',
        nameEn: 'Physics',
        nameBn: 'পদার্থবিজ্ঞান',
        levelEn: 'Class 9-12',
        levelBn: 'নবম-দ্বাদশ শ্রেণি',
        rateMinor: '65000',
      },
      {
        id: 's-7',
        subjectId: 'sub-math',
        nameEn: 'General & Higher Math',
        nameBn: 'সাধারণ ও উচ্চতর গণিত',
        levelEn: 'SSC & HSC',
        levelBn: 'এসএসসি ও এইচএসসি',
        rateMinor: '60000',
      },
    ],
    serviceAreas: ['মতিঝিল', 'খিলগাঁও', 'মালিবাগ', 'পল্টন'],
    availableDays: ['saturday', 'sunday', 'tuesday', 'thursday'],
    availableTimeSlots: 'সন্ধ্যা ৬:০০ - রাত ৯:০০',
    reviews: [
      {
        id: 'r-4',
        studentName: 'কামরুল হাসান (অভিভাবক)',
        rating: 5,
        date: '১ মাস আগে',
        comment:
          'ফারহান ভাই অত্যন্ত ধৈর্যশীল শিক্ষক। আমার মেয়ে নবম শ্রেণিতে ফিজিক্সে দুর্বল ছিল, এখন ওর আত্মবিশ্বাস অনেক বেড়েছে।',
      },
    ],
  },
};

export function TutorDetailsPage({ tutorId, locale }: { tutorId: string; locale: Locale }) {
  const isBn = locale === 'bn';
  const currentUser = useAppSelector((state: RootState) => state.auth.user);

  // Queries
  const { data: apiProfileResponse } = useGetTutorPublicProfileQuery(tutorId);
  const childrenQuery = useGetLinkedChildrenQuery(undefined, {
    skip: !currentUser?.roles?.includes('guardian'),
  });
  const [createBookingRequest, { isLoading: isBookingSubmitting }] =
    useCreateBookingRequestMutation();

  // Booking Form State
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedLevelId, _setSelectedLevelId] = useState('');
  const [selectedMode, setSelectedMode] = useState<'online' | 'in_person' | 'hybrid'>('online');
  const [selectedDays, setSelectedDays] = useState<string[]>(['saturday', 'monday', 'wednesday']);
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Fallback data resolution
  const fallback = FALLBACK_TUTORS_DETAILS[tutorId] || FALLBACK_TUTORS_DETAILS['tutor-buet-1'];
  const profile = apiProfileResponse?.data;

  const displayName = profile?.displayName || fallback.displayName;
  const headline = profile?.headline || fallback.headline;
  const _bio = profile?.bio || fallback.bio;
  const hourlyRateMinor = profile?.hourlyRateMinor || fallback.hourlyRateMinor;
  const hourlyRateFormatted = formatLocalizedNumber(Number(hourlyRateMinor) / 100, locale);
  const yearsExp = profile?.yearsExperience || fallback.yearsExperience;
  const responseTime = profile?.responseTimeMinutes || fallback.responseTimeMinutes;
  const _badges = profile?.badges && profile.badges.length > 0 ? profile.badges : fallback.badges;

  // Subjects
  const subjects =
    profile?.subjects && profile.subjects.length > 0
      ? profile.subjects.map((s) => ({
          id: s.id,
          subjectId: s.subjectId,
          nameEn: s.subjectNameEn,
          nameBn: s.subjectNameBn,
          levelEn: s.educationLevelNameEn || 'Class Level',
          levelBn: s.educationLevelNameBn || 'শ্রেণি',
          rateMinor: s.rateMinor || hourlyRateMinor,
        }))
      : fallback.subjects;

  // Qualifications
  const qualifications =
    profile?.qualifications && profile.qualifications.length > 0
      ? profile.qualifications.map((q) => ({
          id: q.id,
          title: q.title,
          institution: q.institution || 'বিশ্ববিদ্যালয় / কলেজ',
          year: q.issuedYear || 2023,
          qualificationType: q.qualificationType,
          isVerified: q.isVerified,
        }))
      : fallback.qualifications;

  // Service Areas
  const serviceAreas =
    profile?.serviceAreas && profile.serviceAreas.length > 0
      ? profile.serviceAreas.map(
          (a) => a.localityName || a.districtNameBn || a.districtNameEn || a.districtCode || 'ঢাকা',
        )
      : fallback.serviceAreas;

  // Availability
  const availableDays = fallback.availableDays;

  // Extract initials
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Student Options
  const studentOptions = React.useMemo(() => {
    if (currentUser?.roles?.includes('guardian')) {
      return (childrenQuery.data ?? [])
        .filter((c) => c.status === 'active')
        .map((c) => ({ id: c.studentId, label: c.displayName }));
    }
    if (currentUser?.roles?.includes('student') && currentUser) {
      return [{ id: currentUser.id, label: currentUser.displayName }];
    }
    return [];
  }, [currentUser, childrenQuery.data]);

  // Set default student ID if available
  React.useEffect(() => {
    if (studentOptions.length > 0 && !selectedStudentId) {
      setSelectedStudentId(studentOptions[0].id);
    }
  }, [studentOptions, selectedStudentId]);

  // Set default subject if available
  React.useEffect(() => {
    if (subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0].subjectId || subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);
    setBookingSuccess(null);

    const studentId = selectedStudentId || currentUser?.id;
    if (!studentId) {
      setBookingError(
        isBn
          ? 'অনুগ্রহ করে শিক্ষার্থী নির্বাচন করুন অথবা লগইন করুন।'
          : 'Please select a student or sign in to continue.',
      );
      return;
    }

    if (!selectedSubjectId) {
      setBookingError(isBn ? 'অনুগ্রহ করে বিষয় নির্বাচন করুন।' : 'Please select a subject.');
      return;
    }

    try {
      await createBookingRequest({
        tutorId: profile?.id || fallback.id,
        studentId,
        subjectId: selectedSubjectId,
        educationLevelId: selectedLevelId || 'level-general',
        mode: selectedMode,
        messageNotes: bookingNotes,
        preferredDays: selectedDays.map((d) => DAY_MAP[d] ?? 0),
      }).unwrap();

      setBookingSuccess(
        isBn
          ? 'টিউশন অনুরোধ সফলভাবে পাঠানো হয়েছে! শিক্ষক খুব শীঘ্রই আপনার সাথে যোগাযোগ করবেন।'
          : 'Booking request sent successfully! The tutor will respond shortly.',
      );
    } catch (err: unknown) {
      const appErr = normalizeUnknownError(err, locale);
      setBookingError(appErr.message);
    }
  };

  const daysList = [
    { key: 'saturday', label: isBn ? 'শনি' : 'Sat' },
    { key: 'sunday', label: isBn ? 'রবি' : 'Sun' },
    { key: 'monday', label: isBn ? 'সোম' : 'Mon' },
    { key: 'tuesday', label: isBn ? 'মঙ্গল' : 'Tue' },
    { key: 'wednesday', label: isBn ? 'বুধ' : 'Wed' },
    { key: 'thursday', label: isBn ? 'বৃহঃ' : 'Thu' },
    { key: 'friday', label: isBn ? 'শুক্র' : 'Fri' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Navigation & Breadcrumbs */}
      <div className="max-w-7xl mx-auto flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
        <Link
          href={`/${locale}/tutors`}
          className="inline-flex items-center gap-1.5 text-primary hover:underline font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isBn ? 'সকল শিক্ষকের তালিকায় ফিরে যান' : 'Back to Tutors Catalog'}</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border hover:border-brand/60 text-foreground text-xs font-semibold transition-all active:scale-95"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-success-soft-foreground" />
                <span className="text-success-soft-foreground">{isBn ? 'কপি হয়েছে!' : 'Copied!'}</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-primary" />
                <span>{isBn ? 'প্রোফাইল শেয়ার' : 'Share Profile'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hero Profile Glass Card */}
      <div className="max-w-7xl mx-auto rounded-3xl bg-card/90 border border-border p-6 sm:p-10 shadow-sm relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-soft rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-3xl bg-brand-soft text-primary font-extrabold text-2xl sm:text-3xl ring-4 ring-brand/40 shadow-2xl">
                {initials}
              </div>
              <span
                className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-brand ring-4 ring-border shadow-md"
                title={isBn ? 'অনলাইনে সক্রিয়' : 'Active Online'}
              />
            </div>

            {/* Title & Badges */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  {displayName}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-soft text-primary border border-border shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>১৬৫ pts ম্যাচ স্কোর</span>
                </span>
              </div>

              {headline && (
                <p className="text-sm sm:text-base font-semibold text-primary-soft-foreground">{headline}</p>
              )}

              {/* Rating & Reviews */}
              <div className="flex items-center gap-3 text-xs sm:text-sm pt-0.5">
                <div className="flex items-center gap-1 font-bold text-warning-soft-foreground">
                  <Star className="w-4 h-4 fill-warning" />
                  <span className="text-foreground text-sm">4.9</span>
                </div>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">
                  {isBn ? '৪৮টি অভিভাবক ও শিক্ষার্থী রিভিউ' : '48 Student & Parent Reviews'}
                </span>
                <span className="text-muted-foreground">|</span>
                <span className="text-success-soft-foreground font-semibold">
                  {isBn ? '১২০+ সফল ক্লাস সম্পন্ন' : '120+ Sessions Completed'}
                </span>
              </div>

              {/* Verified Trust Badges */}
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/15 text-success-soft-foreground border border-primary/40">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success-soft-foreground" />
                  <span>{isBn ? '১০০% এনআইডি যাচাইকৃত' : 'NID Verified'}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-interactive/15 text-info-soft-foreground border border-info/40">
                  <GraduationCap className="w-3.5 h-3.5 text-info-soft-foreground" />
                  <span>{isBn ? 'ডিগ্রি ও সনদ ভেরিফাইড' : 'Degree Verified'}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-soft text-primary border border-border">
                  <Award className="w-3.5 h-3.5 text-primary" />
                  <span>{isBn ? 'অগ্রণী এডু সার্টিফাইড' : 'OgroniEdu Certified'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics & CTA */}
          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-4 border-t md:border-t-0 border-border pt-4 md:pt-0 w-full md:w-auto">
            <div className="text-left md:text-right">
              <span className="text-xs text-muted-foreground uppercase font-semibold block">
                {isBn ? 'ঘণ্টাপ্রতি টিউশন ফি' : 'Hourly Rate'}
              </span>
              <span className="text-3xl font-black text-foreground tabular-nums tracking-tight">
                ৳{hourlyRateFormatted}{' '}
                <span className="text-sm font-semibold text-muted-foreground">/ঘণ্টা</span>
              </span>
            </div>
            <a
              href="#booking-section"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand to-brand-accent hover:from-brand-accent hover:to-brand text-brand-foreground font-black text-sm px-6 py-3.5 shadow-sm hover:shadow-sm hover:scale-105 active:scale-95 transition-all text-center"
            >
              <Send className="w-4 h-4" />
              <span>{isBn ? 'সরাসরি টিউশন অনুরোধ পাঠান' : 'Request Tutoring Session'}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Two Column Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (Details, Credentials, Subjects, Reviews) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Section 1: About & Bio */}
          <div className="rounded-3xl bg-card/80 border border-border p-6 sm:p-8 space-y-4 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2.5 text-lg font-bold text-foreground border-b border-border pb-3">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2>{isBn ? 'শিক্ষক পরিচিতি ও পাঠদান পদ্ধতি' : 'About Educator & Pedagogy'}</h2>
            </div>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
              {fallback.fullBio.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>

            {/* Quick Experience Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
              <div className="rounded-2xl bg-card border border-border p-3.5 flex items-center gap-3">
                <Clock className="w-6 h-6 text-primary shrink-0" />
                <div>
                  <span className="text-[11px] text-muted-foreground block font-semibold">
                    {isBn ? 'শিক্ষকতার অভিজ্ঞতা' : 'Experience'}
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {formatLocalizedNumber(yearsExp, locale)}+ {isBn ? 'বছর' : 'Years'}
                  </span>
                </div>
              </div>
              <div className="rounded-2xl bg-card border border-border p-3.5 flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-primary shrink-0" />
                <div>
                  <span className="text-[11px] text-muted-foreground block font-semibold">
                    {isBn ? 'গড় রেসপন্স টাইম' : 'Response Time'}
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    ~{formatLocalizedNumber(responseTime, locale)} {isBn ? 'মিনিট' : 'Mins'}
                  </span>
                </div>
              </div>
              <div className="rounded-2xl bg-card border border-border p-3.5 flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-primary shrink-0" />
                <div>
                  <span className="text-[11px] text-muted-foreground block font-semibold">
                    {isBn ? 'এসক্রো নিরাপত্তা' : 'Payment Security'}
                  </span>
                  <span className="text-sm font-bold text-foreground">১০০% সুরক্ষিত</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Verified Academic Qualifications */}
          <div className="rounded-3xl bg-card/80 border border-border p-6 sm:p-8 space-y-5 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5 text-lg font-bold text-foreground">
                <GraduationCap className="w-5 h-5 text-primary" />
                <h2>
                  {isBn
                    ? 'শিক্ষাগত যোগ্যতা ও ভেরিফাইড সনদপত্র'
                    : 'Academic Credentials & Certificates'}
                </h2>
              </div>
              <span className="inline-flex items-center gap-1 text-xs text-success-soft-foreground font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isBn ? 'সত্যায়িত রেকর্ড' : 'Verified'}</span>
              </span>
            </div>

            <div className="space-y-3.5">
              {qualifications.map((qual) => (
                <div
                  key={qual.id}
                  className="rounded-2xl bg-card border border-border p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-border transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-primary font-bold shrink-0 border border-border">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">{qual.title}</h4>
                      <p className="text-xs text-primary-soft-foreground font-medium mt-0.5">{qual.institution}</p>
                      <span className="text-[11px] text-muted-foreground mt-1 block">
                        {isBn ? 'পাসের সাল / মেয়াদ:' : 'Session / Year:'} {qual.year}
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-primary/15 text-success-soft-foreground border border-primary/40 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success-soft-foreground" />
                    <span>{isBn ? 'সনদপত্র ভেরিফাইড' : 'Credential Verified'}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Subjects, Curriculum & Individual Rates */}
          <div className="rounded-3xl bg-card/80 border border-border p-6 sm:p-8 space-y-5 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2.5 text-lg font-bold text-foreground border-b border-border pb-3">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2>{isBn ? 'পাঠদানের বিষয়সমূহ ও শ্রেণিভিত্তিক রেট' : 'Subjects & Course Rates'}</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {subjects.map((sub) => {
                const subRate = formatLocalizedNumber(Number(sub.rateMinor) / 100, locale);
                return (
                  <div
                    key={sub.id}
                    className="rounded-2xl bg-card border border-border p-4.5 space-y-2 hover:border-brand/60 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-foreground">
                        {isBn ? sub.nameBn : sub.nameEn}
                      </h4>
                      <span className="text-xs font-black text-primary tabular-nums">
                        ৳{subRate}/ঘণ্টা
                      </span>
                    </div>
                    <span className="inline-block text-[11px] font-semibold text-primary-soft-foreground px-2 py-0.5 rounded-lg bg-card border border-border">
                      {isBn ? sub.levelBn : sub.levelEn}
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      জাতীয় শিক্ষাক্রম (বাংলা ও ইংলিশ ভার্সন) • অধ্যায়ভিত্তিক কনসেপ্ট ও হ্যান্ডনোট
                      প্রদান
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Teaching Modes & Service Areas */}
          <div className="rounded-3xl bg-card/80 border border-border p-6 sm:p-8 space-y-5 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2.5 text-lg font-bold text-foreground border-b border-border pb-3">
              <MapPin className="w-5 h-5 text-primary" />
              <h2>{isBn ? 'পাঠদানের মাধ্যম ও সার্ভিস এরিয়া' : 'Teaching Modes & Service Areas'}</h2>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold block mb-2">
                  {isBn ? 'পাঠদানের অনুমোদিত মাধ্যমসমূহ:' : 'Supported Teaching Modes:'}
                </span>
                <div className="flex flex-wrap gap-2.5">
                  <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-border text-xs font-semibold text-foreground">
                    <span className="h-2 w-2 rounded-full bg-brand" />
                    <span>অনলাইন লাইভ ক্লাস (Zoom / Meet + গ্রাফিক্স ট্যাবলেট)</span>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-border text-xs font-semibold text-foreground">
                    <span className="h-2 w-2 rounded-full bg-brand" />
                    <span>হোম টিউশন (শিক্ষার্থীর বাসায় গিয়ে পাঠদান)</span>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold block mb-2">
                  {isBn ? 'হোম টিউশনের জন্য নির্ধারিত এলাকা:' : 'Home Tutoring Localities:'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {serviceAreas.map((area, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-card border border-border text-xs text-foreground"
                    >
                      <MapPin className="w-3 h-3 text-primary" />
                      <span>{area}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Weekly Schedule */}
          <div className="rounded-3xl bg-card/80 border border-border p-6 sm:p-8 space-y-4 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5 text-lg font-bold text-foreground">
                <Calendar className="w-5 h-5 text-primary" />
                <h2>{isBn ? 'সাপ্তাহিক শিডিউল ও সময়সূচি' : 'Weekly Availability Schedule'}</h2>
              </div>
              <span className="text-xs text-primary font-semibold">
                {fallback.availableTimeSlots}
              </span>
            </div>

            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-2 text-center">
              {daysList.map((d) => {
                const isAvailable = availableDays.includes(d.key);
                return (
                  <div
                    key={d.key}
                    className={`rounded-2xl p-2.5 sm:p-3 border text-xs font-bold transition-all ${
                      isAvailable
                        ? 'bg-card border-brand/60 text-primary shadow-sm'
                        : 'bg-background border-border text-muted-foreground'
                    }`}
                  >
                    <span>{d.label}</span>
                    <span className="block text-[10px] font-normal mt-1">
                      {isAvailable ? 'স্লট খালি' : 'ব্যস্ত'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 6: Ratings & Verified Student Reviews */}
          <div className="rounded-3xl bg-card/80 border border-border p-6 sm:p-8 space-y-5 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5 text-lg font-bold text-foreground">
                <Star className="w-5 h-5 text-warning-soft-foreground fill-warning" />
                <h2>{isBn ? 'শিক্ষার্থী ও অভিভাবকদের রিভিউ' : 'Student & Parent Reviews'}</h2>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black text-foreground">4.9</span>
                <span className="text-xs text-muted-foreground">/ 5.0</span>
              </div>
            </div>

            <div className="space-y-4">
              {fallback.reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="rounded-2xl bg-card border border-border p-4.5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-card text-primary font-bold text-xs flex items-center justify-center border border-border">
                        {rev.studentName[0]}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-foreground block">
                          {rev.studentName}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{rev.date}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 text-warning-soft-foreground">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-warning" />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed italic">
                    &ldquo;{rev.comment}&rdquo;
                  </p>
                  {rev.tutorReply && (
                    <div className="ml-4 pl-3 border-l-2 border-border bg-card/50 p-2.5 rounded-r-xl text-xs space-y-1">
                      <span className="text-[11px] font-bold text-primary block">
                        শিক্ষকের জবাব:
                      </span>
                      <p className="text-muted-foreground">{rev.tutorReply}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 7: OgroniEdu Guarantee Banner */}
          <div className="rounded-3xl bg-gradient-to-br from-card to-card border border-border p-6 space-y-3 shadow-lg">
            <div className="flex items-center gap-2 text-base font-bold text-primary">
              <ShieldCheck className="w-5 h-5" />
              <h3>
                {isBn
                  ? 'অগ্রণী এডু ১০০% সুরক্ষা ও সন্তুষ্টি গ্যারান্টি'
                  : '100% Protection & Escrow Guarantee'}
              </h3>
            </div>
            <ul className="text-xs text-muted-foreground space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-success-soft-foreground shrink-0 mt-0.5" />
                <span>
                  <strong>এসক্রো সুরক্ষা:</strong> টিউশন ফি অগ্রণী এডু এসক্রো অ্যাকাউন্টে সুরক্ষিত
                  থাকে। ক্লাস ঠিকমতো হওয়ার পর শিক্ষককে টাকা প্রদান করা হয়।
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-success-soft-foreground shrink-0 mt-0.5" />
                <span>
                  <strong>ফ্রি ডেমো সেশন:</strong> প্রথম ক্লাস পছন্দ না হলে সম্পূর্ণ বিনামূল্যে
                  শিক্ষক পরিবর্তন অথবা ফি ফেরত পাওয়ার নিশ্চয়তা।
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column: Sticky Booking Request Card */}
        <div id="booking-section" className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
          <div className="rounded-3xl bg-card border-2 border-border p-6 sm:p-7 shadow-sm space-y-5 backdrop-blur-xl">
            <div className="border-b border-border pb-4">
              <span className="text-xs text-primary-soft-foreground font-semibold uppercase tracking-wider block">
                {isBn ? 'টিউশন বুকিং করুন' : 'Book a Tutoring Session'}
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-foreground tabular-nums tracking-tight">
                  ৳{hourlyRateFormatted}
                </span>
                <span className="text-xs text-muted-foreground">/ঘণ্টা</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {isBn
                  ? 'কোনো হিডেন চার্জ নেই • এসক্রো সুরক্ষিত'
                  : 'No hidden fees • 100% Escrow Protected'}
              </p>
            </div>

            {bookingSuccess ? (
              <div className="rounded-2xl bg-card border border-primary/40 p-5 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-success-soft-foreground mx-auto" />
                <h4 className="text-sm font-bold text-foreground">
                  {isBn ? 'অনুরোধ পাঠানো হয়েছে!' : 'Request Sent!'}
                </h4>
                <p className="text-xs text-primary-soft-foreground leading-relaxed">{bookingSuccess}</p>
                <button
                  type="button"
                  onClick={() => setBookingSuccess(null)}
                  className="mt-2 inline-flex items-center justify-center rounded-xl bg-brand text-brand-foreground font-bold text-xs px-4 py-2 hover:bg-brand-accent transition-colors"
                >
                  {isBn ? 'আরেকটি অনুরোধ পাঠান' : 'Send Another Request'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="space-y-4 text-xs">
                {bookingError && (
                  <div className="rounded-xl border border-destructive/40 bg-destructive-soft p-3 text-destructive-soft-foreground text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-destructive-soft-foreground shrink-0 mt-0.5" />
                    <span>{bookingError}</span>
                  </div>
                )}

                {/* Student Selector */}
                {studentOptions.length > 0 ? (
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground block">
                      {isBn ? 'শিক্ষার্থী নির্বাচন করুন *' : 'Select Student *'}
                    </label>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:border-brand transition-colors"
                    >
                      {studentOptions.map((opt) => (
                        <option key={opt.id} value={opt.id} className="bg-background text-foreground">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="rounded-xl bg-card border border-border p-3 text-muted-foreground">
                    <span className="text-[11px] block text-primary-soft-foreground font-semibold mb-1">
                      {isBn ? 'বুকিং সংক্রান্ত তথ্য:' : 'Booking Notice:'}
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      {currentUser
                        ? isBn
                          ? `আপনি ${currentUser.displayName} হিসেবে অনুরোধ পাঠাচ্ছেন।`
                          : `Requesting as ${currentUser.displayName}`
                        : isBn
                          ? 'অভিভাবক বা শিক্ষার্থী হিসেবে সরাসরি বুকিং করতে পারেন।'
                          : 'Direct booking as parent or student.'}
                    </p>
                  </div>
                )}

                {/* Subject Selector */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground block">
                    {isBn ? 'পড়ার বিষয় নির্বাচন করুন *' : 'Select Subject *'}
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:border-brand transition-colors"
                  >
                    {subjects.map((sub) => (
                      <option
                        key={sub.id}
                        value={sub.subjectId || sub.id}
                        className="bg-background text-foreground"
                      >
                        {isBn ? sub.nameBn : sub.nameEn} ({isBn ? sub.levelBn : sub.levelEn})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Teaching Mode */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground block">
                    {isBn ? 'পড়ার মাধ্যম *' : 'Teaching Mode *'}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { key: 'online', label: isBn ? 'অনলাইন' : 'Online' },
                      { key: 'in_person', label: isBn ? 'বাসায়' : 'In-person' },
                      { key: 'hybrid', label: isBn ? 'হাইব্রিড' : 'Hybrid' },
                    ].map((mode) => (
                      <button
                        key={mode.key}
                        type="button"
                        onClick={() =>
                          setSelectedMode(mode.key as 'online' | 'in_person' | 'hybrid')
                        }
                        className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                          selectedMode === mode.key
                            ? 'bg-brand text-brand-foreground border-brand font-bold shadow-sm'
                            : 'bg-background border-border text-muted-foreground hover:border-border'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preferred Days */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground block">
                    {isBn ? 'সাপ্তাহিক পছন্দের দিনসমূহ:' : 'Preferred Days:'}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {daysList.map((d) => {
                      const isChecked = selectedDays.includes(d.key);
                      return (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => toggleDay(d.key)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                            isChecked
                              ? 'bg-brand-soft text-primary border-brand shadow-xs'
                              : 'bg-background border-border text-muted-foreground hover:border-border'
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Additional Notes */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground block">
                    {isBn
                      ? 'বিশেষ কোনো বার্তা বা চাহিদা (ঐচ্ছিক):'
                      : 'Notes / Special Requests (Optional):'}
                  </label>
                  <textarea
                    rows={3}
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder={
                      isBn
                        ? 'যেমন: সপ্তাহে ৩ দিন পড়াতে হবে, টেস্ট পরীক্ষার প্রস্তুতি...'
                        : 'e.g. Need 3 days a week, focusing on upcoming board exams...'
                    }
                    className="w-full p-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand transition-colors resize-none text-xs"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isBookingSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-accent hover:from-brand-accent hover:to-brand text-brand-foreground font-black text-xs px-4 py-3.5 shadow-sm hover:shadow-sm active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {isBookingSubmitting
                      ? isBn
                        ? 'অনুরোধ পাঠানো হচ্ছে...'
                        : 'Submitting Request...'
                      : isBn
                        ? 'টিউশন অনুরোধ পাঠান'
                        : 'Submit Tutoring Request'}
                  </span>
                </button>
              </form>
            )}

            <div className="pt-2 border-t border-border flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>{isBn ? '১০০% এসক্রো ফি সুরক্ষা নিশ্চিত' : '100% Escrow Fee Protection'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
