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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
        <h3 className="text-lg font-bold text-indigo-400">{t('rolesModalTitle')}</h3>
        <p className="text-xs text-slate-400">
          User: <span className="font-semibold text-slate-200">{user.displayName}</span>
        </p>
        <div className="space-y-2">
          {ASSIGNABLE_ROLES.map((role) => (
            <label
              key={role}
              className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={editingRoles.includes(role)}
                onChange={(e) => toggleRole(role, e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
                data-testid={`checkbox-role-${role}`}
              />
              <span>{role}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
          >
            {tCommon('cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition"
            data-testid="confirm-roles-btn"
          >
            {tCommon('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
