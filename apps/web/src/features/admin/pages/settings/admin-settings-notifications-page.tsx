'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bell, Check, RefreshCw, Send, Smartphone, Mail } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { Button, Alert, AlertDescription, Input, NativeSelect } from '@/components/ui';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';

export function AdminSettingsNotificationsPage({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  const [smsGateway, setSmsGateway] = useState<'ssl_wireless' | 'twilio' | 'mim_sms'>(
    'ssl_wireless',
  );
  const [smsSenderId, setSmsSenderId] = useState<string>('OgroniEdu');
  const [emailProvider, setEmailProvider] = useState<'resend' | 'sendgrid' | 'smtp'>('resend');
  const [supportEmail, setSupportEmail] = useState<string>('support@ogroniedu.com');
  const [saved, setSaved] = useState(false);
  const [testSent, setTestSent] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSendTestSms = () => {
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <AdminLayout
      locale={locale}
    >
      <div className="space-y-6 py-6" data-testid="admin-settings-notifications-page">
        {/* Back Link to Hub (Image 2 Pattern) */}
        <div>
          <Link
            href={withLocale('/dashboard/admin/settings', locale)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>{isBn ? '← প্ল্যাটফর্ম সেটিংস-এ ফিরে যান' : '← Back to Platform Settings'}</span>
          </Link>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {isBn ? 'নোটিফিকেশন ও এসএমএস গেটওয়ে' : 'Notification & SMS Gateways'}
              </h1>
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-interactive-soft text-interactive-soft-foreground border border-interactive/20">
                GATEWAYS
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-1.5">
              {isBn
                ? 'এসএমএস গেটওয়ে ইন্টিগ্রেশন, ওটিপি প্রেরক আইডি এবং ইমেইল ডেলিভারি সেবা কনফিগার করুন'
                : 'Configure SMS gateway providers, masking sender IDs, and transactional email routing'}
            </p>
          </div>

          <Button onClick={handleSave} className="flex items-center gap-2">
            {saved ? <Check className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
            <span>
              {saved
                ? isBn
                  ? 'সংরক্ষিত হয়েছে!'
                  : 'Saved!'
                : isBn
                  ? 'পরিবর্তন সংরক্ষণ করুন'
                  : 'Save Changes'}
            </span>
          </Button>
        </div>

        {saved && (
          <Alert className="bg-success-soft border-success/30 text-success-soft-foreground">
            <AlertDescription>
              {isBn
                ? 'গেটওয়ে সেটিংস সফলভাবে আপডেট করা হয়েছে।'
                : 'Notification and messaging gateway configurations have been saved.'}
            </AlertDescription>
          </Alert>
        )}

        {testSent && (
          <Alert className="bg-info-soft border-info/30 text-info-soft-foreground">
            <AlertDescription>
              {isBn
                ? 'টেস্ট ওটিপি এসএমএস সফলভাবে কিউতে প্রেরণ করা হয়েছে!'
                : 'Test OTP SMS successfully queued through configured gateway!'}
            </AlertDescription>
          </Alert>
        )}

        {/* Gateways Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SMS Gateway Card */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-interactive-soft text-interactive border border-interactive/20 flex items-center justify-center font-bold">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {isBn ? 'এসএমএস গেটওয়ে প্রোভাইডার' : 'SMS Gateway Provider'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isBn
                    ? 'বাংলাদেশে দ্রুত ওটিপি ডেলিভারির জন্য গেটওয়ে নির্বাচন'
                    : 'Primary carrier gateway for OTPs and booking SMS in BD'}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  {isBn ? 'প্রোভাইডার নির্বাচন' : 'Active Provider'}
                </label>
                <NativeSelect
                  value={smsGateway}
                  onChange={(e) => setSmsGateway(e.target.value as any)}
                  className="bg-surface font-semibold text-xs"
                >
                  <option value="ssl_wireless">SSL Wireless (Recommended BD)</option>
                  <option value="mim_sms">MiM SMS (Bangladeshi Masking)</option>
                  <option value="twilio">Twilio Global SMS</option>
                </NativeSelect>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  {isBn ? 'এসএমএস মাস্কিং আইডি' : 'SMS Masking Sender ID'}
                </label>
                <Input
                  type="text"
                  value={smsSenderId}
                  onChange={(e) => setSmsSenderId(e.target.value)}
                  className="bg-surface font-mono font-bold text-xs"
                />
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendTestSms}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isBn ? 'টেস্ট ওটিপি এসএমএস পাঠান' : 'Send Test Verification SMS'}</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Email Gateway Card */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-info-soft text-info border border-info/30 flex items-center justify-center font-bold">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {isBn ? 'ইমেইল ডেলিভারি সার্ভিস' : 'Transactional Email Service'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isBn
                    ? 'ইনভয়েস, নোটিশ ও বুকিং আপডেটের ইমেইল রাউটিং'
                    : 'SMTP or API delivery for tuition receipts and alerts'}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  {isBn ? 'ইমেইল এপিআই' : 'Email Delivery API'}
                </label>
                <NativeSelect
                  value={emailProvider}
                  onChange={(e) => setEmailProvider(e.target.value as any)}
                  className="bg-surface font-semibold text-xs"
                >
                  <option value="resend">Resend.com (Modern HTTP API)</option>
                  <option value="sendgrid">Twilio SendGrid</option>
                  <option value="smtp">Custom Enterprise SMTP</option>
                </NativeSelect>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  {isBn ? 'সাপোর্ট ইমেইল ঠিকানা' : 'From / Support Email Address'}
                </label>
                <Input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="bg-surface font-mono font-bold text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
