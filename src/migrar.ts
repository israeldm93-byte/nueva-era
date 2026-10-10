// Pone al día mundos guardados con versiones anteriores del motor, sin reiniciarlos.

import { azar, estadoAzar, fijarAzar } from './azar.ts';
import { AGUA, MONTANA, RIO } from './catalogo.ts';
import { ALTO, ANCHO, VERSION_ESTADO } from './config.ts';
import { poblarFauna } from './fauna.ts';
import { anillo, generarTerreno, masas, puntuarSitio } from './mapa.ts';
import { distancia } from './matematicas.ts';
import { ESCALA, menteNueva } from './mente.ts';
import type { Aldea, Mundo } from './tipos.ts';

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
    m.anual.aciertos = 0;
    m.anual.predicciones = 0;
    // Las mentes nuevas ya nacen con los pesos de la versión 3.
    m.version = 3;
    m.azar = estadoAzar();
  }
  if (m.version === 2) {
    // Versión 3: los pesos de las mentes pasan de centésimas a milésimas (piensan
    // exactamente igual, pero ahora aprenden con más finura) y se miden sus aciertos.
    for (const p of m.personas) p.mente = p.mente.map((w) => w * (ESCALA / 100));
    m.anual.aciertos ??= 0;
    m.anual.predicciones ??= 0;
    m.version = 3;
  }
  if (m.version === 3) {
    // Versión 4: un mapa mucho más grande y variado (grandes lagos con islas, ríos,
    // estepas, pantanos, desiertos), fieras que viven en él, incendios y crecidas.
    // Cada aldea, con su gente y todo lo que sabe, pasa a un buen sitio del mapa
    // nuevo cerca de donde estaba en el viejo.
    fijarAzar(m.azar);
    mapaNuevo(m);
    m.version = 4;
    m.azar = estadoAzar();
  }
  if (m.version !== VERSION_ESTADO) throw new Error(`No sé migrar un mundo de la versión ${m.version}.`);
  return m;
}

function mapaNuevo(m: Mundo): void {
  const viejoAncho = m.ancho;
  const viejoAlto = m.alto;
  const sigue = estadoAzar();
  fijarAzar((Math.imul(m.semilla ^ 0x5bd1e995, 2246822519) + m.era) >>> 0);
  const { terreno, recursos, relieve } = generarTerreno(ANCHO, ALTO);
  fijarAzar(sigue);
  m.ancho = ANCHO;
  m.alto = ALTO;
  m.terreno = terreno;
  m.recursos = recursos;
  m.relieve = relieve;
  m.fauna = [];
  m.incendios = [];
  m.cenizas = [];
  m.inundadas = [];
  m.avisos = {};
  m.ruinas = [];
  const { masa, continente } = masas(m);
  const gente = (a: Aldea) => m.personas.filter((p) => p.aldea === a.id).length;
  const vivas = m.aldeas.filter((a) => a.abandonada === null).sort((a, b) => gente(b) - gente(a) || a.id - b.id);
  const puestas: Aldea[] = [];
  for (const a of vivas) {
    const px = Math.round((a.x / viejoAncho) * ANCHO);
    const py = Math.round((a.y / viejoAlto) * ALTO);
    let mejor = { x: px, y: py };
    let max = -1;
    for (const [dx, dy, d] of anillo(30)) {
      const x = px + dx;
      const y = py + dy;
      if (x < 2 || y < 2 || x >= ANCHO - 2 || y >= ALTO - 2) continue;
      if (masa[y * ANCHO + x] !== continente) continue;
      if (puestas.some((b) => distancia(b.x - x, b.y - y) < 8)) continue;
      const v = puntuarSitio(m, x, y) / (1 + d / 15);
      if (v > max) {
        max = v;
        mejor = { x, y };
      }
    }
    const dx = mejor.x - a.x;
    const dy = mejor.y - a.y;
    a.x = mejor.x;
    a.y = mejor.y;
    const ocupadas = new Set<number>();
    const valida = (i: number) => {
      const t = m.terreno[i];
      return t !== AGUA && t !== RIO && t !== MONTANA && masa[i] === masa[a.y * ANCHO + a.x] && !ocupadas.has(i);
    };
    const colocar = (e: { x: number; y: number; tipo: string }) => {
      if (e.tipo === 'cerca' || e.tipo === 'empalizada' || e.tipo === 'muralla') {
        e.x = a.x;
        e.y = a.y;
        return;
      }
      const x0 = Math.min(ANCHO - 1, Math.max(0, e.x + dx));
      const y0 = Math.min(ALTO - 1, Math.max(0, e.y + dy));
      for (const [ox, oy] of anillo(5)) {
        const x = x0 + ox;
        const y = y0 + oy;
        if (x < 0 || y < 0 || x >= ANCHO || y >= ALTO) continue;
        const i = y * ANCHO + x;
        if (!valida(i)) continue;
        e.x = x;
        e.y = y;
        ocupadas.add(i);
        return;
      }
      e.x = a.x;
      e.y = a.y;
    };
    for (const e of a.edificios) colocar(e);
    if (a.obra) colocar(a.obra);
    for (const p of m.personas) {
      if (p.aldea !== a.id) continue;
      p.x = a.x;
      p.y = a.y;
    }
    puestas.push(a);
  }
  // De las aldeas abandonadas no queda rastro en las tierras nuevas.
  for (const a of m.aldeas) {
    if (a.abandonada === null) continue;
    a.edificios = [];
    a.obra = null;
    a.x = Math.min(ANCHO - 1, Math.round((a.x / viejoAncho) * ANCHO));
    a.y = Math.min(ALTO - 1, Math.round((a.y / viejoAlto) * ALTO));
  }
  poblarFauna(m);
}
