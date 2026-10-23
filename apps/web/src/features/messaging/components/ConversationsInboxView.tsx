'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  MessageSquare,
  Search,
  ShieldCheck,
  ArrowLeft,
  Circle,
  Inbox,
  Mail,
  WifiOff,
  Wifi,
} from 'lucide-react';
import { Button, Input, Card, Badge, Avatar, AvatarImage, AvatarFallback } from '@/components/ui';
import { useAppSelector } from '@/store';
import { BookingChatContainer } from './bookingChatContainer';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { useConversationInbox } from '../hooks/use-conversation-inbox';
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
 * to prevent clutter. Unread counts are accumulated.
 */
function deduplicateByPartner(items: ConversationInboxItem[]): ConversationInboxItem[] {
  const seen = new Map<string, ConversationInboxItem>();
  for (const item of items) {
    const partnerId = item.partnerUser.id;
    const existing = seen.get(partnerId);
    if (!existing) {
      seen.set(partnerId, item);
    } else {
      const existingTime = new Date(existing.updatedAt).getTime();
      const currentTime = new Date(item.updatedAt).getTime();
      if (currentTime > existingTime) {
        seen.set(partnerId, {
          ...item,
          unreadCount: item.unreadCount + existing.unreadCount,
        });
      } else {
        seen.set(partnerId, {
          ...existing,
          unreadCount: existing.unreadCount + item.unreadCount,
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

  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Deduplicate by partner (same tutor across multiple bookings → show latest)
  const conversations = useMemo(() => {
    return deduplicateByPartner(rawConversations);
  }, [rawConversations]);

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

  // Auto-select first conversation on initial load
  React.useEffect(() => {
    if (!selectedBookingId && conversations.length > 0) {
      setSelectedBookingId(conversations[0].bookingId);
    }
  }, [conversations, selectedBookingId]);

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
    <div className="container max-w-6xl mx-auto py-6 px-4 space-y-5" data-testid="messages-inbox">
      {/* Header - Clean & Minimal */}
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            {locale === 'bn' ? 'বার্তালাপ' : 'Messages'}
            {totalUnread > 0 && (
              <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-full px-2 py-0.5 text-[10px] shadow-xs">
                {totalUnread}
              </Badge>
            )}
          </h1>
        </div>

        {/* Minimal Live Status */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <span className="text-[11px] font-medium">
            {isConnected
              ? locale === 'bn'
                ? 'রিয়েলটাইম সক্রিয়'
                : 'Live'
              : locale === 'bn'
                ? 'অফলাইন'
                : 'Offline'}
          </span>
        </div>
      </div>

      {conversations.length === 0 ? (
        /* Empty State */
        <Card className="p-12 text-center border-border bg-muted/10">
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
        /* Split Pane Container */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 items-start md:border md:border-border md:rounded-2xl md:overflow-hidden md:bg-card">
          {/* ── Left Column: Conversation List ── */}
          <div
            className={`md:col-span-4 md:border-r md:border-border md:h-[calc(100vh-13rem)] flex flex-col ${
              selectedBookingId ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Search */}
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={
                    locale === 'bn' ? 'নাম বা বিষয় খুঁজুন…' : 'Search by name or subject…'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-xl h-9 text-sm bg-muted/30 border-border"
                  data-testid="conversation-search"
                />
              </div>
            </div>

            {/* Conversation Cards */}
            <div className="flex-1 overflow-y-auto" data-testid="conversation-list">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  <Search className="w-5 h-5 mx-auto mb-2 opacity-40" />
                  {locale === 'bn' ? 'কোনো ফলাফল পাওয়া যায়নি' : 'No results found'}
                </div>
              ) : (
                filteredConversations.map((c) => {
                  const isSelected = c.bookingId === selectedBookingId;
                  const hasUnread = c.unreadCount > 0;

                  return (
                    <button
                      key={c.bookingId}
                      type="button"
                      onClick={() => handleSelectConversation(c.bookingId)}
                      data-testid={`conversation-item-${c.bookingId}`}
                      className={`w-full text-left px-3.5 py-3 border-b border-border/50 transition-all duration-150 cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? 'bg-primary/8 border-l-2 border-l-primary'
                          : 'hover:bg-muted/40 border-l-2 border-l-transparent'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <Avatar className="w-10 h-10 ring-1 ring-border shadow-xs">
                          {c.partnerUser.avatarUrl && (
                            <AvatarImage
                              src={c.partnerUser.avatarUrl}
                              alt={c.partnerUser.displayName}
                            />
                          )}
                          <AvatarFallback
                            className={`font-bold text-sm ${
                              isSelected
                                ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/20'
                                : 'bg-primary/10 text-primary'
                            }`}
                          >
                            {c.partnerUser.displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <Circle className="w-3 h-3 absolute -bottom-0.5 -right-0.5 text-success fill-success stroke-card stroke-2" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span
                            className={`text-sm truncate ${
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
                            className={`text-xs truncate max-w-[200px] ${
                              hasUnread
                                ? 'text-foreground font-semibold'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {c.lastMessage ? (
                              <>
                                {c.lastMessage.isMine && (
                                  <span className="mr-1 text-[11px] opacity-60">
                                    {locale === 'bn' ? 'আপনি:' : 'You:'}
                                  </span>
                                )}
                                {c.lastMessage.isRedacted
                                  ? locale === 'bn'
                                    ? '[সম্পাদিত]'
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
                            <span className="shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold min-w-[20px] h-5 flex items-center justify-center rounded-full px-1.5 shadow-sm shadow-blue-500/20">
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
            className={`md:col-span-8 md:h-[calc(100vh-13rem)] flex flex-col ${
              selectedBookingId ? 'flex' : 'hidden md:flex'
            }`}
          >
            {activeConversation ? (
              <div className="flex flex-col h-full">
                {/* Chat Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/80 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedBookingId(null)}
                    className="md:hidden rounded-xl p-1.5 -ml-1"
                    aria-label={locale === 'bn' ? 'পেছনে যান' : 'Go back'}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <Avatar className="w-9 h-9 ring-1 ring-border shadow-xs shrink-0">
                    {activeConversation.partnerUser.avatarUrl && (
                      <AvatarImage
                        src={activeConversation.partnerUser.avatarUrl}
                        alt={activeConversation.partnerUser.displayName}
                      />
                    )}
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-sm shadow-blue-500/20">
                      {activeConversation.partnerUser.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">
                      {activeConversation.partnerUser.displayName}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {activeConversation.subjectName}
                      {activeConversation.educationLevelName &&
                        ` · ${activeConversation.educationLevelName}`}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] border-success/40 text-success shrink-0 hidden sm:flex"
                  >
                    <Circle className="w-2 h-2 mr-1 fill-success text-success" />
                    {activeConversation.partnerUser.role === 'tutor'
                      ? locale === 'bn'
                        ? 'শিক্ষক'
                        : 'Tutor'
                      : locale === 'bn'
                        ? 'শিক্ষার্থী'
                        : 'Student'}
                  </Badge>
                </div>

                {/* Chat Container */}
                <div className="flex-1 overflow-hidden">
                  <BookingChatContainer
                    locale={locale}
                    bookingId={activeConversation.bookingId}
                    subjectName={activeConversation.subjectName}
                    currentUserId={currentUserId}
                    ownRole={currentUserRole === 'tutor' ? 'tutor' : 'student'}
                    peerRole={activeConversation.partnerUser.role}
                    peerName={activeConversation.partnerUser.displayName}
                    testId="inbox-active-chat"
                  />
                </div>
              </div>
            ) : (
              /* No Conversation Selected */
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 text-muted-foreground/30" />
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
