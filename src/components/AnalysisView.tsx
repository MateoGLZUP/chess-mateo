import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import Board from "./Board";
import { analyze, stopAnalysis, whiteWinProb, evalText, uciLineToSan, type Analysis } from "../lib/engine";
import { play } from "../lib/sound";
import type { Settings } from "../lib/types";

interface Props {
  settings: Settings;
  initialFen?: string;
  onHome: () => void;
}

export default function AnalysisView({ settings, initialFen, onHome }: Props) {
  const gameRef = useRef(new Chess(initialFen || undefined));
  const latestFenRef = useRef("");
  const runningRef = useRef(false);
  const aliveRef = useRef(true);

  const [, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);
  const [evalInfo, setEvalInfo] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [lastMove, setLastMove] = useState<[string, string] | undefined>(undefined);
  const [flip, setFlip] = useState(false);
  const [fenInput, setFenInput] = useState("");
  const [fenError, setFenError] = useState(false);

  useEffect(() => {
    aliveRef.current = true;
    schedule(gameRef.current.fen());
    return () => {
      aliveRef.current = false;
      stopAnalysis();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash.includes("debug")) {
      (window as any).__cmAnalysis = gameRef.current.fen();
    }
  });

  function schedule(fen: string) {
    latestFenRef.current = fen;
    if (runningRef.current) return;
    runLoop();
  }

  async function runLoop() {
    runningRef.current = true;
    let last = "";
    while (aliveRef.current && latestFenRef.current !== last) {
      const fen = latestFenRef.current;
      last = fen;
      setAnalyzing(true);
      const a = await analyze(fen, { movetime: 600 });
      if (!aliveRef.current) break;
      if (fen === latestFenRef.current) {
        setEvalInfo(a);
        setAnalyzing(false);
      }
    }
    runningRef.current = false;
  }

  const game = gameRef.current;
  const turnColor: "white" | "black" = game.turn() === "w" ? "white" : "black";
  const orientation: "white" | "black" = flip ? "black" : "white";

  function dests(): Map<string, string[]> {
    const map = new Map<string, string[]>();
    if (game.isGameOver()) return map;
    const moves = game.moves({ verbose: true }) as any[];
    for (const m of moves) {
      const arr = map.get(m.from) || [];
      arr.push(m.to);
      map.set(m.from, arr);
    }
    return map;
  }

  function onMove(from: string, to: string) {
    const g = gameRef.current;
    const piece = g.get(from as any);
    const promo = piece && piece.type === "p" && (to[1] === "8" || to[1] === "1") ? "q" : undefined;
    let mv;
    try {
      mv = g.move({ from, to, promotion: promo as any });
    } catch {
      return;
    }
    if (!mv) return;
    setLastMove([from, to]);
    play(mv.captured ? "capture" : "move", settings);
    bump();
    schedule(g.fen());
  }

  function undo() {
    const g = gameRef.current;
    if (g.history().length === 0) return;
    g.undo();
    const h = g.history({ verbose: true }) as any[];
    setLastMove(h.length ? [h[h.length - 1].from, h[h.length - 1].to] : undefined);
    bump();
    schedule(g.fen());
  }

  function reset() {
    gameRef.current = new Chess();
    setLastMove(undefined);
    bump();
    schedule(gameRef.current.fen());
  }

  function loadFen() {
    const f = fenInput.trim();
    if (!f) return;
    try {
      const g = new Chess(f);
      gameRef.current = g;
      setLastMove(undefined);
      setFenError(false);
      setFenInput("");
      bump();
      schedule(g.fen());
    } catch {
      setFenError(true);
    }
  }

  const prob = evalInfo ? whiteWinProb(evalInfo) : 0.5;
  const line = evalInfo && evalInfo.pv.length ? uciLineToSan(game.fen(), evalInfo.pv, 10) : "";

  return (
    <div className="analysis">
      <div className="sub-header">
        <button className="back-btn" onClick={onHome} aria-label="Volver">
          ←
        </button>
        <div className="sub-title">🔬 Análisis</div>
        <button className="back-btn" onClick={() => setFlip((f) => !f)} aria-label="Voltear" title="Voltear">
          ⇅
        </button>
      </div>
      <div className="view-body">
        <div className="board-shell">
          <Board
            fen={game.fen()}
            orientation={orientation}
            turnColor={turnColor}
            movableColor={game.isGameOver() ? undefined : turnColor}
            dests={dests()}
            lastMove={lastMove}
            check={game.inCheck()}
            boardTheme={settings.boardTheme}
            coordinates={settings.coordinates}
            onMove={onMove}
          />
        </div>

        <div className="engine">
          <div className="engine-head">
            <span className="engine-title">🔍 Motor (Stockfish)</span>
            {evalInfo ? (
              <span className={"engine-eval " + (prob >= 0.5 ? "ev-w" : "ev-b")}>{evalText(evalInfo)}</span>
            ) : (
              <span className="engine-eval analyzing">…</span>
            )}
          </div>
          <div className="evalbar">
            <div className="evalbar-white" style={{ width: `${Math.round(prob * 100)}%` }} />
          </div>
          {line && <div className="engine-line">{game.turn() === "w" ? "Mueven blancas" : "Mueven negras"} · {line}</div>}
          {analyzing && <div className="engine-thinking">analizando…</div>}
        </div>

        <div className="controls">
          <button className="btn" onClick={undo} disabled={game.history().length === 0}>
            ↩ Atrás
          </button>
          <button className="btn ghost" onClick={reset}>
            ⟲ Reiniciar
          </button>
        </div>

        <div className="fen-row">
          <input
            className={`fen-input ${fenError ? "err" : ""}`}
            placeholder="Pega un FEN para analizar…"
            value={fenInput}
            onChange={(e) => {
              setFenInput(e.target.value);
              setFenError(false);
            }}
          />
          <button className="btn small" onClick={loadFen} disabled={!fenInput.trim()}>
            Cargar
          </button>
        </div>
      </div>
    </div>
  );
}
