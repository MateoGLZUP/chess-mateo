// Descarga un set curado de puzzles reales de Lichess (licencia CC0) desde el
// datasets-server de HuggingFace y los guarda en public/data/puzzles.json.
//
// Uso:   node scripts/fetch-puzzles.mjs [paginas]
//   p.ej. node scripts/fetch-puzzles.mjs 120     (120 x 100 = 12000 crudos)
//
// Filtra por calidad (popularidad/jugadas) para quedarse con los mejores.
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "data");

const PAGES = Number(process.argv[2] || 60);
const PAGE_SIZE = 100;
const MIN_POPULARITY = 85;
const MIN_PLAYS = 40;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(offset) {
  const url = `https://datasets-server.huggingface.co/rows?dataset=Lichess/chess-puzzles&config=default&split=train&offset=${offset}&length=${PAGE_SIZE}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.rows.map((r) => r.row);
    } catch (e) {
      console.error(`  retry offset=${offset} (${e.message})`);
      await sleep(800 * (attempt + 1));
    }
  }
  return [];
}

const kept = [];
for (let p = 0; p < PAGES; p++) {
  const rows = await fetchPage(p * PAGE_SIZE);
  for (const row of rows) {
    if (row.Popularity >= MIN_POPULARITY && row.NbPlays >= MIN_PLAYS) {
      kept.push({
        id: row.PuzzleId,
        fen: row.FEN,
        moves: row.Moves.split(" "),
        rating: row.Rating,
        popularity: row.Popularity,
        themes: row.Themes || [],
        openings: row.OpeningTags || [],
        gameId: row.GameId
      });
    }
  }
  if ((p + 1) % 10 === 0) console.log(`  ...${p + 1}/${PAGES} paginas, ${kept.length} guardados`);
  await sleep(120);
}

kept.sort((a, b) => a.rating - b.rating);
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "puzzles.json"), JSON.stringify(kept));

const ratings = kept.map((k) => k.rating);
console.log(`\nLISTO: ${kept.length} puzzles -> public/data/puzzles.json`);
console.log(`Rango de rating: ${ratings[0]} - ${ratings[ratings.length - 1]}`);
