// High-Fidelity Synthesized Audio Engine for Barcode & QR Scanner
// Supports desktop and mobile with automatic browser user-gesture unlocking

let audioCtx: AudioContext | null = null;
let isAudioUnlocked = false;

/**
 * Initialize and unlock Web Audio Context upon first user interaction
 */
export function unlockAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }

    if (audioCtx) {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
          isAudioUnlocked = true;
        }).catch(() => {});
      } else if (audioCtx.state === 'running') {
        isAudioUnlocked = true;
      }
    }
  } catch (e) {
    console.warn('AudioContext init note:', e);
  }

  return audioCtx;
}

// Global auto-unlock listeners on any user tap/click
if (typeof window !== 'undefined') {
  const unlockEvents = ['click', 'touchstart', 'touchend', 'keydown', 'pointerdown'];
  const handleFirstInteraction = () => {
    unlockAudioContext();
    unlockEvents.forEach(evt => window.removeEventListener(evt, handleFirstInteraction));
  };
  unlockEvents.forEach(evt => window.addEventListener(evt, handleFirstInteraction, { passive: true }));
}

/**
 * Play authentic physical POS Barcode Scanner High-Pitch Double Beep for Successful Match (DONE)
 */
export function playMatchSuccessSound() {
  try {
    const ctx = unlockAudioContext();
    if (!ctx) return;

    const playBeep = () => {
      const now = ctx.currentTime;

      // Tone 1: High crisp frequency 1760Hz (A6)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1760, now);
      gain1.gain.setValueAtTime(0.7, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.08);

      // Tone 2: Extra high crisp frequency 2400Hz
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(2400, now + 0.07);
      gain2.gain.setValueAtTime(0.8, now + 0.07);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.20);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.07);
      osc2.stop(now + 0.20);

      // Mobile haptic vibration if available
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([80, 40, 80]);
        } catch {}
      }
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(playBeep).catch(playBeep);
    } else {
      playBeep();
    }
  } catch (e) {
    console.warn('Success sound error:', e);
  }
}

/**
 * Play distinct low double buzzer sound for Unmatched / Error / Failed Barcode (FAIL)
 */
export function playMatchFailSound() {
  try {
    const ctx = unlockAudioContext();
    if (!ctx) return;

    const playBuzz = () => {
      const now = ctx.currentTime;

      // Tone 1: Low 160Hz sawtooth wave
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(160, now);
      gain1.gain.setValueAtTime(0.65, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.14);

      // Tone 2: Lower 120Hz sawtooth wave
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(120, now + 0.12);
      gain2.gain.setValueAtTime(0.7, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.32);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.32);

      // Mobile long haptic vibration for error
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([200, 70, 200]);
        } catch {}
      }
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(playBuzz).catch(playBuzz);
    } else {
      playBuzz();
    }
  } catch (e) {
    console.warn('Fail sound error:', e);
  }
}
