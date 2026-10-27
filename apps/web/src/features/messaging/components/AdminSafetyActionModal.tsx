'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Badge,
} from '@/components/ui';
import {
  AlertTriangle,
  Ban,
  ShieldAlert,
  Clock,
  RotateCcw,
  CheckCircle,
  FileLock2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useGetUserSafetyStrikesQuery,
  useBanUserMutation,
  useSuspendUserMutation,
  useReactivateUserMutation,
} from '@/store/services/admin-api';
import type { Locale } from '@/lib/i18n';

interface AdminSafetyActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  targetUserName: string;
  targetUserRole?: string;
  studentUser?: { id: string; displayName: string };
  tutorUser?: { id: string; displayName: string };
  locale: Locale;
}

export function AdminSafetyActionModal({
  isOpen,
  onClose,
  targetUserId,
  targetUserName,
  targetUserRole,
  studentUser,
  tutorUser,
  locale,
}: AdminSafetyActionModalProps) {
  const [selectedTargetId, setSelectedTargetId] = useState<string>(studentUser?.id || targetUserId);

  const currentTarget =
    selectedTargetId === studentUser?.id
      ? { id: studentUser.id, name: studentUser.displayName, role: 'student' }
      : selectedTargetId === tutorUser?.id
        ? { id: tutorUser.id, name: tutorUser.displayName, role: 'tutor' }
        : { id: targetUserId, name: targetUserName, role: targetUserRole || 'User' };

  const {
    data: strikesData,
    isLoading,
    refetch,
  } = useGetUserSafetyStrikesQuery(currentTarget.id, {
    skip: !isOpen || !currentTarget.id,
  });

  const [banUser, { isLoading: isBanning }] = useBanUserMutation();
  const [suspendUser, { isLoading: isSuspending }] = useSuspendUserMutation();
  const [reactivateUser, { isLoading: isReactivating }] = useReactivateUserMutation();

  const [selectedAction, setSelectedAction] = useState<
    'warning' | 'temporary_suspension' | 'permanent_ban' | 'pardon'
  >('warning');
  const [reason, setReason] = useState('');

  const activeStrikes = strikesData?.data?.activeStrikes || 0;
  const isBlacklisted = strikesData?.data?.isBlacklisted || false;
  const currentStatus = strikesData?.data?.status || 'active';
  const actionsList = strikesData?.data?.actions || [];

  const handleApplyAction = async () => {
    if (!reason.trim()) {
      toast.error(
        locale === 'bn'
          ? 'অনুগ্রহ করে শাস্তিমূলক ব্যবস্থার কারণ উল্লেখ করুন'
          : 'Please provide a reason for the punitive action',
      );
      return;
    }

    try {
      if (selectedAction === 'permanent_ban') {
        await banUser({ id: currentTarget.id, reason: reason.trim() }).unwrap();
        toast.success(
          locale === 'bn'
            ? `${currentTarget.name}-কে স্থায়ীভাবে বহিষ্কার ও ব্ল্যাকলিস্ট করা হয়েছে`
            : `${currentTarget.name} has been permanently banned and credentials blacklisted`,
        );
      } else if (selectedAction === 'temporary_suspension') {
        await suspendUser({ id: currentTarget.id, reason: reason.trim() }).unwrap();
        toast.success(
          locale === 'bn'
            ? `${currentTarget.name}-কে ৭ দিনের জন্য সাময়িক স্থগিত করা হয়েছে`
            : `${currentTarget.name} has been suspended for 7 days`,
        );
      } else if (selectedAction === 'pardon') {
        await reactivateUser(currentTarget.id).unwrap();
        toast.success(
          locale === 'bn'
            ? `${currentTarget.name}-এর সকল নিষেধাজ্ঞা প্রত্যাহার করে অ্যাকাউন্ট সচল করা হয়েছে`
            : `${currentTarget.name} has been pardoned and account reactivated`,
        );
      } else {
        // Warning
        await suspendUser({
          id: currentTarget.id,
          reason: `[Warning Notice]: ${reason.trim()}`,
        }).unwrap();
        toast.success(
          locale === 'bn'
            ? `${currentTarget.name}-কে সতর্কবার্তা পাঠানো হয়েছে`
            : `Warning notice sent to ${currentTarget.name}`,
        );
      }

      setReason('');
      refetch();
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'data' in err
          ? (err as { data?: { message?: string } }).data?.message
          : 'Action failed';
      toast.error(
        msg ||
          (locale === 'bn' ? 'কার্যক্রম সম্পন্ন করতে ব্যর্থ হয়েছে' : 'Failed to execute action'),
      );
    }
  };

  const presetReasons = [
    locale === 'bn'
      ? 'চ্যাটে অশ্লীল শব্দ, গালিগালাজ বা অপভাষার ব্যবহার (Zero Tolerance)'
      : 'Use of profanity, vulgarity, or abusive slurs in chat',
    locale === 'bn'
      ? 'প্ল্যাটফর্মের বাইরে সরাসরি লেনদেন বা তথ্যের আদান-প্রদান'
      : 'Attempting off-platform transactions or circumventing escrow',
    locale === 'bn'
      ? 'ভুয়া পরিচয়পত্র, প্রতারণামূলক আচরণ বা অসত্য তথ্য প্রদান'
      : 'Fraudulent identity, false claims, or forged credentials',
    locale === 'bn'
      ? 'অপ্রীতিকর আচরণ, হয়রানি বা হুমকি প্রদান'
      : 'Harassment, intimidation, or inappropriate conduct',
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl sm:max-w-2xl bg-card border-border shadow-2xl p-6 rounded-2xl">
        <DialogHeader className="flex flex-col gap-1.5 pb-2 border-b border-border">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  {locale === 'bn'
                    ? '🛡️ সেফগার্ড ও শাস্তিমূলক নিয়ন্ত্রণ'
                    : '🛡️ Safeguard & Enforcement Controls'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {currentTarget.name} ({currentTarget.role}) • ID: #{currentTarget.id.slice(0, 8)}
                </DialogDescription>
              </div>
            </div>

            {/* Status & Strike Badge */}
            <div className="flex items-center gap-1.5">
              <Badge
                className={
                  currentStatus === 'banned'
                    ? 'bg-red-600 text-white text-[11px] font-bold'
                    : currentStatus === 'suspended'
                      ? 'bg-amber-600 text-white text-[11px] font-bold'
                      : 'bg-emerald-600 text-white text-[11px] font-bold'
                }
              >
                {currentStatus.toUpperCase()}
              </Badge>
              <Badge
                variant="outline"
                className="text-[11px] font-bold border-red-500/40 text-red-600"
              >
                {activeStrikes} / 3 Strikes
              </Badge>
            </div>
          </div>

          {/* Participant Selector Tabs (When available) */}
          {studentUser && tutorUser && (
            <div className="flex items-center gap-2 pt-2 border-t border-border/60">
              <span className="text-[11px] font-semibold text-muted-foreground">
                {locale === 'bn' ? 'ব্যবহারকারী নির্বাচন:' : 'Select Participant:'}
              </span>
              <button
                type="button"
                onClick={() => setSelectedTargetId(studentUser.id)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  selectedTargetId === studentUser.id
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                🎓 {studentUser.displayName} ({locale === 'bn' ? 'শিক্ষার্থী' : 'Student'})
              </button>
              <button
                type="button"
                onClick={() => setSelectedTargetId(tutorUser.id)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  selectedTargetId === tutorUser.id
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                👨‍🏫 {tutorUser.displayName} ({locale === 'bn' ? 'শিক্ষক' : 'Tutor'})
              </button>
            </div>
          )}
        </DialogHeader>

        {/* Identity Blacklist Warning Banner */}
        {isBlacklisted && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-900/60 rounded-xl p-3 flex items-start gap-2.5 my-2 text-xs text-red-800 dark:text-red-200">
            <FileLock2 className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                {locale === 'bn'
                  ? '🚫 পরিচয় ও নথি ব্ল্যাকলিস্টেড'
                  : '🚫 Identity & Credentials Blacklisted'}
              </p>
              <p className="opacity-80 text-[11px] mt-0.5">
                {locale === 'bn'
                  ? 'এই ব্যবহারকারীর ফোন নম্বর, ইমেইল ও জাতীয় পরিচয়পত্র স্থায়ীভাবে ব্ল্যাকলিস্ট করা আছে। এই তথ্য দিয়ে নতুন কোনো অ্যাকাউন্ট তৈরি করা সম্ভব নয়।'
                  : 'This user’s Phone, Email, and NID credentials are permanently blacklisted from creating any new accounts on Ogroni.'}
              </p>
            </div>
          </div>
        )}

        {/* Action Type Selection */}
        <div className="flex flex-col gap-3 py-2">
          <label className="text-xs font-bold text-foreground block">
            {locale === 'bn' ? 'শাস্তিমূলক ব্যবস্থা নির্বাচন করুন:' : 'Select Enforcement Action:'}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setSelectedAction('warning')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                selectedAction === 'warning'
                  ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold ring-1 ring-amber-500'
                  : 'border-border hover:bg-muted/50 text-muted-foreground'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-bold">
                  {locale === 'bn' ? 'সতর্কবার্তা' : 'Warning'}
                </span>
              </div>
              <p className="text-[10px] opacity-75">
                {locale === 'bn' ? 'স্ট্রাইক ১: আনুষ্ঠানিক নোটিশ' : 'Strike 1: Redaction & Notice'}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedAction('temporary_suspension')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                selectedAction === 'temporary_suspension'
                  ? 'border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-400 font-semibold ring-1 ring-orange-500'
                  : 'border-border hover:bg-muted/50 text-muted-foreground'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-xs font-bold">
                  {locale === 'bn' ? 'স্থগিতাদেশ' : 'Suspend 7D'}
                </span>
              </div>
              <p className="text-[10px] opacity-75">
                {locale === 'bn' ? 'স্ট্রাইক ২: ৭ দিন স্থগিত' : 'Strike 2: Token Revoke'}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedAction('permanent_ban')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                selectedAction === 'permanent_ban'
                  ? 'border-red-600 bg-red-600/10 text-red-700 dark:text-red-400 font-semibold ring-1 ring-red-600'
                  : 'border-border hover:bg-muted/50 text-muted-foreground'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Ban className="w-3.5 h-3.5 text-red-600" />
                <span className="text-xs font-bold">
                  {locale === 'bn' ? 'স্থায়ী ব্যান' : 'Perm Ban'}
                </span>
              </div>
              <p className="text-[10px] opacity-75">
                {locale === 'bn' ? 'স্ট্রাইক ৩: ব্ল্যাকলিস্ট' : 'Strike 3: Blacklist ID'}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedAction('pardon')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                selectedAction === 'pardon'
                  ? 'border-emerald-600 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 font-semibold ring-1 ring-emerald-600'
                  : 'border-border hover:bg-muted/50 text-muted-foreground'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-bold">
                  {locale === 'bn' ? 'মার্জনা / সচল' : 'Pardon'}
                </span>
              </div>
              <p className="text-[10px] opacity-75">
                {locale === 'bn' ? 'নিষেধাজ্ঞা প্রত্যাহার' : 'Restore Account'}
              </p>
            </button>
          </div>

          {/* Preset Reasons */}
          <div className="flex flex-col gap-1 pt-1">
            <span className="text-[11px] font-medium text-muted-foreground block">
              {locale === 'bn' ? 'দ্রুত কারণ নির্বাচন করুন:' : 'Quick Preset Reason:'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {presetReasons.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-muted/60 hover:bg-muted border border-border text-foreground transition-colors cursor-pointer text-left"
                >
                  {r.slice(0, 42)}…
                </button>
              ))}
            </div>
          </div>

          {/* Reason Input */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-foreground block">
              {locale === 'bn'
                ? 'শাস্তিমূলক ব্যবস্থার কারণ ও অডিট নোট:'
                : 'Official Reason & Audit Log Notes:'}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder={
                locale === 'bn'
                  ? 'কারণ লিখুন যা ব্যবহারকারীকে জানানো হবে এবং অডিট ট্রেইলে সংরক্ষিত থাকবে…'
                  : 'Provide detailed reason for this enforcement action…'
              }
              className="w-full text-xs p-2.5 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary focus:outline-hidden"
            />
          </div>

          {/* Past Safety History */}
          {actionsList.length > 0 && (
            <div className="pt-2 border-t border-border/60">
              <span className="text-[11px] font-bold text-muted-foreground block mb-1">
                {locale === 'bn' ? 'পূর্ববর্তী রেকর্ড ও সতর্কতা:' : 'Past Enforcement History:'}
              </span>
              <div className="max-h-24 overflow-y-auto flex flex-col gap-1">
                {actionsList.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-muted/30 border border-border/40"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold capitalize text-foreground">
                        {a.action_type}:
                      </span>
                      <span className="text-muted-foreground truncate max-w-[260px]">
                        {a.reason}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(a.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 border-t border-border pt-3">
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-xl text-xs">
            {locale === 'bn' ? 'বাতিল' : 'Cancel'}
          </Button>
          <Button
            size="sm"
            onClick={handleApplyAction}
            disabled={isBanning || isSuspending || isReactivating || !reason.trim()}
            className={`rounded-xl text-xs font-bold ${
              selectedAction === 'permanent_ban'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : selectedAction === 'temporary_suspension'
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : selectedAction === 'pardon'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
            }`}
          >
            {isBanning || isSuspending || isReactivating
              ? locale === 'bn'
                ? 'কার্যকর হচ্ছে…'
                : 'Applying…'
              : selectedAction === 'permanent_ban'
                ? locale === 'bn'
                  ? 'স্থায়ী বহিষ্কার ও ব্ল্যাকলিস্ট করুন'
                  : 'Confirm Permanent Ban & Blacklist'
                : selectedAction === 'temporary_suspension'
                  ? locale === 'bn'
                    ? 'স্থগিতাদেশ কার্যকর করুন'
                    : 'Confirm Suspension'
                  : selectedAction === 'pardon'
                    ? locale === 'bn'
                      ? 'অ্যাকাউন্ট সচল ও মার্জনা করুন'
                      : 'Confirm Pardon & Reactivate'
                    : locale === 'bn'
                      ? 'সতর্কবার্তা পাঠান'
                      : 'Send Official Warning'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
