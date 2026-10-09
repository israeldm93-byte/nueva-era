// La mente de cada aldeano: una red neuronal pequeña (18 entradas, 6 neuronas
// ocultas, 12 salidas). Mira cómo está (hambre, salud, edad), cómo está su aldea
// (comida, leña, materiales, obras, campos), la estación y lo que ha decidido el
// consejo, y da a cada actividad un empujón a favor o en contra.
//
// Cada salida es lo que esa persona espera que le rinda cada actividad en la
// situación que vive, comparado con lo que suele aportar su aldea. Aprende de dos
// maneras:
//   - Durante su vida: al anochecer compara lo que esperaba de lo que hizo con lo
//     que de verdad aportó y corrige su error (aprendizaje por refuerzo). Cuando
//     acierta, deja de cambiar; si las cosas cambian, vuelve a aprender.
//   - Entre generaciones: cada hijo hereda la mente del padre o la madre al que
//     mejor le ha ido (con lo que aprendió) y alguna mutación.
//
// Los pesos se guardan en milésimas (enteros entre -4000 y 4000) para que el
// mundo guardado ocupe poco y todo sea exacto.

import { normal, prob } from './azar.ts';
import { tanh } from './matematicas.ts';

export const PRIORIDADES = ['comida', 'invierno', 'obras', 'saber', 'expandir', 'defensa'];
export const ENTRADAS = [
  'sesgo', 'hambre', 'debilidad', 'edad', 'escasez', 'frio', 'cosecha', 'madera', 'materiales', 'obra', 'campos', 'amenaza',
  ...PRIORIDADES.map((p) => `c_${p}`),
];
export const ACCIONES = ['recolectar', 'cazar', 'pescar', 'lenar', 'picar', 'barro', 'cultivar', 'pastorear', 'construir', 'experimentar', 'descansar', 'vigilar'];

/** Actividades que el consejo empuja con cada prioridad. */
export const ALINEADAS: Record<string, string[]> = {
  comida: ['recolectar', 'cazar', 'pescar', 'cultivar', 'pastorear'],
  invierno: ['lenar', 'cazar'],
  obras: ['construir', 'lenar', 'picar', 'barro'],
  saber: ['experimentar'],
  expandir: [],
  defensa: ['vigilar', 'construir'],
};

const NE = ENTRADAS.length;
const NO = 6;
const NS = ACCIONES.length;
const BASE = NE * NO;
export const NPESOS = BASE + (NO + 1) * NS;
/** Los pesos son enteros: milésimas. */
export const ESCALA = 1000;
const LIMITE = 4 * ESCALA;
/** Ritmo de aprendizaje de la capa de salida y de las neuronas ocultas. */
const RITMO_SALIDA = 0.08;
const RITMO_OCULTA = 0.025;

const acotar = (w: number) => (w > LIMITE ? LIMITE : w < -LIMITE ? -LIMITE : w);

export function menteNueva(): number[] {
  const m: number[] = [];
  for (let i = 0; i < NPESOS; i++) m.push(acotar(Math.round(normal() * 0.3 * ESCALA)));
  return m;
}

/**
 * El hijo aprende a pensar como el padre o la madre al que mejor le ha ido (mezclar
 * dos redes distintas peso a peso daría una mente incoherente), con alguna mutación.
 */
export function heredarMente(modelo: number[]): number[] {
  const h: number[] = [];
  for (let i = 0; i < NPESOS; i++) {
    let w = modelo[i];
    if (prob(0.06)) w += Math.round(normal() * 0.4 * ESCALA);
    h.push(acotar(w));
  }
  return h;
}

export interface Pensamiento {
  ocultas: number[];
  salidas: number[];
}

export function pensar(mente: number[], x: number[]): Pensamiento {
  const ocultas: number[] = [];
  for (let j = 0; j < NO; j++) {
    let s = 0;
    for (let i = 0; i < NE; i++) s += x[i] * mente[j * NE + i];
    ocultas.push(tanh(s / ESCALA));
  }
  const salidas: number[] = [];
  for (let k = 0; k < NS; k++) {
    const fila = BASE + k * (NO + 1);
    let s = mente[fila + NO];
    for (let j = 0; j < NO; j++) s += ocultas[j] * mente[fila + j];
    salidas.push(tanh(s / ESCALA));
  }
  return { ocultas, salidas };
}

/**
 * Corrige lo que esperaba de la acción que eligió con lo que de verdad le rindió
 * (su ventaja sobre la media de la aldea ese día). Ajusta la capa de salida y, más
 * despacio, las neuronas ocultas: así aprenden a reconocer situaciones (por
 * ejemplo, «invierno y poca leña»), no solo gustos generales. Como corrige un
 * error, no se dispara: lo que ya predice bien deja de moverse.
 */
export function aprender(mente: number[], p: Pensamiento, accion: number, ventaja: number, x: number[]): void {
  const objetivo = ventaja > 0.9 ? 0.9 : ventaja < -0.9 ? -0.9 : ventaja;
  const error = objetivo - p.salidas[accion];
  const fila = BASE + accion * (NO + 1);
  for (let j = 0; j < NO; j++) {
    // Cuánto contribuyó cada neurona oculta (con el peso de antes de corregirlo).
    const culpa = error * (mente[fila + j] / ESCALA) * (1 - p.ocultas[j] * p.ocultas[j]);
    for (let i = 0; i < NE; i++) {
      if (x[i] === 0) continue;
      mente[j * NE + i] = acotar(mente[j * NE + i] + Math.round(RITMO_OCULTA * culpa * x[i] * ESCALA));
    }
    mente[fila + j] = acotar(mente[fila + j] + Math.round(RITMO_SALIDA * error * p.ocultas[j] * ESCALA));
  }
  mente[fila + NO] = acotar(mente[fila + NO] + Math.round(RITMO_SALIDA * error * ESCALA));
}

export interface Situacion {
  hambre?: number;
  debilidad?: number;
  edad?: number;
  escasez?: number;
  frio?: number;
  cosecha?: number;
  madera?: number;
  materiales?: number;
  obra?: number;
  campos?: number;
  amenaza?: number;
  consejo?: string;
}

export function entradas(s: Situacion): number[] {
  return [
    1,
    s.hambre ?? 0,
    s.debilidad ?? 0,
    s.edad ?? 0.5,
    s.escasez ?? 0,
    s.frio ?? 0,
    s.cosecha ?? 0,
    s.madera ?? 0,
    s.materiales ?? 0,
    s.obra ?? 0,
    s.campos ?? 0,
    s.amenaza ?? 0,
    ...PRIORIDADES.map((p) => (s.consejo === p ? 1 : 0)),
  ];
}

/** La acción que la mente prefiere por sí sola en una situación. */
export function preferida(mente: number[], s: Situacion): string {
  const { salidas } = pensar(mente, entradas(s));
  let k = 0;
  for (let i = 1; i < NS; i++) if (salidas[i] > salidas[k]) k = i;
  return ACCIONES[k];
}

/**
 * Test de sensatez: situaciones típicas con una reacción sensata. Para cada mente
 * se mira qué opción gana más peso respecto a un día normal (lo que cambia en su
 * cabeza al cambiar la situación): eso es lo que aprenden y heredan.
 */
export const PRUEBAS: { nombre: string; situacion: Situacion; buenas: string[] }[] = [
  { nombre: 'Llega el invierno y apenas queda leña', situacion: { frio: 1, madera: 1 }, buenas: ['lenar'] },
  { nombre: 'Hay hambre en la aldea', situacion: { hambre: 0.8, escasez: 0.9 }, buenas: ['recolectar', 'cazar', 'pescar', 'cultivar', 'pastorear'] },
  { nombre: 'Es otoño y hay campos que cosechar', situacion: { cosecha: 1, campos: 1 }, buenas: ['cultivar'] },
  { nombre: 'El consejo pide obras y hay materiales', situacion: { obra: 1, consejo: 'obras' }, buenas: ['construir'] },
  { nombre: 'Faltan materiales para construir', situacion: { materiales: 1 }, buenas: ['picar', 'barro', 'lenar'] },
  { nombre: 'Les acaban de atacar', situacion: { amenaza: 1, consejo: 'defensa' }, buenas: ['vigilar'] },
];

const NORMAL: Situacion = { hambre: 0.25, escasez: 0.2, edad: 0.5 };

/** Porcentaje de mentes que reaccionan con sensatez en cada prueba. */
export function examinar(mentes: number[][]): number[] {
  return PRUEBAS.map((t) => {
    if (!mentes.length) return 0;
    let bien = 0;
    for (const m of mentes) {
      const base = pensar(m, entradas(NORMAL)).salidas;
      const ahora = pensar(m, entradas({ ...NORMAL, ...t.situacion })).salidas;
      let k = 0;
      for (let i = 1; i < NS; i++) if (ahora[i] - base[i] > ahora[k] - base[k]) k = i;
      if (t.buenas.includes(ACCIONES[k])) bien++;
    }
    return Math.round((bien / mentes.length) * 100) / 100;
  });
}
