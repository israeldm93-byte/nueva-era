// Pone al día mundos guardados con versiones anteriores del motor, sin reiniciarlos.

import { azar, estadoAzar, fijarAzar } from './azar.ts';
import { VERSION_ESTADO } from './config.ts';
import { menteNueva } from './mente.ts';
import type { Mundo } from './tipos.ts';

export function migrar(m: Mundo): Mundo {
  if (m.version === 1) {
    // Versión 2: mentes, opiniones, consejo, facciones, relaciones y agresividad.
    fijarAzar(m.azar);
    for (const p of m.personas) {
      p.genes.agresividad = Math.round((0.3 + 0.4 * azar()) * 1000) / 1000;
      p.mente = menteNueva();
      p.recompensa = 0.5;
      p.opinion = 'comida';
      p.faccion = null;
    }
    for (const a of m.aldeas) {
      a.consejo = null;
      a.facciones = [];
      a.amenaza = 0;
    }
    m.relaciones = {};
    m.anual.asaltos = 0;
    m.version = 2;
    m.azar = estadoAzar();
  }
  if (m.version !== VERSION_ESTADO) throw new Error(`No sé migrar un mundo de la versión ${m.version}.`);
  return m;
}
