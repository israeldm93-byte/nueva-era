// Las edades de cada pueblo: Piedra, Herramientas, Bronce, Hierro.
//
// No se compran ni se decretan: un pueblo está en una edad cuando sabe hacer lo que
// la define (hachas de piedra pulida y campos o ganado; bronce; hierro). Al llegar a
// una nueva, se recuerda: es de lo que se acordarán sus nietos.

import { EDADES, TECNICA } from './catalogo.ts';
import { anotar } from './cronica.ts';
import type { Aldea, Mundo } from './tipos.ts';

/** La edad que corresponde a lo que saben hoy. */
export function edadSegun(a: Aldea): number {
  let e = 0;
  for (let k = 1; k < EDADES.length; k++) {
    if (EDADES[k].requiere.every((g) => g.some((t) => a.conocidos.includes(t)))) e = k;
    else break;
  }
  return e;
}

/** Los saberes que faltan para llegar a `id`, en el orden en que habría que aprenderlos. */
function camino(a: Aldea, id: string, visto: Set<string>): string[] {
  const out: string[] = [];
  const seguir = (x: string) => {
    if (visto.has(x) || a.conocidos.includes(x)) return;
    visto.add(x);
    const t = TECNICA[x];
    if (!t) return;
    for (const r of t.requiere ?? []) seguir(r);
    for (const c of t.cosas) seguir(c);
    out.push(x);
  };
  seguir(id);
  return out;
}

/**
 * Lo que les falta para la edad `e`: todos los saberes de la cadena que lleva a ella
 * (para el bronce, por ejemplo: alfarería, horno, carbón, cobre y bronce).
 */
export function faltaPara(a: Aldea, e: number): string[] {
  const falta: string[] = [];
  const visto = new Set<string>();
  for (const g of EDADES[e]?.requiere ?? []) {
    if (g.some((t) => a.conocidos.includes(t))) continue;
    // De las alternativas, la de camino más corto.
    const caminos = g.map((t) => camino(a, t, new Set(visto)));
    const mejor = caminos.reduce((x, y) => (y.length < x.length ? y : x));
    for (const t of mejor) {
      visto.add(t);
      falta.push(t);
    }
  }
  return falta;
}

/** Aldea, pueblo o ciudad: por la gente que vive en ella y cómo se construye. */
export function rangoSegun(a: Aldea, n: number): string {
  const piedra = a.conocidos.includes('canteria') || a.conocidos.includes('adobe');
  if (n >= 80 && piedra && a.edificios.some((e) => e.tipo === 'plaza')) return 'ciudad';
  if (n >= 35) return 'pueblo';
  return 'aldea';
}

const ORDEN_RANGO = ['aldea', 'pueblo', 'ciudad'];

/** Cada pocos días: si saben ya lo de la edad siguiente, entran en ella; y si han crecido, suben de rango. */
export function revisarEdad(m: Mundo, a: Aldea, n: number): void {
  const r = rangoSegun(a, n);
  const antes = ORDEN_RANGO.indexOf(a.rango ?? 'aldea');
  // Se sube de rango al crecer; lo ganado no se pierde aunque se vaya gente.
  if (ORDEN_RANGO.indexOf(r) > antes) {
    a.rango = r;
    if (!a.viaje) anotar(m, 'edad', r === 'ciudad' ? `${a.nombre} ya es una ciudad: calles de piedra, plaza, talleres y ${n} almas.` : `${a.nombre} ha crecido tanto que ya es un pueblo.`, a.id);
  }
  revisarEdadSaber(m, a);
}

function revisarEdadSaber(m: Mundo, a: Aldea): void {
  const e = edadSegun(a);
  const antes = a.edad ?? 0;
  if (e <= antes) {
    a.edad = antes;
    return;
  }
  a.edad = e;
  a.edades ??= [];
  for (let k = antes + 1; k <= e; k++) a.edades[k] = m.t;
  const primera = !m.aldeas.some((b) => b !== a && (b.edad ?? 0) >= e);
  const nombre = EDADES[e].nombre;
  anotar(
    m,
    'edad',
    primera
      ? `${a.nombre} entra en la ${nombre}: es el primer pueblo del mundo que llega a ella.`
      : `${a.nombre} entra en la ${nombre}.`,
    a.id,
  );
}
