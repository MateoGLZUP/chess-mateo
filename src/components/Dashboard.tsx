import type { Profile } from "../lib/types";
import { themeLabel, isMotif } from "../lib/themes";
import { rankFor } from "../lib/rank";

interface Props {
  profile: Profile;
  dueCount: number;
  onTrainTheme: (theme: string) => void;
}

export default function Dashboard({ profile, dueCount, onTrainTheme }: Props) {
  const acc = profile.totalAttempts
    ? Math.round((100 * profile.totalClean) / profile.totalAttempts)
    : 0;

  const themeRows = Object.entries(profile.byTheme)
    .filter(([k]) => isMotif(k))
    .map(([k, v]) => {
      const total = v.solved + v.failed;
      return { k, total, acc: total ? v.solved / total : 0 };
    })
    .filter((r) => r.total >= 3)
    .sort((a, b) => a.acc - b.acc);

  const weakest = themeRows[0];

  return (
    <div className="dash">
      <div className="rating-hero">
        <div className="rh-rank">
          {rankFor(profile.rating.rating).icon} {rankFor(profile.rating.rating).name}
        </div>
        <div className="rh-value">{profile.rating.rating}</div>
        <div className="rh-sub">± {profile.rating.rd} de margen · rating de táctica</div>
        <Spark history={profile.history} />
      </div>

      <div className="stat-grid">
        <Stat label="Resueltos" value={profile.totalClean} />
        <Stat label="Precisión" value={`${acc}%`} />
        <Stat label="Racha" value={profile.currentStreak} />
        <Stat label="Mejor racha" value={profile.bestStreak} />
      </div>

      {dueCount > 0 && (
        <div className="due">
          🔁 Tienes {dueCount} repaso{dueCount > 1 ? "s" : ""} pendiente{dueCount > 1 ? "s" : ""} — aparecerán solos al jugar.
        </div>
      )}

      {weakest && (
        <div className="reco">
          <div className="reco-title">📌 Sugerencia para ti</div>
          <div>
            Tu punto más flojo es <b>{themeLabel(weakest.k)}</b> ({Math.round(weakest.acc * 100)}% de acierto).
            Entrénalo un rato para subir rápido.
          </div>
          <button className="btn primary" onClick={() => onTrainTheme(weakest.k)}>
            Entrenar {themeLabel(weakest.k)}
          </button>
        </div>
      )}

      {themeRows.length > 0 && (
        <div className="theme-list">
          <div className="tl-title">Precisión por motivo (toca para entrenar)</div>
          {themeRows.slice(0, 12).map((r) => (
            <button key={r.k} className="tl-row" onClick={() => onTrainTheme(r.k)}>
              <span className="tl-name">{themeLabel(r.k)}</span>
              <span className="tl-bar">
                <span className="tl-fill" style={{ width: `${Math.round(r.acc * 100)}%` }} />
              </span>
              <span className="tl-pct">{Math.round(r.acc * 100)}%</span>
            </button>
          ))}
        </div>
      )}

      {profile.totalAttempts === 0 && (
        <div className="empty">Resuelve algunos puzzles y aquí verás tu progreso y tus puntos débiles.</div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <div className="stat-v">{value}</div>
      <div className="stat-l">{label}</div>
    </div>
  );
}

function Spark({ history }: { history: { t: number; r: number }[] }) {
  if (history.length < 2) return null;
  const ys = history.map((h) => h.r);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const W = 280;
  const H = 56;
  const pad = 4;
  const sx = (i: number) => pad + (W - 2 * pad) * (i / (ys.length - 1));
  const sy = (v: number) => pad + (H - 2 * pad) * (1 - (v - min) / Math.max(1, max - min));
  const d = ys.map((v, i) => `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(" ");
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
