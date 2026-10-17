'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import type { AdminBookingItem } from '../../types/admin.types';

function bookingStatusVariant(status: AdminBookingItem['status']): 'primary' | 'success' | 'outline' {
  if (status === 'confirmed') return 'primary';
  if (status === 'completed') return 'success';
  return 'outline';
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
        <Table data-testid="bookings-table">
          <TableHeader>
            <TableRow className="uppercase tracking-wider text-[11px] font-bold">
              <TableHead className="px-4 py-3.5">Booking ID</TableHead>
              <TableHead className="px-4 py-3.5">Student</TableHead>
              <TableHead className="px-4 py-3.5">Tutor</TableHead>
              <TableHead className="px-4 py-3.5">Subject / Mode</TableHead>
              <TableHead className="px-4 py-3.5">Amount</TableHead>
              <TableHead className="px-4 py-3.5">Status</TableHead>
              <TableHead className="px-4 py-3.5 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-foreground text-xs">
            {bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                  {tCommon('noData')}
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((booking) => (
                <TableRow
                  key={booking.id}
                  className="hover:bg-muted/40 transition-colors"
                  data-testid={`booking-row-${booking.id}`}
                >
                  <TableCell className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                    {booking.id.substring(0, 8)}...
                  </TableCell>
                  <TableCell className="px-4 py-3 font-medium text-foreground">{booking.studentName}</TableCell>
                  <TableCell className="px-4 py-3 text-foreground/90">{booking.tutorName}</TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground">
                    {booking.subjectName} ({booking.mode})
                  </TableCell>
                  <TableCell className="px-4 py-3 font-semibold text-foreground">
                    {booking.priceBdt} BDT
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <StatusBadge status={booking.status} size="sm" />
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    {booking.status !== 'cancelled' && (
                      <Button
                        variant="destructive"
                        size="xs"
                        onClick={() => onRequestCancel(booking)}
                        className="rounded-lg text-[11px] font-medium"
                        data-testid={`admin-cancel-booking-btn-${booking.id}`}
                      >
                        {t('cancelIntervention')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
