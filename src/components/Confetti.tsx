// Confeti ligero hecho con DOM + CSS (sin librerías).
const COLORS = ["#f0556a", "#7aa2f7", "#5bd16a", "#e8c84a", "#b07af7", "#4eced6"];

export default function Confetti({ show }: { show: boolean }) {
  if (!show) return null;
  const pieces = Array.from({ length: 48 });
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((_, i) => {
        const left = (i * 21.7) % 100;
        const delay = (i % 12) * 60;
        const dur = 1400 + ((i * 53) % 900);
        const color = COLORS[i % COLORS.length];
        const rot = (i * 47) % 360;
        return (
          <span
            key={i}
            className="confetti-pc"
            style={{
              left: `${left}%`,
              background: color,
              animationDelay: `${delay}ms`,
              animationDuration: `${dur}ms`,
              transform: `rotate(${rot}deg)`
            }}
          />
        );
      })}
    </div>
  );
}
