'use client';

import React from 'react';
import {
  X,
  Wifi,
  Activity,
  Server,
  ShieldCheck,
  Zap,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export interface NetworkDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale?: 'bn' | 'en';
  latencyMs?: number;
  packetLossPercent?: number;
  qualityRating?: 'excellent' | 'good' | 'poor' | 'unknown';
  lowDataMode: boolean;
  onToggleLowDataMode: () => void;
}

export function NetworkDiagnosticsModal({
  isOpen,
  onClose,
  locale = 'bn',
  latencyMs = 38,
  packetLossPercent = 0.0,
  qualityRating = 'excellent',
  lowDataMode,
  onToggleLowDataMode,
}: NetworkDiagnosticsModalProps) {
  const isBn = locale === 'bn';

  if (!isOpen) return null;

  const isExcellent = qualityRating === 'excellent';
  const isGood = qualityRating === 'good';
  const isPoor = qualityRating === 'poor';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      data-testid="network-diagnostics-modal"
    >
      <div className="w-full max-w-md bg-white border-2 border-slate-200 rounded-3xl shadow-2xl text-slate-900 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
              <Activity className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {isBn ? 'নেটওয়ার্ক ডায়াগনস্টিকস ও স্থিতি' : 'Network Diagnostics & Health'}
              </h3>
              <p className="text-xs text-slate-500 font-bold">
                {isBn ? 'রিয়েল-টাইম ক্লাউড সংযোগ বিশ্লেষণ' : 'Real-time WebRTC SFU telemetry'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
            title={isBn ? 'বন্ধ করুন' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Main Quality Banner */}
          <div
            className={`p-4 rounded-2xl border-2 flex items-center justify-between ${
              isExcellent
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : isGood
                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <Wifi className="w-6 h-6 shrink-0 text-emerald-600" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {isBn ? 'সংযোগের মান' : 'Connection Quality'}
                </p>
                <p className="text-sm font-black text-slate-900 mt-0.5">
                  {isExcellent
                    ? isBn
                      ? 'চমৎকার ও স্থিতিশীল (Excellent)'
                      : 'Excellent & Stable'
                    : isGood
                      ? isBn
                        ? 'ভালো মানের সংযোগ (Good)'
                        : 'Good Quality'
                      : isBn
                        ? 'ধীরগতির সংযোগ (Weak Connection)'
                        : 'Weak Network'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-slate-900">{latencyMs}</span>
              <span className="text-xs text-slate-500 block font-bold">ms Ping</span>
            </div>
          </div>

          {/* Telemetry Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-bold block mb-1">
                {isBn ? 'প্যাকেট লস (Packet Loss)' : 'Packet Loss'}
              </span>
              <span className="text-sm font-black text-emerald-700">
                {packetLossPercent.toFixed(1)}%
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-bold block mb-1">
                {isBn ? 'অডিও/ভিডিও কোডেক' : 'AV Codec'}
              </span>
              <span className="text-sm font-black text-blue-700">Opus / VP8</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-bold block mb-1">
                {isBn ? 'এসএফইউ অঞ্চল' : 'SFU Region'}
              </span>
              <span className="text-sm font-black text-indigo-700">India South / LiveKit</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-bold block mb-1">
                {isBn ? 'প্রটোকল মোড' : 'Protocol'}
              </span>
              <span className="text-sm font-black text-purple-700">WebRTC ICE/UDP</span>
            </div>
          </div>

          {/* Advice / Low-Data Suggestion */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3">
            <Zap className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-slate-900">
                {isBn ? 'ব্যান্ডউইথ অপ্টিমাইজেশন টিপস' : 'Bandwidth Optimization Tip'}
              </p>
              <p className="text-slate-600 mt-0.5">
                {isBn
                  ? '৩জি বা দুর্বল মোবাইল নেটওয়ার্কে ভিডিও আটকে গেলে নিচে লো-ডাটা মোড অন করুন।'
                  : 'On weak 3G/4G connections, enable Low-Data mode to preserve crystal clear audio.'}
              </p>
            </div>
          </div>

          {/* Low data mode toggle button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onToggleLowDataMode}
              className={`w-full py-3 px-4 rounded-2xl text-xs sm:text-sm font-black border-2 transition-all flex items-center justify-center gap-2 active:scale-98 ${
                lowDataMode
                  ? 'bg-amber-400 border-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              }`}
            >
              <Wifi className="w-4 h-4" />
              <span>
                {lowDataMode
                  ? isBn
                    ? 'লো-ডাটা মোড সক্রিয় আছে (বন্ধ করুন)'
                    : 'Low-Data Mode Active (Disable)'
                  : isBn
                    ? 'লো-ডাটা মোড চালু করুন (সাশ্রয়ী)'
                    : 'Enable Low-Data Mode'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
