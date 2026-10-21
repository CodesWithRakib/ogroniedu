'use client';

import React from 'react';
import { Button, Input } from '@/components/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type TaxonomyTab = 'levels' | 'curricula' | 'streams' | 'institutions' | 'subjects';

interface TaxonomyModalProps {
  isOpen: boolean;
  onClose: () => void;
  modalMode: 'create' | 'edit' | null;
  activeTab: TaxonomyTab;
  isBn: boolean;
  formCode: string;
  setFormCode: (v: string) => void;
  formNameEn: string;
  setFormNameEn: (v: string) => void;
  formNameBn: string;
  setFormNameBn: (v: string) => void;
  formExtra: string;
  setFormExtra: (v: string) => void;
  formExtra2: string;
  setFormExtra2: (v: string) => void;
  formIsActive: boolean;
  setFormIsActive: (v: boolean) => void;
  isSaving: boolean;
  onSave: (e: React.FormEvent) => void;
}

export function TaxonomyModal({
  isOpen,
  onClose,
  modalMode,
  activeTab,
  isBn,
  formCode,
  setFormCode,
  formNameEn,
  setFormNameEn,
  formNameBn,
  setFormNameBn,
  formExtra,
  setFormExtra,
  formExtra2,
  setFormExtra2,
  formIsActive,
  setFormIsActive,
  isSaving,
  onSave,
}: TaxonomyModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {modalMode === 'create'
              ? isBn
                ? 'নতুন আইটেম যোগ করুন'
                : 'Add New Taxonomy Item'
              : isBn
                ? 'আইটেম সম্পাদনা করুন'
                : 'Edit Taxonomy Item'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isBn
              ? 'সব তথ্য সঠিকভাবে প্রদান করুন। পরিবর্তন সাথে সাথে সিস্টেমে প্রযোজ্য হবে।'
              : 'Provide required fields. Changes take effect across the platform immediately.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSave} className="space-y-4 pt-2">
          {modalMode === 'create' && (
            <div className="space-y-1.5">
              <Label htmlFor="form-code" className="text-xs font-semibold">
                {isBn ? 'ইউনিক কোড (e.g. lvl-class-9, stream-science)' : 'Unique Code'}
              </Label>
              <Input
                id="form-code"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="e.g. lvl-class-12, stream-vocational"
                required
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="form-name-en" className="text-xs font-semibold">
              {isBn ? 'ইংরেজি নাম' : 'Name (English)'}
            </Label>
            <Input
              id="form-name-en"
              value={formNameEn}
              onChange={(e) => setFormNameEn(e.target.value)}
              placeholder="e.g. Higher Secondary (HSC), Science"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="form-name-bn" className="text-xs font-semibold">
              {isBn ? 'বাংলা নাম' : 'Name (Bangla)'}
            </Label>
            <Input
              id="form-name-bn"
              value={formNameBn}
              onChange={(e) => setFormNameBn(e.target.value)}
              placeholder="যেমন: উচ্চ মাধ্যমিক (এইচএসসি), বিজ্ঞান বিভাগ"
              required
            />
          </div>

          {activeTab === 'curricula' && (
            <div className="space-y-1.5">
              <Label htmlFor="form-extra" className="text-xs font-semibold">
                {isBn ? 'বোর্ড / পরীক্ষা নিয়ন্ত্রক সংস্থা' : 'Board / Examination Authority'}
              </Label>
              <Input
                id="form-extra"
                value={formExtra}
                onChange={(e) => setFormExtra(e.target.value)}
                placeholder="e.g. Dhaka Education Board, Cambridge Assessment"
              />
            </div>
          )}

          {activeTab === 'streams' && (
            <div className="space-y-1.5">
              <Label htmlFor="form-extra" className="text-xs font-semibold">
                {isBn ? 'বিবরণ / লক্ষ্য' : 'Description'}
              </Label>
              <Input
                id="form-extra"
                value={formExtra}
                onChange={(e) => setFormExtra(e.target.value)}
                placeholder="যেমন: পদার্থ, রসায়ন, গণিত ও জীববিদ্যা বিষয়ক"
              />
            </div>
          )}

          {activeTab === 'institutions' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="form-extra" className="text-xs font-semibold">
                  {isBn ? 'প্রতিষ্ঠানের ধরন' : 'Institution Type'}
                </Label>
                <Select
                  value={formExtra || 'school'}
                  onValueChange={(val) => setFormExtra(val)}
                >
                  <SelectTrigger
                    id="form-extra"
                    className="rounded-2xl bg-card border-border text-sm"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="school">{isBn ? 'স্কুল (School)' : 'School'}</SelectItem>
                    <SelectItem value="college">
                      {isBn ? 'কলেজ (College)' : 'College'}
                    </SelectItem>
                    <SelectItem value="school_and_college">
                      {isBn ? 'স্কুল অ্যান্ড কলেজ' : 'School & College'}
                    </SelectItem>
                    <SelectItem value="university">
                      {isBn ? 'বিশ্ববিদ্যালয় (University)' : 'University'}
                    </SelectItem>
                    <SelectItem value="madrasah">
                      {isBn ? 'মাদ্রাসা (Madrasah)' : 'Madrasah'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="form-extra-2" className="text-xs font-semibold">
                  {isBn ? 'জেলা (District)' : 'District'}
                </Label>
                <Input
                  id="form-extra-2"
                  value={formExtra2}
                  onChange={(e) => setFormExtra2(e.target.value)}
                  placeholder="e.g. Dhaka, Chittagong, Sylhet"
                />
              </div>
            </>
          )}

          {activeTab === 'subjects' && (
            <div className="space-y-1.5">
              <Label htmlFor="form-extra" className="text-xs font-semibold">
                {isBn ? 'ক্যাটাগরি / বিভাগ' : 'Category / Discipline'}
              </Label>
              <Select
                value={formExtra || 'core'}
                onValueChange={(val) => setFormExtra(val)}
              >
                <SelectTrigger
                  id="form-extra"
                  className="rounded-2xl bg-card border-border text-sm"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="core">
                    {isBn ? 'আবশ্যিক বিষয় (Core)' : 'Core Academic'}
                  </SelectItem>
                  <SelectItem value="science">
                    {isBn ? 'বিজ্ঞান বিষয় (Science)' : 'Science Disciplines'}
                  </SelectItem>
                  <SelectItem value="commerce">
                    {isBn ? 'ব্যবসায় শিক্ষা (Commerce)' : 'Business Studies'}
                  </SelectItem>
                  <SelectItem value="humanities">
                    {isBn ? 'মানবিক বিষয় (Humanities)' : 'Humanities & Arts'}
                  </SelectItem>
                  <SelectItem value="language">
                    {isBn ? 'ভাষা ও সাহিত্য (Language)' : 'Language & Literature'}
                  </SelectItem>
                  <SelectItem value="admission">
                    {isBn ? 'ভর্তি প্রস্তুতি (Admission Test)' : 'University / College Admission'}
                  </SelectItem>
                  <SelectItem value="skill">
                    {isBn ? 'দক্ষতা উন্নয়ন (Skill / IT)' : 'Practical / ICT Skills'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              id="form-is-active"
              checked={formIsActive}
              onCheckedChange={(checked) => setFormIsActive(Boolean(checked))}
            />
            <Label htmlFor="form-is-active" className="text-xs font-semibold cursor-pointer">
              {isBn
                ? 'সক্রিয় থাকবে (শিক্ষার্থী ও শিক্ষকরা নির্বাচন করতে পারবেন)'
                : 'Is Active'}
            </Label>
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-full px-4"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              isLoading={isSaving}
              className="rounded-full px-5 font-semibold"
            >
              {modalMode === 'create'
                ? isBn
                  ? 'সংরক্ষণ করুন'
                  : 'Create'
                : isBn
                  ? 'আপডেট করুন'
                  : 'Update'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
