'use client';

import React, { useState } from 'react';
import {
  X,
  Settings,
  Volume2,
  VolumeX,
  Mic,
  Camera,
  ShieldCheck,
  Check,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { classroomAudio } from '../utils/classroom-audio';

export interface AudioProcessingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale?: 'bn' | 'en';
  devices?: {
    audioInputs: MediaDeviceInfo[];
    videoInputs: MediaDeviceInfo[];
  };
  selectedAudioDevice?: string;
  selectedVideoDevice?: string;
  onSelectAudioDevice?: (deviceId: string) => void;
  onSelectVideoDevice?: (deviceId: string) => void;
  noiseSuppression: boolean;
  onToggleNoiseSuppression: (enabled: boolean) => void;
  echoCancellation: boolean;
  onToggleEchoCancellation: (enabled: boolean) => void;
  soundEffectsEnabled: boolean;
  onToggleSoundEffects: (enabled: boolean) => void;
}

export function AudioProcessingSettingsModal({
  isOpen,
  onClose,
  locale = 'bn',
  devices,
  selectedAudioDevice,
  selectedVideoDevice,
  onSelectAudioDevice,
  onSelectVideoDevice,
  noiseSuppression,
  onToggleNoiseSuppression,
  echoCancellation,
  onToggleEchoCancellation,
  soundEffectsEnabled,
  onToggleSoundEffects,
}: AudioProcessingSettingsModalProps) {
  const isBn = locale === 'bn';

  if (!isOpen) return null;

  const handleSoundToggle = (enabled: boolean) => {
    onToggleSoundEffects(enabled);
    classroomAudio.setSoundEnabled(enabled);
    if (enabled) {
      classroomAudio.playChatMessageChime();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150"
      data-testid="audio-processing-settings-modal"
    >
      <div className="w-full max-w-lg bg-slate-900 border-2 border-slate-700 rounded-3xl shadow-2xl text-white overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/40">
              <Sliders className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                {isBn ? 'অডিও ও মিডিয়া সেটিংস' : 'Audio & Media Settings'}
              </h3>
              <p className="text-xs text-slate-400 font-bold">
                {isBn ? 'নয়েজ সাপ্রেশন ও ডিভাইস কনফিগারেশন' : 'Noise suppression & hardware setup'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isBn ? 'বন্ধ করুন' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Audio Filters Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              {isBn ? 'উন্নত অডিও ফিল্টারিং' : 'Advanced Audio Filters'}
            </h4>

            {/* Noise Suppression */}
            <label className="flex items-center justify-between p-3.5 bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-2xl cursor-pointer transition-all">
              <div className="pr-3">
                <p className="text-xs sm:text-sm font-black text-white">
                  {isBn ? 'নয়েজ সাপ্রেশন (Noise Suppression)' : 'Background Noise Suppression'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isBn
                    ? 'ফ্যানের শব্দ, কিবোর্ড টাইপিং ও আশপাশের আওয়াজ ফিল্টার করে'
                    : 'Removes ceiling fan hum, traffic and typing noises'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={noiseSuppression}
                onChange={(e) => onToggleNoiseSuppression(e.target.checked)}
                className="w-5 h-5 rounded-md text-emerald-500 border-2 border-slate-600 focus:ring-emerald-500 cursor-pointer"
              />
            </label>

            {/* Echo Cancellation */}
            <label className="flex items-center justify-between p-3.5 bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-2xl cursor-pointer transition-all">
              <div className="pr-3">
                <p className="text-xs sm:text-sm font-black text-white">
                  {isBn ? 'ইকো ক্যান্সেলেশন (Echo Cancellation)' : 'Acoustic Echo Cancellation'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isBn
                    ? 'স্পিকার থেকে মাইক্রোফোনে ফিরে আসা প্রতিধ্বনি রোধ করে'
                    : 'Prevents feedback loop when speaking without headphones'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={echoCancellation}
                onChange={(e) => onToggleEchoCancellation(e.target.checked)}
                className="w-5 h-5 rounded-md text-emerald-500 border-2 border-slate-600 focus:ring-emerald-500 cursor-pointer"
              />
            </label>

            {/* Sound Effects / Chimes */}
            <label className="flex items-center justify-between p-3.5 bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-2xl cursor-pointer transition-all">
              <div className="pr-3">
                <p className="text-xs sm:text-sm font-black text-white">
                  {isBn ? 'ইন্টারঅ্যাক্টিভ সাউন্ড চাইম' : 'Notification Sound Effects'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isBn
                    ? 'হাত তোলা ও নতুন চ্যাট মেসেজের জন্য মৃদু নোটিফিকেশন সাউন্ড'
                    : 'Plays gentle chime on hand raise and chat messages'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={soundEffectsEnabled}
                onChange={(e) => handleSoundToggle(e.target.checked)}
                className="w-5 h-5 rounded-md text-emerald-500 border-2 border-slate-600 focus:ring-emerald-500 cursor-pointer"
              />
            </label>
          </div>

          {/* Hardware Device Selection (if devices provided) */}
          {devices && (
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-blue-400" />
                {isBn ? 'ইনপুট ডিভাইস নির্বাচন' : 'Hardware Selection'}
              </h4>

              {devices.audioInputs.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">
                    {isBn ? 'মাইক্রোফোন' : 'Microphone'}
                  </label>
                  <select
                    value={selectedAudioDevice}
                    onChange={(e) => onSelectAudioDevice?.(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-700 bg-slate-950 text-white font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    {devices.audioInputs.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {devices.videoInputs.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">
                    {isBn ? 'ক্যামেরা' : 'Camera'}
                  </label>
                  <select
                    value={selectedVideoDevice}
                    onChange={(e) => onSelectVideoDevice?.(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-700 bg-slate-950 text-white font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    {devices.videoInputs.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Close button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-600/30 active:scale-98 transition-all"
            >
              {isBn ? 'সেটিংস নিশ্চিত করুন' : 'Confirm & Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
