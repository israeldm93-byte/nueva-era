// Lo que cada persona recuerda y a quién quiere (o detesta).
//
// Nada de esto es un adorno: los recuerdos pesan en lo que opinan y en lo que se
// proponen (irse tras pasar hambre, vengar a un hijo muerto en un asalto, ser prudente
// tras el ataque de los lobos); los lazos deciden con quién se habla y de quién se
// aprende, a quién se convence y a quién se sigue. Todo está acotado: unos pocos
// recuerdos y lazos por persona, que se olvidan con el tiempo si no se refuerzan.

import { DIAS_ANIO } from './config.ts';
import type { Hito, Mundo, Persona, Recuerdo } from './tipos.ts';

export const MAX_RECUERDOS = 8;
export const MAX_LAZOS = 10;
export const MAX_VIDA = 16;

const r2 = (x: number) => Math.round(x * 100) / 100;
const r4 = (x: number) => Math.round(x * 10000) / 10000;

/** Cuánto pesa hoy un recuerdo: los importantes duran; los demás se desvanecen en unos años. */
export function vivo(m: Mundo, r: Recuerdo): number {
  return r[3] * Math.exp(-(m.t - r[0]) / (DIAS_ANIO * (4 + 8 * r[3])));
}

/** Guarda un recuerdo; si ya no caben, se olvida el que menos pesa hoy. */
export function recordar(m: Mundo, p: Persona, tipo: string, ref: number | string | null, peso: number): void {
  const lista = (p.recuerdos ??= []);
  // Lo mismo otra vez no ocupa otro hueco: se refuerza.
  const igual = lista.find((r) => r[1] === tipo && r[2] === ref);
  if (igual) {
    igual[0] = m.t;
    igual[3] = r2(Math.min(1, Math.max(igual[3], peso) + 0.1));
    return;
  }
  lista.push([m.t, tipo, ref, r2(peso)]);
  if (lista.length > MAX_RECUERDOS) {
    let peor = 0;
    for (let i = 1; i < lista.length; i++) if (vivo(m, lista[i]) < vivo(m, lista[peor])) peor = i;
    lista.splice(peor, 1);
  }
}

/** La fuerza de lo que recuerda de un tipo (y, si se dice, sobre algo o alguien concreto). */
export function memoria(m: Mundo, p: Persona, tipo: string, ref?: number | string): number {
  let s = 0;
  for (const r of p.recuerdos ?? []) if (r[1] === tipo && (ref === undefined || r[2] === ref)) s += vivo(m, r);
  return Math.min(1, s);
}

/** Lo que siente por otra persona (de -1, odio, a 1, cariño). */
export function lazo(p: Persona, otro: number): number {
  for (const [id, v] of p.lazos ?? []) if (id === otro) return v;
  return 0;
}

/** Cambia lo que siente por otro; si ya no caben, se olvida el lazo más tibio. */
export function ajustarLazo(p: Persona, otro: number, delta: number): void {
  if (otro === p.id || !delta) return;
  const lista = (p.lazos ??= []);
  const l = lista.find((x) => x[0] === otro);
  if (l) {
    // Cuanto más fuerte es ya un lazo, menos lo mueve un trato más (cariño y rencor se saturan).
    const v = l[1];
    // (Con diezmilésimas: con centésimas, un trato pequeño a un lazo ya fuerte se perdía al redondear.)
    l[1] = r4(Math.max(-1, Math.min(1, v + (delta > 0 ? delta * (1 - Math.max(0, v)) : delta * (1 + Math.min(0, v))))));
    return;
  }
  if (Math.abs(delta) < 0.03) return;
  lista.push([otro, r4(Math.max(-1, Math.min(1, delta)))]);
  if (lista.length > MAX_LAZOS) {
    let peor = 0;
    for (let i = 1; i < lista.length; i++) if (Math.abs(lista[i][1]) < Math.abs(lista[peor][1])) peor = i;
    lista.splice(peor, 1);
  }
}

/** Un trato en los dos sentidos (enseñar, casarse, pelear juntos...). */
export function tratar(p: Persona, q: Persona, aP: number, aQ = aP): void {
  ajustarLazo(p, q.id, aP);
  ajustarLazo(q, p.id, aQ);
}

/** Con los años, los lazos sin trato se enfrían y los de los muertos se borran. */
export function enfriar(p: Persona, vive: (id: number) => boolean): void {
  if (!p.lazos?.length) return;
  // Cada diez días un poco: un lazo sin trato se apaga en unos años.
  p.lazos = p.lazos.filter(([id]) => vive(id)).map(([id, v]) => [id, r4(v * 0.985)] as [number, number]).filter(([, v]) => Math.abs(v) >= 0.03);
}

/** Un hito de su vida (aprender, casarse, irse, fundar...). Se guardan los primeros y los últimos. */
export function hito(m: Mundo, p: Persona, tipo: string, dato?: string): void {
  const vida = (p.vida ??= []);
  const h: Hito = dato === undefined ? [m.t, tipo] : [m.t, tipo, dato];
  vida.push(h);
  if (vida.length > MAX_VIDA) vida.splice(4, 1);
}

/** Su fama: lo que la gente sabe que ha hecho (descubrir, defender, fundar). */
export function afamar(p: Persona, cuanto: number): void {
  p.fama = r2(Math.min(10, (p.fama ?? 0) + cuanto));
}
