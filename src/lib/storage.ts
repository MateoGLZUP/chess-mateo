import type { Profile } from "./types";
import { defaultRating } from "./glicko";

const KEY = "chessmateo:v1";

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
    lastPlayed: 0
  };
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultProfile();
    const p = JSON.parse(raw);
    return {
      ...defaultProfile(),
      ...p,
      rating: { ...defaultRating(1000), ...(p.rating || {}) }
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
