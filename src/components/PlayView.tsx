import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import Board from "./Board";
import GameReview from "./GameReview";
import { bestMove } from "../lib/engine";
import { play } from "../lib/sound";
import type { Settings } from "../lib/types";

interface Props {
  settings: Settings;
  onHome: () => void;
}

interface Level {
  id: number;
  name: string;
  skill: number;
  movetime: number;
  approx: string;
}

const LEVELS: Level[] = [
  { id: 1, name: "Principiante", skill: 0, movetime: 60, approx: "~800" },
  { id: 2, name: "Fácil", skill: 3, movetime: 120, approx: "~1100" },
  { id: 3, name: "Intermedio", skill: 7, movetime: 250, approx: "~1500" },
  { id: 4, name: "Avanzado", skill: 13, movetime: 500, approx: "~1900" },
  { id: 5, name: "Máximo", skill: 20, movetime: 1000, approx: "Tope" }
];

export default function PlayView({ settings, onHome }: Props) {
  const gameRef = useRef(new Chess());
  const playerColorRef = useRef<"white" | "black">("white");
  const levelRef = useRef<Level>(LEVELS[1]);
  const thinkingRef = useRef(false);
  const aliveRef = useRef(true);

  const [, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);
  const [phase, setPhase] = useState<"setup" | "playing">("setup");
  const [levelIdx, setLevelIdx] = useState(1);
  const [thinking, setThinking] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<[string, string] | undefined>(undefined);
  const [flip, setFlip] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash.includes("debug")) {
      (window as any).__cmPlay = gameRef.current.fen();
    }
  });

  const game = gameRef.current;
  const playerColor = playerColorRef.current;
  const turnColor: "white" | "black" = game.turn() === "w" ? "white" : "black";
  const myTurn = (game.turn() === "w") === (playerColor === "white");
  const orientation: "white" | "black" = flip ? (playerColor === "white" ? "black" : "white") : playerColor;

  function dests(): Map<string, string[]> {
    const map = new Map<string, string[]>();
    if (!myTurn || thinking || result) return map;
    const moves = game.moves({ verbose: true }) as any[];
    for (const m of moves) {
      const arr = map.get(m.from) || [];
      arr.push(m.to);
      map.set(m.from, arr);
    }
    return map;
  }

  function start(colorChoice: "white" | "black" | "random") {
    const color = colorChoice === "random" ? (Math.floor(Math.random() * 2) === 0 ? "white" : "black") : colorChoice;
    gameRef.current = new Chess();
    playerColorRef.current = color;
    levelRef.current = LEVELS[levelIdx];
    thinkingRef.current = false;
    setResult(null);
    setLastMove(undefined);
    setThinking(false);
    setFlip(false);
    setPhase("playing");
    bump();
    if (color === "black") window.setTimeout(engineMove, 450);
  }

  function finishGame() {
    const g = gameRef.current;
    let msg = "Partida terminada";
    if (g.isCheckmate()) {
      const playerLost = (g.turn() === "w") === (playerColorRef.current === "white");
      msg = playerLost ? "Jaque mate — perdiste 😔" : "¡Jaque mate — ganaste! 🎉";
      play(playerLost ? "lose" : "win", settings);
    } else if (g.isStalemate()) {
      msg = "Tablas por ahogado";
    } else if (g.isInsufficientMaterial()) {
      msg = "Tablas por material insuficiente";
    } else if (g.isThreefoldRepetition?.()) {
      msg = "Tablas por repetición";
    } else if (g.isDraw()) {
      msg = "Tablas (regla de 50 jugadas)";
    }
    setResult(msg);
    bump();
  }

  async function engineMove() {
    if (thinkingRef.current) return;
    const g = gameRef.current;
    if (g.isGameOver()) {
      finishGame();
      return;
    }
    thinkingRef.current = true;
    setThinking(true);
    bump();
    const lv = levelRef.current;
    const uci = await bestMove(g.fen(), { skill: lv.skill, movetime: lv.movetime });
    if (!aliveRef.current) return;
    thinkingRef.current = false;
    setThinking(false);
    if (!uci) {
      finishGame();
      return;
    }
    const mv = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: (uci[4] as any) || "q" });
    setLastMove([uci.slice(0, 2), uci.slice(2, 4)]);
    play(mv && mv.captured ? "capture" : "move", settings);
    bump();
    if (g.isGameOver()) finishGame();
  }

  function onUserMove(from: string, to: string) {
    if (!myTurn || thinking || result) return;
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
    if (g.isGameOver()) {
      finishGame();
      return;
    }
    window.setTimeout(engineMove, 250);
  }

  function undo() {
    if (thinkingRef.current) return;
    const g = gameRef.current;
    if (g.history().length === 0) return;
    g.undo();
    if (g.turn() !== (playerColorRef.current === "white" ? "w" : "b") && g.history().length > 0) g.undo();
    setResult(null);
    const h = g.history({ verbose: true }) as any[];
    setLastMove(h.length ? [h[h.length - 1].from, h[h.length - 1].to] : undefined);
    bump();
  }

  function resign() {
    if (result) return;
    setResult("Te rendiste");
    play("lose", settings);
    bump();
  }

  // ---------- render ----------
  if (reviewing) {
    const hist = gameRef.current.history({ verbose: true }) as any[];
    const moves = hist.map((m) => m.from + m.to + (m.promotion || ""));
    return (
      <GameReview movesUci={moves} playerColor={playerColorRef.current} settings={settings} onExit={() => setReviewing(false)} />
    );
  }

  if (phase === "setup") {
    return (
      <div className="play">
        <div className="sub-header">
          <button className="back-btn" onClick={onHome} aria-label="Volver">
            ←
          </button>
          <div className="sub-title">♟️🤖 Jugar vs la máquina</div>
          <div className="sub-count" />
        </div>
        <div className="view-body">
          <div className="setup-block">
            <div className="setup-label">Nivel de la máquina</div>
            <div className="level-grid">
              {LEVELS.map((l, i) => (
                <button
                  key={l.id}
                  className={`level-card ${levelIdx === i ? "active" : ""}`}
                  onClick={() => setLevelIdx(i)}
                >
                  <b>{l.name}</b>
                  <small>{l.approx}</small>
                </button>
              ))}
            </div>
            <div className="setup-label">Tus piezas</div>
            <div className="color-row">
              <button className="btn" onClick={() => start("white")}>
                ♔ Blancas
              </button>
              <button className="btn" onClick={() => start("black")}>
                ♚ Negras
              </button>
              <button className="btn ghost" onClick={() => start("random")}>
                🎲 Azar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const status = result
    ? result
    : thinking
    ? "🤖 La máquina piensa…"
    : myTurn
    ? "Tu turno"
    : "…";

  return (
    <div className="play">
      <div className="sub-header">
        <button className="back-btn" onClick={onHome} aria-label="Volver">
          ←
        </button>
        <div className="sub-title">♟️🤖 {LEVELS[levelIdx].name}</div>
        <button className="back-btn" onClick={() => setFlip((f) => !f)} aria-label="Voltear" title="Voltear tablero">
          ⇅
        </button>
      </div>
      <div className="view-body">
        <div className={`board-shell ${result ? "" : ""}`}>
          <Board
            fen={game.fen()}
            orientation={orientation}
            turnColor={turnColor}
            movableColor={myTurn && !thinking && !result ? playerColor : undefined}
            dests={dests()}
            lastMove={lastMove}
            check={game.inCheck()}
            boardTheme={settings.boardTheme}
            coordinates={settings.coordinates}
            viewOnly={!!result}
            onMove={onUserMove}
          />
        </div>
        <div className={`play-status ${result ? "over" : ""}`}>{status}</div>
        <div className="controls">
          {result ? (
            <>
              {gameRef.current.history().length > 0 && (
                <button className="btn primary" onClick={() => setReviewing(true)}>
                  🧑‍🏫 Revisar
                </button>
              )}
              <button className="btn ghost" onClick={() => setPhase("setup")}>
                ↻ Nueva
              </button>
            </>
          ) : (
            <>
              <button className="btn" onClick={undo} disabled={thinking}>
                ↩ Deshacer
              </button>
              <button className="btn ghost" onClick={resign}>
                Rendirse
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
