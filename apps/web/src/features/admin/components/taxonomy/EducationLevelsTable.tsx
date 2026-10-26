'use client';

import React from 'react';
import { Pencil, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { Button, LoadingSpinner } from '@/components/ui';
import type { TaxonomyEducationLevel } from '@/store/services/taxonomy-api';

interface EducationLevelsTableProps {
  levels: TaxonomyEducationLevel[];
  isLoading: boolean;
  isBn: boolean;
  onToggleActive: (level: TaxonomyEducationLevel) => void;
  onEdit: (level: TaxonomyEducationLevel) => void;
  onDelete: (id: string, name: string) => void;
}

export function EducationLevelsTable({
  levels,
  isLoading,
  isBn,
  onToggleActive,
  onEdit,
  onDelete,
}: EducationLevelsTableProps) {
  if (isLoading) {
    return (
      <tr>
        <td colSpan={7} className="py-12 text-center text-muted-foreground">
          <LoadingSpinner className="mx-auto h-6 w-6 text-primary" />
        </td>
      </tr>
    );
  }

  if (levels.length === 0) {
    return (
      <tr>
        <td colSpan={7} className="py-12 text-center text-muted-foreground">
          {isBn ? 'কোনো শ্রেণি পাওয়া যায়নি' : 'No education levels found'}
        </td>
      </tr>
    );
  }

  return (
    <>
      {levels.map((lvl, index) => (
        <tr
          key={lvl.id}
          className={`transition-colors ${
            lvl.isActive !== false
              ? 'hover:bg-surface-hover/50'
              : 'bg-muted/15 opacity-75 hover:opacity-100 hover:bg-muted/30'
          }`}
        >
          <td className="py-3 px-4 font-mono text-muted-foreground">{index + 1}</td>
          <td className="py-3 px-4 font-mono font-medium text-foreground">{lvl.code}</td>
          <td className="py-3 px-4 font-semibold text-foreground">
            {lvl.nameEn}
            {lvl.isActive === false && (
              <span className="ml-2 text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded font-normal">
                {isBn ? 'নিষ্ক্রিয়' : 'Inactive'}
              </span>
            )}
          </td>
          <td className="py-3 px-4 text-muted-foreground">{lvl.nameBn}</td>
          <td className="py-3 px-4 text-center">
            <button
              type="button"
              onClick={() => onToggleActive(lvl)}
              title={
                lvl.isActive !== false
                  ? isBn
                    ? 'ক্লিক করে নিষ্ক্রিয় করুন'
                    : 'Click to deactivate'
                  : isBn
                    ? 'ক্লিক করে সক্রিয় করুন'
                    : 'Click to activate'
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                lvl.isActive !== false
                  ? 'bg-success-soft text-success-soft-foreground border-success/30 hover:bg-success/20'
                  : 'bg-muted/70 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
              }`}
            >
              {lvl.isActive !== false ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-destructive" />
              )}
              <span>
                {lvl.isActive !== false
                  ? isBn
                    ? 'সক্রিয়'
                    : 'Active'
                  : isBn
                    ? 'নিষ্ক্রিয়'
                    : 'Inactive'}
              </span>
            </button>
          </td>
          <td className="py-3 px-4 text-right">
            <div className="flex items-center justify-end gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(lvl)}
                aria-label={isBn ? `সম্পাদনা করুন: ${lvl.nameEn}` : `Edit: ${lvl.nameEn}`}
                className="h-8 w-8 p-0 rounded-full hover:bg-surface"
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(lvl.id, lvl.nameEn)}
                aria-label={isBn ? `মুছে ফেলুন: ${lvl.nameEn}` : `Delete: ${lvl.nameEn}`}
                className="h-8 w-8 p-0 rounded-full hover:bg-destructive/10 text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}
