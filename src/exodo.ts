// El éxodo: los que se van no aparecen por arte de magia en su nueva tierra. Salen de
// la aldea con lo que pueden cargar y caminan días o semanas; por el camino cazan y
// recogen lo que encuentran, y alguno puede quedarse enterrado en él. Al llegar,
// levantan su aldea y desde entonces son un pueblo aparte.

import { elegir, entero, prob } from './azar.ts';
import { AGUA, MONTANA, ORDEN_COMER } from './catalogo.ts';
import { anotar } from './cronica.ts';
import { aCaballo, apuntar, conoce, deTiro } from './economia.ts';
import { riesgoNaufragio } from './exploracion.ts';
import { deUltramar, direccion } from './mapa.ts';
import { diasEntre, pisar } from './caminos.ts';
import { estacionDe } from './mundo.ts';
import { morir } from './sociedad.ts';
import type { Aldea, Mundo, Persona } from './tipos.ts';

const r2 = (x: number) => Math.round(x * 100) / 100;

/** Lo que se llevan, por persona: comida para el camino y lo justo para empezar. */
const CARGA: Record<string, number> = { piel: 3, fibra: 3, hierbas: 1, madera: 1, cria: 0.3, lana: 2 };
for (const c of ORDEN_COMER) CARGA[c] = 12;

/** Lo que es cada pueblo, según lo que defendían cuando se fueron. */
export const LEMA: Record<string, string> = {
  comida: 'un pueblo de labradores y pastores',
  invierno: 'un pueblo previsor, que no teme al invierno',
  obras: 'un pueblo de constructores',
  saber: 'un pueblo de sabios y curiosos',
  expandir: 'un pueblo de caminantes y exploradores',
  defensa: 'un pueblo de guerreros',
};

/** Reparte la despensa: los que se van cargan lo que pueden (más con caballos o carros). */
export function cargar(origen: Aldea, b: Aldea, personas: number, parte: number): void {
  const bestias = deTiro(origen) ? 2.5 : aCaballo(origen) ? 1.6 : 1;
  for (const [k, v] of Object.entries(origen.despensa)) {
    const lleva = r2(Math.min(v * parte, (CARGA[k] ?? 0) * personas * bestias));
    if (lleva <= 0) continue;
    apuntar(b, k, lleva);
    apuntar(origen, k, v - lleva);
  }
}

/** Se ponen en camino desde la aldea vieja hacia su nueva tierra. */
export function partir(m: Mundo, b: Aldea, origen: Aldea, hasta: { x: number; y: number }, gente: Iterable<Persona>): void {
  // A pie, casilla y media al día con niños y fardos; a caballo, bastante más.
  const paso = aCaballo(origen) ? 2.2 : 1.4;
  // (Por los caminos que haya se va más deprisa; y los que se van dejan huella.)
  b.viaje = { desde: [origen.x, origen.y], hasta: [hasta.x, hasta.y], salida: m.t, dias: Math.max(3, Math.ceil(diasEntre(m, [origen.x, origen.y], [hasta.x, hasta.y], paso) - 1e-9)) };
  pisar(m, origen.x, origen.y, hasta.x, hasta.y, Math.min(100, 5 * [...gente].length));
  b.x = origen.x;
  b.y = origen.y;
  for (const p of gente) {
    p.x = b.x;
    p.y = b.y;
  }
}

function pisable(m: Mundo, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= m.ancho || y >= m.alto) return false;
  const t = m.terreno[y * m.ancho + x];
  return t !== AGUA && t !== MONTANA;
}

/** Un día más de camino; al final, llegan y fundan. */
export function caminar(m: Mundo, a: Aldea, gente: Persona[]): void {
  const v = a.viaje;
  if (!v) return;
  const f = (m.t - v.salida) / v.dias;
  if (f >= 1 || !gente.length) {
    llegar(m, a, gente);
    return;
  }
  const x = Math.round(v.desde[0] + (v.hasta[0] - v.desde[0]) * f);
  const y = Math.round(v.desde[1] + (v.hasta[1] - v.desde[1]) * f);
  // Cruzar el mar abierto hacia ultramar tiene sus riesgos: alguna barca puede volcar.
  if (m.terreno[y * m.ancho + x] === AGUA && deUltramar(v.hasta[0], v.hasta[1]) && gente.length > 1 && prob(riesgoNaufragio(m, conoce(a, 'vela'), estacionDe(m.t) === 3))) {
    const quedan = gente.slice();
    const ahogados: Persona[] = [];
    for (let k = 1 + entero(3); k > 0 && quedan.length > 1; k--) {
      const p = elegir(quedan);
      quedan.splice(quedan.indexOf(p), 1);
      morir(p, 'ahogado');
      ahogados.push(p);
    }
    const nombres = ahogados.map((p) => p.nombre);
    const quien = nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}` : nombres[0];
    anotar(m, 'exploracion', `Cruzando el mar hacia su nueva tierra, ${m.tiempo === 'tormenta' ? 'en plena tormenta, ' : ''}una de las barcas de los ${a.nombre} vuelca: ${nombres.length > 1 ? 'se ahogan' : 'se ahoga'} ${quien}.`, a.id);
  }
  // Por agua o por los picos no se acampa: se espera a pisar tierra otra vez.
  if (pisable(m, x, y)) {
    a.x = x;
    a.y = y;
  }
  for (const p of gente) {
    p.x = a.x;
    p.y = a.y;
  }
}

function llegar(m: Mundo, a: Aldea, gente: Persona[]): void {
  const v = a.viaje;
  if (!v) return;
  delete a.viaje;
  a.x = v.hasta[0];
  a.y = v.hasta[1];
  a.movida = m.t;
  a.fundada = m.t;
  for (const p of gente) {
    p.x = a.x;
    p.y = a.y;
  }
  if (!gente.length) return;
  const origen = m.aldeas.find((b) => b.id === a.origen);
  const dias = m.t - v.salida;
  const donde = origen ? `, al ${direccion(origen, a.x, a.y).replace(/^el /, '')} de ${origen.nombre},` : '';
  const lema = a.valor ? ` Desde hoy son ${LEMA[a.valor] ?? 'un pueblo aparte'}.` : '';
  anotar(m, 'fundacion', `Tras ${dias} días de camino, los ${a.nombre} llegan a su nueva tierra${donde} y levantan allí su aldea.${lema}`, a.id);
}
