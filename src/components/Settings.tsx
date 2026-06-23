import { useState } from "react";
import type { Profile, Settings as SettingsType, BoardTheme } from "../lib/types";
import { exportProfile } from "../lib/storage";

interface Props {
  profile: Profile;
  onChange: (partial: Partial<SettingsType>) => void;
  onRecalibrate: (rating: number) => void;
  onImport: (json: string) => boolean;
  onReset: () => void;
}

const THEMES: { key: BoardTheme; name: string }[] = [
  { key: "green", name: "Verde" },
  { key: "brown", name: "Marrón" },
  { key: "blue", name: "Azul" }
];

const LEVELS = [
  { label: "Nuevo", rating: 700 },
  { label: "Casual", rating: 1000 },
  { label: "Club", rating: 1400 },
  { label: "Fuerte", rating: 1800 }
];

export default function Settings({ profile, onChange, onRecalibrate, onImport, onReset }: Props) {
  const s = profile.settings;
  const [showBackup, setShowBackup] = useState(false);
  const [importText, setImportText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  function copyBackup() {
    const data = exportProfile(profile);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(data).then(
        () => flash("✓ Copiado al portapapeles"),
        () => flash("No se pudo copiar; selecciona y copia manual")
      );
    } else {
      flash("Selecciona el texto y cópialo");
    }
  }

  function doImport() {
    if (onImport(importText.trim())) {
      flash("✓ Progreso importado");
      setImportText("");
    } else {
      flash("⚠️ Texto inválido");
    }
  }

  function flash(m: string) {
    setMsg(m);
    window.setTimeout(() => setMsg(null), 2500);
  }

  function recalibrate(rating: number) {
    if (confirm(`Esto pondrá tu rating en ${rating} y reiniciará su calibración. ¿Continuar?`)) {
      onRecalibrate(rating);
      flash(`Rating ajustado a ${rating}`);
    }
  }

  function reset() {
    if (confirm("Esto borra TODO tu progreso (rating, rachas, repasos). ¿Seguro?")) {
      onReset();
    }
  }

  return (
    <div className="settings">
      <h2 className="settings-h">Ajustes</h2>

      <section className="set-group">
        <div className="set-label">Tablero</div>
        <div className="theme-swatches">
          {THEMES.map((t) => (
            <button
              key={t.key}
              className={`swatch swatch-${t.key} ${s.boardTheme === t.key ? "active" : ""}`}
              onClick={() => onChange({ boardTheme: t.key })}
            >
              <span className="swatch-preview" />
              {t.name}
            </button>
          ))}
        </div>
      </section>

      <section className="set-group">
        <Toggle label="Sonidos" on={s.sounds} onClick={() => onChange({ sounds: !s.sounds })} />
        <Toggle label="Vibración (Android)" on={s.haptics} onClick={() => onChange({ haptics: !s.haptics })} />
        <Toggle label="Coordenadas en el tablero" on={s.coordinates} onClick={() => onChange({ coordinates: !s.coordinates })} />
      </section>

      <section className="set-group">
        <div className="set-label">Recalibrar nivel</div>
        <div className="set-sub">Ajusta tu rating si empezaste muy alto o muy bajo.</div>
        <div className="level-row">
          {LEVELS.map((l) => (
            <button key={l.rating} className="btn small" onClick={() => recalibrate(l.rating)}>
              {l.label}
            </button>
          ))}
        </div>
      </section>

      <section className="set-group">
        <div className="set-label">Respaldo del progreso</div>
        <div className="set-sub">Guarda o restaura tu avance (rating, rachas, repasos).</div>
        <button className="btn small" onClick={() => setShowBackup((v) => !v)}>
          {showBackup ? "Ocultar" : "Mostrar respaldo"}
        </button>
        {showBackup && (
          <div className="backup">
            <button className="btn small" onClick={copyBackup}>
              📋 Copiar mi progreso
            </button>
            <textarea
              className="backup-area"
              value={exportProfile(profile)}
              readOnly
              onFocus={(e) => e.currentTarget.select()}
            />
            <div className="set-sub">Para restaurar: pega aquí un respaldo y toca Importar.</div>
            <textarea
              className="backup-area"
              placeholder="Pega aquí tu respaldo…"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <button className="btn small" onClick={doImport} disabled={!importText.trim()}>
              Importar
            </button>
          </div>
        )}
      </section>

      <section className="set-group">
        <button className="btn danger" onClick={reset}>
          Borrar todo mi progreso
        </button>
      </section>

      {msg && <div className="set-toast">{msg}</div>}

      <div className="set-foot">Chess Mateo · puzzles de Lichess (CC0)</div>
    </div>
  );
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button className="toggle-row" onClick={onClick}>
      <span>{label}</span>
      <span className={`toggle ${on ? "on" : ""}`}>
        <span className="knob" />
      </span>
    </button>
  );
}
