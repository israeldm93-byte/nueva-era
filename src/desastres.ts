// Desastres: incendios forestales en los veranos secos y crecidas de los ríos en
// las primaveras lluviosas. Arrasan bosques, campos y casas; la gente intenta
// apagar el fuego o se aparta del agua. Las cenizas y el limo dejan la tierra fértil.

import { azar, entero, prob } from './azar.ts';
import { DIAS_ESTACION } from './config.ts';
import { AGUA, BOSQUE, COLINA, ESTEPA, MONTANA, PRADERA, RIO } from './catalogo.ts';
import { anotar } from './cronica.ts';
import { tiene } from './economia.ts';
import { aviso } from './fauna.ts';
import { direccion } from './mapa.ts';
import { distancia } from './matematicas.ts';
import { aldeasVivas, edad, type Indices } from './mundo.ts';
import { danar, morir } from './sociedad.ts';
import type { Aldea, Mundo } from './tipos.ts';

const r2 = (x: number) => Math.round(x * 100) / 100;
const VECINOS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const MAX_FUEGO = 160;

export function desastres(m: Mundo, ix: Indices, est: number, dia: number): void {
  incendios(m, ix, est);
  crecidas(m, ix, est, dia);
  if (m.t % 30 === 0 && m.cenizas.length) m.cenizas = m.cenizas.filter(([, t]) => m.t - t < 2 * 120);
}

/** Lo fácil que prende cada casilla. */
function inflamable(m: Mundo, i: number, est: number, seco: boolean): number {
  const t = m.terreno[i];
  const madera = m.recursos.madera[i];
  let p = 0;
  if (t === BOSQUE && madera > 6) p = 0.3;
  else if (t === COLINA && madera > 6) p = 0.15;
  else if (t === ESTEPA && est === 1) p = 0.26;
  else if (t === PRADERA && est === 1 && seco) p = 0.1;
  return p * (seco ? 1.4 : 0.75) * (est === 1 ? 1 : 0.4);
}

function arde(m: Mundo, i: number): boolean {
  return m.incendios.some(([j]) => j === i);
}

function prender(m: Mundo, i: number): void {
  if (m.incendios.length < MAX_FUEGO && !arde(m, i)) m.incendios.push([i, 2 + entero(2)]);
}

function incendios(m: Mundo, ix: Indices, est: number): void {
  const seco = m.clima < 0.85;
  // Un rayo en verano (o un descuido junto a una hoguera en un año seco).
  const rayo = (est === 1 ? 0.012 : est === 2 ? 0.003 : 0) * (seco ? 3 : 0.5);
  if (prob(rayo)) {
    for (let intento = 0; intento < 40; intento++) {
      const i = entero(m.terreno.length);
      if (inflamable(m, i, est, seco) > 0.1) {
        prender(m, i);
        break;
      }
    }
  }
  if (est === 1 && seco) {
    for (const a of aldeasVivas(m)) {
      if (!tiene(a, 'hoguera') || !prob(0.0006)) continue;
      const i = (a.y + entero(5) - 2) * m.ancho + a.x + entero(5) - 2;
      if (i >= 0 && i < m.terreno.length && inflamable(m, i, est, seco) > 0) prender(m, i);
    }
  }
  if (!m.incendios.length) return;
  // En invierno y con las lluvias de primavera el fuego se apaga solo.
  if (est === 3 || est === 0) {
    terminar(m);
    return;
  }
  const vivas = aldeasVivas(m);
  const nuevos: [number, number][] = [];
  for (const par of m.incendios) {
    const [i] = par;
    const R = m.recursos;
    R.madera[i] = r2(R.madera[i] * 0.45);
    R.bayas[i] = 0;
    R.fibra[i] = r2(R.fibra[i] * 0.4);
    R.caza[i] = r2(R.caza[i] * 0.5);
    R.semillas[i] = r2(R.semillas[i] * 0.5);
    const x = i % m.ancho;
    const y = (i - x) / m.ancho;
    for (const [dx, dy] of VECINOS) {
      const xx = x + dx;
      const yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= m.ancho || yy >= m.alto) continue;
      const j = yy * m.ancho + xx;
      if (arde(m, j) || nuevos.some(([k]) => k === j)) continue;
      if (m.incendios.length + nuevos.length >= MAX_FUEGO) continue;
      if (prob(inflamable(m, j, est, seco))) nuevos.push([j, 2 + entero(2)]);
    }
    par[1]--;
  }
  const apagadas = m.incendios.filter(([, d]) => d <= 0);
  for (const [i] of apagadas) m.cenizas.push([i, m.t]);
  m.incendios = m.incendios.filter(([, d]) => d > 0).concat(nuevos);
  if (m.incendios.length >= 10 && aviso(m, 'incendio', 60)) {
    const a = masCercana(vivas, m.incendios[0][0] % m.ancho, Math.floor(m.incendios[0][0] / m.ancho));
    const donde = a ? ` hacia ${direccion(a, m.incendios[0][0] % m.ancho, Math.floor(m.incendios[0][0] / m.ancho))} de ${a.nombre}` : '';
    anotar(m, 'incendio', `Un gran incendio arde en los bosques${donde}. El humo se ve desde muy lejos.`, a?.id);
  }
  amenazarAldeas(m, ix, vivas);
}

function terminar(m: Mundo): void {
  for (const [i] of m.incendios) m.cenizas.push([i, m.t]);
  m.incendios = [];
}

function masCercana(vivas: Aldea[], x: number, y: number): Aldea | null {
  let mejor: Aldea | null = null;
  let dmin = 30;
  for (const a of vivas) {
    const d = distancia(a.x - x, a.y - y);
    if (d < dmin) {
      dmin = d;
      mejor = a;
    }
  }
  return mejor;
}

/** El fuego que llega a una aldea: la gente intenta apagarlo; si no, arden casas y campos. */
function amenazarAldeas(m: Mundo, ix: Indices, vivas: Aldea[]): void {
  for (const a of vivas) {
    const gente = (ix.porAldea.get(a.id) ?? []).filter((p) => !p.muerto);
    const cerca = m.incendios.filter(([i]) => distancia((i % m.ancho) - a.x, Math.floor(i / m.ancho) - a.y) <= 4);
    if (!cerca.length) continue;
    a.amenaza = r2(Math.min(1, a.amenaza + 0.03));
    let arrasados = 0;
    for (const par of cerca) {
      const [i] = par;
      const x = i % m.ancho;
      const y = (i - x) / m.ancho;
      const tocados = a.edificios.filter((e) => Math.abs(e.x - x) <= 1 && Math.abs(e.y - y) <= 1 && e.tipo !== 'hoguera');
      if (!tocados.length) continue;
      // Entre todos intentan apagarlo.
      const brazos = gente.filter((p) => edad(m, p) >= 12).length;
      if (prob(Math.min(0.75, brazos * 0.05))) {
        par[1] = 0;
        continue;
      }
      for (const e of tocados) {
        if (!prob(0.3)) continue;
        if (e.tipo === 'campo') {
          e.fase = 0;
          e.trabajo = 0;
          e.cuidado = 0;
        } else {
          a.edificios.splice(a.edificios.indexOf(e), 1);
          m.ruinas.push({ tipo: e.tipo, x: e.x, y: e.y });
          arrasados++;
        }
      }
    }
    for (const p of gente) {
      if (cerca.some(([i]) => i === p.y * m.ancho + p.x) && prob(0.25)) danar(p, 0.25 + 0.2 * azar(), 'fuego');
    }
    if (arrasados && aviso(m, `fuego-${a.id}`, 30)) {
      anotar(m, 'incendio', `El fuego llega a ${a.nombre} y arrasa ${arrasados === 1 ? 'una de sus casas' : `${arrasados} de sus casas`}.`, a.id);
    } else if (!arrasados && aviso(m, `apagan-${a.id}`, 60)) {
      anotar(m, 'incendio', `El incendio llega hasta ${a.nombre}; entre todos logran que no prenda en las casas.`, a.id);
    }
  }
  m.incendios = m.incendios.filter(([, d]) => d > 0);
}

/** En las primaveras muy lluviosas los ríos se desbordan. */
function crecidas(m: Mundo, ix: Indices, est: number, dia: number): void {
  if (m.inundadas.length) {
    for (const par of m.inundadas) par[1]--;
    for (const [i, d] of m.inundadas) {
      if (d > 0) continue;
      // El agua se retira y deja limo fértil.
      m.recursos.semillas[i] = r2(m.recursos.semillas[i] + 2);
      m.recursos.arcilla[i] = r2(m.recursos.arcilla[i] + 5);
    }
    m.inundadas = m.inundadas.filter(([, d]) => d > 0);
  }
  const enEstacion = dia % DIAS_ESTACION;
  if (est !== 0 || enEstacion < 5 || enEstacion > 25 || m.clima <= 1.05) return;
  if (!prob(0.25 * (m.clima - 1.05))) return;
  // ¿Dónde? Junto a un río; si hay aldeas cerca, se nota.
  const rios: number[] = [];
  for (let i = 0; i < m.terreno.length; i++) if (m.terreno[i] === RIO) rios.push(i);
  if (!rios.length) return;
  const centro = rios[entero(rios.length)];
  const cx = centro % m.ancho;
  const cy = (centro - cx) / m.ancho;
  const anegar = new Set<number>();
  for (let dy = -6; dy <= 6; dy++) {
    for (let dx = -6; dx <= 6; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || y < 0 || x >= m.ancho || y >= m.alto) continue;
      if (m.terreno[y * m.ancho + x] !== RIO || distancia(dx, dy) > 6) continue;
      for (let ey = -2; ey <= 2; ey++) {
        for (let ex = -2; ex <= 2; ex++) {
          const xx = x + ex;
          const yy = y + ey;
          if (xx < 0 || yy < 0 || xx >= m.ancho || yy >= m.alto || Math.abs(ex) + Math.abs(ey) > 2) continue;
          const j = yy * m.ancho + xx;
          const t = m.terreno[j];
          if (t === AGUA || t === RIO || t === COLINA || t === MONTANA) continue;
          // Solo lo bajo se anega.
          if (m.relieve[j] > m.relieve[y * m.ancho + x] + 8) continue;
          anegar.add(j);
        }
      }
    }
  }
  if (!anegar.size) return;
  for (const j of anegar) if (!m.inundadas.some(([k]) => k === j)) m.inundadas.push([j, 4 + entero(5)]);
  const vivas = aldeasVivas(m);
  for (const a of vivas) {
    let campos = 0;
    let casas = 0;
    for (const e of a.edificios.slice()) {
      if (!anegar.has(e.y * m.ancho + e.x)) continue;
      if (e.tipo === 'campo') {
        if (e.fase === 1 || (e.trabajo ?? 0) > 0) campos++;
        e.fase = 0;
        e.trabajo = 0;
        e.cuidado = 0;
      } else if ((e.tipo === 'choza' || e.tipo === 'casa' || e.tipo === 'almacen') && prob(0.25)) {
        a.edificios.splice(a.edificios.indexOf(e), 1);
        m.ruinas.push({ tipo: e.tipo, x: e.x, y: e.y });
        casas++;
      }
    }
    for (const p of ix.porAldea.get(a.id) ?? []) {
      if (!anegar.has(p.y * m.ancho + p.x)) continue;
      const e = edad(m, p);
      if (prob(e < 8 || e > 65 ? 0.04 : 0.01)) morir(p, 'ahogado');
    }
    const cerca = distancia(cx - a.x, cy - a.y) <= 8;
    if ((campos || casas || cerca) && aviso(m, `crecida-${a.id}`, 100)) {
      const danos = [campos ? `${campos === 1 ? 'un campo' : `${campos} campos`}` : '', casas ? `${casas === 1 ? 'una casa' : `${casas} casas`}` : '']
        .filter(Boolean)
        .join(' y ');
      anotar(m, 'inundacion', `El río se desborda junto a ${a.nombre}${danos ? `: el agua se lleva ${danos}` : ': el agua anega las orillas'}.`, a.id);
      a.amenaza = r2(Math.min(1, a.amenaza + 0.05));
    }
  }
}
