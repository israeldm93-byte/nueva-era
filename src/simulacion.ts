// El paso del tiempo: un día del mundo detrás de otro.

import { azar, barajar, estadoAzar, fijarAzar, prob } from './azar.ts';
import { DIAS_ANIO } from './config.ts';
import { AGUA, MONTANA, PANTANO, RIO, TECNICA } from './catalogo.ts';
import { anioDe, anios, anotar, fecha, listar } from './cronica.ts';
import { desastres } from './desastres.ts';
import { cambiarTiempo } from './tiempo.ts';
import { asentarAprendizaje, comer, contexto, jornada, mantener, planificar } from './economia.ts';
import { fauna } from './fauna.ts';
import { lexicoComun, parecido } from './lenguaje.ts';
import { recrecer } from './mapa.ts';
import { aldeasVivas, crearMundo, edad, estacionDe, indexar, mediaGenes, type Indices } from './mundo.ts';
import { examinar } from './mente.ts';
import { facciones, noche } from './politica.ts';
import { anochecer, dividir, encuentros, peligros, salud, trasladar, vigilarLenguas } from './sociedad.ts';
import type { Aldea, FilaHistoria, Mundo, Persona } from './tipos.ts';

const r2 = (x: number) => Math.round(x * 100) / 100;
const HITOS = [25, 50, 100, 200, 500, 1000, 2000, 5000];

/** Avanza el mundo `dias` días. */
export function avanzar(m: Mundo, dias: number): void {
  fijarAzar(m.azar);
  for (let k = 0; k < dias; k++) paso(m);
  m.azar = estadoAzar();
}

function paso(m: Mundo): void {
  const dia = m.t % DIAS_ANIO;
  const est = estacionDe(m.t);
  if (dia === 0) inicioAnio(m);
  cambiarTiempo(m, est);
  if (m.t % 5 === 0) recrecer(m, est, 5);

  const ix = indexar(m);
  const vivas = aldeasVivas(m);
  const gente = (id: number) => ix.porAldea.get(id) ?? [];
  for (const a of vivas) if (m.t % 10 === 0 || a.consejo?.prioridad === 'obras') planificar(m, a, gente(a.id));

  const ctx = new Map(vivas.map((a) => [a.id, contexto(m, a, gente(a.id), est)]));
  for (const p of barajar(m.personas.slice())) {
    const c = ctx.get(p.aldea);
    if (c) jornada(m, p, c);
  }
  for (const c of ctx.values()) asentarAprendizaje(m, c);
  const encendidas = new Set<number>();
  for (const a of vivas) {
    const encendida = mantener(m, a, est, dia);
    if (encendida) encendidas.add(a.id);
    comer(m, a, gente(a.id));
    salud(m, a, gente(a.id), est, encendida);
    peligros(m, a, gente(a.id), dia);
  }
  fauna(m, ix, est, encendidas);
  desastres(m, ix, est, dia);
  anochecer(m, ix);
  for (const a of vivas) {
    const c = ctx.get(a.id);
    if (c) noche(m, a, gente(a.id), c);
  }
  if (m.t % 10 === 5) for (const a of vivas) if (a.abandonada === null) facciones(m, a, gente(a.id), ix);
  if (m.t % 15 === 7) encuentros(m, ix, new Map(vivas.map((a) => [a.id, ctx.get(a.id)?.escasez ?? 0])));
  if (m.t % 30 === 0) {
    for (const a of vivas) dividir(m, a, gente(a.id).filter((p) => !p.muerto && p.aldea === a.id), ix);
  }
  if (m.t % 30 === 15) {
    for (const a of vivas) trasladar(m, a, gente(a.id).filter((p) => !p.muerto && p.aldea === a.id));
  }
  enterrar(m);
  m.t++;
  if (!m.personas.length) extincion(m);
  else if (m.t % DIAS_ANIO === 0) finAnio(m);
}

const VECINAS = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

/** A las afueras, en tierra firme y sin nada construido encima. */
function lugarCementerio(m: Mundo, a: Aldea): { x: number; y: number } | null {
  const ocupadas = new Set<number>();
  for (const b of m.aldeas) for (const e of b.edificios) ocupadas.add(e.y * m.ancho + e.x);
  for (let r = 3; r <= 6; r++) {
    for (let k = 0; k < VECINAS.length; k++) {
      const [dx, dy] = VECINAS[(a.id * 3 + k) % VECINAS.length];
      const x = a.x + dx * r;
      const y = a.y + dy * r;
      if (x < 0 || y < 0 || x >= m.ancho || y >= m.alto) continue;
      const i = y * m.ancho + x;
      const t = m.terreno[i];
      if (t === AGUA || t === RIO || t === MONTANA || t === PANTANO || ocupadas.has(i)) continue;
      return { x, y };
    }
  }
  return null;
}

/** Cada aldea entierra a sus muertos en su cementerio; si se ha mudado lejos, abre otro. */
function sepultar(m: Mundo, a: Aldea, p: Persona, causa: string): void {
  let c = a.cementerio ?? null;
  if (!c || Math.abs(c.x - a.x) + Math.abs(c.y - a.y) > 8) {
    c = lugarCementerio(m, a);
    a.cementerio = c;
  }
  if (!c) return;
  a.tumbas ??= [];
  const pareja = p.pareja !== null ? m.personas.find((q) => q.id === p.pareja)?.nombre : undefined;
  const descubrio = Object.entries(m.hallazgos)
    .filter(([, h]) => h.porId === p.id)
    .map(([id]) => id);
  a.tumbas.push({
    x: c.x,
    y: c.y,
    t: m.t,
    nombre: p.nombre,
    edad: Math.floor(edad(m, p)),
    causa,
    sexo: p.sexo,
    oficio: p.actividad,
    hijos: p.hijos,
    ...(pareja ? { pareja } : {}),
    ...(descubrio.length ? { descubrio } : {}),
  });
  if (a.tumbas.length > 60) a.tumbas.shift();
  a.enterrados = (a.enterrados ?? 0) + 1;
}

function enterrar(m: Mundo): void {
  const muertos = m.personas.filter((p) => p.muerto);
  if (muertos.length) m.personas = m.personas.filter((p) => !p.muerto);
  const ix = indexar(m);
  for (const p of muertos) {
    const causa = p.muerto ?? 'enfermedad';
    m.anual.muertes[causa] = (m.anual.muertes[causa] ?? 0) + 1;
    if (p.pareja !== null) {
      const q = ix.porId.get(p.pareja);
      if (q) q.pareja = null;
    }
    const a = m.aldeas.find((x) => x.id === p.aldea);
    if (!a) continue;
    sepultar(m, a, p, causa);
    const quedan = ix.porAldea.get(a.id) ?? [];
    necrologica(m, p, a.nombre, a.id);
    for (const s of p.saberes) {
      if (quedan.some((q) => q.saberes.includes(s))) continue;
      a.conocidos = a.conocidos.filter((x) => x !== s);
      if (a.archivo.includes(s)) continue;
      if (quedan.length) {
        anotar(m, 'perdida', `Murió ${p.nombre} y con ${p.sexo === 'M' ? 'ella' : 'él'} se perdió en ${a.nombre} ${TECNICA[s].titulo}: nadie más ${pronombre(s)} sabía.`, a.id);
      }
      const enElMundo = m.personas.some((q) => q.saberes.includes(s)) || aldeasVivas(m).some((b) => b.archivo.includes(s));
      if (!enElMundo && !m.olvidados.includes(s)) {
        m.olvidados.push(s);
        anotar(m, 'olvido', `${mayus(TECNICA[s].titulo)} ha desaparecido del mundo: ya no queda nadie que ${pronombre(s)} conozca.`, a.id);
      }
    }
  }
  for (const a of aldeasVivas(m)) {
    if ((ix.porAldea.get(a.id)?.length ?? 0) === 0) {
      a.abandonada = m.t;
      a.obra = null;
      anotar(m, 'abandono', `${a.nombre} ha quedado vacía. Sus casas se irán convirtiendo en ruinas.`, a.id);
    }
  }
}

function pronombre(s: string): string {
  const art = TECNICA[s].titulo.split(' ')[0];
  return ({ el: 'lo', la: 'la', los: 'los', las: 'las' } as Record<string, string>)[art] ?? 'lo';
}

const mayus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function necrologica(m: Mundo, p: Persona, aldea: string, aldeaId: number): void {
  const e = edad(m, p);
  const suyos = Object.entries(m.hallazgos)
    .filter(([, h]) => h.porId === p.id)
    .map(([id]) => TECNICA[id].titulo);
  if (suyos.length) {
    anotar(m, 'muerte', `Murió ${p.nombre}, de ${aldea}, a los ${anios(e)}. Fue quien descubrió ${listar(suyos)}.`, aldeaId);
  } else if (e >= 80) {
    anotar(m, 'muerte', `Murió ${p.nombre}, de ${aldea}, a la edad de ${anios(e)}.`, aldeaId);
  }
}

function finAnio(m: Mundo): void {
  const ix = indexar(m);
  m.historia.push(filaHistoria(m, ix));
  vigilarLenguas(m, ix);
}

function inicioAnio(m: Mundo): void {
  const ix = indexar(m);
  m.anual = { nacimientos: 0, muertes: {}, asaltos: 0, aciertos: 0, predicciones: 0 };

  m.clima = r2(prob(0.07) ? 0.5 + 0.15 * azar() : Math.min(1.25, Math.max(0.7, 0.6 * m.clima + 0.4 * (0.75 + 0.5 * azar()))));
  if (m.clima < 0.7) anotar(m, 'sequia', `Llega un año de sequía: las plantas apenas darán fruto.`);

  const n = m.personas.length;
  m.poblacionMax = Math.max(m.poblacionMax, n);
  for (const h of HITOS) {
    if (n >= h && !m.hitos.includes(h)) {
      m.hitos.push(h);
      anotar(m, 'poblacion', `Ya son ${h} personas en el mundo.`);
    }
  }
  for (const a of aldeasVivas(m)) {
    const gente = ix.porAldea.get(a.id) ?? [];
    a.poblacionMax = Math.max(a.poblacionMax, gente.length);
    // Se repasa qué sabe la aldea por si alguien se mudó llevándose algo.
    const saben = new Set<string>();
    for (const p of gente) for (const s of p.saberes) saben.add(s);
    a.conocidos = [...a.conocidos.filter((s) => saben.has(s)), ...[...saben].filter((s) => !a.conocidos.includes(s))];
  }
}

function filaHistoria(m: Mundo, ix: Indices): FilaHistoria {
  const vivas = aldeasVivas(m);
  const saberes = new Set<string>();
  let reservas = 0;
  let edades = 0;
  for (const p of m.personas) {
    for (const s of p.saberes) saberes.add(s);
    reservas += p.reservas;
    edades += edad(m, p);
  }
  const n = Math.max(1, m.personas.length);
  const grandes = vivas.filter((a) => (ix.porAldea.get(a.id)?.length ?? 0) >= 5);
  const lexicos = grandes.map((a) => lexicoComun(ix.porAldea.get(a.id) ?? []));
  let suma = 0;
  let pares = 0;
  for (let i = 0; i < lexicos.length; i++) {
    for (let j = i + 1; j < lexicos.length; j++) {
      suma += parecido(lexicos[i], lexicos[j]);
      pares++;
    }
  }
  const mentes = m.personas.filter((p) => edad(m, p) >= 16).map((p) => p.mente);
  const pruebas = examinar(mentes);
  return {
    era: m.era,
    anio: anioDe(m.t - 1),
    poblacion: m.personas.length,
    aldeas: vivas.length,
    nacimientos: m.anual.nacimientos,
    muertes: m.anual.muertes,
    saberes: saberes.size,
    reservas: r2(reservas / n),
    edadMedia: r2(edades / n),
    genes: mediaGenes(m.personas),
    parecido: pares ? r2(suma / pares) : 1,
    clima: m.clima,
    sensatez: pruebas.length ? r2(pruebas.reduce((s, x) => s + x, 0) / pruebas.length) : 0,
    pruebas,
    ...(m.anual.predicciones >= 20 ? { acierto: r2(m.anual.aciertos / m.anual.predicciones) } : {}),
    asaltos: m.anual.asaltos,
    facciones: vivas.reduce((s, a) => s + a.facciones.length, 0),
  };
}

function extincion(m: Mundo): void {
  const total = Math.floor(m.t / DIAS_ANIO);
  anotar(m, 'extincion', `Ha muerto la última persona. La especie se ha extinguido tras ${anios(total)} (${fecha(m.t)}).`);
  m.eras.push({
    era: m.era,
    semilla: m.semilla,
    anios: total,
    poblacionMax: m.poblacionMax,
    saberes: Object.keys(m.hallazgos).length,
    fin: fecha(m.t),
  });
  const semilla = (Math.imul(m.semilla ^ 0x9e3779b9, 2654435761) + m.era) >>> 0;
  Object.assign(m, crearMundo(semilla, m));
}
