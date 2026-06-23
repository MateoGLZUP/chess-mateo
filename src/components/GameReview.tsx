import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import Board from "./Board";
import { analyze, stopAnalysis } from "../lib/engine";
import type { Analysis } from "../lib/engine";
import { play } from "../lib/sound";
import { CLASS_INFO, cpFor, winPercent, moveAccuracy, classifyByLoss, type MoveClass } from "../lib/classify";
import type { Settings } from "../lib/types";

interface Props {
  movesUci: string[];
  playerColor: "white" | "black";
  settings: Settings;
  onExit: () => void;
}

interface RetryState {
  fenBefore: string;
  moverWhite: boolean;
  baseWin: number;
  bestUci: string | null;
  bestSan: string | null;
  fen: string;
  lastMove?: [string, string];
  feedback: { san: string; cls: MoveClass; pending: boolean } | null;
}

export default function GameReview({ movesUci, playerColor, settings, onExit }: Props) {
  const positions = useMemo(() => {
    const c = new Chess();
    const fens = [c.fen()];
    const sans: string[] = [];
    for (const u of movesUci) {
      let mv: any = null;
      try {
        mv = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: (u[4] as any) || "q" });
      } catch {
        mv = null;
      }
      fens.push(c.fen());
      sans.push(mv ? mv.san : u);
    }
    return { fens, sans };
  }, [movesUci]);

  const N = movesUci.length;
  const [evals, setEvals] = useState<(Analysis | null)[]>(() => new Array(N + 1).fill(null));
  const [progress, setProgress] = useState(0);
  const [ply, setPly] = useState(N);
  const [retry, setRetry] = useState<RetryState | null>(null);
  const retryChess = useRef<Chess | null>(null);
  const aliveRef = useRef(true);

  // pipeline de análisis (una posición a la vez, en segundo plano)
  useEffect(() => {
    aliveRef.current = true;
    let cancelled = false;
    (async () => {
      for (let i = 0; i <= N; i++) {
        if (cancelled) return;
        const a = await analyze(positions.fens[i], { movetime: 220 });
        if (cancelled || !aliveRef.current) return;
        setEvals((prev) => {
          const next = prev.slice();
          next[i] = a;
          return next;
        });
        setProgress(i + 1);
      }
    })();
    return () => {
      cancelled = true;
      aliveRef.current = false;
      stopAnalysis();
    };
  }, [positions, N]);

  // navegación con teclado
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (retry) return;
      if (e.key === "ArrowLeft") setPly((p) => Math.max(0, p - 1));
      else if (e.key === "ArrowRight") setPly((p) => Math.min(N, p + 1));
      else if (e.key === "Home") setPly(0);
      else if (e.key === "End") setPly(N);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [N, retry]);

  function bestSanAt(fenBefore: string, uci: string | null): string | null {
    if (!uci) return null;
    try {
      const c = new Chess(fenBefore);
      const mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: (uci[4] as any) || "q" });
      return mv ? mv.san : uci;
    } catch {
      return uci;
    }
  }

  function moveInfo(k: number) {
    if (k < 1) return null;
    const moverWhite = k % 2 === 1;
    const pre = evals[k - 1];
    const post = evals[k];
    const playedUci = movesUci[k - 1];
    const san = positions.sans[k - 1];
    const bestUci = pre?.bestmove || null;
    let cls: MoveClass | null = null;
    let wpl = 0;
    if (pre && post) {
      const bestW = winPercent(cpFor(pre, moverWhite));
      const actW = winPercent(cpFor(post, moverWhite));
      wpl = Math.max(0, bestW - actW);
      const isBest = !!bestUci && playedUci.slice(0, 4) === bestUci.slice(0, 4);
      cls = classifyByLoss(wpl, isBest);
    }
    const isPlayerMove = (moverWhite ? "white" : "black") === playerColor;
    return {
      moverWhite,
      san,
      cls,
      bestUci,
      bestSan: bestSanAt(positions.fens[k - 1], bestUci),
      wpl,
      isPlayerMove,
      playedUci
    };
  }

  const accuracy = useMemo(() => {
    let pSum = 0,
      pN = 0,
      mSum = 0,
      mN = 0;
    for (let k = 1; k <= N; k++) {
      const pre = evals[k - 1];
      const post = evals[k];
      if (!pre || !post) continue;
      const moverWhite = k % 2 === 1;
      const wpl = Math.max(0, winPercent(cpFor(pre, moverWhite)) - winPercent(cpFor(post, moverWhite)));
      const acc = moveAccuracy(wpl);
      if ((moverWhite ? "white" : "black") === playerColor) {
        pSum += acc;
        pN++;
      } else {
        mSum += acc;
        mN++;
      }
    }
    return { player: pN ? Math.round(pSum / pN) : null, machine: mN ? Math.round(mSum / mN) : null };
  }, [evals, N, playerColor]);

  // ---------- retry ----------
  function startRetry() {
    const k = ply;
    const info = moveInfo(k);
    if (!info || !info.isPlayerMove) return;
    const pre = evals[k - 1];
    if (!pre) return;
    const c = new Chess(positions.fens[k - 1]);
    retryChess.current = c;
    setRetry({
      fenBefore: positions.fens[k - 1],
      moverWhite: info.moverWhite,
      baseWin: winPercent(cpFor(pre, info.moverWhite)),
      bestUci: info.bestUci,
      bestSan: info.bestSan,
      fen: c.fen(),
      feedback: null
    });
  }

  async function onRetryMove(from: string, to: string) {
    const c = retryChess.current;
    const r = retry;
    if (!c || !r || r.feedback?.pending) return;
    const piece = c.get(from as any);
    const promo = piece && piece.type === "p" && (to[1] === "8" || to[1] === "1") ? "q" : undefined;
    let mv;
    try {
      mv = c.move({ from, to, promotion: promo as any });
    } catch {
      return;
    }
    if (!mv) return;
    play("move", settings);
    setRetry({ ...r, fen: c.fen(), lastMove: [from, to], feedback: { san: mv.san, cls: "good", pending: true } });
    const a = await analyze(c.fen(), { movetime: 350 });
    if (!aliveRef.current) return;
    const actW = winPercent(cpFor(a, r.moverWhite));
    const wpl = Math.max(0, r.baseWin - actW);
    const isBest = !!r.bestUci && from + to === r.bestUci.slice(0, 4);
    const cls = classifyByLoss(wpl, isBest);
    play(cls === "best" || cls === "brilliant" ? "correct" : cls === "blunder" || cls === "mistake" ? "wrong" : "move", settings);
    setRetry((prev) => (prev ? { ...prev, feedback: { san: mv!.san, cls, pending: false } } : prev));
  }

  function retryAgain() {
    const r = retry;
    if (!r) return;
    const c = new Chess(r.fenBefore);
    retryChess.current = c;
    setRetry({ ...r, fen: c.fen(), lastMove: undefined, feedback: null });
  }

  // ---------- render ----------
  const info = moveInfo(ply);
  const fen = retry ? retry.fen : positions.fens[ply];
  const orientation = playerColor;
  const lastMove: [string, string] | undefined = retry
    ? retry.lastMove
    : ply >= 1
    ? [movesUci[ply - 1].slice(0, 2), movesUci[ply - 1].slice(2, 4)]
    : undefined;

  const shapes: any[] = [];
  if (!retry && info && info.cls && info.cls !== "best" && info.cls !== "brilliant" && info.bestUci) {
    shapes.push({ orig: info.bestUci.slice(0, 2), dest: info.bestUci.slice(2, 4), brush: "blue" });
  }
  if (retry && retry.feedback && !retry.feedback.pending && retry.feedback.cls !== "best" && retry.bestUci) {
    shapes.push({ orig: retry.bestUci.slice(0, 2), dest: retry.bestUci.slice(2, 4), brush: "blue" });
  }

  const retryBoard = (() => {
    if (!retry) return null;
    const c = retryChess.current!;
    const turnColor: "white" | "black" = c.turn() === "w" ? "white" : "black";
    const canMove = !retry.feedback; // un intento; luego "Otra vez" o "Volver"
    const movable: "white" | "black" | undefined = canMove ? (retry.moverWhite ? "white" : "black") : undefined;
    const dests = new Map<string, string[]>();
    if (canMove) {
      for (const m of c.moves({ verbose: true }) as any[]) {
        const arr = dests.get(m.from) || [];
        arr.push(m.to);
        dests.set(m.from, arr);
      }
    }
    return { turnColor, movable, dests };
  })();

  return (
    <div className="review">
      <div className="sub-header">
        <button className="back-btn" onClick={onExit} aria-label="Volver">
          ←
        </button>
        <div className="sub-title">🧑‍🏫 Revisión del coach</div>
        <div className="sub-count" />
      </div>

      <div className="view-body">
        {/* precisión */}
        <div className="acc-row">
          <div className="acc-cell">
            <div className="acc-v">{accuracy.player ?? "…"}{accuracy.player != null ? "%" : ""}</div>
            <div className="acc-l">Tu precisión</div>
          </div>
          <div className="acc-cell">
            <div className="acc-v">{accuracy.machine ?? "…"}{accuracy.machine != null ? "%" : ""}</div>
            <div className="acc-l">Máquina</div>
          </div>
        </div>

        {progress < N + 1 && <div className="review-progress">Analizando partida… {progress}/{N + 1}</div>}

        {!retry && <EvalGraph evals={evals} ply={ply} n={N} onSeek={setPly} />}

        <div className="board-shell">
          <Board
            fen={fen}
            orientation={orientation}
            turnColor={retryBoard ? retryBoard.turnColor : "white"}
            movableColor={retry ? retryBoard?.movable : undefined}
            dests={retry ? retryBoard?.dests : new Map()}
            lastMove={lastMove}
            shapes={shapes}
            boardTheme={settings.boardTheme}
            coordinates={settings.coordinates}
            viewOnly={!retry}
            onMove={retry ? onRetryMove : undefined}
          />
        </div>

        {/* panel del coach */}
        {!retry && (
          <>
            <div className="review-coach">
              {ply === 0 ? (
                <div className="rc-line">Posición inicial. Usa ▶ para revisar jugada por jugada.</div>
              ) : info ? (
                <>
                  <div className="rc-head">
                    <span className="rc-move">
                      {Math.ceil(ply / 2)}
                      {info.moverWhite ? "." : "…"} {info.san}
                    </span>
                    {info.cls ? (
                      <span className={`cl-pill ${CLASS_INFO[info.cls].cls}`}>
                        {CLASS_INFO[info.cls].icon} {CLASS_INFO[info.cls].label}
                      </span>
                    ) : (
                      <span className="cl-pill">…</span>
                    )}
                  </div>
                  <div className="rc-line">
                    {info.cls === "best" || info.cls === "brilliant"
                      ? "La mejor jugada. 👌"
                      : info.bestSan
                      ? `La mejor era ${info.bestSan} (flecha azul).`
                      : "Analizando…"}
                  </div>
                  {info.isPlayerMove && info.cls && info.cls !== "best" && info.cls !== "brilliant" && (
                    <button className="btn small" onClick={startRetry}>
                      ↺ Reintentar esta jugada
                    </button>
                  )}
                </>
              ) : null}
            </div>

            <div className="nav-row">
              <button className="nav-btn" onClick={() => setPly(0)} disabled={ply === 0}>
                ⏮
              </button>
              <button className="nav-btn" onClick={() => setPly((p) => Math.max(0, p - 1))} disabled={ply === 0}>
                ◀
              </button>
              <button className="nav-btn" onClick={() => setPly((p) => Math.min(N, p + 1))} disabled={ply === N}>
                ▶
              </button>
              <button className="nav-btn" onClick={() => setPly(N)} disabled={ply === N}>
                ⏭
              </button>
            </div>
          </>
        )}

        {/* modo reintentar */}
        {retry && (
          <div className="retry-panel">
            <div className="rc-head">
              <span className="rc-move">Reintenta: encuentra la mejor jugada</span>
            </div>
            {retry.feedback ? (
              retry.feedback.pending ? (
                <div className="rc-line">Evaluando {retry.feedback.san}…</div>
              ) : (
                <div className="rc-line">
                  <span className={`cl-pill ${CLASS_INFO[retry.feedback.cls].cls}`}>
                    {CLASS_INFO[retry.feedback.cls].icon} {CLASS_INFO[retry.feedback.cls].label}
                  </span>{" "}
                  {retry.feedback.cls === "best" || retry.feedback.cls === "brilliant"
                    ? `¡${retry.feedback.san} es la mejor! 🎉`
                    : `${retry.feedback.san}. La mejor era ${retry.bestSan}.`}
                </div>
              )
            ) : (
              <div className="rc-line">Mueve la pieza que creas mejor.</div>
            )}
            <div className="controls">
              <button className="btn" onClick={retryAgain}>
                ↻ Otra vez
              </button>
              <button className="btn primary" onClick={() => setRetry(null)}>
                Volver a la partida
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EvalGraph({ evals, ply, n, onSeek }: { evals: (Analysis | null)[]; ply: number; n: number; onSeek: (p: number) => void }) {
  const W = 320;
  const H = 48;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const a = evals[i];
    if (!a) continue;
    const cp = a.mate !== undefined ? (a.mate > 0 ? 1000 : -1000) : Math.max(-1000, Math.min(1000, a.cp ?? 0));
    const x = n === 0 ? 0 : (i / n) * W;
    const y = H / 2 - (cp / 1000) * (H / 2 - 2);
    pts.push({ x, y });
  }
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const markerX = n === 0 ? 0 : (ply / n) * W;
  return (
    <svg
      className="eval-graph"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      onClick={(e) => {
        const rect = (e.target as SVGElement).closest("svg")!.getBoundingClientRect();
        const frac = (e.clientX - rect.left) / rect.width;
        onSeek(Math.round(frac * n));
      }}
    >
      <rect x="0" y="0" width={W} height={H / 2} fill="#ffffff10" />
      <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="#ffffff30" strokeWidth="0.5" />
      <path d={d} fill="none" stroke="#9bb8f0" strokeWidth="1.5" />
      <line x1={markerX} y1="0" x2={markerX} y2={H} stroke="#7aa2f7" strokeWidth="1.5" />
    </svg>
  );
}
