// Rangos tematicos de ajedrez segun el rating (de Peon a Rey).
export interface Rank {
  key: string;
  name: string;
  icon: string;
  min: number;
}

export const RANKS: Rank[] = [
  { key: "pawn", name: "Peón", icon: "♟", min: 0 },
  { key: "knight", name: "Caballo", icon: "♞", min: 800 },
  { key: "bishop", name: "Alfil", icon: "♝", min: 1100 },
  { key: "rook", name: "Torre", icon: "♜", min: 1400 },
  { key: "queen", name: "Dama", icon: "♛", min: 1700 },
  { key: "king", name: "Rey", icon: "♚", min: 2000 }
];

export function rankFor(rating: number): Rank {
  let r = RANKS[0];
  for (const rank of RANKS) if (rating >= rank.min) r = rank;
  return r;
}

export function rankIndex(rating: number): number {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) if (rating >= RANKS[i].min) idx = i;
  return idx;
}

export interface RankProgress {
  current: Rank;
  next: Rank | null;
  pct: number; // 0..100 hacia el siguiente rango
}

export function rankProgress(rating: number): RankProgress {
  const i = rankIndex(rating);
  const current = RANKS[i];
  const next = RANKS[i + 1] ?? null;
  if (!next) return { current, next: null, pct: 100 };
  const pct = Math.max(0, Math.min(100, ((rating - current.min) / (next.min - current.min)) * 100));
  return { current, next, pct };
}
