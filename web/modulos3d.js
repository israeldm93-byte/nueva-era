// Biblioteca modular de construcción: piezas sencillas (cimientos, muros, entramados,
// tejados, puertas, ventanas, chimeneas, andamios, estacas y pilas de material) que se
// combinan en recetas. Cada receta se funde en UNA sola geometría con colores por vértice y
// se dibuja con instancias: cien casas iguales cuestan lo mismo que una.
//
// El estado del mundo dice qué hay, dónde, de qué tipo y a qué nivel; aquí solo se decide
// cómo se ve. Las piezas usan la misma paleta y el mismo modelado low-poly que el resto de
// edificios (ver edificios3d.js), para que todo parezca del mismo mundo.
//
// Ampliar la biblioteca: añadir una pieza (una función que devuelve piezas para `fundir`) o
// una receta en RECETAS con la clave `tipo-nivel` (o el nombre de una fase de obra).

import { B, C, Do, Es, fundir } from './util3d.js?v=__MOTOR__';

/** La paleta común (la de las casas que ya había). */
export const PALETA = {
  madera: 0x7a5534,
  maderaOscura: 0x5a3d22,
  maderaClara: 0xc8a878,
  hueco: 0x22170f,
  cristal: 0x2a3a48,
  paja: 0xc9a24f,
  adobe: 0xcf9663,
  enlucido: 0xe6dccb,
  enlucidoCalido: 0xe0c9a0,
  piedra: 0xa49a88,
  piedraOscura: 0x8f877a,
  junta: 0x6f675c,
  teja: 0xb5532f,
  tejaOscura: 0x8a3a22,
  barro: 0xb5653a,
  tierra: 0x7a5a3a,
  cuerda: 0xd8c8a0,
};
const P = PALETA;

// ---------------------------------------------------------------------------------------
// Piezas. Todas devuelven listas de piezas para `fundir`; el origen es el centro del suelo
// del edificio y la fachada (la puerta) mira hacia +z.
// ---------------------------------------------------------------------------------------

/** Cimiento: una losa baja de piedra, algo más grande que la planta. */
export const cimiento = (w, d, color = P.piedraOscura, alto = 0.12) => [{ geo: B(w + 0.12, alto, d + 0.12), color, y: alto / 2 }];

/** Muro macizo (un bloque) con hiladas marcadas si es de sillería. */
export function muro(w, h, d, y0, color, hiladas = false) {
  const r = [{ geo: B(w, h, d), color, y: y0 + h / 2 }];
  if (!hiladas) return r;
  for (let k = 0; k < Math.floor(h / 0.17); k++) {
    for (const [lx, lz, ww, dd] of [[0, d / 2 + 0.005, w, 0.012], [0, -d / 2 - 0.005, w, 0.012], [w / 2 + 0.005, 0, 0.012, d], [-w / 2 - 0.005, 0, 0.012, d]]) {
      r.push({ geo: B(ww + 0.002, 0.018, dd + 0.002), color: P.junta, x: lx, y: y0 + 0.17 * (k + 1), z: lz });
    }
  }
  return r;
}

/** Entramado de madera sobre un muro: postes en las esquinas y vigas arriba y abajo. */
export function entramado(w, h, d, y0, color = P.maderaOscura) {
  const r = [];
  for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) r.push({ geo: B(0.07, h, 0.07), color, x, y: y0 + h / 2, z });
  for (const y of [y0 + 0.03, y0 + h - 0.03]) {
    r.push({ geo: B(w + 0.06, 0.06, 0.06), color, y, z: d / 2 + 0.01 }, { geo: B(w + 0.06, 0.06, 0.06), color, y, z: -d / 2 - 0.01 });
    r.push({ geo: B(0.06, 0.06, d + 0.06), color, x: w / 2 + 0.01, y }, { geo: B(0.06, 0.06, d + 0.06), color, x: -w / 2 - 0.01, y });
  }
  // Una cruz de San Andrés en la fachada.
  r.push({ geo: B(0.05, h * 1.1, 0.04), color, x: -w / 4, y: y0 + h / 2, z: d / 2 + 0.02, rz: 0.55 });
  r.push({ geo: B(0.05, h * 1.1, 0.04), color, x: w / 4, y: y0 + h / 2, z: d / 2 + 0.02, rz: -0.55 });
  return r;
}

/** Tejado a dos aguas a 45° (largo en x) sobre muros de fondo `d` que acaban en `y`. */
export function tejado(w, d, y, color, tejas = false) {
  const L = d * 0.76;
  const r = [
    { geo: B(w, 0.06, L), color, y: y + d / 4, z: -d / 4, rx: -Math.PI / 4 },
    { geo: B(w, 0.06, L), color, y: y + d / 4, z: d / 4, rx: Math.PI / 4 },
    { geo: B(w + 0.02, 0.07, 0.1), color: tejas ? P.tejaOscura : 0x9a7a3a, y: y + d / 2 + 0.02 },
  ];
  if (tejas) {
    for (let x = -w / 2 + 0.06; x < w / 2; x += 0.16) {
      r.push({ geo: C(0.024, 0.024, L, 4), color: 0x9c4428, x, y: y + d / 4 + 0.03, z: -d / 4 - 0.02, rx: Math.PI / 4 });
      r.push({ geo: C(0.024, 0.024, L, 4), color: 0x9c4428, x, y: y + d / 4 + 0.03, z: d / 4 + 0.02, rx: -Math.PI / 4 });
    }
  }
  return r;
}

/** Hastiales: el triángulo de pared bajo el tejado, en los dos extremos. */
export const hastiales = (w, y, d, color) => [-1, 1].map((s) => ({ geo: B(0.05, d * 0.707, d * 0.707), color, x: (s * (w - 0.04)) / 2, y, rx: Math.PI / 4 }));

/** Puerta de tablas con dintel, en la fachada (+z) de un muro de fondo `d`. */
export const puerta = (d, ancho = 0.3, alto = 0.5, x = 0, color = P.maderaOscura) => [
  { geo: B(ancho, alto, 0.06), color, x, y: alto / 2, z: d / 2 + 0.01 },
  { geo: B(ancho + 0.1, 0.07, 0.08), color: P.piedraOscura, x, y: alto + 0.04, z: d / 2 + 0.02 },
];

/** Ventanas a una altura, repartidas por la fachada (y, si se pide, por detrás). */
export function ventanas(xs, y, d, color = P.hueco, detras = false, tam = 0.17) {
  const r = xs.map((x) => ({ geo: B(tam, tam, 0.05), color, x, y, z: d / 2 + 0.01 }));
  if (detras) r.push(...xs.map((x) => ({ geo: B(tam, tam, 0.05), color, x, y, z: -d / 2 - 0.01 })));
  return r;
}

/** Chimenea. */
export const chimenea = (x, z, y, alto, color = P.piedraOscura) => [
  { geo: B(0.18, alto, 0.18), color, x, y: y + alto / 2, z },
  { geo: B(0.22, 0.05, 0.22), color: P.tejaOscura, x, y: y + alto + 0.02, z },
];

/** Balcón de madera en la fachada. */
export const balcon = (w, y, d) => [
  { geo: B(w, 0.05, 0.25), color: P.maderaOscura, y, z: d / 2 + 0.12 },
  { geo: B(w, 0.16, 0.03), color: P.maderaOscura, y: y + 0.1, z: d / 2 + 0.24 },
];

/** Andamio de varas atadas alrededor de una planta de `w`×`d`, de alto `h`. */
export function andamio(w, d, h) {
  const r = [];
  const x = w / 2 + 0.12;
  const z = d / 2 + 0.12;
  for (const [px, pz] of [[-x, -z], [x, -z], [-x, z], [x, z]]) r.push({ geo: B(0.05, h, 0.05), color: P.maderaClara, x: px, y: h / 2, z: pz });
  for (let y = 0.45; y < h; y += 0.45) {
    r.push({ geo: B(2 * x, 0.04, 0.04), color: P.maderaClara, y, z }, { geo: B(2 * x, 0.04, 0.04), color: P.maderaClara, y, z: -z });
    r.push({ geo: B(0.04, 0.04, 2 * z), color: P.maderaClara, x, y }, { geo: B(0.04, 0.04, 2 * z), color: P.maderaClara, x: -x, y });
  }
  // Un tablón para andar y una escalera de mano.
  r.push({ geo: B(2 * x, 0.03, 0.18), color: 0xb89868, y: Math.min(h - 0.05, 0.9), z: z + 0.04 });
  r.push({ geo: B(0.04, h * 0.9, 0.04), color: P.maderaClara, x: x + 0.1, y: h * 0.45, z: z + 0.05, rz: 0.15 });
  return r;
}

/** Estacas en las esquinas de una planta, unidas por cordeles: un solar marcado. */
export function estacas(w, d) {
  const r = [];
  for (const [x, z] of [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]]) r.push({ geo: B(0.05, 0.32, 0.05), color: P.madera, x, y: 0.16, z });
  r.push({ geo: B(w, 0.015, 0.015), color: P.cuerda, y: 0.26, z: d / 2 }, { geo: B(w, 0.015, 0.015), color: P.cuerda, y: 0.26, z: -d / 2 });
  r.push({ geo: B(0.015, 0.015, d), color: P.cuerda, x: w / 2, y: 0.26 }, { geo: B(0.015, 0.015, d), color: P.cuerda, x: -w / 2, y: 0.26 });
  return r;
}

/** Pila de troncos y pila de piedras (los materiales esperando junto a la obra). */
export const troncos = (x, z) => [0, 1, 2].map((k) => ({ geo: C(0.06, 0.06, 0.7, 6), color: k === 1 ? P.maderaOscura : P.madera, x: x + (k - 1) * 0.12, y: 0.06 + (k === 1 ? 0.1 : 0), z, rz: Math.PI / 2 }));
export const piedras = (x, z) => [[0, 0], [0.12, 0.05], [-0.1, 0.08], [0.03, -0.1]].map(([dx, dz], k) => ({ geo: Do(0.09), color: k % 2 ? 0x9a948a : 0x7d7a74, x: x + dx, y: 0.07 + (k === 3 ? 0.08 : 0), z: z + dz }));

// ---------------------------------------------------------------------------------------
// Recetas: cómo se ve cada edificio mejorado y cada fase de una obra.
// ---------------------------------------------------------------------------------------

export const RECETAS = {
  // Casa de adobe con planta alta de entramado: la de abajo como siempre, encima otra algo
  // más ancha (vuela sobre la calle), y tejado de paja.
  'casa-2': () => [
    ...muro(1.34, 0.82, 1.04, 0, P.adobe),
    ...puerta(1.04, 0.28, 0.46, 0, 0x34241a),
    ...ventanas([-0.42, 0.42], 0.52, 1.04),
    { geo: B(1.5, 0.08, 1.2), color: P.maderaOscura, y: 0.86 },
    ...muro(1.42, 0.62, 1.1, 0.9, P.enlucidoCalido),
    ...entramado(1.42, 0.62, 1.1, 0.9),
    ...ventanas([-0.42, 0.42], 1.22, 1.1, P.cristal, true),
    ...tejado(1.6, 1.3, 1.52, P.paja),
    ...hastiales(1.42, 1.52, 1.1, P.enlucidoCalido),
    ...chimenea(0.45, -0.25, 1.6, 0.5, 0xb9895a),
  ],
  // Casa de piedra con un segundo piso de sillería y un balcón.
  'casapiedra-2': () => [
    ...muro(1.36, 0.85, 1.0, 0, P.piedra, true),
    ...puerta(1.0, 0.3, 0.5, 0, P.maderaOscura),
    ...ventanas([-0.42, 0.42], 0.55, 1.0),
    ...muro(1.36, 0.7, 1.0, 0.85, 0xb0a694, true),
    ...ventanas([-0.42, 0, 0.42], 1.2, 1.0, P.cristal, true),
    ...balcon(0.8, 0.9, 1.0),
    ...tejado(1.56, 1.2, 1.55, P.paja),
    ...hastiales(1.36, 1.55, 1.0, P.piedra),
    ...chimenea(0.42, -0.2, 1.7, 0.55),
  ],
  // Casa de tejas que gana un tercer piso con entramado bajo el tejado.
  'casatejas-2': () => [
    ...cimiento(1.5, 1.1),
    ...muro(1.5, 1.35, 1.1, 0.06, P.enlucido),
    ...[-0.75, 0.75].flatMap((x) => [-0.55, 0.55].map((z) => ({ geo: B(0.1, 1.35, 0.1), color: 0xb0a490, x, y: 0.74, z }))),
    ...puerta(1.1, 0.32, 0.6, 0, 0x6a3f22),
    ...ventanas([-0.5, 0.5], 0.5, 1.1, P.cristal, false, 0.2),
    ...ventanas([-0.5, 0, 0.5], 1.1, 1.1, P.cristal, true, 0.2),
    ...balcon(0.9, 0.94, 1.1),
    ...muro(1.56, 0.6, 1.16, 1.41, P.enlucidoCalido),
    ...entramado(1.56, 0.6, 1.16, 1.41),
    ...ventanas([-0.45, 0.45], 1.72, 1.16, P.cristal, true),
    ...tejado(1.78, 1.38, 2.01, P.teja, true),
    ...hastiales(1.56, 2.01, 1.16, P.enlucidoCalido),
    ...chimenea(-0.5, -0.15, 2.2, 0.6, 0xd8ccb8),
  ],
  // Almacén grande: muros de piedra, portón y tejado de tejas, con vasijas a la puerta.
  'almacen-2': () => [
    ...cimiento(1.6, 1.2),
    ...muro(1.6, 1.0, 1.2, 0.08, P.piedra, true),
    ...puerta(1.2, 0.55, 0.7, 0, P.maderaOscura),
    ...ventanas([-0.55, 0.55], 0.75, 1.2, P.hueco, false, 0.12),
    ...tejado(1.8, 1.4, 1.08, P.teja, true),
    ...hastiales(1.6, 1.08, 1.2, P.piedra),
    ...[-0.62, -0.42, 0.45, 0.65].map((x) => ({ geo: Es(0.11, 7, 5), color: P.barro, x, y: 0.14, z: 0.78, sy: 1.35 })),
  ],
  // Fases de una obra: el solar marcado, los cimientos con el material al lado y el armazón.
  solar: () => [...estacas(1.4, 1.1), ...troncos(0.95, 0.4)],
  cimientos: () => [...muro(1.4, 0.16, 1.1, 0, P.piedraOscura), { geo: B(1.16, 0.05, 0.86), color: P.tierra, y: 0.13 }, ...troncos(1.0, 0.5), ...piedras(-1.0, 0.45)],
  armazon: () => [
    ...muro(1.4, 0.16, 1.1, 0, P.piedraOscura),
    ...entramado(1.36, 0.9, 1.06, 0.16, P.madera),
    ...andamio(1.4, 1.1, 1.3),
    ...piedras(-1.0, 0.5),
  ],
};

/** La geometría de cada receta (fundida una sola vez). */
export function geometrias() {
  return Object.fromEntries(Object.entries(RECETAS).map(([k, f]) => [k, fundir(f())]));
}

/** Las variantes por nivel que hay (para saber si un edificio mejorado tiene su modelo). */
export const VARIANTES = new Set(Object.keys(RECETAS).filter((k) => /-\d$/.test(k)));

/** La fase de una obra según cómo va: solar (sin materiales), cimientos, armazón o casi hecha. */
export function faseObra(obra) {
  if (!obra.pagada) return 'solar';
  if (obra.progreso < 0.35) return 'cimientos';
  if (obra.progreso < 0.8) return 'armazon';
  return 'remate';
}

