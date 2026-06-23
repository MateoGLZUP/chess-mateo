import { useRef, useState } from "react";
import type { MutableRefObject } from "react";
import PuzzleScreen from "./PuzzleScreen";
import { pickByRating } from "../lib/puzzles";
import { play } from "../lib/sound";
import type { Puzzle, Profile, Settings } from "../lib/types";

interface Props {
  puzzles: Puzzle[];
  profileRef: MutableRefObject<Profile>;
  settings: Settings;
  onFinish: (score: number, missedIds: string[]) => { best: number; isRecord: boolean };
  onHome: () => void;
}

const MAX_LIVES = 3;

export default function RushView({ puzzles, profileRef, settings, onFinish, onHome }: Props) {
  const startTarget = Math.max(600, profileRef.current.rating.rating - 300);
  const usedRef = useRef<Set<string>>(new Set());
  const targetRef = useRef(startTarget);

  const scoreRef = useRef(0);
  const livesRef = useRef(MAX_LIVES);
  const missedRef = useRef<string[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [seq, setSeq] = useState(0);
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<{ score: number; best: number; isRecord: boolean } | null>(null);

  const firstPuzzle = (): Puzzle => {
    const p = pickByRating(puzzles, targetRef.current, usedRef.current);
    usedRef.current.add(p.id);
    return p;
  };
  const [current, setCurrent] = useState<Puzzle>(firstPuzzle);

  function advance() {
    const p = pickByRating(puzzles, targetRef.current, usedRef.current);
    usedRef.current.add(p.id);
    setCurrent(p);
    setSeq((s) => s + 1);
  }

  function end(finalScore: number) {
    play("lose", settings);
    const res = onFinish(finalScore, missedRef.current);
    setResult({ score: finalScore, ...res });
    setFinished(true);
  }

  function handleRush(solved: boolean) {
    if (solved) {
      scoreRef.current += 1;
      targetRef.current += 25;
      setScore(scoreRef.current);
      advance();
    } else {
      missedRef.current.push(current.id);
      livesRef.current -= 1;
      setLives(livesRef.current);
      if (livesRef.current <= 0) end(scoreRef.current);
      else advance();
    }
  }

  function restart() {
    usedRef.current = new Set();
    targetRef.current = startTarget;
    scoreRef.current = 0;
    livesRef.current = MAX_LIVES;
    missedRef.current = [];
    setScore(0);
    setLives(MAX_LIVES);
    setFinished(false);
    setResult(null);
    const p = pickByRating(puzzles, targetRef.current, usedRef.current);
    usedRef.current.add(p.id);
    setCurrent(p);
    setSeq((s) => s + 1);
  }

  if (finished && result) {
    return (
      <div className="rush">
        <div className="sub-header">
          <button className="back-btn" onClick={onHome} aria-label="Volver">
            ←
          </button>
          <div className="sub-title">⚡ Puzzle Rush</div>
          <div className="sub-count" />
        </div>
        <div className="view-body">
          <div className="rush-result">
            <div className="rr-icon">{result.isRecord ? "🏆" : "⚡"}</div>
            <div className="rr-score">{result.score}</div>
            <div className="rr-label">resueltos seguidos</div>
            {result.isRecord ? (
              <div className="rr-record">¡Nuevo récord! 🎉</div>
            ) : (
              <div className="rr-best">Tu récord: {result.best}</div>
            )}
            <div className="rush-actions">
              <button className="btn primary big" onClick={restart}>
                Otra vez ⚡
              </button>
              <button className="btn ghost" onClick={onHome}>
                Inicio
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rush">
      <div className="sub-header">
        <button className="back-btn" onClick={onHome} aria-label="Volver">
          ←
        </button>
        <div className="sub-title">⚡ Puzzle Rush</div>
        <div className="sub-count" />
      </div>
      <div className="view-body">
        <div className="rush-hud">
          <div className="rush-score">{score}</div>
          <div className="rush-lives">
            {Array.from({ length: MAX_LIVES }).map((_, i) => (
              <span key={i} className="heart">
                {i < lives ? "❤️" : "🤍"}
              </span>
            ))}
          </div>
        </div>
        <PuzzleScreen key={seq} puzzle={current} settings={settings} variant="rush" onRush={handleRush} />
      </div>
    </div>
  );
}
