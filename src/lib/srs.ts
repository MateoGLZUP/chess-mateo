import type { Profile } from "./types";

// Repeticion espaciada ligera (estilo SM-2 simplificado):
// los puzzles fallados vuelven a aparecer hasta que los dominas.
const DAY = 86400000;

export function scheduleSrs(
  profile: Profile,
  id: string,
  clean: boolean,
  wasReview: boolean
): void {
  const now = Date.now();
  const i = profile.srs.findIndex((s) => s.id === id);

  if (!clean) {
    // fallado: reaparece manana
    if (i >= 0) {
      profile.srs[i] = {
        ...profile.srs[i],
        interval: 1,
        dueAt: now + DAY,
        fails: (profile.srs[i].fails || 0) + 1
      };
    } else {
      profile.srs.push({ id, interval: 1, dueAt: now + DAY, fails: 1 });
    }
    return;
  }

  // resuelto limpio durante un repaso: espaciamos mas el siguiente
  if (wasReview && i >= 0) {
    const it = profile.srs[i];
    const next = it.interval >= 1 ? Math.round(it.interval * 2.5) : 3;
    if (next > 30) {
      profile.srs.splice(i, 1); // graduado: ya lo dominas
    } else {
      profile.srs[i] = { ...it, interval: next, dueAt: now + next * DAY };
    }
  }
}

export function dueCount(profile: Profile): number {
  const now = Date.now();
  return profile.srs.filter((s) => s.dueAt <= now).length;
}
