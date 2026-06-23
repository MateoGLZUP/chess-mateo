import type { PlayerRating } from "./types";

// Implementacion de Glicko-2 para una sola "partida" (jugador vs puzzle).
// Es el mismo sistema que usan Lichess y chess.com para calibrar dificultad.
// Referencia: http://www.glicko.net/glicko/glicko2.pdf

const SCALE = 173.7178;
const TAU = 0.5; // constante del sistema (limita el cambio de volatilidad)
const EPS = 0.000001;

export function defaultRating(start = 1000): PlayerRating {
  return { rating: start, rd: 350, vol: 0.06 };
}

function g(phi: number): number {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}

function expected(mu: number, muJ: number, phiJ: number): number {
  return 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));
}

/**
 * Actualiza el rating del jugador tras un intento.
 * @param player rating actual del jugador
 * @param oppRating rating del puzzle
 * @param oppRd rating deviation del puzzle
 * @param score 1 = resuelto, 0 = fallado
 */
export function updateRating(
  player: PlayerRating,
  oppRating: number,
  oppRd: number,
  score: number
): PlayerRating {
  const mu = (player.rating - 1500) / SCALE;
  const phi = player.rd / SCALE;
  const sigma = player.vol;
  const muJ = (oppRating - 1500) / SCALE;
  const phiJ = oppRd / SCALE;

  const gPhiJ = g(phiJ);
  const e = expected(mu, muJ, phiJ);
  const v = 1 / (gPhiJ * gPhiJ * e * (1 - e));
  const delta = v * gPhiJ * (score - e);

  // --- iteracion de volatilidad (algoritmo de Illinois) ---
  const a = Math.log(sigma * sigma);
  const f = (x: number): number => {
    const ex = Math.exp(x);
    const num = ex * (delta * delta - phi * phi - v - ex);
    const den = 2 * Math.pow(phi * phi + v + ex, 2);
    return num / den - (x - a) / (TAU * TAU);
  };

  let A = a;
  let B: number;
  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v);
  } else {
    let k = 1;
    while (f(a - k * TAU) < 0) k++;
    B = a - k * TAU;
  }

  let fA = f(A);
  let fB = f(B);
  let guard = 0;
  while (Math.abs(B - A) > EPS && guard < 100) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }
    B = C;
    fB = fC;
    guard++;
  }
  const newSigma = Math.exp(A / 2);

  const phiStar = Math.sqrt(phi * phi + newSigma * newSigma);
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const newMu = mu + newPhi * newPhi * gPhiJ * (score - e);

  let newRating = newMu * SCALE + 1500;
  let newRd = newPhi * SCALE;
  newRd = Math.max(30, Math.min(350, newRd));
  newRating = Math.max(100, Math.min(3200, newRating));

  return {
    rating: Math.round(newRating),
    rd: Math.round(newRd),
    vol: Number(newSigma.toFixed(6))
  };
}
