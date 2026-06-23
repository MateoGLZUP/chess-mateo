import { useState } from "react";
import type { MutableRefObject } from "react";
import PuzzleScreen, { ResultInfo } from "./PuzzleScreen";
import { selectNext, pickDue } from "../lib/puzzles";
import { weakestMotif } from "../lib/coach";
import type { Puzzle, Profile, Settings } from "../lib/types";

export type TrainMode = "adaptive" | "theme" | "review" | "daily" | "coach";

interface Props {
  puzzles: Puzzle[];
  profileRef: MutableRefObject<Profile>;
  settings: Settings;
  mode: TrainMode;
  theme?: string;
  fixedPuzzle?: Puzzle | null;
  title: string;
  recordResult: (puzzle: Puzzle, isReview: boolean, clean: boolean) => ResultInfo;
  onDailyDone?: (puzzle: Puzzle) => void;
  onHome: () => void;
}

interface Current {
  puzzle: Puzzle;
  isReview: boolean;
}

export default function TrainView({
  puzzles,
  profileRef,
  settings,
  mode,
  theme,
  fixedPuzzle,
  title,
  recordResult,
  onDailyDone,
  onHome
}: Props) {
  const themeForSelect = (): string | undefined => {
    if (mode === "theme") return theme;
    if (mode === "coach") return weakestMotif(profileRef.current);
    return undefined;
  };

  const pickFirst = (): Current | null => {
    if (mode === "daily") return fixedPuzzle ? { puzzle: fixedPuzzle, isReview: false } : null;
    if (mode === "review") {
      const p = pickDue(profileRef.current);
      return p ? { puzzle: p, isReview: true } : null;
    }
    const s = selectNext(puzzles, profileRef.current, themeForSelect());
    return s.puzzle ? { puzzle: s.puzzle, isReview: s.isReview } : null;
  };

  const [current, setCurrent] = useState<Current | null>(pickFirst);
  const [seq, setSeq] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [reviewFinished, setReviewFinished] = useState(false);

  function handleResult(clean: boolean): ResultInfo {
    const cur = current!;
    const info = recordResult(cur.puzzle, cur.isReview, clean);
    if (clean) setSolvedCount((c) => c + 1);
    if (mode === "daily") onDailyDone?.(cur.puzzle);
    return info;
  }

  function handleNext() {
    if (mode === "daily") {
      onHome();
      return;
    }
    if (mode === "review") {
      const p = pickDue(profileRef.current);
      if (!p) {
        setReviewFinished(true);
        setCurrent(null);
        return;
      }
      setCurrent({ puzzle: p, isReview: true });
      setSeq((s) => s + 1);
      return;
    }
    const s = selectNext(puzzles, profileRef.current, themeForSelect());
    setCurrent(s.puzzle ? { puzzle: s.puzzle, isReview: s.isReview } : null);
    setSeq((s2) => s2 + 1);
  }

  return (
    <div className="train">
      <div className="sub-header">
        <button className="back-btn" onClick={onHome} aria-label="Volver">
          ←
        </button>
        <div className="sub-title">{title}</div>
        <div className="sub-count">{solvedCount > 0 ? `✓ ${solvedCount}` : ""}</div>
      </div>

      <div className="view-body">
        {!current ? (
          <div className="train-empty">
            {mode === "review" && reviewFinished ? (
              <>
                <div className="te-big">🎉</div>
                <p>¡No te quedan repasos! Volverán solos cuando falles puzzles nuevos.</p>
              </>
            ) : mode === "review" ? (
              <>
                <div className="te-big">✅</div>
                <p>No tienes repasos pendientes. Entrena un rato y los que falles aparecerán aquí.</p>
              </>
            ) : (
              <p>No hay puzzles disponibles aquí.</p>
            )}
            <button className="btn primary" onClick={onHome}>
              Volver al inicio
            </button>
          </div>
        ) : (
          <PuzzleScreen
            key={seq}
            puzzle={current.puzzle}
            settings={settings}
            isReview={current.isReview}
            coachMode={mode === "coach"}
            nextLabel={mode === "daily" ? "Listo ✓" : "Siguiente ▶"}
            onResult={handleResult}
            onNext={handleNext}
          />
        )}
      </div>
    </div>
  );
}
