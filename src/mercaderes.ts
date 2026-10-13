// Economía entre aldeas: lo que a cada una le falta, lo que le sobra y los mercaderes que
// lo llevan de una a otra.
//
// Cada aldea sabe lo que quiere tener de cada cosa (lo que usa a diario, lo que piden sus
// obras, las que tuvo que dejar a medias por falta de material). Lo que no llega a eso, lo
// necesita; lo que pasa de una reserva holgada, le sobra (de la comida, solo lo que pasa de
// medio año). Cuando una aldea tiene de sobra algo que a otra le falta, y la otra tiene a su
// vez algo que le hace falta a la primera, sale un mercader: carga lo que lleva (que deja de
// estar en la despensa), hace el camino (más corto si hay caminos), entrega, carga lo
// convenido (sin dejar a la otra sin sus reservas), pasa allí unos días (y habla, y aprende)
// y vuelve. Solo se comercia si a las dos les compensa el viaje; entre aldeas hermanas o
// aliadas, a quien pasa hambre se le lleva comida aunque no pueda dar nada a cambio.
//
// Lo que se pide y no se encuentra queda como encargo: a quien se lo piden le da motivos para
// producirlo. De lo que hace cada día su gente sale el perfil económico de cada aldea.

import { prob } from './azar.ts';
import { diasEntre, pisar } from './caminos.ts';
import { DIAS_ANIO } from './config.ts';
import { EDIFICIO, MATERIAL } from './catalogo.ts';
import { anotar } from './cronica.ts';
import { aCaballo, alimento, apuntar, comidaTotal, conoce, deTiro, guardar, necesidad, objetivos, tiene } from './economia.ts';
import { aviso } from './fauna.ts';
import { masas } from './mapa.ts';
import { aldeasVivas, edad, estacionDe, type Indices } from './mundo.ts';
import { enGuerra, relacion } from './politica.ts';
import type { Aldea, Mundo, Persona } from './tipos.ts';

const r2 = (x: number) => Math.round(x * 100) / 100;
const r4 = (x: number) => Math.round(x * 10000) / 10000;

/** Días de comida que una aldea quiere tener siempre (por debajo de la mitad, le falta). */
export const RESERVA_COMIDA = 180;
export const MINIMO_COMIDA = 60;
/** La comida que se comercia: la que aguanta el viaje. */
const COMIDA_VIAJE = ['cereal', 'semillas', 'queso'];
/** Lo demás que se comercia. */
const BIENES = ['madera', 'piedra', 'arcilla', 'fibra', 'piel', 'hueso', 'hierbas', 'lana', 'malaquita', 'casiterita', 'hematites'];
/** Lo que carga un mercader a cuestas (con animales de tiro o de carga, más). */
const CARGA = 30;
/** Días que se queda en la otra aldea. */
const ESTANCIA = 4;
/** Más lejos de esto (en días) no compensa ir a comerciar por tierra. */
const LEJOS = 30;

/**
 * Lo que una aldea tiene de sobra, lo que le falta y lo que le cabe hasta completar su reserva
 * (comida: en lo que alimenta).
 */
export function balance(m: Mundo, a: Aldea, gente: Persona[], est: number): { sobra: Record<string, number>; falta: Record<string, number>; hueco: Record<string, number> } {
  const quiere = objetivos(a, gente.length, est);
  quiere.lana = quiere.piel;
  // Lo que pedían las obras que se dejaron a medias por falta de material.
  for (const [tipo, hasta] of Object.entries(a.aparcadas ?? {})) {
    if (hasta <= m.t) continue;
    for (const [k, v] of Object.entries(EDIFICIO[tipo]?.coste ?? {})) quiere[k] = (quiere[k] ?? 0) + v;
  }
  const sobra: Record<string, number> = {};
  const falta: Record<string, number> = {};
  const hueco: Record<string, number> = {};
  for (const mat of BIENES) {
    const hay = a.despensa[mat] ?? 0;
    const q = quiere[mat] ?? 0;
    if (q > 0 && hay < q) falta[mat] = r2(q - hay);
    const reserva = Math.max(2 * q, q + 10);
    if (hay > reserva) sobra[mat] = r2(hay - reserva);
    else if (q > 0 && hay < reserva) hueco[mat] = r2(reserva - hay);
  }
  let consumo = 0;
  for (const p of gente) consumo += necesidad(m, p);
  const comida = comidaTotal(a);
  if (consumo > 0 && comida < consumo * MINIMO_COMIDA) falta.comida = r2(consumo * MINIMO_COMIDA - comida);
  if (consumo > 0 && comida < consumo * RESERVA_COMIDA) hueco.comida = r2(consumo * RESERVA_COMIDA - comida);
  const libre = comida - consumo * RESERVA_COMIDA;
  if (gente.length && libre > 0) {
    // Solo la comida que aguanta el viaje, y sin pasar de lo que sobra.
    let queda = libre;
    for (const mat of COMIDA_VIAJE) {
      const n = Math.min(a.despensa[mat] ?? 0, queda / alimento(a, mat));
      if (n >= 1) {
        sobra[mat] = r2(n);
        queda -= n * alimento(a, mat);
      }
    }
  }
  return { sobra, falta, hueco };
}

/** Lo que vale una carga para quien la recibe (comida: lo que alimenta). */
function valor(a: Aldea, carga: Record<string, number>): number {
  let v = 0;
  for (const [k, n] of Object.entries(carga)) v += COMIDA_VIAJE.includes(k) ? n * alimento(a, k) : n * (MATERIAL[k]?.peso ?? 0);
  return v;
}

/** Llena una carga con lo que a uno le sobra y al otro le falta, hasta `cap` unidades. */
function llenar(de: Aldea, para: Aldea, sobra: Record<string, number>, falta: Record<string, number>, cap: number): Record<string, number> {
  const out: Record<string, number> = {};
  let queda = cap;
  // Primero la comida, si falta; luego lo que más se aprecia.
  if (falta.comida) {
    let hambre = falta.comida;
    for (const mat of COMIDA_VIAJE) {
      if (!sobra[mat] || queda <= 0 || hambre <= 0) continue;
      const n = r2(Math.min(sobra[mat], queda, hambre / alimento(para, mat)));
      if (n < 1) continue;
      out[mat] = n;
      queda -= n;
      hambre -= n * alimento(para, mat);
    }
  }
  const bienes = BIENES.filter((k) => sobra[k] && falta[k]).sort((x, y) => MATERIAL[y].peso - MATERIAL[x].peso);
  for (const mat of bienes) {
    if (queda <= 0) break;
    const n = r2(Math.min(sobra[mat], falta[mat], queda));
    if (n < 1) continue;
    out[mat] = n;
    queda -= n;
  }
  return out;
}

export interface Trato {
  lleva: Record<string, number>;
  trae: Record<string, number>;
  dias: number;
  coste: number;
  ayuda: boolean;
}

/** Hermanas (una salió de la otra) o aliadas. */
function amigas(m: Mundo, a: Aldea, b: Aldea): boolean {
  if (a.origen === b.id || b.origen === a.id) return true;
  const r = m.relaciones[a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`];
  return !!r && (r.alianza || r.afinidad >= 0.6) && r.rencor < 0.5;
}

/** ¿Compensa un viaje de comercio de `a` a `b`? Lo que llevaría, lo que traería y lo que cuesta. */
export function tratar(m: Mundo, a: Aldea, ga: Persona[], b: Aldea, gb: Persona[], est: number): Trato | null {
  if (a === b || !ga.length || !gb.length || a.viaje || b.viaje) return null;
  // Por tierra (la misma tierra) y no demasiado lejos; los caminos acortan el viaje.
  const { masa } = masas(m);
  if (masa[a.y * m.ancho + a.x] !== masa[b.y * m.ancho + b.x]) return null;
  const rel = m.relaciones[a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`];
  if (rel && rel.rencor > 0.6) return null;
  // En guerra no se comercia (con la paz, los mercaderes vuelven).
  if (enGuerra(a, b) || enGuerra(b, a)) return null;
  const dias = Math.max(3, Math.ceil(diasEntre(m, [a.x, a.y], [b.x, b.y], aCaballo(a) ? 3 : 1.5) - 1e-9));
  if (dias > LEJOS * (conoce(a, 'comercio') ? 1.5 : 1)) return null;
  const cap = CARGA * (deTiro(a) ? 2.5 : aCaballo(a) ? 1.6 : 1);
  const ba = balance(m, a, ga, est);
  const bb = balance(m, b, gb, est);
  const lleva = llenar(a, b, ba.sobra, bb.falta, cap);
  if (!Object.keys(lleva).length) return null;
  // A cambio, lo que a la otra le sobra y aquí cabe hasta completar la reserva (no solo lo
  // imprescindible: en un trueque se acepta lo que viene bien).
  const trae = llenar(b, a, bb.sobra, ba.hueco, cap);
  // El viaje cuesta: la comida y los días de trabajo del mercader (menos si sabe comerciar).
  const coste = r2((2 * dias + ESTANCIA) * 0.5 * (conoce(a, 'comercio') ? 0.7 : 1));
  const paraB = valor(b, lleva);
  const paraA = valor(a, trae);
  if (paraA >= coste / 2 && paraB >= coste / 2) return { lleva, trae, dias, coste, ayuda: false };
  // A quien pasa hambre, sus hermanas o aliadas le llevan comida aunque no pueda pagar.
  const comida = COMIDA_VIAJE.some((k) => lleva[k]);
  if (comida && bb.falta.comida && amigas(m, a, b)) {
    const soloComida = Object.fromEntries(Object.entries(lleva).filter(([k]) => COMIDA_VIAJE.includes(k)));
    return { lleva: soloComida, trae: {}, dias, coste, ayuda: true };
  }
  return null;
}

/** Adulto, sano, bien comido y sin otra cosa entre manos. */
function puedeIr(m: Mundo, p: Persona): boolean {
  const e = edad(m, p);
  return e >= 18 && e <= 55 && p.salud >= 0.8 && p.reservas >= 4 && !p.viaje && !p.mudanza && !p.muerto;
}

/** Con quién comercia una aldea: las que conoce (contacto o parentesco). */
function socios(m: Mundo, a: Aldea, vivas: Aldea[]): Aldea[] {
  return vivas.filter((b) => b !== a && (a.origen === b.id || b.origen === a.id || m.contactos.includes(`${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`)));
}

/**
 * Una vez al mes: los encargos se van olvidando; quien tiene algo que ofrecer a quien lo
 * necesita manda un mercader; lo que se necesita y nadie ofrece queda como encargo a sus
 * socios. Una vez al año, cada aldea mira a qué se dedica su gente.
 */
export function mercados(m: Mundo, ix: Indices): void {
  const est = estacionDe(m.t);
  const vivas = aldeasVivas(m);
  for (const a of vivas) {
    if (a.encargos) {
      for (const k of Object.keys(a.encargos)) {
        a.encargos[k] = r2(a.encargos[k] * 0.6);
        if (a.encargos[k] < 1) delete a.encargos[k];
      }
      if (!Object.keys(a.encargos).length) delete a.encargos;
    }
    if (a.trabajos) for (const k of Object.keys(a.trabajos)) a.trabajos[k] = Math.floor(a.trabajos[k] * 0.9);
  }
  if (m.t % DIAS_ANIO < 30) {
    for (const a of vivas) {
      perfil(m, a);
      // La balanza recuerda sobre todo lo de los últimos años.
      if (a.balanza) {
        for (const lado of ['exporta', 'importa'] as const) {
          for (const k of Object.keys(a.balanza[lado])) {
            a.balanza[lado][k] = r2(a.balanza[lado][k] * 0.5);
            if (a.balanza[lado][k] < 1) delete a.balanza[lado][k];
          }
        }
      }
    }
  }
  // En invierno no se sale a comerciar.
  if (est === 3) return;
  const fuera = new Set<string>();
  for (const p of m.personas) if (p.viaje?.carga || p.viaje?.trato) fuera.add(`${p.aldea}-${p.viaje.a}`);
  for (const a of vivas) {
    const ga = ix.porAldea.get(a.id) ?? [];
    const mercaderes = ga.filter((p) => puedeIr(m, p));
    if (mercaderes.length < 2 || ga.length < 6) continue;
    // Con mercado y sabiendo comerciar se sale más a menudo.
    if (!prob(0.5 * (tiene(a, 'mercado') ? 1.4 : 1) * (conoce(a, 'comercio') ? 1.3 : 1))) continue;
    let mejor: { b: Aldea; t: Trato; v: number } | null = null;
    for (const b of socios(m, a, vivas)) {
      if (fuera.has(`${a.id}-${b.id}`)) continue;
      const t = tratar(m, a, ga, b, ix.porAldea.get(b.id) ?? [], est);
      if (!t) continue;
      const v = valor(b, t.lleva) + valor(a, t.trae) - t.coste;
      if (!mejor || v > mejor.v) mejor = { b, t, v };
    }
    if (mejor) {
      const p = mercaderes.reduce((x, y) => (y.genes.sociabilidad + y.genes.ambicion > x.genes.sociabilidad + x.genes.ambicion ? y : x));
      despachar(m, p, a, mejor.b, mejor.t);
      fuera.add(`${a.id}-${mejor.b.id}`);
    }
  }
  // Lo que falta y no ha venido nadie a ofrecer: se pide a los socios.
  for (const a of vivas) {
    const ga = ix.porAldea.get(a.id) ?? [];
    if (!ga.length) continue;
    const { falta } = balance(m, a, ga, est);
    if (!Object.keys(falta).length) continue;
    for (const b of socios(m, a, vivas)) {
      const e = (b.encargos ??= {});
      for (const [k, n] of Object.entries(falta)) e[k] = r2(Math.min(500, (e[k] ?? 0) + n));
    }
  }
}

/** El mercader sale con la carga (que deja de estar en la despensa). */
export function despachar(m: Mundo, p: Persona, a: Aldea, b: Aldea, t: Trato): void {
  const carga: Record<string, number> = {};
  for (const [k, n] of Object.entries(t.lleva)) {
    const hay = a.despensa[k] ?? 0;
    const sale = r2(Math.min(n, hay));
    if (sale <= 0) continue;
    apuntar(a, k, hay - sale);
    carga[k] = sale;
  }
  if (!Object.keys(carga).length) return;
  pisar(m, a.x, a.y, b.x, b.y, 20);
  p.viaje = { a: b.id, fase: 'ida', desde: [a.x, a.y], hasta: [b.x, b.y], salida: m.t, dias: t.dias, conocio: [], carga, trato: { trae: t.trae, ...(t.ayuda ? { ayuda: true } : {}) } };
}

const apuntarBalanza = (a: Aldea, lado: 'exporta' | 'importa', carga: Record<string, number>) => {
  const b = (a.balanza ??= { exporta: {}, importa: {} });
  for (const [k, n] of Object.entries(carga)) b[lado][k] = r2((b[lado][k] ?? 0) + n);
};

/** Lo que es cada cosa, para la crónica. */
const NOMBRE: Record<string, string> = { cereal: 'grano', semillas: 'grano', queso: 'quesos', madera: 'madera', piedra: 'piedra', arcilla: 'barro', fibra: 'fibra', piel: 'pieles', hueso: 'hueso', hierbas: 'hierbas', lana: 'lana', malaquita: 'cobre (malaquita)', casiterita: 'estaño (casiterita)', hematites: 'hierro (hematites)' };
const lista = (carga: Record<string, number>) => [...new Set(Object.keys(carga).map((k) => NOMBRE[k] ?? k))].join(', ').replace(/, ([^,]*)$/, ' y $1');

/**
 * El mercader llega: entrega lo que lleva y carga lo convenido (lo que a la otra aldea le
 * sigue sobrando ahora, sin tocar sus reservas).
 */
export function entregar(m: Mundo, p: Persona, casa: Aldea, dest: Aldea, gente: Persona[]): void {
  const v = p.viaje!;
  const lleva = v.carga ?? {};
  const hambre = balance(m, dest, gente, estacionDe(m.t)).falta.comida ?? 0;
  for (const [k, n] of Object.entries(lleva)) guardar(dest, k, n);
  apuntarBalanza(casa, 'exporta', lleva);
  apuntarBalanza(dest, 'importa', lleva);
  const trae: Record<string, number> = {};
  const { sobra } = balance(m, dest, gente, estacionDe(m.t));
  for (const [k, n] of Object.entries(v.trato?.trae ?? {})) {
    const sale = r2(Math.min(n, sobra[k] ?? 0, dest.despensa[k] ?? 0));
    if (sale < 1) continue;
    apuntar(dest, k, (dest.despensa[k] ?? 0) - sale);
    trae[k] = sale;
  }
  v.carga = trae;
  // El trato deja memoria: comerciar bien acerca; ayudar en el hambre, mucho más.
  const rel = relacion(m, casa.id, dest.id);
  rel.comercio = r2((rel.comercio ?? 0) + valor(dest, lleva) + valor(casa, trae));
  rel.afinidad = Math.min(1, r4(rel.afinidad + (v.trato?.ayuda && hambre > 0 ? 0.1 : 0.01)));
  if (v.trato?.ayuda && hambre > 0) rel.rencor = Math.max(Math.min(rel.rencor, r2((rel.agravio ?? 0) * 0.5)), r2(rel.rencor - 0.05));
  // La crónica: rutas nuevas, la primera vez que una aldea vende algo y la comida que salva.
  if (Object.keys(lleva).length && aviso(m, `ruta-${Math.min(casa.id, dest.id)}-${Math.max(casa.id, dest.id)}`, 10 * DIAS_ANIO)) {
    anotar(m, 'comercio', `Se abre una ruta comercial entre ${casa.nombre} y ${dest.nombre}: ${p.nombre} llega con ${lista(lleva)}${Object.keys(trae).length ? ` y vuelve con ${lista(trae)}` : ''}.`, casa.id);
  } else if (hambre > 0 && v.trato?.ayuda && aviso(m, `ayuda-${dest.id}`, DIAS_ANIO)) {
    anotar(m, 'comercio', `En ${dest.nombre} empezaba a faltar la comida: llega ${p.nombre} desde ${casa.nombre} con ${lista(lleva)}.`, dest.id);
  } else {
    for (const k of Object.keys(lleva)) {
      if (aviso(m, `exporta-${casa.id}-${NOMBRE[k] ?? k}`, 8 * DIAS_ANIO)) {
        anotar(m, 'comercio', `${casa.nombre} empieza a vender ${NOMBRE[k] ?? k} a otras aldeas: esta vez, a ${dest.nombre}.`, casa.id);
        break;
      }
    }
  }
}

/** De vuelta en casa: lo que trae entra en la despensa. */
export function descargar(casa: Aldea, p: Persona, dest: Aldea | undefined): void {
  const v = p.viaje;
  if (!v?.carga) return;
  for (const [k, n] of Object.entries(v.carga)) guardar(casa, k, n);
  if (dest) apuntarBalanza(casa, 'importa', v.carga);
  if (dest) apuntarBalanza(dest, 'exporta', v.carga);
  delete v.carga;
}

/** Si el viaje se tuerce (se queda allí, su aldea desaparece), lo que lleva queda donde está él. */
export function soltarCarga(m: Mundo, p: Persona): void {
  const v = p.viaje;
  if (!v?.carga) return;
  const vivas = aldeasVivas(m);
  const aqui = vivas.find((a) => a.id === p.aldea) ?? vivas.reduce<Aldea | null>((x, y) => (!x || Math.hypot(y.x - p.x, y.y - p.y) < Math.hypot(x.x - p.x, x.y - p.y) ? y : x), null);
  if (aqui) for (const [k, n] of Object.entries(v.carga)) guardar(aqui, k, n);
  delete v.carga;
}

/** Las actividades que cuentan para el perfil económico, y cómo se llama a quien las hace. */
export const OFICIO_SECTOR: Record<string, string> = {
  cultivar: 'labradores',
  pastorear: 'pastores',
  lenar: 'leñadores',
  picar: 'canteros y mineros',
  barro: 'alfareros',
  pescar: 'pescadores',
  cazar: 'cazadores',
  recolectar: 'recolectores',
  construir: 'constructores',
  comerciar: 'mercaderes',
};

/** Lo que hace hoy cada cual cuenta para el perfil de su aldea. */
export function anotarTrabajo(a: Aldea, actividad: string): void {
  if (!OFICIO_SECTOR[actividad]) return;
  const t = (a.trabajos ??= {});
  t[actividad] = (t[actividad] ?? 0) + 1;
}

/** Las actividades de una aldea, de más a menos, con su parte (0-1). */
export function sectores(a: Aldea): [string, number][] {
  const t = a.trabajos ?? {};
  const total = Object.values(t).reduce((s, v) => s + v, 0);
  if (!total) return [];
  return Object.entries(t)
    .map(([k, v]) => [k, v / total] as [string, number])
    .sort((x, y) => y[1] - x[1]);
}

/** Una vez al año: si un oficio ocupa a buena parte de la gente, ese es su perfil. */
function perfil(m: Mundo, a: Aldea): void {
  const s = sectores(a);
  const total = Object.values(a.trabajos ?? {}).reduce((x, v) => x + v, 0);
  const parte = (k: string | undefined) => s.find(([x]) => x === k)?.[1] ?? 0;
  // Un perfil no cambia por un año raro: otro oficio tiene que superarlo con claridad.
  let nuevo = a.perfil && parte(a.perfil) >= 0.25 && total >= 300 ? a.perfil : undefined;
  if (s.length && total >= 300 && s[0][1] >= 0.33 && s[0][1] >= parte(nuevo) + 0.1) nuevo = s[0][0];
  if (nuevo === a.perfil) return;
  if (nuevo === undefined) {
    delete a.perfil;
    return;
  }
  const antes = a.perfil;
  a.perfil = nuevo;
  if (aviso(m, `perfil-${a.id}-${nuevo}`, 10 * DIAS_ANIO)) {
    anotar(m, 'comercio', `${a.nombre} es ya un pueblo de ${OFICIO_SECTOR[nuevo]}: ${Math.round(s[0][1] * 100)} de cada cien jornadas se dedican a eso${antes ? ` (antes, sobre todo ${OFICIO_SECTOR[antes]})` : ''}.`, a.id);
  }
}
