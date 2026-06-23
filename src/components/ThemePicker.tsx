import { useMemo } from "react";
import type { Puzzle, Profile } from "../lib/types";
import { themeLabel } from "../lib/themes";

interface Props {
  puzzles: Puzzle[];
  profile: Profile;
  onPick: (theme: string) => void;
  onHome: () => void;
}

// Motivos que ofrecemos para entrenar (en orden didáctico).
const OFFER = [
  "mateIn1",
  "mateIn2",
  "mateIn3",
  "fork",
  "pin",
  "skewer",
  "hangingPiece",
  "discoveredAttack",
  "doubleCheck",
  "sacrifice",
  "deflection",
  "attraction",
  "trappedPiece",
  "intermezzo",
  "quietMove",
  "backRankMate",
  "advancedPawn",
  "promotion",
  "endgame",
  "rookEndgame",
  "pawnEndgame"
];

export default function ThemePicker({ puzzles, profile, onPick, onHome }: Props) {
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of puzzles) for (const t of p.themes) c[t] = (c[t] || 0) + 1;
    return c;
  }, [puzzles]);

  const list = OFFER.filter((t) => (counts[t] || 0) >= 12);

  return (
    <div className="theme-picker">
      <div className="sub-header">
        <button className="back-btn" onClick={onHome} aria-label="Volver">
          ←
        </button>
        <div className="sub-title">🎯 Entrenar por tema</div>
        <div className="sub-count" />
      </div>

      <div className="theme-grid">
        {list.map((t) => {
          const st = profile.byTheme[t];
          const total = st ? st.solved + st.failed : 0;
          const acc = total >= 1 ? Math.round((100 * st.solved) / total) : null;
          return (
            <button key={t} className="theme-card" onClick={() => onPick(t)}>
              <b>{themeLabel(t)}</b>
              <small>
                {counts[t]} puzzles{acc !== null ? ` · ${acc}% acierto` : ""}
              </small>
              {acc !== null && (
                <span className="theme-acc">
                  <span style={{ width: `${acc}%` }} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
