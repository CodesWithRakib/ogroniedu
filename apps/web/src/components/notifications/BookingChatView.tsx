'use client';

import React, { useState } from 'react';
import { Send, ShieldAlert, ShieldCheck, Check, CheckCheck, GraduationCap } from 'lucide-react';
import { Button, Card, CardContent, CardFooter, Badge, Input } from '@/components/ui';
import { getDictionary, type Locale } from '@/lib/i18n';

export interface ChatMessageItem {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'student' | 'tutor' | 'guardian';
  content: string;
  isRedacted: boolean;
  redactionReason?: string | null;
  readAt?: string | null;
  createdAt: string;
}

interface BookingChatViewProps {
  locale: Locale;
  bookingId: string;
  subjectName: string;
  currentUserId: string;
  initialMessages?: ChatMessageItem[];
  /**
   * Controlled mode: when provided, the thread renders `messages` directly and
   * send delegates persistence to the parent (server echo arrives via refetch).
   * When omitted, the component keeps its legacy local optimistic behavior.
   */
  messages?: ChatMessageItem[];
  onSendMessage?: (content: string) => Promise<void>;
}

export function BookingChatView({
  locale,
  bookingId,
  subjectName,
  currentUserId,
  initialMessages = [],
  messages: controlledMessages,
  onSendMessage,
}: BookingChatViewProps) {
  const dict = getDictionary(locale);
  const n = dict.notifications;

  const [localMessages, setLocalMessages] = useState<ChatMessageItem[]>(initialMessages ?? []);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const content = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      if (onSendMessage) {
        await onSendMessage(content);
      }

      // Controlled mode: server echo arrives via parent refetch — no local append.
      if (controlledMessages !== undefined) return;

      // Check client-side regex for instant preview safety tag
      const phoneRegex = /(?:\+?880\s?|0)1[3-9]\d{2}[\s-]?\d{6}/gi;
      const isSensitive = phoneRegex.test(content);

      const newMsg: ChatMessageItem = {
        id: `msg-${Date.now()}`,
        senderId: currentUserId,
        senderName: 'Me',
        senderRole: 'student',
        content: isSensitive ? content.replace(phoneRegex, '[REDACTED CONTACT NUMBER]') : content,
        isRedacted: isSensitive,
        redactionReason: isSensitive
          ? 'Direct phone number sharing restricted for escrow and child safety'
          : null,
        readAt: null,
        createdAt: new Date().toISOString(),
      };

      setLocalMessages((prev) => [...prev, newMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const messages = controlledMessages ?? localMessages;

  return (
    <div className="max-w-3xl mx-auto space-y-4 py-4 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground  flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-success-soft-foreground" />
            {n.chatTitle}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {subjectName} • Booking #{bookingId.slice(0, 8)}
          </p>
        </div>
        <Badge
          variant="outline"
          className="w-fit text-[11px] font-normal border-primary/40 text-success-soft-foreground "
        >
          <ShieldCheck className="w-3.5 h-3.5 mr-1 text-success-soft-foreground" />
          ABAC Encrypted & Audited
        </Badge>
      </div>

      {/* Safety Notice Banner */}
      <div className="bg-warning/10 border border-warning/40 rounded-xl p-3 text-xs text-warning  flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-warning  shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold block">{n.safetyNotice}</span>
          <span className="text-[11px] opacity-90">{n.guardianOversightNote}</span>
        </div>
      </div>

      {/* Messages Thread Container */}
      <Card className="border border-border shadow-sm flex flex-col h-[450px]">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              {n.noMessagesYet}
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderId === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[85%] ${
                    isMine ? 'ml-auto' : 'mr-auto'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1 px-1">
                    <span className="font-medium">{msg.senderName}</span>
                    <span>•</span>
                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm space-y-1 ${
                      isMine
                        ? 'bg-primary text-white rounded-tr-none'
                        : 'bg-muted  text-foreground  rounded-tl-none'
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                    {msg.isRedacted && (
                      <div className="flex items-center gap-1 text-[10px] bg-surface-muted  px-2 py-0.5 rounded font-mono">
                        <ShieldAlert className="w-3 h-3 text-warning-soft-foreground" />
                        <span>{n.redactedBadge}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5 px-1">
                    {isMine &&
                      (msg.readAt ? (
                        <CheckCheck className="w-3.5 h-3.5 text-success-soft-foreground" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-muted-foreground" />
                      ))}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>

        {/* Message Input Box */}
        <CardFooter className="border-t border-border p-3 bg-muted/50 ">
          <form onSubmit={handleSend} className="w-full flex items-center gap-2">
            <Input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={n.typeMessagePlaceholder}
              disabled={isSending}
              className="flex-1 rounded-xl h-10 text-sm"
            />
            <Button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="bg-primary hover:bg-primary-hover text-white rounded-xl px-4 py-2.5 flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-semibold">{n.sendMessage}</span>
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
