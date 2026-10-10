// El tiempo de cada día: sol, nubes, niebla, lluvia o tormenta. Cambia solo según la
// estación y el año (en los secos apenas llueve) y tiene consecuencias: la lluvia
// apaga los incendios y crece los ríos, los rayos de las tormentas prenden el bosque
// y con tormenta casi no se puede trabajar fuera.

import { elegirPeso, prob } from './azar.ts';
import type { Mundo, Tiempo } from './tipos.ts';

const TIPOS: Tiempo[] = ['sol', 'nubes', 'niebla', 'lluvia', 'tormenta'];
/** Lo probable de cada tiempo en cada estación (sol, nubes, niebla, lluvia, tormenta). */
const PESOS = [
  [0.34, 0.27, 0.06, 0.27, 0.06],
  [0.58, 0.17, 0.02, 0.1, 0.13],
  [0.3, 0.3, 0.1, 0.26, 0.04],
  [0.3, 0.35, 0.08, 0.26, 0.01],
];

/** Cada día el tiempo sigue como estaba o cambia; las tormentas duran poco. */
export function cambiarTiempo(m: Mundo, est: number): void {
  const ahora = m.tiempo ?? 'sol';
  if (prob(ahora === 'tormenta' ? 0.25 : ahora === 'niebla' ? 0.3 : 0.55)) return;
  // Año húmedo, más lluvia; año seco, sol y poco más.
  const humedo = m.clima * m.clima;
  const pesos = PESOS[est];
  m.tiempo = elegirPeso(TIPOS, (t) => {
    const k = TIPOS.indexOf(t);
    return pesos[k] * (t === 'lluvia' || t === 'tormenta' ? humedo : t === 'sol' ? 2 - m.clima : 1);
  }) ?? 'sol';
}

export const llueve = (m: Mundo): boolean => m.tiempo === 'lluvia' || m.tiempo === 'tormenta';

/** Lo que rinde trabajar fuera con este tiempo. */
export const rindeFuera = (m: Mundo): number => (m.tiempo === 'tormenta' ? 0.6 : m.tiempo === 'lluvia' ? 0.9 : 1);
