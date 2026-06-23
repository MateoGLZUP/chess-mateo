import { useEffect, useRef, useState } from "react";
import Board from "./Board";
import { PuzzleSession } from "../lib/session";
import type { Puzzle } from "../lib/types";
import { prettyThemes, themeTip } from "../lib/themes";

interface Props {
  puzzle: Puzzle;
  isReview: boolean;
  onResult: (clean: boolean) => { delta: number; newRating: number };
  onNext: () => void;
}

type Flash = "right" | "wrong" | null;

export default function PuzzleScreen({ puzzle, isReview, onResult, onNext }: Props) {
  const sessionRef = useRef<PuzzleSession>(new PuzzleSession(puzzle));
  const [, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);

  const [locked, setLocked] = useState(false);
  const [flash, setFlash] = useState<Flash>(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState<{ clean: boolean; delta: number; newRating: number } | null>(null);

  const failedRef = useRef(false);
  const resultDoneRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const session = sessionRef.current;

  function finish() {
    if (resultDoneRef.current) return;
    resultDoneRef.current = true;
    const clean = !failedRef.current && hintLevel < 2;
    const info = onResult(clean);
    setSummary({ clean, delta: info.delta, newRating: info.newRating });
    setDone(true);
    setLocked(true);
  }

  function onUserMove(from: string, to: string) {
    if (locked || done) return;
    const r = session.tryMove(from, to);

    if (r.kind === "wrong") {
      failedRef.current = true;
      setFlash("wrong");
      bump(); // el tablero vuelve a la posicion de session.fen
      window.setTimeout(() => {
        if (aliveRef.current) setFlash(null);
      }, 700);
      return;
    }

    if (r.kind === "solved") {
      setFlash("right");
      bump();
      window.setTimeout(() => {
        if (!aliveRef.current) return;
        setFlash(null);
        finish();
      }, 350);
      return;
    }

    // correcto, pero el puzzle sigue: el rival responde
    setFlash("right");
    setLocked(true);
    bump();
    window.setTimeout(() => {
      if (!aliveRef.current) return;
      session.force(r.opponentUci);
      setLocked(false);
      setFlash(null);
      bump();
    }, 450);
  }

  function useHint() {
    if (done) return;
    setHintLevel((l) => Math.min(2, l + 1));
  }

  function revealSolution() {
    if (done) return;
    failedRef.current = true;
    setLocked(true);
    const rem = session.remainingMoves();
    let i = 0;
    const step = () => {
      if (!aliveRef.current) return;
      if (i >= rem.length) {
        finish();
        return;
      }
      session.force(rem[i]);
      i++;
      bump();
      window.setTimeout(step, 650);
    };
    step();
  }

  // pistas: circulo en la pieza (nivel 1) + flecha a la casilla (nivel 2)
  const shapes: any[] = [];
  if (!done && !locked && hintLevel > 0) {
    const exp = session.expected();
    if (exp) {
      shapes.push({ orig: exp.from, brush: "green" });
      if (hintLevel >= 2) shapes.push({ orig: exp.from, dest: exp.to, brush: "green" });
    }
  }

  const interactive = !locked && !done;
  const moverLabel = session.playerColor === "white" ? "blancas" : "negras";
  const tip = themeTip(puzzle.themes);

  return (
    <div className="puzzle">
      {isReview && <div className="review-badge">🔁 Repaso — ya fallaste este, a ver si ahora sí</div>}

      <div className={`board-shell ${flash ?? ""}`}>
        <Board
          fen={session.fen}
          orientation={session.playerColor}
          turnColor={session.turnColor}
          movableColor={interactive ? session.playerColor : undefined}
          dests={interactive ? session.dests() : new Map()}
          lastMove={session.lastMove}
          check={session.inCheck}
          shapes={shapes}
          viewOnly={!interactive}
          onMove={onUserMove}
        />
      </div>

      {!done && (
        <div className={`prompt ${flash ?? ""}`}>
          {flash === "wrong"
            ? "❌ No es la mejor. Inténtalo otra vez."
            : flash === "right"
            ? "✅ ¡Bien!"
            : `Juegan las ${moverLabel} — encuentra la mejor jugada`}
        </div>
      )}

      {done && summary && (
        <div className={`summary ${summary.clean ? "good" : "bad"}`}>
          <div className="summary-title">{summary.clean ? "✅ ¡Resuelto!" : "📖 Aquí estaba la solución"}</div>
          <div className="rating-line">
            Rating <b>{summary.newRating}</b>{" "}
            <span className={summary.delta >= 0 ? "up" : "down"}>
              {summary.delta >= 0 ? "+" : ""}
              {summary.delta}
            </span>
          </div>
          <div className="themes">
            {prettyThemes(puzzle.themes).map((t) => (
              <span key={t} className="chip">
                {t}
              </span>
            ))}
          </div>
          {tip && <div className="tip">💡 {tip}</div>}
          <a
            className="gamelink"
            href={`https://lichess.org/training/${puzzle.id}`}
            target="_blank"
            rel="noreferrer"
          >
            Ver análisis en Lichess ↗
          </a>
        </div>
      )}

      <div className="controls">
        {!done ? (
          <>
            <button className="btn" onClick={useHint} disabled={hintLevel >= 2}>
              💡 Pista {hintLevel > 0 ? `(${hintLevel}/2)` : ""}
            </button>
            <button className="btn ghost" onClick={revealSolution}>
              Ver solución
            </button>
          </>
        ) : (
          <button className="btn primary big" onClick={onNext}>
            Siguiente ▶
          </button>
        )}
      </div>
    </div>
  );
}
