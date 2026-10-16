/**
 * OgroniEdu Notification Audio Engine
 *
 * Implements a zero-latency, dependency-free Web Audio API synthesizer.
 * Generates loud, crisp, and high-fidelity melodic chimes with dynamic
 * compression for maximum perceived loudness without distortion.
 */

export type NotificationSoundType = 'chime' | 'urgent' | 'success';

const SOUND_STORAGE_KEY = 'ogroniedu_sound_enabled';
const VOLUME_STORAGE_KEY = 'ogroniedu_sound_volume';

let audioCtx: AudioContext | null = null;
let isUnlocked = false;

/** Initialize or retrieve the shared AudioContext. */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtxClass) {
      audioCtx = new AudioCtxClass();
    }
  }
  return audioCtx;
}

/** Automatically unlock the AudioContext on first user interaction to bypass autoplay restrictions. */
export function unlockAudioContext(): void {
  if (isUnlocked || typeof window === 'undefined') return;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    void ctx.resume().then(() => {
      isUnlocked = true;
    });
  } else {
    isUnlocked = true;
  }
}

// Attach one-time global interaction listeners to unlock audio seamlessly
if (typeof window !== 'undefined') {
  const unlockEvents = ['click', 'touchstart', 'keydown'] as const;
  const onUserGesture = () => {
    unlockAudioContext();
    unlockEvents.forEach((evt) => window.removeEventListener(evt, onUserGesture));
  };
  unlockEvents.forEach((evt) => window.addEventListener(evt, onUserGesture, { once: true, passive: true }));
}

/** Check if notification sound is enabled in user settings. */
export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const stored = localStorage.getItem(SOUND_STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

/** Toggle notification sound enabled state. */
export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
  } catch {
    // LocalStorage quota or privacy sandbox fallback
  }
}

/** Get notification sound volume (0.0 to 1.0). Default: 0.9 (Loud & Crisp). */
export function getSoundVolume(): number {
  if (typeof window === 'undefined') return 0.9;
  try {
    const stored = localStorage.getItem(VOLUME_STORAGE_KEY);
    if (stored !== null) {
      const val = parseFloat(stored);
      if (!isNaN(val) && val >= 0 && val <= 1) return val;
    }
    return 0.9;
  } catch {
    return 0.9;
  }
}

/** Set notification sound volume (0.0 to 1.0). */
export function setSoundVolume(volume: number): void {
  if (typeof window === 'undefined') return;
  const clamped = Math.max(0, Math.min(1, volume));
  try {
    localStorage.setItem(VOLUME_STORAGE_KEY, String(clamped));
  } catch {
    // Ignore
  }
}

/**
 * Synthesizes a loud, harmonic dual bell chime.
 * Note 1: 880Hz (A5) fundamental with 1760Hz harmonic.
 * Note 2: 1318.5Hz (E6) fundamental with 2637Hz harmonic.
 */
function playChime(ctx: AudioContext, masterVolume: number): void {
  const now = ctx.currentTime;

  // Dynamics compressor for maximum loudness and punch without clipping
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-18, now);
  compressor.knee.setValueAtTime(20, now);
  compressor.ratio.setValueAtTime(8, now);
  compressor.attack.setValueAtTime(0.003, now);
  compressor.release.setValueAtTime(0.2, now);
  compressor.connect(ctx.destination);

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(masterVolume, now);
  masterGain.connect(compressor);

  // Pulse 1: 880Hz (A5)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(880, now);

  gain1.gain.setValueAtTime(0.001, now);
  gain1.gain.exponentialRampToValueAtTime(0.9, now + 0.015);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

  osc1.connect(gain1);
  gain1.connect(masterGain);
  osc1.start(now);
  osc1.stop(now + 0.29);

  // Harmonic overtone for note 1: Triangle at 1760Hz
  const harm1 = ctx.createOscillator();
  const harmGain1 = ctx.createGain();
  harm1.type = 'triangle';
  harm1.frequency.setValueAtTime(1760, now);

  harmGain1.gain.setValueAtTime(0.001, now);
  harmGain1.gain.exponentialRampToValueAtTime(0.35, now + 0.01);
  harmGain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  harm1.connect(harmGain1);
  harmGain1.connect(masterGain);
  harm1.start(now);
  harm1.stop(now + 0.21);

  // Pulse 2 (Higher crystal bell): 1318.51Hz (E6)
  const delay2 = 0.11;
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1318.51, now + delay2);

  gain2.gain.setValueAtTime(0.001, now + delay2);
  gain2.gain.exponentialRampToValueAtTime(1.0, now + delay2 + 0.015);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + delay2 + 0.45);

  osc2.connect(gain2);
  gain2.connect(masterGain);
  osc2.start(now + delay2);
  osc2.stop(now + delay2 + 0.46);

  // Harmonic overtone for note 2: Triangle at 2637Hz
  const harm2 = ctx.createOscillator();
  const harmGain2 = ctx.createGain();
  harm2.type = 'triangle';
  harm2.frequency.setValueAtTime(2637, now + delay2);

  harmGain2.gain.setValueAtTime(0.001, now + delay2);
  harmGain2.gain.exponentialRampToValueAtTime(0.4, now + delay2 + 0.01);
  harmGain2.gain.exponentialRampToValueAtTime(0.001, now + delay2 + 0.35);

  harm2.connect(harmGain2);
  harmGain2.connect(masterGain);
  harm2.start(now + delay2);
  harm2.stop(now + delay2 + 0.36);
}

/**
 * Synthesizes an alert sound with three sharp, attention-grabbing pulses.
 */
function playUrgentAlert(ctx: AudioContext, masterVolume: number): void {
  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(masterVolume, now);
  masterGain.connect(ctx.destination);

  const pulses = [
    { freq: 1046.5, time: 0 },
    { freq: 1318.5, time: 0.1 },
    { freq: 1567.98, time: 0.2 },
  ];

  pulses.forEach(({ freq, time }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square'; // Sharper, authoritative waveform for urgent safety alerts
    osc.frequency.setValueAtTime(freq, now + time);

    gain.gain.setValueAtTime(0.001, now + time);
    gain.gain.exponentialRampToValueAtTime(0.65, now + time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.09);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now + time);
    osc.stop(now + time + 0.095);
  });
}

/**
 * Synthesizes a bright, melodic ascending chord (Success / Payment / Verified).
 */
function playSuccess(ctx: AudioContext, masterVolume: number): void {
  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(masterVolume, now);
  masterGain.connect(ctx.destination);

  const notes = [
    { freq: 523.25, time: 0 },      // C5
    { freq: 659.25, time: 0.08 },   // E5
    { freq: 783.99, time: 0.16 },   // G5
    { freq: 1046.5, time: 0.24 },   // C6
  ];

  notes.forEach(({ freq, time }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + time);

    gain.gain.setValueAtTime(0.001, now + time);
    gain.gain.exponentialRampToValueAtTime(0.85, now + time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.35);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now + time);
    osc.stop(now + time + 0.36);
  });
}

/**
 * Play a notification sound if enabled in user settings.
 */
export function playNotificationSound(type: NotificationSoundType = 'chime'): void {
  if (!isSoundEnabled()) return;
  forcePlayNotificationSound(type);
}

/**
 * Force plays a notification sound (used for previewing or testing sound even if currently muted).
 */
export function forcePlayNotificationSound(type: NotificationSoundType = 'chime'): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const play = () => {
    const volume = getSoundVolume();
    if (type === 'urgent') {
      playUrgentAlert(ctx, volume);
    } else if (type === 'success') {
      playSuccess(ctx, volume);
    } else {
      playChime(ctx, volume);
    }
  };

  if (ctx.state === 'suspended') {
    void ctx.resume().then(play).catch(() => {});
  } else {
    play();
  }
}

/** Convenience alias for playing audio feedback */
export function playAudioTone(type: 'chime' | 'urgent' | 'alert' | 'success' = 'chime'): void {
  playNotificationSound(type === 'alert' ? 'urgent' : type);
}
