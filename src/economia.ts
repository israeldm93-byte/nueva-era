// El trabajo de cada día, la comida y los edificios.
//
// Cada adulto elige qué hacer combinando tres cosas:
//   - lo que espera sacar de cada actividad (lo aprende de su experiencia),
//   - lo que la aldea necesita ahora mismo (si falta comida, la comida vale más),
//   - lo que le dice su mente (red neuronal heredada y entrenada día a día), que ve
//     también la estación, el peligro y lo que ha decidido el consejo.

import { azar, elegir, elegirPeso, prob } from './azar.ts';
import { rindeFuera } from './tiempo.ts';
import { EDAD_ADULTA, GANAS_EXPERIMENTAR, INSPIRACION, PRUEBAS_DIA, RADIO_TRABAJO } from './config.ts';
import {
  AGUA,
  BOSQUE,
  COLINA,
  EDIFICIO,
  ESTEPA,
  MATERIAL,
  MINERALES,
  MONTANA,
  OFICIOS,
  ORDEN_COMER,
  ORILLA,
  PANTANO,
  PESCABLE,
  PRADERA,
  RIO,
  type TipoEdificio,
} from './catalogo.ts';
import { anotar } from './cronica.ts';
import { alcanzable, hayCerca, mejorCasilla } from './mapa.ts';
import { distancia as distanciaXY } from './matematicas.ts';
import { edad } from './mundo.ts';
import { ACCIONES, ALINEADAS, aprender, entradas, pensar, type Pensamiento, type Situacion } from './mente.ts';
import { experimentar, inspirarse, sabe } from './saber.ts';

/** Con qué se trabaja en cada oficio (de ahí salen las ideas al trabajar). */
const INSPIRA: Record<string, string[]> = {
  recolectar: ['semillas', 'fibra', 'bayas', 'hierbas'],
  cazar: ['piel', 'hueso', 'carne', 'cria'],
  pescar: ['agua', 'pescado'],
  lenar: ['madera'],
  picar: ['piedra', 'malaquita', 'casiterita', 'hematites'],
  barro: ['arcilla'],
  pastorear: ['cria'],
  cultivar: ['semillas', 'tierra'],
  construir: ['madera', 'piedra'],
};
import type { Aldea, Mundo, Persona } from './tipos.ts';

const r2 = (x: number) => Math.round(x * 100) / 100;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const lejania = (d: number) => 1 / (1 + 0.07 * d);

export interface Contexto {
  a: Aldea;
  gente: Persona[];
  est: number;
  precio: Record<string, number>;
  escasez: number;
  /** 0..1: cuánto margen de comida hay para dedicar tiempo a otras cosas. */
  holgura: number;
  radio: number;
  herramienta: number;
  agua: boolean;
  rocas: boolean;
  barro: boolean;
  camposPorTrabajar: number;
  corrales: number;
  hoguera: boolean;
  /** Prioridad que decidió anoche el consejo ('' si no hay consejo). */
  consejo: string;
  obraLista: boolean;
  /** Cuántos montan guardia hoy (con uno o dos basta). */
  vigias: number;
  /** Lo que cada cual hizo hoy y lo que aportó: con ello aprenden sus mentes al anochecer. */
  hoy: { p: Persona; pensado: Pensamiento; x: number[]; k: number; r: number }[];
}

export function conoce(a: Aldea, id: string): boolean {
  return a.conocidos.includes(id);
}

export function tiene(a: Aldea, tipo: string): boolean {
  return a.edificios.some((e) => e.tipo === tipo);
}

export function cuantos(a: Aldea, tipo: string): number {
  let n = 0;
  for (const e of a.edificios) if (e.tipo === tipo) n++;
  return n;
}

export function guardar(a: Aldea, mat: string, n: number): void {
  if (n <= 0) return;
  a.despensa[mat] = r2((a.despensa[mat] ?? 0) + n);
  if (!a.vistos.includes(mat)) a.vistos.push(mat);
}

export function necesidad(m: Mundo, p: Persona): number {
  const e = edad(m, p);
  if (e < 2) return 0.3;
  if (e < 12) return 0.6;
  return e > 60 ? 0.8 : 1;
}

/** Lo que alimenta una unidad de cada comida en esta aldea (cocinar y moler ayudan). */
export function alimento(a: Aldea, mat: string): number {
  let v = MATERIAL[mat]?.comida ?? 0;
  if (tiene(a, 'hoguera') && conoce(a, 'asado') && mat !== 'bayas') v *= 1.35;
  if (conoce(a, 'harina') && (mat === 'cereal' || mat === 'semillas')) v *= 1.3;
  return v;
}

export function comidaTotal(a: Aldea): number {
  let s = 0;
  for (const mat of ORDEN_COMER) s += (a.despensa[mat] ?? 0) * alimento(a, mat);
  return s;
}

function herramienta(a: Aldea): number {
  if (conoce(a, 'hierro')) return 1.6;
  if (conoce(a, 'bronce')) return 1.4;
  if (conoce(a, 'cobre')) return 1.2;
  return 1;
}

export function contexto(m: Mundo, a: Aldea, gente: Persona[], est: number): Contexto {
  let consumo = 0;
  for (const p of gente) consumo += necesidad(m, p);
  const dias = comidaTotal(a) / Math.max(1, consumo);
  const objetivo = [30, 45, 75, 35][est];
  const escasez = clamp(1 - dias / objetivo, 0.03, 1);
  const precio: Record<string, number> = { comida: 0.25 + 1.5 * escasez };
  const obra = a.obra && !a.obra.pagada ? EDIFICIO[a.obra.tipo].coste : {};
  const hoguera = tiene(a, 'hoguera');
  const fijar = (mat: string, base: number) => {
    const quiere = base + (obra[mat] ?? 0);
    precio[mat] = r2(MATERIAL[mat].peso * clamp(1 - (a.despensa[mat] ?? 0) / Math.max(quiere, 0.1), 0, 1));
  };
  const prioridad = a.consejo?.prioridad ?? '';
  fijar('madera', 10 + (hoguera ? (est >= 2 ? 30 : 12) : 0) + (prioridad === 'invierno' ? 20 : 0));
  fijar('fibra', 6 + (conoce(a, 'cuerda') ? 4 : 0));
  fijar('piedra', 6);
  fijar('arcilla', conoce(a, 'vasija') ? 10 : 3);
  fijar('piel', 2 + (conoce(a, 'ropa') ? gente.length * 0.4 : 0) + (conoce(a, 'tambor') ? 1 : 0));
  fijar('hueso', 2 + (conoce(a, 'aguja') ? 2 : 0));
  fijar('hierbas', conoce(a, 'remedio') ? 6 : 1.5);
  // Antes de saber fundir, las piedras de colores solo se recogen por curiosidad.
  for (const mineral of MINERALES) {
    if (conoce(a, 'horno')) fijar(mineral, 8);
    else precio[mineral] = 0.02;
  }

  const radio = RADIO_TRABAJO + (conoce(a, 'rueda') ? 2 : 0) + (conoce(a, 'carro') ? 2 : 0) + (aCaballo(a) ? 2 : 0);
  let camposPorTrabajar = 0;
  const semillas = (a.despensa.cereal ?? 0) + (a.despensa.semillas ?? 0);
  for (const e of a.edificios) {
    if (e.tipo !== 'campo') continue;
    if (est === 0 && e.fase === 0 && ((e.trabajo ?? 0) > 0 || semillas >= 4)) camposPorTrabajar++;
    if (est === 1 && e.fase === 1 && (e.cuidado ?? 0) < 3) camposPorTrabajar++;
    if (est === 2 && e.fase === 1) camposPorTrabajar++;
  }
  return {
    a,
    gente,
    est,
    precio,
    escasez,
    holgura: clamp(dias / 12, 0, 1),
    radio,
    herramienta: herramienta(a) * rindeFuera(m),
    agua: hayCerca(m, a.x, a.y, radio, (i) => PESCABLE[m.terreno[i]] && alcanzable(m, a, i, false)),
    // Piedras sueltas hay casi en cualquier parte; en colinas y montañas, muchas más.
    rocas: hayCerca(m, a.x, a.y, radio, (i) => m.recursos.piedra[i] >= 1 && alcanzable(m, a, i, false)),
    barro: hayCerca(m, a.x, a.y, radio, (i) => m.recursos.arcilla[i] > 1 && alcanzable(m, a, i, false)),
    camposPorTrabajar,
    corrales: cuantos(a, 'corral'),
    hoguera,
    consejo: prioridad,
    obraLista: obraLista(a),
    vigias: 0,
    hoy: [],
  };
}

/** Acciones cuyo valor se ve el mismo día; experimentar o descansar rinden a la larga y los moldea la evolución. */
const APRENDIBLES = new Set(['recolectar', 'cazar', 'pescar', 'lenar', 'picar', 'barro', 'cultivar', 'pastorear', 'construir', 'vigilar']);

/**
 * Al final del día cada mente compara lo que esperaba de su trabajo con lo que de
 * verdad aportó respecto a la media de su aldea (con los mismos precios) y aprende
 * de su error. También se anota si lo había previsto bien.
 */
export function asentarAprendizaje(m: Mundo, c: Contexto): void {
  if (c.hoy.length < 2) return;
  let media = 0;
  for (const h of c.hoy) media += h.r;
  media /= c.hoy.length;
  for (const h of c.hoy) {
    const ventaja = (h.r - media) / (media + 0.5);
    if (ventaja >= 0.05 || ventaja <= -0.05) {
      m.anual.predicciones++;
      if (ventaja > 0 === h.pensado.salidas[h.k] > 0) m.anual.aciertos++;
    }
    aprender(h.p.mente, h.pensado, h.k, ventaja, h.x);
    h.p.recompensa = r2(h.p.recompensa + 0.05 * (h.r - h.p.recompensa));
  }
  c.hoy = [];
}

const FRIO = [0, 0, 0.5, 1];
const COSECHA = [0, 0.5, 1, 0];

/** Lo que ve la mente de una persona: su estado, el de su aldea y la decisión del consejo. */
export function situacion(p: Persona, c: Contexto, e: number, conConsejo = true): Situacion {
  const pr = c.precio;
  return {
    hambre: 1 - p.reservas / 8,
    debilidad: 1 - p.salud,
    edad: e / 60,
    escasez: c.escasez,
    frio: FRIO[c.est],
    cosecha: COSECHA[c.est],
    madera: Math.min(1, pr.madera * 2),
    materiales: Math.min(1, Math.max(pr.piedra, pr.arcilla, pr.fibra, pr.piel) / 1.5),
    obra: c.obraLista ? 1 : 0,
    campos: Math.min(1, c.camposPorTrabajar / 4),
    amenaza: c.a.amenaza,
    consejo: conConsejo ? c.consejo : undefined,
  };
}

/** Decide y hace el trabajo del día. */
export function jornada(m: Mundo, p: Persona, c: Contexto): void {
  const e = edad(m, p);
  if (e < 6) {
    p.actividad = 'jugar';
    return;
  }
  if (e < EDAD_ADULTA) {
    // Los niños mayores ayudan a recoger y así van aprendiendo qué rinde.
    if (e >= 8 && prob(0.5)) hacer(m, p, c, 'recolectar', 0.5);
    else p.actividad = 'jugar';
    return;
  }
  if (e > 65 && prob(0.5)) {
    p.actividad = 'descansar';
    return;
  }
  const x = entradas(situacion(p, c, e));
  const pensado = pensar(p.mente, x);
  const accion = elegirActividad(p, c, e, pensado.salidas);
  const r = hacer(m, p, c, accion, 1);
  if (APRENDIBLES.has(accion)) c.hoy.push({ p, pensado, x, k: ACCIONES.indexOf(accion), r });
}

function elegirActividad(p: Persona, c: Contexto, e: number, mente: number[]): string {
  const comida = c.precio.comida;
  const v = p.valor;
  const U: Record<string, number> = {
    recolectar: v.recolectar * comida + 1.5 * (c.precio.fibra + c.precio.hierbas),
    cazar: v.cazar * comida + c.precio.piel + 2 * c.precio.hueso,
    lenar: v.lenar * c.precio.madera,
  };
  if (c.agua) U.pescar = v.pescar * comida;
  if (c.rocas) U.picar = v.picar * Math.max(c.precio.piedra, ...MINERALES.map((x) => c.precio[x] * 0.5));
  if (c.barro) U.barro = v.barro * c.precio.arcilla;
  if (c.corrales) U.pastorear = v.pastorear * comida + c.precio.piel;
  if (c.camposPorTrabajar) U.cultivar = 2.5 * (0.6 + comida);
  if (c.a.obra) U.construir = obraLista(c.a) ? 2.2 : -1;
  // En una aldea grande no experimenta todo el mundo: unos pocos curiosos lo hacen por los demás.
  const reparto = Math.min(1, Math.sqrt(25 / Math.max(1, c.gente.length)));
  const hambre = p.reservas < 3 ? 0.2 : 1;
  U.experimentar = p.genes.curiosidad * GANAS_EXPERIMENTAR * c.holgura * hambre * (e > 45 ? 1.3 : 1) * reparto;
  U.descansar = 0.2 + 2 * (1 - p.salud) * (1 - p.salud);
  // Con uno de cada seis adultos de guardia es suficiente.
  U.vigilar = c.vigias < Math.max(1, Math.floor(c.gente.length / 8)) ? 0.05 + 0.9 * c.a.amenaza * c.a.amenaza : 0;

  // A veces se prueba otra cosa: así se descubre que algo ha empezado a rendir.
  if (prob(0.04 + 0.12 * p.genes.curiosidad)) {
    const posibles = OFICIOS.filter((o) => (U[o] ?? -1) > 0);
    if (posibles.length) return elegir(posibles);
  }
  // La mente (intuición aprendida) empuja cada opción entre un 75 % y un 125 %, y el
  // consejo añade su peso (más en los sociables, que le hacen más caso).
  const alineadas = ALINEADAS[c.consejo] ?? [];
  const obediencia = 0.1 + 0.2 * p.genes.sociabilidad;
  let mejor = 'descansar';
  let max = 0;
  for (const k of Object.keys(U)) {
    if (U[k] <= 0) continue;
    const i = ACCIONES.indexOf(k);
    const empuje = i >= 0 ? 1 + 0.25 * mente[i] : 1;
    const consejo = alineadas.includes(k) ? 1 + obediencia : 1;
    const u = U[k] * empuje * consejo * (0.85 + 0.3 * azar());
    if (u > max) {
      max = u;
      mejor = k;
    }
  }
  return mejor;
}

/** Hace la actividad y devuelve lo que ha aportado (la recompensa con que aprende su mente). */
function hacer(m: Mundo, p: Persona, c: Contexto, act: string, eficiencia: number): number {
  p.actividad = act;
  const pr = c.precio;
  let obtenido: number | null = null;
  let r = 0;
  switch (act) {
    case 'recolectar':
      obtenido = recolectar(m, p, c, eficiencia);
      r = obtenido * pr.comida + 0.3 * (pr.fibra + pr.hierbas);
      break;
    case 'cazar':
      obtenido = cazar(m, p, c);
      r = obtenido * pr.comida + (obtenido > 0 ? pr.piel + 2 * pr.hueso : 0);
      break;
    case 'pescar':
      obtenido = pescar(m, p, c);
      r = obtenido * pr.comida;
      break;
    case 'lenar':
      obtenido = lenar(m, p, c);
      r = obtenido * pr.madera;
      break;
    case 'picar':
      obtenido = picar(m, p, c);
      r = obtenido * Math.max(pr.piedra, 0.02);
      break;
    case 'barro':
      obtenido = barro(m, p, c);
      r = obtenido * pr.arcilla;
      break;
    case 'pastorear':
      obtenido = pastorear(m, p, c);
      r = obtenido * pr.comida;
      break;
    case 'cultivar':
      r = cultivar(m, p, c) * 1.2;
      break;
    case 'construir':
      r = construir(m, p, c) * 1.5;
      break;
    case 'experimentar': {
      const rapidez = (conoce(c.a, 'tambor') ? 1.1 : 1) * (conoce(c.a, 'escritura') ? 1.2 : 1) * (conoce(c.a, 'numeros') ? 1.2 : 1);
      // Un día da para varias pruebas (hasta que algo sale).
      let res = experimentar(m, p, c.a, rapidez);
      for (let k = 1; k < PRUEBAS_DIA && !res.descubierto; k++) {
        const otra = experimentar(m, p, c.a, rapidez);
        res = { descubierto: otra.descubierto, idea: res.idea || otra.idea };
      }
      // La curiosidad satisfecha también cuenta; descubrir algo, muchísimo.
      r = 0.3 + 0.6 * p.genes.curiosidad + (res.idea ? 0.4 : 0) + (res.descubierto ? 8 : 0);
      p.x = c.a.x;
      p.y = c.a.y;
      break;
    }
    case 'vigilar':
      // Montar guardia rinde lo que vale la seguridad cuando hay peligro.
      c.vigias++;
      r = 0.05 + 1.2 * c.a.amenaza * c.a.amenaza;
      p.x = c.a.x;
      p.y = c.a.y;
      break;
    default: {
      const antes = p.salud;
      p.salud = Math.min(1, r2(p.salud + 0.01));
      r = (p.salud - antes) * 40;
      p.x = c.a.x;
      p.y = c.a.y;
    }
  }
  if (obtenido !== null && eficiencia === 1) {
    // Aprendizaje por refuerzo: lo esperado se acerca a lo obtenido.
    p.valor[act] = r2(p.valor[act] + 0.15 * (obtenido - p.valor[act]));
  }
  // Trabajando con las manos a veces se le ocurre algo (que habrá que probar).
  const materias = INSPIRA[act];
  if (materias && prob(INSPIRACION * (0.4 + p.genes.curiosidad))) inspirarse(p, c.a, elegir(materias));
  return r;
}

function situar(m: Mundo, p: Persona, i: number): void {
  p.x = i % m.ancho;
  p.y = Math.floor(i / m.ancho);
}

const distancia = (m: Mundo, a: Aldea, i: number) => distanciaXY((i % m.ancho) - a.x, Math.floor(i / m.ancho) - a.y);

function recolectar(m: Mundo, p: Persona, c: Contexto, eficiencia: number): number {
  const R = m.recursos;
  const a = c.a;
  const barca = sabe(p, 'canoa');
  const i = mejorCasilla(m, a.x, a.y, c.radio, (j, d) =>
    alcanzable(m, a, j, barca) ? (R.bayas[j] * 0.5 + R.semillas[j] * 0.45 + (R.fibra[j] * c.precio.fibra + R.hierbas[j] * c.precio.hierbas) * 0.3) * lejania(d) : 0,
  );
  if (i < 0) return 0;
  situar(m, p, i);
  const cap = 5 * (0.6 + 0.6 * p.genes.destreza) * eficiencia * (sabe(p, 'cesta') ? 1.4 : 1) * lejania(distancia(m, a, i));
  const total = R.bayas[i] + R.semillas[i];
  let comida = 0;
  if (total > 0.05) {
    const toma = Math.min(total, cap);
    const b = r2((toma * R.bayas[i]) / total);
    const s = r2(toma - b);
    R.bayas[i] = r2(Math.max(0, R.bayas[i] - b));
    R.semillas[i] = r2(Math.max(0, R.semillas[i] - s));
    guardar(a, 'bayas', b);
    guardar(a, 'semillas', s);
    comida = b * 0.5 + s * 0.45;
  }
  if (R.fibra[i] > 0.5 && c.precio.fibra > 0.05) {
    const f = r2(Math.min(R.fibra[i], 2 * eficiencia));
    R.fibra[i] = r2(R.fibra[i] - f);
    guardar(a, 'fibra', f);
  }
  if (R.hierbas[i] > 0.5 && (c.precio.hierbas > 0.05 || prob(0.2))) {
    const h = r2(Math.min(R.hierbas[i], 1));
    R.hierbas[i] = r2(R.hierbas[i] - h);
    guardar(a, 'hierbas', h);
  }
  return r2(comida);
}

function cazar(m: Mundo, p: Persona, c: Contexto): number {
  const R = m.recursos;
  const a = c.a;
  const barca = sabe(p, 'canoa');
  const i = mejorCasilla(m, a.x, a.y, c.radio, (j, d) => (alcanzable(m, a, j, barca) ? R.caza[j] * lejania(d) : 0));
  if (i < 0 || R.caza[i] < 0.5) return 0;
  situar(m, p, i);
  const lanza = sabe(p, 'lanza');
  const arco = sabe(p, 'arco');
  // Con arco se caza desde lejos: más presas y menos heridas.
  if (prob((lanza ? 0.012 : 0.025) * (arco ? 0.6 : 1) * (1.2 - 0.4 * p.genes.fuerza))) {
    p.salud = r2(p.salud - 0.35);
    p.causa = 'herida';
  }
  if (sabe(p, 'trampa') && prob(0.12)) {
    R.caza[i] = r2(R.caza[i] - 1);
    guardar(a, 'cria', 1);
    return 0;
  }
  const exito =
    0.3 * (0.6 + 0.4 * p.genes.fuerza + 0.3 * p.genes.destreza) * (lanza ? 1.8 : 1) * (arco ? 1.3 : 1) * (sabe(p, 'trampa') ? 1.15 : 1) * c.herramienta * Math.min(1, R.caza[i] / 2);
  if (!prob(exito)) return 0;
  R.caza[i] = r2(R.caza[i] - 1);
  const carne = r2((6 + 6 * azar()) * (sabe(p, 'lasca') ? 1.3 : 1));
  guardar(a, 'carne', carne);
  guardar(a, 'piel', 1);
  guardar(a, 'hueso', 2);
  return carne;
}

function pescar(m: Mundo, p: Persona, c: Contexto): number {
  const R = m.recursos;
  const a = c.a;
  const barca = sabe(p, 'canoa');
  const radio = c.radio + (barca ? 3 : 0) + (sabe(p, 'vela') ? 4 : 0);
  const i = mejorCasilla(m, a.x, a.y, radio, (j, d) => (PESCABLE[m.terreno[j]] && alcanzable(m, a, j, barca) ? R.peces[j] * lejania(d) : 0));
  if (i < 0) return 0;
  situar(m, p, i);
  const cap =
    1.6 * (0.6 + 0.6 * p.genes.destreza) * (sabe(p, 'red') ? 2.5 : 1) * (sabe(p, 'canoa') ? 1.3 : 1) * (sabe(p, 'vela') ? 1.3 : 1) * (c.est === 3 ? 0.6 : 1) * (m.tiempo === 'tormenta' ? 0.4 : 1);
  const n = r2(Math.min(R.peces[i] * 0.3, cap));
  R.peces[i] = r2(R.peces[i] - n);
  guardar(a, 'pescado', n);
  return r2(n * 0.8);
}

function lenar(m: Mundo, p: Persona, c: Contexto): number {
  const R = m.recursos;
  const a = c.a;
  const barca = sabe(p, 'canoa');
  const i = mejorCasilla(m, a.x, a.y, c.radio, (j, d) => (alcanzable(m, a, j, barca) ? Math.min(R.madera[j], 15) * lejania(d) : 0));
  if (i < 0) return 0;
  situar(m, p, i);
  const n = r2(Math.min(R.madera[i], 3 * (0.6 + 0.6 * p.genes.fuerza) * (sabe(p, 'hacha') ? 2 : 1) * c.herramienta));
  R.madera[i] = r2(R.madera[i] - n);
  guardar(a, 'madera', n);
  return n;
}

function picar(m: Mundo, p: Persona, c: Contexto): number {
  const R = m.recursos;
  const a = c.a;
  const minerales = conoce(a, 'horno') || prob(0.3 * p.genes.curiosidad);
  const barca = sabe(p, 'canoa');
  // En barca se organizan viajes a las vetas de las islas.
  const radio = c.radio + (barca ? 5 : 0) + (sabe(p, 'vela') ? 8 : 0);
  const i = mejorCasilla(m, a.x, a.y, radio, (j, d) => {
    if (R.piedra[j] <= 0 || !alcanzable(m, a, j, barca)) return 0;
    const mena = minerales ? (R.malaquita[j] + R.casiterita[j] + R.hematites[j]) * 0.5 : 0;
    return (Math.min(R.piedra[j], 20) * Math.max(c.precio.piedra, 0.05) + mena) * lejania(d);
  });
  if (i < 0) return 0;
  situar(m, p, i);
  const fuerza = (0.6 + 0.6 * p.genes.fuerza) * c.herramienta;
  const n = r2(Math.min(R.piedra[i], 3 * fuerza));
  R.piedra[i] = r2(R.piedra[i] - n);
  guardar(a, 'piedra', n);
  for (const mineral of MINERALES) {
    if (R[mineral][i] > 0 && (minerales || prob(0.25))) {
      const k = r2(Math.min(R[mineral][i], 1.5 * fuerza));
      R[mineral][i] = r2(R[mineral][i] - k);
      guardar(a, mineral, k);
    }
  }
  return n;
}

function barro(m: Mundo, p: Persona, c: Contexto): number {
  const R = m.recursos;
  const a = c.a;
  const barca = sabe(p, 'canoa');
  const i = mejorCasilla(m, a.x, a.y, c.radio, (j, d) => (alcanzable(m, a, j, barca) ? Math.min(R.arcilla[j], 20) * lejania(d) : 0));
  if (i < 0) return 0;
  situar(m, p, i);
  const n = r2(Math.min(R.arcilla[i], 4 * (0.6 + 0.6 * p.genes.fuerza)));
  R.arcilla[i] = r2(R.arcilla[i] - n);
  guardar(a, 'arcilla', n);
  return n;
}

function pastorear(m: Mundo, p: Persona, c: Contexto): number {
  const a = c.a;
  let corral = null;
  for (const e of a.edificios) if (e.tipo === 'corral' && (!corral || (e.animales ?? 0) > (corral.animales ?? 0))) corral = e;
  if (!corral || (corral.animales ?? 0) < 1) return 0;
  p.x = corral.x;
  p.y = corral.y;
  const animales = corral.animales ?? 0;
  const raza = CARNE[corral.especie ?? 'oveja'] ?? 1;
  let carne = r2(Math.min(3, animales * 0.15) * (0.8 + 0.4 * p.genes.destreza) * raza);
  if (prob(0.05)) guardar(a, 'piel', 1);
  if (animales > 14 && prob(0.15)) {
    corral.animales = r2(animales - 1);
    carne = r2(carne + 8 * raza);
    guardar(a, 'piel', 1);
    guardar(a, 'hueso', 2);
  }
  guardar(a, 'carne', carne);
  return carne;
}

function cultivar(m: Mundo, p: Persona, c: Contexto): number {
  const a = c.a;
  const fuerza = (0.6 + 0.6 * p.genes.fuerza) * c.herramienta;
  const campos = a.edificios.filter((e) => e.tipo === 'campo');
  if (c.est === 0) {
    const campo = campos.find((e) => e.fase === 0 && (e.trabajo ?? 0) > 0) ?? campos.find((e) => e.fase === 0);
    if (!campo) return 0;
    if (!(campo.trabajo ?? 0)) {
      // Sembrar gasta grano: primero del cultivado, si no, del silvestre.
      const de = (a.despensa.cereal ?? 0) >= 4 ? 'cereal' : 'semillas';
      if ((a.despensa[de] ?? 0) < 4) return 0;
      a.despensa[de] = r2(a.despensa[de] - 4);
    }
    p.x = campo.x;
    p.y = campo.y;
    campo.trabajo = r2((campo.trabajo ?? 0) + fuerza);
    if (campo.trabajo >= 4) {
      campo.fase = 1;
      campo.trabajo = 0;
      campo.cuidado = 0;
    }
    return fuerza;
  } else if (c.est === 1) {
    const campo = campos.find((e) => e.fase === 1 && (e.cuidado ?? 0) < 3);
    if (!campo) return 0;
    p.x = campo.x;
    p.y = campo.y;
    campo.cuidado = r2((campo.cuidado ?? 0) + fuerza);
    return fuerza;
  } else if (c.est === 2) {
    const campo = campos.find((e) => e.fase === 1);
    if (!campo) return 0;
    p.x = campo.x;
    p.y = campo.y;
    campo.trabajo = r2((campo.trabajo ?? 0) + fuerza);
    if (campo.trabajo >= 4) {
      const mejora =
        (conoce(a, 'calendario') ? 1.25 : 1) * (conoce(a, 'acequia') ? 1.4 : 1) * (conoce(a, 'arado') ? 1.5 : 1) * (conoce(a, 'hierro') ? 1.15 : 1);
      const cosecha = r2(240 * (0.5 + Math.min(3, campo.cuidado ?? 0) / 6) * m.clima * mejora);
      guardar(a, 'cereal', cosecha);
      campo.fase = 0;
      campo.trabajo = 0;
      campo.cuidado = 0;
    }
    return fuerza;
  }
  return 0;
}

function obraLista(a: Aldea): boolean {
  if (!a.obra) return false;
  if (a.obra.pagada) return true;
  const coste = EDIFICIO[a.obra.tipo].coste;
  return Object.keys(coste).every((k) => (a.despensa[k] ?? 0) >= coste[k]);
}

function construir(m: Mundo, p: Persona, c: Contexto): number {
  const a = c.a;
  const obra = a.obra;
  if (!obra || !obraLista(a)) return 0;
  const tipo = EDIFICIO[obra.tipo];
  if (!obra.pagada) {
    for (const [k, v] of Object.entries(tipo.coste)) a.despensa[k] = r2(a.despensa[k] - v);
    obra.pagada = true;
  }
  p.x = obra.x;
  p.y = obra.y;
  const ritmo = (0.6 + 0.4 * p.genes.fuerza) * (sabe(p, 'hacha') ? 1.2 : 1) * c.herramienta * (conoce(a, 'numeros') ? 1.15 : 1);
  obra.progreso = r2(obra.progreso + ritmo / tipo.trabajo);
  if (obra.progreso >= 1) terminarObra(m, a);
  return ritmo;
}

function terminarObra(m: Mundo, a: Aldea): void {
  const obra = a.obra;
  if (!obra) return;
  a.obra = null;
  const e: Aldea['edificios'][number] = { tipo: obra.tipo, x: obra.x, y: obra.y };
  if (obra.tipo === 'campo') {
    e.fase = 0;
    e.trabajo = 0;
    e.cuidado = 0;
    const i = obra.y * m.ancho + obra.x;
    if (m.terreno[i] === BOSQUE) {
      // Se tala el bosque para cultivar.
      m.terreno[i] = PRADERA;
      m.recursos.madera[i] = 0;
    }
  }
  if (obra.tipo === 'corral') {
    const n = Math.min(Math.floor(a.despensa.cria ?? 0), 6);
    e.animales = n;
    e.especie = especieCorral(m, a);
    a.despensa.cria = r2((a.despensa.cria ?? 0) - n);
  }
  if (obra.tipo === 'gallinero') {
    // Se empieza con unas cuantas aves del campo atrapadas con cestas.
    e.animales = 6;
    e.especie = 'gallina';
  }
  a.edificios.push(e);
  const tipo = EDIFICIO[obra.tipo];
  if (!m.construidos.includes(obra.tipo)) {
    m.construidos.push(obra.tipo);
    anotar(m, 'edificio', `En ${a.nombre} se levanta ${articulo(tipo)} por primera vez en el mundo.`, a.id);
  } else if (['cerca', 'empalizada', 'muralla', 'archivo', 'mercado'].includes(obra.tipo) && cuantos(a, obra.tipo) === 1) {
    anotar(m, 'edificio', `${a.nombre} ya tiene ${articulo(tipo)}.`, a.id);
  }
}

/** Ritmo al que cría cada especie (por día) en el corral. */
const RITMO_CRIA: Record<string, number> = { oveja: 0.0025, cabra: 0.003, cerdo: 0.004, vaca: 0.0015, caballo: 0.0015 };
/** Lo que da de carne cada especie respecto a la oveja. */
const CARNE: Record<string, number> = { oveja: 1, cabra: 0.9, cerdo: 1.4, vaca: 1.3, caballo: 0.5 };

/** Qué animales se crían en un corral nuevo: los que se dan en las tierras de alrededor (y no los que ya tienen). */
function especieCorral(m: Mundo, a: Aldea): string {
  const peso: Record<string, number> = { oveja: 0.2, cabra: 0, cerdo: 0, vaca: 0, caballo: 0 };
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const x = a.x + dx;
      const y = a.y + dy;
      if (x < 0 || y < 0 || x >= m.ancho || y >= m.alto) continue;
      const t = m.terreno[y * m.ancho + x];
      if (t === PRADERA) {
        peso.oveja += 1;
        peso.vaca += 0.7;
      } else if (t === ESTEPA) {
        peso.oveja += 0.8;
        peso.caballo += 1.2;
      } else if (t === COLINA) {
        peso.cabra += 1;
        peso.oveja += 0.5;
      } else if (t === MONTANA) peso.cabra += 1.2;
      else if (t === BOSQUE) peso.cerdo += 1;
      else if (t === PANTANO) peso.cerdo += 0.5;
    }
  }
  // Las vacas, con quien ya cultiva; los caballos, con quien sabe domarlos.
  if (!conoce(a, 'campo')) peso.vaca = 0;
  if (!conoce(a, 'doma')) peso.caballo = 0;
  for (const e of a.edificios) if (e.tipo === 'corral' && e.especie && peso[e.especie]) peso[e.especie] *= 0.25;
  return elegirPeso(Object.keys(peso), (k) => peso[k]) ?? 'oveja';
}

/** Cuántos animales caben en un corral (con granja, muchos más). */
export const capacidadCorral = (a: Aldea): number => (tiene(a, 'granja') ? 40 : 25);

/** Si en la aldea montan a caballo. */
export const aCaballo = (a: Aldea): boolean => conoce(a, 'doma') && a.edificios.some((e) => e.tipo === 'corral' && e.especie === 'caballo' && (e.animales ?? 0) >= 2);

function articulo(t: TipoEdificio): string {
  const n = t.nombre.toLowerCase();
  const fem = ['hoguera', 'choza', 'casa de adobe', 'cerca', 'granja', 'empalizada', 'muralla', 'casa de las tablillas'].includes(n);
  return `${fem ? 'una' : 'un'} ${n}`;
}

/** Cada pocos días la aldea decide qué construir después. */
export function planificar(m: Mundo, a: Aldea, gente: Persona[]): void {
  if (a.obra) return;
  const n = gente.length;
  const capacidad = cuantos(a, 'choza') * 5 + cuantos(a, 'casa') * 7;
  const grano = (a.despensa.cereal ?? 0) + (a.despensa.semillas ?? 0);
  const opciones: [string, number][] = [];
  if (conoce(a, 'fuego') && !tiene(a, 'hoguera')) opciones.push(['hoguera', 1]);
  if (capacidad < n) {
    if (conoce(a, 'adobe')) opciones.push(['casa', 0.9]);
    else if (conoce(a, 'choza')) opciones.push(['choza', 0.9]);
  }
  if (conoce(a, 'campo') && cuantos(a, 'campo') < Math.ceil(n * 0.6) + 2 && grano >= 4) opciones.push(['campo', 0.85]);
  if (conoce(a, 'corral') && (a.despensa.cria ?? 0) >= 2 && cuantos(a, 'corral') < 1 + n / 25) opciones.push(['corral', 0.7]);
  if (conoce(a, 'gallinero') && cuantos(a, 'gallinero') < 1 + Math.floor(n / 30)) opciones.push(['gallinero', 0.75]);
  if (conoce(a, 'granja') && tiene(a, 'corral') && !tiene(a, 'granja') && n >= 15) opciones.push(['granja', 0.6]);
  if (conoce(a, 'vasija') && !tiene(a, 'almacen')) opciones.push(['almacen', 0.6]);
  if (conoce(a, 'horno') && !tiene(a, 'horno')) opciones.push(['horno', 0.6]);
  // Los muros, sobre todo si el consejo teme un ataque o está en guerra.
  const peligro = a.consejo?.prioridad === 'defensa' || !!a.consejo?.guerra || a.amenaza > 0.3;
  // Con fieras rondando, lo primero es una cerca de estacas atadas alrededor de casas y corrales.
  const muro = tiene(a, 'cerca') || tiene(a, 'empalizada') || tiene(a, 'muralla');
  if (conoce(a, 'cuerda') && !muro && n >= 5 && (peligro || a.amenaza > 0.12)) opciones.push(['cerca', 1.05]);
  if (conoce(a, 'empalizada') && !tiene(a, 'empalizada') && n >= 12) opciones.push(['empalizada', peligro ? 1.1 : 0.5]);
  if (conoce(a, 'muralla') && tiene(a, 'empalizada') && !tiene(a, 'muralla') && n >= 18) opciones.push(['muralla', peligro ? 1.2 : 0.4]);
  if (conoce(a, 'escritura') && !tiene(a, 'archivo')) opciones.push(['archivo', 0.5]);
  if (conoce(a, 'comercio') && !tiene(a, 'mercado')) opciones.push(['mercado', 0.4]);
  opciones.sort((x, y) => y[1] - x[1]);
  for (const [tipo] of opciones) {
    const sitio = lugarPara(m, a, tipo);
    if (sitio < 0) continue;
    a.obra = { tipo, x: sitio % m.ancho, y: Math.floor(sitio / m.ancho), progreso: 0, pagada: false };
    return;
  }
}

function lugarPara(m: Mundo, a: Aldea, tipo: string): number {
  // Los muros rodean la aldea: se apuntan en su centro.
  const rodea = (t: string) => t === 'cerca' || t === 'empalizada' || t === 'muralla';
  if (rodea(tipo)) return a.y * m.ancho + a.x;
  const ocupadas = new Set<number>();
  for (const b of m.aldeas) {
    for (const e of b.edificios) if (!rodea(e.tipo)) ocupadas.add(e.y * m.ancho + e.x);
    if (b.obra && !rodea(b.obra.tipo)) ocupadas.add(b.obra.y * m.ancho + b.obra.x);
    // Sobre las tumbas no se construye.
    if (b.cementerio) ocupadas.add(b.cementerio.y * m.ancho + b.cementerio.x);
  }
  if (tipo === 'campo') {
    return mejorCasilla(m, a.x, a.y, 4, (i, d) => {
      if (ocupadas.has(i) || d < 1 || !alcanzable(m, a, i, false)) return 0;
      const t = m.terreno[i];
      const apto = t === PRADERA ? 3 : t === ESTEPA ? 2 : t === BOSQUE ? 1.5 : t === ORILLA ? 1 : t === PANTANO ? 0.5 : 0;
      return apto / (1 + d * 0.2);
    });
  }
  return mejorCasilla(m, a.x, a.y, 3, (i, d) => {
    if (ocupadas.has(i) || !alcanzable(m, a, i, false)) return 0;
    const t = m.terreno[i];
    if (t === AGUA || t === MONTANA || t === RIO) return 0;
    if (tipo === 'hoguera') return 2 / (1 + d);
    return d < 1 ? 0 : 1 / (1 + d);
  });
}

/** La comida se estropea, los animales crían y la hoguera quema leña. */
export function mantener(m: Mundo, a: Aldea, est: number, diaDelAnio: number): boolean {
  const conserva = (tiene(a, 'almacen') ? 0.4 : 1) * (conoce(a, 'numeros') ? 0.8 : 1);
  for (const mat of ORDEN_COMER) {
    const v = a.despensa[mat];
    if (v) a.despensa[mat] = r2(v - v * (MATERIAL[mat].pudre ?? 0) * conserva);
  }
  const corrales = a.edificios.filter((e) => e.tipo === 'corral');
  const cabe = capacidadCorral(a);
  if (a.despensa.cria) {
    for (const c of corrales) {
      const hueco = Math.min(Math.floor(a.despensa.cria), cabe - (c.animales ?? 0));
      if (hueco > 0) {
        c.animales = (c.animales ?? 0) + hueco;
        a.despensa.cria = r2(a.despensa.cria - hueco);
      }
    }
    // Sin corral, las crías se escapan o se mueren.
    a.despensa.cria = r2(a.despensa.cria * 0.99);
  }
  // Crían cada uno a su ritmo; con granja (establo y pajar), más.
  const granja = tiene(a, 'granja') ? 1.4 : 1;
  for (const c of corrales) {
    const n = c.animales ?? 0;
    const esp = c.especie ?? 'oveja';
    if (n >= 2) c.animales = r2(n + n * (RITMO_CRIA[esp] ?? 0.0025) * granja * (1 - n / cabe));
    // Leche de cabras y vacas; lana de las ovejas en primavera.
    if (n >= 1 && conoce(a, 'ordeno') && (esp === 'cabra' || esp === 'vaca')) guardar(a, 'leche', r2(n * (esp === 'vaca' ? 0.1 : 0.05)));
    if (n >= 1 && conoce(a, 'esquileo') && esp === 'oveja' && est === 0) guardar(a, 'lana', r2(n * 0.02));
  }
  // Las gallinas ponen huevos cada día y sacan pollitos.
  for (const g of a.edificios) {
    if (g.tipo !== 'gallinero') continue;
    const n = g.animales ?? 0;
    if (n >= 1 && est !== 3) guardar(a, 'huevos', r2(n * 0.08));
    if (n >= 2) g.animales = r2(n + n * 0.006 * (1 - n / 30));
  }
  // La leche que sobra se cuaja en quesos que aguantan meses.
  if (conoce(a, 'queseria') && (a.despensa.leche ?? 0) > 2) {
    const q = r2(a.despensa.leche * 0.3);
    a.despensa.leche = r2(a.despensa.leche - q);
    guardar(a, 'queso', r2(q * 0.6));
  }
  if (est === 3 && diaDelAnio === 90) {
    // Llega el invierno: lo que no se cosechó se pierde.
    for (const e of a.edificios) if (e.tipo === 'campo' && e.fase === 1) e.fase = 0;
  }
  let encendida = false;
  if (tiene(a, 'hoguera')) {
    const lena = est === 3 ? 0.5 : 0.1;
    if ((a.despensa.madera ?? 0) >= lena) {
      a.despensa.madera = r2(a.despensa.madera - lena);
      encendida = true;
    }
  }
  return encendida;
}

/** Se reparte la comida a partes iguales. Quien tiene reservas bajas come un poco más. */
export function comer(m: Mundo, a: Aldea, gente: Persona[]): void {
  if (!gente.length) return;
  let quiere = 0;
  const racion = gente.map((p) => {
    const r = necesidad(m, p) * (p.reservas < 6 ? 1.3 : 1);
    quiere += r;
    return r;
  });
  let hay = 0;
  for (const mat of ORDEN_COMER) {
    const v = a.despensa[mat] ?? 0;
    const n = alimento(a, mat);
    if (v <= 0 || n <= 0) continue;
    const toma = Math.min(v * n, quiere - hay);
    a.despensa[mat] = r2(v - toma / n);
    hay += toma;
    if (hay >= quiere - 1e-9) break;
  }
  const f = quiere > 0 ? Math.min(1, hay / quiere) : 1;
  gente.forEach((p, k) => {
    const nec = necesidad(m, p);
    let r = p.reservas + (f * racion[k]) / nec - 1;
    if (r < 0) {
      p.salud = r2(p.salud + 0.04 * r);
      p.causa = 'hambre';
      r = 0;
    }
    p.reservas = r2(Math.min(8, r));
  });
}
