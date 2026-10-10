// Política: opiniones, consejo, facciones, cismas y relaciones entre aldeas.
//
// Nada de esto sigue un guion. Cada adulto se forma una opinión sobre qué debería
// ser lo prioritario (mirando las necesidades de la aldea con su propia mente) y
// la va contagiando al hablar. Cada noche, los más respetados forman el consejo y
// votan cada uno su opinión. Cuando un grupo grande piensa distinto, nace una
// facción; si el consejo la ignora demasiado tiempo, se va. Entre aldeas crecen la
// afinidad (bodas, comercio, origen común) o el rencor (asaltos); el hambre y la
// agresividad de quienes mandan pueden llevar a asaltar al vecino.

import { prob } from './azar.ts';
import { DIAS_ANIO, EDAD_ADULTA } from './config.ts';
import { ORDEN_COMER } from './catalogo.ts';
import { anotar, listar } from './cronica.ts';
import { aCaballo, comidaTotal, conoce, cuantos, guardar, situacion, tiene, type Contexto } from './economia.ts';
import { mayuscula, inventarPalabra } from './lenguaje.ts';
import { buscarSitio, direccion } from './mapa.ts';
import { distancia } from './matematicas.ts';
import { ACCIONES, ALINEADAS, PRIORIDADES, entradas, pensar } from './mente.ts';
import { edad, nuevaAldea, type Indices } from './mundo.ts';
import { limiteAldea, morir } from './sociedad.ts';
import type { Aldea, Faccion, Mundo, Persona, Relacion } from './tipos.ts';

const r2 = (x: number) => Math.round(x * 100) / 100;

export const FRASE: Record<string, string> = {
  comida: 'hay que conseguir más comida',
  invierno: 'hay que prepararse para el invierno',
  obras: 'es momento de construir',
  saber: 'hay que probar cosas nuevas y enseñar',
  expandir: 'somos demasiados y hay que buscar nuevas tierras',
  defensa: 'hay que defenderse',
};

export function respeto(m: Mundo, p: Persona): number {
  const e = edad(m, p);
  return Math.min(1, Math.max(0, (e - 16) / 40)) + 0.15 * p.saberes.length + 0.6 * p.descubrimientos + 0.1 * p.hijos;
}

export function relacion(m: Mundo, a: number, b: number): Relacion {
  const clave = a < b ? `${a}-${b}` : `${b}-${a}`;
  return (m.relaciones[clave] ??= { afinidad: 0.2, rencor: 0, ultimoAsalto: -100000, alianza: false });
}

/**
 * Lo que pide la situación de la aldea, recordado durante meses: una opinión no
 * cambia por un mal día ni por la estación, sino por lo que se viene viviendo.
 */
function necesidades(a: Aldea, gente: Persona[], c: Contexto): Record<string, number> {
  const hoy = necesidadesHoy(a, gente, c);
  const memoria = (a.memoria ??= { ...hoy });
  for (const k of Object.keys(hoy)) memoria[k] = r2((memoria[k] ?? hoy[k]) * 0.98 + hoy[k] * 0.02);
  return memoria;
}

function necesidadesHoy(a: Aldea, gente: Persona[], c: Contexto): Record<string, number> {
  const n = Math.max(1, gente.length);
  let hambre = 0;
  for (const p of gente) hambre += 1 - p.reservas / 8;
  const capacidad = cuantos(a, 'choza') * 5 + cuantos(a, 'casa') * 7;
  const sabeRefugio = conoce(a, 'choza') || conoce(a, 'adobe');
  return {
    comida: 0.15 + c.escasez * 1.3 + (hambre / n) * 0.7,
    invierno: (c.est === 2 ? 0.9 : c.est === 1 ? 0.35 : 0) * Math.max(0, 1 - (a.despensa.madera ?? 0) / 40),
    obras: (a.obra ? (c.obraLista ? 0.35 : 0.55) : 0) + (sabeRefugio && capacidad < n ? 0.3 : 0),
    saber: c.holgura * 0.3,
    expandir: Math.max(0, n / limiteAldea(a) - 0.75) * 2 + (c.escasez > 0.7 && n > 20 ? 0.3 : 0),
    defensa: a.amenaza * 1.1 + (a.consejo?.guerra ? 0.5 : 0),
  };
}

/** Lo que cada uno piensa que habría que hacer: necesidades vistas a través de su mente. */
function opinar(m: Mundo, p: Persona, c: Contexto, nec: Record<string, number>): string {
  const valores: Record<string, number> = {};
  const e = edad(m, p);
  const s = pensar(p.mente, entradas(situacion(p, c, e, false))).salidas;
  const media = (acts: string[]) => acts.reduce((t, k) => t + s[ACCIONES.indexOf(k)], 0) / acts.length;
  let mejor = PRIORIDADES[0];
  let max = -Infinity;
  for (const pr of PRIORIDADES) {
    const acts = ALINEADAS[pr];
    let sesgo = acts.length ? media(acts) : p.genes.curiosidad - 0.5;
    if (pr === 'defensa') sesgo += p.genes.agresividad - 0.5;
    // Cada cual ve las necesidades comunes a su manera: pesan su mente, su carácter,
    // su edad y su familia. De ahí salen los desacuerdos y las facciones.
    let v = 0.6 * nec[pr] + 0.3 * sesgo;
    if (pr === 'comida') v += (1 - p.reservas / 8) * 0.5;
    if (pr === 'saber') v += (p.genes.curiosidad - 0.5) * 0.8 + (e > 50 ? 0.1 : 0);
    if (pr === 'expandir') v += (e < 30 ? 0.3 * p.genes.curiosidad : 0) + (p.genes.agresividad - 0.5) * 0.3;
    if (pr === 'obras') v += (e > 40 ? 0.2 : 0) + (p.hijos >= 3 ? 0.1 : 0);
    if (pr === 'defensa') v += (p.genes.agresividad - 0.5) * 0.6;
    if (pr === 'invierno') v += e > 55 ? 0.15 : 0;
    valores[pr] = v;
    if (v > max) {
      max = v;
      mejor = pr;
    }
  }
  // Cambiar de opinión cuesta: solo si la nueva es claramente mejor.
  return valores[p.opinion] !== undefined && max - valores[p.opinion] < 0.08 ? p.opinion : mejor;
}

/** Cada noche: unos cuantos repiensan su opinión y el consejo vota. */
export function noche(m: Mundo, a: Aldea, gente: Persona[], c: Contexto): void {
  const adultos = gente.filter((p) => !p.muerto && edad(m, p) >= 16);
  if (adultos.length < 3) {
    a.consejo = null;
    return;
  }
  const nec = necesidades(a, gente, c);
  for (const p of adultos) if (prob(0.05)) p.opinion = opinar(m, p, c, nec);

  const k = Math.max(3, Math.min(5, Math.round(adultos.length / 6)));
  const puntuados = adultos.map((p) => [p, respeto(m, p)] as [Persona, number]);
  puntuados.sort((x, y) => y[1] - x[1] || x[0].id - y[0].id);
  const miembros = puntuados.slice(0, k);
  const votos: Record<string, number> = {};
  for (const [p, r] of miembros) votos[p.opinion] = r2((votos[p.opinion] ?? 0) + r + 0.1);
  let gana = Object.keys(votos)[0];
  for (const pr of Object.keys(votos)) if (votos[pr] > votos[gana]) gana = pr;
  const actual = a.consejo?.prioridad;
  if (actual && (votos[actual] ?? 0) * 1.25 >= votos[gana]) gana = actual;

  const ids = miembros.map(([p]) => p.id);
  if (!a.consejo || a.consejo.prioridad !== gana) {
    a.consejo = { prioridad: gana, desde: m.t, anunciado: a.consejo?.anunciado ?? -100000, anunciada: a.consejo?.anunciada ?? '', miembros: ids, votos };
  } else {
    a.consejo.miembros = ids;
    a.consejo.votos = votos;
  }
  // Solo pasa a la crónica una decisión que se mantiene un mes y cambia lo anterior.
  const cs = a.consejo;
  if (m.t - cs.desde === 60 && cs.anunciada !== cs.prioridad && m.t - cs.anunciado >= 240) {
    cs.anunciado = m.t;
    cs.anunciada = cs.prioridad;
    anotar(m, 'consejo', `El consejo de ${a.nombre} (${listar(miembros.slice(0, 3).map(([p]) => p.nombre))}) decide que ${FRASE[cs.prioridad]}.`, a.id);
  }
  // El miedo se va olvidando si no pasa nada; cada mes se repiensa la guerra.
  a.amenaza = r2(a.amenaza * 0.99);
  if ((m.t + a.id) % 30 === 0) repensarGuerra(m, a);
}

/** Al hablar, las opiniones se contagian; más si quien habla es respetado. */
export function persuadir(m: Mundo, hablante: Persona, oyente: Persona): void {
  if (hablante.opinion === oyente.opinion) return;
  if (edad(m, hablante) < EDAD_ADULTA || edad(m, oyente) < EDAD_ADULTA) return;
  const prestigio = Math.min(2, 0.5 + respeto(m, hablante) / 3);
  if (prob(0.06 * (0.5 + oyente.genes.sociabilidad) * prestigio)) oyente.opinion = hablante.opinion;
}

/** Cada pocos días: nacen, cambian o se disuelven facciones; las ignoradas pueden irse. */
export function facciones(m: Mundo, a: Aldea, gente: Persona[], ix: Indices): void {
  const adultos = gente.filter((p) => !p.muerto && edad(m, p) >= 16);
  const n = adultos.length;
  const grupos: Record<string, Persona[]> = {};
  for (const p of adultos) (grupos[p.opinion] ??= []).push(p);
  const quedan: Faccion[] = [];
  for (const f of a.facciones) {
    const g = grupos[f.opinion] ?? [];
    f.debil = g.length >= 3 && g.length / Math.max(1, n) >= 0.12 ? 0 : (f.debil ?? 0) + 1;
    // Una facción no muere de un día para otro: hacen falta meses sin apoyos.
    if (f.debil < 6) quedan.push(f);
    else if (f.anunciada) anotar(m, 'faccion', `Los ${f.nombre} de ${a.nombre} se disuelven: ya casi nadie piensa como ellos.`, a.id);
  }
  a.facciones = quedan;
  for (const pr of PRIORIDADES) {
    // Una facción es oposición organizada: gente que no piensa como el consejo.
    if (!a.consejo || a.consejo.prioridad === pr) continue;
    const g = grupos[pr] ?? [];
    if (g.length < 4 || g.length / Math.max(1, n) < 0.25 || a.facciones.some((f) => f.opinion === pr)) continue;
    const lider = g.reduce((x, y) => (respeto(m, y) > respeto(m, x) ? y : x));
    a.facciones.push({
      id: m.sigId++,
      nombre: mayuscula(inventarPalabra(m.fonologia, 2)),
      opinion: pr,
      lider: lider.id,
      nacida: m.t,
      miembros: g.length,
      descontento: 0,
      anunciada: false,
    });
  }
  for (const p of gente) p.faccion = null;
  for (const f of a.facciones) {
    const g = grupos[f.opinion] ?? [];
    f.miembros = g.length;
    if (!g.length) continue;
    if (!g.some((p) => p.id === f.lider)) f.lider = g.reduce((x, y) => (respeto(m, y) > respeto(m, x) ? y : x)).id;
    for (const p of g) p.faccion = f.id;
    const parte = g.length / Math.max(1, n);
    if (a.consejo && a.consejo.prioridad !== f.opinion) f.descontento = r2(f.descontento + 0.1 * parte * 2);
    else f.descontento = r2(Math.max(0, f.descontento - 0.2));
    if (!f.anunciada && m.t - f.nacida >= 240 && !f.debil) {
      f.anunciada = true;
      const lider = ix.porId.get(f.lider);
      anotar(m, 'faccion', `En ${a.nombre} se organiza una facción, los ${f.nombre}${lider ? `, guiados por ${lider.nombre}` : ''}: creen que ${FRASE[f.opinion]}.`, a.id);
    }
    if (f.descontento >= 1 && g.length >= 6 && parte <= 0.6) {
      cisma(m, a, f, g, ix);
      break;
    }
  }
}

/** Una facción ignorada se marcha con sus familias y funda su propia aldea. */
function cisma(m: Mundo, a: Aldea, f: Faccion, miembros: Persona[], ix: Indices): void {
  const sitio = buscarSitio(m, a, 8, 22, null, conoce(a, 'canoa'));
  if (!sitio) {
    f.descontento = 0.5;
    return;
  }
  const lider = ix.porId.get(f.lider) ?? miembros[0];
  const grupo = new Set<Persona>(miembros);
  for (const p of miembros) {
    for (const h of ix.porAldea.get(a.id) ?? []) if ((h.padre === p.id || h.madre === p.id) && edad(m, h) < 16) grupo.add(h);
  }
  const b = nuevaAldea(m, sitio.x, sitio.y, lider.nombre, a.id);
  b.nombre = f.nombre;
  const parte = grupo.size / Math.max(1, (ix.porAldea.get(a.id) ?? []).length);
  for (const [k, v] of Object.entries(a.despensa)) {
    const lleva = r2(v * parte * 0.8);
    b.despensa[k] = lleva;
    a.despensa[k] = r2(v - lleva);
  }
  b.vistos = a.vistos.slice();
  for (const p of grupo) {
    p.aldea = b.id;
    p.x = b.x;
    p.y = b.y;
    p.faccion = null;
    // Las parejas que se quedan atrás se rompen.
    if (p.pareja !== null) {
      const q = ix.porId.get(p.pareja);
      if (q && !grupo.has(q)) {
        q.pareja = null;
        p.pareja = null;
      }
    }
    for (const s of p.saberes) if (!b.conocidos.includes(s)) b.conocidos.push(s);
  }
  const quedan = (ix.porAldea.get(a.id) ?? []).filter((p) => !grupo.has(p));
  a.conocidos = a.conocidos.filter((s) => quedan.some((p) => p.saberes.includes(s)) || a.archivo.includes(s));
  a.facciones = a.facciones.filter((x) => x !== f);
  b.poblacionMax = grupo.size;
  const rel = relacion(m, a.id, b.id);
  rel.afinidad = 0.35;
  rel.rencor = 0.35;
  anotar(
    m,
    'cisma',
    `Hartos de que el consejo no les escuche, los ${f.nombre} abandonan ${a.nombre}: ${grupo.size} personas siguen a ${lider.nombre} hacia ${direccion(a, b.x, b.y)} y fundan su propia aldea.`,
    b.id,
  );
}

/** Lo que valen sus armas: el metal, la espada, el arco, el escudo y los caballos. */
const armas = (a: Aldea) =>
  (conoce(a, 'hierro') ? 2 : conoce(a, 'bronce') ? 1.6 : conoce(a, 'cobre') ? 1.3 : conoce(a, 'lanza') ? 1.15 : 1) *
  (conoce(a, 'espada') ? (conoce(a, 'hierro') ? 1.35 : 1.25) : 1) *
  (conoce(a, 'arco') ? 1.15 : 1) *
  (conoce(a, 'escudo') ? 1.1 : 1) *
  (aCaballo(a) ? 1.15 : 1);
/** Lo que protegen sus muros. */
const muros = (a: Aldea) => (tiene(a, 'muralla') ? 3 : tiene(a, 'empalizada') ? 1.8 : tiene(a, 'cerca') ? 1.2 : 1);

const MOTIVO: Record<string, string> = {
  hambre: 'les falta comida',
  codicia: 'sus graneros están llenos y los propios vacíos',
  rencor: 'no olvidan lo que les hicieron',
  belicosos: 'quienes mandan son belicosos',
  venganza: 'juran vengar el asalto',
};

/** ¿Está A en guerra con B? */
export const enGuerra = (A: Aldea, B: Aldea) => A.consejo?.guerra?.contra === B.id;

/**
 * ¿Decide el consejo de A asaltar a B? Votan según el hambre, la codicia, el rencor y
 * su agresividad; si ya están en guerra, cuesta menos. Devuelve el motivo, o null.
 */
export function quiereAsaltar(m: Mundo, A: Aldea, B: Aldea, ga: Persona[], gb: Persona[], escasezA: number, porId: Map<number, Persona>): string | null {
  if (!A.consejo || ga.length < 6 || !gb.length) return null;
  const rel = relacion(m, A.id, B.id);
  const guerra = enGuerra(A, B);
  if (rel.alianza || m.t - rel.ultimoAsalto < (guerra ? DIAS_ANIO / 2 : DIAS_ANIO) || m.t - (rel.paz ?? -100000) < DIAS_ANIO * 3) return null;
  const comidaA = comidaTotal(A) / ga.length;
  const comidaB = comidaTotal(B) / gb.length;
  const codicia = comidaB > comidaA * 1.5 && comidaB > 10 ? 0.4 : 0;
  const miembros = A.consejo.miembros.map((id) => porId.get(id)).filter((p): p is Persona => !!p);
  if (!miembros.length) return null;
  const agresividad = miembros.reduce((s, p) => s + p.genes.agresividad, 0) / miembros.length;
  // Antes de atacar miran si pueden ganar: nadie sensato asalta una muralla sin catapultas.
  const muro = 1 + (muros(B) - 1) * (conoce(A, 'catapulta') ? 0.35 : 1);
  const fuerza = (ga.length * armas(A)) / Math.max(1, gb.length * armas(B) * muro);
  const motivos: [string, number][] = [
    ['hambre', escasezA * 0.9],
    ['codicia', codicia],
    ['rencor', rel.rencor * 1.2],
    ['belicosos', (agresividad - 0.5) * 0.6],
  ];
  const ganas = motivos.reduce((s, [, v]) => s + v, 0) - rel.afinidad + (guerra ? 0.25 : 0) + Math.max(-0.5, Math.min(0.1, (fuerza - 1) * 0.35));
  if (ganas < 0.3) return null;
  let si = 0;
  for (const p of miembros) if (ganas + (p.genes.agresividad - 0.5) * 0.8 > 0.6) si++;
  if (si / miembros.length <= 0.5) return null;
  return guerra ? A.consejo.guerra!.motivo : motivos.reduce((x, y) => (y[1] > x[1] ? y : x))[0];
}

/** El consejo de A declara la guerra a B (o la mantiene). */
function declarar(m: Mundo, A: Aldea, B: Aldea, motivo: string): void {
  if (!A.consejo || enGuerra(A, B)) return;
  A.consejo.guerra = { contra: B.id, desde: m.t, motivo, derrotas: 0 };
  anotar(m, 'guerra', `El consejo de ${A.nombre} decide hacer la guerra a ${B.nombre}: ${MOTIVO[motivo] ?? motivo}.`, A.id);
}

/** Cada mes, cada consejo en guerra se pregunta si sigue: tras derrotas, o si el rencor se enfría, firma la paz. */
export function repensarGuerra(m: Mundo, a: Aldea): void {
  const g = a.consejo?.guerra;
  if (!g) return;
  const B = m.aldeas.find((x) => x.id === g.contra);
  const rel = relacion(m, a.id, g.contra);
  const larga = m.t - rel.ultimoAsalto > DIAS_ANIO * 2 && rel.rencor < 0.45;
  if (!B || B.abandonada !== null || g.derrotas >= 2 || larga) {
    a.consejo!.guerra = null;
    if (B && B.abandonada === null) {
      rel.rencor = r2(rel.rencor * 0.6);
      rel.paz = m.t;
      if (B.consejo?.guerra?.contra === a.id) B.consejo.guerra = null;
      anotar(m, 'paz', `El consejo de ${a.nombre} hace las paces con ${B.nombre}${g.derrotas >= 2 ? ' tras dos derrotas' : ''}.`, a.id);
    }
  }
}

export function asaltar(m: Mundo, A: Aldea, B: Aldea, ga: Persona[], gb: Persona[], motivo = 'hambre'): void {
  declarar(m, A, B, motivo);
  const rel = relacion(m, A.id, B.id);
  const aptos = ga.filter((p) => !p.muerto && edad(m, p) >= 16 && edad(m, p) <= 55 && p.salud > 0.4);
  aptos.sort((x, y) => y.genes.fuerza - x.genes.fuerza || x.id - y.id);
  const guerreros = aptos.slice(0, Math.max(2, Math.round(aptos.length * 0.3)));
  const defensores = gb.filter((p) => !p.muerto && edad(m, p) >= 16 && edad(m, p) <= 60);
  const vigias = defensores.filter((p) => p.actividad === 'vigilar').length;
  const fA = guerreros.reduce((s, p) => s + 0.5 + p.genes.fuerza, 0) * armas(A);
  // Las catapultas abren brecha en los muros; los arcos defienden mejor desde dentro.
  const muro = 1 + (muros(B) - 1) * (conoce(A, 'catapulta') ? 0.35 : 1);
  const fB = (defensores.reduce((s, p) => s + 0.5 + p.genes.fuerza, 0) + vigias * 0.8) * armas(B) * muro * (conoce(B, 'arco') ? 1.1 : 1) * 1.2;
  const gana = prob(fA / (fA + fB));
  let muertosA = 0;
  let muertosB = 0;
  for (const p of guerreros) {
    p.actividad = 'asaltar';
    p.x = B.x;
    p.y = B.y;
    if (prob((gana ? 0.05 : 0.18) * (conoce(A, 'escudo') ? 0.7 : 1))) {
      morir(p, 'combate');
      muertosA++;
    }
  }
  for (const p of defensores) {
    p.actividad = 'defender';
    if (prob((gana ? 0.1 : 0.03) * (conoce(B, 'escudo') ? 0.7 : 1))) {
      morir(p, 'combate');
      muertosB++;
    }
  }
  let botin = 0;
  if (gana) {
    for (const mat of ORDEN_COMER) {
      const v = B.despensa[mat] ?? 0;
      const lleva = r2(v * 0.35);
      if (lleva <= 0) continue;
      B.despensa[mat] = r2(v - lleva);
      guardar(A, mat, lleva);
      botin += lleva;
    }
  }
  // Con flechas encendidas prenden fuego a las casas.
  let quema = false;
  if (conoce(A, 'flechaFuego') && prob(gana ? 0.6 : 0.3)) {
    const i = B.y * m.ancho + B.x;
    if (!m.incendios.some(([j]) => j === i)) m.incendios.push([i, 3]);
    quema = true;
  }
  if (!gana && A.consejo?.guerra) A.consejo.guerra.derrotas++;
  // Al asaltado le puede la sed de venganza (si quienes mandan son belicosos).
  if (B.consejo && !enGuerra(B, A) && rel.rencor > 0.6 && prob(0.25)) declarar(m, B, A, 'venganza');
  B.amenaza = Math.min(1, r2(B.amenaza + 0.6));
  A.amenaza = Math.min(1, r2(A.amenaza + 0.15));
  rel.rencor = Math.min(1, r2(rel.rencor + (gana ? 0.5 : 0.3)));
  rel.afinidad = Math.max(0, r2(rel.afinidad - 0.3));
  rel.ultimoAsalto = m.t;
  m.anual.asaltos++;
  const bajas = (n: number) => (n === 0 ? 'sin bajas' : n === 1 ? '1 muerto' : `${n} muertos`);
  anotar(
    m,
    'asalto',
    gana
      ? `${guerreros.length} guerreros de ${A.nombre} asaltan ${B.nombre} y se llevan ${Math.round(botin)} raciones de comida (${A.nombre}: ${bajas(muertosA)}; ${B.nombre}: ${bajas(muertosB)}).${quema ? ' Con flechas encendidas prenden fuego a sus casas.' : ''}`
      : `${B.nombre} rechaza el asalto de ${guerreros.length} guerreros de ${A.nombre} (${A.nombre}: ${bajas(muertosA)}; ${B.nombre}: ${bajas(muertosB)}).${quema ? ' Aun así, sus flechas encendidas prenden algunas casas.' : ''}`,
    B.id,
  );
}

/** Tras un encuentro pacífico la afinidad crece; el rencor se va olvidando; nacen y se rompen alianzas. */
export function convivir(m: Mundo, A: Aldea, B: Aldea, escasezA: number, escasezB: number): void {
  const rel = relacion(m, A.id, B.id);
  // Vecinos demasiado cerca y con hambre se disputan las mismas tierras.
  if (distancia(A.x - B.x, A.y - B.y) < 12 && escasezA > 0.4 && escasezB > 0.4) rel.rencor = Math.min(1, r2(rel.rencor + 0.03));
  rel.afinidad = Math.min(1, r2(rel.afinidad + 0.005 + (A.origen === B.id || B.origen === A.id ? 0.005 : 0)));
  rel.rencor = Math.max(0, r2(rel.rencor - 0.02));
  if (!rel.alianza && rel.afinidad > 0.75 && rel.rencor < 0.1) {
    rel.alianza = true;
    anotar(m, 'alianza', `${A.nombre} y ${B.nombre} sellan una alianza: se ayudarán en tiempos de hambre.`, A.id);
  } else if (rel.alianza && rel.rencor > 0.4) {
    rel.alianza = false;
    anotar(m, 'alianza', `Se rompe la alianza entre ${A.nombre} y ${B.nombre}.`, A.id);
  }
  // Los aliados comparten comida cuando uno pasa hambre.
  if (rel.alianza) {
    const [rica, pobre] = escasezA > 0.6 && escasezB < 0.3 ? [B, A] : escasezB > 0.6 && escasezA < 0.3 ? [A, B] : [null, null];
    if (rica && pobre) {
      for (const mat of ORDEN_COMER) {
        const v = rica.despensa[mat] ?? 0;
        const pasa = r2(v * 0.15);
        if (pasa <= 0) continue;
        rica.despensa[mat] = r2(v - pasa);
        guardar(pobre, mat, pasa);
      }
    }
  }
}

/** Cuando dos aldeas emparentan, se tienen más aprecio. */
export function boda(m: Mundo, a: number, b: number): void {
  if (a === b) return;
  const rel = relacion(m, a, b);
  rel.afinidad = Math.min(1, r2(rel.afinidad + 0.08));
}
