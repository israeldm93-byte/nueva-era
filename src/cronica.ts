// La crónica: lo que pasa en el mundo contado en español.

import { DIAS_ANIO, DIAS_ESTACION, ESTACIONES, MAX_CRONICA } from './config.ts';
import { MATERIAL, TECNICA, VERBO } from './catalogo.ts';
import type { Mundo, TipoSuceso } from './tipos.ts';

/** Sucesos que se conservan siempre aunque la crónica se recorte. */
const IMPORTANTES: TipoSuceso[] = ['inicio', 'descubrimiento', 'redescubrimiento', 'olvido', 'fundacion', 'abandono', 'lengua', 'extincion', 'poblacion'];

export function anioDe(t: number): number {
  return Math.floor(t / DIAS_ANIO) + 1;
}

export function fecha(t: number): string {
  const est = ESTACIONES[Math.floor((t % DIAS_ANIO) / DIAS_ESTACION)];
  return `Año ${anioDe(t)}, ${est}`;
}

export function anotar(m: Mundo, tipo: TipoSuceso, texto: string, aldea?: number): void {
  m.cronica.push({ era: m.era, t: m.t, tipo, texto, ...(aldea !== undefined ? { aldea } : {}) });
  if (m.cronica.length > MAX_CRONICA) {
    const i = m.cronica.findIndex((s) => !IMPORTANTES.includes(s.tipo));
    m.cronica.splice(i >= 0 ? i : 0, 1);
  }
}

export function nombreCosa(id: string): string {
  return MATERIAL[id]?.nombre ?? TECNICA[id]?.cosa ?? id;
}

export function listar(xs: string[]): string {
  if (xs.length <= 1) return xs.join('');
  return `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`;
}

/** «frotando madera con madera», «atando cuerda, lascas y madera». */
export function como(cosas: string[], verbo: string): string {
  const nombres = cosas.map(nombreCosa);
  const g = VERBO[verbo]?.gerundio ?? verbo;
  if (nombres.length === 2) return `${g} ${nombres[0]} con ${nombres[1]}`;
  return `${g} ${listar(nombres)}`;
}

export function anios(n: number): string {
  const k = Math.floor(n);
  return k === 1 ? '1 año' : `${k} años`;
}
