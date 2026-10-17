'use client';

import React from 'react';
import { Calendar, CheckCircle2, Clock } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { LoadingSpinner } from '@/components/ui';
import type { Locale } from '@/lib/i18n';
import { useAdminDashboard } from '../hooks/use-admin-dashboard';
import { useAdminActions } from '../hooks/use-admin-actions';
import { useAdminViewState } from '../hooks/use-admin-view-state';
import { AdminBookingsTab } from '../components/tabs/adminBookingsTab';
import { AdminCancelBookingModal } from '../components/modals/adminCancelBookingModal';

export function AdminBookingsPage({ locale }: { locale: Locale }) {
  const admin = useAdminDashboard(locale);

  const view = useAdminViewState('bookings');
  const actions = useAdminActions({
    initialBookings: admin.bookings,
    onCancelBooking: admin.onCancelBooking,
  });

  const handleConfirmCancelBooking = async () => {
    if (!view.selectedBookingForCancel || !view.cancelReason.trim()) return;
    await actions.cancelBooking(
      view.selectedBookingForCancel.id,
      view.cancelReason.trim(),
      view.refundChecked,
    );
    view.resetCancelForm();
  };

  const totalBookings = admin.bookings.length;
  const activeCount = admin.bookings.filter((b) => b.status === 'confirmed').length;
  const completedCount = admin.bookings.filter((b) => b.status === 'completed').length;

  return (
    <AdminLayout
      locale={locale}
      title={locale === 'bn' ? 'বুকিং ও হস্তক্ষেপ' : 'Bookings & Interventions'}
    >
      {admin.loading && !admin.bookings.length ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="space-y-6 py-6" data-testid="admin-bookings-page">
          {actions.actionError && (
            <div
              role="alert"
              className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-soft-foreground"
              data-testid="admin-action-error"
            >
              {actions.actionError}
            </div>
          )}

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  {locale === 'bn' ? 'বুকিং ও প্ল্যাটফর্ম হস্তক্ষেপ' : 'Bookings & Interventions'}
                </h1>
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-interactive/15 text-info-soft-foreground border border-info/40">
                  {totalBookings} {locale === 'bn' ? 'বুকিং' : 'Bookings'}
                </span>
              </div>
              <p className="text-muted-foreground text-sm mt-1.5">
                {locale === 'bn'
                  ? 'সকল টিউটরিং বুকিং সেশন নিরীক্ষা এবং প্রশাসনিক বাতিলকরণ বা রিফান্ড পরিচালনা'
                  : 'Monitor all tutoring booking sessions and manage administrative cancellations or refunds'}
              </p>
            </div>
          </div>

          {/* 3 Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card border border-border/70 rounded-2xl p-4.5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  {locale === 'bn' ? 'চলমান নিশ্চিত বুকিং' : 'Active Confirmed'}
                </p>
                <p className="text-2xl font-black text-info-soft-foreground mt-1 font-mono">{activeCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-interactive/10 border border-info/40 flex items-center justify-center text-info-soft-foreground">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-card border border-border/70 rounded-2xl p-4.5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  {locale === 'bn' ? 'সম্পন্ন সেশন' : 'Completed Sessions'}
                </p>
                <p className="text-2xl font-black text-success-soft-foreground mt-1 font-mono">
                  {completedCount}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/40 flex items-center justify-center text-success-soft-foreground">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-card border border-border/70 rounded-2xl p-4.5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  {locale === 'bn' ? 'মোট বুকিং রেকর্ড' : 'Total Bookings'}
                </p>
                <p className="text-2xl font-black text-foreground mt-1 font-mono">{totalBookings}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-interactive/10 border border-interactive/30 flex items-center justify-center text-interactive">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Bookings Table Card */}
          <div className="bg-card border border-border/70 rounded-3xl p-5 sm:p-6 space-y-4">
            <AdminBookingsTab
              bookings={actions.bookings}
              onRequestCancel={view.setSelectedBookingForCancel}
            />
          </div>

          {/* Cancel Booking Modal */}
          {view.selectedBookingForCancel && (
            <AdminCancelBookingModal
              booking={view.selectedBookingForCancel}
              reason={view.cancelReason}
              refundEscrow={view.refundChecked}
              onReasonChange={view.setCancelReason}
              onRefundChange={view.setRefundChecked}
              onClose={view.resetCancelForm}
              onConfirm={handleConfirmCancelBooking}
            />
          )}
        </div>
      )}
    </AdminLayout>
  );
}
