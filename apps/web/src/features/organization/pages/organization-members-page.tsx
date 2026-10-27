'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Users, UserPlus, Mail, Trash2, CheckCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import {
  useGetMyOrganizationsQuery,
  useGetOrganizationMembersQuery,
  useInviteOrganizationMemberMutation,
  useRemoveOrganizationMemberMutation,
} from '@/store/services/organizations-api';
import type { OrganizationRecord } from '@ogroniedu/contracts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';

export function OrganizationMembersPageView() {
  const { data: myOrgsData, isLoading: orgsLoading } = useGetMyOrganizationsQuery();
  const organizations = (myOrgsData?.data || []) as Array<
    OrganizationRecord & { memberRole?: string }
  >;
  const currentOrg = organizations[0] || null;

  const {
    data: membersData,
    isLoading: membersLoading,
    refetch,
  } = useGetOrganizationMembersQuery(currentOrg?.id || '', {
    skip: !currentOrg?.id,
  });

  const [inviteMember, { isLoading: isInviting }] = useInviteOrganizationMemberMutation();
  const [removeMember, { isLoading: isRemoving }] = useRemoveOrganizationMemberMutation();

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'staff' | 'tutor'>('tutor');
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const members = membersData?.data || [];

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;

    try {
      await inviteMember({
        id: currentOrg.id,
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
      }).unwrap();

      setInviteSuccess(true);
      setInviteEmail('');
      setTimeout(() => {
        setInviteSuccess(false);
        setShowInviteModal(false);
      }, 2500);
      refetch();
    } catch (err) {
      console.error('Invite failed', err);
    }
  };

  const handleRemove = async (memberUserId: string) => {
    if (!currentOrg) return;
    if (!confirm('Are you sure you want to remove this member from your organization?')) {
      return;
    }

    try {
      await removeMember({
        id: currentOrg.id,
        memberUserId,
      }).unwrap();
      refetch();
    } catch (err) {
      console.error('Failed to remove member', err);
    }
  };

  if (orgsLoading || membersLoading) {
    return (
      <div className="p-12 text-center text-sm text-muted-foreground">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
        Loading organization roster...
      </div>
    );
  }

  if (!currentOrg) {
    return (
      <div className="p-12 text-center text-sm text-muted-foreground">
        Please register an organization before managing members.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <Link
            href="/dashboard/organization"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Organization Overview
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Users className="w-6 h-6 text-primary" />
            Staff & Tutor Roster
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Managing members and affiliated tutors for{' '}
            <span className="font-semibold text-foreground">{currentOrg.name}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Invite Member / Tutor
          </button>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Active Members ({members.length})
          </h2>
          <button
            onClick={() => refetch()}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Joined Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-muted/20 transition">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-foreground">
                      {member.user?.displayName || 'Active Member'}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {member.user?.email || member.userId}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold capitalize ${
                        member.role === 'owner'
                          ? 'bg-primary-soft text-primary border border-primary/20'
                          : member.role === 'admin'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : member.role === 'staff'
                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {member.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      Active
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {new Date(member.joinedAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {member.role !== 'owner' && (
                      <button
                        onClick={() => handleRemove(member.userId)}
                        disabled={isRemoving}
                        className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition"
                        title="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <Dialog open={showInviteModal} onOpenChange={(open) => !open && setShowInviteModal(false)}>
          <DialogContent className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl p-6 flex flex-col gap-4 text-left">
            <DialogHeader className="border-b border-slate-100 pb-3 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-black text-slate-900">
                    Invite Member or Tutor
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-600">
                    Send an official invitation to join{' '}
                    <span className="font-semibold text-slate-900">{currentOrg.name}</span>.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {inviteSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Invitation sent successfully! Token generated.</span>
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Invitee Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="tutor@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Assigned Organizational Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'staff' | 'tutor')}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="tutor">Affiliated Tutor (Delivers institutional sessions)</option>
                  <option value="staff">Academic Staff (Coordinates schedules)</option>
                  <option value="admin">Branch Administrator (Manages tutors & roster)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInviteModal(false)}
                  className="rounded-xl border-slate-200 text-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isInviting}
                  variant="primary"
                  className="rounded-xl font-bold"
                >
                  Send Invitation
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
