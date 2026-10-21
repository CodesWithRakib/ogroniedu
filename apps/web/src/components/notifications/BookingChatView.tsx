'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  ShieldAlert,
  ShieldCheck,
  Check,
  CheckCheck,
  GraduationCap,
  Paperclip,
  FileText,
  X,
  Eye,
} from 'lucide-react';
import { Button, Card, CardContent, CardFooter, Badge, Input } from '@/components/ui';
import { getDictionary, type Locale } from '@/lib/i18n';

export interface ChatMessageItem {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'student' | 'tutor' | 'guardian' | 'admin';
  content: string;
  isRedacted: boolean;
  redactionReason?: string | null;
  attachmentAssetIds?: string[];
  metadata?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
}

interface BookingChatViewProps {
  locale: Locale;
  bookingId: string;
  subjectName: string;
  currentUserId: string;
  initialMessages?: ChatMessageItem[];
  messages?: ChatMessageItem[];
  typingUser?: string | null;
  onTyping?: (isTyping: boolean) => void;
  isGuardianViewer?: boolean;
  onSendMessage?: (content: string, attachmentAssetIds?: string[]) => Promise<void>;
}

export function BookingChatView({
  locale,
  bookingId,
  subjectName,
  currentUserId,
  initialMessages = [],
  messages: controlledMessages,
  typingUser,
  onTyping,
  isGuardianViewer,
  onSendMessage,
}: BookingChatViewProps) {
  const dict = getDictionary(locale);
  const n = dict.notifications;

  const [localMessages, setLocalMessages] = useState<ChatMessageItem[]>(initialMessages ?? []);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<{ id: string; name: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [controlledMessages, localMessages, typingUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (onTyping) {
      onTyping(e.target.value.trim().length > 0);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files).map((f) => ({
      id: crypto.randomUUID ? crypto.randomUUID() : `att-${Date.now()}-${f.name}`,
      name: f.name,
    }));
    setAttachedFiles((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && attachedFiles.length === 0) || isSending) return;

    const content = inputText.trim() || (locale === 'bn' ? 'সংযুক্ত ফাইল পাঠানো হয়েছে' : 'Attached file shared');
    const attachmentIds = attachedFiles.map((f) => f.id);
    setInputText('');
    setAttachedFiles([]);
    setIsSending(true);
    if (onTyping) onTyping(false);

    try {
      if (onSendMessage) {
        await onSendMessage(content, attachmentIds);
      }

      // Controlled mode: server echo arrives via parent refetch — no local append.
      if (controlledMessages !== undefined) return;

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
        attachmentAssetIds: attachmentIds,
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
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-success-soft-foreground" />
            {n.chatTitle}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {subjectName} • Booking #{bookingId.slice(0, 8)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isGuardianViewer && (
            <Badge
              variant="outline"
              className="w-fit text-[11px] font-normal border-warning/50 bg-warning/10 text-warning"
            >
              <Eye className="w-3.5 h-3.5 mr-1" />
              {locale === 'bn' ? 'অভিভাবক পর্যবেক্ষণ মোড' : 'Guardian Monitor Mode'}
            </Badge>
          )}
          <Badge
            variant="outline"
            className="w-fit text-[11px] font-normal border-primary/40 text-success-soft-foreground"
          >
            <ShieldCheck className="w-3.5 h-3.5 mr-1 text-success-soft-foreground" />
            ABAC Encrypted & Audited
          </Badge>
        </div>
      </div>

      {/* Safety Notice Banner */}
      <div className="bg-warning/10 border border-warning/40 rounded-xl p-3 text-xs text-warning flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-warning shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold block">{n.safetyNotice}</span>
          <span className="text-[11px] opacity-90">{n.guardianOversightNote}</span>
        </div>
      </div>

      {/* Messages Thread Container */}
      <Card className="border border-border flex flex-col h-[480px]">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              {n.noMessagesYet}
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderId === currentUserId;
              const isGuardian = msg.senderRole === 'guardian';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[85%] ${
                    isMine ? 'ml-auto' : 'mr-auto'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1 px-1">
                    <span className="font-medium flex items-center gap-1">
                      {isGuardian && <span className="text-warning text-[10px]">🛡️</span>}
                      {msg.senderName}
                    </span>
                    <span>•</span>
                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm space-y-2 ${
                      isMine
                        ? 'bg-primary text-white rounded-tr-none'
                        : isGuardian
                          ? 'bg-warning/10 border border-warning/30 text-foreground rounded-tl-none'
                          : 'bg-muted text-foreground rounded-tl-none'
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                    {/* Attachments rendering */}
                    {msg.attachmentAssetIds && msg.attachmentAssetIds.length > 0 && (
                      <div className="pt-1 space-y-1">
                        {msg.attachmentAssetIds.map((attId, idx) => (
                          <div
                            key={attId}
                            className={`flex items-center gap-2 p-2 rounded-xl text-xs font-mono border ${
                              isMine
                                ? 'bg-white/10 border-white/20 text-white'
                                : 'bg-surface border-border text-foreground'
                            }`}
                          >
                            <FileText className="w-4 h-4 shrink-0 text-primary" />
                            <span className="truncate flex-1">
                              {locale === 'bn' ? `সংযুক্ত নথি #${idx + 1}` : `Document Asset #${idx + 1}`}
                            </span>
                            <span className="text-[10px] opacity-75">PDF/Doc</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {msg.isRedacted && (
                      <div className="flex items-center gap-1 text-[10px] bg-surface-muted px-2 py-0.5 rounded font-mono">
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

          {/* Typing Indicator */}
          {typingUser && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse px-3 py-1.5 bg-muted/60 rounded-xl w-fit">
              <span className="inline-block w-2 h-2 rounded-full bg-primary animate-ping" />
              <span>
                {typingUser} {locale === 'bn' ? 'টাইপ করছেন…' : 'is typing…'}
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        {/* Selected Attachments Chips */}
        {attachedFiles.length > 0 && (
          <div className="px-3 py-1.5 border-t border-border bg-muted/30 flex flex-wrap gap-1.5">
            {attachedFiles.map((f) => (
              <span
                key={f.id}
                className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg bg-surface border border-border text-foreground"
              >
                <FileText className="w-3 h-3 text-primary" />
                <span className="truncate max-w-[150px]">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(f.id)}
                  className="hover:text-destructive text-muted-foreground ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Message Input Box */}
        <CardFooter className="border-t border-border p-3 bg-muted/50">
          <form onSubmit={handleSend} className="w-full flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              multiple
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-10 px-2.5 rounded-xl border-border text-muted-foreground hover:text-foreground shrink-0"
              title={locale === 'bn' ? 'নথি বা ছবি সংযুক্ত করুন' : 'Attach document or image'}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              placeholder={n.typeMessagePlaceholder}
              disabled={isSending}
              className="flex-1 rounded-xl h-10 text-sm"
            />
            <Button
              type="submit"
              disabled={(!inputText.trim() && attachedFiles.length === 0) || isSending}
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-4 py-2.5 flex items-center gap-1.5 shrink-0 shadow-xs shadow-blue-500/25"
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
