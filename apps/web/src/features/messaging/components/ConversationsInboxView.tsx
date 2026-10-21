'use client';

import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Search,
  CheckCheck,
  ShieldCheck,
  GraduationCap,
  User,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { Button, Input, Card, Badge } from '@/components/ui';
import { useGetConversationsInboxQuery, useMarkAllBookingMessagesAsReadMutation } from '@/store/services/booking-messages-api';
import { useAppSelector } from '@/store';
import { BookingChatContainer } from './bookingChatContainer';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import type { Locale } from '@/lib/i18n';
import type { ConversationInboxItem } from '@ogroniedu/contracts';

interface ConversationsInboxViewProps {
  locale: Locale;
}

export function ConversationsInboxView({ locale }: ConversationsInboxViewProps) {
  const sessionUser = useAppSelector((s) => s.auth.user);
  const currentUserId = sessionUser?.id || '';
  const currentUserRole = sessionUser?.roles?.[0] || 'student';

  const { data, isLoading, isError, refetch } = useGetConversationsInboxQuery();
  const [markAllRead] = useMarkAllBookingMessagesAsReadMutation();

  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const conversations: ConversationInboxItem[] = useMemo(() => {
    return data?.data || [];
  }, [data]);

  // Filter conversations by search term
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        c.subjectName.toLowerCase().includes(q) ||
        c.partnerUser.displayName.toLowerCase().includes(q) ||
        (c.lastMessage?.content && c.lastMessage.content.toLowerCase().includes(q)),
    );
  }, [conversations, searchQuery]);

  // Set default selected booking on initial load
  React.useEffect(() => {
    if (!selectedBookingId && conversations.length > 0) {
      setSelectedBookingId(conversations[0].bookingId);
    }
  }, [conversations, selectedBookingId]);

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.bookingId === selectedBookingId);
  }, [conversations, selectedBookingId]);

  const totalUnread = useMemo(() => {
    return conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }, [conversations]);

  const handleSelectConversation = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    // Mark as read when opened
    markAllRead(bookingId).catch(() => {});
  };

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <LoadingState testId="conversations-loading" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <ErrorState
          message={
            locale === 'bn'
              ? 'বার্তালাপ তালিকা লোড করতে ব্যর্থ হয়েছে।'
              : 'Failed to load conversation inbox.'
          }
          onRetry={refetch}
          testId="conversations-error"
        />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <MessageSquare className="w-7 h-7 text-primary" />
              {locale === 'bn' ? 'বার্তালাপ ও যোগাযোগ' : 'Conversations & Messaging'}
            </h1>
            {totalUnread > 0 && (
              <Badge className="bg-primary text-white font-bold rounded-full px-2.5 py-0.5 text-xs">
                {totalUnread} {locale === 'bn' ? 'অপঠিত' : 'Unread'}
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {locale === 'bn'
              ? 'নিরাপত্তা ও এসক্রো সুরক্ষার জন্য সকল পাঠদান বার্তালাপ অডিটযোগ্য এবং এনক্রিপ্ট করা।'
              : 'End-to-end participant-scoped communication, monitored for child safety and escrow protection.'}
          </p>
        </div>

        <Badge
          variant="outline"
          className="w-fit text-xs border-success/40 text-success-soft-foreground py-1 px-3"
        >
          <ShieldCheck className="w-3.5 h-3.5 mr-1 text-success" />
          {locale === 'bn' ? 'নিরাপদ মেসেজিং চ্যানেল' : 'Audited Secure Channel'}
        </Badge>
      </div>

      {conversations.length === 0 ? (
        <Card className="p-12 text-center border-border bg-muted/20">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="text-lg font-bold text-foreground">
            {locale === 'bn' ? 'কোনো বার্তালাপ পাওয়া যায়নি' : 'No Conversations Yet'}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            {locale === 'bn'
              ? 'শিক্ষক বা শিক্ষার্থীর সাথে টিউশন বুকিং নিশ্চিত হলে স্বয়ংক্রিয়ভাবে বার্তালাপ সক্রিয় হবে।'
              : 'Conversations are automatically initialized when you confirm a tuition booking with a verified tutor or student.'}
          </p>
        </Card>
      ) : (
        /* Split Pane Container */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left Column: Conversations List (Visible on mobile if no active selection or on desktop) */}
          <div
            className={`md:col-span-4 space-y-3 ${
              selectedBookingId ? 'hidden md:block' : 'block'
            }`}
          >
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                type="text"
                placeholder={
                  locale === 'bn'
                    ? 'শিক্ষক, বিষয় বা বার্তা খুঁজুন…'
                    : 'Search tutor, subject, or message…'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-xl h-10 text-sm bg-muted/30 border-border"
              />
            </div>

            {/* Conversation Cards */}
            <div className="space-y-2 overflow-y-auto max-h-[600px] pr-1">
              {filteredConversations.map((c) => {
                const isSelected = c.bookingId === selectedBookingId;
                const partnerRoleLabel =
                  c.partnerUser.role === 'tutor'
                    ? locale === 'bn'
                      ? 'শিক্ষক'
                      : 'Tutor'
                    : locale === 'bn'
                      ? 'শিক্ষার্থী'
                      : 'Student';

                return (
                  <button
                    key={c.bookingId}
                    type="button"
                    onClick={() => handleSelectConversation(c.bookingId)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'bg-primary/10 border-primary/40 shadow-xs'
                        : 'bg-surface hover:bg-muted/40 border-border'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-bold text-sm">
                        {c.partnerUser.displayName.charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute -bottom-1 -right-1 text-[10px] bg-surface rounded-full p-0.5 border border-border">
                        {c.partnerUser.role === 'tutor' ? '👨‍🏫' : '🎓'}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-bold text-sm text-foreground truncate">
                          {c.partnerUser.displayName}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {c.lastMessage?.createdAt
                            ? new Date(c.lastMessage.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      </div>

                      <p className="text-xs font-medium text-primary/80 truncate mb-1">
                        {c.subjectName}
                      </p>

                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {c.lastMessage ? (
                            <>
                              {c.lastMessage.isMine && (
                                <span className="mr-1 text-[11px] opacity-75">
                                  {locale === 'bn' ? 'আপনি:' : 'You:'}
                                </span>
                              )}
                              {c.lastMessage.content}
                            </>
                          ) : (
                            <span className="italic opacity-60">
                              {locale === 'bn' ? 'বার্তালাপ শুরু করুন' : 'Start conversation'}
                            </span>
                          )}
                        </p>

                        {c.unreadCount > 0 && (
                          <span className="shrink-0 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Chat Thread */}
          <div
            className={`md:col-span-8 ${
              selectedBookingId ? 'block' : 'hidden md:block'
            }`}
          >
            {activeConversation ? (
              <div className="space-y-4">
                {/* Mobile Back Button */}
                <div className="md:hidden flex items-center gap-2 pb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedBookingId(null)}
                    className="rounded-xl flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>{locale === 'bn' ? 'সকল বার্তালাপ' : 'All Conversations'}</span>
                  </Button>
                </div>

                {/* Embedded Live Chat Container */}
                <BookingChatContainer
                  locale={locale}
                  bookingId={activeConversation.bookingId}
                  subjectName={activeConversation.subjectName}
                  currentUserId={currentUserId}
                  ownRole={currentUserRole === 'tutor' ? 'tutor' : 'student'}
                  peerRole={activeConversation.partnerUser.role}
                  testId="inbox-active-chat"
                />
              </div>
            ) : (
              <Card className="h-[480px] flex flex-col items-center justify-center p-8 text-center border-border bg-muted/10">
                <MessageSquare className="w-12 h-12 text-muted-foreground/40 mb-3" />
                <h3 className="text-base font-bold text-foreground">
                  {locale === 'bn' ? 'একটি বার্তালাপ নির্বাচন করুন' : 'Select a Conversation'}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  {locale === 'bn'
                    ? 'বাম পাশের তালিকা থেকে যেকোনো টিউশন বার্তালাপ নির্বাচন করে চ্যাট শুরু করুন।'
                    : 'Choose a conversation from the left sidebar to view message history and chat in real-time.'}
                </p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
