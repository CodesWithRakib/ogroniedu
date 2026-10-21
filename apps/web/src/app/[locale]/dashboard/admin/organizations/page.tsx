'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Building2,
  Search,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import {
  useGetAdminOrganizationsQuery,
  useAdminUpdateOrganizationStatusMutation,
} from '@/store/services/organizations-api';
import type { OrganizationStatus, OrganizationRecord } from '@ogroniedu/contracts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';

export default function AdminOrganizationsPage() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrg, setSelectedOrg] = useState<OrganizationRecord | null>(null);
  const [actionStatus, setActionStatus] = useState<OrganizationStatus | null>(null);
  const [reason, setReason] = useState('');

  const { data, isLoading, isError, refetch } = useGetAdminOrganizationsQuery({
    search: search ? search : undefined,
    status: statusFilter !== 'all' ? (statusFilter as OrganizationStatus) : undefined,
    limit: 50,
  });

  const [updateStatus, { isLoading: isUpdating }] = useAdminUpdateOrganizationStatusMutation();

  const organizations = data?.data || [];

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg || !actionStatus) return;

    try {
      await updateStatus({
        id: selectedOrg.id,
        status: actionStatus,
        reason: reason.trim() || undefined,
      }).unwrap();

      setSelectedOrg(null);
      setActionStatus(null);
      setReason('');
      refetch();
    } catch (err) {
      console.error('Failed to update organization status', err);
    }
  };

  const getStatusBadge = (status: OrganizationStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5" />
            Active
          </span>
        );
      case 'pending_approval':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            Pending Approval
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            Suspended
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-primary" />
            Organization Governance & Accreditation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review, verify trade licenses, approve, and oversee institutional coaching centers and agencies across Bangladesh.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-surface border border-border rounded-lg shadow-xs hover:bg-muted transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, slug, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border bg-surface text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Organizations' },
            { id: 'pending_approval', label: 'Pending Review' },
            { id: 'active', label: 'Active' },
            { id: 'suspended', label: 'Suspended' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                statusFilter === tab.id
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
            Loading registered organizations...
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-sm text-destructive">
            Failed to load organizations. Please try again.
          </div>
        ) : organizations.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">No organizations found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {search || statusFilter !== 'all'
                ? 'Try adjusting your search query or status filter.'
                : 'No educational organizations have registered on the platform yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Trade License</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-muted/20 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground">{org.name}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">@{org.slug}</div>
                    </td>
                    <td className="py-3 px-4 capitalize">
                      {org.type.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {org.tradeLicenseNumber || <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="py-3 px-4">
                      <div>{org.contactEmail}</div>
                      {org.contactPhone && (
                        <div className="text-muted-foreground font-mono text-[11px]">
                          {org.contactPhone}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(org.status)}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {org.status === 'pending_approval' && (
                          <button
                            onClick={() => {
                              setSelectedOrg(org);
                              setActionStatus('active');
                            }}
                            className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition"
                          >
                            Approve
                          </button>
                        )}
                        {org.status === 'active' && (
                          <button
                            onClick={() => {
                              setSelectedOrg(org);
                              setActionStatus('suspended');
                            }}
                            className="px-2.5 py-1 text-xs font-medium rounded-md bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition"
                          >
                            Suspend
                          </button>
                        )}
                        {org.status === 'suspended' && (
                          <button
                            onClick={() => {
                              setSelectedOrg(org);
                              setActionStatus('active');
                            }}
                            className="px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {selectedOrg && actionStatus && (
        <Dialog open={true} onOpenChange={(open) => !open && setSelectedOrg(null)}>
          <DialogContent className="bg-white w-full max-w-md rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4 text-left">
            <DialogHeader className="border-b border-slate-100 pb-3 text-left">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    actionStatus === 'active'
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : 'bg-rose-50 text-rose-600 border border-rose-200'
                  }`}
                >
                  {actionStatus === 'active' ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <DialogTitle className="text-base font-black text-slate-900">
                    {actionStatus === 'active' ? 'Approve Organization' : 'Suspend Organization'}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-600">
                    Target: <span className="font-semibold text-slate-900">{selectedOrg.name}</span>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleActionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Reason & Verification Notes
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={
                    actionStatus === 'active'
                      ? 'e.g., Trade license verified with municipal authority and tax clearance verified.'
                      : 'e.g., Unresolved complaint regarding tutor safety or fraudulent representations.'
                  }
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedOrg(null);
                    setActionStatus(null);
                    setReason('');
                  }}
                  className="rounded-xl border-slate-200 text-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isUpdating}
                  variant={actionStatus === 'active' ? 'primary' : 'destructive'}
                  className="rounded-xl font-bold"
                >
                  Confirm {actionStatus === 'active' ? 'Approval' : 'Suspension'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
