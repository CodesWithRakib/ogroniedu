'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Building2, Users, CheckCircle, Clock, Save, Plus } from 'lucide-react';
import {
  useGetMyOrganizationsQuery,
  useUpdateOrganizationMutation,
  useCreateOrganizationMutation,
} from '@/store/services/organizations-api';
import type { OrganizationRecord } from '@ogroniedu/contracts';

export function OrganizationDashboardPageView() {
  const { data, isLoading, refetch } = useGetMyOrganizationsQuery();
  const [updateOrg, { isLoading: isUpdating }] = useUpdateOrganizationMutation();
  const [createOrg, { isLoading: isCreating }] = useCreateOrganizationMutation();

  const organizations = (data?.data || []) as Array<OrganizationRecord & { memberRole?: string }>;
  const currentOrg = organizations[0] || null;

  // Edit state
  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [tradeLicenseNumber, setTradeLicenseNumber] = useState('');
  const [address, setAddress] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New org state
  const [isRegistering, setIsRegistering] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newType, setNewType] = useState<
    'coaching_center' | 'tutoring_agency' | 'academic_institution'
  >('coaching_center');

  useEffect(() => {
    if (currentOrg) {
      setName(currentOrg.name || '');
      setContactEmail(currentOrg.contactEmail || '');
      setContactPhone(currentOrg.contactPhone || '');
      setTradeLicenseNumber(currentOrg.tradeLicenseNumber || '');
      setAddress(currentOrg.address || '');
    }
  }, [currentOrg]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;

    try {
      await updateOrg({
        id: currentOrg.id,
        name,
        contactEmail,
        contactPhone: contactPhone || undefined,
        tradeLicenseNumber: tradeLicenseNumber || undefined,
        address: address || undefined,
      }).unwrap();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      refetch();
    } catch (err) {
      console.error('Update failed', err);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createOrg({
        name: newName,
        slug: newSlug,
        type: newType,
        contactEmail: newEmail,
        settings: {},
      }).unwrap();
      setIsRegistering(false);
      refetch();
    } catch (err) {
      console.error('Registration failed', err);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-sm text-muted-foreground">
        Loading organization portal...
      </div>
    );
  }

  if (!currentOrg && !isRegistering) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <Building2 className="w-12 h-12 text-primary mx-auto" />
        <h2 className="text-xl font-bold text-foreground">No Organization Registered</h2>
        <p className="text-xs text-muted-foreground">
          Register your coaching center, tutoring academy, or educational institution to begin
          recruiting tutors and accepting institutional tuition bookings.
        </p>
        <button
          onClick={() => setIsRegistering(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 transition"
        >
          <Plus className="w-4 h-4" />
          Register New Organization
        </button>
      </div>
    );
  }

  if (isRegistering) {
    return (
      <div className="max-w-lg mx-auto bg-card p-6 rounded-2xl border border-border shadow-xs space-y-5">
        <div>
          <h2 className="text-lg font-bold text-foreground">Register Educational Organization</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Submit your institution for official accreditation and verification.
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Organization Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. UCC College Admission Care, Farmgate"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setNewSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)+/g, ''),
                );
              }}
              className="w-full text-xs p-2.5 rounded-lg border border-border bg-surface text-foreground"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Unique Slug (URL Handle)
            </label>
            <input
              type="text"
              required
              placeholder="e.g. ucc-farmgate"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-border bg-surface text-foreground font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Organization Type
            </label>
            <select
              value={newType}
              onChange={(e) =>
                setNewType(
                  e.target.value as 'coaching_center' | 'tutoring_agency' | 'academic_institution',
                )
              }
              className="w-full text-xs p-2.5 rounded-lg border border-border bg-surface text-foreground"
            >
              <option value="coaching_center">Coaching Center</option>
              <option value="tutoring_agency">Tutoring Agency</option>
              <option value="academic_institution">Academic Institution</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Official Contact Email
            </label>
            <input
              type="email"
              required
              placeholder="info@uccbd.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-border bg-surface text-foreground"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsRegistering(false)}
              className="px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 transition"
            >
              {isCreating ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {currentOrg?.name}
            </h1>
            {currentOrg?.status === 'active' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5" />
                Verified & Active
              </span>
            )}
            {currentOrg?.status === 'pending_approval' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-3.5 h-3.5" />
                Pending Verification
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Handle: <span className="font-mono">@{currentOrg?.slug}</span> • Role:{' '}
            <span className="font-semibold capitalize text-foreground">
              {currentOrg?.memberRole || 'Owner'}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/organization/members"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 transition"
          >
            <Users className="w-3.5 h-3.5" />
            Manage Tutors & Staff
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-4 rounded-xl border border-border shadow-xs space-y-1">
          <div className="text-xs font-medium text-muted-foreground">Accreditation Status</div>
          <div className="text-lg font-bold text-foreground capitalize">
            {currentOrg?.status.replace('_', ' ')}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {currentOrg?.status === 'active'
              ? 'Authorized for institutional tuition bookings'
              : 'Under review by platform compliance'}
          </p>
        </div>

        <div className="bg-card p-4 rounded-xl border border-border shadow-xs space-y-1">
          <div className="text-xs font-medium text-muted-foreground">Institution Type</div>
          <div className="text-lg font-bold text-foreground capitalize">
            {currentOrg?.type.replace('_', ' ')}
          </div>
          <p className="text-[11px] text-muted-foreground">Registered educational provider</p>
        </div>

        <div className="bg-card p-4 rounded-xl border border-border shadow-xs space-y-1">
          <div className="text-xs font-medium text-muted-foreground">Affiliated Roster</div>
          <div className="text-lg font-bold text-foreground">
            {currentOrg?.memberCount || 1} Member(s)
          </div>
          <Link
            href="/dashboard/organization/members"
            className="text-[11px] text-primary hover:underline"
          >
            View roster and pending invites →
          </Link>
        </div>
      </div>

      {/* Profile & Metadata Settings Form */}
      <div className="bg-card rounded-xl border border-border shadow-xs p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-foreground">Organization Profile & Contact</h2>
          <p className="text-xs text-muted-foreground">
            Update your coaching center's public contact information and trade licensing details.
          </p>
        </div>

        {saveSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            Organization profile updated successfully!
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Organization Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-border bg-surface text-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Official Contact Email
              </label>
              <input
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-border bg-surface text-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Contact Phone (E.164)
              </label>
              <input
                type="tel"
                placeholder="+8801712345678"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-border bg-surface text-foreground font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Trade License Number
              </label>
              <input
                type="text"
                placeholder="TRAD/DNCC/..."
                value={tradeLicenseNumber}
                onChange={(e) => setTradeLicenseNumber(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-border bg-surface text-foreground font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Physical Campus / Office Address
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Level 4, Plot 15, Sonargaon Janapath, Uttara, Dhaka"
              className="w-full text-xs p-2.5 rounded-lg border border-border bg-surface text-foreground"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isUpdating}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 transition"
            >
              <Save className="w-3.5 h-3.5" />
              {isUpdating ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
