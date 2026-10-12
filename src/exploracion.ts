// Descubrir lo que hay al otro lado del mar.
//
// Desde el continente de siempre no se ven las tierras de ultramar: hay que ir a buscarlas.
// Una aldea de la costa que sabe hacer canoas, que tiene comida de sobra y gente inquieta
// puede preparar una barca: madera para hacerla, víveres para el viaje y dos o tres
// tripulantes que dejan de trabajar en casa durante semanas. Zarpan hacia un rumbo y
// navegan días: si ven tierra que nadie de los suyos conocía, desembarcan, la recorren
// unos días y vuelven; si no, se dan la vuelta cuando ya no les da para más. En el mar
// pueden naufragar (más con tormenta y en invierno; menos con barcos de vela).
//
// Lo que hallan viaja con ellos: la aldea no sabe nada hasta que vuelven. Solo entonces
// conoce esa tierra (y lo que allí se vio), y solo entonces puede pensar en irse a vivir
// allí. Las aldeas que nacen de ella heredan lo que sabía, y las visitas lo cuentan.

import { elegir, elegirPeso, prob } from './azar.ts';
import { DIAS_ANIO } from './config.ts';
import { AGUA, BOSQUE, COLINA, DESIERTO, ESTEPA, MONTANA, ORDEN_COMER, ORILLA, PANTANO, PRADERA, RIO, TUNDRA } from './catalogo.ts';
import { anotar } from './cronica.ts';
import { alimento, apuntar, comidaTotal, conoce, necesidad } from './economia.ts';
import { aviso } from './fauna.ts';
import { conoceTierra, deUltramar, direccion, masas } from './mapa.ts';
import { distancia } from './matematicas.ts';
import { afamar, hito } from './memoria.ts';
import { edad, type Indices } from './mundo.ts';
import { morir } from './sociedad.ts';
import type { Aldea, Mundo, Persona, Travesia } from './tipos.ts';
import { frioDe } from './ultramar.ts';

const r2 = (x: number) => Math.round(x * 100) / 100;

/** Casillas por día: a pie hasta la costa, y en el mar en canoa o en barco de vela. */
const A_PIE = 1.5;
const EN_CANOA = 2.5;
const A_VELA = 4;
/** Lo más lejos que se aventuran mar adentro antes de darse la vuelta. */
const ALCANCE_CANOA = 32;
const ALCANCE_VELA = 90;
/** Días que pasan recorriendo la tierra que encuentran. */
export const ESTANCIA_TIERRA = 4;
/** A cuántas casillas del mar puede quedar la aldea para salir a explorarlo. */
const COSTA = 10;
/** Riesgo de naufragar cada día en el mar (en canoa y a vela), sin tormenta y fuera del invierno. */
const NAUFRAGIO_CANOA = 0.004;
const NAUFRAGIO_VELA = 0.0015;
/** Madera para la barca. */
const MADERA_BARCA = 4;

const RUMBOS: [number, number][] = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

const cacheMar = new WeakMap<number[], Uint8Array>();

/** El mar abierto: el agua unida al borde del mapa (los lagos no cuentan). */
export function marAbierto(m: Mundo): Uint8Array {
  let mar = cacheMar.get(m.terreno);
  if (mar) return mar;
  const W = m.ancho;
  const H = m.alto;
  mar = new Uint8Array(W * H);
  const cola: number[] = [];
  for (let i = 0; i < W * H; i++) {
    const x = i % W;
    const y = (i - x) / W;
    if ((x === 0 || y === 0 || x === W - 1 || y === H - 1) && m.terreno[i] === AGUA) {
      mar[i] = 1;
      cola.push(i);
    }
  }
  while (cola.length) {
    const i = cola.pop()!;
    const x = i % W;
    const y = (i - x) / W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx;
      const yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const j = yy * W + xx;
      if (!mar[j] && m.terreno[j] === AGUA) {
        mar[j] = 1;
        cola.push(j);
      }
    }
  }
  cacheMar.set(m.terreno, mar);
  return mar;
}

/** La casilla de mar abierto más cercana a la aldea (a menos de `COSTA`), de donde zarpan. */
export function puerto(m: Mundo, a: Aldea): [number, number] | null {
  const mar = marAbierto(m);
  let mejor: [number, number] | null = null;
  let d0 = Infinity;
  for (let y = Math.max(0, a.y - COSTA); y <= Math.min(m.alto - 1, a.y + COSTA); y++) {
    for (let x = Math.max(0, a.x - COSTA); x <= Math.min(m.ancho - 1, a.x + COSTA); x++) {
      if (!mar[y * m.ancho + x]) continue;
      const d = distancia(x - a.x, y - a.y);
      if (d <= COSTA && d < d0) {
        d0 = d;
        mejor = [x, y];
      }
    }
  }
  return mejor;
}

/**
 * Lo que pasará si navegan desde `p` con ese rumbo: dónde acaba la ida y si allí hay
 * tierra nueva (de ultramar, que no conocen). Se navega hasta ver tierra (a dos casillas),
 * hasta topar con una costa conocida, hasta el fin del mapa o hasta el alcance de la barca.
 */
export function trazar(m: Mundo, a: Aldea, p: [number, number], rumbo: [number, number], alcance: number): { fin: [number, number]; tierra: [number, number] | null; costa: boolean } {
  const W = m.ancho;
  const nueva = (x: number, y: number) => m.terreno[y * W + x] !== AGUA && m.terreno[y * W + x] !== RIO && deUltramar(x, y) && !conoceTierra(m, a, y * W + x);
  let [x, y] = p;
  for (let k = 1; distancia(x - p[0], y - p[1]) < alcance; k++) {
    const nx = x + rumbo[0];
    const ny = y + rumbo[1];
    if (nx < 0 || ny < 0 || nx >= W || ny >= m.alto) break;
    if (m.terreno[ny * W + nx] !== AGUA) {
      if (nueva(nx, ny)) return { fin: [nx, ny], tierra: [nx, ny], costa: true };
      // Una costa que ya conocen: se dan la vuelta.
      return { fin: [x, y], tierra: null, costa: true };
    }
    x = nx;
    y = ny;
    // Tierra a la vista.
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const vx = x + dx;
        const vy = y + dy;
        if (vx < 0 || vy < 0 || vx >= W || vy >= m.alto) continue;
        if (nueva(vx, vy)) return { fin: [vx, vy], tierra: [vx, vy], costa: true };
      }
    }
  }
  return { fin: [x, y], tierra: null, costa: false };
}

/** Adulto en edad de remar, sano, bien comido y sin otra cosa entre manos. */
function puedeEmbarcar(m: Mundo, p: Persona): boolean {
  const e = edad(m, p);
  return e >= 18 && e <= 50 && p.salud >= 0.8 && p.reservas >= 4 && !p.viaje && !p.mudanza && !p.muerto;
}

/** Saca de la despensa comida que alimente `cuanto` (lo que más aguanta, primero). */
function cargarViveres(a: Aldea, cuanto: number): number {
  let lleva = 0;
  for (const mat of [...ORDEN_COMER].reverse()) {
    const v = a.despensa[mat] ?? 0;
    const n = alimento(a, mat);
    if (v <= 0 || n <= 0) continue;
    const toma = Math.min(v * n, cuanto - lleva);
    apuntar(a, mat, v - toma / n);
    lleva += toma;
    if (lleva >= cuanto - 1e-9) break;
  }
  return r2(lleva);
}

/**
 * Quizá alguien de esta aldea se echa al mar a ver qué hay más allá. Hace falta saber
 * hacer canoas, vivir cerca del mar abierto, tener comida de sobra y madera para la
 * barca, y gente con ganas. Nadie sale en invierno (eso lo mira quien llama).
 */
export function zarpar(m: Mundo, a: Aldea, gente: Persona[], forzar: { rumbo?: [number, number] } | null = null): boolean {
  if (a.viaje || a.abandonada !== null || !conoce(a, 'canoa')) return false;
  // Una barca cada vez.
  if (gente.some((p) => p.viaje?.mar)) return false;
  const vela = conoce(a, 'vela');
  const tripulacion = vela ? 3 : 2;
  const candidatos = gente.filter((p) => puedeEmbarcar(m, p));
  if (candidatos.length < tripulacion + 2 || gente.filter((p) => edad(m, p) >= 16).length < 8) return false;
  if ((a.despensa.madera ?? 0) < MADERA_BARCA) return false;
  if (comidaTotal(a) / Math.max(1, gente.length * 0.9) < 50) return false;
  if (!forzar) {
    // Más ganas en un pueblo de caminantes, con barcos de vela y mientras nada se sepa de
    // lo que hay al otro lado; y más cuanto más curiosa es su gente.
    const curiosidad = candidatos.reduce((s, p) => s + p.genes.curiosidad, 0) / candidatos.length;
    const expandir = a.valor === 'expandir' || a.consejo?.prioridad === 'expandir';
    const ganas = (1 / (DIAS_ANIO * 4)) * (expandir ? 2 : 1) * (vela ? 1.5 : 1) * 0.5 ** (a.tierras?.length ?? 0) * (0.6 + curiosidad);
    if (!prob(ganas)) return false;
  }
  const desde = puerto(m, a);
  if (!desde) return false;
  // Rumbos que salen a mar abierto (no los que se meten en la costa).
  const mar = marAbierto(m);
  const libres = RUMBOS.filter(([dx, dy]) => {
    for (let k = 1; k <= 3; k++) {
      const x = desde[0] + dx * k;
      const y = desde[1] + dy * k;
      if (x < 0 || y < 0 || x >= m.ancho || y >= m.alto || !mar[y * m.ancho + x]) return false;
    }
    return true;
  });
  if (!libres.length) return false;
  const rumbo = forzar?.rumbo && libres.some(([dx, dy]) => dx === forzar.rumbo![0] && dy === forzar.rumbo![1]) ? forzar.rumbo : elegir(libres);
  const velocidad = vela ? A_VELA : EN_CANOA;
  const { fin, tierra, costa } = trazar(m, a, desde, rumbo, vela ? ALCANCE_VELA : ALCANCE_CANOA);
  const ida = Math.max(3, Math.ceil(distancia(desde[0] - a.x, desde[1] - a.y) / A_PIE + distancia(fin[0] - desde[0], fin[1] - desde[1]) / velocidad));
  // La tripulación: los más curiosos y osados (y los menos prudentes).
  const van: Persona[] = [];
  const quedan = candidatos.slice();
  for (let k = 0; k < tripulacion; k++) {
    const p = elegirPeso(quedan, (q) => 0.2 + q.genes.curiosidad + 0.5 * q.genes.ambicion + 0.5 * (1 - q.genes.prudencia));
    if (!p) break;
    van.push(p);
    quedan.splice(quedan.indexOf(p), 1);
  }
  // Víveres para ida, estancia y vuelta, con algo de margen.
  const dias = 2 * ida + (tierra ? ESTANCIA_TIERRA : 0);
  const viveres = cargarViveres(a, dias * van.length * 1.2);
  apuntar(a, 'madera', (a.despensa.madera ?? 0) - MADERA_BARCA);
  const barca = van[0].id;
  for (const p of van) {
    const mar: Travesia = { barca, rumbo, viveres: r2(viveres / van.length), ida, zarpo: m.t };
    if (tierra) mar.tierra = tierra;
    else if (costa) mar.costa = true;
    p.viaje = { a: a.id, fase: 'ida', desde: [a.x, a.y], hasta: fin, salida: m.t, dias: ida, conocio: [], mar };
  }
  if (aviso(m, `zarpa-${a.id}`, DIAS_ANIO)) {
    const nombres = van.map((p) => p.nombre);
    const quien = nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}` : nombres[0];
    anotar(m, 'exploracion', `${quien} preparan ${vela ? 'un barco de vela' : 'una canoa'} con víveres para ${dias} días y zarpan de ${a.nombre} mar adentro, hacia ${direccion(a, a.x + rumbo[0] * 10, a.y + rumbo[1] * 10)}, a ver qué hay más allá.`, a.id);
  }
  return true;
}

/** Cómo es una tierra, contado por quien la ha recorrido. */
export function describir(m: Mundo, x: number, y: number): string {
  const cuenta = new Map<string, number>();
  const { masa } = masas(m);
  const k = masa[y * m.ancho + x];
  const frio = frioDe(m, x, y) > 0.3;
  for (let dy = -7; dy <= 7; dy++) {
    for (let dx = -7; dx <= 7; dx++) {
      const xx = x + dx;
      const yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= m.ancho || yy >= m.alto || masa[yy * m.ancho + xx] !== k) continue;
      const t = m.terreno[yy * m.ancho + xx];
      const nombre =
        t === TUNDRA ? 'tundra helada'
        : t === BOSQUE ? (frio ? 'bosques de abetos' : 'bosques')
        : t === PRADERA ? 'praderas'
        : t === ESTEPA ? 'llanuras secas'
        : t === DESIERTO ? 'arenales'
        : t === COLINA ? 'colinas'
        : t === MONTANA ? 'montañas'
        : t === PANTANO ? 'pantanos'
        : t === ORILLA ? 'playas'
        : null;
      if (nombre) cuenta.set(nombre, (cuenta.get(nombre) ?? 0) + 1);
    }
  }
  const lo = [...cuenta.entries()].sort((p, q) => q[1] - p[1]).slice(0, 2).map(([n]) => n);
  let tam = 0;
  for (const v of masa) if (v === k) tam++;
  const que = tam < 600 ? 'una isla' : 'una tierra grande';
  return `${que} de ${lo.join(' y ') || 'roca'}`;
}

/** Los minerales que se ven en esa tierra (cerca de donde desembarcan). */
function minerales(m: Mundo, x: number, y: number): string[] {
  const out: string[] = [];
  for (const mat of ['malaquita', 'casiterita', 'hematites']) {
    let hay = false;
    for (let dy = -7; dy <= 7 && !hay; dy++) {
      for (let dx = -7; dx <= 7 && !hay; dx++) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < m.ancho && yy < m.alto && m.recursos[mat][yy * m.ancho + xx] > 0) hay = true;
      }
    }
    if (hay) out.push(mat);
  }
  return out;
}

/** Dónde va cada día: en línea de `desde` a `hasta` según los días que lleva. */
function posicion(m: Mundo, v: NonNullable<Persona['viaje']>): [number, number] {
  const f = Math.min(1, (m.t - v.salida) / v.dias);
  return [Math.round(v.desde[0] + (v.hasta[0] - v.desde[0]) * f), Math.round(v.desde[1] + (v.hasta[1] - v.desde[1]) * f)];
}

/** Riesgo de naufragar hoy (si están en el mar). */
export function riesgoNaufragio(m: Mundo, vela: boolean, invierno: boolean): number {
  return (vela ? NAUFRAGIO_VELA : NAUFRAGIO_CANOA) * (m.tiempo === 'tormenta' ? 5 : 1) * (invierno ? 2 : 1);
}

/** Cada día, cada barca: comen a bordo, corren su suerte en el mar y siguen su viaje. */
export function navegar(m: Mundo, ix: Indices, invierno: boolean): void {
  const barcas = new Map<number, Persona[]>();
  for (const p of m.personas) {
    if (!p.viaje?.mar || p.muerto) continue;
    const b = barcas.get(p.viaje.mar.barca);
    if (b) b.push(p);
    else barcas.set(p.viaje.mar.barca, [p]);
  }
  for (const grupo of barcas.values()) singladura(m, grupo, ix, invierno);
}

function singladura(m: Mundo, grupo: Persona[], ix: Indices, invierno: boolean): void {
  const v0 = grupo[0].viaje!;
  const casa = m.aldeas.find((a) => a.id === v0.a);
  // Si su aldea ya no existe, se quedan donde estén (y la vida decidirá).
  if (!casa || casa.abandonada !== null) {
    for (const p of grupo) delete p.viaje;
    return;
  }
  // A bordo comen de lo que llevan; si se acaba, pasan hambre.
  for (const p of grupo) {
    const mar = p.viaje!.mar!;
    const nec = necesidad(m, p);
    if (mar.viveres >= nec) mar.viveres = r2(mar.viveres - nec);
    else {
      mar.viveres = 0;
      p.reservas = r2(p.reservas - 1);
      if (p.reservas < 0) {
        p.salud = r2(p.salud + 0.04 * p.reservas);
        p.causa = 'hambre';
        p.reservas = 0;
      }
    }
  }
  // En el mar, la barca puede hundirse (y con ella todos).
  if (v0.fase !== 'estancia') {
    const [x, y] = posicion(m, v0);
    if (m.terreno[y * m.ancho + x] === AGUA && prob(riesgoNaufragio(m, conoce(casa, 'vela'), invierno))) {
      for (const p of grupo) morir(p, 'ahogado');
      const nombres = grupo.map((p) => p.nombre);
      const quien = nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}` : nombres[0];
      anotar(m, 'exploracion', `${m.tiempo === 'tormenta' ? 'Una tormenta hunde' : 'El mar se traga'} la barca de ${quien}, que había salido de ${casa.nombre} a explorar: no volverán, y nadie sabrá lo que vieron.`, casa.id);
      return;
    }
  }
  if (m.t - v0.salida < v0.dias) return;
  const mar0 = v0.mar!;
  if (v0.fase === 'ida' && mar0.tierra) {
    // Desembarcan y recorren la tierra unos días.
    const [x, y] = mar0.tierra;
    const como = describir(m, x, y);
    const vistos = minerales(m, x, y);
    for (const p of grupo) {
      const v = p.viaje!;
      v.fase = 'estancia';
      v.desde = [x, y];
      v.hasta = [x, y];
      v.salida = m.t;
      v.dias = ESTANCIA_TIERRA;
      v.mar!.como = como;
      if (vistos.length) v.mar!.vistos = vistos;
      p.x = x;
      p.y = y;
    }
    return;
  }
  if (v0.fase === 'ida' || v0.fase === 'estancia') {
    // De vuelta a casa.
    const desde: [number, number] = v0.fase === 'estancia' ? [v0.desde[0], v0.desde[1]] : [v0.hasta[0], v0.hasta[1]];
    for (const p of grupo) {
      const v = p.viaje!;
      v.fase = 'vuelta';
      v.desde = desde;
      v.hasta = [casa.x, casa.y];
      v.salida = m.t;
      v.dias = v.mar!.ida;
    }
    return;
  }
  regresar(m, grupo, casa, ix);
}

/** En casa otra vez: lo que vieron llega por fin a su aldea. */
function regresar(m: Mundo, grupo: Persona[], casa: Aldea, _ix: Indices): void {
  const mar = grupo[0].viaje!.mar!;
  const dias = m.t - mar.zarpo;
  const rumbo = direccion(casa, casa.x + mar.rumbo[0] * 10, casa.y + mar.rumbo[1] * 10);
  for (const p of grupo) {
    p.x = casa.x;
    p.y = casa.y;
    delete p.viaje;
  }
  const nombres = grupo.map((p) => p.nombre);
  const quien = nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}` : nombres[0];
  if (!mar.tierra) {
    const vieron = mar.costa ? `: hacia ${rumbo} solo hallaron costas que ya conocían` : ` sin haber visto tierra hacia ${rumbo}`;
    if (aviso(m, `vuelve-mar-${casa.id}`, DIAS_ANIO)) anotar(m, 'exploracion', `${quien} vuelven a ${casa.nombre} tras ${dias} días en el mar${vieron}.`, casa.id);
    return;
  }
  const [x, y] = mar.tierra;
  const i = y * m.ancho + x;
  const { masa } = masas(m);
  const yaSabian = conoceTierra(m, casa, i);
  if (!yaSabian) (casa.tierras ??= []).push([x, y]);
  const nuevos = (mar.vistos ?? []).filter((s) => !casa.vistos.includes(s));
  for (const s of nuevos) casa.vistos.push(s);
  const primera = !m.aldeas.some((b) => b !== casa && (masa[b.y * m.ancho + b.x] === masa[i] || (b.tierras ?? []).some(([tx, ty]) => masa[ty * m.ancho + tx] === masa[i])));
  for (const p of grupo) {
    hito(m, p, 'explora', `${mar.como ?? 'tierra'} hacia ${rumbo}`);
    afamar(p, yaSabian ? 0.5 : 1.5);
  }
  const traen = nuevos.length ? ` Traen piedras que allí abundan y aquí no se conocían (${nuevos.join(', ')}).` : '';
  anotar(
    m,
    'exploracion',
    `${quien} vuelven a ${casa.nombre} tras ${dias} días fuera, con noticias: hacia ${rumbo}, al otro lado del mar, hay ${mar.como ?? 'tierra'}.${primera ? ' Nadie la había pisado antes.' : ''}${traen}`,
    casa.id,
  );
}

/** Lo que cuentan los que vuelven de una visita: las tierras que conocen en la otra aldea. */
export function contarTierras(de: Aldea, a: Aldea, m: Mundo): number {
  let n = 0;
  for (const [x, y] of de.tierras ?? []) {
    if (conoceTierra(m, a, y * m.ancho + x)) continue;
    (a.tierras ??= []).push([x, y]);
    n++;
  }
  return n;
}
