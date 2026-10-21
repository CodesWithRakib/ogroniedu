'use client';

import React from 'react';
import { Pencil, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { Button, LoadingSpinner } from '@/components/ui';
import type { TaxonomyInstitution } from '@/store/services/taxonomy-api';

interface InstitutionsTableProps {
  institutions: TaxonomyInstitution[];
  isLoading: boolean;
  isBn: boolean;
  onToggleActive: (item: TaxonomyInstitution) => void;
  onEdit: (item: TaxonomyInstitution) => void;
  onDelete: (id: string, name: string) => void;
}

export function InstitutionsTable({
  institutions,
  isLoading,
  isBn,
  onToggleActive,
  onEdit,
  onDelete,
}: InstitutionsTableProps) {
  if (isLoading) {
    return (
      <tr>
        <td colSpan={8} className="py-12 text-center text-muted-foreground">
          <LoadingSpinner className="mx-auto h-6 w-6 text-primary" />
        </td>
      </tr>
    );
  }

  if (institutions.length === 0) {
    return (
      <tr>
        <td colSpan={8} className="py-12 text-center text-muted-foreground">
          {isBn ? 'কোনো শিক্ষা প্রতিষ্ঠান পাওয়া যায়নি' : 'No institutions found'}
        </td>
      </tr>
    );
  }

  return (
    <>
      {institutions.map((inst, index) => (
        <tr
          key={inst.id}
          className={`transition-colors ${
            inst.isActive !== false
              ? 'hover:bg-surface-hover/50'
              : 'bg-muted/15 opacity-75 hover:opacity-100 hover:bg-muted/30'
          }`}
        >
          <td className="py-3 px-4 font-mono text-muted-foreground">{index + 1}</td>
          <td className="py-3 px-4 font-mono font-medium text-foreground">{inst.code}</td>
          <td className="py-3 px-4 font-semibold text-foreground">
            {inst.nameEn}
            {inst.isActive === false && (
              <span className="ml-2 text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded font-normal">
                {isBn ? 'নিষ্ক্রিয়' : 'Inactive'}
              </span>
            )}
          </td>
          <td className="py-3 px-4 text-muted-foreground">{inst.nameBn}</td>
          <td className="py-3 px-4">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-info-soft text-info-soft-foreground border border-info/30 capitalize">
              {inst.type.replace(/_/g, ' ')}
            </span>
          </td>
          <td className="py-3 px-4 text-xs text-muted-foreground">{inst.district || '—'}</td>
          <td className="py-3 px-4 text-center">
            <button
              type="button"
              onClick={() => onToggleActive(inst)}
              title={
                inst.isActive !== false
                  ? isBn
                    ? 'ক্লিক করে নিষ্ক্রিয় করুন'
                    : 'Click to deactivate'
                  : isBn
                    ? 'ক্লিক করে সক্রিয় করুন'
                    : 'Click to activate'
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                inst.isActive !== false
                  ? 'bg-success-soft text-success-soft-foreground border-success/30 hover:bg-success/20'
                  : 'bg-muted/70 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
              }`}
            >
              {inst.isActive !== false ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-destructive" />
              )}
              <span>
                {inst.isActive !== false ? (isBn ? 'সক্রিয়' : 'Active') : isBn ? 'নিষ্ক্রিয়' : 'Inactive'}
              </span>
            </button>
          </td>
          <td className="py-3 px-4 text-right">
            <div className="flex items-center justify-end gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(inst)}
                aria-label={isBn ? `সম্পাদনা করুন: ${inst.nameEn}` : `Edit: ${inst.nameEn}`}
                className="h-8 w-8 p-0 rounded-full hover:bg-surface"
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(inst.id, inst.nameEn)}
                aria-label={isBn ? `মুছে ফেলুন: ${inst.nameEn}` : `Delete: ${inst.nameEn}`}
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
