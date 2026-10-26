'use client';

/**
 * Web Audio API based sound synthesizer for classroom interactions.
 * Generates pleasant, lightweight audio chimes without external mp3 downloads or network delay.
 */
class ClassroomAudioService {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ogroni_classroom_sound_enabled');
      if (stored !== null) {
        this.soundEnabled = stored === 'true';
      }
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('ogroni_classroom_sound_enabled', String(enabled));
    }
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  /**
   * Pleasant two-tone rising chime (C5 -> E5) when a student raises their hand.
   */
  public playHandRaiseChime() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      gainNode.connect(ctx.destination);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.18, now + 0.04);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.connect(gainNode);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.12); // E5
      osc2.connect(gainNode);

      osc1.start(now);
      osc1.stop(now + 0.25);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.65);
    } catch {
      // Audio autoplay policy catch
    }
  }

  /**
   * Crisp, subtle water droplet / pop sound when a chat message arrives.
   */
  public playChatMessageChime() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      gainNode.connect(ctx.destination);
      gainNode.gain.setValueAtTime(0.14, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(784, now); // G5
      osc.frequency.exponentialRampToValueAtTime(392, now + 0.14); // G4
      osc.connect(gainNode);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // ignore
    }
  }

  /**
   * Warm rising triad when a user joins the classroom.
   */
  public playJoinChime() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [440, 554.37, 659.25]; // A4, C#5, E5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + idx * 0.08;

        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.12, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        osc.connect(gain);

        osc.start(startTime);
        osc.stop(startTime + 0.38);
      });
    } catch {
      // ignore
    }
  }

  /**
   * Gentle descending chime when someone leaves.
   */
  public playLeaveChime() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [659.25, 523.25]; // E5, C5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + idx * 0.1;

        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.1, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        osc.connect(gain);

        osc.start(startTime);
        osc.stop(startTime + 0.32);
      });
    } catch {
      // ignore
    }
  }
}

export const classroomAudio = new ClassroomAudioService();
