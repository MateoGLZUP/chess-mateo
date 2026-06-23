import { Chess } from "chess.js";
import { themeLabel, themeTip, isMotif } from "./themes";
import type { Profile } from "./types";

// Genera explicaciones de coach a partir de la solución conocida del puzzle:
// cuál es la mejor jugada y QUÉ PRODUCE (mate, ganar material, coronar...).

const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };

export interface CoachLine {
  bestSan: string;
  from: string;
  to: string;
  outcome: string; // qué produce
  text: string; // frase completa
  motif?: string;
  tip?: string;
}

function primaryMotif(themes: string[]): string | undefined {
  const mate = themes.find((t) => /^mateIn\d$/.test(t));
  if (mate) return mate;
  return themes.find((t) => isMotif(t));
}

function describeMaterial(net: number): string {
  switch (net) {
    case 1:
      return "un peón";
    case 2:
      return "la calidad";
    case 3:
      return "una pieza";
    case 5:
      return "una torre";
    case 9:
      return "la dama";
    default:
      return `${net} puntos de material`;
  }
}

/**
 * Explica la mejor jugada desde `fen`, dada la línea de solución en UCI
 * (solutionUci[0] = la jugada del jugador que se espera).
 */
export function explainBestMove(fen: string, solutionUci: string[], themes: string[]): CoachLine | null {
  if (!solutionUci.length) return null;
  try {
    const chess = new Chess(fen);
    const playerColor = chess.turn();
    const first = solutionUci[0];
    const from = first.slice(0, 2);
    const to = first.slice(2, 4);
    let bestSan = "";
    let capPlayer = 0;
    let capOpp = 0;
    let promo = false;

    for (let i = 0; i < solutionUci.length; i++) {
      const u = solutionUci[i];
      const mv = chess.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] as any });
      if (!mv) break;
      if (i === 0) bestSan = mv.san;
      if (mv.captured) {
        const v = VAL[mv.captured] || 0;
        if (mv.color === playerColor) capPlayer += v;
        else capOpp += v;
      }
      if (mv.promotion && mv.color === playerColor) promo = true;
    }

    const net = capPlayer - capOpp;
    const isMate = chess.isCheckmate();
    const playerMoves = Math.ceil(solutionUci.length / 2);

    let outcome: string;
    if (isMate) {
      outcome = playerMoves <= 1 ? "Da jaque mate." : `Fuerza el jaque mate en ${playerMoves}.`;
    } else if (promo && net <= 0) {
      outcome = "Corona un peón a dama.";
    } else if (net > 0) {
      outcome = `Ganas ${describeMaterial(net)}.`;
    } else {
      outcome = "Consigue una ventaja decisiva.";
    }

    const motif = primaryMotif(themes);
    const tip = themeTip(themes);
    const text = `Mejor jugada: ${bestSan}. ${outcome}`;

    return { bestSan, from, to, outcome, text, motif, tip };
  } catch {
    return null;
  }
}

/** Explicación de la solución completa del puzzle (para el resumen). */
export function explainSolution(puzzle: { fen: string; moves: string[]; themes: string[] }): CoachLine | null {
  try {
    const c = new Chess(puzzle.fen);
    const setup = puzzle.moves[0];
    c.move({ from: setup.slice(0, 2), to: setup.slice(2, 4), promotion: setup[4] as any });
    return explainBestMove(c.fen(), puzzle.moves.slice(1), puzzle.themes);
  } catch {
    return null;
  }
}

/** Pista previa del coach: qué buscar (revela el motivo). */
export function coachNudge(themes: string[]): string | null {
  const motif = primaryMotif(themes);
  if (!motif) return null;
  const m = motif.match(/^mateIn(\d)$/);
  if (m) return `Hay mate en ${m[1]}. Encuéntralo.`;
  return `Busca un ${themeLabel(motif).toLowerCase()} en la posición.`;
}

/** Motivo más flojo del jugador (para el modo Coach). */
export function weakestMotif(profile: Profile): string | undefined {
  const rows = Object.entries(profile.byTheme)
    .filter(([k]) => isMotif(k))
    .map(([k, v]) => {
      const total = v.solved + v.failed;
      return { k, total, acc: total ? v.solved / total : 1 };
    })
    .filter((r) => r.total >= 4)
    .sort((a, b) => a.acc - b.acc);
  return rows[0]?.k;
}
