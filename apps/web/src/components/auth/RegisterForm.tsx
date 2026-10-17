'use client';

import React from 'react';
import Link from 'next/link';
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  GraduationCap,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';
import { getDictionary, type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
import type { RegisterRole } from '@/store/services/auth-api';
import { Button, Input, Label, Alert, AlertDescription } from '@/components/ui';
import { AuthShell } from './authShell';
import { cn } from '@/lib/utils';
import { useRegisterForm } from './use-register-form';

export function RegisterForm({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const {
    displayName,
    setDisplayName,
    email,
    setEmail,
    phone,
    setPhone,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    role,
    setRole,
    formError,
    isLoading,
    isBn,
    handleSubmit,
  } = useRegisterForm(locale);

  const roleOptions: {
    value: RegisterRole;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { value: 'student', label: isBn ? 'শিক্ষার্থী' : 'Student', icon: GraduationCap },
    { value: 'guardian', label: isBn ? 'অভিভাবক' : 'Guardian', icon: ShieldCheck },
    { value: 'tutor', label: isBn ? 'শিক্ষক' : 'Tutor', icon: BookOpen },
  ];

  return (
    <AuthShell
      locale={locale}
      mode="register"
      title={isBn ? 'নতুন অ্যাকাউন্ট খুলুন' : 'Create an Account'}
      subtitle={
        isBn
          ? 'সহজেই নিবন্ধন করে আপনার পড়াশোনা বা শিক্ষকতা শুরু করুন।'
          : 'Join OgroniEdu to connect with verified mentors or find students.'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" data-testid="register-form">
        {/* Error Alert */}
        {formError && (
          <Alert variant="destructive" className="rounded-xl" data-testid="register-error">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        {/* Role Picker (Visual Segmented Pills + synced select for test compatibility) */}
        <div className="space-y-1.5 text-left">
          <Label htmlFor="register-role" className="text-xs font-semibold text-foreground">
            {isBn ? 'আপনার ভূমিকা নির্বাচন করুন' : 'Select Account Type'}
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {roleOptions.map((opt) => {
              const Icon = opt.icon;
              const active = role === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRole(opt.value)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer',
                    active
                      ? 'border-primary bg-primary-soft text-primary shadow-xs font-bold'
                      : 'border-border/80 bg-surface/50 hover:bg-surface text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon
                    className={cn('h-4 w-4', active ? 'text-primary' : 'text-muted-foreground')}
                  />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
          {/* Hidden select strictly preserved for automated test ID compatibility */}
          <select
            id="register-role"
            value={role}
            onChange={(e) => setRole(e.target.value as RegisterRole)}
            className="sr-only"
            data-testid="register-role-select"
          >
            <option value="student">{isBn ? 'শিক্ষার্থী' : 'Student'}</option>
            <option value="guardian">{isBn ? 'অভিভাবক' : 'Guardian'}</option>
            <option value="tutor">{isBn ? 'শিক্ষক' : 'Tutor'}</option>
          </select>
        </div>

        {/* Full Name Input */}
        <div className="space-y-1.5 text-left">
          <Label htmlFor="register-name" className="text-xs font-semibold text-foreground">
            {isBn ? 'পুরো নাম' : 'Full Name'}
          </Label>
          <Input
            id="register-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={isBn ? 'উদা: আবরার আহমেদ' : 'e.g. Abrar Ahmed'}
            autoComplete="name"
            leadingIcon={<User className="h-4 w-4" />}
            data-testid="register-name-input"
          />
        </div>

        {/* Email & Phone Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 text-left">
            <Label htmlFor="register-email" className="text-xs font-semibold text-foreground">
              {isBn ? 'ইমেইল (ঐচ্ছিক)' : 'Email (optional)'}
            </Label>
            <Input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@mail.com"
              autoComplete="email"
              leadingIcon={<Mail className="h-4 w-4" />}
              data-testid="register-email-input"
            />
          </div>

          <div className="space-y-1.5 text-left">
            <Label htmlFor="register-phone" className="text-xs font-semibold text-foreground">
              {isBn ? 'মোবাইল (ঐচ্ছিক)' : 'Mobile (optional)'}
            </Label>
            <Input
              id="register-phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+8801XXXXXXXXX"
              autoComplete="tel"
              leadingIcon={<Phone className="h-4 w-4" />}
              data-testid="register-phone-input"
            />
          </div>
        </div>

        {/* Password Input */}
        <div className="space-y-1.5 text-left">
          <Label htmlFor="register-password" className="text-xs font-semibold text-foreground">
            {dict.auth.passwordLabel}
          </Label>
          <div className="relative">
            <Input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              leadingIcon={<Lock className="h-4 w-4" />}
              className="pr-11"
              data-testid="register-password-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer z-10"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {isBn
              ? 'কমপক্ষে ৮ অক্ষর (বড় হাতের, ছোট হাতের অক্ষর ও সংখ্যা)'
              : 'At least 8 characters with upper, lowercase and number'}
          </p>
        </div>

        {/* Submit Button */}
        <div className="pt-1">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full font-semibold"
            data-testid="register-submit-btn"
          >
            <span>{dict.nav.register}</span>
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* Switch to Login */}
        <p className="text-center text-xs text-muted-foreground pt-3">
          <span>{isBn ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? ' : 'Already have an account? '}</span>
          <Link
            href={withLocale('/login', locale)}
            className="font-semibold text-primary hover:underline ml-1"
          >
            {dict.nav.login}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
