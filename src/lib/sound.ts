import type { Settings } from "./types";

// Sonidos generados con Web Audio (sin archivos). Se desbloquean solos en el
// primer gesto del usuario (al mover una pieza), como requiere iOS.
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as any).webkitAudioContext;
    if (!C) return null;
    try {
      ctx = new C();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function tone(c: AudioContext, freq: number, t0: number, dur: number, type: OscillatorType = "triangle", peak = 0.16) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.connect(g);
  g.connect(c.destination);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.start(t0);
  o.stop(t0 + dur + 0.03);
}

export type SoundName = "move" | "capture" | "correct" | "wrong" | "win" | "lose" | "tick";

export function play(name: SoundName, settings: Settings) {
  if (!settings.sounds) return;
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  switch (name) {
    case "move":
      tone(c, 300, t, 0.07, "triangle", 0.1);
      break;
    case "capture":
      tone(c, 180, t, 0.09, "triangle", 0.14);
      break;
    case "correct":
      tone(c, 660, t, 0.1, "triangle", 0.15);
      tone(c, 990, t + 0.08, 0.12, "triangle", 0.15);
      break;
    case "wrong":
      tone(c, 165, t, 0.22, "sawtooth", 0.12);
      break;
    case "win":
      [523, 659, 784, 1047].forEach((f, i) => tone(c, f, t + i * 0.09, 0.16, "triangle", 0.15));
      break;
    case "lose":
      [440, 330, 220].forEach((f, i) => tone(c, f, t + i * 0.12, 0.2, "sawtooth", 0.13));
      break;
    case "tick":
      tone(c, 880, t, 0.03, "square", 0.06);
      break;
  }
}

export function haptic(settings: Settings, ms = 12) {
  if (settings.haptics && typeof navigator !== "undefined" && (navigator as any).vibrate) {
    try {
      (navigator as any).vibrate(ms);
    } catch {
      /* iOS Safari no soporta vibrate: no-op */
    }
  }
}
