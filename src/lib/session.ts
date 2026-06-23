import { Chess } from "chess.js";
import type { Puzzle } from "./types";

export type TryResult =
  | { kind: "wrong" }
  | { kind: "continue"; opponentUci: string }
  | { kind: "solved" };

function parseUci(uci: string) {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci[4] : undefined
  };
}

/**
 * Maneja una sesion de resolucion de un puzzle.
 * Formato Lichess: el FEN es ANTES de la ultima jugada del rival; moves[0]
 * es esa jugada (la reproducimos), y a partir de ahi el jugador resuelve.
 */
export class PuzzleSession {
  readonly puzzle: Puzzle;
  private chess: Chess;
  private idx: number;
  readonly playerColor: "white" | "black";
  lastMove?: [string, string];
  solved = false;

  constructor(puzzle: Puzzle) {
    this.puzzle = puzzle;
    this.chess = new Chess(puzzle.fen);
    const setup = parseUci(puzzle.moves[0]);
    this.chess.move({ from: setup.from, to: setup.to, promotion: setup.promotion as any });
    this.lastMove = [setup.from, setup.to];
    this.idx = 1;
    this.playerColor = this.chess.turn() === "w" ? "white" : "black";
  }

  get fen(): string {
    return this.chess.fen();
  }

  get turnColor(): "white" | "black" {
    return this.chess.turn() === "w" ? "white" : "black";
  }

  get inCheck(): boolean {
    return this.chess.inCheck();
  }

  dests(): Map<string, string[]> {
    const map = new Map<string, string[]>();
    const moves = this.chess.moves({ verbose: true }) as any[];
    for (const m of moves) {
      const arr = map.get(m.from) || [];
      arr.push(m.to);
      map.set(m.from, arr);
    }
    return map;
  }

  /** La jugada del jugador que se espera ahora (para las pistas). */
  expected(): { from: string; to: string } | null {
    const uci = this.puzzle.moves[this.idx];
    if (!uci) return null;
    const p = parseUci(uci);
    return { from: p.from, to: p.to };
  }

  remainingMoves(): string[] {
    return this.puzzle.moves.slice(this.idx);
  }

  private promotionFor(from: string, to: string, expectedUci?: string): string | undefined {
    const piece = this.chess.get(from as any);
    const rank = to[1];
    if (piece && piece.type === "p" && (rank === "8" || rank === "1")) {
      if (expectedUci) {
        const exp = parseUci(expectedUci);
        return exp.promotion || "q";
      }
      return "q";
    }
    return undefined;
  }

  tryMove(from: string, to: string): TryResult {
    const expectedUci = this.puzzle.moves[this.idx];
    if (!expectedUci) return { kind: "solved" };
    const exp = parseUci(expectedUci);
    const promo = this.promotionFor(from, to, expectedUci);
    const matches =
      from === exp.from && to === exp.to && (exp.promotion ? promo === exp.promotion : true);

    if (!matches) {
      // Regla de Lichess: en la ultima jugada, cualquier mate tambien vale.
      if (this.idx === this.puzzle.moves.length - 1) {
        try {
          const clone = new Chess(this.chess.fen());
          clone.move({ from, to, promotion: (this.promotionFor(from, to) || "q") as any });
          if (clone.isCheckmate()) {
            this.chess.move({ from, to, promotion: (this.promotionFor(from, to) || "q") as any });
            this.lastMove = [from, to];
            this.idx++;
            this.solved = true;
            return { kind: "solved" };
          }
        } catch {
          /* jugada ilegal: cae a 'wrong' */
        }
      }
      return { kind: "wrong" };
    }

    this.chess.move({ from, to, promotion: promo as any });
    this.lastMove = [from, to];
    this.idx++;
    if (this.idx >= this.puzzle.moves.length) {
      this.solved = true;
      return { kind: "solved" };
    }
    return { kind: "continue", opponentUci: this.puzzle.moves[this.idx] };
  }

  /** FEN resultante tras una jugada (sin alterar la sesion). Para clasificar. */
  fenAfter(from: string, to: string): string | null {
    try {
      const clone = new Chess(this.chess.fen());
      const promo = this.promotionFor(from, to);
      clone.move({ from, to, promotion: (promo || "q") as any });
      return clone.fen();
    } catch {
      return null;
    }
  }

  /** Aplica una jugada de la solucion (respuesta rival o al revelar). */
  force(uci: string): void {
    const p = parseUci(uci);
    this.chess.move({ from: p.from, to: p.to, promotion: p.promotion as any });
    this.lastMove = [p.from, p.to];
    this.idx++;
    if (this.idx >= this.puzzle.moves.length) this.solved = true;
  }
}
