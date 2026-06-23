import type { Puzzle, Profile } from "./types";

let cache: Puzzle[] | null = null;
let mapCache: Map<string, Puzzle> | null = null;

export async function loadPuzzles(): Promise<Puzzle[]> {
  if (cache) return cache;
  const res = await fetch(import.meta.env.BASE_URL + "data/puzzles.json");
  if (!res.ok) throw new Error("No se pudo cargar la base de puzzles.");
  cache = (await res.json()) as Puzzle[];
  mapCache = new Map(cache.map((p) => [p.id, p]));
  return cache;
}

export function byId(id: string): Puzzle | undefined {
  return mapCache?.get(id);
}

export interface Selection {
  puzzle: Puzzle | null;
  isReview: boolean;
}

/**
 * Elige el siguiente puzzle:
 *  1. Repasos pendientes (repeticion espaciada) — solo en modo libre.
 *  2. Un puzzle nuevo cerca de tu rating (ligeramente mas dificil para que avances).
 *  Excluye los ya resueltos y prioriza los mas populares (mejor calidad).
 */
export function selectNext(
  all: Puzzle[],
  profile: Profile,
  themeFilter?: string
): Selection {
  const now = Date.now();

  if (!themeFilter && mapCache) {
    const due = profile.srs
      .filter((s) => s.dueAt <= now)
      .sort((a, b) => a.dueAt - b.dueAt);
    for (const s of due) {
      const p = mapCache.get(s.id);
      if (p) return { puzzle: p, isReview: true };
    }
  }

  const solved = new Set(profile.solvedIds);
  let pool = all.filter((p) => !solved.has(p.id));
  if (themeFilter) pool = pool.filter((p) => p.themes.includes(themeFilter));

  // si ya resolviste todo lo disponible, permitimos repetir
  if (pool.length === 0) {
    pool = themeFilter ? all.filter((p) => p.themes.includes(themeFilter)) : all.slice();
  }
  if (pool.length === 0) return { puzzle: null, isReview: false };

  const target = profile.rating.rating;
  let lo = target - 60;
  let hi = target + 110; // sesgo: un pelin mas dificil para empujar la mejora
  let win = pool.filter((p) => p.rating >= lo && p.rating <= hi);
  let guard = 0;
  while (win.length < 8 && guard < 15) {
    lo -= 80;
    hi += 80;
    win = pool.filter((p) => p.rating >= lo && p.rating <= hi);
    guard++;
  }
  if (win.length === 0) win = pool;

  win.sort(
    (a, b) =>
      b.popularity - a.popularity ||
      Math.abs(a.rating - target) - Math.abs(b.rating - target)
  );

  // un poco de azar entre los mejores candidatos para no ser repetitivo
  const k = Math.min(30, win.length);
  const choice = win[Math.floor(Math.random() * k)];
  return { puzzle: choice, isReview: false };
}
