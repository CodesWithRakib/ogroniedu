'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import type { AdminBookingItem } from '../../types/admin.types';

function bookingStatusClass(status: AdminBookingItem['status']): string {
  if (status === 'confirmed') return 'bg-blue-500/20 text-blue-300';
  if (status === 'completed') return 'bg-emerald-500/20 text-emerald-300';
  return 'bg-slate-800 text-slate-400';
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
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
        <table className="w-full text-left text-xs" data-testid="bookings-table">
          <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
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
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-6 text-slate-500">
                  {tCommon('noData')}
                </td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr
                  key={booking.id}
                  className="hover:bg-slate-800/40"
                  data-testid={`booking-row-${booking.id}`}
                >
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                    {booking.id.substring(0, 8)}...
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-200">{booking.studentName}</td>
                  <td className="px-4 py-3 text-slate-300">{booking.tutorName}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {booking.subjectName} ({booking.mode})
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-200">{booking.priceBdt} BDT</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${bookingStatusClass(booking.status)}`}
                    >
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {booking.status !== 'cancelled' && (
                      <button
                        onClick={() => onRequestCancel(booking)}
                        className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 rounded border border-rose-500/30 transition text-[11px]"
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
