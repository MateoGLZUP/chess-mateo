import { Chess } from "chess.js";

// Motor Stockfish (clásico, single-threaded) para ANÁLISIS post-puzzle.
// Corre en un Web Worker, sin headers especiales (compatible con iOS y GitHub Pages).

export interface Analysis {
  cp?: number; // centipawns relativo a las blancas
  mate?: number; // mate en N relativo a las blancas (signo = a favor de quién)
  bestmove?: string;
  pv: string[]; // jugadas UCI
  depth: number;
}

const UCI_MOVE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

let worker: Worker | null = null;
let initPromise: Promise<void> | null = null;
let busy = false;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(import.meta.env.BASE_URL + "engine/stockfish.js");
  }
  return worker;
}

export function engineSupported(): boolean {
  return typeof window !== "undefined" && typeof Worker !== "undefined" && typeof WebAssembly !== "undefined";
}

export function initEngine(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = new Promise((resolve, reject) => {
    let w: Worker;
    try {
      w = getWorker();
    } catch (e) {
      reject(e);
      return;
    }
    const onMsg = (e: MessageEvent) => {
      if ("" + e.data === "uciok") {
        w.removeEventListener("message", onMsg);
        resolve();
      }
    };
    w.addEventListener("message", onMsg);
    w.addEventListener("error", (ev) => reject(new Error("engine error: " + ev.message)), { once: true });
    w.postMessage("uci");
  });
  return initPromise;
}

export async function analyze(fen: string, opts: { movetime?: number; depth?: number } = {}): Promise<Analysis> {
  await initEngine();
  const w = getWorker();
  busy = true;
  const sideSign = fen.split(" ")[1] === "b" ? -1 : 1;

  return new Promise<Analysis>((resolve) => {
    let cp: number | undefined;
    let mate: number | undefined;
    let pv: string[] = [];
    let depth = 0;

    const onMsg = (e: MessageEvent) => {
      const line = "" + e.data;
      if (line.startsWith("info")) {
        const dM = line.match(/ depth (\d+)/);
        if (dM) depth = parseInt(dM[1], 10);
        const cpM = line.match(/score cp (-?\d+)/);
        const mM = line.match(/score mate (-?\d+)/);
        if (cpM) {
          cp = parseInt(cpM[1], 10);
          mate = undefined;
        }
        if (mM) {
          mate = parseInt(mM[1], 10);
          cp = undefined;
        }
        const pvIdx = line.indexOf(" pv ");
        if (pvIdx >= 0) {
          const toks = line.slice(pvIdx + 4).trim().split(/\s+/);
          const moves: string[] = [];
          for (const t of toks) {
            if (UCI_MOVE.test(t)) moves.push(t);
            else break; // ignora campos extra tras el pv (p.ej. "bmc")
          }
          if (moves.length) pv = moves;
        }
      } else if (line.startsWith("bestmove")) {
        w.removeEventListener("message", onMsg);
        busy = false;
        resolve({
          cp: cp !== undefined ? cp * sideSign : undefined,
          mate: mate !== undefined ? mate * sideSign : undefined,
          bestmove: line.split(/\s+/)[1],
          pv,
          depth
        });
      }
    };

    w.addEventListener("message", onMsg);
    w.postMessage("setoption name Skill Level value 20"); // fuerza máxima para analizar
    w.postMessage("ucinewgame");
    w.postMessage("position fen " + fen);
    if (opts.depth) w.postMessage("go depth " + opts.depth);
    else w.postMessage("go movetime " + (opts.movetime ?? 900));
  });
}

export function stopAnalysis(): void {
  if (worker && busy) worker.postMessage("stop");
}

/**
 * Devuelve la jugada del motor a un nivel de fuerza dado (para jugar partidas).
 * skill: 0 (débil) .. 20 (máximo). Devuelve UCI o null si no hay jugada.
 */
export async function bestMove(fen: string, opts: { skill?: number; movetime?: number } = {}): Promise<string | null> {
  await initEngine();
  const w = getWorker();
  busy = true;
  const skill = Math.max(0, Math.min(20, opts.skill ?? 20));
  return new Promise<string | null>((resolve) => {
    const onMsg = (e: MessageEvent) => {
      const line = "" + e.data;
      if (line.startsWith("bestmove")) {
        w.removeEventListener("message", onMsg);
        busy = false;
        const bm = line.split(/\s+/)[1];
        resolve(bm && bm !== "(none)" ? bm : null);
      }
    };
    w.addEventListener("message", onMsg);
    w.postMessage("setoption name Skill Level value " + skill);
    w.postMessage("position fen " + fen);
    w.postMessage("go movetime " + (opts.movetime ?? 500));
  });
}

// ---------- helpers de presentación ----------

/** Probabilidad de victoria de las blancas (0..1) según la evaluación. */
export function whiteWinProb(a: Analysis): number {
  if (a.mate !== undefined) return a.mate > 0 ? 1 : 0;
  const cp = a.cp ?? 0;
  return 1 / (1 + Math.pow(10, -cp / 400));
}

/** Texto de la evaluación, relativo a las blancas (+1.5, −M3, …). */
export function evalText(a: Analysis): string {
  if (a.mate !== undefined) {
    return (a.mate > 0 ? "+" : "−") + "M" + Math.abs(a.mate);
  }
  const cp = a.cp ?? 0;
  return (cp >= 0 ? "+" : "−") + Math.abs(cp / 100).toFixed(1);
}

/** Convierte una línea UCI a SAN con números de jugada. */
export function uciLineToSan(fen: string, uci: string[], maxPlies = 8): string {
  try {
    const c = new Chess(fen);
    const parts = fen.split(" ");
    let white = parts[1] === "w";
    let moveNo = parseInt(parts[5] || "1", 10);
    let out = "";
    for (let i = 0; i < Math.min(uci.length, maxPlies); i++) {
      const u = uci[i];
      const mv = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] as any });
      if (!mv) break;
      if (white) {
        out += (out ? " " : "") + moveNo + ". " + mv.san;
      } else {
        out += (out ? " " : "") + (i === 0 ? moveNo + "… " : "") + mv.san;
        moveNo++;
      }
      white = !white;
    }
    return out;
  } catch {
    return "";
  }
}
