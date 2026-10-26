'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Plus,
  Send,
  Trash2,
  X,
  Radio,
  Share2,
  StopCircle,
} from 'lucide-react';
import { Button } from '@/components/ui';

export interface ClassroomPoll {
  id: string;
  question: string;
  options: string[];
  creatorName: string;
  creatorIdentity: string;
  createdAt: number;
  durationSeconds?: number;
  isActive: boolean;
  resultsShared?: boolean;
}

export interface PollVoteRecord {
  pollId: string;
  optionIndex: number;
  voterIdentity: string;
}

export interface ClassroomPollModalProps {
  isOpen: boolean;
  onClose: () => void;
  isTutor: boolean;
  locale?: 'bn' | 'en';
  currentPoll: ClassroomPoll | null;
  votes: Record<string, number>; // voterIdentity -> optionIndex
  userVotedIndex: number | null;
  onLaunchPoll: (question: string, options: string[], durationSeconds?: number) => void;
  onVote: (optionIndex: number) => void;
  onEndPoll: () => void;
  onToggleShareResults: (shared: boolean) => void;
}

export function ClassroomPollModal({
  isOpen,
  onClose,
  isTutor,
  locale = 'bn',
  currentPoll,
  votes,
  userVotedIndex,
  onLaunchPoll,
  onVote,
  onEndPoll,
  onToggleShareResults,
}: ClassroomPollModalProps) {
  const isBn = locale === 'bn';

  // New poll form state
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [duration, setDuration] = useState<number>(60);
  const [selectedVoteIndex, setSelectedVoteIndex] = useState<number | null>(null);

  useEffect(() => {
    if (userVotedIndex !== null) {
      setSelectedVoteIndex(userVotedIndex);
    }
  }, [userVotedIndex]);

  if (!isOpen) return null;

  // Calculate vote counts and percentages
  const totalVotes = Object.keys(votes).length;
  const optionCounts = (currentPoll?.options || []).map(
    (_, idx) => Object.values(votes).filter((v) => v === idx).length,
  );

  const handleAddOption = () => {
    if (options.length < 5) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (text: string, index: number) => {
    const updated = [...options];
    updated[index] = text;
    setOptions(updated);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || validOptions.length < 2) return;

    onLaunchPoll(question.trim(), validOptions, duration > 0 ? duration : undefined);
    setQuestion('');
    setOptions(['', '']);
  };

  const handleCastVote = () => {
    if (selectedVoteIndex !== null) {
      onVote(selectedVoteIndex);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
      data-testid="classroom-poll-modal"
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border-2 border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 text-slate-900 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl">
              <BarChart3 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
                {isBn ? 'ইন-ক্লাস পোল ও তাৎক্ষণিক কুইজ' : 'In-Class Polls & Quick Quiz'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {isTutor
                  ? isBn
                    ? 'শিক্ষার্থীদের তাৎক্ষণিক যাচাই করুন'
                    : 'Assess student understanding in real-time'
                  : isBn
                    ? 'আপনার উত্তর নির্বাচন করুন'
                    : 'Select your answer below'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
            data-testid="close-poll-modal-btn"
            aria-label={isBn ? 'বন্ধ করুন' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Active Poll View */}
          {currentPoll && currentPoll.isActive ? (
            <div className="space-y-4" data-testid="active-poll-container">
              {/* Poll Question Banner */}
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl">
                <div className="flex items-center justify-between text-xs font-bold text-blue-700 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                    {isBn ? 'চলমান পোল' : 'Active Poll'}
                  </span>
                  <span>
                    {isBn ? `মোট ভোট: ${totalVotes}` : `Total Votes: ${totalVotes}`}
                  </span>
                </div>
                <h4 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                  {currentPoll.question}
                </h4>
                <p className="text-xs text-slate-600 font-medium mt-1">
                  {isBn ? `তৈরি করেছেন: ${currentPoll.creatorName}` : `Created by: ${currentPoll.creatorName}`}
                </p>
              </div>

              {/* Options List */}
              <div className="space-y-2.5">
                {currentPoll.options.map((opt, idx) => {
                  const count = optionCounts[idx] || 0;
                  const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                  const isSelected = selectedVoteIndex === idx;
                  const isVoted = userVotedIndex !== null;
                  const canSeeResults = isTutor || isVoted || currentPoll.resultsShared;

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (!isVoted && !isTutor) {
                          setSelectedVoteIndex(idx);
                        }
                      }}
                      className={`relative p-3.5 rounded-2xl border-2 transition-all select-none ${
                        !isVoted && !isTutor
                          ? isSelected
                            ? 'border-blue-600 bg-blue-50/70 shadow-md cursor-pointer ring-2 ring-blue-500/40'
                            : 'border-slate-200 bg-white hover:border-blue-400 hover:bg-slate-50 cursor-pointer'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      {/* Background Progress Bar when results are visible */}
                      {canSeeResults && (
                        <div
                          className="absolute inset-y-0 left-0 bg-blue-100 rounded-xl transition-all duration-500 ease-out z-0"
                          style={{ width: `${percentage}%` }}
                        />
                      )}

                      <div className="relative z-10 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-blue-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="text-sm font-black text-slate-900">{opt}</span>
                        </div>

                        {canSeeResults ? (
                          <div className="text-right shrink-0">
                            <span className="text-xs font-black text-blue-950">{percentage}%</span>
                            <span className="text-[10px] text-slate-600 font-bold ml-1">
                              ({count})
                            </span>
                          </div>
                        ) : (
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-slate-400 bg-white'
                            }`}
                          >
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Student Action: Submit Vote */}
              {!isTutor && (
                <div className="pt-2">
                  {userVotedIndex !== null ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{isBn ? 'আপনার ভোট গ্রহণ করা হয়েছে!' : 'Your vote has been submitted!'}</span>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleCastVote}
                      disabled={selectedVoteIndex === null}
                      className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                      data-testid="submit-poll-vote-btn"
                    >
                      <Send className="w-4 h-4 mr-1.5" />
                      {isBn ? 'উত্তর জমা দিন' : 'Submit Answer'}
                    </Button>
                  )}
                </div>
              )}

              {/* Tutor Host Moderation Controls */}
              {isTutor && (
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200">
                  <Button
                    type="button"
                    onClick={() => onToggleShareResults(!currentPoll.resultsShared)}
                    variant="outline"
                    className="flex-1 h-10 border-blue-300 text-blue-900 font-bold text-xs rounded-xl hover:bg-blue-50"
                  >
                    <Share2 className="w-4 h-4 mr-1 text-blue-600" />
                    {currentPoll.resultsShared
                      ? isBn
                        ? 'ফলাফল গোপন করুন'
                        : 'Hide Results'
                      : isBn
                        ? 'শিক্ষার্থীদের ফলাফল দেখান'
                        : 'Broadcast Results'}
                  </Button>
                  <Button
                    type="button"
                    onClick={onEndPoll}
                    className="flex-1 h-10 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-xs"
                    data-testid="end-poll-btn"
                  >
                    <StopCircle className="w-4 h-4 mr-1" />
                    {isBn ? 'পোল সমাপ্ত করুন' : 'End Poll'}
                  </Button>
                </div>
              )}
            </div>
          ) : isTutor ? (
            /* Tutor Poll Creation Form */
            <form onSubmit={handleCreateSubmit} className="space-y-4" data-testid="create-poll-form">
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1.5">
                  {isBn ? 'পোলের প্রশ্ন / কুইজ লিখুন:' : 'Poll Question / Quiz Prompt:'}
                </label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={
                    isBn
                      ? 'উদা: আলোর গতিবেগ শূন্য মাধ্যমে কত?'
                      : 'e.g. What is the speed of light in vacuum?'
                  }
                  required
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-xl text-slate-900 font-bold text-sm focus:bg-white focus:border-blue-600 focus:outline-hidden transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-800 mb-1.5">
                  {isBn ? 'উত্তর বিকল্পসমূহ (কমপক্ষে ২টি):' : 'Answer Options (at least 2):'}
                </label>
                <div className="space-y-2">
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-blue-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => handleOptionChange(e.target.value, idx)}
                        placeholder={
                          isBn ? `বিকল্প ${idx + 1}` : `Option ${idx + 1}`
                        }
                        required
                        className="flex-1 px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 font-bold text-xs sm:text-sm focus:bg-white focus:border-blue-600 focus:outline-hidden"
                      />
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(idx)}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title={isBn ? 'মুছুন' : 'Remove'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {options.length < 5 && (
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-black text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {isBn ? 'আরেকটি বিকল্প যোগ করুন' : 'Add Option'}
                  </button>
                )}
              </div>

              {/* Timer Setting */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-200">
                <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  {isBn ? 'সময়সীমা:' : 'Duration:'}
                </span>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden"
                >
                  <option value={30}>{isBn ? '৩০ সেকেন্ড' : '30 seconds'}</option>
                  <option value={60}>{isBn ? '১ মিনিট' : '1 minute'}</option>
                  <option value={120}>{isBn ? '২ মিনিট' : '2 minutes'}</option>
                  <option value={0}>{isBn ? 'অসীম / ম্যানুয়াল সমাপ্তি' : 'Manual end'}</option>
                </select>
              </div>

              {/* Launch Poll Button */}
              <Button
                type="submit"
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-xl shadow-md transition-all active:scale-95"
                data-testid="launch-poll-btn"
              >
                <Send className="w-4 h-4 mr-2" />
                {isBn ? 'পোল চালু ও সম্প্রচার করুন' : 'Launch & Broadcast Poll'}
              </Button>
            </form>
          ) : (
            /* Student No Active Poll State */
            <div className="py-8 text-center text-slate-600 space-y-2">
              <BarChart3 className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">
                {isBn ? 'বর্তমানে কোনো সক্রিয় পোল নেই' : 'No active poll right now'}
              </p>
              <p className="text-xs text-slate-600">
                {isBn
                  ? 'শিক্ষক পোল বা কুইজ চালু করলে তা এখানে স্বয়ংক্রিয়ভাবে প্রদর্শিত হবে।'
                  : 'When your tutor launches a quiz or question, it will appear here.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
