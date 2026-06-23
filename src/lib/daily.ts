import type { Puzzle } from "./types";

/** Clave de fecha local YYYY-MM-DD. */
export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function yesterdayKey(d = new Date()): string {
  const y = new Date(d.getTime() - 86400000);
  return todayKey(y);
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Puzzle del dia: el mismo para todos en una fecha dada (determinista). */
export function dailyPuzzle(all: Puzzle[], d = new Date()): Puzzle | null {
  if (!all.length) return null;
  const h = hashStr(todayKey(d));
  return all[h % all.length];
}

/** Actualiza la racha de dias seguidos. Devuelve true si subio (nuevo dia). */
export function bumpDailyStreak(streak: { count: number; lastDay: string }): { count: number; lastDay: string; isNewDay: boolean } {
  const today = todayKey();
  if (streak.lastDay === today) return { ...streak, isNewDay: false };
  const yest = yesterdayKey();
  const count = streak.lastDay === yest ? streak.count + 1 : 1;
  return { count, lastDay: today, isNewDay: true };
}
