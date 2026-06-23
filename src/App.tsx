import { useCallback, useEffect, useRef, useState } from "react";
import PuzzleScreen from "./components/PuzzleScreen";
import Dashboard from "./components/Dashboard";
import { loadPuzzles, selectNext } from "./lib/puzzles";
import { loadProfile, saveProfile } from "./lib/storage";
import { updateRating } from "./lib/glicko";
import { scheduleSrs, dueCount } from "./lib/srs";
import { themeLabel } from "./lib/themes";
import type { Puzzle, Profile } from "./lib/types";

const PUZZLE_RD = 50; // incertidumbre asumida del rating del puzzle

export default function App() {
  const [puzzles, setPuzzles] = useState<Puzzle[] | null>(null);
  const [profile, setProfile] = useState<Profile>(() => loadProfile());
  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const [view, setView] = useState<"play" | "stats">("play");
  const [themeFilter, setThemeFilter] = useState<string | undefined>(undefined);
  const [current, setCurrent] = useState<{ puzzle: Puzzle; isReview: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Gancho de depuracion (solo con #debug en la URL): expone el puzzle actual
  // para las pruebas automatizadas. Invisible en uso normal.
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash.includes("debug")) {
      (window as any).__cm = { puzzle: current?.puzzle ?? null, view };
    }
  }, [current, view]);

  useEffect(() => {
    loadPuzzles()
      .then(setPuzzles)
      .catch((e) => setError(e?.message || String(e)));
  }, []);

  const pick = useCallback(
    (filter: string | undefined) => {
      const ps = puzzles;
      if (!ps) return;
      const sel = selectNext(ps, profileRef.current, filter);
      setCurrent(sel.puzzle ? { puzzle: sel.puzzle, isReview: sel.isReview } : null);
    },
    [puzzles]
  );

  // primer puzzle al cargar
  useEffect(() => {
    if (puzzles && !current) pick(themeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzles]);

  const recordResult = useCallback((clean: boolean) => {
    const cur = current;
    const pr = profileRef.current;
    if (!cur) return { delta: 0, newRating: pr.rating.rating };

    const puzzle = cur.puzzle;
    const before = pr.rating.rating;
    const newR = updateRating(pr.rating, puzzle.rating, PUZZLE_RD, clean ? 1 : 0);
    const streak = clean ? pr.currentStreak + 1 : 0;

    const next: Profile = {
      ...pr,
      rating: newR,
      totalAttempts: pr.totalAttempts + 1,
      totalClean: pr.totalClean + (clean ? 1 : 0),
      currentStreak: streak,
      bestStreak: Math.max(pr.bestStreak, streak),
      solvedIds: pr.solvedIds.includes(puzzle.id) ? pr.solvedIds : [...pr.solvedIds, puzzle.id],
      byTheme: { ...pr.byTheme },
      history: [...pr.history, { t: Date.now(), r: newR.rating }].slice(-300),
      srs: pr.srs.slice(),
      lastPlayed: Date.now()
    };

    for (const th of puzzle.themes) {
      const s = next.byTheme[th] || { solved: 0, failed: 0 };
      next.byTheme[th] = clean
        ? { solved: s.solved + 1, failed: s.failed }
        : { solved: s.solved, failed: s.failed + 1 };
    }

    scheduleSrs(next, puzzle.id, clean, cur.isReview);
    saveProfile(next);
    profileRef.current = next;
    setProfile(next);
    return { delta: newR.rating - before, newRating: newR.rating };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  function handleNext() {
    pick(themeFilter);
  }

  function trainTheme(theme: string) {
    setThemeFilter(theme);
    setView("play");
    pick(theme);
  }

  function clearFilter() {
    setThemeFilter(undefined);
    pick(undefined);
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">♞ Chess Mateo</div>
        <div className="rating-badge" title="Tu rating de táctica">
          {profile.rating.rating}
        </div>
      </header>

      {error && <div className="error">⚠️ {error}</div>}

      {view === "play" && (
        <main className="screen">
          {themeFilter && (
            <div className="filter-banner">
              <span>
                Entrenando: <b>{themeLabel(themeFilter)}</b>
              </span>
              <button onClick={clearFilter}>✕ modo libre</button>
            </div>
          )}
          {!puzzles && !error && <div className="loading">Cargando puzzles…</div>}
          {puzzles && current && (
            <PuzzleScreen
              key={current.puzzle.id}
              puzzle={current.puzzle}
              isReview={current.isReview}
              onResult={recordResult}
              onNext={handleNext}
            />
          )}
          {puzzles && !current && (
            <div className="empty">
              No hay más puzzles con este filtro.{" "}
              <button className="btn" onClick={clearFilter}>
                Volver a modo libre
              </button>
            </div>
          )}
        </main>
      )}

      {view === "stats" && (
        <main className="screen">
          <Dashboard profile={profile} dueCount={dueCount(profile)} onTrainTheme={trainTheme} />
        </main>
      )}

      <nav className="tabbar">
        <button className={view === "play" ? "active" : ""} onClick={() => setView("play")}>
          ♟️ Jugar
        </button>
        <button className={view === "stats" ? "active" : ""} onClick={() => setView("stats")}>
          📊 Progreso
        </button>
      </nav>
    </div>
  );
}
