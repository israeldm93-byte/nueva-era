// La vida de cada uno más allá del trabajo del día: su carácter, lo que necesita, lo
// que se propone y el oficio que va haciendo suyo.
//
// Las decisiones van a dos plazos:
//   - Cada día elige qué hacer (economia.ts: lo que espera rendir, lo que necesita la
//     aldea y su red neuronal). Aquí solo se le añade un sesgo pequeño según su
//     carácter, sus recuerdos y su meta.
//   - Cada pocos días (de forma escalonada: cada persona, uno de cada diez) repasa su
//     meta: la mantiene, la da por cumplida o la cambia si su situación ha cambiado.
//     Las metas nacen de lo que le pasa (hambre, hacinamiento, falta de respeto,
//     agravios, soledad), de su carácter y de lo que tiene a mano.

import { DIAS_ANIO } from './config.ts';
import { TECNICA } from './catalogo.ts';
import { comidaTotal, necesidad, plazas } from './economia.ts';
import { enfriar, hito, lazo, memoria, tratar } from './memoria.ts';
import { buscarDestino } from './migracion.ts';
import { edad, type Indices } from './mundo.ts';
import { respeto } from './politica.ts';
import { puedeAprender } from './saber.ts';
import { limiteAldea } from './sociedad.ts';
import type { Aldea, Meta, Mundo, Persona } from './tipos.ts';

/** Cómo se llama a quien vive de cada oficio (él, ella). */
export const OFICIO_NOMBRE: Record<string, [string, string]> = {
  recolectar: ['recolector', 'recolectora'],
  cazar: ['cazador', 'cazadora'],
  pescar: ['pescador', 'pescadora'],
  lenar: ['leñador', 'leñadora'],
  picar: ['cantero', 'cantera'],
  barro: ['alfarero', 'alfarera'],
  cultivar: ['agricultor', 'agricultora'],
  pastorear: ['pastor', 'pastora'],
  construir: ['constructor', 'constructora'],
  experimentar: ['inventor', 'inventora'],
  vigilar: ['guardián', 'guardiana'],
};

export const nombreOficio = (p: Persona, o: string): string => OFICIO_NOMBRE[o]?.[p.sexo === 'M' ? 1 : 0] ?? o;

/** Lo que se gana con la práctica: hasta un 30 % más de rendimiento. */
export function pericia(p: Persona, act: string): number {
  const d = p.practica?.[act] ?? 0;
  return 1 + 0.3 * Math.min(1, d / 150);
}

export function practicar(p: Persona, act: string): void {
  if (!OFICIO_NOMBRE[act]) return;
  const pr = (p.practica ??= {});
  pr[act] = (pr[act] ?? 0) + 1;
}

/** Su oficio: lo que más ha practicado, si destaca claramente sobre lo demás. */
export function oficio(p: Persona): string | null {
  let mejor: string | null = null;
  let a = 0;
  let b = 0;
  for (const [k, v] of Object.entries(p.practica ?? {})) {
    // Inventor solo es quien ha descubierto algo; probar cosas no da oficio por sí solo.
    if (k === 'experimentar' && !p.descubrimientos) continue;
    if (v > a) {
      b = a;
      a = v;
      mejor = k;
    } else if (v > b) b = v;
  }
  return a >= 60 && a >= b * 1.4 ? mejor : null;
}

/**
 * Un empujón pequeño a cada actividad según quién es y qué le pasa: el prudente caza
 * menos cuando rondan fieras, el paciente aguanta en el campo, el ambicioso construye y
 * prueba, y su meta tira de lo que la acerca.
 */
export function sesgo(m: Mundo, p: Persona, k: string, amenaza: number): number {
  const g = p.genes;
  let f = 1;
  const miedo = memoria(m, p, 'fieras');
  if (k === 'cazar') f *= (amenaza > 0.2 ? 1.4 - 0.8 * g.prudencia : 1.1 - 0.2 * g.prudencia) * (1 - 0.4 * miedo);
  if (k === 'vigilar') f *= 0.7 + 0.6 * g.prudencia;
  if (k === 'cultivar' || k === 'pastorear') f *= 0.85 + 0.3 * g.paciencia;
  if (k === 'construir') f *= 0.9 + 0.2 * g.ambicion + 0.1 * g.generosidad;
  if (k === 'experimentar') f *= 0.9 + 0.2 * g.ambicion;
  const meta = p.meta;
  if (meta) {
    if (meta.tipo === 'sobrevivir' && ['recolectar', 'cazar', 'pescar', 'cultivar', 'pastorear'].includes(k)) f *= 1.5;
    if (meta.tipo === 'sobrevivir' && k === 'experimentar') f *= 0.3;
    if (meta.tipo === 'oficio' && meta.ref === k) f *= 1.4;
    if (meta.tipo === 'prestigio' && (k === 'experimentar' || k === 'construir' || k === 'vigilar')) f *= 1.25;
    if (meta.tipo === 'aprender' && k === 'experimentar') f *= 1.1;
  }
  return f;
}

/** Lo que una aldea ofrece hoy, visto por los suyos (se calcula una vez al día). */
export interface Panorama {
  n: number;
  plazas: number;
  limite: number;
  /** Días de comida guardada por cabeza. */
  dias: number;
  /** Puesto de cada uno en respeto, de 0 (el último) a 1 (el primero). */
  puesto: Map<number, number>;
}

export function panorama(m: Mundo, a: Aldea, gente: Persona[]): Panorama {
  const adultos = gente.filter((p) => edad(m, p) >= 16);
  const orden = adultos.map((p) => [p.id, respeto(m, p)] as [number, number]).sort((x, y) => x[1] - y[1]);
  const puesto = new Map(orden.map(([id], i) => [id, orden.length > 1 ? i / (orden.length - 1) : 1]));
  const consumo = gente.reduce((s, p) => s + necesidad(m, p), 0);
  return { n: gente.length, plazas: plazas(a), limite: limiteAldea(a), dias: comidaTotal(a) / Math.max(1, consumo), puesto };
}

/** Lo que le falta, de 0 (nada) a 1 (mucho). No son barras: compiten por convertirse en metas. */
export function necesidades(m: Mundo, p: Persona, a: Aldea, pan: Panorama, gente: Persona[]) {
  const amigos = (p.lazos ?? []).filter(([, v]) => v > 0.3).length;
  const familia = (p.pareja !== null ? 1 : 0) + gente.filter((q) => q.madre === p.id || q.padre === p.id || q.id === p.madre || q.id === p.padre).length;
  return {
    hambre: Math.max(1 - p.reservas / 8, memoria(m, p, 'hambre') * 0.8, pan.dias < 15 ? 0.6 : 0),
    seguridad: Math.min(1, a.amenaza + memoria(m, p, 'asalto') * 0.6 + memoria(m, p, 'fieras') * 0.3),
    vivienda: Math.max(0, (pan.n - pan.plazas) / Math.max(1, pan.n)),
    pertenencia: Math.max(0, 1 - 0.35 * familia - 0.2 * amigos),
    reconocimiento: 1 - (pan.puesto.get(p.id) ?? 0.5),
    hacinamiento: Math.max(0, pan.n / Math.max(1, pan.limite) - 0.7) * 2,
  };
}

/** Alguien de su aldea que sabe algo que él podría aprender (y lo que es). */
function maestroDe(p: Persona, a: Aldea, gente: Persona[]): [Persona, string] | null {
  for (const s of a.conocidos) {
    const t = TECNICA[s];
    if (!t || !puedeAprender(p, t)) continue;
    const q = gente.find((x) => x !== p && x.saberes.includes(s));
    if (q) return [q, s];
  }
  return null;
}

/** El peor rival que tiene en su aldea (si lo hay). */
function rivalDe(p: Persona, gente: Persona[]): Persona | null {
  let peor: Persona | null = null;
  let v = -0.3;
  for (const [id, x] of p.lazos ?? []) {
    if (x >= v) continue;
    const q = gente.find((g) => g.id === id);
    if (q) {
      v = x;
      peor = q;
    }
  }
  return peor;
}

const META_VALIDA_MIN = 0.25;

/**
 * Repasa su meta: si la ha cumplido, la celebra; si ya no tiene sentido, la deja; y si
 * algo le aprieta más, cambia. Las razones quedan escritas en `motivo`.
 */
export function revisarMeta(m: Mundo, p: Persona, a: Aldea, gente: Persona[], pan: Panorama, ix: Indices): void {
  const e = edad(m, p);
  if (e < 12 || p.mudanza) return;
  cumplida(m, p, a, gente, ix);
  const g = p.genes;
  const nec = necesidades(m, p, a, pan, gente);
  const opciones: [number, string, () => Meta][] = [];
  const meta = (tipo: string, motivo: string, ref?: number | string): Meta => ({ tipo, desde: m.t, motivo, ...(ref !== undefined ? { ref } : {}) });

  if (nec.hambre > 0.55) opciones.push([1.5 * nec.hambre, 'sobrevivir', () => meta('sobrevivir', p.reservas < 3 ? 'Tiene hambre: lo primero es comer.' : 'Han pasado hambre: quiere que no vuelva a faltar comida.')]);
  const maestro = e >= 10 ? maestroDe(p, a, gente) : null;
  if (maestro) {
    const [q, s] = maestro;
    opciones.push([0.25 + 0.6 * g.curiosidad, 'aprender', () => meta('aprender', `Quiere aprender ${TECNICA[s].titulo}; ${q.nombre} lo sabe.`, s)]);
  }
  if (e >= 16 && e <= 50 && !p.vida?.some((h) => h[1] === 'oficio')) {
    const mejor = Object.entries(p.practica ?? {}).sort((x, y) => y[1] - x[1])[0];
    if (mejor && mejor[1] >= 15 && (mejor[0] !== 'experimentar' || p.descubrimientos > 0)) opciones.push([0.2 + 0.4 * g.paciencia + 0.2 * g.ambicion, 'oficio', () => meta('oficio', `Quiere ser ${nombreOficio(p, mejor[0])} de verdad: es lo que mejor se le da.`, mejor[0])]);
  }
  if (e >= 17 && e <= 40 && p.pareja === null) opciones.push([0.2 + 0.4 * nec.pertenencia + 0.3 * g.sociabilidad, 'familia', () => meta('familia', 'Quiere encontrar pareja y formar una familia.')]);
  if (e >= 20 && e <= 60) opciones.push([1.1 * g.ambicion + 0.5 * nec.reconocimiento * g.ambicion - 0.45, 'prestigio', () => meta('prestigio', 'Quiere hacerse un nombre y que le escuchen en el consejo.')]);
  // Irse: cuando aprieta lo de aquí (casas, hambre, miedo, soledad o que nadie le tenga en
  // cuenta) y no le ata demasiado su lealtad; solo si sabe de un sitio mejor.
  if (e >= 18) {
    const empuje = nec.vivienda * 0.6 + nec.hambre * 0.4 + nec.seguridad * 0.35 + nec.pertenencia * 0.25 + nec.reconocimiento * 0.3 * g.ambicion;
    const ganas = empuje * (1.25 - g.lealtad) - 0.12;
    if (ganas > 0.15) {
      const destino = buscarDestino(m, p, a, nec, ix);
      if (destino) opciones.push([ganas + destino.ventaja * 0.3, 'emigrar', () => meta('emigrar', destino.motivo, destino.aldea.id)]);
    }
  }
  if (e >= 20 && e <= 45) opciones.push([0.6 * g.ambicion + 0.6 * nec.hacinamiento + 0.2 * nec.reconocimiento * g.ambicion - 0.35, 'fundar', () => meta('fundar', 'Sueña con fundar su propio pueblo, con tierra para todos y donde mande él.'.replace(' él', p.sexo === 'M' ? ' ella' : ' él'))]);
  // Vengarse de la aldea que mató a los suyos.
  let agravio: [number, number] | null = null;
  for (const r of p.recuerdos ?? []) if (r[1] === 'agravio' && typeof r[2] === 'number') {
    const v = memoria(m, p, 'agravio', r[2]);
    if (!agravio || v > agravio[1]) agravio = [r[2], v];
  }
  if (agravio && e >= 16) {
    const [id, v] = agravio;
    const enemiga = m.aldeas.find((b) => b.id === id && b.abandonada === null);
    if (enemiga) opciones.push([v * (0.8 + 0.4 * g.lealtad) + 0.3 * g.agresividad - 0.3, 'vengar', () => meta('vengar', `Quiere vengar a los suyos, muertos a manos de los de ${enemiga.nombre}.`, id)]);
  }
  const rival = rivalDe(p, gente);
  if (rival) opciones.push([0.6 * g.generosidad + 0.2 * g.sociabilidad - 0.2, 'reconciliar', () => meta('reconciliar', `Quiere hacer las paces con ${rival.nombre}.`, rival.id)]);

  // Se queda con su meta si sigue teniendo sentido y nada aprieta claramente más.
  let mejor: [number, string, () => Meta] | null = null;
  for (const o of opciones) if (!mejor || o[0] > mejor[0]) mejor = o;
  const actual = p.meta ? opciones.find(([, tipo]) => tipo === p.meta!.tipo) : null;
  // Lo que uno se propone se mantiene un tiempo (más cuanto más paciente), salvo que deje
  // de ser posible o que apriete algo urgente (el hambre de verdad).
  const urgente = !!mejor && mejor[1] === 'sobrevivir' && mejor[0] >= 1.1 && p.meta?.tipo !== 'sobrevivir';
  const compromiso = 30 + 150 * g.paciencia;
  if (p.meta && actual && !urgente && m.t - p.meta.desde < compromiso) return;
  if (p.meta && actual && (!mejor || actual[0] >= mejor[0] * 0.8) && actual[0] >= META_VALIDA_MIN * 0.8) return;
  if (!mejor || mejor[0] < META_VALIDA_MIN) {
    p.meta = null;
    return;
  }
  p.meta = mejor[2]();
}

/** Si ha logrado lo que se proponía, queda en su vida y la meta se cierra. */
function cumplida(m: Mundo, p: Persona, a: Aldea, gente: Persona[], ix: Indices): void {
  const meta = p.meta;
  if (!meta) return;
  let hecho = false;
  if (meta.tipo === 'aprender' && typeof meta.ref === 'string' && p.saberes.includes(meta.ref)) {
    // Lo que aprende de adulto por su empeño queda en su vida (lo de la infancia, no).
    if (edad(m, p) >= 16 && (p.vida?.filter((h) => h[1] === 'aprende').length ?? 0) < 3) hito(m, p, 'aprende', TECNICA[meta.ref]?.nombre ?? meta.ref);
    hecho = true;
  } else if (meta.tipo === 'familia' && p.pareja !== null) hecho = true;
  else if (meta.tipo === 'oficio' && typeof meta.ref === 'string' && oficio(p) === meta.ref) hecho = true; else if (meta.tipo === 'prestigio' && a.consejo?.miembros.includes(p.id)) hecho = true;
  else if (meta.tipo === 'sobrevivir' && p.reservas > 5) hecho = true;
  else if (meta.tipo === 'reconciliar' && typeof meta.ref === 'number') {
    const q = ix.porId.get(meta.ref);
    if (!q || q.muerto) hecho = true;
    else if (lazo(p, q.id) >= 0) {
      hito(m, p, 'reconcilia', q.nombre);
      hecho = true;
    }
  } else if (meta.tipo === 'vengar' && m.t - meta.desde > DIAS_ANIO * 6) hecho = true;
  if (hecho) p.meta = null;
  void gente;
}

/**
 * Cada día, una de cada diez personas repasa su vida (escalonado: cada cual cada diez
 * días). También se enfrían los lazos sin trato y se adquiere oficio.
 */
export function vidas(m: Mundo, ix: Indices, vivas: Aldea[]): void {
  const turno = m.t % 10;
  const vive = (id: number) => {
    const q = ix.porId.get(id);
    return !!q && !q.muerto;
  };
  for (const a of vivas) {
    if (a.viaje) continue;
    const gente = ix.porAldea.get(a.id) ?? [];
    if (!gente.length) continue;
    let pan: Panorama | null = null;
    for (const p of gente.slice()) {
      if (p.id % 10 !== turno || p.muerto) continue;
      pan ??= panorama(m, a, gente);
      // La práctica se va olvidando si no se ejerce; el oficio, una vez ganado, queda.
      // (Con décimas, por debajo de 1,6 días el 3 % se perdía al redondear y nunca se olvidaba
      // del todo: ahora con centésimas, y lo que baja de un día se da por olvidado.)
      if (p.practica) {
        for (const k of Object.keys(p.practica)) {
          const v = p.practica[k] * 0.97;
          if (v < 1) delete p.practica[k];
          else p.practica[k] = Math.round(v * 100) / 100;
        }
      }
      const o = oficio(p);
      if (o && !p.vida?.some((h) => h[1] === 'oficio')) hito(m, p, 'oficio', nombreOficio(p, o));
      enfriar(p, vive);
      revisarMeta(m, p, a, gente, pan, ix);
    }
  }
}

/** Una reconciliación: el generoso da el primer paso. */
export function acercarse(p: Persona, q: Persona): void {
  tratar(p, q, 0.12 + 0.2 * p.genes.generosidad, 0.06 + 0.15 * q.genes.generosidad);
}
