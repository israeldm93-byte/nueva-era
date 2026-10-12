// Más allá del mar: el mundo se amplía hacia el este y el sur.
//
// El continente de siempre se queda exactamente donde estaba (arriba a la izquierda, con
// las mismas coordenadas): cada casilla conserva su terreno, su relieve y sus recursos, y
// todo lo que guarda una casilla por su índice se vuelve a calcular para el ancho nuevo.
// Alrededor, mar abierto, cada vez más hondo.

import { entero, azar, estadoAzar, fijarAzar } from './azar.ts';
import { AGUA, BOSQUE, CAPACIDAD, COLINA, DESIERTO, ESTEPA, MONTANA, ORILLA, PRADERA, TUNDRA } from './catalogo.ts';
import { ALTO, ANCHO } from './config.ts';
import { fbm } from './mapa.ts';
import type { Mundo } from './tipos.ts';

const r2 = (x: number) => Math.round(x * 100) / 100;

/**
 * Amplía el mapa a `W`×`H` sin mover nada: lo que había sigue en la misma x e y.
 * Lo nuevo es mar (más hondo cuanto más lejos de la costa de siempre).
 */
export function ampliarMapa(m: Mundo, W: number, H: number): void {
  const w0 = m.ancho;
  const h0 = m.alto;
  if (W < w0 || H < h0) throw new Error(`El mapa no puede encoger (${w0}×${h0} → ${W}×${H}).`);
  if (W === w0 && H === h0) return;
  /** Cuánto se aleja una casilla nueva del borde del mapa de siempre. */
  const lejos = (x: number, y: number) => Math.max(0, x - (w0 - 1), y - (h0 - 1));
  const ampliar = <T>(viejo: T[], relleno: (x: number, y: number) => T): T[] => {
    const out = new Array<T>(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) out[y * W + x] = x < w0 && y < h0 ? viejo[y * w0 + x] : relleno(x, y);
    }
    return out;
  };
  m.terreno = ampliar(m.terreno, () => AGUA);
  m.relieve = ampliar(m.relieve, (x, y) => -Math.round(40 + Math.min(60, 4 * lejos(x, y))));
  for (const capa of Object.keys(m.recursos)) {
    const lleno = r2((CAPACIDAD[capa]?.[AGUA] ?? 0) * 0.8);
    m.recursos[capa] = ampliar(m.recursos[capa], () => lleno);
  }
  // Lo que se guarda por número de casilla: misma x e y, índice nuevo.
  const indice = (i: number) => (i % w0) + Math.floor(i / w0) * W;
  for (const f of m.fauna) f.guarida = indice(f.guarida);
  for (const lista of [m.incendios, m.cenizas, m.inundadas]) for (const c of lista) c[0] = indice(c[0]);
  m.ancho = W;
  m.alto = H;
}

// ---------------------------------------------------------------------------------------
// Las tierras de ultramar: un norte frío, unas islas y un sur árido.

/** Lo que queda separado del continente de origen por al menos tantas casillas de mar. */
const MARGEN = 8;

/**
 * Crea las tierras de ultramar en lo que era mar abierto. No toca ni una casilla del
 * continente de origen (el rectángulo de arriba a la izquierda de `origen`) ni el mar que
 * lo rodea, y usa su propio azar (sacado de la semilla del mundo): el azar de la
 * simulación queda como estaba, así que todo lo demás sigue igual.
 */
export function crearUltramar(m: Mundo, origen: { ancho: number; alto: number }): void {
  const W = m.ancho;
  const H = m.alto;
  const fuera = (x: number, y: number) => x >= origen.ancho + MARGEN || y >= origen.alto + MARGEN;
  const sigue = estadoAzar();
  fijarAzar((Math.imul(m.semilla ^ 0x2c1b3c6d, 2654435761) + 0x9e37) >>> 0);
  try {
    const base = fbm(W, H, [26, 12, 6, 3], [0.5, 0.27, 0.15, 0.08]);
    const humedad = fbm(W, H, [20, 9], [0.65, 0.35]);
    const terreno = m.terreno.slice();
    const alturaRel = new Array<number>(W * H).fill(-1);
    /** Una región: dentro de la elipse, la tierra sale donde el ruido supera el nivel. */
    const region = (cx: number, cy: number, rx: number, ry: number, nivel: number, x0: number, x1: number, y0: number, y1: number, tipo: (a: number, h: number, x: number, y: number) => number, escala = 0.35) => {
      for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) {
        for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) {
          if (!fuera(x, y)) continue;
          const i = y * W + x;
          const u = Math.hypot((x - cx) / rx, (y - cy) / ry);
          const e = base[i] + 0.55 * (1 - u) - nivel;
          // A los bordes del mundo no llega la tierra (siempre hay mar alrededor).
          if (e <= 0 || x < 3 || y < 3 || x > W - 4 || y > H - 4) continue;
          const a = Math.min(1, e / escala);
          alturaRel[i] = a;
          terreno[i] = tipo(a, humedad[i], x, y);
        }
      }
    };
    // El norte frío (al noreste): tundra en lo más alto del mapa, taiga más abajo y donde
    // es más húmedo, y cumbres nevadas.
    // (Cuanto más al norte, más húmedo tiene que ser para que crezca el bosque.)
    region(212, 36, 42, 34, 0.62, 168, 252, 3, 74, (a, h, _x, y) => (a > 0.86 ? MONTANA : a > 0.7 ? COLINA : h > 0.42 + 0.5 * Math.max(0, Math.min(1, (48 - y) / 30)) ? BOSQUE : TUNDRA), 0.42);
    // El sur árido: desierto, sabana (estepa) donde llueve algo y sierras rocosas.
    region(128, 157, 112, 30, 0.6, 4, 252, 122, 188, (a, h, _x, y) => (a > 0.85 ? MONTANA : a > 0.66 ? COLINA : h > 0.56 || (y < 140 && h > 0.46) ? ESTEPA : DESIERTO), 0.5);
    // Las islas, al este, entre el norte y el sur.
    const islas: [number, number, number][] = [];
    for (let k = 0; k < 400 && islas.length < 8; k++) {
      const r = 3 + entero(5);
      const x = 172 + entero(78);
      const y = 82 + entero(34);
      if (islas.some(([ix, iy, ir]) => Math.hypot(ix - x, iy - y) < ir + r + 5)) continue;
      islas.push([x, y, r]);
    }
    // Bajas y verdes: playas, praderas y bosque, y alguna loma en medio.
    for (const [x, y, r] of islas) region(x, y, r, r, 0.25, x - r - 2, x + r + 2, y - r - 2, y + r + 2, (a, h) => (a > 0.86 ? COLINA : h > 0.52 ? BOSQUE : PRADERA), 0.8);
    // Oasis en el desierto: una laguna de agua dulce con tierra fértil alrededor.
    const desiertos: number[] = [];
    for (let i = 0; i < W * H; i++) if (terreno[i] === DESIERTO) desiertos.push(i);
    for (let k = 0; k < 6 && desiertos.length; k++) {
      const c = desiertos[entero(desiertos.length)];
      const cx = c % W;
      const cy = (c - cx) / W;
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const x = cx + dx;
          const y = cy + dy;
          const i = y * W + x;
          if (!fuera(x, y) || terreno[i] === AGUA) continue;
          const d = Math.hypot(dx, dy);
          if (d <= 1) terreno[i] = AGUA;
          else if (d <= 2.6) terreno[i] = PRADERA;
        }
      }
    }
    // La orilla: tierra baja junto al agua.
    for (let i = 0; i < W * H; i++) {
      if (terreno[i] === AGUA || alturaRel[i] < 0 || alturaRel[i] > 0.3 || terreno[i] === MONTANA) continue;
      const x = i % W;
      const y = (i - x) / W;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => terreno[(y + dy) * W + x + dx] === AGUA)) terreno[i] = ORILLA;
    }
    // Relieve: la tierra, según su altura; el mar, más hondo cuanto más lejos de la costa.
    const lejos = distanciaATierra(terreno, W, H, 12);
    for (let i = 0; i < W * H; i++) {
      const x = i % W;
      const y = (i - x) / W;
      if (!fuera(x, y)) continue;
      // (Junto a las costas nuevas, poco hondo; lejos de toda costa, el fondo de siempre.)
      if (terreno[i] === AGUA) m.relieve[i] = Math.max(-100, m.relieve[i], -6 - 8 * lejos[i], alturaRel[i] >= 0 ? -12 : -100);
      else m.relieve[i] = Math.round(4 + 92 * Math.max(0, alturaRel[i]));
    }
    // Recursos de cada casilla nueva (como en el continente: su capacidad, con algo de azar).
    for (let i = 0; i < W * H; i++) {
      const x = i % W;
      const y = (i - x) / W;
      if (!fuera(x, y) || terreno[i] === m.terreno[i]) continue;
      for (const capa of Object.keys(m.recursos)) m.recursos[capa][i] = r2((CAPACIDAD[capa]?.[terreno[i]] ?? 0) * (0.6 + 0.4 * azar()));
    }
    // Vetas: el sur, rico en minerales; el norte, en hierro; alguna isla, en estaño y cobre.
    const rocas = (y0: number, y1: number, x0 = 0) => {
      const out: number[] = [];
      for (let i = 0; i < W * H; i++) {
        const x = i % W;
        const y = (i - x) / W;
        if (y >= y0 && y <= y1 && x >= x0 && fuera(x, y) && (terreno[i] === COLINA || terreno[i] === MONTANA)) out.push(i);
      }
      return out;
    };
    const vetas = (lista: number[], mineral: string, cuantas: number, min: number, max: number) => {
      for (let k = 0; k < cuantas && lista.length; k++) m.recursos[mineral][lista[entero(lista.length)]] = min + entero(max - min);
    };
    const sur = rocas(122, H - 1);
    vetas(sur, 'hematites', 10, 40, 90);
    vetas(sur, 'casiterita', 7, 25, 60);
    vetas(sur, 'malaquita', 7, 30, 70);
    vetas(rocas(0, 74, 168), 'hematites', 5, 40, 80);
    vetas(rocas(80, 120, 168), 'casiterita', 3, 40, 70);
    vetas(rocas(80, 120, 168), 'malaquita', 2, 40, 70);
    // Un array nuevo: las cachés (tierras, orillas) se rehacen con el mapa nuevo.
    m.terreno = terreno;
  } finally {
    fijarAzar(sigue);
  }
}

/** Distancia (en pasos) de cada casilla de agua a la tierra más cercana, hasta `max`. */
function distanciaATierra(terreno: number[], W: number, H: number, max: number): number[] {
  const d = new Array<number>(W * H).fill(max);
  let frente: number[] = [];
  for (let i = 0; i < W * H; i++) {
    if (terreno[i] !== AGUA) {
      d[i] = 0;
      frente.push(i);
    }
  }
  for (let paso = 1; paso < max && frente.length; paso++) {
    const otro: number[] = [];
    for (const i of frente) {
      const x = i % W;
      const y = (i - x) / W;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const j = yy * W + xx;
        if (d[j] > paso) {
          d[j] = paso;
          otro.push(j);
        }
      }
    }
    frente = otro;
  }
  return d;
}

/**
 * Lo frío que es un sitio (0 a 1): solo en el norte de ultramar, más cuanto más al norte.
 * En el continente de origen, 0 (allí todo sigue como siempre).
 */
export function frioDe(_m: Mundo, x: number, y: number, origen = { ancho: ANCHO, alto: ALTO }): number {
  if (x < origen.ancho && y < origen.alto) return 0;
  return Math.max(0, Math.min(1, (0.55 - y / (origen.alto - 1)) / 0.35));
}

const cacheFrio = new WeakMap<number[], number[] | null>();

/** El frío de cada casilla del mapa (o null si en ninguna hace frío). Se calcula una vez por mapa. */
export function friosDe(m: Mundo): number[] | null {
  if (cacheFrio.has(m.terreno)) return cacheFrio.get(m.terreno)!;
  let out: number[] | null = null;
  for (let y = 0; y < m.alto; y++) {
    for (let x = 0; x < m.ancho; x++) {
      const f = frioDe(m, x, y);
      if (f <= 0) continue;
      out ??= new Array<number>(m.ancho * m.alto).fill(0);
      out[y * m.ancho + x] = f;
    }
  }
  cacheFrio.set(m.terreno, out);
  return out;
}
