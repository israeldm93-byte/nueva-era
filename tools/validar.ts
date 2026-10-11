// Validación de comportamiento a largo plazo: simula un mundo muchos años, observándolo
// día a día, y guarda un resumen con lo que se puede comprobar (no interpretaciones):
//   node tools/validar.ts <semilla|ruta.json> <años> <salida.json>
//
// Mide diferencias entre personas y aldeas, migraciones y lo que cambian en origen y
// destino, efecto de los lazos en opiniones, biografías contrastadas con el estado,
// repeticiones, estrategias dominantes, aldeas estancadas, acumulación de recursos y
// ciclos de metas. Además, cada década: salud y reservas, a qué dedican los adultos el
// día (y por qué descansan), lo que entra y sale de las despensas (producción y consumo),
// invariantes rotas y anomalías registradas, y diversidad de opiniones.

import { readFileSync, writeFileSync } from 'node:fs';
import { DIAS_ANIO, EDAD_ADULTA } from '../src/config.ts';
import { ORDEN_COMER, TECNICA } from '../src/catalogo.ts';
import { comidaTotal } from '../src/economia.ts';
import { comprobar } from '../src/invariantes.ts';
import { oficio } from '../src/individuo.ts';
import { lazo } from '../src/memoria.ts';
import { migrar } from '../src/migrar.ts';
import { crearMundo, edad } from '../src/mundo.ts';
import { avanzar } from '../src/simulacion.ts';
import type { Mundo, Persona } from '../src/tipos.ts';

const [origen, aniosTxt, salida] = process.argv.slice(2);
const anios = Number(aniosTxt ?? 100);
const m: Mundo = /^\d+$/.test(origen) ? crearMundo(Number(origen)) : migrar(JSON.parse(readFileSync(origen, 'utf8')));
const t0 = m.t;
const anio = (t: number) => Math.floor(t / DIAS_ANIO) + 1;
const r2 = (x: number) => Math.round(x * 100) / 100;
const entropia = (cuenta: Record<string, number>) => {
  const tot = Object.values(cuenta).reduce((s, v) => s + v, 0) || 1;
  let h = 0;
  for (const v of Object.values(cuenta)) if (v > 0) h -= (v / tot) * Math.log2(v / tot);
  return r2(h);
};

// --- Observación diaria ---
const dondeVive = new Map<number, number>();
for (const p of m.personas) dondeVive.set(p.id, p.aldea);
const migraciones: { anio: number; persona: string; id: number; de: string; a: string; deId: number; aId: number; pobDeAntes: number; pobAAntes: number; saberesPerdidosDe: string[]; saberesGanadosA: string[]; motivo: string | null }[] = [];
const cambiosMeta = new Map<number, { tipos: string[]; t: number[] }>();
const actividadDias: Record<string, number> = {};
let personaDias = 0;
const decadas: Record<string, unknown>[] = [];

// Anomalías: el motor avisa por console.warn («[anomalía] ...»); aquí solo se cuentan.
let anomaliasTot = 0;
const anomaliasEj: string[] = [];
const avisar = console.warn;
console.warn = (...x: unknown[]) => {
  const t = String(x[0] ?? '');
  if (t.startsWith('[anomalía]')) {
    anomaliasTot++;
    if (anomaliasEj.length < 10) anomaliasEj.push(t);
  } else avisar(...x);
};

// Flujos de las despensas: cada escritura se apunta como entrada (producción, botín,
// regalos) o salida (lo comido, gastado en obras y experimentos, lo podrido, lo cedido).
const vigiladas = new WeakSet<object>();
let entra: Record<string, number> = {};
let sale: Record<string, number> = {};
let escriturasRotas = 0;
function vigilar(): void {
  for (const a of m.aldeas) {
    if (vigiladas.has(a.despensa)) continue;
    const p = new Proxy(a.despensa, {
      set(o, k, v) {
        const antes = typeof o[k as string] === 'number' ? o[k as string] : 0;
        if (typeof v === 'number' && Number.isFinite(v) && Number.isFinite(antes)) {
          const d = v - antes;
          if (d > 0) entra[k as string] = (entra[k as string] ?? 0) + d;
          else if (d < 0) sale[k as string] = (sale[k as string] ?? 0) - d;
        } else escriturasRotas++;
        o[k as string] = v;
        return true;
      },
    });
    vigiladas.add(p);
    a.despensa = p;
  }
}

// Lo que se observa a diario y se resume por década.
let diaAdulto = 0;
let actAdulto: Record<string, number> = {};
const porQueDescansan = { viejo: 0, enfermo: 0, granero_lleno: 0, otro: 0 };
let saludSuma = 0;
let reservasSuma = 0;
let personasDia = 0;
let saludMin = 1;
let reservasMin = 8;
// Mudanzas de cada persona (para ver quién va y vuelve).
const recorrido = new Map<number, number[]>();

const nombreAldea = (id: number) => m.aldeas.find((a) => a.id === id)?.nombre ?? `#${id}`;
const pob = (id: number) => m.personas.filter((p) => p.aldea === id).length;

for (let d = 0; d < anios * DIAS_ANIO; d++) {
  const antes = new Map(m.aldeas.map((a) => [a.id, a.conocidos.slice()]));
  const pobAntes = new Map(m.aldeas.map((a) => [a.id, pob(a.id)]));
  const metasAntes = new Map(m.personas.map((p) => [p.id, p.meta?.motivo ?? null]));
  vigilar();
  avanzar(m, 1);
  // Días de comida guardada en cada aldea (para saber si quien descansa podría permitírselo).
  const diasComida = new Map<number, number>();
  for (const a of m.aldeas) {
    if (a.abandonada !== null) continue;
    diasComida.set(a.id, comidaTotal(a) / Math.max(1, pob(a.id) * 0.9));
  }
  for (const p of m.personas) {
    personaDias++;
    actividadDias[p.actividad] = (actividadDias[p.actividad] ?? 0) + 1;
    personasDia++;
    const sa = Number.isFinite(p.salud) ? p.salud : 0;
    const re = Number.isFinite(p.reservas) ? p.reservas : 0;
    saludSuma += sa;
    reservasSuma += re;
    saludMin = Math.min(saludMin, sa);
    reservasMin = Math.min(reservasMin, re);
    const e = edad(m, p);
    if (e >= EDAD_ADULTA && !p.mudanza) {
      diaAdulto++;
      actAdulto[p.actividad] = (actAdulto[p.actividad] ?? 0) + 1;
      if (p.actividad === 'descansar') {
        if (e > 65) porQueDescansan.viejo++;
        else if (p.salud < 0.75) porQueDescansan.enfermo++;
        else if ((diasComida.get(p.aldea) ?? 0) > 270) porQueDescansan.granero_lleno++;
        else porQueDescansan.otro++;
      }
    }
    const prev = dondeVive.get(p.id);
    // Cambio de aldea por mudanza (no por cisma ni división: esas crean aldeas nuevas).
    if (prev !== undefined && prev !== p.aldea && p.mudanza && p.mudanza.salida === m.t - 1) {
      const de = m.aldeas.find((a) => a.id === prev);
      const a = m.aldeas.find((x) => x.id === p.aldea);
      if (de && a) {
        migraciones.push({
          anio: anio(m.t),
          persona: p.nombre,
          id: p.id,
          de: de.nombre,
          a: a.nombre,
          deId: de.id,
          aId: a.id,
          pobDeAntes: pobAntes.get(de.id) ?? 0,
          pobAAntes: pobAntes.get(a.id) ?? 0,
          saberesPerdidosDe: (antes.get(de.id) ?? []).filter((s) => !de.conocidos.includes(s)),
          saberesGanadosA: a.conocidos.filter((s) => !(antes.get(a.id) ?? []).includes(s)),
          motivo: metasAntes.get(p.id) ?? null,
        });
        const r = recorrido.get(p.id) ?? [prev];
        r.push(p.aldea);
        recorrido.set(p.id, r);
      }
    }
    dondeVive.set(p.id, p.aldea);
    // La meta con su objeto: aprender a hilar y luego a tejer son dos metas, no un vaivén.
    const tipo = p.meta ? `${p.meta.tipo}${p.meta.ref !== undefined ? `:${p.meta.ref}` : ''}` : '-';
    const c = cambiosMeta.get(p.id) ?? { tipos: [], t: [] };
    if (c.tipos[c.tipos.length - 1] !== tipo) {
      c.tipos.push(tipo);
      c.t.push(m.t);
      cambiosMeta.set(p.id, c);
    }
  }
  if ((d + 1) % (DIAS_ANIO * 10) === 0) decadas.push(foto());
}

/** Una foto del mundo: lo que permite comparar aldeas y personas. */
function foto(): Record<string, unknown> {
  const vivas = m.aldeas.filter((a) => a.abandonada === null);
  const aldeas = vivas.map((a) => {
    const gente = m.personas.filter((p) => p.aldea === a.id);
    const ofi: Record<string, number> = {};
    const metas: Record<string, number> = {};
    for (const p of gente) {
      const o = oficio(p);
      if (o) ofi[o] = (ofi[o] ?? 0) + 1;
      if (p.meta) metas[p.meta.tipo] = (metas[p.meta.tipo] ?? 0) + 1;
    }
    const n = Math.max(1, gente.length);
    const porCabeza = (k: string) => r2((a.despensa[k] ?? 0) / n);
    return {
      nombre: a.nombre,
      pob: gente.length,
      edad: a.edad ?? 0,
      rango: a.rango ?? 'aldea',
      saberes: a.conocidos.length,
      valor: a.valor ?? null,
      consejo: a.consejo?.prioridad ?? null,
      guerra: a.consejo?.guerra ? nombreAldea(a.consejo.guerra.contra) : null,
      oficios: ofi,
      metas,
      edificios: a.edificios.length,
      casas: a.edificios.filter((e) => ['choza', 'casa', 'casapiedra', 'casatejas'].includes(e.tipo)).map((e) => e.tipo).sort().join(','),
      porCabeza: { cereal: porCabeza('cereal'), piedra: porCabeza('piedra'), piel: porCabeza('piel'), hueso: porCabeza('hueso'), hierbas: porCabeza('hierbas'), madera: porCabeza('madera') },
    };
  });
  const adultos = m.personas.filter((p) => edad(m, p) >= 18);
  const ofiTot: Record<string, number> = {};
  const metaTot: Record<string, number> = {};
  for (const p of adultos) {
    const o = oficio(p) ?? 'sin oficio';
    ofiTot[o] = (ofiTot[o] ?? 0) + 1;
    const k = p.meta?.tipo ?? 'ninguna';
    metaTot[k] = (metaTot[k] ?? 0) + 1;
  }
  const h = m.historia.slice(-10);
  const muertes: Record<string, number> = {};
  for (const f of h) for (const [k, v] of Object.entries(f.muertes ?? {})) muertes[k] = (muertes[k] ?? 0) + v;
  const aniosPersona = Math.max(1, personasDia / DIAS_ANIO);
  const flujos: Record<string, { stock: number; entra: number; sale: number }> = {};
  const stock: Record<string, number> = {};
  for (const a of vivas) for (const [k, v] of Object.entries(a.despensa)) stock[k] = (stock[k] ?? 0) + (Number.isFinite(v) ? v : 0);
  const pobT = Math.max(1, m.personas.length);
  for (const k of new Set([...Object.keys(stock), ...Object.keys(entra), ...Object.keys(sale)])) {
    // Por persona: lo que hay ahora, y lo que entró y salió en un año medio de la década.
    flujos[k] = { stock: r2((stock[k] ?? 0) / pobT), entra: r2((entra[k] ?? 0) / aniosPersona), sale: r2((sale[k] ?? 0) / aniosPersona) };
  }
  const comidaEntra = ORDEN_COMER.reduce((s2, k) => s2 + (entra[k] ?? 0), 0);
  const comidaSale = ORDEN_COMER.reduce((s2, k) => s2 + (sale[k] ?? 0), 0);
  const actividadAdultos = Object.fromEntries(Object.entries(actAdulto).map(([k, v]) => [k, r2(v / Math.max(1, diaAdulto))]).sort((x, y) => y[1] - x[1]));
  const descanso = Object.fromEntries(Object.entries(porQueDescansan).map(([k, v]) => [k, r2(v / Math.max(1, diaAdulto))]));
  const saberesAldea = vivas.map((a) => a.conocidos.length);
  const invariantes = comprobar(m);
  const extra = {
    saludMedia: r2(saludSuma / Math.max(1, personasDia)),
    saludMin: r2(saludMin),
    reservasMedia: r2(reservasSuma / Math.max(1, personasDia)),
    reservasMin: r2(reservasMin),
    muertes,
    nacimientos: h.reduce((s2, f) => s2 + (f.nacimientos ?? 0), 0),
    actividadAdultos,
    descansoAdultos: descanso,
    comidaPorPersonaAnio: { entra: r2(comidaEntra / aniosPersona), sale: r2(comidaSale / aniosPersona) },
    flujos,
    saberesAldea: { min: saberesAldea.length ? Math.min(...saberesAldea) : 0, max: Math.max(0, ...saberesAldea), todas: saberesAldea.filter((x) => x >= Object.keys(TECNICA).length).length },
    edades: vivas.map((a) => a.edad ?? 0),
    opiniones: diversidad(),
    invariantesRotas: invariantes.length,
    invariantesEj: invariantes.slice(0, 5),
    anomalias: anomaliasTot,
    escriturasRotas,
  };
  entra = {};
  sale = {};
  diaAdulto = 0;
  actAdulto = {};
  for (const k of Object.keys(porQueDescansan) as (keyof typeof porQueDescansan)[]) porQueDescansan[k] = 0;
  saludSuma = 0;
  reservasSuma = 0;
  personasDia = 0;
  saludMin = 1;
  reservasMin = 8;
  return {
    ...extra,
    anio: anio(m.t),
    poblacion: m.personas.length,
    aldeas: vivas.length,
    saberesMundo: Object.keys(m.hallazgos).length,
    oficios: ofiTot,
    entropiaOficios: entropia(ofiTot),
    metas: metaTot,
    entropiaMetas: entropia(metaTot),
    migrantesDecada: h.reduce((s, f) => s + (f.migrantes ?? 0), 0),
    asaltosDecada: h.reduce((s, f) => s + (f.asaltos ?? 0), 0),
    conRival: m.personas.filter((p) => p.lazos?.some(([, v]) => v < -0.2)).length,
    detalle: aldeas,
  };
}

/** Diversidad de opiniones: entropía media por aldea y aldeas donde todos opinan lo mismo. */
function diversidad(): { entropiaMedia: number; unanimes: number; aldeas: number; acuerdoAzar: number } {
  let suma = 0;
  let n = 0;
  let unanimes = 0;
  let az = 0;
  let azN = 0;
  for (const a of m.aldeas) {
    if (a.abandonada !== null) continue;
    const adultos = m.personas.filter((p) => p.aldea === a.id && edad(m, p) >= 16);
    if (adultos.length < 4) continue;
    const c: Record<string, number> = {};
    for (const p of adultos) c[p.opinion] = (c[p.opinion] ?? 0) + 1;
    suma += entropia(c);
    n++;
    if (Object.keys(c).length === 1) unanimes++;
    for (let i = 0; i < adultos.length; i++) {
      for (let j = 1; j <= 3; j++) {
        const q = adultos[(i + j * 7) % adultos.length];
        if (q === adultos[i]) continue;
        azN++;
        if (q.opinion === adultos[i].opinion) az++;
      }
    }
  }
  return { entropiaMedia: r2(suma / Math.max(1, n)), unanimes, aldeas: n, acuerdoAzar: r2(az / Math.max(1, azN)) };
}

// --- ¿Pesan los lazos en lo que se opina? Acuerdo entre amigos frente a pares al azar ---
function acuerdo(): { amigos: number; rivales: number; azar: number; paresAmigos: number; paresRivales: number } {
  let am = 0;
  let amN = 0;
  let ri = 0;
  let riN = 0;
  let az = 0;
  let azN = 0;
  const porId = new Map(m.personas.map((p) => [p.id, p]));
  for (const p of m.personas) {
    if (edad(m, p) < 16) continue;
    for (const [id, v] of p.lazos ?? []) {
      const q = porId.get(id);
      if (!q || q.aldea !== p.aldea || edad(m, q) < 16) continue;
      if (v > 0.4) {
        amN++;
        if (q.opinion === p.opinion) am++;
      } else if (v < -0.2) {
        riN++;
        if (q.opinion === p.opinion) ri++;
      }
    }
    const misma = m.personas.filter((q) => q !== p && q.aldea === p.aldea && edad(m, q) >= 16);
    for (const q of misma.slice(0, 5)) {
      azN++;
      if (q.opinion === p.opinion) az++;
    }
  }
  return { amigos: r2(am / Math.max(1, amN)), rivales: r2(ri / Math.max(1, riN)), azar: r2(az / Math.max(1, azN)), paresAmigos: amN, paresRivales: riN };
}

// --- ¿Son verificables las biografías? Contrastar hitos con el estado y la crónica ---
function biografias(): Record<string, [number, number]> {
  const v: Record<string, [number, number]> = {};
  const ok = (k: string, bien: boolean) => {
    v[k] ??= [0, 0];
    v[k][0] += bien ? 1 : 0;
    v[k][1]++;
  };
  const porNombre = new Map<string, Persona[]>();
  for (const p of m.personas) porNombre.set(p.nombre, [...(porNombre.get(p.nombre) ?? []), p]);
  for (const p of m.personas) {
    for (const [t, tipo, dato] of p.vida ?? []) {
      if (tipo === 'descubre') {
        ok('descubre (lo sabe)', p.saberes.some((s) => TECNICA[s]?.nombre === dato));
        // Si fue el primero del mundo o de su aldea, la crónica lo cuenta con su nombre.
        const id = Object.keys(TECNICA).find((k) => TECNICA[k].nombre === dato);
        if (id && m.hallazgos[id]?.porId === p.id) ok('descubre (primero del mundo: consta en hallazgos y crónica)', m.cronica.some((s) => s.tipo === 'descubrimiento' && s.texto.includes(p.nombre)));
      }
      if (tipo === 'funda') ok('funda (la aldea existe o existió)', m.aldeas.some((a) => a.nombre === dato));
      if (tipo === 'emigra') ok('emigra (la aldea existe o existió)', m.aldeas.some((a) => a.nombre === dato));
      if (tipo === 'pareja' && p.pareja !== null) {
        const q = m.personas.find((x) => x.id === p.pareja);
        if (q && p.vida!.filter((h) => h[1] === 'pareja').slice(-1)[0][2] === dato) ok('pareja (es su pareja actual)', q.nombre === dato);
      }
      if (tipo === 'consejo') ok('consejo (cuenta como hito en una aldea real)', m.aldeas.some((a) => a.nombre === dato));
      if (tipo === 'lidera') ok('lidera (la facción está en la crónica)', m.cronica.some((s) => s.texto.includes(`los ${dato}`)));
      void t;
    }
  }
  return v;
}

// --- Ciclos de metas: A -> B -> A en menos de un año ---
let vaivenes = 0;
let cambios = 0;
const vaivenesPorTipo: Record<string, number> = {};
const duracionMetas: Record<string, number[]> = {};
for (const c of cambiosMeta.values()) {
  cambios += c.tipos.length - 1;
  for (let i = 2; i < c.tipos.length; i++) {
    if (c.tipos[i] === c.tipos[i - 2] && c.t[i] - c.t[i - 2] < DIAS_ANIO && c.tipos[i] !== '-') {
      vaivenes++;
      const k = [c.tipos[i - 2], c.tipos[i - 1], c.tipos[i]].map((x) => x.split(':')[0]).join('>');
      vaivenesPorTipo[k] = (vaivenesPorTipo[k] ?? 0) + 1;
    }
  }
  // Cuánto dura cada meta antes de cambiar (solo las que terminan dentro de la simulación).
  for (let i = 1; i < c.tipos.length; i++) (duracionMetas[c.tipos[i - 1].split(':')[0]] ??= []).push(c.t[i] - c.t[i - 1]);
}
const mediana = (xs: number[]) => (xs.length ? xs.slice().sort((x, y) => x - y)[Math.floor(xs.length / 2)] : 0);
const duracionMediana = Object.fromEntries(Object.entries(duracionMetas).map(([k, v]) => [k, { n: v.length, dias: mediana(v) }]));

// --- Idas y vueltas: quien vuelve a una aldea de la que se había ido ---
let vueltas = 0;
let conTresOMas = 0;
let maxMudanzas = 0;
for (const r of recorrido.values()) {
  const n = r.length - 1;
  maxMudanzas = Math.max(maxMudanzas, n);
  if (n >= 3) conTresOMas++;
  for (let i = 1; i < r.length; i++) if (r.slice(0, i).includes(r[i])) vueltas++;
}
// Cuánto tarda en volver quien vuelve (días entre que deja una aldea y regresa a ella).
const tVuelta: number[] = [];
const ultimaSalida = new Map<string, number>();
for (const g of migraciones) {
  const k = `${g.id}:${g.aId}`;
  const sal = ultimaSalida.get(k);
  if (sal !== undefined) tVuelta.push((g.anio - sal) * 1);
  ultimaSalida.set(`${g.id}:${g.deId}`, g.anio);
}
const motivos: Record<string, number> = {};
for (const g of migraciones) {
  const k = (g.motivo ?? '').split(': ').slice(1).join(': ').split(',')[0] || '(sin motivo)';
  motivos[k] = (motivos[k] ?? 0) + 1;
}
const aniosPersonaTot = personaDias / DIAS_ANIO;

// Si la simulación acaba justo en una década, la foto final es la de esa década (no otra
// con los contadores recién puestos a cero).
const final = decadas.length && anios % 10 === 0 ? decadas[decadas.length - 1] : foto();
const actTot = Object.values(actividadDias).reduce((s, v) => s + v, 0);
const resumen = {
  origen,
  semilla: m.semilla,
  anios,
  desdeAnio: anio(t0),
  hastaAnio: anio(m.t),
  final,
  decadas,
  actividades: Object.fromEntries(Object.entries(actividadDias).map(([k, v]) => [k, r2(v / actTot)]).sort((a, b) => b[1] - a[1])),
  migraciones,
  mudanzas: {
    total: migraciones.length,
    personas: recorrido.size,
    vueltas,
    vueltasMismoAnio: tVuelta.filter((x) => x === 0).length,
    vueltasMenosDe5Anios: tVuelta.filter((x) => x < 5).length,
    conTresOMas,
    maxMudanzas,
    porMilPersonasAnio: r2((migraciones.length / Math.max(1, aniosPersonaTot)) * 1000),
    motivos: Object.fromEntries(Object.entries(motivos).sort((x, y) => y[1] - x[1]).slice(0, 8)),
  },
  anomalias: { total: anomaliasTot, ejemplos: anomaliasEj },
  acuerdoOpiniones: acuerdo(),
  biografias: biografias(),
  ciclosMetas: {
    cambios,
    vaivenesMenosDeUnAnio: vaivenes,
    personas: cambiosMeta.size,
    cambiosPorPersonaAnio: r2(cambios / Math.max(1, aniosPersonaTot)),
    vaivenesPorTipo: Object.fromEntries(Object.entries(vaivenesPorTipo).sort((x, y) => y[1] - x[1]).slice(0, 12)),
    duracionMediana,
  },
  cronica: m.cronica
    .filter((s) => s.t > t0 && ['cisma', 'fundacion', 'migracion', 'guerra', 'paz', 'asalto', 'edad', 'perdida', 'redescubrimiento', 'alianza', 'abandono', 'lobos', 'hambre', 'epidemia', 'olvido'].includes(s.tipo))
    .map((s) => [anio(s.t), s.tipo, s.texto]),
  vidas: m.personas
    .filter((p) => (p.vida?.length ?? 0) >= 6)
    .sort((a, b) => (b.vida?.length ?? 0) - (a.vida?.length ?? 0))
    .slice(0, 12)
    .map((p) => ({
      id: p.id,
      nombre: p.nombre,
      aldea: nombreAldea(p.aldea),
      edad: Math.floor(edad(m, p)),
      vida: (p.vida ?? []).map(([t, tipo, d]) => [anio(t), tipo, d ?? null]),
      meta: p.meta ?? null,
      recuerdos: (p.recuerdos ?? []).map(([t, tipo, ref, w]) => [anio(t), tipo, typeof ref === 'number' ? nombreAldea(ref) : ref, w]),
      lazos: (p.lazos ?? []).map(([id, v]) => [m.personas.find((q) => q.id === id)?.nombre ?? `#${id}`, v]),
      genes: p.genes,
    })),
  tumbasNotables: m.aldeas.flatMap((a) => (a.tumbas ?? []).filter((g) => (g.descubrio?.length ?? 0) > 0 || g.causa === 'combate').map((g) => ({ aldea: a.nombre, anio: anio(g.t), nombre: g.nombre, edad: g.edad, causa: g.causa, oficio: g.oficio }))).slice(-20),
};
writeFileSync(salida, JSON.stringify(resumen, null, 1));
console.log(`${origen}: ${anios} años · población ${final.poblacion} · aldeas ${final.aldeas} · migraciones ${migraciones.length} (vueltas ${vueltas}) · ciclos de metas ${vaivenes}/${cambios} · anomalías ${anomaliasTot} · invariantes rotas ${final.invariantesRotas}`);
