import type { Profile, Settings } from "./types";
import { defaultRating } from "./glicko";

const KEY = "chessmateo:v1";

export function defaultSettings(): Settings {
  return {
    boardTheme: "green",
    sounds: true,
    haptics: true,
    coordinates: true
  };
}

export function defaultProfile(): Profile {
  return {
    rating: defaultRating(1000),
    totalAttempts: 0,
    totalClean: 0,
    currentStreak: 0,
    bestStreak: 0,
    solvedIds: [],
    byTheme: {},
    history: [],
    srs: [],
    lastPlayed: 0,
    onboarded: false,
    dailyStreak: { count: 0, lastDay: "" },
    rushBest: 0,
    dailyDoneDate: "",
    settings: defaultSettings()
  };
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultProfile();
    const p = JSON.parse(raw);
    const base = defaultProfile();
    return {
      ...base,
      ...p,
      rating: { ...base.rating, ...(p.rating || {}) },
      dailyStreak: { ...base.dailyStreak, ...(p.dailyStreak || {}) },
      settings: { ...base.settings, ...(p.settings || {}) }
    };
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(p: Profile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // sin espacio o modo privado: ignoramos
  }
}

export function resetProfile(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

/** Exporta el progreso como string JSON (para respaldo). */
export function exportProfile(p: Profile): string {
  return JSON.stringify(p);
}

/** Importa un progreso desde JSON. Devuelve null si es invalido. */
export function importProfile(json: string): Profile | null {
  try {
    const p = JSON.parse(json);
    if (!p || typeof p !== "object" || !p.rating) return null;
    const base = defaultProfile();
    return {
      ...base,
      ...p,
      rating: { ...base.rating, ...(p.rating || {}) },
      dailyStreak: { ...base.dailyStreak, ...(p.dailyStreak || {}) },
      settings: { ...base.settings, ...(p.settings || {}) }
    };
  } catch {
    return null;
  }
}
