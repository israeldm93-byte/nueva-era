// Caminos: senderos que nacen del ir y venir, y caminos que la gente construye.
//
// Cada vez que alguien va a trabajar lejos de su aldea, sale de visita, se muda o se marcha
// con los suyos, pisa la tierra por donde pasa. Donde se pasa mucho y a menudo, la hierba
// no vuelve a crecer y queda un sendero; si se deja de pasar, el sendero se borra. Con la
// técnica de los caminos, una aldea puede mejorar los tramos más transitados de sus
// senderos (camino de tierra compactada) y, sabiendo labrar la piedra, empedrarlos.
//
// Por un camino se anda más deprisa: los viajes por tierra que lo aprovechan tardan menos.
// Nunca sobre el agua: ni el tránsito ni los caminos cruzan el mar, los lagos ni los ríos.

import { AGUA, RIO } from './catalogo.ts';
import type { Mundo } from './tipos.ts';

/** Niveles de camino: 0 nada, 1 sendero, 2 camino de tierra, 3 empedrado. */
export const SENDERO = 1;
export const CAMINO = 2;
export const EMPEDRADO = 3;
/** Cuánto más deprisa se anda por cada nivel de camino. */
export const RAPIDEZ = [1, 1.2, 1.5, 1.9];
/** Tránsito a partir del cual queda un sendero, y por debajo del cual se borra. */
export const UMBRAL_SENDERO = 180;
export const UMBRAL_BORRA = 60;

/** El tránsito de cada casilla (se crea vacío la primera vez). */
export function transitoDe(m: Mundo): number[] {
  if (!m.transito || m.transito.length !== m.ancho * m.alto) m.transito = new Array<number>(m.ancho * m.alto).fill(0);
  return m.transito;
}

/** El nivel de camino de cada casilla (se crea vacío la primera vez). */
export function caminosDe(m: Mundo): number[] {
  if (!m.caminos || m.caminos.length !== m.ancho * m.alto) m.caminos = new Array<number>(m.ancho * m.alto).fill(0);
  return m.caminos;
}

const pisable = (m: Mundo, i: number) => m.terreno[i] !== AGUA && m.terreno[i] !== RIO;

/** Las casillas de la línea recta de un punto a otro (Bresenham). */
export function linea(x0: number, y0: number, x1: number, y1: number): number[][] {
  const out: number[][] = [];
  let x = Math.round(x0);
  let y = Math.round(y0);
  const xf = Math.round(x1);
  const yf = Math.round(y1);
  const dx = Math.abs(xf - x);
  const dy = -Math.abs(yf - y);
  const sx = x < xf ? 1 : -1;
  const sy = y < yf ? 1 : -1;
  let err = dx + dy;
  for (let k = 0; k < 2000; k++) {
    out.push([x, y]);
    if (x === xf && y === yf) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
  return out;
}

/**
 * Alguien recorre la línea de un punto a otro: deja `peso` de tránsito en cada casilla de
 * tierra (las `salto` primeras, las de dentro de la aldea, no cuentan).
 */
export function pisar(m: Mundo, x0: number, y0: number, x1: number, y1: number, peso: number, salto = 1): void {
  const tr = transitoDe(m);
  const l = linea(x0, y0, x1, y1);
  for (let k = salto; k < l.length; k++) {
    const [x, y] = l[k];
    if (x < 0 || y < 0 || x >= m.ancho || y >= m.alto) continue;
    const i = y * m.ancho + x;
    if (pisable(m, i)) tr[i] = Math.min(100000, tr[i] + peso);
  }
}

const versiones = new WeakMap<Mundo, number>();
/** Los caminos han cambiado: lo calculado con los de antes ya no vale. */
export function tocarCaminos(m: Mundo): void {
  versiones.set(m, (versiones.get(m) ?? 0) + 1);
}

/**
 * Cada mes: el tránsito se va olvidando; donde se pasa mucho queda un sendero y donde ya
 * no se pasa, el sendero se borra (los caminos construidos quedan).
 */
export function senderos(m: Mundo): void {
  const tr = transitoDe(m);
  const cam = caminosDe(m);
  let cambia = false;
  for (let i = 0; i < tr.length; i++) {
    const v = tr[i];
    if (v === 0 && cam[i] === 0) continue;
    tr[i] = Math.floor(v * 0.8);
    if (cam[i] === 0 && v >= UMBRAL_SENDERO && pisable(m, i)) {
      cam[i] = SENDERO;
      cambia = true;
    } else if (cam[i] === SENDERO && v < UMBRAL_BORRA) {
      cam[i] = 0;
      cambia = true;
    }
  }
  if (cambia) tocarCaminos(m);
}

const cache = new WeakMap<Mundo, { version: number; dias: Map<string, number> }>();

/**
 * Días de camino de un punto a otro a `rapidez` casillas por día, aprovechando los caminos
 * que haya en la línea del recorrido (sin redondear). Se recuerda lo calculado hasta que
 * cambian los caminos.
 */
export function diasEntre(m: Mundo, desde: readonly number[], hasta: readonly number[], rapidez: number): number {
  const version = versiones.get(m) ?? 0;
  let c = cache.get(m);
  if (!c || c.version !== version) {
    c = { version, dias: new Map() };
    cache.set(m, c);
  }
  const clave = `${desde[0]},${desde[1]},${hasta[0]},${hasta[1]},${rapidez}`;
  const ya = c.dias.get(clave);
  if (ya !== undefined) return ya;
  // Sin caminos, la distancia en línea recta entre la rapidez (como siempre); con caminos,
  // cada tramo de la línea que va por camino cuenta menos.
  const cam = m.caminos;
  const l = linea(desde[0], desde[1], hasta[0], hasta[1]);
  let largo = 0;
  let lento = 0;
  for (let k = 1; k < l.length; k++) {
    const [x, y] = l[k];
    const [px, py] = l[k - 1];
    const paso = x !== px && y !== py ? Math.SQRT2 : 1;
    const dentro = x >= 0 && y >= 0 && x < m.ancho && y < m.alto && px >= 0 && py >= 0 && px < m.ancho && py < m.alto;
    // Se va deprisa solo si el tramo entero es camino (las dos casillas).
    const nivel = cam && dentro ? Math.min(cam[y * m.ancho + x] ?? 0, cam[py * m.ancho + px] ?? 0) : 0;
    largo += paso;
    lento += paso / RAPIDEZ[nivel];
  }
  const dias = (Math.hypot(hasta[0] - desde[0], hasta[1] - desde[1]) / rapidez) * (largo > 0 ? lento / largo : 1);
  if (c.dias.size > 5000) c.dias.clear();
  c.dias.set(clave, dias);
  return dias;
}

/** Cuánto acortan los caminos el viaje entre dos puntos (1 si nada; menos de 1 si ayudan). */
export function atajo(m: Mundo, desde: readonly number[], hasta: readonly number[]): number {
  const d = Math.hypot(hasta[0] - desde[0], hasta[1] - desde[1]);
  if (d < 1) return 1;
  return Math.min(1, diasEntre(m, desde, hasta, 1) / d);
}

/**
 * Un tramo de senderos (o de caminos, para empedrarlos) que merece la pena mejorar: el más
 * transitado cerca de la aldea, y los que siguen unidos a él, hasta `max` casillas.
 */
export function tramo(m: Mundo, a: { x: number; y: number }, nivel: number, radio: number, max: number, libre: (i: number) => boolean): number[] {
  const cam = caminosDe(m);
  const tr = transitoDe(m);
  const cand = (i: number) => cam[i] === nivel && pisable(m, i) && libre(i);
  let semilla = -1;
  let mejor = 0;
  for (let y = Math.max(0, a.y - radio); y <= Math.min(m.alto - 1, a.y + radio); y++) {
    for (let x = Math.max(0, a.x - radio); x <= Math.min(m.ancho - 1, a.x + radio); x++) {
      const i = y * m.ancho + x;
      if (!cand(i)) continue;
      const d = Math.hypot(x - a.x, y - a.y);
      if (d > radio) continue;
      const v = (tr[i] + 1) / (1 + d / 6);
      if (v > mejor) {
        mejor = v;
        semilla = i;
      }
    }
  }
  if (semilla < 0) return [];
  // Se sigue el sendero desde ahí, por lo más transitado.
  const out = [semilla];
  const dentro = new Set(out);
  while (out.length < max) {
    let sig = -1;
    let sv = -1;
    for (const c of out) {
      const cx = c % m.ancho;
      const cy = (c - cx) / m.ancho;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const x = cx + dx;
          const y = cy + dy;
          if ((!dx && !dy) || x < 0 || y < 0 || x >= m.ancho || y >= m.alto) continue;
          const j = y * m.ancho + x;
          if (dentro.has(j) || !cand(j) || Math.hypot(x - a.x, y - a.y) > radio) continue;
          if (tr[j] > sv) {
            sv = tr[j];
            sig = j;
          }
        }
      }
    }
    if (sig < 0) break;
    out.push(sig);
    dentro.add(sig);
  }
  return out;
}
