import { analyze } from "./engine";

// Clasificación de jugadas estilo chess.com.
export type MoveClass = "brilliant" | "best" | "good" | "inaccuracy" | "mistake" | "blunder";

export const CLASS_INFO: Record<MoveClass, { label: string; icon: string; cls: string }> = {
  brilliant: { label: "Brillante", icon: "✨", cls: "cl-brilliant" },
  best: { label: "Mejor jugada", icon: "⭐", cls: "cl-best" },
  good: { label: "Buena", icon: "👍", cls: "cl-good" },
  inaccuracy: { label: "Imprecisión", icon: "⁉️", cls: "cl-inacc" },
  mistake: { label: "Error", icon: "✖️", cls: "cl-mistake" },
  blunder: { label: "Blunder", icon: "💥", cls: "cl-blunder" }
};

const SEVERITY: Record<MoveClass, number> = {
  brilliant: 0,
  best: 1,
  good: 2,
  inaccuracy: 3,
  mistake: 4,
  blunder: 5
};

export function moreSevere(a: MoveClass | null, b: MoveClass): MoveClass {
  if (!a) return b;
  return SEVERITY[b] > SEVERITY[a] ? b : a;
}

export function isSacrifice(themes: string[]): boolean {
  return themes.includes("sacrifice");
}

/**
 * Clasifica una jugada INCORRECTA según cuánto empeora la posición,
 * evaluando con Stockfish la posición resultante (turno del rival).
 */
export async function classifyWrong(fen: string, playerColor: "white" | "black"): Promise<MoveClass> {
  try {
    const a = await analyze(fen, { movetime: 500 });
    const sign = playerColor === "white" ? 1 : -1;
    if (a.mate !== undefined) {
      // mate a favor del jugador todavía = solo imprecisión; mate en contra = blunder
      return a.mate * sign > 0 ? "inaccuracy" : "blunder";
    }
    const cp = (a.cp ?? 0) * sign;
    if (cp >= 150) return "inaccuracy"; // sigue claramente ganando
    if (cp >= -50) return "mistake"; // tiró la ventaja
    return "blunder"; // ahora está peor
  } catch {
    return "mistake";
  }
}
