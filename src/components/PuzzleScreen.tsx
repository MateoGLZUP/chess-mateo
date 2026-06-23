import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import Board from "./Board";
import { PuzzleSession } from "../lib/session";
import type { Puzzle, Settings } from "../lib/types";
import { prettyThemes, themeTip } from "../lib/themes";
import { play, haptic } from "../lib/sound";
import { analyze, stopAnalysis, evalText, whiteWinProb, uciLineToSan, engineSupported, type Analysis } from "../lib/engine";

export interface ResultInfo {
  delta: number;
  newRating: number;
  rankUp: boolean;
}

interface Props {
  puzzle: Puzzle;
  settings: Settings;
  isReview?: boolean;
  variant?: "normal" | "rush";
  nextLabel?: string;
  onResult?: (clean: boolean) => ResultInfo; // modo normal
  onNext?: () => void; // modo normal
  onRush?: (solved: boolean) => void; // modo rush: true=resuelto, false=fallo
}

type Flash = "right" | "wrong" | null;

export default function PuzzleScreen({ puzzle, settings, isReview, variant = "normal", nextLabel, onResult, onNext, onRush }: Props) {
  const sessionRef = useRef<PuzzleSession>(new PuzzleSession(puzzle));
  const [, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);

  const [locked, setLocked] = useState(false);
  const [flash, setFlash] = useState<Flash>(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState<(ResultInfo & { clean: boolean }) | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [terminal, setTerminal] = useState<{ label: string; prob: number } | null>(null);

  const failedRef = useRef(false);
  const resultDoneRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // Gancho de depuración: expone el puzzle actual para las pruebas (#debug).
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash.includes("debug")) {
      (window as any).__cmPuzzle = puzzle;
    }
  }, [puzzle]);

  // Análisis del motor al terminar el puzzle (no en Rush).
  useEffect(() => {
    if (!done || variant === "rush" || !engineSupported()) return;
    let cancelled = false;
    const fen = session.fen;

    // Posición terminal: no hace falta el motor.
    const c = new Chess(fen);
    if (c.isGameOver()) {
      if (c.isCheckmate()) {
        const whiteMated = c.turn() === "w";
        setTerminal({ label: "Jaque mate", prob: whiteMated ? 0 : 1 });
      } else {
        setTerminal({ label: "Tablas", prob: 0.5 });
      }
      setAnalysis(null);
      setAnalyzing(false);
      return;
    }

    setTerminal(null);
    setAnalysis(null);
    setAnalyzing(true);
    analyze(fen, { movetime: 900 })
      .then((a) => {
        if (!cancelled) {
          setAnalysis(a);
          setAnalyzing(false);
        }
      })
      .catch(() => {
        if (!cancelled) setAnalyzing(false);
      });
    return () => {
      cancelled = true;
      stopAnalysis();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const session = sessionRef.current;
  const isRush = variant === "rush";

  function finishNormal() {
    if (resultDoneRef.current) return;
    resultDoneRef.current = true;
    const clean = !failedRef.current && hintLevel < 2;
    const info = onResult ? onResult(clean) : { delta: 0, newRating: 0, rankUp: false };
    setSummary({ ...info, clean });
    setDone(true);
    setLocked(true);
  }

  function onUserMove(from: string, to: string) {
    if (locked || done) return;
    const r = session.tryMove(from, to);

    if (r.kind === "wrong") {
      failedRef.current = true;
      play("wrong", settings);
      haptic(settings, 30);
      setFlash("wrong");
      bump();
      if (isRush) {
        setLocked(true);
        window.setTimeout(() => {
          if (aliveRef.current) onRush?.(false);
        }, 500);
      } else {
        window.setTimeout(() => {
          if (aliveRef.current) setFlash(null);
        }, 700);
      }
      return;
    }

    if (r.kind === "solved") {
      play(isRush ? "correct" : "win", settings);
      haptic(settings, 18);
      setFlash("right");
      bump();
      window.setTimeout(() => {
        if (!aliveRef.current) return;
        setFlash(null);
        if (isRush) onRush?.(true);
        else finishNormal();
      }, 320);
      return;
    }

    // correcto pero el puzzle sigue: responde el rival
    play("correct", settings);
    setFlash("right");
    setLocked(true);
    bump();
    window.setTimeout(() => {
      if (!aliveRef.current) return;
      session.force(r.opponentUci);
      play("move", settings);
      setLocked(false);
      setFlash(null);
      bump();
    }, 430);
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
        finishNormal();
        return;
      }
      session.force(rem[i]);
      play("move", settings);
      i++;
      bump();
      window.setTimeout(step, 620);
    };
    step();
  }

  const shapes: any[] = [];
  if (!done && !locked && hintLevel > 0 && !isRush) {
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
      {isReview && !isRush && <div className="review-badge">🔁 Repaso — ya lo fallaste, a ver si ahora sí</div>}

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
          boardTheme={settings.boardTheme}
          coordinates={settings.coordinates}
          onMove={onUserMove}
        />
      </div>

      {!done && (
        <div className={`prompt ${flash ?? ""}`}>
          {flash === "wrong"
            ? isRush
              ? "❌ ¡Fallo!"
              : "❌ No es la mejor. Inténtalo otra vez."
            : flash === "right"
            ? "✅ ¡Bien!"
            : `Juegan las ${moverLabel} — encuentra la mejor jugada`}
        </div>
      )}

      {done && summary && (
        <div className={`summary ${summary.clean ? "good" : "bad"}`}>
          <div className="summary-title">{summary.clean ? "✅ ¡Resuelto!" : "📖 Aquí estaba la solución"}</div>
          {summary.rankUp && <div className="rankup-note">🎉 ¡Subiste de rango!</div>}
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

          {(analyzing || analysis || terminal) && (
            <div className="engine">
              <div className="engine-head">
                <span className="engine-title">🔍 Motor (Stockfish)</span>
                {analyzing ? (
                  <span className="engine-eval analyzing">Analizando…</span>
                ) : terminal ? (
                  <span className={"engine-eval " + (terminal.prob >= 0.5 ? "ev-w" : "ev-b")}>{terminal.label}</span>
                ) : analysis ? (
                  <span className={"engine-eval " + (whiteWinProb(analysis) >= 0.5 ? "ev-w" : "ev-b")}>
                    {evalText(analysis)}
                  </span>
                ) : null}
              </div>
              {(analysis || terminal) && (
                <>
                  <div className="evalbar">
                    <div
                      className="evalbar-white"
                      style={{
                        width: `${Math.round((terminal ? terminal.prob : whiteWinProb(analysis!)) * 100)}%`
                      }}
                    />
                  </div>
                  {analysis && analysis.pv.length > 0 && (
                    <div className="engine-line">Mejor línea: {uciLineToSan(session.fen, analysis.pv, 8)}</div>
                  )}
                  {terminal && <div className="engine-line">Fin de la partida.</div>}
                </>
              )}
            </div>
          )}

          <a className="gamelink" href={`https://lichess.org/training/${puzzle.id}`} target="_blank" rel="noreferrer">
            Ver análisis en Lichess ↗
          </a>
        </div>
      )}

      {!isRush && (
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
              {nextLabel ?? "Siguiente ▶"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
