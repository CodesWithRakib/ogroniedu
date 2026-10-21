'use client';

import React from 'react';
import { BookingChatView, type ChatMessageItem } from '@/components/notifications/BookingChatView';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/lib/i18n';
import { useBookingChat } from '../hooks/use-booking-chat';
import { mapToChatItems, type ChatRole } from '../utils/chat-mappers';

/**
 * Connected chat thread: cursor history + send, rendered by BookingChatView.
 * Role labels are caller-supplied display hints (see chat-mappers).
 */
export function BookingChatContainer({
  locale,
  bookingId,
  subjectName,
  currentUserId,
  ownRole = 'student',
  peerRole = 'tutor',
  testId = 'booking-chat',
}: {
  locale: Locale;
  bookingId: string;
  subjectName: string;
  currentUserId: string;
  ownRole?: ChatRole;
  peerRole?: ChatRole;
  testId?: string;
}) {
  const chat = useBookingChat(bookingId, locale);
  const items: ChatMessageItem[] = React.useMemo(
    () => mapToChatItems(chat.messages, currentUserId, { ownRole, peerRole }),
    [chat.messages, currentUserId, ownRole, peerRole],
  );

  if (chat.isLoading) return <LoadingState testId={`${testId}-loading`} />;
  if (chat.errorMessage)
    return (
      <ErrorState message={chat.errorMessage} onRetry={chat.refetch} testId={`${testId}-error`} />
    );

  return (
    <div data-testid={testId} className="space-y-3">
      {chat.canLoadOlder && (
        <div className="flex justify-center">
          <Button
            size="sm"
            variant="outline"
            onClick={chat.loadOlder}
            disabled={chat.isFetchingOlder}
            data-testid={`${testId}-load-older`}
          >
            {chat.isFetchingOlder
              ? locale === 'bn'
                ? 'লোড হচ্ছে…'
                : 'Loading…'
              : locale === 'bn'
                ? 'আগের বার্তা'
                : 'Load older messages'}
          </Button>
        </div>
      )}
      <BookingChatView
        locale={locale}
        bookingId={bookingId}
        subjectName={subjectName}
        currentUserId={currentUserId}
        messages={items}
        typingUser={chat.typingUser}
        onTyping={chat.emitTyping}
        onSendMessage={chat.send}
      />
    </div>
  );
}
