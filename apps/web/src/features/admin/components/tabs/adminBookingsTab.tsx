'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Eye, ShieldAlert, Wallet, ExternalLink, Video, MapPin } from 'lucide-react';
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
import type { Locale } from '@/lib/i18n';
import type { AdminBookingItem } from '../../types/admin.types';

export function AdminBookingsTab({
  bookings,
  onRequestCancel,
  locale = 'bn',
}: {
  bookings: AdminBookingItem[];
  onRequestCancel: (booking: AdminBookingItem) => void;
  locale?: Locale;
}) {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const isBn = locale === 'bn';

  return (
    <div className="space-y-4" data-testid="bookings-tab-content">
      <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-xs">
        <Table data-testid="bookings-table">
          <TableHeader>
            <TableRow className="uppercase tracking-wider text-[11px] font-bold bg-muted/30">
              <TableHead className="px-4 py-3.5">{isBn ? 'বুকিং আইডি' : 'Booking ID'}</TableHead>
              <TableHead className="px-4 py-3.5">{isBn ? 'শিক্ষার্থী' : 'Student'}</TableHead>
              <TableHead className="px-4 py-3.5">{isBn ? 'টিউটর' : 'Tutor'}</TableHead>
              <TableHead className="px-4 py-3.5">
                {isBn ? 'বিষয় ও মাধ্যম' : 'Subject & Mode'}
              </TableHead>
              <TableHead className="px-4 py-3.5">{isBn ? 'ফি / সেশন' : 'Fee / Session'}</TableHead>
              <TableHead className="px-4 py-3.5">
                {isBn ? 'এসক্রো স্থিতি' : 'Escrow Status'}
              </TableHead>
              <TableHead className="px-4 py-3.5">
                {isBn ? 'বুকিং স্থিতি' : 'Booking Status'}
              </TableHead>
              <TableHead className="px-4 py-3.5 text-right">
                {isBn ? 'অ্যাকশন' : 'Actions'}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-foreground text-xs divide-y divide-border/50">
            {bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {tCommon('noData')}
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((booking) => {
                const isHeld =
                  booking.escrowStatus === 'held' ||
                  (!booking.escrowStatus && booking.status === 'confirmed');
                const isReleased = booking.escrowStatus === 'released';
                const isRefunded =
                  booking.escrowStatus === 'refunded' || booking.status === 'cancelled';

                return (
                  <TableRow
                    key={booking.id}
                    className="hover:bg-muted/40 transition-colors"
                    data-testid={`booking-row-${booking.id}`}
                  >
                    <TableCell className="px-4 py-3.5 font-mono text-[11px]">
                      <Link
                        href={`/${locale}/dashboard/admin/bookings/${booking.id}`}
                        className="text-primary hover:underline font-semibold flex items-center gap-1"
                      >
                        {booking.id.substring(0, 8)}...
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 font-medium text-foreground">
                      {booking.studentName}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-foreground/90 font-medium">
                      {booking.tutorName}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-foreground">{booking.subjectName}</span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                          {booking.mode === 'online' ? (
                            <span className="flex items-center gap-1">
                              <Video className="w-2.5 h-2.5" /> {isBn ? 'অনলাইন' : 'Online'}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5" /> {isBn ? 'সরাসরি' : 'In-Person'}
                            </span>
                          )}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 font-bold font-mono text-foreground">
                      ৳{booking.priceBdt.toLocaleString()}
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      {isReleased ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          {isBn ? 'রিলিজড' : 'Released'}
                        </span>
                      ) : isRefunded ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                          {isBn ? 'রিফান্ডেড' : 'Refunded'}
                        </span>
                      ) : isHeld ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          {isBn ? 'এসক্রো সংরক্ষিত' : 'Escrow Held'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
                          {booking.escrowStatus || '—'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <StatusBadge status={booking.status} size="sm" />
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/${locale}/dashboard/admin/bookings/${booking.id}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          data-testid={`admin-view-booking-${booking.id}`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{isBn ? 'বিস্তারিত' : 'Details'}</span>
                        </Link>
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
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
