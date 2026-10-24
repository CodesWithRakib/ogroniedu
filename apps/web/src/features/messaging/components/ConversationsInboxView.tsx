'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  MessageSquare,
  Search,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Circle,
  Inbox,
} from 'lucide-react';
import { Button, Input, Card, Badge, Avatar, AvatarImage, AvatarFallback } from '@/components/ui';
import { useAppSelector } from '@/store';
import { BookingChatContainer } from './bookingChatContainer';
import { AdminSafetyActionModal } from './AdminSafetyActionModal';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { useConversationInbox } from '../hooks/use-conversation-inbox';
import {
  useGetPreferencesQuery,
  useUpdatePreferencesMutation,
} from '@/store/services/notifications-api';
import type { Locale } from '@/lib/i18n';
import type { ConversationInboxItem } from '@ogroniedu/contracts';

interface ConversationsInboxViewProps {
  locale: Locale;
}

/**
 * Format a timestamp as a short relative time string (e.g. "2m", "3h", "Yesterday").
 */
function relativeTime(dateStr: string, locale: Locale): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return locale === 'bn' ? 'এখনই' : 'now';
  if (diffMin < 60) return `${diffMin}${locale === 'bn' ? 'মি' : 'm'}`;
  if (diffHr < 24) return `${diffHr}${locale === 'bn' ? 'ঘ' : 'h'}`;
  if (diffDay === 1) return locale === 'bn' ? 'গতকাল' : 'Yesterday';
  if (diffDay < 7) return `${diffDay}${locale === 'bn' ? 'দি' : 'd'}`;
  return new Date(dateStr).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Deduplicate conversations by partner user — when a user has multiple bookings
 * with the same partner (tutor/student), show only the most recent conversation
 * to prevent clutter. When a conversation is active, clear unread count.
 */
function deduplicateByPartner(
  items: ConversationInboxItem[],
  selectedBookingId?: string | null,
): ConversationInboxItem[] {
  const seen = new Map<string, ConversationInboxItem>();
  for (const item of items) {
    const partnerId = item.partnerUser.id;
    const existing = seen.get(partnerId);
    if (!existing) {
      seen.set(partnerId, item);
    } else {
      const existingTime = new Date(existing.updatedAt).getTime();
      const currentTime = new Date(item.updatedAt).getTime();
      const isItemActive =
        selectedBookingId &&
        (item.bookingId === selectedBookingId || existing.bookingId === selectedBookingId);
      const unreadCount = isItemActive ? 0 : item.unreadCount + existing.unreadCount;

      if (currentTime > existingTime) {
        seen.set(partnerId, {
          ...item,
          unreadCount,
        });
      } else {
        seen.set(partnerId, {
          ...existing,
          unreadCount,
        });
      }
    }
  }
  return Array.from(seen.values());
}

export function ConversationsInboxView({ locale }: ConversationsInboxViewProps) {
  const sessionUser = useAppSelector((s) => s.auth.user);
  const currentUserId = sessionUser?.id || '';
  const currentUserRole = sessionUser?.roles?.[0] || 'student';

  // No auto-selection on initial load: start with null
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);

  // ──────────────────────────────────────────────────────
  // Safety Notice Banner Dismissal Persistence (DB + LocalStorage)
  // ──────────────────────────────────────────────────────
  const { data: preferencesData } = useGetPreferencesQuery(undefined, {
    skip: !currentUserId,
  });
  const [updatePreferences] = useUpdatePreferencesMutation();

  const [isSafetyDismissed, setIsSafetyDismissed] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && currentUserId) {
      return localStorage.getItem(`chat_safety_banner_dismissed_${currentUserId}`) === 'true';
    }
    return false;
  });

  // Sync DB preference if user previously dismissed on another browser/device
  React.useEffect(() => {
    if (preferencesData && Array.isArray(preferencesData)) {
      const hasDismissedInDb = preferencesData.some(
        (p) => p.category === 'safety_notice' && p.channel === 'in_app' && p.isEnabled === false,
      );
      if (hasDismissedInDb) {
        setIsSafetyDismissed(true);
        if (typeof window !== 'undefined' && currentUserId) {
          localStorage.setItem(`chat_safety_banner_dismissed_${currentUserId}`, 'true');
        }
      }
    }
  }, [preferencesData, currentUserId]);

  const handleDismissSafetyNotice = useCallback(async () => {
    setIsSafetyDismissed(true);
    if (typeof window !== 'undefined' && currentUserId) {
      localStorage.setItem(`chat_safety_banner_dismissed_${currentUserId}`, 'true');
    }
    try {
      await updatePreferences({
        preferences: [{ category: 'safety_notice', channel: 'in_app', isEnabled: false }],
      }).unwrap();
    } catch {
      // Local dismissal remains active
    }
  }, [currentUserId, updatePreferences]);

  // ──────────────────────────────────────────────────────
  // WebSocket-driven inbox (single API fetch + socket updates)
  // ──────────────────────────────────────────────────────
  const inbox = useConversationInbox(currentUserId, selectedBookingId);
  const {
    conversations: rawConversations,
    isLoading,
    isError,
    refetch,
    totalUnread,
    markConversationAsRead,
    isConnected,
  } = inbox;

  const isAdminView = sessionUser?.roles?.some((r) =>
    ['admin', 'super_admin', 'staff'].includes(r),
  );
  const [filterTab, setFilterTab] = useState<'all' | 'flagged' | 'active'>('all');

  // Deduplicate by partner for regular users; keep all bookings distinct for admins
  const conversations = useMemo(() => {
    return isAdminView
      ? rawConversations
      : deduplicateByPartner(rawConversations, selectedBookingId);
  }, [rawConversations, isAdminView, selectedBookingId]);

  // Filter conversations by search term & active filter tab
  const filteredConversations = useMemo(() => {
    let result = conversations;
    if (filterTab === 'flagged') {
      result = result.filter((c) => c.lastMessage?.isRedacted);
    } else if (filterTab === 'active') {
      result = result.filter((c) =>
        ['confirmed', 'in_progress', 'scheduled', 'completed'].includes(c.status),
      );
    }
    if (!searchQuery.trim()) return result;
    const q = searchQuery.toLowerCase();
    return result.filter(
      (c) =>
        c.subjectName.toLowerCase().includes(q) ||
        c.partnerUser.displayName.toLowerCase().includes(q) ||
        (c.lastMessage?.content && c.lastMessage.content.toLowerCase().includes(q)),
    );
  }, [conversations, searchQuery, filterTab]);

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.bookingId === selectedBookingId);
  }, [conversations, selectedBookingId]);

  const handleSelectConversation = useCallback(
    (bookingId: string) => {
      setSelectedBookingId(bookingId);
      markConversationAsRead(bookingId);
    },
    [markConversationAsRead],
  );

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto py-8 px-4">
        <LoadingState testId="conversations-loading" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full max-w-6xl mx-auto py-8 px-4">
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
    <div
      className="w-full h-[calc(100dvh-5.5rem)] sm:h-[calc(100dvh-6rem)] flex flex-col p-2 sm:p-4 gap-2.5 overflow-hidden"
      data-testid="messages-inbox"
    >
      {/* Sleek, Compact Topbar */}
      <div className="flex items-center justify-between gap-2 shrink-0 px-1">
        <div className="flex items-center gap-2">
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            {locale === 'bn' ? 'বার্তালাপ' : 'Messages'}
            {totalUnread > 0 && (
              <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-full px-2 py-0.5 text-[10px] shadow-xs">
                {totalUnread}
              </Badge>
            )}
          </h1>
          {isAdminView && (
            <Badge className="bg-purple-600 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full hidden sm:flex items-center gap-1 shadow-xs">
              <ShieldCheck className="w-3 h-3" />
              {locale === 'bn' ? 'স্টাফ নজরদারি' : 'Staff Oversight'}
            </Badge>
          )}
        </div>

        {/* Live Status & Admin Filter Tabs */}
        <div className="flex items-center gap-2">
          {isAdminView && (
            <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer text-xs ${
                  filterTab === 'all'
                    ? 'bg-primary text-white shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {locale === 'bn' ? 'সব' : 'All'} ({conversations.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('flagged')}
                className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer text-xs ${
                  filterTab === 'flagged'
                    ? 'bg-red-600 text-white shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {locale === 'bn' ? 'ফিল্টারকৃত' : 'Flagged'}
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('active')}
                className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer text-xs ${
                  filterTab === 'active'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {locale === 'bn' ? 'চলমান' : 'Active'}
              </button>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-lg border border-border/50">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-[11px] font-medium hidden sm:inline">
              {isConnected
                ? locale === 'bn'
                  ? 'রিয়েলটাইম'
                  : 'Live'
                : locale === 'bn'
                  ? 'অফলাইন'
                  : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {conversations.length === 0 ? (
        /* Empty Inbox State */
        <Card className="flex-1 flex flex-col items-center justify-center p-8 text-center border-border bg-muted/10">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 flex items-center justify-center mb-4">
            <Inbox className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-lg font-bold text-foreground">
            {locale === 'bn' ? 'কোনো বার্তালাপ নেই' : 'No Conversations Yet'}
          </h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
            {locale === 'bn'
              ? 'টিউশন বুকিং নিশ্চিত হলে আপনার শিক্ষক বা শিক্ষার্থীর সাথে স্বয়ংক্রিয়ভাবে বার্তালাপ শুরু হবে।'
              : 'Conversations are automatically created when you confirm a tuition booking with a verified tutor or student.'}
          </p>
        </Card>
      ) : (
        /* Full-Height Split Pane Container */
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-0 border border-border rounded-2xl overflow-hidden bg-card shadow-xs">
          {/* ── Left Column: Conversation List ── */}
          <div
            className={`md:col-span-4 lg:col-span-4 border-r border-border h-full flex flex-col min-h-0 bg-card ${
              selectedBookingId ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Search Input */}
            <div className="p-2.5 border-b border-border shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={
                    locale === 'bn' ? 'নাম বা বিষয় খুঁজুন…' : 'Search by name or subject…'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-xl h-8 text-xs bg-muted/30 border-border"
                  data-testid="conversation-search"
                />
              </div>
            </div>

            {/* Conversation List Scroll Area */}
            <div className="flex-1 overflow-y-auto min-h-0" data-testid="conversation-list">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  <Search className="w-5 h-5 mx-auto mb-2 opacity-40" />
                  {locale === 'bn' ? 'কোনো ফলাফল পাওয়া যায়নি' : 'No results found'}
                </div>
              ) : (
                filteredConversations.map((c) => {
                  const isSelected = c.bookingId === selectedBookingId;
                  // If selected, never show an unread count badge on the active card
                  const hasUnread = !isSelected && (c.unreadCount || 0) > 0;

                  return (
                    <button
                      key={c.bookingId}
                      type="button"
                      onClick={() => handleSelectConversation(c.bookingId)}
                      data-testid={`conversation-item-${c.bookingId}`}
                      className={`w-full text-left px-3 py-2.5 border-b border-border/40 transition-all duration-150 cursor-pointer flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-primary/10 border-l-3 border-l-primary'
                          : 'hover:bg-muted/40 border-l-3 border-l-transparent'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0 mt-0.5">
                        <Avatar className="w-9 h-9 ring-1 ring-border shadow-xs">
                          {c.partnerUser.avatarUrl && (
                            <AvatarImage
                              src={c.partnerUser.avatarUrl}
                              alt={c.partnerUser.displayName}
                            />
                          )}
                          <AvatarFallback
                            className={`font-bold text-xs ${
                              isSelected
                                ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/20'
                                : 'bg-primary/10 text-primary'
                            }`}
                          >
                            {c.partnerUser.displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <Circle className="w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5 text-success fill-success stroke-card stroke-2" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span
                            className={`text-xs truncate ${
                              hasUnread
                                ? 'font-bold text-foreground'
                                : 'font-medium text-foreground'
                            }`}
                          >
                            {c.partnerUser.displayName}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {c.lastMessage?.createdAt
                              ? relativeTime(c.lastMessage.createdAt, locale)
                              : ''}
                          </span>
                        </div>

                        <p className="text-[11px] font-medium text-primary/70 truncate mb-0.5">
                          {c.subjectName}
                          {c.educationLevelName && ` · ${c.educationLevelName}`}
                        </p>

                        <div className="flex items-center justify-between gap-1">
                          <p
                            className={`text-[11px] truncate max-w-[190px] ${
                              hasUnread
                                ? 'text-foreground font-semibold'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {c.lastMessage ? (
                              <>
                                {c.lastMessage.isMine && (
                                  <span className="mr-1 opacity-60">
                                    {locale === 'bn' ? 'আপনি:' : 'You:'}
                                  </span>
                                )}
                                {c.lastMessage.isRedacted
                                  ? locale === 'bn'
                                    ? '[সম্পাদিত বার্তা]'
                                    : '[Redacted]'
                                  : c.lastMessage.content}
                              </>
                            ) : (
                              <span className="italic opacity-50">
                                {locale === 'bn'
                                  ? 'বার্তালাপ শুরু করুন'
                                  : 'Start a conversation'}
                              </span>
                            )}
                          </p>

                          {hasUnread && (
                            <span className="shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold min-w-[18px] h-4 flex items-center justify-center rounded-full px-1 shadow-sm shadow-blue-500/20">
                              {c.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Right Column: Active Chat Thread ── */}
          <div
            className={`md:col-span-8 lg:col-span-8 h-full flex flex-col min-h-0 bg-background/50 ${
              selectedBookingId ? 'flex' : 'hidden md:flex'
            }`}
          >
            {activeConversation ? (
              <div className="flex flex-col h-full min-h-0">
                {/* Single Sleek Chat Header (Duplicate eliminated) */}
                <div className="flex items-center gap-3 px-3 py-2 border-b border-border bg-card shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedBookingId(null)}
                    className="md:hidden rounded-lg p-1 text-muted-foreground hover:text-foreground h-8 w-8"
                    aria-label={locale === 'bn' ? 'পেছনে যান' : 'Go back'}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div className="relative shrink-0">
                    <Avatar className="w-8 h-8 ring-1 ring-border shadow-xs">
                      {activeConversation.partnerUser.avatarUrl && (
                        <AvatarImage
                          src={activeConversation.partnerUser.avatarUrl}
                          alt={activeConversation.partnerUser.displayName}
                        />
                      )}
                      <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-sm shadow-blue-500/20">
                        {activeConversation.partnerUser.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <Circle className="w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5 text-success fill-success stroke-card stroke-2" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                        {activeConversation.partnerUser.displayName}
                      </p>
                      <Badge
                        variant="outline"
                        className="text-[10px] py-0 px-1.5 border-primary/30 text-primary shrink-0 hidden sm:inline-flex"
                      >
                        {activeConversation.partnerUser.role === 'tutor'
                          ? locale === 'bn'
                            ? 'শিক্ষক'
                            : 'Tutor'
                          : activeConversation.partnerUser.role === 'guardian'
                            ? locale === 'bn'
                              ? 'অভিভাবক'
                              : 'Guardian'
                            : locale === 'bn'
                              ? 'শিক্ষার্থী'
                              : 'Student'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {activeConversation.subjectName}
                      {activeConversation.educationLevelName &&
                        ` · ${activeConversation.educationLevelName}`}
                      <span className="opacity-60 ml-1.5">
                        • #{activeConversation.bookingId.slice(0, 8)}
                      </span>
                    </p>
                  </div>
                  {isAdminView && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsSafetyModalOpen(true)}
                      className="border-red-500/40 text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:hover:bg-red-950/30 text-xs font-semibold h-7 px-2.5 rounded-lg flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                      <span>{locale === 'bn' ? 'সেফগার্ড অ্যাকশন' : 'Safety Action'}</span>
                    </Button>
                  )}
                  <Badge
                    variant="outline"
                    className="text-[10px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shrink-0 hidden lg:flex items-center gap-1 px-2 py-0.5"
                  >
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    <span>ABAC Audited</span>
                  </Badge>
                </div>

                {/* Chat Container taking 100% of the remaining height */}
                <div className="flex-1 min-h-0 overflow-hidden">
                  <BookingChatContainer
                    locale={locale}
                    bookingId={activeConversation.bookingId}
                    subjectName={activeConversation.subjectName}
                    currentUserId={currentUserId}
                    ownRole={
                      isAdminView
                        ? 'admin'
                        : currentUserRole === 'tutor'
                          ? 'tutor'
                          : currentUserRole === 'guardian'
                            ? 'guardian'
                            : 'student'
                    }
                    peerRole={activeConversation.partnerUser.role}
                    peerName={activeConversation.partnerUser.displayName}
                    ownName={
                      isAdminView
                        ? locale === 'bn'
                          ? 'অগ্রণী প্ল্যাটফর্ম মডারেটর'
                          : 'Ogroni Platform Moderator'
                        : undefined
                    }
                    showHeader={false}
                    showSafetyNotice={!isSafetyDismissed}
                    onDismissSafetyNotice={handleDismissSafetyNotice}
                    testId="inbox-active-chat"
                  />
                </div>

                {isAdminView && activeConversation && (
                  <AdminSafetyActionModal
                    isOpen={isSafetyModalOpen}
                    onClose={() => setIsSafetyModalOpen(false)}
                    targetUserId={activeConversation.partnerUser.id}
                    targetUserName={activeConversation.partnerUser.displayName}
                    targetUserRole={activeConversation.partnerUser.role}
                    studentUser={activeConversation.studentUser}
                    tutorUser={activeConversation.tutorUser}
                    locale={locale}
                  />
                )}
              </div>
            ) : (
              /* No Conversation Selected Placeholder */
              <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-muted/5">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 flex items-center justify-center mb-4 ring-1 ring-border shadow-xs">
                  <MessageSquare className="w-8 h-8 text-primary/40" />
                </div>
                <h3 className="text-base font-bold text-foreground">
                  {locale === 'bn'
                    ? 'একটি বার্তালাপ নির্বাচন করুন'
                    : 'Select a Conversation'}
                </h3>
                <p className="text-xs text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
                  {locale === 'bn'
                    ? 'বাম পাশের তালিকা থেকে যেকোনো বার্তালাপ নির্বাচন করে চ্যাট শুরু করুন।'
                    : 'Choose a conversation from the sidebar to view message history and chat in real-time.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
