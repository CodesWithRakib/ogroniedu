'use client';

import React, { useState } from 'react';
import {
  GraduationCap,
  BookOpen,
  Layers,
  Building2,
  BookmarkCheck,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
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
import { Checkbox } from '@/components/ui/checkbox';
import type { Locale } from '@/lib/i18n';
import { EducationLevelsTable } from '../components/taxonomy/EducationLevelsTable';
import { CurriculaTable } from '../components/taxonomy/CurriculaTable';
import { StreamsTable } from '../components/taxonomy/StreamsTable';
import { InstitutionsTable } from '../components/taxonomy/InstitutionsTable';
import { SubjectsTable } from '../components/taxonomy/SubjectsTable';
import { TaxonomyModal } from '../components/taxonomy/TaxonomyModal';
import {
  useGetEducationLevelsQuery,
  useGetCurriculaQuery,
  useGetStreamsQuery,
  useGetInstitutionsQuery,
  useGetSubjectsQuery,
  useCreateEducationLevelMutation,
  useUpdateEducationLevelMutation,
  useDeleteEducationLevelMutation,
  useCreateCurriculumMutation,
  useUpdateCurriculumMutation,
  useDeleteCurriculumMutation,
  useCreateStreamMutation,
  useUpdateStreamMutation,
  useDeleteStreamMutation,
  useCreateInstitutionMutation,
  useUpdateInstitutionMutation,
  useDeleteInstitutionMutation,
  useCreateSubjectMutation,
  useUpdateSubjectMutation,
  useDeleteSubjectMutation,
  type TaxonomyEducationLevel,
  type TaxonomyCurriculum,
  type TaxonomyStream,
  type TaxonomyInstitution,
  type TaxonomySubject,
} from '@/store/services/taxonomy-api';

type TaxonomyTab = 'levels' | 'curricula' | 'streams' | 'institutions' | 'subjects';

export function AdminTaxonomyPage({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  const [activeTab, setActiveTab] = useState<TaxonomyTab>('levels');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedType, setSelectedType] = useState('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  // Queries (fetch all records including inactive for admin management)
  const {
    data: levelsData,
    isLoading: levelsLoading,
    refetch: refetchLevels,
  } = useGetEducationLevelsQuery({ all: true });
  const {
    data: curriculaData,
    isLoading: curriculaLoading,
    refetch: refetchCurricula,
  } = useGetCurriculaQuery({ all: true });
  const {
    data: streamsData,
    isLoading: streamsLoading,
    refetch: refetchStreams,
  } = useGetStreamsQuery({ all: true });
  const {
    data: institutionsData,
    isLoading: institutionsLoading,
    refetch: refetchInstitutions,
  } = useGetInstitutionsQuery({ all: true });
  const {
    data: subjectsData,
    isLoading: subjectsLoading,
    refetch: refetchSubjects,
  } = useGetSubjectsQuery({ all: true });

  // Mutations
  const [createLevel, { isLoading: creatingLevel }] = useCreateEducationLevelMutation();
  const [updateLevel, { isLoading: updatingLevel }] = useUpdateEducationLevelMutation();
  const [deleteLevel] = useDeleteEducationLevelMutation();

  const [createCurriculum, { isLoading: creatingCurriculum }] = useCreateCurriculumMutation();
  const [updateCurriculum, { isLoading: updatingCurriculum }] = useUpdateCurriculumMutation();
  const [deleteCurriculum] = useDeleteCurriculumMutation();

  const [createStream, { isLoading: creatingStream }] = useCreateStreamMutation();
  const [updateStream, { isLoading: updatingStream }] = useUpdateStreamMutation();
  const [deleteStream] = useDeleteStreamMutation();

  const [createInstitution, { isLoading: creatingInstitution }] = useCreateInstitutionMutation();
  const [updateInstitution, { isLoading: updatingInstitution }] = useUpdateInstitutionMutation();
  const [deleteInstitution] = useDeleteInstitutionMutation();

  const [createSubject, { isLoading: creatingSubject }] = useCreateSubjectMutation();
  const [updateSubject, { isLoading: updatingSubject }] = useUpdateSubjectMutation();
  const [deleteSubject] = useDeleteSubjectMutation();

  // Modals state
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form fields
  const [formCode, setFormCode] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formNameBn, setFormNameBn] = useState('');
  const [formExtra, setFormExtra] = useState('');
  const [formExtra2, setFormExtra2] = useState('');
  const [formSortOrder, setFormSortOrder] = useState<number>(0);
  const [formIsActive, setFormIsActive] = useState(true);

  const resetForm = () => {
    setModalMode(null);
    setEditingItem(null);
    setFormCode('');
    setFormNameEn('');
    setFormNameBn('');
    setFormExtra('');
    setFormExtra2('');
    setFormSortOrder(0);
    setFormIsActive(true);
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setFormCode(item.code || '');
    setFormNameEn(item.nameEn || '');
    setFormNameBn(item.nameBn || '');
    setFormSortOrder(typeof item.sortOrder === 'number' ? item.sortOrder : 0);
    setFormIsActive(item.isActive !== false);

    if (activeTab === 'curricula') {
      setFormExtra(item.boardName || '');
    } else if (activeTab === 'streams') {
      setFormExtra(item.description || '');
    } else if (activeTab === 'institutions') {
      setFormExtra(item.type || 'school');
      setFormExtra2(item.district || '');
    } else if (activeTab === 'subjects') {
      setFormExtra(item.category || '');
    }
    setModalMode('edit');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      if (activeTab === 'levels') {
        if (modalMode === 'create') {
          await createLevel({
            code: formCode.trim().toLowerCase().replace(/\s+/g, '-'),
            nameEn: formNameEn.trim(),
            nameBn: formNameBn.trim(),
            sortOrder: Number(formSortOrder),
            isActive: formIsActive,
          }).unwrap();
          setFeedback({
            type: 'success',
            message: isBn ? 'শ্রেণি সফলভাবে যোগ করা হয়েছে' : 'Education level created successfully',
          });
        } else if (editingItem) {
          await updateLevel({
            id: editingItem.id,
            nameEn: formNameEn.trim(),
            nameBn: formNameBn.trim(),
            sortOrder: Number(formSortOrder),
            isActive: formIsActive,
          }).unwrap();
          setFeedback({
            type: 'success',
            message: isBn
              ? 'শ্রেণি সফলভাবে আপডেট করা হয়েছে'
              : 'Education level updated successfully',
          });
        }
      } else if (activeTab === 'curricula') {
        if (modalMode === 'create') {
          await createCurriculum({
            code: formCode.trim().toLowerCase().replace(/\s+/g, '-'),
            nameEn: formNameEn.trim(),
            nameBn: formNameBn.trim(),
            boardName: formExtra.trim() || undefined,
            isActive: formIsActive,
          }).unwrap();
          setFeedback({
            type: 'success',
            message: isBn ? 'কারিকুলাম সফলভাবে যোগ করা হয়েছে' : 'Curriculum created successfully',
          });
        } else if (editingItem) {
          await updateCurriculum({
            id: editingItem.id,
            nameEn: formNameEn.trim(),
            nameBn: formNameBn.trim(),
            boardName: formExtra.trim() || undefined,
            isActive: formIsActive,
          }).unwrap();
          setFeedback({
            type: 'success',
            message: isBn ? 'কারিকুলাম সফলভাবে আপডেট করা হয়েছে' : 'Curriculum updated successfully',
          });
        }
      } else if (activeTab === 'streams') {
        if (modalMode === 'create') {
          await createStream({
            code: formCode.trim().toLowerCase().replace(/\s+/g, '-'),
            nameEn: formNameEn.trim(),
            nameBn: formNameBn.trim(),
            description: formExtra.trim() || undefined,
            sortOrder: Number(formSortOrder),
            isActive: formIsActive,
          }).unwrap();
          setFeedback({
            type: 'success',
            message: isBn ? 'শাখা/বিভাগ সফলভাবে যোগ করা হয়েছে' : 'Stream created successfully',
          });
        } else if (editingItem) {
          await updateStream({
            id: editingItem.id,
            nameEn: formNameEn.trim(),
            nameBn: formNameBn.trim(),
            description: formExtra.trim() || undefined,
            sortOrder: Number(formSortOrder),
            isActive: formIsActive,
          }).unwrap();
          setFeedback({
            type: 'success',
            message: isBn ? 'শাখা/বিভাগ সফলভাবে আপডেট করা হয়েছে' : 'Stream updated successfully',
          });
        }
      } else if (activeTab === 'institutions') {
        const instType = (formExtra as any) || 'school';
        if (modalMode === 'create') {
          await createInstitution({
            code: formCode.trim().toLowerCase().replace(/\s+/g, '-'),
            nameEn: formNameEn.trim(),
            nameBn: formNameBn.trim(),
            type: instType,
            district: formExtra2.trim() || undefined,
            sortOrder: Number(formSortOrder),
            isActive: formIsActive,
          }).unwrap();
          setFeedback({
            type: 'success',
            message: isBn
              ? 'শিক্ষা প্রতিষ্ঠান সফলভাবে যোগ করা হয়েছে'
              : 'Institution created successfully',
          });
        } else if (editingItem) {
          await updateInstitution({
            id: editingItem.id,
            nameEn: formNameEn.trim(),
            nameBn: formNameBn.trim(),
            type: instType,
            district: formExtra2.trim() || undefined,
            sortOrder: Number(formSortOrder),
            isActive: formIsActive,
          }).unwrap();
          setFeedback({
            type: 'success',
            message: isBn
              ? 'শিক্ষা প্রতিষ্ঠান সফলভাবে আপডেট করা হয়েছে'
              : 'Institution updated successfully',
          });
        }
      } else if (activeTab === 'subjects') {
        if (modalMode === 'create') {
          await createSubject({
            code: formCode.trim().toLowerCase().replace(/\s+/g, '-'),
            nameEn: formNameEn.trim(),
            nameBn: formNameBn.trim(),
            category: formExtra.trim() || undefined,
            isActive: formIsActive,
          }).unwrap();
          setFeedback({
            type: 'success',
            message: isBn ? 'বিষয় সফলভাবে যোগ করা হয়েছে' : 'Subject created successfully',
          });
        } else if (editingItem) {
          await updateSubject({
            id: editingItem.id,
            nameEn: formNameEn.trim(),
            nameBn: formNameBn.trim(),
            category: formExtra.trim() || undefined,
            isActive: formIsActive,
          }).unwrap();
          setFeedback({
            type: 'success',
            message: isBn ? 'বিষয় সফলভাবে আপডেট করা হয়েছে' : 'Subject updated successfully',
          });
        }
      }
      resetForm();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.data?.message || err?.message || 'Operation failed. Please try again.',
      });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        isBn
          ? `আপনি কি নিশ্চিতভাবে "${name}" মুছে ফেলতে চান?`
          : `Are you sure you want to delete "${name}"?`,
      )
    ) {
      return;
    }
    setFeedback(null);
    try {
      if (activeTab === 'levels') {
        await deleteLevel(id).unwrap();
      } else if (activeTab === 'curricula') {
        await deleteCurriculum(id).unwrap();
      } else if (activeTab === 'streams') {
        await deleteStream(id).unwrap();
      } else if (activeTab === 'institutions') {
        await deleteInstitution(id).unwrap();
      } else if (activeTab === 'subjects') {
        await deleteSubject(id).unwrap();
      }
      setFeedback({
        type: 'success',
        message: isBn ? 'আইটেম সফলভাবে মুছে ফেলা হয়েছে' : 'Item removed successfully',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.data?.message || err?.message || 'Delete operation failed',
      });
    }
  };

  const handleToggleActive = async (item: any) => {
    setFeedback(null);
    try {
      const nextActive = !item.isActive;
      if (activeTab === 'levels') {
        await updateLevel({ id: item.id, isActive: nextActive }).unwrap();
      } else if (activeTab === 'curricula') {
        await updateCurriculum({ id: item.id, isActive: nextActive }).unwrap();
      } else if (activeTab === 'streams') {
        await updateStream({ id: item.id, isActive: nextActive }).unwrap();
      } else if (activeTab === 'institutions') {
        await updateInstitution({ id: item.id, isActive: nextActive }).unwrap();
      } else if (activeTab === 'subjects') {
        await updateSubject({ id: item.id, isActive: nextActive }).unwrap();
      }
      setFeedback({
        type: 'success',
        message: nextActive
          ? isBn
            ? `"${item.nameBn || item.nameEn}" সফলভাবে সক্রিয় করা হয়েছে`
            : `"${item.nameEn}" activated successfully`
          : isBn
            ? `"${item.nameBn || item.nameEn}" সফলভাবে নিষ্ক্রিয় করা হয়েছে`
            : `"${item.nameEn}" set to inactive`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.data?.message || err?.message || 'Status update failed',
      });
    }
  };

  const matchesStatus = (isActive: boolean | undefined) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return isActive !== false;
    if (statusFilter === 'inactive') return isActive === false;
    return true;
  };

  // Filtered lists
  const levels = (levelsData?.data || []).filter(
    (l) =>
      (!searchQuery ||
        l.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.nameBn.includes(searchQuery) ||
        l.code.toLowerCase().includes(searchQuery.toLowerCase())) &&
      matchesStatus(l.isActive),
  );

  const curricula = (curriculaData?.data || []).filter(
    (c) =>
      (!searchQuery ||
        c.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.nameBn.includes(searchQuery) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase())) &&
      matchesStatus(c.isActive),
  );

  const streams = (streamsData?.data || []).filter(
    (s) =>
      (!searchQuery ||
        s.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nameBn.includes(searchQuery) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase())) &&
      matchesStatus(s.isActive),
  );

  const institutions = (institutionsData?.data || []).filter((i) => {
    const matchesSearch =
      !searchQuery ||
      i.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.nameBn.includes(searchQuery) ||
      (i.district && i.district.toLowerCase().includes(searchQuery.toLowerCase())) ||
      i.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || i.type === selectedType;
    return matchesSearch && matchesType && matchesStatus(i.isActive);
  });

  const subjects = (subjectsData?.data || []).filter(
    (s) =>
      (!searchQuery ||
        s.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nameBn.includes(searchQuery) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase())) &&
      matchesStatus(s.isActive),
  );

  const isSaving =
    creatingLevel ||
    updatingLevel ||
    creatingCurriculum ||
    updatingCurriculum ||
    creatingStream ||
    updatingStream ||
    creatingInstitution ||
    updatingInstitution ||
    creatingSubject ||
    updatingSubject;

  const currentCount =
    activeTab === 'levels'
      ? levels.length
      : activeTab === 'curricula'
        ? curricula.length
        : activeTab === 'streams'
          ? streams.length
          : activeTab === 'institutions'
            ? institutions.length
            : subjects.length;

  return (
    <AdminLayout
      locale={locale}
      title={isBn ? 'একাডেমিক ট্যাক্সোনমি ও ডেটা ক্যাটালগ' : 'Academic Taxonomy & Dynamic Catalog'}
      subtitle={
        isBn
          ? 'শ্রেণি, কারিকুলাম, শাখা/বিভাগ, শিক্ষা প্রতিষ্ঠান ও পাঠ্য বিষয় সম্পূর্ণ ডায়নামিক ও রিয়েল-টাইম পরিচালনা করুন'
          : 'Full dynamic management of education levels, curricula, streams, institutions, and subjects'
      }
      actions={
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (activeTab === 'levels') refetchLevels();
              if (activeTab === 'curricula') refetchCurricula();
              if (activeTab === 'streams') refetchStreams();
              if (activeTab === 'institutions') refetchInstitutions();
              if (activeTab === 'subjects') refetchSubjects();
            }}
            className="rounded-full px-4 gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {isBn ? 'রিফ্রেশ' : 'Refresh'}
          </Button>
          <Button
            size="sm"
            onClick={openCreateModal}
            className="rounded-full px-4 gap-1.5 font-semibold"
            data-testid="admin-taxonomy-add-btn"
          >
            <Plus className="h-4 w-4" />
            {isBn ? 'নতুন যোগ করুন' : 'Add New'}
          </Button>
        </div>
      }
    >
      <div className="space-y-6 py-4" data-testid="admin-taxonomy-page">
        {/* Feedback Alert */}
        {feedback && (
          <Alert
            variant={feedback.type === 'error' ? 'destructive' : 'default'}
            className={
              feedback.type === 'success'
                ? 'border-success/30 bg-success-soft text-success-soft-foreground'
                : ''
            }
          >
            <AlertDescription className="flex items-center justify-between">
              <span>{feedback.message}</span>
              <button
                onClick={() => setFeedback(null)}
                className="text-xs hover:underline opacity-80"
              >
                ✕
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* Dynamic Taxonomy Tabs Bar */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-surface rounded-2xl border border-border">
          <button
            onClick={() => {
              setActiveTab('levels');
              setSearchQuery('');
            }}
            data-testid="tab-levels"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'levels'
                ? 'bg-card text-foreground shadow-xs border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <GraduationCap className="h-4 w-4 text-primary" />
            <span>{isBn ? 'শ্রেণি / লেভেল' : 'Education Levels'}</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-primary/10 text-primary">
              {levelsData?.data?.length || 0}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('curricula');
              setSearchQuery('');
            }}
            data-testid="tab-curricula"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'curricula'
                ? 'bg-card text-foreground shadow-xs border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="h-4 w-4 text-primary" />
            <span>{isBn ? 'কারিকুলাম' : 'Curricula'}</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-primary/10 text-primary">
              {curriculaData?.data?.length || 0}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('streams');
              setSearchQuery('');
            }}
            data-testid="tab-streams"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'streams'
                ? 'bg-card text-foreground shadow-xs border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="h-4 w-4 text-primary" />
            <span>{isBn ? 'শাখা / বিভাগ' : 'Streams & Groups'}</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-primary/10 text-primary">
              {streamsData?.data?.length || 0}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('institutions');
              setSearchQuery('');
            }}
            data-testid="tab-institutions"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'institutions'
                ? 'bg-card text-foreground shadow-xs border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="h-4 w-4 text-primary" />
            <span>{isBn ? 'শিক্ষা প্রতিষ্ঠান' : 'Institutions'}</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-primary/10 text-primary">
              {institutionsData?.data?.length || 0}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('subjects');
              setSearchQuery('');
            }}
            data-testid="tab-subjects"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'subjects'
                ? 'bg-card text-foreground shadow-xs border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookmarkCheck className="h-4 w-4 text-primary" />
            <span>{isBn ? 'পাঠ্য বিষয়' : 'Subjects'}</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-primary/10 text-primary">
              {subjectsData?.data?.length || 0}
            </span>
          </button>
        </div>

        {/* Filter & Search Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isBn ? 'নাম, কোড অথবা জেলা দিয়ে খুঁজুন...' : 'Search by name, code or district...'
              }
              className="pl-10 rounded-2xl bg-card border-border"
            />
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-36">
              <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                <SelectTrigger
                  className="rounded-2xl bg-card border-border text-xs"
                  data-testid="taxonomy-status-filter"
                >
                  <SelectValue placeholder={isBn ? 'স্ট্যাটাস' : 'Status'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isBn ? 'সকল স্ট্যাটাস' : 'All Status'}</SelectItem>
                  <SelectItem value="active">{isBn ? 'শুধু সক্রিয়' : 'Active Only'}</SelectItem>
                  <SelectItem value="inactive">
                    {isBn ? 'শুধু নিষ্ক্রিয়' : 'Inactive Only'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {activeTab === 'institutions' && (
              <div className="w-44">
                <Select value={selectedType} onValueChange={(val) => setSelectedType(val)}>
                  <SelectTrigger className="rounded-2xl bg-card border-border text-xs">
                    <SelectValue placeholder="সব ধরন" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isBn ? 'সকল ধরন' : 'All Types'}</SelectItem>
                    <SelectItem value="college">{isBn ? 'কলেজ (College)' : 'College'}</SelectItem>
                    <SelectItem value="school">{isBn ? 'স্কুল (School)' : 'School'}</SelectItem>
                    <SelectItem value="school_and_college">
                      {isBn ? 'স্কুল অ্যান্ড কলেজ' : 'School & College'}
                    </SelectItem>
                    <SelectItem value="university">
                      {isBn ? 'বিশ্ববিদ্যালয়' : 'University'}
                    </SelectItem>
                    <SelectItem value="madrasah">
                      {isBn ? 'মাদ্রাসা (Madrasah)' : 'Madrasah'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="text-xs text-muted-foreground whitespace-nowrap self-center">
              {isBn ? `মোট: ${currentCount} টি` : `Total: ${currentCount}`}
            </div>
          </div>
        </div>

        {/* TABLE CONTENT */}
        <Card className="rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-surface border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">{isBn ? 'কোড' : 'Code'}</th>
                  <th className="py-3 px-4">{isBn ? 'ইংরেজি নাম' : 'Name (English)'}</th>
                  <th className="py-3 px-4">{isBn ? 'বাংলা নাম' : 'Name (Bangla)'}</th>
                  {activeTab === 'curricula' && (
                    <th className="py-3 px-4">{isBn ? 'বোর্ড / অধিভুক্তি' : 'Board Name'}</th>
                  )}
                  {activeTab === 'streams' && (
                    <th className="py-3 px-4">{isBn ? 'বিবরণ' : 'Description'}</th>
                  )}
                  {activeTab === 'institutions' && (
                    <>
                      <th className="py-3 px-4">{isBn ? 'ধরন' : 'Type'}</th>
                      <th className="py-3 px-4">{isBn ? 'জেলা' : 'District'}</th>
                    </>
                  )}
                  {activeTab === 'subjects' && (
                    <th className="py-3 px-4">{isBn ? 'ক্যাটাগরি' : 'Category'}</th>
                  )}
                  <th className="py-3 px-4 text-center">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                  <th className="py-3 px-4 text-right">{isBn ? 'অ্যাকশন' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activeTab === 'levels' && (
                  <EducationLevelsTable
                    levels={levels}
                    isLoading={levelsLoading}
                    isBn={isBn}
                    onToggleActive={handleToggleActive}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                  />
                )}

                {activeTab === 'curricula' && (
                  <CurriculaTable
                    curricula={curricula}
                    isLoading={curriculaLoading}
                    isBn={isBn}
                    onToggleActive={handleToggleActive}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                  />
                )}

                {activeTab === 'streams' && (
                  <StreamsTable
                    streams={streams}
                    isLoading={streamsLoading}
                    isBn={isBn}
                    onToggleActive={handleToggleActive}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                  />
                )}

                {activeTab === 'institutions' && (
                  <InstitutionsTable
                    institutions={institutions}
                    isLoading={institutionsLoading}
                    isBn={isBn}
                    onToggleActive={handleToggleActive}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                  />
                )}

                {activeTab === 'subjects' && (
                  <SubjectsTable
                    subjects={subjects}
                    isLoading={subjectsLoading}
                    isBn={isBn}
                    onToggleActive={handleToggleActive}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                  />
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* CREATE / EDIT MODAL */}
        <TaxonomyModal
          isOpen={modalMode !== null}
          onClose={resetForm}
          modalMode={modalMode}
          activeTab={activeTab}
          isBn={isBn}
          formCode={formCode}
          setFormCode={setFormCode}
          formNameEn={formNameEn}
          setFormNameEn={setFormNameEn}
          formNameBn={formNameBn}
          setFormNameBn={setFormNameBn}
          formExtra={formExtra}
          setFormExtra={setFormExtra}
          formExtra2={formExtra2}
          setFormExtra2={setFormExtra2}
          formIsActive={formIsActive}
          setFormIsActive={setFormIsActive}
          isSaving={isSaving}
          onSave={handleSave}
        />
      </div>
    </AdminLayout>
  );
}
