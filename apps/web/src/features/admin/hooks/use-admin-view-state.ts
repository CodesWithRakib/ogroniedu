'use client';

import React from 'react';
import type { AdminBookingItem, AdminUserItem } from '../types/admin.types';
import type { AdminTabKey } from '../components/adminTabsBar';

/**
 * Local UI state for the admin dashboard view: active tab, modal selection,
 * and transient modal form values. Owns no data fetching and no mutations —
 * confirm handlers live in the composer where the action layer is available.
 */
export interface AdminViewState {
  activeTab: AdminTabKey;
  setActiveTab: (tab: AdminTabKey) => void;
  selectedUserForSuspend: AdminUserItem | null;
  setSelectedUserForSuspend: (user: AdminUserItem | null) => void;
  suspendReason: string;
  setSuspendReason: (value: string) => void;
  selectedUserForRoles: AdminUserItem | null;
  editingRoles: string[];
  requestRoles: (user: AdminUserItem) => void;
  setEditingRoles: (roles: string[]) => void;
  closeRolesModal: () => void;
  selectedBookingForCancel: AdminBookingItem | null;
  setSelectedBookingForCancel: (booking: AdminBookingItem | null) => void;
  cancelReason: string;
  setCancelReason: (value: string) => void;
  refundChecked: boolean;
  setRefundChecked: (value: boolean) => void;
  selectedUserForImpersonate: AdminUserItem | null;
  setSelectedUserForImpersonate: (user: AdminUserItem | null) => void;
  impersonateReason: string;
  setImpersonateReason: (value: string) => void;
  impersonateMinutes: number;
  setImpersonateMinutes: (value: number) => void;
  resetSuspendForm: () => void;
  resetCancelForm: () => void;
  resetImpersonateForm: () => void;
}

export function useAdminViewState(): AdminViewState {
  const [activeTab, setActiveTab] = React.useState<AdminTabKey>('overview');

  const [selectedUserForSuspend, setSelectedUserForSuspend] =
    React.useState<AdminUserItem | null>(null);
  const [suspendReason, setSuspendReason] = React.useState('');
  const [selectedUserForRoles, setSelectedUserForRoles] = React.useState<AdminUserItem | null>(
    null,
  );
  const [editingRoles, setEditingRoles] = React.useState<string[]>([]);
  const [selectedBookingForCancel, setSelectedBookingForCancel] =
    React.useState<AdminBookingItem | null>(null);
  const [cancelReason, setCancelReason] = React.useState('');
  const [refundChecked, setRefundChecked] = React.useState(true);
  const [selectedUserForImpersonate, setSelectedUserForImpersonate] =
    React.useState<AdminUserItem | null>(null);
  const [impersonateReason, setImpersonateReason] = React.useState('');
  const [impersonateMinutes, setImpersonateMinutes] = React.useState(15);

  const requestRoles = React.useCallback((user: AdminUserItem) => {
    setSelectedUserForRoles(user);
    setEditingRoles([...user.roles]);
  }, []);

  const closeRolesModal = React.useCallback(() => {
    setSelectedUserForRoles(null);
  }, []);

  const resetSuspendForm = React.useCallback(() => {
    setSelectedUserForSuspend(null);
    setSuspendReason('');
  }, []);

  const resetCancelForm = React.useCallback(() => {
    setSelectedBookingForCancel(null);
    setCancelReason('');
  }, []);

  const resetImpersonateForm = React.useCallback(() => {
    setSelectedUserForImpersonate(null);
    setImpersonateReason('');
  }, []);

  return {
    activeTab,
    setActiveTab,
    selectedUserForSuspend,
    setSelectedUserForSuspend,
    suspendReason,
    setSuspendReason,
    selectedUserForRoles,
    editingRoles,
    requestRoles,
    setEditingRoles,
    closeRolesModal,
    selectedBookingForCancel,
    setSelectedBookingForCancel,
    cancelReason,
    setCancelReason,
    refundChecked,
    setRefundChecked,
    selectedUserForImpersonate,
    setSelectedUserForImpersonate,
    impersonateReason,
    setImpersonateReason,
    impersonateMinutes,
    setImpersonateMinutes,
    resetSuspendForm,
    resetCancelForm,
    resetImpersonateForm,
  };
}
