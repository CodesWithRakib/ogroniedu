'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import type { AdminUserItem } from '../../types/admin.types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/Button';

const ASSIGNABLE_ROLES = [
  'student',
  'guardian',
  'tutor',
  'support_agent',
  'compliance_reviewer',
  'admin',
  'super_admin',
] as const;

export function AdminRolesModal({
  user,
  editingRoles,
  onEditingRolesChange,
  onClose,
  onConfirm,
}: {
  user: AdminUserItem;
  editingRoles: string[];
  onEditingRolesChange: (roles: string[]) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');

  const toggleRole = (role: string, checked: boolean) => {
    onEditingRolesChange(
      checked ? [...editingRoles, role] : editingRoles.filter((r) => r !== role),
    );
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md" data-testid="roles-modal">
        <DialogHeader>
          <DialogTitle>{t('rolesModalTitle')}</DialogTitle>
          <DialogDescription>
            User: <span className="font-semibold text-foreground">{user.displayName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 py-2">
          {ASSIGNABLE_ROLES.map((role) => {
            const isChecked = editingRoles.includes(role);
            const inputId = `role-${role}`;
            return (
              <div
                key={role}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={inputId}
                  checked={isChecked}
                  onCheckedChange={(checked) => toggleRole(role, Boolean(checked))}
                  data-testid={`checkbox-role-${role}`}
                />
                <Label htmlFor={inputId} className="cursor-pointer text-sm font-medium capitalize">
                  {role.replace('_', ' ')}
                </Label>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end flex items-center gap-3 pt-3">
          <Button variant="outline" onClick={onClose}>
            {tCommon('cancel')}
          </Button>
          <Button variant="primary" onClick={onConfirm} data-testid="confirm-roles-btn">
            {tCommon('save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
