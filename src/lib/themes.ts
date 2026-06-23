// Traduccion y consejos de los temas (motivos tacticos) de Lichess al espanol.
interface ThemeDef {
  es: string;
  tip?: string;
  motif?: boolean; // true = motivo tactico entrenable (no solo contexto/fase)
}

const T: Record<string, ThemeDef> = {
  // --- motivos tacticos ---
  fork: { es: "Tenedor", tip: "Una pieza ataca dos o mas objetivos a la vez. Vigila los caballos y la dama en el centro.", motif: true },
  pin: { es: "Clavada", tip: "La pieza no puede moverse porque dejaria expuesta a una mas valiosa detras.", motif: true },
  skewer: { es: "Enfilada", tip: "Como una clavada al reves: la pieza valiosa esta delante y al moverse cae la de atras.", motif: true },
  discoveredAttack: { es: "Ataque a la descubierta", tip: "Mueve una pieza para destapar el ataque de otra que estaba detras.", motif: true },
  doubleCheck: { es: "Jaque doble", tip: "Dos piezas dan jaque a la vez: el rey esta obligado a moverse, no puede tapar ni capturar.", motif: true },
  hangingPiece: { es: "Pieza colgada", tip: "Hay una pieza enemiga sin defensa. Busca la captura.", motif: true },
  sacrifice: { es: "Sacrificio", tip: "Entrega material para lograr algo mayor: mate o una ganancia decisiva.", motif: true },
  deflection: { es: "Desviacion", tip: "Obliga a una pieza defensora a abandonar su puesto clave.", motif: true },
  attraction: { es: "Atraccion", tip: "Atrae al rey o a una pieza enemiga a una casilla fatal, normalmente con un sacrificio.", motif: true },
  clearance: { es: "Despeje", tip: "Libera una casilla o una linea para que tu pieza fuerte entre en juego.", motif: true },
  interference: { es: "Interferencia", tip: "Interpon una pieza para cortar la comunicacion entre las defensas rivales.", motif: true },
  xRayAttack: { es: "Ataque de rayos X", tip: "Atacas a traves de una pieza enemiga hacia el objetivo de atras.", motif: true },
  trappedPiece: { es: "Pieza atrapada", tip: "Una pieza enemiga no tiene casillas seguras: acorrala y captura.", motif: true },
  capturingDefender: { es: "Eliminar al defensor", tip: "Captura la pieza que sostiene la defensa y el resto se derrumba.", motif: true },
  intermezzo: { es: "Jugada intermedia", tip: "Antes de lo 'obvio', intercala una jugada con amenaza mayor (zwischenzug).", motif: true },
  quietMove: { es: "Jugada tranquila", tip: "No todo es jaque: a veces la clave es una jugada silenciosa que prepara el golpe.", motif: true },
  defensiveMove: { es: "Jugada defensiva", tip: "La mejor jugada aqui es defender con precision.", motif: true },
  zugzwang: { es: "Zugzwang", tip: "El rival debe mover y cualquier jugada empeora su posicion.", motif: true },
  advancedPawn: { es: "Peon avanzado", tip: "Un peon cerca de coronar es un arma decisiva.", motif: true },
  promotion: { es: "Coronacion", tip: "Lleva el peon a dama (o subpromociona a caballo si da jaque/mate).", motif: true },
  enPassant: { es: "Captura al paso", motif: true },
  underPromotion: { es: "Subpromocion", tip: "A veces coronar a caballo o torre es mas fuerte que a dama.", motif: true },
  attackingF2F7: { es: "Ataque a f2/f7", tip: "El punto mas debil cerca del rey enrocado.", motif: true },
  kingsideAttack: { es: "Ataque al flanco de rey", motif: true },
  queensideAttack: { es: "Ataque al flanco de dama", motif: true },
  exposedKing: { es: "Rey expuesto", motif: true },

  // --- mates ---
  mate: { es: "Jaque mate" },
  mateIn1: { es: "Mate en 1", tip: "Una sola jugada da jaque mate." },
  mateIn2: { es: "Mate en 2", tip: "Fuerza el mate en dos jugadas. Empieza por el jaque o la amenaza mas fuerte." },
  mateIn3: { es: "Mate en 3", tip: "Calcula con cuidado: busca jaques forzados que no den escape." },
  mateIn4: { es: "Mate en 4" },
  mateIn5: { es: "Mate en 5" },
  backRankMate: { es: "Mate del pasillo", tip: "El rey esta ahogado por sus propios peones en la ultima fila.", motif: true },
  smotheredMate: { es: "Mate de la coz", tip: "El caballo da mate a un rey rodeado por sus propias piezas.", motif: true },
  anastasiaMate: { es: "Mate de Anastasia" },
  arabianMate: { es: "Mate arabe" },
  bodenMate: { es: "Mate de Boden" },
  doubleBishopMate: { es: "Mate de los dos alfiles" },
  dovetailMate: { es: "Mate de la cola de golondrina" },
  hookMate: { es: "Mate del gancho" },
  killBoxMate: { es: "Mate de la caja" },
  vukovicMate: { es: "Mate de Vukovic" },
  pillsburysMate: { es: "Mate de Pillsbury" },
  cornerMate: { es: "Mate en la esquina" },

  // --- contexto / fase ---
  opening: { es: "Apertura" },
  middlegame: { es: "Medio juego" },
  endgame: { es: "Final" },
  rookEndgame: { es: "Final de torres" },
  pawnEndgame: { es: "Final de peones" },
  queenEndgame: { es: "Final de damas" },
  bishopEndgame: { es: "Final de alfiles" },
  knightEndgame: { es: "Final de caballos" },
  queenRookEndgame: { es: "Final de damas y torres" },
  rookPawnEndgame: { es: "Final de torre y peones" },

  // --- evaluacion / forma (se ocultan en los chips) ---
  crushing: { es: "Ventaja decisiva" },
  advantage: { es: "Ventaja" },
  equality: { es: "Igualar" },
  master: { es: "Partida de maestro" },
  masterVsMaster: { es: "Maestro vs maestro" },
  superGM: { es: "Super GM" },
  short: { es: "Corto" },
  long: { es: "Largo" },
  veryLong: { es: "Muy largo" },
  oneMove: { es: "Una jugada" }
};

const HIDE_IN_CHIPS = new Set([
  "short", "long", "veryLong", "oneMove",
  "master", "masterVsMaster", "superGM",
  "crushing", "advantage", "equality"
]);

export function themeLabel(key: string): string {
  return T[key]?.es ?? key;
}

export function isMotif(key: string): boolean {
  return !!T[key]?.motif || /^mateIn\d$/.test(key);
}

export function prettyThemes(themes: string[]): string[] {
  return themes.filter((t) => !HIDE_IN_CHIPS.has(t)).map(themeLabel);
}

export function themeTip(themes: string[]): string | undefined {
  for (const t of themes) {
    if (T[t]?.tip) return T[t]!.tip;
  }
  return undefined;
}
