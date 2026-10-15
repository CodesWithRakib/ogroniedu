'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import type { AdminBookingItem } from '../../types/admin.types';

function bookingStatusClass(status: AdminBookingItem['status']): string {
  if (status === 'confirmed')
    return 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30';
  if (status === 'completed')
    return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';
  return 'bg-surface-muted text-muted-foreground border border-border/60';
}

export function AdminBookingsTab({
  bookings,
  onRequestCancel,
}: {
  bookings: AdminBookingItem[];
  onRequestCancel: (booking: AdminBookingItem) => void;
}) {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');

  return (
    <div className="space-y-4" data-testid="bookings-tab-content">
      <div className="border border-border/70 rounded-2xl overflow-hidden bg-card shadow-xs">
        <table className="w-full text-left text-xs" data-testid="bookings-table">
          <thead className="bg-surface text-muted-foreground border-b border-border uppercase tracking-wider text-[11px] font-semibold">
            <tr>
              <th className="px-4 py-3">Booking ID</th>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Tutor</th>
              <th className="px-4 py-3">Subject / Mode</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-foreground">
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-6 text-muted-foreground">
                  {tCommon('noData')}
                </td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr
                  key={booking.id}
                  className="hover:bg-surface-hover/50 transition-colors"
                  data-testid={`booking-row-${booking.id}`}
                >
                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                    {booking.id.substring(0, 8)}...
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{booking.studentName}</td>
                  <td className="px-4 py-3 text-foreground/90">{booking.tutorName}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {booking.subjectName} ({booking.mode})
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground">
                    {booking.priceBdt} BDT
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${bookingStatusClass(booking.status)}`}
                    >
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {booking.status !== 'cancelled' && (
                      <button
                        onClick={() => onRequestCancel(booking)}
                        className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg border border-rose-500/30 transition text-[11px] font-medium"
                        data-testid={`admin-cancel-booking-btn-${booking.id}`}
                      >
                        {t('cancelIntervention')}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
