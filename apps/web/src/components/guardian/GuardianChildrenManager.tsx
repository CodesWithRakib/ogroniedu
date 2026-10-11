'use client';

import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Lock,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Input,
} from '@/components/ui';
import { getDictionary, type Locale } from '@/lib/i18n';

export type GuardianRelationship = 'father' | 'mother' | 'legal_guardian';

/** Narrow the raw select value into the relationship union without asserting `any`. */
function toGuardianRelationship(value: string): GuardianRelationship {
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

interface GuardianChildrenManagerProps {
  locale: Locale;
  initialChildren?: ChildItem[];
  onAddChild?: (data: {
    studentIdentifier: string;
    relationshipType: string;
    consentPolicyVersion: string;
    consentAgreed: boolean;
  }) => Promise<void>;
  onRevokeLink?: (studentId: string) => Promise<void>;
}

export function GuardianChildrenManager({
  locale,
  initialChildren = [],
  onAddChild,
  onRevokeLink,
}: GuardianChildrenManagerProps) {
  const dict = getDictionary(locale);
  const [children, setChildren] = useState<ChildItem[]>(initialChildren);

  React.useEffect(() => {
    setChildren(initialChildren);
  }, [initialChildren]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [relationship, setRelationship] = useState<GuardianRelationship>('father');
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLinkChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMessage(
        locale === 'bn' ? 'শিক্ষার্থীর তথ্য আবশ্যক' : 'Student identifier is required',
      );
      return;
    }
    if (!consentAgreed) {
      setErrorMessage(
        locale === 'bn'
          ? 'নীতিমালার অধীনে অভিভাবকের সম্মতি আবশ্যক'
          : 'Guardian consent agreement is mandatory',
      );
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      if (onAddChild) {
        await onAddChild({
          studentIdentifier: identifier,
          relationshipType: relationship,
          consentPolicyVersion: 'v1.0-bd-minor-consent',
          consentAgreed,
        });
      } else {
        throw new Error(
          locale === 'bn' ? 'সন্তান যুক্ত করতে লগইন করুন।' : 'Sign in to link a child.',
        );
      }

      setIdentifier('');
      setConsentAgreed(false);
      setIsModalOpen(false);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to submit link request');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (studentId: string) => {
    if (confirm(dict.guardian.unlinkConfirm)) {
      if (onRevokeLink) {
        await onRevokeLink(studentId);
      }
      setChildren((prev) => prev.filter((c) => c.studentId !== studentId));
    }
  };

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
        <Card className="text-center py-12">
          <CardContent className="space-y-3">
            <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-base text-muted-foreground">{dict.guardian.noChildren}</p>
            <Button variant="outline" onClick={() => setIsModalOpen(true)}>
              {dict.guardian.addChild}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {children.map((child) => (
            <Card key={child.linkId} className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      {child.displayName}
                      {child.isMinor && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-amber-500/10 text-amber-600 border-amber-200"
                        >
                          {locale === 'bn' ? 'অপ্রাপ্তবয়স্ক (Minor)' : 'Minor (<18)'}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 text-xs">
                      <span>{child.institutionName || 'General Student'}</span>
                      <span>•</span>
                      <span>{child.educationLevelName || 'Class Level'}</span>
                    </CardDescription>
                  </div>
                  <Badge variant={child.status === 'active' ? 'success' : 'warning'}>
                    {child.status === 'active'
                      ? dict.guardian.activeBadge
                      : dict.guardian.pendingBadge}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    {locale === 'bn' ? 'সম্পর্ক:' : 'Relation:'}{' '}
                    <strong className="text-foreground capitalize">{child.relationshipType}</strong>
                  </span>
                  <span className="flex items-center gap-1 text-[11px]">
                    <Lock className="h-3 w-3 text-muted-foreground" />
                    {child.consentPolicyVersion || 'v1.0-bd-minor-consent'}
                  </span>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 text-xs gap-1.5 h-8"
                    onClick={() => handleRevoke(child.studentId)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {dict.guardian.unlink}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal for linking child */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <Card className="w-full max-w-lg shadow-2xl border-border bg-card">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                {dict.guardian.addChild}
              </CardTitle>
              <CardDescription>{dict.guardian.childrenSubtitle}</CardDescription>
            </CardHeader>
            <form onSubmit={handleLinkChild}>
              <CardContent className="space-y-4">
                {errorMessage && (
                  <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-md flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="input-student-identifier">
                    {dict.guardian.studentIdentifier}
                  </label>
                  <Input
                    id="input-student-identifier"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. +8801722222222 or student@example.com"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="select-relationship">
                    {dict.guardian.relationship}
                  </label>
                  <select
                    id="select-relationship"
                    value={relationship}
                    onChange={(e) => setRelationship(toGuardianRelationship(e.target.value))}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="father">{dict.guardian.father}</option>
                    <option value="mother">{dict.guardian.mother}</option>
                    <option value="legal_guardian">{dict.guardian.legalGuardian}</option>
                  </select>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg border border-border space-y-2">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="checkbox-consent"
                      checked={consentAgreed}
                      onChange={(e) => setConsentAgreed(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                      required
                    />
                    <label
                      htmlFor="checkbox-consent"
                      className="text-xs text-muted-foreground leading-relaxed cursor-pointer select-none"
                    >
                      <strong className="text-foreground block mb-0.5">
                        {dict.guardian.consentTitle} (v1.0-bd-minor-consent)
                      </strong>
                      {dict.guardian.consentAgreement}
                    </label>
                  </div>
                </div>
              </CardContent>
              <div className="p-6 pt-0 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    setErrorMessage(null);
                  }}
                  disabled={loading}
                >
                  {dict.common.cancel}
                </Button>
                <Button type="submit" disabled={loading} className="gap-2">
                  {loading && (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {dict.common.confirm}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
