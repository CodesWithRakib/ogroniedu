'use client';

import React from 'react';
import { type Locale } from '@/lib/i18n';
import { normalizeApiError, normalizeUnknownError } from '@/lib/api-error';
import { useAppDispatch } from '@/store';
import { setSessionUser } from '@/store/slices/auth-slice';
import { toAuthUser, useLazyGetSessionUserQuery } from '@/store/services/auth-api';
import {
  useGetMyProfileQuery,
  useUpdateMyProfileMutation,
  useUpsertStudentProfileMutation,
  type StudentProfileData,
} from '@/store/services/users-api';

/**
 * Feature-level profile hook: personal + academic form states plus save/sync actions.
 */
export function useProfileForm(locale: Locale) {
  const dispatch = useAppDispatch();
  const [fetchMe] = useLazyGetSessionUserQuery();
  const { data, isLoading, isError, error, refetch } = useGetMyProfileQuery();
  const [updateProfile, { isLoading: saving }] = useUpdateMyProfileMutation();
  const [upsertStudentProfile, { isLoading: academicSaving }] = useUpsertStudentProfileMutation();

  // Personal Info Form State
  const [displayName, setDisplayName] = React.useState('');
  const [preferredLocale, setPreferredLocale] = React.useState<'bn' | 'en'>(locale);
  const [saved, setSaved] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Academic Profile Form State
  const [dateOfBirth, setDateOfBirth] = React.useState('');
  const [institutionName, setInstitutionName] = React.useState('');
  const [educationLevelId, setEducationLevelId] = React.useState('');
  const [curriculumId, setCurriculumId] = React.useState('');
  const [stream, setStream] = React.useState('');
  const [districtCode, setDistrictCode] = React.useState('');
  const [upazilaCode, setUpazilaCode] = React.useState('');
  const [learningGoals, setLearningGoals] = React.useState('');
  const [profileVisibility, setProfileVisibility] = React.useState<'private' | 'limited'>(
    'private',
  );

  const [academicSaved, setAcademicSaved] = React.useState<string | null>(null);
  const [academicError, setAcademicError] = React.useState<string | null>(null);

  // Initialize personal and academic fields from backend user profile
  React.useEffect(() => {
    if (data) {
      if (data.displayName && !displayName) {
        setDisplayName(data.displayName);
      }
      if (data.preferredLocale) {
        setPreferredLocale(data.preferredLocale);
      }
      if (data.studentProfile) {
        const sp = data.studentProfile;
        if (sp.dateOfBirth && !dateOfBirth) setDateOfBirth(sp.dateOfBirth);
        if (sp.institutionName && !institutionName) setInstitutionName(sp.institutionName);
        if (sp.educationLevelId && !educationLevelId) setEducationLevelId(sp.educationLevelId);
        if (sp.curriculumId && !curriculumId) setCurriculumId(sp.curriculumId);
        if (sp.stream && !stream) setStream(sp.stream);
        if (sp.districtCode && !districtCode) setDistrictCode(sp.districtCode);
        if (sp.upazilaCode && !upazilaCode) setUpazilaCode(sp.upazilaCode);
        if (sp.learningGoals && !learningGoals) setLearningGoals(sp.learningGoals);
        if (sp.profileVisibility) setProfileVisibility(sp.profileVisibility);
      }
    }
  }, [
    data,
    displayName,
    dateOfBirth,
    institutionName,
    educationLevelId,
    curriculumId,
    stream,
    districtCode,
    upazilaCode,
    learningGoals,
  ]);

  // Handle saving personal info
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaved(null);
    try {
      const updated = await updateProfile({
        displayName: displayName.trim(),
        preferredLocale,
      }).unwrap();
      refetch();
      if (updated && typeof updated === 'object' && 'id' in updated) {
        try {
          const me = await fetchMe().unwrap();
          dispatch(setSessionUser(toAuthUser(me)));
        } catch {
          // Session display name sync is best-effort.
        }
      }
      setSaved(
        locale === 'bn'
          ? 'ব্যক্তিগত তথ্য সফলভাবে সংরক্ষিত হয়েছে।'
          : 'Personal profile saved successfully.',
      );
    } catch (err) {
      setFormError(normalizeUnknownError(err, locale).message);
    }
  }

  // Handle saving academic profile
  async function handleSaveAcademicProfile(e: React.FormEvent) {
    e.preventDefault();
    setAcademicError(null);
    setAcademicSaved(null);
    try {
      await upsertStudentProfile({
        dateOfBirth: dateOfBirth || undefined,
        institutionName: institutionName.trim() || undefined,
        educationLevelId: educationLevelId || undefined,
        curriculumId: curriculumId || undefined,
        stream: stream.trim() || undefined,
        districtCode: districtCode.trim() || undefined,
        upazilaCode: upazilaCode.trim() || undefined,
        learningGoals: learningGoals.trim() || undefined,
        profileVisibility,
      }).unwrap();
      refetch();
      setAcademicSaved(
        locale === 'bn'
          ? 'একাডেমিক প্রোফাইল ও লক্ষ্য সফলভাবে সংরক্ষিত হয়েছে।'
          : 'Academic profile & learning goals saved successfully.',
      );
    } catch (err) {
      setAcademicError(normalizeUnknownError(err, locale).message);
    }
  }

  const queryError = isError ? normalizeApiError(error, locale).message : null;

  return {
    data,
    isLoading,
    queryError,
    // Personal fields
    displayName,
    setDisplayName,
    preferredLocale,
    setPreferredLocale,
    saved,
    formError,
    saving,
    handleSave,
    // Academic fields
    dateOfBirth,
    setDateOfBirth,
    institutionName,
    setInstitutionName,
    educationLevelId,
    setEducationLevelId,
    curriculumId,
    setCurriculumId,
    stream,
    setStream,
    districtCode,
    setDistrictCode,
    upazilaCode,
    setUpazilaCode,
    learningGoals,
    setLearningGoals,
    profileVisibility,
    setProfileVisibility,
    academicSaving,
    academicSaved,
    academicError,
    handleSaveAcademicProfile,
  };
}
