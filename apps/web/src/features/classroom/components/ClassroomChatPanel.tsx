'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@livekit/components-react';
import { MessageSquare, Send, X } from 'lucide-react';

interface ClassroomChatPanelProps {
  isOpen?: boolean;
  displayName: string;
  locale?: 'bn' | 'en';
  onClose: () => void;
}

const QUICK_TEXT_REACTIONS = [
  '👍 বুঝেছি',
  '❓ প্রশ্ন আছে',
  '🙌 ধন্যবাদ স্যার',
  '✅ Done',
  '👏 অসাধারণ',
];

export function ClassroomChatPanel({
  isOpen = true,
  displayName,
  locale = 'bn',
  onClose,
}: ClassroomChatPanelProps) {
  if (!isOpen) return null;
  const isBn = locale === 'bn';
  const { chatMessages, send } = useChat();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = async (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (overrideText || inputText).trim();
    if (!textToSend || !send) return;
    try {
      await send(textToSend);
      if (!overrideText) setInputText('');
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="fixed inset-y-0 right-0 w-full sm:w-96 bg-card border-l border-border text-foreground z-50 flex flex-col shadow-lg animate-in slide-in-from-right duration-200"
      data-testid="classroom-chat-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-primary/10 border border-primary/20 rounded-xl">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground tracking-tight">
              {isBn ? 'ইন-রুম লাইভ চ্যাট' : 'In-Class Chat'}
            </h3>
            <p className="text-[11px] font-medium text-muted-foreground">
              {isBn ? 'ক্লাসের সাথে সরাসরি আলোচনা' : 'Live conversation'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title={isBn ? 'বন্ধ করুন' : 'Close'}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 bg-background">
        {chatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <div className="w-14 h-14 rounded-full bg-muted border border-border flex items-center justify-center mb-3">
              <MessageSquare className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {isBn ? 'এখনো কোনো মেসেজ নেই' : 'No messages yet'}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs font-normal">
              {isBn
                ? 'ক্লাসের সাথে প্রশ্ন বা প্রয়োজনীয় মন্তব্য শেয়ার করুন।'
                : 'Post questions or comments to the class.'}
            </p>
          </div>
        ) : (
          chatMessages.map((msg) => {
            const isSelf = msg.from?.identity === displayName || msg.from?.name === displayName;
            const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={`${msg.timestamp}-${msg.from?.identity}`}
                className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span
                    className={`text-xs font-semibold ${isSelf ? 'text-primary' : 'text-foreground'}`}
                  >
                    {isSelf ? (isBn ? 'আপনি' : 'You') : msg.from?.name || 'User'}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{timeStr}</span>
                </div>
                <div
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium max-w-[85%] break-words shadow-2xs ${
                    isSelf
                      ? 'bg-primary text-primary-foreground rounded-br-xs'
                      : 'bg-card text-foreground rounded-bl-xs border border-border'
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Text Reactions Strip */}
      <div className="px-3 py-2 border-t border-border bg-muted/30 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {QUICK_TEXT_REACTIONS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => handleSend(undefined, tag)}
            className="px-2.5 py-1 rounded-lg bg-card hover:bg-muted text-[11px] font-medium text-foreground border border-border whitespace-nowrap active:scale-95 transition-all shadow-2xs"
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Message Input */}
      <form
        onSubmit={handleSend}
        className="p-3 sm:p-4 border-t border-border bg-card flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={isBn ? 'একটি বার্তা লিখুন...' : 'Type a message...'}
          className="flex-1 bg-muted/40 border border-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground focus:bg-card focus:outline-hidden focus:ring-1 focus:ring-primary"
          data-testid="classroom-chat-input"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="min-w-[40px] min-h-[40px] p-2 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground font-semibold transition-all flex items-center justify-center active:scale-95 shadow-xs"
          title={isBn ? 'পাঠান' : 'Send'}
          data-testid="classroom-chat-send-btn"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
