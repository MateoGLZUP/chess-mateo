import type { Profile } from "../lib/types";
import { rankProgress } from "../lib/rank";

export type NavTarget = "train" | "rush" | "themes" | "review" | "daily";

interface Props {
  profile: Profile;
  dueCount: number;
  dailyDone: boolean;
  onNav: (t: NavTarget) => void;
}

export default function Home({ profile, dueCount, dailyDone, onNav }: Props) {
  const rp = rankProgress(profile.rating.rating);
  const streak = profile.dailyStreak.count;

  return (
    <div className="home">
      <div className="hero-card">
        <div className="hero-top">
          <div className="hero-avatar">{rp.current.icon}</div>
          <div className="hero-id">
            <div className="hero-rank">{rp.current.name}</div>
            <div className="hero-rating">{profile.rating.rating}</div>
          </div>
          <div className="hero-streak" title="Racha de días seguidos">
            🔥 {streak}
          </div>
        </div>
        <div className="hero-progress">
          <div className="hp-bar">
            <div className="hp-fill" style={{ width: `${rp.pct}%` }} />
          </div>
          <div className="hp-label">
            {rp.next ? `${rp.next.min - profile.rating.rating} pts para ${rp.next.name} ${rp.next.icon}` : "¡Rango máximo! 👑"}
          </div>
        </div>
      </div>

      <div className="mode-grid">
        <button className="mode-card primary" onClick={() => onNav("train")}>
          <span className="mc-icon">▶</span>
          <span className="mc-text">
            <b>Entrenar</b>
            <small>Puzzles a tu nivel, sin parar</small>
          </span>
        </button>

        <button className="mode-card" onClick={() => onNav("rush")}>
          <span className="mc-icon">⚡</span>
          <span className="mc-text">
            <b>Puzzle Rush</b>
            <small>3 vidas · récord: {profile.rushBest}</small>
          </span>
        </button>

        <button className="mode-card" onClick={() => onNav("themes")}>
          <span className="mc-icon">🎯</span>
          <span className="mc-text">
            <b>Por tema</b>
            <small>Tenedor, clavada, mates, finales…</small>
          </span>
        </button>

        <button className="mode-card" onClick={() => onNav("review")}>
          <span className="mc-icon">🔁</span>
          <span className="mc-text">
            <b>Repasos</b>
            <small>{dueCount > 0 ? `${dueCount} pendiente${dueCount > 1 ? "s" : ""}` : "Sin repasos pendientes"}</small>
          </span>
          {dueCount > 0 && <span className="mc-badge">{dueCount}</span>}
        </button>

        <button className="mode-card" onClick={() => onNav("daily")}>
          <span className="mc-icon">📅</span>
          <span className="mc-text">
            <b>Puzzle del día</b>
            <small>{dailyDone ? "✓ Resuelto hoy" : "Uno nuevo cada día"}</small>
          </span>
          {dailyDone && <span className="mc-check">✓</span>}
        </button>
      </div>
    </div>
  );
}
