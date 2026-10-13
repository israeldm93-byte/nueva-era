// Obras de tierra: la gente cambia el terreno.
//
// Con las técnicas adecuadas, una aldea puede allanar una ladera para levantar encima sus
// edificios grandes (una explanada) o abrir la roca de una colina para sacar piedra (una
// cantera). Son obras como las demás: se pagan materiales al empezar, las hacen los que
// construyen, día a día, y llevan más trabajo cuanta más tierra hay que mover. El relieve
// cambia poco a poco a medida que avanzan, nunca de golpe, y al acabar el terreno queda
// labrado: se ve en el mapa, cambia sus recursos y lo que se puede construir encima.
//
// Qué obras existen lo dice el catálogo (OBRAS_TIERRA): este módulo solo sabe ejecutar
// sus operaciones (nivelar, excavar) dentro de unos límites.

import { AGUA, BOSQUE, MONTANA, OBRA_TIERRA, PRADERA, RIO, type ObraTierra } from './catalogo.ts';
import { caminosDe, tocarCaminos } from './caminos.ts';
import { anotar } from './cronica.ts';
import { aviso } from './fauna.ts';
import { masas } from './mapa.ts';
import type { Aldea, Mundo, Obra, TrabajoTierra } from './tipos.ts';

/** El desnivel máximo de la zona de un edificio grande para levantarlo sin allanar antes. */
export const DESNIVEL_MAXIMO = 6;
/** Los edificios grandes: piden suelo llano (con la nivelación, se allana antes si hace falta). */
export const GRANDES = new Set(['plaza', 'templo', 'mercado', 'taller', 'archivo', 'granja']);

const r4 = (x: number) => Math.round(x * 10000) / 10000;

/** Las casillas de la zona (cuadrado de lado 2r+1) que son tierra de la misma masa. */
export function zona(m: Mundo, centro: number, radio: number): number[] {
  const { masa } = masas(m);
  const x0 = centro % m.ancho;
  const y0 = (centro - x0) / m.ancho;
  const out: number[] = [];
  for (let dy = -radio; dy <= radio; dy++) {
    for (let dx = -radio; dx <= radio; dx++) {
      const x = x0 + dx;
      const y = y0 + dy;
      if (x < 0 || y < 0 || x >= m.ancho || y >= m.alto) continue;
      const i = y * m.ancho + x;
      const t = m.terreno[i];
      if (t === AGUA || t === RIO || masa[i] !== masa[centro]) continue;
      out.push(i);
    }
  }
  return out;
}

/** El desnivel de una zona: la diferencia entre su casilla más alta y la más baja. */
export function desnivel(m: Mundo, centro: number, radio = 1): number {
  const z = zona(m, centro, radio);
  if (!z.length) return 0;
  let lo = Infinity;
  let hi = -Infinity;
  for (const i of z) {
    lo = Math.min(lo, m.relieve[i]);
    hi = Math.max(hi, m.relieve[i]);
  }
  return hi - lo;
}

/** Qué obra de tierra se hizo en una casilla (o null). */
export function labrada(m: Mundo, i: number): string | null {
  for (const [c, tipo] of m.labrado ?? []) if (c === i) return tipo;
  return null;
}

/**
 * Prepara una obra de tierra en `centro` (sin empezarla): la zona, cómo queda cada casilla
 * y el trabajo que lleva. Devuelve null si allí no se puede.
 */
export function planear(m: Mundo, a: Aldea, tipo: string, centro: number, para?: string): Obra | null {
  const o: ObraTierra | undefined = OBRA_TIERRA[tipo];
  if (!o || !a.conocidos.includes(o.requiere) || o.operacion === 'camino') return null;
  if (!o.terrenos.includes(m.terreno[centro])) return null;
  const casillas = zona(m, centro, o.radio);
  if (!casillas.length) return null;
  const desde = casillas.map((i) => m.relieve[i]);
  let hasta: number[];
  if (o.operacion === 'nivelar') {
    // A la altura media: se rebaja lo alto y se rellena lo bajo con lo que se saca.
    const media = Math.round(desde.reduce((s, h) => s + h, 0) / desde.length);
    hasta = desde.map(() => media);
  } else {
    // Se ahonda el centro y menos los bordes, sin bajar del nivel del agua.
    hasta = casillas.map((i, k) => Math.max(1, desde[k] - (i === centro ? o.hondo ?? 0 : o.hondoBorde ?? 0)));
  }
  const movida = desde.reduce((s, h, k) => s + Math.abs(h - hasta[k]), 0);
  if (movida <= 0) return null;
  const tierra: TrabajoTierra = { casillas, desde, hasta, esfuerzo: r4(o.trabajo + o.trabajoPorAltura * movida), ...(para ? { para } : {}) };
  return { tipo, x: centro % m.ancho, y: Math.floor(centro / m.ancho), progreso: 0, pagada: false, desde: m.t, tierra };
}

/**
 * Prepara un camino sobre un tramo (casillas seguidas de sendero, o de camino para
 * empedrarlo). El trabajo y el coste son por casilla. Null si no se puede.
 */
export function planearCamino(m: Mundo, a: Aldea, tipo: string, casillas: number[]): Obra | null {
  const o = OBRA_TIERRA[tipo];
  if (!o || o.operacion !== 'camino' || !casillas.length || casillas.length > 12) return null;
  if (![o.requiere, ...(o.ademas ?? [])].every((r) => a.conocidos.includes(r))) return null;
  const cam = caminosDe(m);
  // Solo sobre tierra (nunca sobre el agua) y sobre el nivel que toca mejorar.
  if (!casillas.every((i) => o.terrenos.includes(m.terreno[i]) && cam[i] === o.sobre)) return null;
  const alturas = casillas.map((i) => m.relieve[i]);
  const tierra: TrabajoTierra = { casillas, desde: alturas, hasta: alturas.slice(), esfuerzo: r4(o.trabajo * casillas.length) };
  return { tipo, x: casillas[0] % m.ancho, y: Math.floor(casillas[0] / m.ancho), progreso: 0, pagada: false, desde: m.t, tierra };
}

/** El relieve de la zona según lo que lleva hecho la obra (entero, como siempre). */
export function moverTierra(m: Mundo, obra: Obra): void {
  const t = obra.tierra;
  if (!t) return;
  const f = Math.min(1, Math.max(0, obra.progreso));
  const o = OBRA_TIERRA[obra.tipo];
  if (o?.operacion === 'camino') {
    // El camino avanza casilla a casilla.
    const cam = caminosDe(m);
    const hechas = Math.floor(f * t.casillas.length + 1e-9);
    let cambia = false;
    for (let k = 0; k < hechas; k++) {
      const i = t.casillas[k];
      if (cam[i] < o.nivel!) {
        cam[i] = o.nivel!;
        cambia = true;
      }
    }
    if (cambia) tocarCaminos(m);
    return;
  }
  t.casillas.forEach((i, k) => {
    m.relieve[i] = Math.round(t.desde[k] + (t.hasta[k] - t.desde[k]) * f);
  });
}

/** La obra acabada: el terreno queda labrado, con sus consecuencias. */
export function acabarTierra(m: Mundo, a: Aldea, obra: Obra): void {
  const t = obra.tierra;
  if (!t) return;
  obra.progreso = 1;
  moverTierra(m, obra);
  const o = OBRA_TIERRA[obra.tipo];
  if (o.operacion === 'camino') {
    if (aviso(m, `${obra.tipo}-${a.id}`, 360 * 3)) {
      anotar(m, 'edificio', o.nivel === 3 ? `Los de ${a.nombre} empiedran ${t.casillas.length} pasos de su camino más transitado: ya no habrá barro ni en invierno.` : `Los de ${a.nombre} convierten en camino de tierra compactada el sendero que más pisan (${t.casillas.length} pasos): por él se va mucho más deprisa.`, a.id);
    }
    return;
  }
  const centro = obra.y * m.ancho + obra.x;
  const marcar = (i: number) => {
    m.labrado = (m.labrado ?? []).filter(([c]) => c !== i);
    m.labrado.push([i, obra.tipo]);
  };
  if (o.operacion === 'nivelar') {
    for (const i of t.casillas) {
      marcar(i);
      // Para allanar se tala lo que hubiera (y la madera, se aprovecha).
      if (m.terreno[i] === BOSQUE) {
        a.despensa.madera = Math.round(((a.despensa.madera ?? 0) + m.recursos.madera[i]) * 100) / 100;
        m.terreno[i] = PRADERA;
        m.recursos.madera[i] = 0;
      }
    }
    const para = t.para ? ` para levantar allí ${ARTICULO[t.para] ?? 'un edificio'}` : '';
    anotar(m, 'edificio', `En ${a.nombre} acaban de allanar una ladera${para}: donde había un desnivel de ${Math.max(...t.desde) - Math.min(...t.desde)} palmos ahora hay una explanada.`, a.id);
  } else {
    marcar(centro);
    // La roca queda al descubierto: una veta de piedra junto a la aldea.
    m.recursos.piedra[centro] = Math.max(m.recursos.piedra[centro], 60);
    if (m.terreno[centro] === MONTANA) m.recursos.piedra[centro] = 80;
    anotar(m, 'edificio', `${a.nombre} abre una cantera en ${m.terreno[centro] === MONTANA ? 'la montaña' : 'la colina'}: la roca queda tallada en gradas y la piedra sale a carretadas.`, a.id);
  }
}

const ARTICULO: Record<string, string> = {
  plaza: 'la plaza',
  templo: 'el templo',
  mercado: 'el mercado',
  taller: 'un taller',
  archivo: 'la casa de las tablillas',
  granja: 'una granja',
};

/** Las canteras de una aldea (las que ha abierto cerca). */
export function canteras(m: Mundo, a: Aldea): number {
  let n = 0;
  for (const [c, tipo] of m.labrado ?? []) {
    if (tipo !== 'cantera') continue;
    const x = c % m.ancho;
    const y = (c - x) / m.ancho;
    if (Math.hypot(x - a.x, y - a.y) <= 8) n++;
  }
  return n;
}

/** Validación al cargar: una obra de tierra con datos que no cuadran. */
export function tierraValida(t: unknown, m: Mundo): boolean {
  if (!t || typeof t !== 'object') return false;
  const o = t as TrabajoTierra;
  const n = Array.isArray(o.casillas) ? o.casillas.length : -1;
  if (n <= 0 || n > 25 || !Array.isArray(o.desde) || !Array.isArray(o.hasta) || o.desde.length !== n || o.hasta.length !== n) return false;
  if (!o.casillas.every((i) => Number.isInteger(i) && i >= 0 && i < m.ancho * m.alto)) return false;
  if (![...o.desde, ...o.hasta, o.esfuerzo].every((v) => typeof v === 'number' && Number.isFinite(v)) || !(o.esfuerzo > 0)) return false;
  return o.para === undefined || typeof o.para === 'string';
}
