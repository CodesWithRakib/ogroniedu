'use client';

import React from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  ShieldCheck,
  GraduationCap,
  AlertCircle,
  Trash2,
  Lock,
  ArrowRight,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  StatusBadge,
  Input,
} from '@/components/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { getDictionary, type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
import { useGuardianChildren } from './use-guardian-children';

export type GuardianRelationship = 'father' | 'mother' | 'legal_guardian';

/** Narrow the raw select value into the relationship union without asserting `any`. */
export function toGuardianRelationship(value: string): GuardianRelationship {
  return value === 'mother' || value === 'legal_guardian' ? value : 'father';
}

export interface ChildItem {
  linkId: string;
  studentId: string;
  displayName: string;
  relationshipType: 'father' | 'mother' | 'legal_guardian' | string;
  status: 'pending' | 'active' | 'rejected' | 'revoked';
  consentPolicyVersion: string | null;
  consentRecordedAt: string | null;
  isMinor: boolean;
  institutionName?: string | null;
  educationLevelName?: string | null;
}

export interface GuardianChildrenCallbacks {
  onAddChild?: (data: {
    studentIdentifier: string;
    relationshipType: string;
    consentPolicyVersion: string;
    consentAgreed: boolean;
  }) => Promise<void>;
  onRevokeLink?: (studentId: string) => Promise<void>;
}

interface GuardianChildrenManagerProps extends GuardianChildrenCallbacks {
  locale: Locale;
  initialChildren?: ChildItem[];
}

const EMPTY_CHILDREN: ChildItem[] = [];

export function GuardianChildrenManager({
  locale,
  initialChildren = EMPTY_CHILDREN,
  onAddChild,
  onRevokeLink,
}: GuardianChildrenManagerProps) {
  const dict = getDictionary(locale);

  const {
    children,
    isModalOpen,
    setIsModalOpen,
    identifier,
    setIdentifier,
    relationship,
    setRelationship,
    consentAgreed,
    setConsentAgreed,
    loading,
    errorMessage,
    handleLinkChild,
    handleRevoke,
    closeModal,
  } = useGuardianChildren(locale, initialChildren, {
    onAddChild,
    onRevokeLink,
  });

  return (
    <div className="space-y-6" data-testid="guardian-children-manager">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            {dict.guardian.childrenTitle}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{dict.guardian.childrenSubtitle}</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2 shrink-0" id="btn-add-child">
          <UserPlus className="h-4 w-4" />
          {dict.guardian.addChild}
        </Button>
      </div>

      {children.length === 0 ? (
        <Card className="text-center py-16 rounded-3xl border-dashed border-2 border-border/80 bg-card/60">
          <CardContent className="space-y-4 max-w-md mx-auto">
            <div className="h-16 w-16 rounded-3xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto shadow-inner">
              <GraduationCap className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">
                {locale === 'bn' ? 'এখনো কোনো সন্তান যুক্ত করা হয়নি' : 'No children profiles linked yet'}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {locale === 'bn'
                  ? 'আপনার শিক্ষার্থীর ফোন নম্বর বা ইমেইল দিয়ে সন্তান প্রোফাইল যুক্ত করুন এবং তাদের পড়াশোনা ও নিরাপত্তা পর্যবেক্ষণ করুন।'
                  : 'Link your student using their registered phone or email to track academic progress, session attendance, and escrow security.'}
              </p>
            </div>
            <Button onClick={() => setIsModalOpen(true)} className="rounded-full px-6 gap-2 shadow-xs">
              <UserPlus className="h-4 w-4" />
              {dict.guardian.addChild}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {children.map((child) => {
            const initials = child.displayName
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();
            return (
              <Card
                key={child.linkId}
                className="rounded-3xl border-border bg-card hover:border-primary/40 hover:shadow-md transition-all p-5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 text-primary font-black text-sm flex items-center justify-center shrink-0 shadow-inner">
                        {initials || 'ST'}
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-base font-bold text-foreground">
                            {child.displayName}
                          </CardTitle>
                          {child.isMinor && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-2 py-0.5 rounded-full bg-warning/10 text-warning border-warning/30 font-medium"
                            >
                              {locale === 'bn' ? 'অপ্রাপ্তবয়স্ক (Minor)' : 'Minor (<18)'}
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="flex items-center gap-2 text-xs">
                          <span>
                            {child.institutionName ||
                              (locale === 'bn' ? 'সাধারণ শিক্ষা প্রতিষ্ঠান' : 'Institution')}
                          </span>
                          <span>•</span>
                          <span>
                            {child.educationLevelName ||
                              (locale === 'bn' ? 'শ্রেণি স্তর' : 'Grade Level')}
                          </span>
                        </CardDescription>
                      </div>
                    </div>
                    <StatusBadge status={child.status}>
                      {child.status === 'active'
                        ? dict.guardian.activeBadge
                        : dict.guardian.pendingBadge}
                    </StatusBadge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/80 pt-3">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-success-soft-foreground" />
                      {locale === 'bn' ? 'সম্পর্ক:' : 'Relation:'}{' '}
                      <strong className="text-foreground capitalize">{child.relationshipType}</strong>
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground bg-surface-muted px-2 py-0.5 rounded-lg border border-border/60">
                      <Lock className="h-3 w-3" />
                      {child.consentPolicyVersion || 'v1.0-bd-minor-consent'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/60">
                  <Link
                    href={withLocale(`/dashboard/guardian/children/${child.studentId}`, locale)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors"
                    data-testid={`link-child-detail-${child.studentId}`}
                  >
                    <span>
                      {locale === 'bn' ? 'একাডেমিক প্রোফাইল ও তদারকি' : 'Academic Oversight'}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 text-xs gap-1.5 h-8 rounded-full px-3"
                    onClick={() => handleRevoke(child.studentId)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {dict.guardian.unlink}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal for linking child using shadcn Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-full max-w-lg rounded-2xl p-6 shadow-2xl border-border bg-card">
          <DialogHeader className="text-left pb-2">
            <DialogTitle className="text-xl flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              <span>{dict.guardian.addChild}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {dict.guardian.childrenSubtitle}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLinkChild} className="space-y-4 pt-1">
            {errorMessage && (
              <Alert variant="destructive" className="bg-destructive-soft border-destructive/30">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs font-medium text-destructive">
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="input-student-identifier" required className="text-xs font-semibold text-foreground">
                {dict.guardian.studentIdentifier}
              </Label>
              <Input
                id="input-student-identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. +8801722222222 or student@example.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="select-relationship" required className="text-xs font-semibold text-foreground">
                {dict.guardian.relationship}
              </Label>
              <Select
                value={relationship}
                onValueChange={(val) => setRelationship(toGuardianRelationship(val))}
              >
                <SelectTrigger id="select-relationship" className="w-full rounded-2xl bg-card border-border text-sm">
                  <SelectValue placeholder={dict.guardian.relationship} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="father">{dict.guardian.father}</SelectItem>
                  <SelectItem value="mother">{dict.guardian.mother}</SelectItem>
                  <SelectItem value="legal_guardian">{dict.guardian.legalGuardian}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-muted/50 rounded-2xl border border-border space-y-2">
              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="checkbox-consent"
                  checked={consentAgreed}
                  onCheckedChange={(checked) => setConsentAgreed(Boolean(checked))}
                  className="mt-0.5 cursor-pointer"
                />
                <Label
                  htmlFor="checkbox-consent"
                  className="text-xs text-muted-foreground leading-relaxed cursor-pointer select-none font-normal"
                >
                  <strong className="text-foreground block mb-0.5">
                    {dict.guardian.consentTitle} (v1.0-bd-minor-consent)
                  </strong>
                  {dict.guardian.consentAgreement}
                </Label>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={closeModal} disabled={loading} className="rounded-full px-5">
                {dict.common.cancel}
              </Button>
              <Button type="submit" disabled={loading} isLoading={loading} className="rounded-full px-6 shadow-xs font-semibold">
                {dict.common.confirm}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
