import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Onboarding from "./components/Onboarding";
import Home, { NavTarget } from "./components/Home";
import TrainView, { TrainMode } from "./components/TrainView";
import RushView from "./components/RushView";
import ThemePicker from "./components/ThemePicker";
import SettingsView from "./components/Settings";
import Dashboard from "./components/Dashboard";
import Confetti from "./components/Confetti";
import type { ResultInfo } from "./components/PuzzleScreen";
import { loadPuzzles } from "./lib/puzzles";
import { loadProfile, saveProfile, defaultProfile, resetProfile, importProfile } from "./lib/storage";
import { updateRating, defaultRating } from "./lib/glicko";
import { scheduleSrs, dueCount } from "./lib/srs";
import { bumpDailyStreak, todayKey, dailyPuzzle } from "./lib/daily";
import { rankIndex } from "./lib/rank";
import { themeLabel } from "./lib/themes";
import type { Puzzle, Profile, Settings } from "./lib/types";

const PUZZLE_RD = 50;

type Nav =
  | { s: "home" }
  | { s: "train"; mode: TrainMode; theme?: string }
  | { s: "rush" }
  | { s: "themes" }
  | { s: "daily" }
  | { s: "stats" }
  | { s: "settings" };

export default function App() {
  const [puzzles, setPuzzles] = useState<Puzzle[] | null>(null);
  const [profile, setProfile] = useState<Profile>(() => loadProfile());
  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const [nav, setNav] = useState<Nav>({ s: "home" });
  const [error, setError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState<"rankup" | "rush" | null>(null);
  const celebrateTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    loadPuzzles()
      .then(setPuzzles)
      .catch((e) => setError(e?.message || String(e)));
  }, []);

  // Gancho de depuración (solo con #debug en la URL).
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash.includes("debug")) {
      (window as any).__cm = { nav, profile };
    }
  }, [nav, profile]);

  function persist(next: Profile) {
    saveProfile(next);
    profileRef.current = next;
    setProfile(next);
  }

  function fireCelebration(kind: "rankup" | "rush") {
    setCelebrate(kind);
    window.clearTimeout(celebrateTimer.current);
    celebrateTimer.current = window.setTimeout(() => setCelebrate(null), 2400);
  }

  function recordResult(puzzle: Puzzle, isReview: boolean, clean: boolean): ResultInfo {
    const pr = profileRef.current;
    const before = pr.rating.rating;
    const beforeRank = rankIndex(before);
    const newR = updateRating(pr.rating, puzzle.rating, PUZZLE_RD, clean ? 1 : 0);
    const streak = clean ? pr.currentStreak + 1 : 0;
    const ds = bumpDailyStreak(pr.dailyStreak);

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
      lastPlayed: Date.now(),
      dailyStreak: { count: ds.count, lastDay: ds.lastDay }
    };
    for (const th of puzzle.themes) {
      const st = next.byTheme[th] || { solved: 0, failed: 0 };
      next.byTheme[th] = clean ? { solved: st.solved + 1, failed: st.failed } : { solved: st.solved, failed: st.failed + 1 };
    }
    scheduleSrs(next, puzzle.id, clean, isReview);
    persist(next);

    const rankUp = rankIndex(newR.rating) > beforeRank;
    if (rankUp) fireCelebration("rankup");
    return { delta: newR.rating - before, newRating: newR.rating, rankUp };
  }

  function onRushFinish(score: number) {
    const pr = profileRef.current;
    const isRecord = score > pr.rushBest;
    const best = Math.max(score, pr.rushBest);
    const ds = bumpDailyStreak(pr.dailyStreak);
    persist({ ...pr, rushBest: best, dailyStreak: { count: ds.count, lastDay: ds.lastDay }, lastPlayed: Date.now() });
    if (isRecord && score > 0) fireCelebration("rush");
    return { best, isRecord: isRecord && score > 0 };
  }

  function onboard(rating: number) {
    persist({ ...profileRef.current, onboarded: true, rating: defaultRating(rating), history: [{ t: Date.now(), r: rating }] });
    setNav({ s: "home" });
  }

  function markDailyDone() {
    persist({ ...profileRef.current, dailyDoneDate: todayKey() });
  }

  function updateSettings(partial: Partial<Settings>) {
    const pr = profileRef.current;
    persist({ ...pr, settings: { ...pr.settings, ...partial } });
  }

  function recalibrate(rating: number) {
    const pr = profileRef.current;
    persist({ ...pr, rating: defaultRating(rating), history: [...pr.history, { t: Date.now(), r: rating }].slice(-300) });
  }

  function doImport(json: string): boolean {
    const imp = importProfile(json);
    if (!imp) return false;
    imp.onboarded = true;
    persist(imp);
    return true;
  }

  function doReset() {
    resetProfile();
    const fresh = defaultProfile();
    profileRef.current = fresh;
    setProfile(fresh);
    setNav({ s: "home" });
  }

  function homeNav(t: NavTarget) {
    if (t === "train") setNav({ s: "train", mode: "adaptive" });
    else if (t === "rush") setNav({ s: "rush" });
    else if (t === "themes") setNav({ s: "themes" });
    else if (t === "review") setNav({ s: "train", mode: "review" });
    else if (t === "daily") setNav({ s: "daily" });
  }

  // --- onboarding gate ---
  if (!profile.onboarded) {
    return (
      <div className="app">
        <Onboarding onPick={onboard} />
      </div>
    );
  }

  const hasSubHeader = nav.s === "train" || nav.s === "rush" || nav.s === "themes" || nav.s === "daily";
  const loading = <div className="loading">Cargando puzzles…</div>;
  const goHome = () => setNav({ s: "home" });

  function trainTitle(n: Extract<Nav, { s: "train" }>): string {
    if (n.mode === "review") return "🔁 Repasos";
    if (n.mode === "theme" && n.theme) return `🎯 ${themeLabel(n.theme)}`;
    return "♟️ Entrenar";
  }

  let content: ReactNode;
  if (nav.s === "home") {
    content = (
      <Home
        profile={profile}
        dueCount={dueCount(profile)}
        dailyDone={profile.dailyDoneDate === todayKey()}
        onNav={homeNav}
      />
    );
  } else if (nav.s === "stats") {
    content = (
      <Dashboard
        profile={profile}
        dueCount={dueCount(profile)}
        onTrainTheme={(t) => setNav({ s: "train", mode: "theme", theme: t })}
      />
    );
  } else if (nav.s === "settings") {
    content = (
      <SettingsView
        profile={profile}
        onChange={updateSettings}
        onRecalibrate={recalibrate}
        onImport={doImport}
        onReset={doReset}
      />
    );
  } else if (nav.s === "themes") {
    content = puzzles ? (
      <ThemePicker
        puzzles={puzzles}
        profile={profile}
        onPick={(t) => setNav({ s: "train", mode: "theme", theme: t })}
        onHome={goHome}
      />
    ) : (
      loading
    );
  } else if (nav.s === "rush") {
    content = puzzles ? (
      <RushView puzzles={puzzles} profileRef={profileRef} settings={profile.settings} onFinish={onRushFinish} onHome={goHome} />
    ) : (
      loading
    );
  } else if (nav.s === "daily") {
    content = puzzles ? (
      <TrainView
        puzzles={puzzles}
        profileRef={profileRef}
        settings={profile.settings}
        mode="daily"
        fixedPuzzle={dailyPuzzle(puzzles)}
        title="📅 Puzzle del día"
        recordResult={recordResult}
        onDailyDone={markDailyDone}
        onHome={goHome}
      />
    ) : (
      loading
    );
  } else {
    // train
    content = puzzles ? (
      <TrainView
        puzzles={puzzles}
        profileRef={profileRef}
        settings={profile.settings}
        mode={nav.mode}
        theme={nav.theme}
        title={trainTitle(nav)}
        recordResult={recordResult}
        onHome={goHome}
      />
    ) : (
      loading
    );
  }

  return (
    <div className="app">
      <Confetti show={!!celebrate} />
      {celebrate && (
        <div className="celebrate-toast">{celebrate === "rankup" ? "🎉 ¡Subiste de rango!" : "🏆 ¡Nuevo récord!"}</div>
      )}

      {!hasSubHeader && (
        <header className="topbar">
          <div className="brand">♞ Chess Mateo</div>
          <div className="rating-badge" title="Tu rating de táctica">
            {profile.rating.rating}
          </div>
        </header>
      )}

      {error && <div className="error">⚠️ {error}</div>}

      {hasSubHeader ? content : <main className="screen">{content}</main>}

      <nav className="tabbar">
        <button className={nav.s === "home" ? "active" : ""} onClick={() => setNav({ s: "home" })}>
          🏠 Inicio
        </button>
        <button
          className={["train", "rush", "themes", "daily"].includes(nav.s) ? "active" : ""}
          onClick={() => setNav({ s: "train", mode: "adaptive" })}
        >
          ♟️ Entrenar
        </button>
        <button className={nav.s === "stats" ? "active" : ""} onClick={() => setNav({ s: "stats" })}>
          📊 Progreso
        </button>
        <button className={nav.s === "settings" ? "active" : ""} onClick={() => setNav({ s: "settings" })}>
          ⚙️ Ajustes
        </button>
      </nav>
    </div>
  );
}
