'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import type { AdminUserItem } from '../../types/admin.types';

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
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
      data-testid="roles-modal"
    >
      <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
        <h3 className="text-lg font-bold text-foreground">{t('rolesModalTitle')}</h3>
        <p className="text-xs text-muted-foreground">
          User: <span className="font-semibold text-foreground">{user.displayName}</span>
        </p>
        <div className="space-y-2">
          {ASSIGNABLE_ROLES.map((role) => (
            <label
              key={role}
              className="flex items-center space-x-2.5 text-xs text-foreground cursor-pointer p-1.5 rounded-lg hover:bg-surface-hover/60 transition-colors"
            >
              <input
                type="checkbox"
                checked={editingRoles.includes(role)}
                onChange={(e) => toggleRole(role, e.target.checked)}
                className="rounded border-border bg-surface text-primary focus:ring-0"
                data-testid={`checkbox-role-${role}`}
              />
              <span className="capitalize">{role.replace('_', ' ')}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface hover:bg-surface-hover text-foreground border border-border rounded-xl text-xs font-semibold transition"
          >
            {tCommon('cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-xs font-bold shadow-xs transition"
            data-testid="confirm-roles-btn"
          >
            {tCommon('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
