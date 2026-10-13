// Guerra y diplomacia entre aldeas.
//
// Cuando el consejo de una aldea decide asaltar a otra (por hambre, codicia, rencor,
// venganza o porque se disputan las mismas tierras), no aparece allí por arte de magia:
// prepara a sus guerreros (madera para las armas, comida para el camino, que salen de la
// despensa), y salen. Hacen el camino en días. Si al llegar ven que no pueden ganar
// (murallas, aliados que acuden), se retiran; si no, pelean (ver `combatir`). Vuelven con
// los heridos y el botín, que no llega a su aldea hasta que llegan ellos. Si mientras tanto
// se firma la paz, se dan la vuelta.
//
// Cada mes, además, se revisa lo que se juegan las aldeas entre sí: vecinas a las que les
// falta lo mismo se disputan tierras y recursos; lo comerciado se va olvidando; los
// agravios graves, muy despacio.

import { diasEntre, pisar } from './caminos.ts';
import { ORDEN_COMER } from './catalogo.ts';
import { anotar } from './cronica.ts';
import { aCaballo, alimento, apuntar, guardar, necesidad } from './economia.ts';
import { balance } from './mercaderes.ts';
import { masas } from './mapa.ts';
import { distancia } from './matematicas.ts';
import { aldeasVivas, edad, estacionDe, type Indices } from './mundo.ts';
import { MOTIVO, aliadosCerca, armas, combatir, declarar, defensoresDe, enGuerra, fuerzas, relacion } from './politica.ts';
import type { Aldea, Incursion, Mundo, Persona } from './tipos.ts';

const r2 = (x: number) => Math.round(x * 100) / 100;
const r4 = (x: number) => Math.round(x * 10000) / 10000;

/** Madera para las armas de cada guerrero (astiles, flechas, escudos). */
const MADERA_ARMAS = 2;

/** ¿Hay ya guerreros de A en camino contra B? */
export const enMarcha = (m: Mundo, A: Aldea, B: Aldea): boolean => (m.incursiones ?? []).some((x) => x.de === A.id && x.contra === B.id);

/** Saca de la despensa comida que alimente `cuanto` (lo que más aguanta, primero). */
function cargarComida(a: Aldea, cuanto: number): Record<string, number> {
  const out: Record<string, number> = {};
  let lleva = 0;
  for (const mat of [...ORDEN_COMER].reverse()) {
    const v = a.despensa[mat] ?? 0;
    const n = alimento(a, mat);
    if (v <= 0 || n <= 0 || lleva >= cuanto) continue;
    const toma = r2(Math.min(v, (cuanto - lleva) / n));
    if (toma <= 0) continue;
    apuntar(a, mat, v - toma);
    out[mat] = toma;
    lleva += toma * n;
  }
  return out;
}

/**
 * El consejo de A manda a sus guerreros contra B: se declara la guerra (si no lo estaba),
 * se preparan las armas y la comida y salen. No hay dos incursiones a la vez contra la misma aldea.
 */
export function lanzarIncursion(m: Mundo, A: Aldea, B: Aldea, ga: Persona[], motivo: string): Incursion | null {
  if (enMarcha(m, A, B) || A.viaje || B.abandonada !== null) return null;
  const aptos = ga.filter((p) => !p.muerto && !p.viaje && !p.mudanza && edad(m, p) >= 16 && edad(m, p) <= 55 && p.salud > 0.6);
  if (aptos.length < 2) return null;
  aptos.sort((x, y) => y.genes.fuerza - x.genes.fuerza || x.id - y.id);
  let n = Math.max(2, Math.round(aptos.length * 0.3));
  // Las armas: madera para cada uno (si no hay para todos, van menos).
  n = Math.max(2, Math.min(n, Math.floor((A.despensa.madera ?? 0) / MADERA_ARMAS)));
  const gente = aptos.slice(0, n);
  declarar(m, A, B, motivo);
  apuntar(A, 'madera', (A.despensa.madera ?? 0) - Math.min(A.despensa.madera ?? 0, gente.length * MADERA_ARMAS));
  const dias = Math.max(2, Math.ceil(diasEntre(m, [A.x, A.y], [B.x, B.y], aCaballo(A) ? 3 : 1.5) - 1e-9));
  const comida = gente.reduce((s, p) => s + necesidad(m, p), 0) * (2 * dias + 2) * 1.1;
  const inc: Incursion = { id: m.sigId++, de: A.id, contra: B.id, gente: gente.map((p) => p.id), motivo, fase: 'ida', salida: m.t, dias, desde: [A.x, A.y], hasta: [B.x, B.y], viveres: cargarComida(A, comida), botin: {} };
  (m.incursiones ??= []).push(inc);
  for (const p of gente) p.viaje = { a: B.id, fase: 'ida', desde: [A.x, A.y], hasta: [B.x, B.y], salida: m.t, dias, conocio: [], incursion: inc.id };
  pisar(m, A.x, A.y, B.x, B.y, 5 * gente.length);
  return inc;
}

/** Comen de lo que llevan; si se acaba, pasan hambre. */
function comerViveres(m: Mundo, inc: Incursion, gente: Persona[], a: Aldea): void {
  for (const p of gente) {
    let falta = necesidad(m, p);
    for (const mat of Object.keys(inc.viveres)) {
      if (falta <= 0) break;
      const n = alimento(a, mat);
      if (n <= 0) continue;
      const toma = r2(Math.min(inc.viveres[mat], falta / n));
      inc.viveres[mat] = r2(inc.viveres[mat] - toma);
      falta -= toma * n;
      if (inc.viveres[mat] <= 0) delete inc.viveres[mat];
    }
    if (falta > 0.05) {
      p.reservas = r2(p.reservas - 1);
      if (p.reservas < 0) {
        p.salud = r2(p.salud + 0.04 * p.reservas);
        p.causa = 'hambre';
        p.reservas = 0;
      }
    }
  }
}

/** Se dan la vuelta desde donde estén. */
function volverse(m: Mundo, inc: Incursion, gente: Persona[], desde: [number, number], casa: Aldea): void {
  inc.fase = 'vuelta';
  inc.salida = m.t;
  inc.desde = desde;
  inc.hasta = [casa.x, casa.y];
  inc.dias = Math.max(1, Math.ceil(diasEntre(m, desde, [casa.x, casa.y], aCaballo(casa) ? 3 : 1.5) - 1e-9));
  for (const p of gente) p.viaje = { a: inc.contra, fase: 'vuelta', desde, hasta: [casa.x, casa.y], salida: m.t, dias: inc.dias, conocio: [], incursion: inc.id };
}

/** Lo que lleva la incursión vuelve a una despensa (botín y comida que sobró). */
function descargar(inc: Incursion, a: Aldea): void {
  for (const carga of [inc.botin, inc.viveres]) for (const [k, n] of Object.entries(carga)) guardar(a, k, n);
  inc.botin = {};
  inc.viveres = {};
}

/** Cada día: los guerreros comen, avanzan, llegan y pelean (o se retiran), y vuelven. */
export function guerrear(m: Mundo, ix: Indices): void {
  if (!m.incursiones?.length) return;
  for (const inc of m.incursiones.slice()) {
    const gente = inc.gente.map((id) => ix.porId.get(id)).filter((p): p is Persona => !!p && !p.muerto && p.viaje?.incursion === inc.id);
    const A = m.aldeas.find((a) => a.id === inc.de);
    const B = m.aldeas.find((a) => a.id === inc.contra);
    const acabar = () => {
      m.incursiones = m.incursiones!.filter((x) => x !== inc);
      for (const p of gente) delete p.viaje;
    };
    // Sin nadie (murieron todos), lo que llevaban se pierde con ellos.
    if (!gente.length) {
      m.incursiones = m.incursiones.filter((x) => x !== inc);
      continue;
    }
    // Su aldea ya no existe: lo que llevan se queda donde estén (en la aldea más cercana).
    if (!A || A.abandonada !== null) {
      const cerca = aldeasVivas(m).reduce<Aldea | null>((x, y) => (!x || distancia(y.x - gente[0].x, y.y - gente[0].y) < distancia(x.x - gente[0].x, x.y - gente[0].y) ? y : x), null);
      if (cerca) descargar(inc, cerca);
      acabar();
      continue;
    }
    comerViveres(m, inc, gente, A);
    const f = Math.min(1, (m.t - inc.salida) / inc.dias);
    const aqui: [number, number] = [Math.round(inc.desde[0] + (inc.hasta[0] - inc.desde[0]) * f), Math.round(inc.desde[1] + (inc.hasta[1] - inc.desde[1]) * f)];
    if (inc.fase === 'ida') {
      // Hecha la paz (o desaparecida la aldea) mientras iban: se vuelven.
      if (!B || B.abandonada !== null || !enGuerra(A, B)) {
        inc.resultado = 'paz';
        volverse(m, inc, gente, aqui, A);
        continue;
      }
      if (f < 1) continue;
      const gb = ix.porAldea.get(B.id) ?? [];
      const defensores = defensoresDe(m, gb);
      const ayuda = aliadosCerca(m, B, A).flatMap((c) => defensoresDe(m, ix.porAldea.get(c.id) ?? []).slice(0, 3));
      const { fA, fB } = fuerzas(m, A, B, gente, defensores, ayuda);
      if (fA < fB * 0.45) {
        // Ven las murallas y a los que se juntan para defenderla: no se atreven.
        inc.resultado = 'retirada';
        const g = A.consejo?.guerra;
        if (g && g.contra === B.id) g.cansancio = r2((g.cansancio ?? 0) + 0.15);
        // (Y tardan en volver a intentarlo.)
        relacion(m, A.id, B.id).ultimoAsalto = m.t;
        anotar(m, 'asalto', `Los guerreros de ${A.nombre} llegan ante ${B.nombre}, ven lo que les espera${ayuda.length ? ' (han acudido sus aliados)' : ''} y se retiran sin pelear.`, B.id);
      } else {
        const r = combatir(m, A, B, gente, gb, inc.motivo);
        inc.botin = r.botin;
        inc.resultado = r.gana ? 'victoria' : 'derrota';
      }
      volverse(m, inc, gente.filter((p) => !p.muerto), [B.x, B.y], A);
      continue;
    }
    if (f < 1) continue;
    // De vuelta en casa: el botín y la comida que sobró entran en la despensa.
    descargar(inc, A);
    for (const p of gente) {
      p.x = A.x;
      p.y = A.y;
    }
    acabar();
  }
}

/** Lo que da la tierra y se pueden disputar dos vecinas: la comida, la madera y la piedra. */
const DE_LA_TIERRA: Record<string, number> = { comida: 0, madera: 20, piedra: 20 };

/** Lo que una aldea necesita de la tierra y le falta de verdad (no un par de pieles). */
function faltas(m: Mundo, a: Aldea, gente: Persona[]): Set<string> {
  const { falta } = balance(m, a, gente, estacionDe(m.t));
  return new Set(Object.keys(DE_LA_TIERRA).filter((k) => (falta[k] ?? 0) > DE_LA_TIERRA[k]));
}

/**
 * Cada mes: vecinas cercanas a las que les falta lo mismo se disputan tierras y recursos (y
 * el rencor crece); si no, la disputa se apaga. Lo comerciado y los agravios se van olvidando.
 */
export function diplomacia(m: Mundo, ix: Indices): void {
  const vivas = aldeasVivas(m);
  const { masa } = masas(m);
  const falta = new Map(vivas.map((a) => [a.id, faltas(m, a, ix.porAldea.get(a.id) ?? [])]));
  for (let i = 0; i < vivas.length; i++) {
    for (let j = i + 1; j < vivas.length; j++) {
      const a = vivas[i];
      const b = vivas[j];
      const clave = `${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`;
      const rel = m.relaciones[clave];
      const cerca = distancia(a.x - b.x, a.y - b.y) < 16 && masa[a.y * m.ancho + a.x] === masa[b.y * m.ancho + b.x];
      const comun = cerca ? [...falta.get(a.id)!].filter((k) => falta.get(b.id)!.has(k)) : [];
      if (comun.length) {
        const r = relacion(m, a.id, b.id);
        r.disputa = Math.min(1, r2((r.disputa ?? 0) + 0.04 * comun.length));
        r.rencor = Math.min(1, r2(r.rencor + 0.01 * comun.length));
        r.peor = Math.max(r.peor ?? 0, r.rencor);
      } else if (rel?.disputa) {
        rel.disputa = r2(rel.disputa * 0.8);
        if (rel.disputa < 0.01) delete rel.disputa;
      }
      if (!rel) continue;
      if (rel.comercio) {
        rel.comercio = r2(rel.comercio * 0.9);
        if (rel.comercio < 0.5) delete rel.comercio;
      }
      if (rel.agravio) {
        rel.agravio = r4(rel.agravio * 0.99);
        if (rel.agravio < 0.01) delete rel.agravio;
      }
    }
  }
}

/** Para la ficha: lo que una aldea es para otra, en una palabra. */
export function trato(m: Mundo, a: Aldea, b: Aldea): string {
  const r = m.relaciones[a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`];
  if (enGuerra(a, b) || enGuerra(b, a)) return 'guerra';
  if (!r) return 'neutral';
  if (r.alianza) return 'aliados';
  if (r.rencor >= 0.6) return 'hostiles';
  if (r.rencor >= 0.3 || (r.disputa ?? 0) >= 0.4) return 'tensión';
  if (r.afinidad >= 0.5) return 'amistad';
  return 'neutral';
}

export { MOTIVO, armas };
