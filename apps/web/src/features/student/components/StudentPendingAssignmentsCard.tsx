'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FileText, Clock, CheckCircle2, ArrowRight, Send, Award } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useSubmitAssignmentMutation, type AssignmentRecord } from '@/store/services/learning-api';
import { useAppDispatch } from '@/store';
import { enqueueToast } from '@/store/slices/ui-slice';
import { formatDate } from '@/lib/format';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';

interface StudentPendingAssignmentsCardProps {
  locale: Locale;
  assignments: AssignmentRecord[];
  isLoading?: boolean;
}

export function StudentPendingAssignmentsCard({
  locale,
  assignments,
  isLoading,
}: StudentPendingAssignmentsCardProps) {
  const isBn = locale === 'bn';
  const dispatch = useAppDispatch();
  const [submitAssignmentMutation, { isLoading: isSubmitting }] = useSubmitAssignmentMutation();

  const [activeAssignment, setActiveAssignment] = useState<AssignmentRecord | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAssignment || !submissionText.trim()) return;
    setErrorMessage(null);

    try {
      await submitAssignmentMutation({
        assignmentId: activeAssignment.id,
        submissionText: submissionText.trim(),
      }).unwrap();

      dispatch(
        enqueueToast({
          title: isBn ? 'অ্যাসাইনমেন্ট জমা সফল' : 'Assignment Submitted',
          message: isBn
            ? 'আপনার উত্তর সফলভাবে জমা দেওয়া হয়েছে।'
            : 'Your homework submission was sent to your tutor.',
          type: 'success',
        }),
      );
      setActiveAssignment(null);
      setSubmissionText('');
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'data' in err
          ? String((err as { data?: { message?: string } }).data?.message ?? '')
          : isBn
            ? 'অ্যাসাইনমেন্ট জমা দিতে সমস্যা হয়েছে।'
            : 'Failed to submit assignment.';
      setErrorMessage(msg);
    }
  };

  return (
    <>
      <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-warning-soft text-warning flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {isBn ? 'হোমওয়ার্ক ও টাস্ক' : 'Tasks & Homework'}
              </span>
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                {isBn ? 'অ্যাসাইনমেন্ট ও হোমওয়ার্ক' : 'Assignments & Homework'}
              </h3>
            </div>
          </div>

          <Link
            href={withLocale('/dashboard/student/learning', locale)}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <span>{isBn ? 'স্টাডি রুমে দেখুন' : 'Study Room'}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Body */}
        <div className="mt-4 flex-1">
          {isLoading ? (
            <div className="py-8 flex justify-center">
              <div className="animate-spin rounded-full h-7 w-7 border-2 border-primary border-t-transparent" />
            </div>
          ) : assignments.length === 0 ? (
            <div className="py-8 px-4 text-center">
              <div className="h-12 w-12 rounded-xl bg-muted/40 border border-border mx-auto flex items-center justify-center text-muted-foreground mb-3">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <p className="text-xs font-bold text-foreground">
                {isBn ? 'কোনো বকেয়া হোমওয়ার্ক নেই!' : 'All Caught Up!'}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-xs mx-auto">
                {isBn
                  ? 'আপনার সব অ্যাসাইনমেন্ট সম্পন্ন হয়েছে অথবা শিক্ষক এখনও নতুন কোনো টাস্ক দেননি।'
                  : 'You have no pending assignments right now. Great job keeping up!'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3" data-testid="student-assignments-list">
              {assignments.slice(0, 3).map((asgn) => {
                const isSubmitted = Boolean(asgn.submission);
                const isReviewed = asgn.submission?.status === 'reviewed';

                return (
                  <div
                    key={asgn.id}
                    className="p-3.5 rounded-xl bg-muted/20 border border-border hover:bg-muted/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-warning-soft text-warning flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                            {asgn.title}
                          </h4>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                              isReviewed
                                ? 'bg-success-soft text-success border-success/30'
                                : isSubmitted
                                  ? 'bg-info-soft text-info border-info/30'
                                  : 'bg-warning-soft text-warning border-warning/30'
                            }`}
                          >
                            {isReviewed
                              ? isBn
                                ? 'মূল্যায়ন সম্পন্ন'
                                : 'Graded'
                              : isSubmitted
                                ? isBn
                                  ? 'জমা দেওয়া হয়েছে'
                                  : 'Submitted'
                                : isBn
                                  ? 'বকেয়া'
                                  : 'Pending'}
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                          {asgn.dueAt && (
                            <span className="flex items-center gap-1 font-medium">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{formatDate(asgn.dueAt, locale)}</span>
                            </span>
                          )}
                          <span className="font-semibold text-primary">
                            {isBn ? 'পূর্ণমান' : 'Max Score'}:{' '}
                            {formatLocalizedNumber(asgn.maxScore, locale)}
                          </span>
                          {asgn.submission?.score !== null &&
                            asgn.submission?.score !== undefined && (
                              <span className="font-bold text-success flex items-center gap-0.5">
                                <Award className="h-3.5 w-3.5" />
                                <span>
                                  {formatLocalizedNumber(asgn.submission.score, locale)} /{' '}
                                  {formatLocalizedNumber(asgn.maxScore, locale)}
                                </span>
                              </span>
                            )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {!isSubmitted ? (
                        <Button
                          size="xs"
                          onClick={() => {
                            setActiveAssignment(asgn);
                            setSubmissionText('');
                            setErrorMessage(null);
                          }}
                          className="font-semibold"
                        >
                          <Send className="h-3.5 w-3.5 mr-1" />
                          <span>{isBn ? 'উত্তর জমা দিন' : 'Submit'}</span>
                        </Button>
                      ) : (
                        <Button asChild variant="outline" size="xs">
                          <Link href={withLocale('/dashboard/student/learning', locale)}>
                            <span>{isBn ? 'রিভিউ দেখুন' : 'View Feedback'}</span>
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Submission Modal */}
      <Dialog
        open={Boolean(activeAssignment)}
        onOpenChange={(open) => !open && setActiveAssignment(null)}
      >
        {activeAssignment && (
          <DialogContent className="bg-card border border-border w-full max-w-lg rounded-2xl p-6 text-foreground flex flex-col gap-4">
            <DialogHeader className="border-b border-border pb-3 text-left">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-warning-soft text-warning flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">
                    {activeAssignment.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    {isBn ? 'আপনার শিক্ষকের জন্য উত্তর লিখুন' : 'Submit your answer for review'}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {activeAssignment.instructions && (
              <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs text-foreground/80">
                <span className="font-semibold text-foreground block mb-0.5">
                  {isBn ? 'নির্দেশনা:' : 'Instructions:'}
                </span>
                <p className="leading-relaxed">{activeAssignment.instructions}</p>
              </div>
            )}

            {errorMessage && (
              <Alert variant="destructive" className="p-3 rounded-xl text-xs font-semibold">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="block text-xs font-semibold text-foreground">
                  {isBn ? 'আপনার উত্তর / নোটস' : 'Your Answer / Notes'}
                </Label>
                <Textarea
                  rows={5}
                  required
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  placeholder={
                    isBn
                      ? 'অ্যাসাইনমেন্টের সমাধান বা Google Drive / GitHub লিংক এখানে লিখুন...'
                      : 'Type your solution or paste reference links here...'
                  }
                  className="w-full text-xs rounded-xl border-border bg-card"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveAssignment(null)}
                  className="rounded-xl"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting || !submissionText.trim()}
                  className="rounded-xl shadow-xs font-semibold"
                >
                  {isSubmitting
                    ? isBn
                      ? 'জমা হচ্ছে...'
                      : 'Submitting...'
                    : isBn
                      ? 'জমা দিন'
                      : 'Submit Answer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
