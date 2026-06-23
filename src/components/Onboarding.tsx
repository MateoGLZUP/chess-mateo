interface Level {
  label: string;
  sub: string;
  rating: number;
  icon: string;
}

const LEVELS: Level[] = [
  { label: "Soy nuevo", sub: "Estoy aprendiendo las tácticas", rating: 700, icon: "🌱" },
  { label: "Juego casual", sub: "Juego de vez en cuando", rating: 1000, icon: "♟️" },
  { label: "Nivel club", sub: "Tengo experiencia, conozco tácticas", rating: 1400, icon: "♞" },
  { label: "Fuerte / torneo", sub: "Juego competitivo", rating: 1800, icon: "♛" }
];

export default function Onboarding({ onPick }: { onPick: (rating: number) => void }) {
  return (
    <div className="onboarding">
      <div className="ob-hero">
        <div className="ob-logo">♞</div>
        <h1>Chess Mateo</h1>
        <p>Puzzles tácticos que se adaptan a tu nivel. Para empezar, ¿qué tan fuerte juegas?</p>
      </div>
      <div className="ob-levels">
        {LEVELS.map((l) => (
          <button key={l.rating} className="ob-level" onClick={() => onPick(l.rating)}>
            <span className="ob-level-icon">{l.icon}</span>
            <span className="ob-level-text">
              <b>{l.label}</b>
              <small>{l.sub}</small>
            </span>
            <span className="ob-level-go">→</span>
          </button>
        ))}
      </div>
      <p className="ob-foot">No te preocupes si no aciertas: la app se calibra sola en las primeras partidas.</p>
    </div>
  );
}
