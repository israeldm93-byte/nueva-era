// Lenguaje emergente. Nadie empieza sabiendo hablar: cuando alguien quiere
// referirse a algo y no tiene palabra, se la inventa con los sonidos de su
// pueblo. Al hablar, si el otro ya usa esa palabra ambos la refuerzan; si no,
// el otro la aprende. Con el tiempo cada aldea se pone de acuerdo (juego de
// nombrar de Luc Steels). Los niños a veces oyen mal, y así el idioma cambia
// con las generaciones: aldeas separadas acaban hablando lenguas distintas.

import { azar, barajar, elegir, entero, prob } from './azar.ts';
import type { Fonologia, Persona } from './tipos.ts';

const CONSONANTES = ['p', 't', 'k', 'm', 'n', 's', 'l', 'r', 'b', 'd', 'g', 'f', 'h', 'y', 'ch', 'z', 'j', 'v', 'ñ'];
const VOCALES = ['a', 'e', 'i', 'o', 'u'];
const FINALES = ['n', 's', 'l', 'r', 'k'];
const FONEMA = /ch|[a-zñ]/g;

export function crearFonologia(): Fonologia {
  return {
    consonantes: barajar(CONSONANTES.slice()).slice(0, 8 + entero(5)),
    vocales: barajar(VOCALES.slice()).slice(0, 3 + entero(3)),
    finales: barajar(FINALES.slice()).slice(0, 1 + entero(3)),
  };
}

export function inventarPalabra(f: Fonologia, silabas = 1 + entero(2) + (prob(0.25) ? 1 : 0)): string {
  let w = '';
  for (let i = 0; i < silabas; i++) {
    if (!(i === 0 && prob(0.15))) w += elegir(f.consonantes);
    w += elegir(f.vocales);
  }
  if (prob(0.3)) w += elegir(f.finales);
  return w;
}

export function nombrePropio(f: Fonologia): string {
  return mayuscula(inventarPalabra(f, 2 + (prob(0.3) ? 1 : 0)));
}

export function mayuscula(w: string): string {
  return w.charAt(0).toUpperCase() + w.slice(1);
}

/** Un sonido cambia, se pierde o aparece: así derivan las lenguas. */
export function mutarPalabra(f: Fonologia, w: string): string {
  const fs = w.match(FONEMA) ?? [];
  if (fs.length < 2) return w;
  const i = entero(fs.length);
  const vocal = VOCALES.includes(fs[i]);
  const r = azar();
  if (r < 0.7) fs[i] = vocal ? elegir(f.vocales) : elegir(f.consonantes);
  else if (r < 0.85 && fs.length > 3) fs.splice(i, 1);
  else fs.splice(i + 1, 0, vocal ? elegir(f.consonantes) : elegir(f.vocales));
  return fs.join('');
}

export function palabraDe(p: Persona, concepto: string): string | undefined {
  return p.lexico[concepto]?.[0]?.[0];
}

const r2 = (x: number) => Math.round(x * 100) / 100;

function ajustar(p: Persona, concepto: string, w: string, exito: boolean): void {
  const l = p.lexico[concepto] ?? (p.lexico[concepto] = []);
  let e = l.find((x) => x[0] === w);
  if (exito) {
    if (!e) {
      e = [w, 0.5];
      l.push(e);
    }
    e[1] = Math.min(1, r2(e[1] + 0.2));
    for (const o of l) if (o !== e) o[1] = r2(o[1] * 0.6);
  } else if (e) {
    e[1] = Math.min(1, r2(e[1] + 0.1));
  } else {
    l.push([w, 0.3]);
  }
  const vivas = l.filter((x) => x[1] >= 0.05).sort((a, b) => b[1] - a[1]).slice(0, 3);
  p.lexico[concepto] = vivas;
}

/**
 * El hablante nombra un concepto. Devuelve si el oyente lo entendió.
 * `oyenteNino`: los niños a veces aprenden la palabra un poco cambiada.
 */
export function nombrar(f: Fonologia, hablante: Persona, oyente: Persona, concepto: string, oyenteNino: boolean): boolean {
  let w = palabraDe(hablante, concepto);
  if (!w) {
    w = inventarPalabra(f);
    hablante.lexico[concepto] = [[w, 0.5]];
  }
  const conoce = oyente.lexico[concepto]?.some((x) => x[0] === w) ?? false;
  if (conoce) {
    ajustar(hablante, concepto, w, true);
    ajustar(oyente, concepto, w, true);
    return true;
  }
  const oida = oyenteNino && prob(0.04) ? mutarPalabra(f, w) : w;
  ajustar(oyente, concepto, oida, false);
  return false;
}

/** ¿Entiende el oyente la palabra que usa el hablante para este concepto? */
export function entiende(hablante: Persona, oyente: Persona, concepto: string): boolean {
  const w = palabraDe(hablante, concepto);
  return !!w && (oyente.lexico[concepto]?.some((x) => x[0] === w) ?? false);
}

/** Palabra más usada en un grupo para cada concepto, con el grado de acuerdo. */
export function lexicoComun(gente: Persona[]): Record<string, [string, number]> {
  const cuentas: Record<string, Record<string, number>> = {};
  const total: Record<string, number> = {};
  for (const p of gente) {
    for (const c in p.lexico) {
      const w = p.lexico[c][0]?.[0];
      if (!w) continue;
      const k = cuentas[c] ?? (cuentas[c] = {});
      k[w] = (k[w] ?? 0) + 1;
      total[c] = (total[c] ?? 0) + 1;
    }
  }
  const out: Record<string, [string, number]> = {};
  for (const c of Object.keys(cuentas).sort()) {
    let mejor = '';
    let n = -1;
    for (const w of Object.keys(cuentas[c]).sort()) {
      if (cuentas[c][w] > n) {
        n = cuentas[c][w];
        mejor = w;
      }
    }
    out[c] = [mejor, Math.round((n / gente.length) * 100) / 100];
  }
  return out;
}

export function distancia(a: string, b: string): number {
  const fila = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = fila[j];
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return fila[b.length];
}

/** Parecido entre dos lenguas (0 a 1) según las palabras de los conceptos que comparten. */
export function parecido(a: Record<string, [string, number]>, b: Record<string, [string, number]>): number {
  let suma = 0;
  let n = 0;
  for (const c in a) {
    if (!b[c]) continue;
    const x = a[c][0];
    const y = b[c][0];
    suma += 1 - distancia(x, y) / Math.max(x.length, y.length, 1);
    n++;
  }
  return n === 0 ? 1 : Math.round((suma / n) * 100) / 100;
}
