'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, MessageSquare, User, Smile, Sparkles } from 'lucide-react';
import { useChat } from '@livekit/components-react';
import { classroomAudio } from '../utils/classroom-audio';

export interface ClassroomChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  locale?: 'bn' | 'en';
  displayName: string;
}

const QUICK_TEXT_REACTIONS = ['👍 বুঝেছি', '❓ প্রশ্ন আছে', '👏 দারুণ', '✋ হাত তুললাম'];

export function ClassroomChatPanel({
  isOpen,
  onClose,
  locale = 'bn',
  displayName,
}: ClassroomChatPanelProps) {
  const isBn = locale === 'bn';
  const { chatMessages, send } = useChat();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(chatMessages.length);

  useEffect(() => {
    if (chatMessages.length > prevCountRef.current) {
      const latestMsg = chatMessages[chatMessages.length - 1];
      const isSelf = latestMsg?.from?.identity === displayName || latestMsg?.from?.name === displayName;
      if (!isSelf) {
        classroomAudio.playChatMessageChime();
      }
    }
    prevCountRef.current = chatMessages.length;
  }, [chatMessages, displayName]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isOpen]);

  if (!isOpen) return null;

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
      className="fixed inset-y-0 right-0 w-full sm:w-96 bg-slate-950/98 backdrop-blur-2xl border-l-2 border-slate-800 text-white z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
      data-testid="classroom-chat-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b-2 border-slate-800 bg-slate-900/90">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-600/20 border border-blue-500/40 rounded-xl">
            <MessageSquare className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-black text-base text-white tracking-tight">
              {isBn ? 'ইন-রুম লাইভ চ্যাট' : 'In-Class Chat'}
            </h3>
            <p className="text-[11px] font-bold text-slate-400">
              {isBn ? 'ক্লাসের সাথে সরাসরি আলোচনা' : 'Live conversation'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
          title={isBn ? 'বন্ধ করুন' : 'Close'}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {chatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-16 h-16 rounded-full bg-slate-900 border-2 border-slate-800 flex items-center justify-center mb-3 shadow-inner">
              <MessageSquare className="w-8 h-8 text-slate-500" />
            </div>
            <p className="text-sm font-bold text-slate-200">
              {isBn ? 'এখনো কোনো মেসেজ নেই' : 'No messages yet'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs font-medium">
              {isBn ? 'ক্লাসের সাথে প্রশ্ন বা প্রয়োজনীয় মন্তব্য শেয়ার করুন।' : 'Post questions or comments to the class.'}
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
                  <span className={`text-xs font-black ${isSelf ? 'text-blue-300' : 'text-slate-300'}`}>
                    {isSelf ? (isBn ? 'আপনি' : 'You') : msg.from?.name || 'User'}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">{timeStr}</span>
                </div>
                <div
                  className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold max-w-[85%] break-words shadow-md ${
                    isSelf
                      ? 'bg-blue-600 text-white rounded-br-xs'
                      : 'bg-slate-800/90 text-slate-100 rounded-bl-xs border-2 border-slate-700/80'
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
      <div className="px-3 py-2 border-t border-slate-800/80 bg-slate-900/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {QUICK_TEXT_REACTIONS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => handleSend(undefined, tag)}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 border border-slate-700/80 whitespace-nowrap active:scale-95 transition-all"
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Message Input */}
      <form onSubmit={handleSend} className="p-3 sm:p-4 border-t-2 border-slate-800 bg-slate-900 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={isBn ? 'একটি বার্তা লিখুন...' : 'Type a message...'}
          className="flex-1 bg-slate-800 border-2 border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          data-testid="classroom-chat-input"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold transition-all flex items-center justify-center active:scale-95 shadow-md shadow-blue-600/30"
          title={isBn ? 'পাঠান' : 'Send'}
          data-testid="classroom-chat-send-btn"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
