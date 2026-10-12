// Más allá del mar: el mundo se amplía hacia el este y el sur.
//
// El continente de siempre se queda exactamente donde estaba (arriba a la izquierda, con
// las mismas coordenadas): cada casilla conserva su terreno, su relieve y sus recursos, y
// todo lo que guarda una casilla por su índice se vuelve a calcular para el ancho nuevo.
// Alrededor, mar abierto, cada vez más hondo.

import { AGUA, CAPACIDAD } from './catalogo.ts';
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
