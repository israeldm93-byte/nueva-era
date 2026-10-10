// Cómo se descubre y cómo se transmite el saber.
//
// Nadie sabe qué combinaciones funcionan. Quien tiene curiosidad y tiempo libre
// prueba a juntar cosas que conoce con un gesto. Si el resultado «se parece» a
// algo que funcionaría, lo recuerda como idea prometedora y la va variando
// (búsqueda por tanteo). Las ideas se comparten al hablar. El saber se enseña
// hablando, así que enseñar es más fácil entre quienes comparten palabras, y
// muere con quien lo sabe si no lo ha enseñado (o escrito) antes.

import { azar, elegir, elegirPeso, entero, prob } from './azar.ts';
import { BASICOS, MATERIAL, TECNICA, TECNICAS, VERBOS, type Tecnica } from './catalogo.ts';
import { RITMO_SABER } from './config.ts';
import { anotar, como } from './cronica.ts';
import { entiende, inventarPalabra, nombrar, palabraDe } from './lenguaje.ts';
import type { Aldea, Idea, Mundo, Persona } from './tipos.ts';

const r2 = (x: number) => Math.round(x * 100) / 100;

export function sabe(p: Persona, id: string): boolean {
  return p.saberes.includes(id);
}

/** Puede concebirlo: conoce lo que hace falta antes y las cosas con que se hace. */
export function puedeAprender(p: Persona, t: Tecnica): boolean {
  if (p.saberes.includes(t.id)) return false;
  if (t.requiere && !t.requiere.every((r) => p.saberes.includes(r))) return false;
  for (const c of t.cosas) if (TECNICA[c] && !p.saberes.includes(c)) return false;
  return true;
}

function cosasFamiliares(p: Persona, a: Aldea): string[] {
  return [...BASICOS, ...a.vistos, ...p.saberes];
}

function verbosDe(p: Persona): string[] {
  return VERBOS.filter((v) => !v.requiere || p.saberes.includes(v.requiere)).map((v) => v.id);
}

/** Cuánto se parece una combinación a una receta (1 = idéntica). */
function parecidoReceta(cosas: string[], verbo: string, t: Tecnica): number {
  let i = 0;
  let j = 0;
  let comunes = 0;
  while (i < cosas.length && j < t.cosas.length) {
    if (cosas[i] === t.cosas[j]) {
      comunes++;
      i++;
      j++;
    } else if (cosas[i] < t.cosas[j]) i++;
    else j++;
  }
  return (comunes + (verbo === t.verbo ? 1 : 0)) / (Math.max(cosas.length, t.cosas.length) + 1);
}

function combinacionAlAzar(fam: string[]): string[] {
  const r = azar();
  const k = r < 0.3 ? 1 : r < 0.8 ? 2 : 3;
  const out: string[] = [];
  for (let i = 0; i < k; i++) out.push(elegir(fam));
  return out.sort();
}

function variar(idea: Idea, fam: string[], verbos: string[]): [string[], string] {
  let cosas = idea.cosas.slice();
  let verbo = idea.verbo;
  const r = azar();
  if (r < 0.4) cosas[entero(cosas.length)] = elegir(fam);
  else if (r < 0.65) verbo = elegir(verbos);
  else if (r < 0.8 && cosas.length < 3) cosas.push(elegir(fam));
  else if (r < 0.95 && cosas.length > 1) cosas.splice(entero(cosas.length), 1);
  else {
    cosas = combinacionAlAzar(fam);
    verbo = elegir(verbos);
  }
  return [cosas.sort(), verbo];
}

const clave = (i: Idea) => `${i.cosas.join('+')}/${i.verbo}`;

export function recordarIdea(p: Persona, idea: Idea): void {
  const k = clave(idea);
  const e = p.ideas.find((x) => clave(x) === k);
  if (e) e.puntos = Math.max(e.puntos, idea.puntos);
  else p.ideas.push({ cosas: idea.cosas.slice(), verbo: idea.verbo, puntos: idea.puntos });
  p.ideas.sort((a, b) => b.puntos - a.puntos);
  if (p.ideas.length > 3) p.ideas.length = 3;
}

/**
 * Inspirarse trabajando: quien corta leña, recoge semillas o pica piedra a veces
 * barrunta algo que podría hacerse con eso. No es un descubrimiento, sino una idea a
 * medias (alguna cosa o el gesto no encajan) que luego hay que probar y afinar
 * experimentando, y que se puede contar a otros.
 */
export function inspirarse(p: Persona, a: Aldea, material: string): boolean {
  const fam = cosasFamiliares(p, a);
  const posibles = TECNICAS.filter((t) => t.cosas.includes(material) && puedeAprender(p, t) && t.cosas.every((c) => fam.includes(c)));
  if (!posibles.length) return false;
  const t = elegir(posibles);
  const cosas = t.cosas.slice();
  let verbo = t.verbo;
  if (cosas.length === 1 || prob(0.5)) verbo = elegir(verbosDe(p));
  else cosas[entero(cosas.length)] = elegir(fam);
  cosas.sort();
  const puntos = r2(parecidoReceta(cosas, verbo, t));
  if (puntos < 0.5) return false;
  recordarIdea(p, { cosas, verbo, puntos });
  return true;
}

/** Un día probando cosas: si descubre algo y si ha dado con una idea prometedora. */
export function experimentar(m: Mundo, p: Persona, a: Aldea, rapidez: number): { descubierto: Tecnica | null; idea: boolean } {
  const nada = { descubierto: null, idea: false };
  const fam = cosasFamiliares(p, a);
  const verbos = verbosDe(p);
  let cosas: string[];
  let verbo: string;
  let origen: Idea | null = null;
  if (p.ideas.length && prob(0.75)) {
    origen = elegirPeso(p.ideas, (i) => i.puntos) ?? p.ideas[0];
    if (origen.puntos >= 0.99) {
      cosas = origen.cosas.slice();
      verbo = origen.verbo;
    } else {
      [cosas, verbo] = variar(origen, fam, verbos);
    }
  } else {
    cosas = combinacionAlAzar(fam);
    verbo = elegir(verbos);
  }

  // Se prueba con cosas reales: hay que tenerlas y algo se gasta.
  for (const c of cosas) if (MATERIAL[c] && (a.despensa[c] ?? 0) < 1) return nada;
  for (const c of cosas) if (MATERIAL[c]) a.despensa[c] = r2(a.despensa[c] - 0.3);

  let mejor = 0;
  let objetivo: Tecnica | null = null;
  for (const t of TECNICAS) {
    if (!puedeAprender(p, t)) continue;
    const s = parecidoReceta(cosas, verbo, t);
    if (s > mejor) {
      mejor = s;
      objetivo = t;
    }
  }
  if (origen && mejor < origen.puntos) {
    // La idea ya no lleva a nada que no sepa: se va abandonando.
    origen.puntos = r2(origen.puntos - 0.15);
    p.ideas = p.ideas.filter((i) => i.puntos >= 0.5);
  }
  if (!objetivo || mejor < 0.5) return nada;
  if (mejor >= 0.999) {
    const exito = objetivo.facilidad * RITMO_SABER * (0.5 + p.genes.destreza) * rapidez;
    if (prob(exito)) {
      descubrir(m, p, a, objetivo, cosas, verbo);
      return { descubierto: objetivo, idea: true };
    }
  }
  const nueva = !origen || mejor > origen.puntos;
  recordarIdea(p, { cosas, verbo, puntos: r2(mejor) });
  return { descubierto: null, idea: nueva };
}

const PRONOMBRE: Record<string, string> = { el: 'lo', la: 'la', los: 'los', las: 'las' };

function descubrir(m: Mundo, p: Persona, a: Aldea, t: Tecnica, cosas: string[], verbo: string): void {
  const yaEnAldea = a.conocidos.includes(t.id);
  aprender(p, t.id, a);
  p.descubrimientos++;
  p.ideas = p.ideas.filter((i) => parecidoReceta(i.cosas, i.verbo, t) < 0.99);
  let palabra = palabraDe(p, t.id);
  if (!palabra) {
    palabra = inventarPalabra(m.fonologia);
    p.lexico[t.id] = [[palabra, 0.8]];
  }
  const pron = PRONOMBRE[t.titulo.split(' ')[0]] ?? 'lo';
  const forma = como(cosas, verbo);
  if (!m.hallazgos[t.id]) {
    m.hallazgos[t.id] = { t: m.t, por: p.nombre, porId: p.id, aldea: a.id, nombreAldea: a.nombre, palabra, como: forma };
    anotar(m, 'descubrimiento', `${p.nombre}, de ${a.nombre}, descubrió ${t.titulo} ${forma}. ${mayus(pron)} llamó «${palabra}».`, a.id);
  } else if (m.olvidados.includes(t.id)) {
    m.olvidados = m.olvidados.filter((x) => x !== t.id);
    anotar(m, 'redescubrimiento', `${p.nombre}, de ${a.nombre}, redescubrió ${t.titulo}, que el mundo había olvidado. ${mayus(pron)} llamó «${palabra}».`, a.id);
  } else if (!yaEnAldea) {
    anotar(m, 'redescubrimiento', `${p.nombre}, de ${a.nombre}, descubrió por su cuenta ${t.titulo}, sin saber que en otras aldeas ya ${pron} conocían.`, a.id);
  }
}

const mayus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Devuelve true si el saber es nuevo para la aldea. */
export function aprender(p: Persona, id: string, a: Aldea): boolean {
  if (!p.saberes.includes(id)) p.saberes.push(id);
  if (a.conocidos.includes(id)) return false;
  a.conocidos.push(id);
  return true;
}

/**
 * El maestro intenta enseñar algo que sabe. Se habla de ello (juego de nombrar):
 * si el alumno ya entiende la palabra, aprender es mucho más fácil.
 * Devuelve el saber aprendido, si alguno.
 */
export function ensenar(m: Mundo, maestro: Persona, alumno: Persona, aldeaAlumno: Aldea, nino: boolean, bonus: number): string | null {
  if (!maestro.saberes.length) return null;
  const id = elegir(maestro.saberes);
  const t = TECNICA[id];
  if (!t || !puedeAprender(alumno, t)) return null;
  const comprende = entiende(maestro, alumno, id);
  nombrar(m.fonologia, maestro, alumno, id, nino);
  const p = 0.08 * (0.5 + maestro.genes.sociabilidad) * (0.6 + 0.6 * alumno.genes.curiosidad) * (comprende ? 1 : 0.35) * bonus;
  if (!prob(p)) return null;
  aprender(alumno, id, aldeaAlumno);
  return id;
}

/** Comparte su idea más prometedora, si el otro puede entenderla. */
export function compartirIdea(hablante: Persona, oyente: Persona, aldeaOyente: Aldea): void {
  const idea = hablante.ideas[0];
  if (!idea || idea.puntos < 0.6) return;
  const fam = new Set(cosasFamiliares(oyente, aldeaOyente));
  if (!idea.cosas.every((c) => fam.has(c))) return;
  recordarIdea(oyente, { cosas: idea.cosas, verbo: idea.verbo, puntos: r2(idea.puntos * 0.9) });
}

/** Un escriba pasa a tablillas algo que se sabe en la aldea. */
export function escribir(p: Persona, a: Aldea): void {
  if (!sabe(p, 'escritura')) return;
  const sinEscribir = p.saberes.filter((s) => !a.archivo.includes(s));
  if (sinEscribir.length) a.archivo.push(elegir(sinEscribir));
}

/** Quien sabe leer puede aprender de las tablillas. */
export function leer(p: Persona, a: Aldea): string | null {
  if (!sabe(p, 'escritura') || !a.archivo.length) return null;
  const id = elegir(a.archivo);
  const t = TECNICA[id];
  if (!t || !puedeAprender(p, t)) return null;
  aprender(p, id, a);
  return id;
}
