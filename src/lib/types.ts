export interface Puzzle {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  popularity: number;
  themes: string[];
  openings: string[];
}

export interface PlayerRating {
  rating: number;
  rd: number; // rating deviation (incertidumbre)
  vol: number; // volatilidad
}

export interface ThemeStat {
  solved: number;
  failed: number;
}

export interface SrsItem {
  id: string;
  dueAt: number; // timestamp en ms
  interval: number; // dias
  fails: number;
}

export type BoardTheme = "green" | "brown" | "blue";

export interface Settings {
  boardTheme: BoardTheme;
  sounds: boolean;
  haptics: boolean;
  coordinates: boolean;
}

export interface Profile {
  rating: PlayerRating;
  totalAttempts: number;
  totalClean: number; // resueltos sin ayuda ni error
  currentStreak: number;
  bestStreak: number;
  solvedIds: string[];
  byTheme: Record<string, ThemeStat>;
  history: { t: number; r: number }[];
  srs: SrsItem[];
  lastPlayed: number;

  // onboarding y gamificacion
  onboarded: boolean;
  dailyStreak: { count: number; lastDay: string }; // racha de dias seguidos
  rushBest: number;
  dailyDoneDate: string; // ultima fecha en que resolvio el puzzle del dia
  settings: Settings;
}
