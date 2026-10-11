// Viajes de visita entre aldeas lejanas emparentadas.
//
// Una aldea nacida de un cisma puede acabar a muchos días de camino de la que dejó: tan
// lejos que sus vecinos nunca se cruzan. Pero los lazos no se cortan del todo: de vez en
// cuando alguien (quien tiene allí familia o amigos, o el curioso y el ambicioso) hace el
// camino a pie, pasa unos días con ellos y vuelve. Con él viajan las palabras, los saberes
// y las noticias; en la estancia pueden nacer amistades, rencillas y hasta bodas; y según
// cómo vaya, la vieja relación entre las dos aldeas mejora o empeora.
//
// Nada es instantáneo ni seguro: se sale poco (menos cuanto más lejos), nunca en invierno
// ni si en casa falta comida; ida y vuelta cuestan semanas en las que la aldea pierde
// unos brazos; y lo que el viajero aprende allí no llega a su aldea hasta que él vuelve.

import { elegir, elegirPeso, prob } from './azar.ts';
import { DIAS_ANIO } from './config.ts';
import { anotar } from './cronica.ts';
import { aCaballo, apuntar, comidaTotal, conoce, guardar } from './economia.ts';
import { aviso } from './fauna.ts';
import { hito, lazo } from './memoria.ts';
import { masas } from './mapa.ts';
import { distancia } from './matematicas.ts';
import { parentesco } from './migracion.ts';
import { aldeasVivas, edad, estacionDe, type Indices } from './mundo.ts';
import { convivir, relacion } from './politica.ts';
import { conversar, visita } from './sociedad.ts';
import type { Aldea, Mundo, Persona } from './tipos.ts';

const r4 = (x: number) => Math.round(x * 10000) / 10000;

/** Más cerca que esto ya se ven en los encuentros de siempre; más lejos no se va a pie. */
export const VIAJE_MIN = 24;
export const VIAJE_MAX = 150;
/** Días que pasa allí. */
const ESTANCIA = 5;

const clave = (a: Aldea, b: Aldea) => `${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`;
const emparentadas = (a: Aldea, b: Aldea) => a.origen === b.id || b.origen === a.id;

/** Días de camino entre dos puntos: a pie, 1,5 casillas al día; a caballo, el doble. */
export function diasDeCamino(a: Aldea, d: number): number {
  return Math.max(3, Math.ceil(d / (aCaballo(a) ? 3 : 1.5)));
}

/** ¿Puede alguien de `a` ir a visitar `b`? (Lo bastante lejos, alcanzable y sin enemistad.) */
export function destinoDeViaje(m: Mundo, a: Aldea, b: Aldea): boolean {
  if (a === b || b.abandonada !== null || b.viaje || a.viaje) return false;
  if (!emparentadas(a, b) && !m.contactos.includes(clave(a, b))) return false;
  const d = distancia(a.x - b.x, a.y - b.y);
  if (d < VIAJE_MIN || d > VIAJE_MAX) return false;
  const { masa } = masas(m);
  if (masa[a.y * m.ancho + a.x] !== masa[b.y * m.ancho + b.x] && !conoce(a, 'canoa')) return false;
  return relacion(m, a.id, b.id).rencor <= 0.7;
}

/** Cada día: los que están de viaje siguen su camino; y quizá alguien emprende uno. */
export function viajes(m: Mundo, ix: Indices): void {
  for (const p of m.personas) if (p.viaje && !p.muerto) seguir(m, p, ix);
  // En invierno nadie se echa a los caminos.
  if (estacionDe(m.t) === 3) return;
  const vivas = aldeasVivas(m);
  for (const a of vivas) {
    if (a.viaje) continue;
    const gente = ix.porAldea.get(a.id) ?? [];
    const candidatos = gente.filter((p) => puedeViajar(m, p));
    // Una aldea pequeña o con la despensa justa no puede prescindir de nadie tanto tiempo.
    if (candidatos.length < 3 || gente.filter((p) => edad(m, p) >= 16).length < 6) continue;
    if (comidaTotal(a) / Math.max(1, gente.length * 0.9) < 60) continue;
    for (const b of vivas) {
      if (!destinoDeViaje(m, a, b)) continue;
      // Con alguien ya de camino hacia allí, nadie más sale.
      if (gente.some((p) => p.viaje?.a === b.id)) continue;
      const allí = ix.porAldea.get(b.id) ?? [];
      if (!allí.length) continue;
      const d = distancia(a.x - b.x, a.y - b.y);
      // Como mucho, un viaje cada tres años en las mejores condiciones; más lejos, más raro.
      const ganas = (1 / (DIAS_ANIO * 3)) * Math.min(1, 50 / d);
      if (!prob(ganas)) continue;
      // Va quien tiene allí a los suyos, o el curioso, o el que busca hacerse un nombre.
      const motivo = (p: Persona) => {
        for (const q of allí) {
          const k = parentesco(p, q);
          if (k) return [k, q] as const;
        }
        return null;
      };
      const quien = elegirPeso(candidatos, (p) => 0.3 + p.genes.curiosidad + 0.5 * p.genes.ambicion + (motivo(p) ? 2 : 0));
      if (quien) partir(m, quien, a, b, motivo(quien));
    }
  }
}

/** Adulto, sano, bien comido y sin otra cosa entre manos. */
function puedeViajar(m: Mundo, p: Persona): boolean {
  const e = edad(m, p);
  return e >= 18 && e <= 55 && p.salud >= 0.8 && p.reservas >= 4 && !p.viaje && !p.mudanza && !p.muerto;
}

/** Se pone en camino. */
export function partir(m: Mundo, p: Persona, a: Aldea, b: Aldea, motivo: readonly [string, Persona] | null = null): void {
  const dias = diasDeCamino(a, distancia(a.x - b.x, a.y - b.y));
  p.viaje = { a: b.id, fase: 'ida', desde: [a.x, a.y], hasta: [b.x, b.y], salida: m.t, dias, conocio: [] };
  if (aviso(m, `viaje-${a.id}-${b.id}`, DIAS_ANIO)) {
    const por = motivo ? `: quiere ver a ${motivo[0]} ${motivo[1].nombre}` : '';
    anotar(m, 'viaje', `${p.nombre} sale de ${a.nombre} hacia ${b.nombre}, a ${dias} días de camino${por}.`, a.id);
  }
}

/** Un día más del viaje: llegar, pasar los días allí y volver. */
function seguir(m: Mundo, p: Persona, ix: Indices): void {
  const v = p.viaje!;
  const casa = m.aldeas.find((x) => x.id === p.aldea);
  const dest = m.aldeas.find((x) => x.id === v.a);
  // Se casó allí y se ha quedado: el viaje acabó.
  if (p.aldea === v.a) {
    delete p.viaje;
    return;
  }
  // Si su aldea ya no existe, se queda donde está (y si tampoco, en la más cercana).
  if (!casa || casa.abandonada !== null) {
    delete p.viaje;
    return;
  }
  // La aldea a la que iba ya no está: se da la vuelta desde donde esté.
  if ((!dest || dest.abandonada !== null) && v.fase !== 'vuelta') {
    darLaVuelta(m, p, casa, [p.x, p.y]);
    return;
  }
  const hecho = m.t - v.salida >= v.dias;
  if (v.fase === 'ida' && hecho) llegar(m, p, casa, dest!);
  else if (v.fase === 'estancia') {
    charlar(m, p, casa, dest!, ix);
    if (p.viaje && hecho) despedirse(m, p, casa, dest!);
  } else if (v.fase === 'vuelta' && hecho) volver(m, p, casa, dest);
}

function llegar(m: Mundo, p: Persona, casa: Aldea, dest: Aldea): void {
  const v = p.viaje!;
  v.fase = 'estancia';
  v.desde = [dest.x, dest.y];
  v.hasta = [dest.x, dest.y];
  v.salida = m.t;
  v.dias = ESTANCIA;
  p.x = dest.x;
  p.y = dest.y;
  const k = clave(casa, dest);
  const nueva = !m.contactos.includes(k);
  if (nueva) m.contactos.push(k);
  hito(m, p, 'visita', dest.nombre);
  // Lo que lleva a cuestas: un poco de lo que allí falta.
  regalar(casa, dest);
  if (aviso(m, `llega-${casa.id}-${dest.id}`, DIAS_ANIO)) {
    anotar(m, 'viaje', `${p.nombre}, de ${casa.nombre}, llega a ${dest.nombre} tras ${diasDeCamino(casa, distancia(casa.x - dest.x, casa.y - dest.y))} días de camino${nueva ? ': es la primera noticia que tienen unos de otros en mucho tiempo' : ''}.`, dest.id);
  }
}

/**
 * Un día en la otra aldea: habla con alguien (mejor si es de los suyos o un amigo).
 * Lo que enseña se queda allí; lo que aprende lo lleva consigo y no llega a su aldea
 * hasta que vuelva (por eso aprende «en la mochila», no en la aldea).
 */
function charlar(m: Mundo, p: Persona, casa: Aldea, dest: Aldea, ix: Indices): void {
  const locales = (ix.porAldea.get(dest.id) ?? []).filter((q) => edad(m, q) >= 14 && !q.viaje && !q.mudanza && !q.muerto);
  if (!locales.length) return;
  const cercanos = locales.filter((q) => parentesco(p, q) || lazo(p, q.id) > 0.2);
  const v = p.viaje!;
  for (let k = 0; k < 2 && p.viaje && p.aldea !== dest.id; k++) {
    const q = cercanos.length && prob(0.5) ? elegir(cercanos) : elegir(locales);
    const mochila: Aldea = { ...casa, conocidos: [...casa.conocidos], vistos: [...casa.vistos], archivo: [...casa.archivo] };
    visita(m, p, q, mochila, dest, ix);
    if (p.aldea === dest.id) break;
    conversar(m, q, p, dest, mochila, ix);
    if (!v.conocio.includes(q.id)) v.conocio.push(q.id);
  }
}

/** Se despide: según cómo le haya ido con ellos, la relación entre las dos aldeas cambia. */
function despedirse(m: Mundo, p: Persona, casa: Aldea, dest: Aldea): void {
  const v = p.viaje!;
  const rel = relacion(m, casa.id, dest.id);
  const rencor = rel.rencor;
  // Cómo se han llevado: lo que siente por los que trató allí, y ellos por él.
  let trato = 0;
  for (const id of v.conocio) {
    const q = m.personas.find((x) => x.id === id);
    trato += lazo(p, id) + (q ? lazo(q, p.id) : 0);
  }
  trato = v.conocio.length ? trato / (2 * v.conocio.length) : 0;
  if (trato > 0.04) {
    rel.afinidad = Math.min(1, r4(rel.afinidad + 0.04));
    rel.rencor = Math.max(0, r4(rel.rencor - 0.06));
  } else if (trato < -0.02) {
    rel.rencor = Math.min(1, r4(rel.rencor + 0.04));
    rel.afinidad = Math.max(0, r4(rel.afinidad - 0.02));
  }
  // El trato de siempre entre vecinos (y, si se llega a ello, una alianza).
  convivir(m, casa, dest, 0, 0);
  if (rencor >= 0.15 && rel.rencor < 0.15) {
    anotar(m, 'paz', `Entre ${casa.nombre} y ${dest.nombre} se olvidan las viejas rencillas: las visitas han hecho más que los años.`, casa.id);
  }
  darLaVuelta(m, p, casa, [dest.x, dest.y]);
}

function darLaVuelta(m: Mundo, p: Persona, casa: Aldea, desde: [number, number]): void {
  const v = p.viaje!;
  v.fase = 'vuelta';
  v.desde = desde;
  v.hasta = [casa.x, casa.y];
  v.salida = m.t;
  v.dias = diasDeCamino(casa, distancia(desde[0] - casa.x, desde[1] - casa.y));
}

/** De vuelta en casa: trae lo que aprendió y lo que le dieron. */
function volver(m: Mundo, p: Persona, casa: Aldea, dest: Aldea | undefined): void {
  p.x = casa.x;
  p.y = casa.y;
  delete p.viaje;
  const nuevos = p.saberes.filter((s) => !casa.conocidos.includes(s));
  for (const s of nuevos) casa.conocidos.push(s);
  if (dest) regalar(dest, casa);
  if (!dest) return;
  if (nuevos.length) {
    anotar(m, 'difusion', `${p.nombre} vuelve a ${casa.nombre} desde ${dest.nombre} y trae lo que allí aprendió: ${nuevos.length === 1 ? 'un saber nuevo' : `${nuevos.length} saberes nuevos`}.`, casa.id);
  } else if (aviso(m, `vuelve-${casa.id}-${dest.id}`, DIAS_ANIO)) {
    anotar(m, 'viaje', `${p.nombre} vuelve a ${casa.nombre} con noticias de ${dest.nombre}.`, casa.id);
  }
}

const REGALOS = ['piedra', 'arcilla', 'piel', 'hueso', 'fibra', 'hierbas', 'malaquita', 'casiterita', 'hematites', 'lana'];

/** Lo que cabe a cuestas: un poco de lo que a la otra aldea le falta y en esta sobra. */
function regalar(de: Aldea, a: Aldea): void {
  for (const mat of REGALOS) {
    const hay = de.despensa[mat] ?? 0;
    if (hay < 4 || (a.despensa[mat] ?? 0) >= 1) continue;
    const n = Math.min(2, Math.round(hay * 25) / 100);
    apuntar(de, mat, hay - n);
    guardar(a, mat, n);
  }
}

/** Mientras va de camino o está allí: dónde está y qué hace (no trabaja en su aldea). */
export function caminarViaje(m: Mundo, p: Persona): void {
  const v = p.viaje;
  if (!v) return;
  p.actividad = 'viajar';
  const f = Math.min(1, (m.t - v.salida) / v.dias);
  p.x = Math.round(v.desde[0] + (v.hasta[0] - v.desde[0]) * f);
  p.y = Math.round(v.desde[1] + (v.hasta[1] - v.desde[1]) * f);
}
