// Pone al día mundos guardados con versiones anteriores del motor, sin reiniciarlos.

import { azar, estadoAzar, fijarAzar } from './azar.ts';
import { AGUA, MONTANA, RIO } from './catalogo.ts';
import { ALTO, ANCHO, MUNDO_ALTO, MUNDO_ANCHO, VERSION_ESTADO } from './config.ts';
import { ampliarMapa } from './ultramar.ts';
import { poblarFauna } from './fauna.ts';
import { anillo, generarTerreno, masas, puntuarSitio } from './mapa.ts';
import { distancia } from './matematicas.ts';
import { ESCALA, menteNueva } from './mente.ts';
import type { Aldea, Mundo, Reparacion } from './tipos.ts';
import { anomalia } from './anomalias.ts';
import { comprobar } from './invariantes.ts';

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
  if (m.version === 4) {
    // Versión 5: cada cual con su carácter completo (ambición, prudencia, generosidad,
    // lealtad, paciencia), sin metas, recuerdos ni lazos todavía: los irá teniendo.
    fijarAzar(m.azar);
    for (const p of m.personas) {
      const g = p.genes as unknown as Record<string, number>;
      for (const k of ['ambicion', 'prudencia', 'generosidad', 'lealtad', 'paciencia']) if (typeof g[k] !== 'number') g[k] = Math.round((0.3 + 0.4 * azar()) * 1000) / 1000;
    }
    m.version = 5;
    m.azar = estadoAzar();
  }
  if (m.version === 5) {
    // Versión 6: el mundo se amplía al este y al sur (tierras de ultramar). El continente de
    // siempre no se mueve: mismas coordenadas, mismo terreno, mismos recursos, misma gente.
    ampliarMapa(m, MUNDO_ANCHO, MUNDO_ALTO);
    m.version = 6;
  }
  if (m.version !== VERSION_ESTADO) throw new Error(`No sé migrar un mundo de la versión ${m.version}.`);
  normalizar(m);
  reparar(m);
  return m;
}

/**
 * Cambios de modelo que no son daños: los animales de corrales y gallineros pasan a
 * contarse en enteros. Lo que tuvieran de fracción no se pierde: queda como cría en
 * camino (`gestacion`) y nacerá cuando se complete.
 */
function normalizar(m: Mundo): void {
  for (const a of m.aldeas) {
    for (const e of a.edificios) {
      const n = e.animales;
      if (typeof n !== 'number' || !Number.isFinite(n) || Number.isInteger(n) || n < 0) continue;
      const enteros = Math.floor(n);
      e.gestacion = (e.gestacion ?? 0) + n - enteros;
      e.animales = enteros;
    }
  }
}

/**
 * Al cargar, ningún número roto entra en la simulación. Un guardado hecho con una versión
 * que tenía un error puede traer NaN (en JSON, null), infinitos, cantidades negativas
 * imposibles o referencias a quien ya no existe. Cada arreglo sigue un criterio explícito
 * y queda registrado (qué dato, qué tenía, qué se le pone y por qué) en `m.reparaciones`
 * y como anomalía:
 *
 * - Un negativo es «se gastó de más»: la existencia real es cero. Es recuperable.
 * - Un valor acotado que se sale de su rango (salud, rasgos, reservas) se ajusta al límite.
 * - Un valor perdido (NaN, infinito, null) no se puede saber: se estima con lo más
 *   parecido que haya en el propio mundo (la media de su aldea, la de sus padres) y,
 *   si no hay de dónde, con un valor neutro. Se marca como no recuperable.
 * - Las cantidades almacenadas perdidas se dan por vacías (no se inventa comida).
 * - En una mente solo se anulan las conexiones rotas; los pesos válidos no se tocan.
 */
export function reparar(m: Mundo): Reparacion[] {
  const hechas: Reparacion[] = [];
  const fmt = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : (JSON.stringify(v) ?? 'undefined'));
  const apuntar = (ruta: string, antes: unknown, despues: unknown, criterio: string, recuperable: boolean) =>
    hechas.push({ t: m.t, ruta, antes: fmt(antes), despues: fmt(despues), criterio, recuperable });
  const finito = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  const media = (xs: unknown[]): number | null => {
    const ok = xs.filter(finito);
    return ok.length ? Math.round((ok.reduce((s, x) => s + x, 0) / ok.length) * 1000) / 1000 : null;
  };
  /** Un número con rango: lo ajusta si se sale y lo estima si se perdió. */
  const acotado = (ruta: string, v: unknown, min: number, max: number, estimar: () => number | null, neutro: number, porQue: string): number => {
    if (finito(v)) {
      if (v >= min && v <= max) return v;
      const w = Math.min(max, Math.max(min, v));
      apuntar(ruta, v, w, v < min ? `por debajo de ${min}: se ajusta al mínimo` : `por encima de ${max}: se ajusta al máximo`, true);
      return w;
    }
    const e = estimar();
    const w = e === null ? neutro : Math.min(max, Math.max(min, e));
    apuntar(ruta, v, w, e === null ? `perdido; sin datos con que estimarlo, valor neutro (${porQue})` : `perdido; estimado con ${porQue}`, false);
    return w;
  };
  /** Una cantidad almacenada: negativa es que se gastó de más (cero); perdida, vacía. */
  const cantidad = (ruta: string, v: unknown): number => {
    if (finito(v) && v >= 0) return v;
    if (finito(v)) {
      apuntar(ruta, v, 0, v > -0.01 ? 'negativo por redondeo: es cero' : 'se gastó más de lo que había: la existencia es cero', true);
      return 0;
    }
    apuntar(ruta, v, 0, 'cantidad perdida; no hay forma fiable de saber cuánto había: se da por vacía (no se inventa)', false);
    return 0;
  };

  const vivas = m.aldeas.filter((a) => a.abandonada === null);
  const porAldea = new Map<number, typeof m.personas>();
  for (const p of m.personas) porAldea.set(p.aldea, [...(porAldea.get(p.aldea) ?? []), p]);
  const porId = new Map(m.personas.map((p) => [p.id, p]));

  for (const a of m.aldeas) {
    if (!a.despensa || typeof a.despensa !== 'object' || Array.isArray(a.despensa)) {
      apuntar(`${a.nombre}.despensa`, a.despensa, {}, 'despensa ausente o ilegible: se da por vacía', false);
      a.despensa = {};
    }
    for (const k of Object.keys(a.despensa)) a.despensa[k] = cantidad(`${a.nombre}.despensa.${k}`, a.despensa[k]);
    for (const [j, e] of a.edificios.entries()) {
      const r = e as unknown as Record<string, unknown>;
      for (const k of ['animales', 'trabajo', 'cuidado', 'sembrado', 'cosechado'] as const) if (r[k] !== undefined) r[k] = cantidad(`${a.nombre}.edificios[${j}](${e.tipo}).${k}`, r[k]);
      if (r.animales !== undefined && !Number.isInteger(r.animales)) {
        const n = Math.floor(r.animales as number);
        apuntar(`${a.nombre}.edificios[${j}].animales`, r.animales, n, 'los animales se cuentan en enteros', true);
        r.animales = n;
      }
      if (r.gestacion !== undefined) r.gestacion = acotado(`${a.nombre}.edificios[${j}].gestacion`, r.gestacion, -1, 1, () => null, 0, 'sin cría en camino');
      if (r.radio !== undefined && !(finito(r.radio) && r.radio > 0)) {
        apuntar(`${a.nombre}.edificios[${j}].radio`, r.radio, 2.7, 'radio de muralla perdido: el mínimo que rodea una aldea', false);
        r.radio = 2.7;
      }
      for (const k of ['nivel', 'ang'] as const) {
        if (r[k] !== undefined && !finito(r[k])) {
          apuntar(`${a.nombre}.edificios[${j}].${k}`, r[k], 0, 'dato de forma perdido: valor por defecto', false);
          r[k] = 0;
        }
      }
    }
    if (a.obra) a.obra.progreso = acotado(`${a.nombre}.obra.progreso`, a.obra.progreso, 0, 1, () => null, 0, 'la obra vuelve a empezar');
    a.amenaza = acotado(`${a.nombre}.amenaza`, a.amenaza, 0, 1, () => null, 0, 'se recalcula cada día');
  }

  for (const p of m.personas) {
    const vecinos = (porAldea.get(p.aldea) ?? []).filter((q) => q !== p);
    const ruta = `${p.nombre}#${p.id}`;
    p.reservas = acotado(`${ruta}.reservas`, p.reservas, 0, 8, () => media(vecinos.map((q) => q.reservas)), 4, 'la media de su aldea');
    p.salud = acotado(`${ruta}.salud`, p.salud, 0, 1, () => media(vecinos.map((q) => q.salud)), 0.8, 'la media de su aldea');
    p.recompensa = acotado(`${ruta}.recompensa`, p.recompensa, -Infinity, Infinity, () => media(vecinos.map((q) => q.recompensa)), 0.5, 'la media de su aldea');
    const padres = [p.madre, p.padre].map((id) => (id === null ? undefined : porId.get(id))).filter((q): q is NonNullable<typeof q> => !!q);
    for (const k of Object.keys(p.genes) as (keyof typeof p.genes)[]) {
      p.genes[k] = acotado(`${ruta}.genes.${k}`, p.genes[k], 0, 1, () => media(padres.map((q) => q.genes[k])) ?? media(vecinos.map((q) => q.genes[k])), 0.5, padres.length ? 'la media de sus padres' : 'la media de su aldea');
    }
    for (const k of Object.keys(p.valor)) p.valor[k] = acotado(`${ruta}.valor.${k}`, p.valor[k], 0, Infinity, () => media(vecinos.map((q) => q.valor[k])), 1, 'lo que esperan de ese trabajo en su aldea');
    let rotas = 0;
    for (let i = 0; i < p.mente.length; i++) {
      if (finito(p.mente[i])) continue;
      p.mente[i] = 0;
      rotas++;
    }
    if (rotas) apuntar(`${ruta}.mente`, `${rotas} pesos no finitos`, '0 en esos pesos', 'conexiones rotas anuladas (sin influencia); los demás pesos, intactos', false);
    if (p.lazos) {
      const antes = p.lazos.length;
      p.lazos = p.lazos.filter(([id, v]) => finito(id) && finito(v) && v >= -1 && v <= 1);
      if (p.lazos.length < antes) apuntar(`${ruta}.lazos`, `${antes} lazos`, `${p.lazos.length} lazos`, 'lazos con valores imposibles: se olvidan', false);
    }
    if (p.recuerdos) {
      const antes = p.recuerdos.length;
      p.recuerdos = p.recuerdos.filter((r) => finito(r[0]) && finito(r[3]));
      if (p.recuerdos.length < antes) apuntar(`${ruta}.recuerdos`, `${antes} recuerdos`, `${p.recuerdos.length} recuerdos`, 'recuerdos sin fecha o sin peso: se olvidan', false);
    }
    if (p.practica) for (const k of Object.keys(p.practica)) p.practica[k] = cantidad(`${ruta}.practica.${k}`, p.practica[k]);
    if (p.fama !== undefined) p.fama = cantidad(`${ruta}.fama`, p.fama);
    // Referencias: vive en una aldea que existe y su pareja le corresponde.
    if (!vivas.some((a) => a.id === p.aldea) && vivas.length) {
      const cerca = vivas.reduce((x, y) => (Math.hypot(y.x - p.x, y.y - p.y) < Math.hypot(x.x - p.x, x.y - p.y) ? y : x));
      apuntar(`${ruta}.aldea`, p.aldea, cerca.id, `su aldea ya no existe: pasa a la más cercana (${cerca.nombre})`, false);
      p.aldea = cerca.id;
    }
    // Un viaje con datos rotos o hacia una aldea que no existe: se da por terminado (está en casa).
    if (p.viaje && (![p.viaje.dias, p.viaje.salida, ...(p.viaje.desde ?? []), ...(p.viaje.hasta ?? [])].every(finito) || !Array.isArray(p.viaje.conocio) || !m.aldeas.some((a) => a.id === p.viaje!.a))) {
      apuntar(`${ruta}.viaje`, p.viaje, null, 'viaje ilegible o a una aldea que no existe: vuelve a estar en su aldea', false);
      const casa = m.aldeas.find((a) => a.id === p.aldea);
      if (casa) {
        p.x = casa.x;
        p.y = casa.y;
      }
      delete p.viaje;
    }
    if (p.pareja !== null) {
      const q = porId.get(p.pareja);
      if (!q || q.pareja !== p.id) {
        apuntar(`${ruta}.pareja`, p.pareja, null, q ? 'pareja no correspondida: queda sin pareja' : 'su pareja no existe: queda sin pareja', true);
        p.pareja = null;
      }
    }
  }

  for (const [k, v] of Object.entries(m.recursos)) {
    let negativos = 0;
    let perdidos = 0;
    for (let i = 0; i < v.length; i++) {
      if (finito(v[i]) && v[i] >= 0) continue;
      if (finito(v[i])) negativos++;
      else perdidos++;
      v[i] = 0;
    }
    if (negativos) apuntar(`recursos.${k}`, `${negativos} casillas negativas`, '0', 'se sacó más de lo que había: agotadas (vuelven a crecer solas)', true);
    if (perdidos) apuntar(`recursos.${k}`, `${perdidos} casillas perdidas`, '0', 'cantidad perdida: se dan por agotadas (vuelven a crecer solas)', false);
  }
  for (const [k, r] of Object.entries(m.relaciones)) {
    r.afinidad = acotado(`relaciones.${k}.afinidad`, r.afinidad, 0, 1, () => null, 0.2, 'trato neutro');
    r.rencor = acotado(`relaciones.${k}.rencor`, r.rencor, 0, 1, () => null, 0, 'sin rencor');
  }

  if (hechas.length) {
    m.reparaciones = [...(m.reparaciones ?? []), ...hechas].slice(-200);
    const perdidos = hechas.filter((h) => !h.recuperable).length;
    anomalia(`Al cargar el mundo se hicieron ${hechas.length} ${hechas.length === 1 ? 'reparación' : 'reparaciones'} (${perdidos} de valores perdidos, estimados o vaciados). Detalle en «reparaciones». Ej.: ${hechas.slice(0, 3).map((h) => `${h.ruta}: ${h.antes} → ${h.despues} (${h.criterio})`).join('; ')}`);
  }
  // Y después de reparar, el mundo tiene que estar sano: lo que no se haya podido arreglar se dice.
  for (const x of comprobar(m).slice(0, 5)) anomalia(`Tras reparar sigue mal: ${x}`);
  return hechas;
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
