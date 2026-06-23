# ♞ Chess Mateo — Puzzles tácticos adaptativos

App personal de puzzles de ajedrez tipo chess.com, hecha para correr como **PWA en el iPhone** (instalable, offline). Para divertirse y mejorar.

## Qué hace

- **Puzzles reales de Lichess** (base CC0, ~4.200 curados de 6M+).
- **Dificultad adaptativa con Glicko-2**: tu rating sube/baja según resuelvas; siempre te sirve puzzles a tu nivel (un pelín más difícil para empujarte). Nunca repetitivo.
- **Repetición espaciada**: los puzzles que fallas reaparecen días después hasta que los dominas.
- **Coaching**: pistas graduadas (pieza → jugada), nombre del motivo táctico y consejo al resolver, enlace al análisis en Lichess.
- **Entrenamiento por temas**: el dashboard detecta tu punto débil (p.ej. clavadas) y te deja entrenarlo.
- **Progreso**: rating, racha, precisión y gráfica de evolución. Todo guardado en el dispositivo (localStorage).

## Desarrollo

```bash
npm install
npm run dev        # servidor local (abre en navegador o en el iPhone vía la URL de red)
npm run build      # build de producción en dist/
npm run preview    # sirve el build
```

## Datos de puzzles

```bash
node scripts/fetch-puzzles.mjs 60     # baja ~4k puzzles a public/data/puzzles.json
node scripts/fetch-puzzles.mjs 200    # baja muchos más (set más grande)
```

## Stack

- **React + Vite** (PWA con `vite-plugin-pwa`)
- **chessground** (tablero de Lichess) + **chess.js** (validación de jugadas)
- **Glicko-2** propio para el rating adaptativo
- Sin backend: todo corre en el dispositivo y funciona offline

## Instalar en el iPhone

1. Abre la URL de la app en **Safari**.
2. Botón **Compartir** → **Agregar a inicio**.
3. Ábrela desde el ícono: pantalla completa, sin barra del navegador, y funciona sin internet.
