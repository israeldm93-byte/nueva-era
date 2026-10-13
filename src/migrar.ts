// Pone al día mundos guardados con versiones anteriores del motor, sin reiniciarlos.

import { azar, estadoAzar, fijarAzar } from './azar.ts';
import { AGUA, EDIFICIO, MATERIAL, MONTANA, OBRA_TIERRA, RIO } from './catalogo.ts';
import { tierraValida } from './tierra.ts';
import { ALTO, ANCHO, MUNDO_ALTO, MUNDO_ANCHO, VERSION_ESTADO } from './config.ts';
import { ampliarMapa, crearUltramar } from './ultramar.ts';
import { poblarFauna } from './fauna.ts';
import { anillo, generarTerreno, masas, puntuarSitio } from './mapa.ts';
import { distancia } from './matematicas.ts';
import { ESCALA, menteNueva } from './mente.ts';
import type { Aldea, Mundo, Reparacion, Travesia } from './tipos.ts';
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
    const origen = { ancho: m.ancho, alto: m.alto };
    ampliarMapa(m, MUNDO_ANCHO, MUNDO_ALTO);
    // Y en lo que era mar abierto, las tierras de ultramar (con su propio azar).
    crearUltramar(m, origen);
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
    if (a.tierras !== undefined) {
      const lista = Array.isArray(a.tierras) ? a.tierras : null;
      a.tierras = (lista ?? []).filter((t) => dentroDelMapa(t, m));
      if (!lista || a.tierras.length < lista.length) apuntar(`${a.nombre}.tierras`, lista?.length ?? 'ilegible', a.tierras.length, 'tierras de ultramar con coordenadas imposibles: se olvidan', false);
      if (!a.tierras.length) delete a.tierras;
    }
    if (a.obra && (!(EDIFICIO[a.obra.tipo] || OBRA_TIERRA[a.obra.tipo]) || (a.obra.tierra !== undefined && !tierraValida(a.obra.tierra, m)))) {
      apuntar(`${a.nombre}.obra`, a.obra.tipo, null, 'obra desconocida o con la tierra a medio mover ilegible: se deja (el terreno queda como estaba)', false);
      a.obra = null;
    }
    if (a.obra) a.obra.progreso = acotado(`${a.nombre}.obra.progreso`, a.obra.progreso, 0, 1, () => null, 0, 'la obra vuelve a empezar');
    a.amenaza = acotado(`${a.nombre}.amenaza`, a.amenaza, 0, 1, () => null, 0, 'se recalcula cada día');
    const g = a.consejo?.guerra;
    if (g && g.cansancio !== undefined) g.cansancio = acotado(`${a.nombre}.consejo.guerra.cansancio`, g.cansancio, 0, 2, () => null, 0, 'sin cansancio');
  }

  // Incursiones en marcha: con datos completos, entre aldeas que existen, una sola por pareja
  // de aldeas. Si una no se puede leer, sus guerreros vuelven a casa y lo que llevaban (si se
  // puede leer) entra en su despensa: ni se pierde ni se duplica.
  if (m.incursiones !== undefined) {
    const lista = Array.isArray(m.incursiones) ? m.incursiones : [];
    const vistas = new Set<string>();
    const ids = new Set<number>();
    m.incursiones = lista.filter((x, i) => {
      const ok =
        !!x && typeof x === 'object' && Number.isInteger(x.id) && !ids.has(x.id) &&
        m.aldeas.some((a) => a.id === x.de && a.abandonada === null) && m.aldeas.some((a) => a.id === x.contra) && x.de !== x.contra &&
        !vistas.has(`${x.de}-${x.contra}`) && Array.isArray(x.gente) && x.gente.every((id) => Number.isInteger(id)) &&
        (x.fase === 'ida' || x.fase === 'vuelta') && [x.salida, x.dias].every(finito) && x.dias > 0 &&
        dentroDelMapa(x.desde, m) && dentroDelMapa(x.hasta, m) && bienesValidos(x.viveres) && bienesValidos(x.botin) && typeof x.motivo === 'string' &&
        (x.resultado === undefined || ['victoria', 'derrota', 'retirada', 'paz'].includes(x.resultado));
      if (ok) {
        ids.add(x.id);
        vistas.add(`${x.de}-${x.contra}`);
        return true;
      }
      const casa = x && m.aldeas.find((a) => a.id === x.de && a.abandonada === null);
      if (casa) for (const c of [x.viveres, x.botin]) if (bienesValidos(c)) for (const [k, n] of Object.entries(c)) casa.despensa[k] = (casa.despensa[k] ?? 0) + n;
      apuntar(`incursiones[${i}]`, x, null, 'incursión ilegible o repetida: los guerreros vuelven a casa con lo que llevaban', false);
      return false;
    });
  }
  const incursion = (id: number) => m.incursiones?.find((x) => x.id === id);

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
    if (p.viaje && (![p.viaje.dias, p.viaje.salida, ...(p.viaje.desde ?? []), ...(p.viaje.hasta ?? [])].every(finito) || !Array.isArray(p.viaje.conocio) || !m.aldeas.some((a) => a.id === p.viaje!.a) || (p.viaje.mar !== undefined && !travesiaValida(p.viaje.mar, m)) || (p.viaje.carga !== undefined && !bienesValidos(p.viaje.carga)) || (p.viaje.trato !== undefined && !bienesValidos(p.viaje.trato?.trae)) || (p.viaje.incursion !== undefined && !incursion(p.viaje.incursion)?.gente.includes(p.id)))) {
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

  // Senderos, caminos y tránsito: una casilla cada uno, con valores posibles; si no, se empieza de cero.
  for (const [k, ok] of [['transito', (v: unknown) => Number.isInteger(v) && (v as number) >= 0], ['caminos', (v: unknown) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 3]] as const) {
    const capa = m[k];
    if (capa === undefined) continue;
    if (!Array.isArray(capa) || capa.length !== m.ancho * m.alto || !capa.every(ok)) {
      apuntar(k, Array.isArray(capa) ? `${capa.length} casillas` : capa, null, k === 'caminos' ? 'caminos ilegibles: se pierden (se volverán a formar con el uso)' : 'tránsito ilegible: se empieza de cero', false);
      delete m[k];
    }
  }
  // Lo económico de cada aldea: encargos, jornadas y balanza, con cantidades posibles.
  for (const a of m.aldeas) {
    for (const k of ['encargos', 'trabajos'] as const) {
      if (a[k] !== undefined && !bienesValidos(a[k], true)) {
        apuntar(`${a.nombre}.${k}`, a[k], null, 'datos económicos ilegibles: se empiezan de cero', false);
        delete a[k];
      }
    }
    if (a.balanza !== undefined && !(a.balanza && bienesValidos(a.balanza.exporta, true) && bienesValidos(a.balanza.importa, true))) {
      apuntar(`${a.nombre}.balanza`, a.balanza, null, 'balanza ilegible: se empieza de cero', false);
      delete a.balanza;
    }
  }
  for (const a of m.aldeas) {
    if (a.rutas === undefined) continue;
    const antes = Array.isArray(a.rutas) ? a.rutas.length : 0;
    a.rutas = (Array.isArray(a.rutas) ? a.rutas : []).filter((r) => Array.isArray(r) && r.length === 5 && r.every((v) => Number.isFinite(v)) && Number.isInteger(r[2]) && r[2] >= 0 && r[2] < 16 && [0, 1, 2].includes(r[4]));
    if (a.rutas.length < antes) apuntar(`${a.nombre}.rutas`, antes, a.rutas.length, 'rutas recordadas ilegibles: se olvidan', false);
  }
  if (m.labrado !== undefined) {
    const antes = Array.isArray(m.labrado) ? m.labrado.length : 0;
    m.labrado = (Array.isArray(m.labrado) ? m.labrado : []).filter((e) => Array.isArray(e) && Number.isInteger(e[0]) && e[0] >= 0 && e[0] < m.ancho * m.alto && !!OBRA_TIERRA[e[1]]);
    if (m.labrado.length < antes) apuntar('labrado', antes, m.labrado.length, 'casillas labradas con datos imposibles: se olvidan (el relieve queda como está)', false);
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
    for (const c of ['agravio', 'disputa', 'peor'] as const) if (r[c] !== undefined) r[c] = acotado(`relaciones.${k}.${c}`, r[c], 0, 1, () => null, 0, 'se olvida');
    if (r.comercio !== undefined) r.comercio = cantidad(`relaciones.${k}.comercio`, r.comercio);
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

/** Un punto [x, y] entero dentro del mapa. */
function dentroDelMapa(t: unknown, m: Mundo): boolean {
  return Array.isArray(t) && t.length === 2 && t.every((v) => Number.isInteger(v)) && t[0] >= 0 && t[1] >= 0 && t[0] < m.ancho && t[1] < m.alto;
}

/** Una expedición por mar con todos sus datos en orden. */
function travesiaValida(t: Travesia, m: Mundo): boolean {
  if (!t || typeof t !== 'object') return false;
  const fin = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  if (![t.barca, t.viveres, t.ida, t.zarpo].every(fin) || t.viveres < 0 || t.ida <= 0) return false;
  if (!Array.isArray(t.rumbo) || t.rumbo.length !== 2 || !t.rumbo.every((v) => fin(v) && Math.abs(v) <= 1) || (t.rumbo[0] === 0 && t.rumbo[1] === 0)) return false;
  if (t.puerto !== undefined && !dentroDelMapa(t.puerto, m)) return false;
  if (t.ruta !== undefined && !(Number.isInteger(t.ruta) && t.ruta >= 0 && t.ruta < 16)) return false;
  if (t.tierra !== undefined && !dentroDelMapa(t.tierra, m)) return false;
  if (t.costa !== undefined && typeof t.costa !== 'boolean') return false;
  if (t.como !== undefined && typeof t.como !== 'string') return false;
  if (t.vistos !== undefined && (!Array.isArray(t.vistos) || !t.vistos.every((v) => typeof v === 'string'))) return false;
  return true;
}

/** Una carga o una lista de cantidades: cosas conocidas (o cualquier clave, si `libre`) en cantidades finitas y no negativas. */
function bienesValidos(c: unknown, libre = false): boolean {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return false;
  return Object.entries(c as Record<string, unknown>).every(([k, v]) => (libre || !!MATERIAL[k]) && typeof v === 'number' && Number.isFinite(v) && v >= 0);
}
