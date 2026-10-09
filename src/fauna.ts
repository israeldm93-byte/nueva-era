// Fieras: manadas de lobos y osos que viven en el mapa. Cazan, rondan las aldeas
// cuando tienen hambre y pueden atacar a quien trabaja lejos o entrar de noche.
// El fuego, las empalizadas, los vigías y las lanzas los ahuyentan o los abaten.
// Nada está escrito: depende del hambre, del invierno y de lo que hagan los aldeanos.

import { azar, elegirPeso, entero, prob } from './azar.ts';
import { DIAS_ANIO } from './config.ts';
import { AGUA, BOSQUE, COLINA, ESTEPA, MONTANA, RIO } from './catalogo.ts';
import { anios, anotar } from './cronica.ts';
import { guardar, tiene } from './economia.ts';
import { masas } from './mapa.ts';
import { distancia } from './matematicas.ts';
import { aldeasVivas, edad, type Indices } from './mundo.ts';
import { danar, morir } from './sociedad.ts';
import type { Aldea, Fiera, Mundo, Persona } from './tipos.ts';

const r2 = (x: number) => Math.round(x * 100) / 100;

/** ¿Hace falta contarlo? Evita repetir la misma noticia en la crónica. */
export function aviso(m: Mundo, clave: string, dias: number): boolean {
  const antes = m.avisos[clave];
  if (antes !== undefined && m.t - antes < dias) return false;
  m.avisos[clave] = m.t;
  return true;
}

/** Tierras grandes (sin contar islas pequeñas, donde no hay fieras). */
function tierrasGrandes(m: Mundo): Set<number> {
  const { masa } = masas(m);
  const tamano = new Map<number, number>();
  for (const k of masa) if (k >= 0) tamano.set(k, (tamano.get(k) ?? 0) + 1);
  const grandes = new Set<number>();
  for (const [k, v] of tamano) if (v >= 300) grandes.add(k);
  return grandes;
}

function guaridaLibre(m: Mundo, tipos: number[], lejos: number): number {
  const { masa } = masas(m);
  const grandes = tierrasGrandes(m);
  const vivas = aldeasVivas(m);
  for (let intento = 0; intento < 600; intento++) {
    const i = entero(m.terreno.length);
    if (!tipos.includes(m.terreno[i]) || !grandes.has(masa[i])) continue;
    const x = i % m.ancho;
    const y = (i - x) / m.ancho;
    if (vivas.some((a) => distancia(a.x - x, a.y - y) < lejos)) continue;
    if (m.fauna.some((f) => distancia((f.guarida % m.ancho) - x, Math.floor(f.guarida / m.ancho) - y) < 10)) continue;
    return i;
  }
  return -1;
}

function nuevaFiera(m: Mundo, tipo: Fiera['tipo'], guarida: number, n: number): Fiera {
  const x = guarida % m.ancho;
  const y = (guarida - x) / m.ancho;
  const f: Fiera = { id: m.sigId++, tipo, x, y, px: x, py: y, guarida, n, hambre: 0.3, estado: 'ronda', espera: 0 };
  m.fauna.push(f);
  return f;
}

/** Cuántas fieras caben en el mundo: según los bosques de las tierras grandes. */
function cupo(m: Mundo): { manadas: number; osos: number } {
  const { masa } = masas(m);
  const grandes = tierrasGrandes(m);
  let bosque = 0;
  for (let i = 0; i < m.terreno.length; i++) if (m.terreno[i] === BOSQUE && grandes.has(masa[i])) bosque++;
  return { manadas: Math.max(2, Math.round(bosque / 900)), osos: Math.max(2, Math.round(bosque / 1000)) };
}

/** Las fieras con que empieza un mundo. */
export function poblarFauna(m: Mundo): void {
  m.fauna = [];
  const { manadas, osos } = cupo(m);
  for (let k = 0; k < manadas; k++) {
    const g = guaridaLibre(m, [BOSQUE, COLINA, ESTEPA], 16);
    if (g >= 0) nuevaFiera(m, 'lobos', g, 3 + entero(4));
  }
  for (let k = 0; k < osos; k++) {
    const g = guaridaLibre(m, [BOSQUE, MONTANA, COLINA], 10);
    if (g >= 0) nuevaFiera(m, 'oso', g, 1);
  }
}

/** Un paso hacia un destino por casillas de la misma tierra (los ríos se vadean). */
function mover(m: Mundo, f: Fiera, hx: number, hy: number, pasos: number): void {
  const { masa } = masas(m);
  const k = masa[f.y * m.ancho + f.x];
  for (let s = 0; s < pasos; s++) {
    let mejor = -1;
    let dmin = distancia(hx - f.x, hy - f.y);
    if (dmin < 0.5) return;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const x = f.x + dx;
      const y = f.y + dy;
      if (x < 0 || y < 0 || x >= m.ancho || y >= m.alto) continue;
      const i = y * m.ancho + x;
      if (m.terreno[i] === AGUA || masa[i] !== k) continue;
      // Un poco de azar para que no vayan en línea recta.
      const d = distancia(hx - x, hy - y) + 0.6 * azar();
      if (d < dmin) {
        dmin = d;
        mejor = i;
      }
    }
    if (mejor < 0) return;
    f.x = mejor % m.ancho;
    f.y = (mejor - f.x) / m.ancho;
  }
}

/** La mejor casilla cercana según lo que buscan (presas para los lobos, bayas para los osos). */
function buscar(m: Mundo, f: Fiera, radio: number, valor: (i: number) => number): [number, number] {
  const gx = f.guarida % m.ancho;
  const gy = (f.guarida - gx) / m.ancho;
  let bx = gx;
  let by = gy;
  let max = -1;
  for (let k = 0; k < 10; k++) {
    const x = f.x + entero(2 * radio + 1) - radio;
    const y = f.y + entero(2 * radio + 1) - radio;
    if (x < 0 || y < 0 || x >= m.ancho || y >= m.alto) continue;
    // No se alejan demasiado de su territorio.
    if (distancia(x - gx, y - gy) > 14) continue;
    const v = valor(y * m.ancho + x);
    if (v > max) {
      max = v;
      bx = x;
      by = y;
    }
  }
  return [bx, by];
}

interface Dia {
  est: number;
  vivas: Aldea[];
  /** Quién trabaja hoy en cada casilla (fuera de su aldea). */
  trabajan: Map<number, Persona[]>;
  ix: Indices;
  encendidas: Set<number>;
}

/** El día de las fieras: se mueven, cazan y quizá se cruzan con alguien. */
export function fauna(m: Mundo, ix: Indices, est: number, encendidas: Set<number>): void {
  const vivas = aldeasVivas(m);
  const trabajan = new Map<number, Persona[]>();
  for (const p of m.personas) {
    if (p.muerto) continue;
    const a = ix.aldeas.get(p.aldea);
    if (!a || (p.x === a.x && p.y === a.y)) continue;
    const i = p.y * m.ancho + p.x;
    const lista = trabajan.get(i);
    if (lista) lista.push(p);
    else trabajan.set(i, [p]);
  }
  const dia: Dia = { est, vivas, trabajan, ix, encendidas };
  for (const f of m.fauna) {
    f.px = f.x;
    f.py = f.y;
    if (f.espera > 0) f.espera--;
    if (f.tipo === 'oso') oso(m, f, dia);
    else lobos(m, f, dia);
  }
  m.fauna = m.fauna.filter((f) => f.n > 0);
  if (m.t % DIAS_ANIO === 20) primavera(m);
}

function cercanos(m: Mundo, f: Fiera, dia: Dia, radio: number): Persona[] {
  const out: Persona[] = [];
  for (let dy = -radio; dy <= radio; dy++) {
    for (let dx = -radio; dx <= radio; dx++) {
      const x = f.x + dx;
      const y = f.y + dy;
      if (x < 0 || y < 0 || x >= m.ancho || y >= m.alto) continue;
      const lista = dia.trabajan.get(y * m.ancho + x);
      if (lista) for (const p of lista) if (!p.muerto) out.push(p);
    }
  }
  return out;
}

function herir(m: Mundo, p: Persona, dano: number, causa: 'lobos' | 'oso', a: Aldea | undefined): void {
  if (p.salud - dano <= 0) {
    morir(p, causa);
    const lugar = a ? `, de ${a.nombre},` : '';
    anotar(
      m,
      causa === 'oso' ? 'fieras' : 'lobos',
      causa === 'oso'
        ? `Un oso mató a ${p.nombre}${lugar} mientras ${p.actividad === 'lenar' ? 'cortaba leña' : p.actividad === 'cazar' ? 'cazaba' : 'trabajaba'} lejos de casa (${anios(edad(m, p))}).`
        : `Los lobos mataron a ${p.nombre}${lugar} cuando ${p.actividad === 'cazar' ? 'cazaba' : 'trabajaba'} solo lejos de la aldea (${anios(edad(m, p))}).`,
      a?.id,
    );
  } else {
    danar(p, dano, causa);
  }
  if (a) a.amenaza = r2(Math.min(1, a.amenaza + 0.06));
}

function lobos(m: Mundo, f: Fiera, dia: Dia): void {
  const { masa } = masas(m);
  const aqui = f.y * m.ancho + f.x;
  const k = masa[aqui];
  const invierno = dia.est === 3;
  // Cazan lo que encuentran; con la nieve cuesta más, y una manada grande necesita más.
  f.hambre = r2(Math.min(1, f.hambre + (invierno ? 0.05 : 0.025) * (0.6 + f.n / 10)));
  if (m.recursos.caza[aqui] >= 1 && prob(invierno ? 0.15 : 0.4)) {
    m.recursos.caza[aqui] = r2(m.recursos.caza[aqui] - 1);
    f.hambre = r2(Math.max(0, f.hambre - 0.35));
  }
  // Solo con mucha hambre (en invierno, o famélicos) se acercan a la aldea más cercana de su tierra.
  let objetivo: Aldea | null = null;
  let dmin = 16;
  if (f.espera === 0 && f.n >= 3 && ((invierno && f.hambre > 0.6) || f.hambre >= 0.95)) {
    for (const a of dia.vivas) {
      if (masa[a.y * m.ancho + a.x] !== k) continue;
      const d = distancia(a.x - f.x, a.y - f.y);
      if (d < dmin) {
        dmin = d;
        objetivo = a;
      }
    }
  }
  if (objetivo) {
    if (dmin <= 1.5) {
      atacarAldea(m, f, objetivo, dia);
      return;
    }
    f.estado = 'acecha';
    mover(m, f, objetivo.x, objetivo.y, 2);
    if (dmin < 6 && batida(m, f, objetivo, dia)) return;
    if (dmin < 6) {
      objetivo.amenaza = r2(Math.min(1, objetivo.amenaza + 0.01));
      if (aviso(m, `lobos-${objetivo.id}`, 4 * DIAS_ANIO)) {
        anotar(m, 'fieras', `Una manada de ${f.n} lobos ronda ${objetivo.nombre}: se oyen aullidos cada noche.`, objetivo.id);
      }
    }
  } else {
    f.estado = 'ronda';
    const [x, y] = buscar(m, f, 4, (i) => (masa[i] === k && m.terreno[i] !== AGUA ? m.recursos.caza[i] : -1));
    mover(m, f, x, y, 2);
  }
  // Quien trabaja solo cerca de la manada corre peligro; los cazadores con lanza se defienden.
  for (const p of cercanos(m, f, dia, 1)) {
    const a = dia.ix.aldeas.get(p.aldea);
    if (p.actividad === 'cazar' && p.saberes.includes('lanza') && prob(0.22)) {
      f.n--;
      if (a) guardar(a, 'piel', 1);
      if (f.n <= 0) {
        if (a) anotar(m, 'fieras', `Los cazadores de ${a.nombre} acaban con la última loba de una manada que les acechaba.`, a.id);
        return;
      }
      continue;
    }
    if (f.n >= 3 && f.hambre > 0.7 && prob(0.05 * (invierno ? 1.6 : 1))) {
      herir(m, p, 0.25 + 0.3 * azar(), 'lobos', a);
      f.hambre = r2(Math.max(0, f.hambre - 0.3));
      f.estado = 'ataca';
      break;
    }
  }
}

/**
 * Batida: los cazadores con lanza (y los vigías) salen a por la fiera que acecha.
 * Entre varios es más fácil; si sale mal, alguien acaba herido.
 */
function batida(m: Mundo, f: Fiera, a: Aldea, dia: Dia): boolean {
  if (!prob(0.12)) return false;
  const gente = (dia.ix.porAldea.get(a.id) ?? []).filter(
    (p) => !p.muerto && edad(m, p) >= 16 && p.saberes.includes('lanza') && (p.actividad === 'cazar' || p.actividad === 'vigilar'),
  );
  if (!gente.length) return false;
  const grupo = gente.slice(0, 4);
  for (const p of grupo) {
    p.x = f.x;
    p.y = f.y;
  }
  const exito = Math.min(0.8, (f.tipo === 'oso' ? 0.2 : 0.15) * grupo.length);
  if (prob(exito)) {
    if (f.tipo === 'oso') {
      f.n = 0;
      guardar(a, 'carne', 40);
      guardar(a, 'piel', 3);
      guardar(a, 'hueso', 6);
      anotar(m, 'fieras', `Una partida de ${grupo.length} cazadores de ${a.nombre} abate un oso: carne para semanas y una piel enorme.`, a.id);
    } else {
      const bajas = Math.min(f.n, 1 + entero(grupo.length));
      f.n -= bajas;
      guardar(a, 'piel', bajas);
      if (f.n <= 0) anotar(m, 'fieras', `Los cazadores de ${a.nombre} salen a por la manada que les acechaba y acaban con ella.`, a.id);
      else if (aviso(m, `batida-${a.id}`, 120)) {
        anotar(m, 'fieras', `Los cazadores de ${a.nombre} salen a por los lobos y matan ${bajas === 1 ? 'a uno' : `a ${bajas}`}; los demás huyen.`, a.id);
      }
      f.espera = 30 + entero(30);
      f.estado = 'huye';
    }
    return true;
  }
  const herido = grupo[entero(grupo.length)];
  f.estado = 'ataca';
  herir(m, herido, f.tipo === 'oso' ? 0.4 + 0.4 * azar() : 0.25 + 0.3 * azar(), f.tipo === 'oso' ? 'oso' : 'lobos', a);
  return true;
}

/** De noche entran en la aldea: primero a por el ganado. El fuego, el muro y los vigías ayudan. */
function atacarAldea(m: Mundo, f: Fiera, a: Aldea, dia: Dia): void {
  const gente = (dia.ix.porAldea.get(a.id) ?? []).filter((p) => !p.muerto);
  const fuego = dia.encendidas.has(a.id);
  const muro = tiene(a, 'empalizada');
  const vigias = gente.filter((p) => p.actividad === 'vigilar').length;
  const lanzas = gente.filter((p) => edad(m, p) >= 14 && p.saberes.includes('lanza')).length;
  let exito = 0.35 * (fuego ? 0.3 : 1) * (muro ? 0.1 : 1) * (gente.length >= 25 ? 0.6 : 1);
  for (let v = 0; v < vigias; v++) exito *= 0.6;
  a.amenaza = r2(Math.min(1, a.amenaza + 0.12));
  f.estado = 'ataca';
  let bajas = 0;
  for (let v = 0; v < vigias + Math.floor(lanzas / 3); v++) if (prob(0.18)) bajas++;
  bajas = Math.min(bajas, f.n);
  f.n -= bajas;
  // Pase lo que pase, se retiran y tardan en volver.
  f.espera = 40 + entero(40);
  const gx = f.guarida % m.ancho;
  if (f.n <= 0) {
    anotar(m, 'fieras', `Los de ${a.nombre} acaban con la manada de lobos que atacaba la aldea.`, a.id);
    return;
  }
  if (gente.length && prob(exito)) {
    f.hambre = 0;
    const corral = a.edificios.find((e) => e.tipo === 'corral' && (e.animales ?? 0) >= 1);
    if (corral && prob(0.65)) {
      const muertos = Math.min(Math.floor(corral.animales ?? 0), 1 + entero(3));
      corral.animales = r2((corral.animales ?? 0) - muertos);
      if (aviso(m, `corral-${a.id}`, 60)) {
        anotar(m, 'lobos', `Los lobos entran de noche en el corral de ${a.nombre} y matan ${muertos === 1 ? 'un animal' : `${muertos} animales`}.`, a.id);
      }
    } else {
      const victima = elegirPeso(gente, (q) => {
        const e = edad(m, q);
        return e < 10 || e > 60 ? 3 : 1;
      });
      if (victima) {
        if (prob(0.3)) {
          morir(victima, 'lobos');
          anotar(m, 'lobos', `Los lobos atacaron ${a.nombre} de noche y se llevaron a ${victima.nombre} (${anios(edad(m, victima))}).`, a.id);
        } else {
          danar(victima, 0.3, 'lobos');
        }
      }
    }
  } else if ((bajas > 0 || fuego || muro) && aviso(m, `ahuyentan-${a.id}`, 3 * DIAS_ANIO)) {
    const como = muro ? 'tras la empalizada' : fuego ? 'con fuego' : 'con palos y piedras';
    anotar(m, 'fieras', `Los de ${a.nombre} ahuyentan a los lobos ${como}${bajas ? ` y matan ${bajas === 1 ? 'a uno' : `a ${bajas}`}` : ''}.`, a.id);
  }
  f.estado = 'huye';
  mover(m, f, gx, (f.guarida - gx) / m.ancho, 3);
}

function oso(m: Mundo, f: Fiera, dia: Dia): void {
  const { masa } = masas(m);
  const gx = f.guarida % m.ancho;
  const gy = (f.guarida - gx) / m.ancho;
  if (dia.est === 3) {
    // En invierno duerme en su guarida.
    f.estado = 'hiberna';
    f.hambre = 0.2;
    mover(m, f, gx, gy, 2);
    return;
  }
  const aqui = f.y * m.ancho + f.x;
  const k = masa[aqui];
  f.hambre = r2(Math.min(1, f.hambre + 0.03));
  if (m.recursos.bayas[aqui] >= 2) {
    m.recursos.bayas[aqui] = r2(m.recursos.bayas[aqui] - 2);
    f.hambre = r2(Math.max(0, f.hambre - 0.25));
  } else if (m.recursos.caza[aqui] >= 1 && prob(0.15)) {
    m.recursos.caza[aqui] = r2(m.recursos.caza[aqui] - 1);
    f.hambre = r2(Math.max(0, f.hambre - 0.4));
  }
  // Huye de las aldeas (pero no de quien trabaja en el bosque).
  for (const a of dia.vivas) {
    if (distancia(a.x - f.x, a.y - f.y) <= 2) {
      f.estado = 'huye';
      mover(m, f, gx, gy, 2);
      return;
    }
  }
  f.estado = 'ronda';
  const [x, y] = buscar(m, f, 3, (i) => (masa[i] === k && m.terreno[i] !== AGUA && m.terreno[i] !== RIO ? m.recursos.bayas[i] + 0.5 * m.recursos.caza[i] : -1));
  mover(m, f, x, y, 1);
  // Si anda cerca de una aldea, sus cazadores pueden salir a por él.
  for (const a of dia.vivas) {
    if (masa[a.y * m.ancho + a.x] === k && distancia(a.x - f.x, a.y - f.y) <= 8 && batida(m, f, a, dia)) return;
  }
  const cerca = cercanos(m, f, dia, 1);
  if (!cerca.length) return;
  // Los cazadores con lanza que estén cerca pueden abatirlo entre todos.
  const cazadores = cerca.filter((p) => p.actividad === 'cazar' && p.saberes.includes('lanza'));
  if (cazadores.length && prob(Math.min(0.7, 0.18 * cazadores.length))) {
    f.n = 0;
    const a = dia.ix.aldeas.get(cazadores[0].aldea);
    if (a) {
      guardar(a, 'carne', 40);
      guardar(a, 'piel', 3);
      guardar(a, 'hueso', 6);
      anotar(m, 'fieras', `Los cazadores de ${a.nombre} abaten un oso: carne para semanas y una piel enorme.`, a.id);
    }
    return;
  }
  for (const p of cerca) {
    if (!prob(f.hambre > 0.5 ? 0.22 : 0.12)) continue;
    f.estado = 'ataca';
    herir(m, p, 0.35 + 0.4 * azar(), 'oso', dia.ix.aldeas.get(p.aldea));
    break;
  }
}

/** En primavera nacen lobeznos, las manadas grandes se dividen y llegan fieras de fuera. */
function primavera(m: Mundo): void {
  const { masa } = masas(m);
  const { manadas, osos } = cupo(m);
  for (const f of m.fauna.slice()) {
    if (f.tipo !== 'lobos') continue;
    if (f.hambre < 0.5 && f.n < 8 && prob(0.6)) f.n = Math.min(8, f.n + 1 + entero(2));
    // Solo se dividen si queda territorio libre: el bosque no da para más manadas.
    const hay = m.fauna.filter((g) => g.tipo === 'lobos').length;
    if (f.n >= 8 && hay < manadas) {
      // La manada se divide: una parte busca territorio nuevo en la misma tierra.
      const k = masa[f.guarida];
      for (let intento = 0; intento < 60; intento++) {
        const i = entero(m.terreno.length);
        const x = i % m.ancho;
        const y = (i - x) / m.ancho;
        const d = distancia(x - f.x, y - f.y);
        if (masa[i] !== k || d < 8 || d > 20 || ![BOSQUE, COLINA, ESTEPA].includes(m.terreno[i])) continue;
        const mitad = Math.floor(f.n / 2);
        f.n -= mitad;
        nuevaFiera(m, 'lobos', i, mitad);
        break;
      }
    }
  }
  const hayManadas = m.fauna.filter((f) => f.tipo === 'lobos').length;
  const hayOsos = m.fauna.filter((f) => f.tipo === 'oso').length;
  if (hayManadas < manadas && prob(0.35)) {
    const g = guaridaLibre(m, [BOSQUE, COLINA, ESTEPA], 18);
    if (g >= 0) nuevaFiera(m, 'lobos', g, 3 + entero(3));
  }
  if (hayOsos < osos && prob(0.2)) {
    const g = guaridaLibre(m, [BOSQUE, MONTANA, COLINA], 16);
    if (g >= 0) nuevaFiera(m, 'oso', g, 1);
  }
}
