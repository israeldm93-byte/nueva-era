// Urbanismo: el plano de cada aldea.
//
// Una aldea no coloca sus casas en la primera casilla libre: tiene un plano. Desde la plaza
// salen sus calles principales, por donde el terreno lo permite (sin agua, sin montaña, sin
// cuestas imposibles), hacia lo que le importa: los caminos que llevan a otras aldeas, la
// costa si vive de la pesca, las colinas si vive de la piedra, el bosque si de la madera. A
// lo largo de cada calle se reservan solares, uno de cada dos casillas y a los dos lados,
// separados entre sí; cada seis casillas nace un ramal, y entre ramal y ramal queda una
// manzana con su patio en medio. Los solares que dan a la plaza se guardan para lo público.
//
// Cada edificio busca el solar que le conviene según su uso (ver USO_URBANO): las casas,
// cerca del centro y entre casas; los talleres, en la calle de los oficios y juntos; el ganado,
// al final de las calles. Cuando no queda un buen solar, la aldea alarga una calle o abre un
// ramal nuevo: crece por barrios, no se apelotona. Las calles por las que se entra a lo que ya
// está construido se pisan (se ven en el mapa) y, con la técnica de los caminos, se mejoran.
//
// El plano es estado del mundo (se guarda); lo que se ve en 3D lo dibuja la web a partir de él.

import { AGUA, BOSQUE, COLINA, ESTEPA, MONTANA, PRADERA, RIO, USO_URBANO } from './catalogo.ts';
import { caminosDe, transitoDe } from './caminos.ts';
import { anotar } from './cronica.ts';
import { direccion, masas } from './mapa.ts';
import { GRANDES, desnivel, labrada } from './tierra.ts';
import type { Aldea, Calle, Mundo, Parcela, Urbe } from './tipos.ts';

/** Las ocho direcciones, empezando por el este y en el sentido de las agujas del reloj (la y crece hacia el sur). */
const DIRS: [number, number][] = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
/** Largo del primer tramo de una calle principal, de cada alargamiento y de un ramal nuevo. */
const LARGO_EJE = 6;
const LARGO_TRAMO = 4;
const LARGO_RAMAL = 4;
/** Cada cuántas casillas de una calle puede nacer un ramal (en la 6.ª, la 12.ª...). */
const CADA_RAMAL = 6;
/** ¿Nace un ramal en la posición k de una calle? */
const esCruce = (k: number) => k % CADA_RAMAL === CADA_RAMAL - 1;
/** Hasta dónde puede llegar el plano (casillas desde el centro) y cuántas calles puede tener. */
export const RADIO_URBE = 18;
const MAX_CALLES = 32;
/** Cuesta máxima entre dos casillas seguidas de una calle, y desnivel máximo de un solar. */
const CUESTA_CALLE = 10;
export const CUESTA_SOLAR = 18;
/** Ni calles ni solares a menos de esto del centro de otra aldea. */
const TERRITORIO = 6;

const cheb = (m: Mundo, i: number, j: number) => Math.max(Math.abs((i % m.ancho) - (j % m.ancho)), Math.abs(Math.floor(i / m.ancho) - Math.floor(j / m.ancho)));
const dist = (m: Mundo, a: { x: number; y: number }, i: number) => Math.hypot((i % m.ancho) - a.x, Math.floor(i / m.ancho) - a.y);

/** Lo que ya hay en el suelo, de todas las aldeas: edificios, obras y tumbas (los campos aparte: se pueden mover). */
export interface Suelo {
  /** Casillas con un edificio (no campo), una obra o tumbas. */
  ocupado: Set<number>;
  /** Casillas con un campo (se puede rehacer más afuera si la ciudad necesita el sitio). */
  campos: Set<number>;
  /** Todas las calles, solares y patios de todos los planos. */
  plano: Set<number>;
  /** Las calles de todos los planos. */
  calles: Set<number>;
}

/** Lo que no ocupa un solar ni estorba a los solares: los muros (son líneas), las torres, la plaza, las calzadas. */
const NO_ESTORBA = new Set(['cerca', 'empalizada', 'muralla', 'torre', 'calzada', 'plaza', 'puente']);

export function suelo(m: Mundo): Suelo {
  const s: Suelo = { ocupado: new Set(), campos: new Set(), plano: new Set(), calles: new Set() };
  for (const a of m.aldeas) {
    for (const e of a.edificios) {
      const i = e.y * m.ancho + e.x;
      if (e.tipo === 'campo') s.campos.add(i);
      else if (!NO_ESTORBA.has(e.tipo)) s.ocupado.add(i);
    }
    if (a.obra && !a.obra.tierra && !NO_ESTORBA.has(a.obra.tipo) && a.obra.tipo !== 'campo') s.ocupado.add(a.obra.y * m.ancho + a.obra.x);
    if (a.cementerio) s.ocupado.add(a.cementerio.y * m.ancho + a.cementerio.x);
    if (a.urbe && a.abandonada === null) {
      for (const c of a.urbe.calles) for (const i of c.casillas) {
        s.plano.add(i);
        s.calles.add(i);
      }
      for (const p of a.urbe.parcelas) s.plano.add(p.i);
      for (const i of a.urbe.patios) s.plano.add(i);
    }
  }
  return s;
}

/** La plaza y su anillo: espacio abierto alrededor del centro (salvo lo que ya estaba allí). */
export function enPlaza(m: Mundo, a: Aldea, i: number): boolean {
  return cheb(m, i, a.y * m.ancho + a.x) <= 1;
}

/** ¿Es tierra de esta aldea (y no de la vecina)? */
function suya(m: Mundo, a: Aldea, i: number): boolean {
  const x = i % m.ancho;
  const y = Math.floor(i / m.ancho);
  const d = Math.hypot(x - a.x, y - a.y);
  if (d > RADIO_URBE) return false;
  for (const b of m.aldeas) {
    if (b === a || b.abandonada !== null) continue;
    const db = Math.hypot(x - b.x, y - b.y);
    if (db < TERRITORIO || db < d) return false;
  }
  return true;
}

/** ¿Puede pasar una calle por aquí? */
function pisableCalle(m: Mundo, a: Aldea, i: number, desde: number, s: Suelo, propias: Set<number>): boolean {
  const t = m.terreno[i];
  if (t === AGUA || t === RIO || t === MONTANA) return false;
  const { masa } = masas(m);
  if (masa[i] !== masa[a.y * m.ancho + a.x]) return false;
  if (s.ocupado.has(i) || propias.has(i)) return false;
  if (s.plano.has(i) && !s.calles.has(i)) return false;
  if (Math.abs(m.relieve[i] - m.relieve[desde]) > CUESTA_CALLE) return false;
  return suya(m, a, i);
}

/**
 * Traza un tramo de calle desde `desde` hacia `dir`, siguiendo el terreno: en cada paso, recto
 * si se puede; si no, un poco a un lado o al otro (por donde menos cuesta). Para en el agua,
 * en la montaña, en otro edificio o al salir de su tierra.
 */
function tramo(m: Mundo, a: Aldea, desde: number, dir: [number, number], largo: number, s: Suelo): { casillas: number[]; dir: [number, number] } {
  const out: number[] = [];
  const propias = new Set<number>();
  let d = dir;
  let i = desde;
  for (let k = 0; k < largo; k++) {
    const x = i % m.ancho;
    const y = Math.floor(i / m.ancho);
    const di = DIRS.findIndex(([dx, dy]) => dx === d[0] && dy === d[1]);
    let mejor = -1;
    let mejorD: [number, number] = d;
    let mejorV = -Infinity;
    for (const giro of [0, -1, 1]) {
      const nd = DIRS[(di + giro + 8) % 8];
      const xx = x + nd[0];
      const yy = y + nd[1];
      if (xx < 1 || yy < 1 || xx >= m.ancho - 1 || yy >= m.alto - 1) continue;
      const j = yy * m.ancho + xx;
      if (!pisableCalle(m, a, j, i, s, propias)) continue;
      // Recto mejor que torcido; y lo más llano.
      const v = (giro === 0 ? 3 : 0) - Math.abs(m.relieve[j] - m.relieve[i]) * 0.2 - (s.campos.has(j) ? 0.5 : 0);
      if (v > mejorV) {
        mejorV = v;
        mejor = j;
        mejorD = nd;
      }
    }
    if (mejor < 0) break;
    out.push(mejor);
    propias.add(mejor);
    i = mejor;
    d = mejorD;
  }
  return { casillas: out, dir: d };
}

/** ¿Vale esta casilla como solar del plano (ahora mismo)? */
function solarValido(m: Mundo, a: Aldea, i: number, s: Suelo, otros: Iterable<number>): boolean {
  const x = i % m.ancho;
  const y = Math.floor(i / m.ancho);
  if (x < 1 || y < 1 || x >= m.ancho - 1 || y >= m.alto - 1) return false;
  const t = m.terreno[i];
  if (t === AGUA || t === RIO || t === MONTANA) return false;
  const { masa } = masas(m);
  if (masa[i] !== masa[a.y * m.ancho + a.x]) return false;
  if (enPlaza(m, a, i) || s.plano.has(i) || s.ocupado.has(i) || !suya(m, a, i)) return false;
  if (desnivel(m, i) > CUESTA_SOLAR) return false;
  // Separado de todo lo construido y de los demás solares: al menos una casilla libre en medio.
  for (const j of otros) if (cheb(m, i, j) < 2) return false;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && s.ocupado.has(i + dy * m.ancho + dx)) return false;
  return true;
}

/** La dirección de una calle en su casilla k (la que lleva a la siguiente, o la de la anterior). */
function rumbo(m: Mundo, c: Calle, k: number, origen: number): [number, number] {
  const a = k > 0 ? c.casillas[k - 1] : origen;
  const b = c.casillas[k];
  return [Math.sign((b % m.ancho) - (a % m.ancho)), Math.sign(Math.floor(b / m.ancho) - Math.floor(a / m.ancho))];
}

/** Dónde empieza una calle: la plaza o la casilla de la calle de la que nace. */
function origenDe(m: Mundo, a: Aldea, u: Urbe, c: Calle): number {
  if (c.padre < 0) return a.y * m.ancho + a.x;
  const p = u.calles.find((x) => x.id === c.padre);
  return p?.casillas[c.nace] ?? a.y * m.ancho + a.x;
}

/** Los solares a los dos lados de las casillas nuevas de una calle (desde la posición `k0`). */
function solaresDe(m: Mundo, a: Aldea, u: Urbe, c: Calle, k0: number, s: Suelo): Parcela[] {
  const out: Parcela[] = [];
  const origen = origenDe(m, a, u, c);
  const otros = u.parcelas.map((p) => p.i);
  for (let k = k0; k < c.casillas.length; k++) {
    // Uno de cada dos (empezando por la segunda casilla) y nunca donde nace un ramal.
    if (k % 2 === 0 || esCruce(k)) continue;
    const i = c.casillas[k];
    if (enPlaza(m, a, i)) continue;
    const [dx, dy] = rumbo(m, c, k, origen);
    for (const [px, py] of [[-dy, dx], [dy, -dx]]) {
      const j = i + py * m.ancho + px;
      if (!solarValido(m, a, j, s, [...otros, ...out.map((p) => p.i)])) continue;
      // Los primeros solares de las calles que salen de la plaza son para lo público.
      const uso = c.padre < 0 && dist(m, a, j) <= 3.6 ? 'publico' : 'comun';
      out.push({ i: j, acceso: i, calle: c.id, uso });
    }
  }
  return out;
}

/** Cuánto le importa a la aldea cada dirección para sacar por ella una calle principal. */
function interesDir(m: Mundo, a: Aldea, d: [number, number]): { valor: number; caminos: number; recursos: number } {
  const cam = caminosDe(m);
  const perfil = a.perfil ?? '';
  let caminos = 0;
  let recursos = 0;
  let pisable = 0;
  for (let r = 2; r <= 12; r++) {
    for (const lado of [-1, 0, 1]) {
      const x = a.x + d[0] * r + (lado * -d[1] * r) / 3;
      const y = a.y + d[1] * r + (lado * d[0] * r) / 3;
      const xx = Math.round(x);
      const yy = Math.round(y);
      if (xx < 0 || yy < 0 || xx >= m.ancho || yy >= m.alto) continue;
      const i = yy * m.ancho + xx;
      const t = m.terreno[i];
      if (t !== AGUA && t !== RIO && t !== MONTANA) pisable++;
      if (cam[i] > 0 && r >= 4) caminos += cam[i];
      if (perfil === 'pescar' && (t === AGUA || t === RIO)) recursos++;
      else if (perfil === 'picar' && (t === COLINA || t === MONTANA)) recursos++;
      else if (perfil === 'lenar' && t === BOSQUE) recursos++;
      else if ((perfil === 'cultivar' || perfil === 'pastorear' || perfil === 'recolectar' || perfil === 'cazar' || !perfil) && (t === PRADERA || t === ESTEPA)) recursos += 0.5;
    }
  }
  // Hacia otras aldeas cercanas también se abre camino.
  for (const b of m.aldeas) {
    if (b === a || b.abandonada !== null) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy);
    if (l > 40 || l < 1) continue;
    const coseno = (dx * d[0] + dy * d[1]) / (l * Math.hypot(d[0], d[1]));
    if (coseno > 0.8) caminos += 3;
  }
  return { valor: pisable + caminos * 0.6 + recursos * 0.8, caminos, recursos };
}

/**
 * Traza el plano de una aldea que aún no lo tiene: dos calles que salen de la plaza (la que
 * lleva a los caminos y la que lleva a los recursos), con sus primeros solares. Lo que ya
 * estaba construido se queda donde está (el casco viejo); las calles lo rodean.
 */
export function trazarPlano(m: Mundo, a: Aldea, s: Suelo = suelo(m)): Urbe {
  const u: Urbe = { calles: [], parcelas: [], patios: [], barrios: [], sigCalle: 1 };
  a.urbe = u;
  const centro = a.y * m.ancho + a.x;
  const valores = DIRS.map((d) => ({ d, ...interesDir(m, a, d) }));
  const principal = [...valores].sort((x, y) => y.caminos - x.caminos || y.valor - x.valor)[0];
  const usadas: [number, number][] = [];
  for (const uso of ['principal', 'oficios'] as const) {
    const cand = uso === 'principal' ? [principal] : [...valores].sort((x, y) => y.recursos * 2 + y.valor - (x.recursos * 2 + x.valor));
    for (const v of cand) {
      // Las calles principales salen en direcciones bien distintas (al menos en ángulo recto).
      if (usadas.some((d) => d[0] * v.d[0] + d[1] * v.d[1] > 0)) continue;
      if (abrirCalle(m, a, u, -1, centro, v.d, LARGO_EJE, uso, s)) {
        usadas.push(v.d);
        break;
      }
    }
  }
  return u;
}

/** Abre una calle nueva (si cabe algo en ella) y reserva sus solares. */
function abrirCalle(m: Mundo, a: Aldea, u: Urbe, padre: number, desde: number, dir: [number, number], largo: number, uso: Calle['uso'], s: Suelo, nace = -1): Calle | null {
  if (u.calles.length >= MAX_CALLES) return null;
  const t = tramo(m, a, desde, dir, largo, s);
  if (t.casillas.length < 2) return null;
  const c: Calle = { id: u.sigCalle, uso, padre, nace: Math.max(0, nace), casillas: t.casillas, ramas: [] };
  const sol = solaresDe(m, a, u, c, 0, s);
  if (!sol.length) return null;
  u.sigCalle++;
  u.calles.push(c);
  u.parcelas.push(...sol);
  for (const i of t.casillas) {
    s.plano.add(i);
    s.calles.add(i);
  }
  for (const p of sol) s.plano.add(p.i);
  return c;
}

/** Alarga una calle por su final (si se puede). */
function alargar(m: Mundo, a: Aldea, u: Urbe, c: Calle, s: Suelo): number {
  if (c.cerrada) return 0;
  const origen = origenDe(m, a, u, c);
  const k = c.casillas.length - 1;
  const d = rumbo(m, c, k, origen);
  const t = tramo(m, a, c.casillas[k], d, LARGO_TRAMO, s);
  if (t.casillas.length < 2) {
    c.cerrada = true;
    return 0;
  }
  const k0 = c.casillas.length;
  c.casillas.push(...t.casillas);
  const sol = solaresDe(m, a, u, c, k0, s);
  if (!sol.length) {
    c.casillas.length = k0;
    c.cerrada = true;
    return 0;
  }
  u.parcelas.push(...sol);
  for (const i of t.casillas) {
    s.plano.add(i);
    s.calles.add(i);
  }
  for (const p of sol) s.plano.add(p.i);
  return sol.length;
}

/** Abre ramales a los dos lados en la casilla k de una calle (donde tocan). */
function ramificar(m: Mundo, a: Aldea, u: Urbe, c: Calle, k: number, s: Suelo): number {
  if (c.ramas.includes(k)) return 0;
  c.ramas.push(k);
  const origen = origenDe(m, a, u, c);
  const [dx, dy] = rumbo(m, c, k, origen);
  let n = 0;
  for (const d of [[-dy, dx], [dy, -dx]] as [number, number][]) {
    const r = abrirCalle(m, a, u, c.id, c.casillas[k], d, LARGO_RAMAL, c.uso === 'oficios' ? 'oficios' : 'viviendas', s, k);
    if (r) n += u.parcelas.filter((p) => p.calle === r.id).length;
  }
  return n;
}

/**
 * Cuando no queda un buen solar: la aldea crece. Prueba (sin tocar nada) los ramales que
 * podría abrir y las calles que podría alargar, y se queda con lo que da más solares cerca
 * del centro (las aldeas amenazadas, aún más cerca: crecen apretadas, dentro de sus muros).
 * Si todo está lleno, abre otra calle principal desde la plaza.
 */
export function crecer(m: Mundo, a: Aldea, s: Suelo = suelo(m), uso?: string): boolean {
  const u = a.urbe ?? trazarPlano(m, a, s);
  const defensiva = !!a.consejo?.guerra || a.amenaza > 0.3 || a.consejo?.prioridad === 'defensa';
  const pesoLejos = defensiva ? 0.9 : 0.45;
  type Opcion = { valor: number; hacer: () => number };
  const opciones: Opcion[] = [];
  for (const c of u.calles) {
    // Ramales donde tocan (cada 6 casillas), si aún no los hay.
    for (let k = CADA_RAMAL - 1; k < c.casillas.length - 1; k += CADA_RAMAL) {
      if (c.ramas.includes(k)) continue;
      const i = c.casillas[k];
      const d = dist(m, a, i);
      const afin = uso === 'afueras' ? d * 0.4 : uso === 'oficio' && c.uso === 'oficios' ? 2 : 0;
      opciones.push({ valor: 10 - d * pesoLejos + afin + (c.padre < 0 ? 1 : 0), hacer: () => ramificar(m, a, u, c, k, s) });
    }
    if (!c.cerrada) {
      const d = dist(m, a, c.casillas[c.casillas.length - 1]);
      const afin = uso === 'afueras' ? d * 0.4 : uso === 'oficio' && c.uso === 'oficios' ? 2 : 0;
      opciones.push({ valor: 9 - d * pesoLejos + afin + (c.padre < 0 ? 0.5 : 0), hacer: () => alargar(m, a, u, c, s) });
    }
  }
  opciones.sort((x, y) => y.valor - x.valor);
  for (const o of opciones) if (o.hacer() > 0) return true;
  // Otra calle desde la plaza, en una dirección libre.
  const centro = a.y * m.ancho + a.x;
  const ejes = u.calles.filter((c) => c.padre < 0).map((c) => rumbo(m, c, 0, centro));
  const libres = DIRS.map((d) => ({ d, ...interesDir(m, a, d) }))
    .filter((v) => ejes.every((d) => d[0] * v.d[0] + d[1] * v.d[1] <= 0 || (d[0] !== v.d[0] && d[1] !== v.d[1] && Math.abs(d[0] - v.d[0]) + Math.abs(d[1] - v.d[1]) >= 2)))
    .sort((x, y) => y.valor - x.valor);
  for (const v of libres) if (abrirCalle(m, a, u, -1, centro, v.d, LARGO_EJE, 'viviendas', s)) return true;
  return false;
}

/** ¿Está libre ahora este solar? (sin nada encima, ni en la línea de un muro). */
export function solarLibre(m: Mundo, a: Aldea, p: Parcela, s: Suelo, lineasMuro: number[]): boolean {
  if (s.ocupado.has(p.i)) return false;
  const d = dist(m, a, p.i);
  if (lineasMuro.some((r) => Math.abs(d - r) < 0.75)) return false;
  // Si alguien construyó pegado después (una torre, otra aldea), ya no vale.
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && s.ocupado.has(p.i + dy * m.ancho + dx)) return false;
  return true;
}

/** Lo que hay construido en cada casilla de la aldea (para puntuar los vecinos de un solar). */
function vecinos(m: Mundo, a: Aldea, i: number, radio: number, tipos: Set<string>): number {
  let n = 0;
  for (const e of a.edificios) if (tipos.has(e.tipo) && Math.hypot(e.x - (i % m.ancho), e.y - Math.floor(i / m.ancho)) <= radio) n++;
  return n;
}

const VIVIENDAS = new Set(['choza', 'casa', 'casapiedra', 'casatejas']);
const OFICIOS = new Set(['taller', 'horno', 'almacen']);
const GANADO = new Set(['corral', 'gallinero', 'granja', 'establo']);

/** Lo que vale un solar para un tipo de edificio (0: no le sirve). */
function valorSolar(m: Mundo, a: Aldea, u: Urbe, p: Parcela, tipo: string): number {
  const uso = USO_URBANO[tipo];
  const d = dist(m, a, p.i);
  const c = u.calles.find((x) => x.id === p.calle);
  // Un edificio grande prefiere un solar ya allanado.
  if (GRANDES.has(tipo) && labrada(m, p.i) === 'explanada') return 30 - d;
  if (uso === 'publico') return p.uso === 'publico' ? 20 - d : 6 - d * 0.5;
  if (p.uso === 'publico') return 0;
  if (uso === 'vivienda') return Math.max(0.1, 14 - d * 0.7 + vecinos(m, a, p.i, 3, VIVIENDAS) * 0.4 - vecinos(m, a, p.i, 2.5, GANADO) * 2 - (c?.uso === 'oficios' ? 2 : 0));
  if (uso === 'oficio') {
    const junto = vecinos(m, a, p.i, 3.5, OFICIOS) * (tipo === 'almacen' ? 2 : 1);
    return Math.max(0.1, 10 - Math.abs(d - 5) * 0.5 + (c?.uso === 'oficios' ? 4 : 0) + junto);
  }
  if (uso === 'afueras') return Math.max(0.1, 4 + d * 0.6 + (c?.uso === 'oficios' ? 1 : 0) - vecinos(m, a, p.i, 2.5, VIVIENDAS) * 1.5);
  return 0;
}

/**
 * El solar para un edificio de este tipo: el mejor de los libres. Si no queda ninguno que le
 * sirva, la aldea crece y lo vuelve a intentar; y si con este quedan muy pocos, crece ya
 * (deja solares reservados para lo que venga). null si no hay manera.
 */
export function solarPara(m: Mundo, a: Aldea, tipo: string, lineasMuro: number[]): Parcela | null {
  if (!USO_URBANO[tipo]) return null;
  const s = suelo(m);
  const u = a.urbe ?? trazarPlano(m, a, s);
  for (let intento = 0; intento < 3; intento++) {
    let mejor: Parcela | null = null;
    let mejorV = 0;
    for (const p of u.parcelas) {
      if (!solarLibre(m, a, p, s, lineasMuro)) continue;
      const v = valorSolar(m, a, u, p, tipo);
      if (v > mejorV) {
        mejorV = v;
        mejor = p;
      }
    }
    if (mejor) {
      if (libres(m, a, u, s, lineasMuro) <= 3) crecer(m, a, s, USO_URBANO[tipo]);
      return mejor;
    }
    if (!crecer(m, a, s, USO_URBANO[tipo])) return null;
  }
  return null;
}

/** Cuántos solares libres (no públicos) quedan. */
export function libres(m: Mundo, a: Aldea, u: Urbe, s: Suelo, lineasMuro: number[]): number {
  return u.parcelas.filter((p) => p.uso !== 'publico' && solarLibre(m, a, p, s, lineasMuro)).length;
}

/** La calle por la que se entra a un solar: la casilla vecina, como [dx, dy]. */
export function frenteDe(m: Mundo, p: Parcela): [number, number] {
  return [Math.sign((p.acceso % m.ancho) - (p.i % m.ancho)), Math.sign(Math.floor(p.acceso / m.ancho) - Math.floor(p.i / m.ancho))];
}

/**
 * Las casillas de calle que se usan: las que llevan desde la plaza hasta cada solar ocupado
 * (siguiendo la calle hasta su acceso y, de calle en calle, hasta la plaza).
 */
export function callesEnUso(m: Mundo, a: Aldea): Set<number> {
  const u = a.urbe;
  const out = new Set<number>();
  if (!u) return out;
  const ocupados = new Set(a.edificios.map((e) => e.y * m.ancho + e.x));
  if (a.obra) ocupados.add(a.obra.y * m.ancho + a.obra.x);
  const porId = new Map(u.calles.map((c) => [c.id, c]));
  const marcar = (c: Calle | undefined, hasta: number, vistas: number) => {
    if (!c || vistas > 40) return;
    for (let k = 0; k <= Math.min(hasta, c.casillas.length - 1); k++) out.add(c.casillas[k]);
    if (c.padre >= 0) marcar(porId.get(c.padre), c.nace, vistas + 1);
  };
  for (const p of u.parcelas) {
    if (!ocupados.has(p.i)) continue;
    const c = porId.get(p.calle);
    if (!c) continue;
    marcar(c, c.casillas.indexOf(p.acceso), 0);
  }
  return out;
}

/**
 * Cada mes: la gente pasa por las calles que usa (se pisan y, con el tiempo, quedan como
 * senderos en el mapa; con la técnica de los caminos se mejoran como los demás). Un campo que
 * se quedó en medio de una calle se deja (se volverá a sembrar más afuera).
 */
export function pisarCalles(m: Mundo, gente: (id: number) => number): void {
  const tr = transitoDe(m);
  for (const a of m.aldeas) {
    if (a.abandonada !== null || !a.urbe) continue;
    const usadas = callesEnUso(m, a);
    if (!usadas.size) continue;
    const paso = 40 + Math.min(60, gente(a.id));
    for (const i of usadas) tr[i] += paso;
    a.edificios = a.edificios.filter((e) => e.tipo !== 'campo' || !usadas.has(e.y * m.ancho + e.x));
  }
}

/** La clave del barrio de un solar: su calle principal y a qué distancia del centro queda. */
function barrioDe(m: Mundo, a: Aldea, u: Urbe, p: Parcela): string {
  let c = u.calles.find((x) => x.id === p.calle);
  for (let k = 0; c && c.padre >= 0 && k < 40; k++) c = u.calles.find((x) => x.id === c!.padre);
  return `${c?.id ?? 0}-${Math.floor(dist(m, a, p.i) / 6)}`;
}

/**
 * Al empezar una obra en un solar: si había un campo, se levanta; si es el primer edificio
 * de un barrio nuevo (lejos del centro), la crónica lo cuenta.
 */
export function ocuparSolar(m: Mundo, a: Aldea, p: Parcela): void {
  a.edificios = a.edificios.filter((e) => e.tipo !== 'campo' || e.y * m.ancho + e.x !== p.i);
  const u = a.urbe;
  if (!u) return;
  const clave = barrioDe(m, a, u, p);
  if (u.barrios.some((b) => b.clave === clave)) return;
  u.barrios.push({ clave, desde: m.t });
  const anillo = Number(clave.split('-')[1]);
  if (anillo >= 1 && u.barrios.length >= 2) {
    const x = p.i % m.ancho;
    const y = Math.floor(p.i / m.ancho);
    anotar(m, 'edificio', `${a.nombre} crece: empieza un barrio nuevo hacia ${direccion(a, x, y)}, con sus calles y sus solares.`, a.id);
  }
}

/** Para las pruebas y la web: el plano en números. */
export function resumenPlano(m: Mundo, a: Aldea): { calles: number; casillas: number; solares: number; ocupados: number; barrios: number } {
  const u = a.urbe;
  if (!u) return { calles: 0, casillas: 0, solares: 0, ocupados: 0, barrios: 0 };
  const ocupados = new Set(a.edificios.map((e) => e.y * m.ancho + e.x));
  return {
    calles: u.calles.length,
    casillas: u.calles.reduce((s, c) => s + c.casillas.length, 0),
    solares: u.parcelas.length,
    ocupados: u.parcelas.filter((p) => ocupados.has(p.i)).length,
    barrios: u.barrios.length,
  };
}

/**
 * Lo que tiene que cumplir el plano de una aldea (y lo construido en él): cada solar junto a
 * su calle y fuera de ella, separado de los demás; las calles continuas desde la plaza; y lo
 * que da a una calle, con la entrada libre y sin nada encima. Devuelve lo que falla.
 */
export function comprobarPlano(m: Mundo, a: Aldea): string[] {
  const out: string[] = [];
  const u = a.urbe;
  const n = m.ancho * m.alto;
  const dentro = (i: number) => Number.isInteger(i) && i >= 0 && i < n;
  if (u) {
    const calles = new Set<number>();
    const porId = new Map(u.calles.map((c) => [c.id, c]));
    for (const c of u.calles) {
      if (!c.casillas.every(dentro)) {
        out.push(`${a.nombre}: calle ${c.id} fuera del mapa`);
        continue;
      }
      const origen = origenDe(m, a, u, c);
      if (c.padre >= 0 && !porId.has(c.padre)) out.push(`${a.nombre}: calle ${c.id} nace de una calle que no existe`);
      if (cheb(m, origen, c.casillas[0]) !== 1) out.push(`${a.nombre}: calle ${c.id} no empieza junto a donde nace`);
      for (let k = 1; k < c.casillas.length; k++) if (cheb(m, c.casillas[k - 1], c.casillas[k]) !== 1) out.push(`${a.nombre}: calle ${c.id} cortada en ${k}`);
      for (const i of c.casillas) calles.add(i);
    }
    const lotes = u.parcelas;
    for (let x = 0; x < lotes.length; x++) {
      const p = lotes[x];
      if (!dentro(p.i) || !dentro(p.acceso)) {
        out.push(`${a.nombre}: solar fuera del mapa`);
        continue;
      }
      if (calles.has(p.i)) out.push(`${a.nombre}: solar ${p.i} encima de una calle`);
      if (cheb(m, p.i, p.acceso) !== 1 || !porId.get(p.calle)?.casillas.includes(p.acceso)) out.push(`${a.nombre}: solar ${p.i} sin entrada desde su calle`);
      for (let y = x + 1; y < lotes.length; y++) if (cheb(m, p.i, lotes[y].i) < 2) out.push(`${a.nombre}: solares ${p.i} y ${lotes[y].i} pegados`);
    }
  }
  // Lo construido en un solar: nada más en su casilla ni en su entrada.
  const encima = new Map<number, number>();
  for (const b of m.aldeas) for (const e of b.edificios) if (e.tipo !== 'campo' && !NO_ESTORBA.has(e.tipo)) encima.set(e.y * m.ancho + e.x, (encima.get(e.y * m.ancho + e.x) ?? 0) + 1);
  for (const e of a.edificios) {
    if (!e.frente) continue;
    const [dx, dy] = e.frente;
    if (![dx, dy].every((v) => Number.isInteger(v) && Math.abs(v) <= 1) || (dx === 0 && dy === 0)) {
      out.push(`${a.nombre}: ${e.tipo} mira a ninguna parte`);
      continue;
    }
    const i = e.y * m.ancho + e.x;
    if ((encima.get(i) ?? 0) > 1) out.push(`${a.nombre}: ${e.tipo} en (${e.x},${e.y}) comparte casilla`);
    if (encima.has(i + dy * m.ancho + dx)) out.push(`${a.nombre}: ${e.tipo} en (${e.x},${e.y}) con la entrada tapada`);
  }
  return out;
}

/**
 * Los tramos de calle en uso, como pares de casillas vecinas [desde, hasta] (de la plaza
 * hacia fuera): para dibujar cada calle como una banda continua.
 */
export function tramosEnUso(m: Mundo, a: Aldea): [number, number][] {
  const u = a.urbe;
  if (!u) return [];
  const uso = callesEnUso(m, a);
  const out: [number, number][] = [];
  for (const c of u.calles) {
    let prev = origenDe(m, a, u, c);
    for (const i of c.casillas) {
      if (!uso.has(i)) break;
      out.push([prev, i]);
      prev = i;
    }
  }
  return out;
}

/** Los solares reservados que siguen libres (la web los deja despejados, como solares). */
export function solaresLibres(m: Mundo, a: Aldea): number[] {
  if (!a.urbe) return [];
  const hay = new Set(a.edificios.map((e) => e.y * m.ancho + e.x));
  if (a.obra) hay.add(a.obra.y * m.ancho + a.obra.x);
  return a.urbe.parcelas.filter((p) => !hay.has(p.i)).map((p) => p.i);
}
