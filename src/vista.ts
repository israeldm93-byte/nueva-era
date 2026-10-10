// Lo que ve la web del mundo. Funciona igual en el servidor y en el navegador
// (no usa nada de Node). Solo se muestra lo que ya ha pasado: los saberes por
// descubrir no aparecen (nada de destripes).

import { DIAS_ANIO, ESTACIONES } from './config.ts';
import { BASICOS, COMIDAS, CONCEPTOS_VIDA, EDIFICIOS, MATERIALES, NOMBRE_CONCEPTO, TECNICA, TECNICAS } from './catalogo.ts';
import { anioDe, fecha } from './cronica.ts';
import { comidaTotal, necesidad } from './economia.ts';
import { lexicoComun, parecido } from './lenguaje.ts';
import { ACCIONES, PRUEBAS, entradas, pensar } from './mente.ts';
import { aldeasVivas, edad, estacionDe, indexar } from './mundo.ts';
import { FRASE } from './politica.ts';
import { focoDe } from './saber.ts';
import type { Mundo } from './tipos.ts';

const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;

/** Identificador del motor que generó los datos (lo pone la compilación o el flujo de GitHub). */
export let MOTOR = 'dev';
export function fijarMotor(id: string): void {
  MOTOR = id;
}

export function datosWeb(m: Mundo, ahora: Date) {
  const ix = indexar(m);
  const vivas = aldeasVivas(m);
  const lexicos = new Map(vivas.map((a) => [a.id, lexicoComun(ix.porAldea.get(a.id) ?? [])]));
  const parecidos: [number, number, number][] = [];
  for (let i = 0; i < vivas.length; i++) {
    for (let j = i + 1; j < vivas.length; j++) {
      const a = vivas[i];
      const b = vivas[j];
      if ((ix.porAldea.get(a.id)?.length ?? 0) < 3 || (ix.porAldea.get(b.id)?.length ?? 0) < 3) continue;
      parecidos.push([a.id, b.id, parecido(lexicos.get(a.id)!, lexicos.get(b.id)!)]);
    }
  }
  const nombres: Record<string, string> = { ...NOMBRE_CONCEPTO };
  for (const x of MATERIALES) nombres[x.id] = x.nombre;
  for (const t of TECNICAS) if (m.hallazgos[t.id]) nombres[t.id] = t.nombre.toLowerCase();
  const nombrePersona = (id: number) => ix.porId.get(id)?.nombre ?? null;
  const R = m.recursos;

  return {
    motor: MOTOR,
    generado: ahora.toISOString(),
    reloj: m.reloj,
    era: m.era,
    semilla: m.semilla,
    t: m.t,
    anio: anioDe(m.t),
    dia: (m.t % DIAS_ANIO) + 1,
    tiempo: m.tiempo ?? 'sol',
    estacion: ESTACIONES[estacionDe(m.t)],
    fecha: fecha(m.t),
    ancho: m.ancho,
    alto: m.alto,
    terreno: m.terreno,
    relieve: m.relieve,
    fauna: m.fauna.map((f) => ({ id: f.id, tipo: f.tipo, x: f.x, y: f.y, px: f.px, py: f.py, n: f.n, estado: f.estado, hambre: f.hambre })),
    incendios: m.incendios.map(([i]) => i),
    cenizas: m.cenizas.map(([i, t]) => [i, m.t - t]),
    inundadas: m.inundadas.map(([i]) => i),
    madera: R.madera.map((v) => Math.round(v)),
    bayas: R.bayas.map((v) => Math.round(v)),
    caza: R.caza.map((v) => Math.round(v)),
    // 0 nada, 1 malaquita, 2 casiterita, 3 hematites
    minerales: R.malaquita.map((v, i) => (v > 1 ? 1 : R.casiterita[i] > 1 ? 2 : R.hematites[i] > 1 ? 3 : 0)),
    clima: m.clima,
    poblacion: m.personas.length,
    poblacionMax: m.poblacionMax,
    totalSaberes: TECNICAS.length,
    eras: m.eras,
    ruinas: m.ruinas,
    conceptos: [...BASICOS, ...CONCEPTOS_VIDA],
    nombres,
    comestibles: COMIDAS.map((x) => x.id),
    obras: Object.fromEntries(EDIFICIOS.map((e) => [e.id, { nombre: e.nombre, coste: e.coste, ...(e.alternativa ? { alternativa: e.alternativa.coste } : {}) }])),
    acciones: ACCIONES,
    pruebas: PRUEBAS.map((p) => p.nombre),
    frases: FRASE,
    aldeas: m.aldeas.map((a) => {
      const gente = ix.porAldea.get(a.id) ?? [];
      const consumo = gente.reduce((s, p) => s + necesidad(m, p), 0);
      const despensa: Record<string, number> = {};
      for (const [k, v] of Object.entries(a.despensa)) if (v >= 0.5) despensa[k] = Math.round(v);
      return {
        id: a.id,
        nombre: a.nombre,
        x: a.x,
        y: a.y,
        fundada: anioDe(a.fundada),
        fundador: a.fundador,
        origen: a.origen,
        abandonada: a.abandonada === null ? null : anioDe(a.abandonada),
        poblacion: gente.length,
        poblacionMax: a.poblacionMax,
        edificios: a.edificios.map((e) => ({
          tipo: e.tipo,
          x: e.x,
          y: e.y,
          ...(e.fase !== undefined ? { fase: e.fase } : {}),
          ...(e.animales !== undefined ? { animales: Math.round(e.animales) } : {}),
          ...(e.especie ? { especie: e.especie } : {}),
          ...(e.material ? { material: e.material } : {}),
          ...(e.radio ? { radio: e.radio } : {}),
          // Cómo va el cultivo (de 0, recién sembrado, a 1, listo para segar) o si queda rastrojo.
          ...(e.tipo === 'campo' && e.fase === 1 ? { crece: r2(Math.min(1, (m.t - (e.sembrado ?? m.t - 40)) / 70)) } : {}),
          ...(e.tipo === 'campo' && e.fase !== 1 && e.cosechado !== undefined && m.t - e.cosechado < 45 ? { rastrojo: true } : {}),
        })),
        ...(a.maderaLejos ? { maderaLejos: true } : {}),
        obra: a.obra ? { tipo: a.obra.tipo, x: a.obra.x, y: a.obra.y, progreso: r2(a.obra.progreso), pagada: a.obra.pagada, ...(a.obra.material ? { material: a.obra.material } : {}), ...(a.obra.radio ? { radio: a.obra.radio } : {}) } : null,
        conocidos: a.conocidos,
        archivo: a.archivo,
        despensa,
        diasComida: consumo > 0 ? Math.round(comidaTotal(a) / consumo) : 0,
        amenaza: r2(a.amenaza),
        // Tumbas: [x, y, año] de cada una, y los últimos enterrados.
        tumbas: (a.tumbas ?? []).map((g) => [g.x, g.y, anioDe(g.t), g.nombre, g.edad, g.causa, g.sexo ?? null, g.oficio ?? null, g.hijos ?? null, g.pareja ?? null, (g.descubrio ?? []).map((id) => TECNICA[id]?.nombre ?? id)]),
        difuntos: (a.tumbas ?? []).slice(-5).reverse().map((g) => ({ nombre: g.nombre, edad: g.edad, causa: g.causa, anio: anioDe(g.t) })),
        enterrados: a.enterrados ?? 0,
        consejo: a.consejo
          ? {
              prioridad: a.consejo.prioridad,
              desde: anioDe(a.consejo.desde),
              miembros: a.consejo.miembros.map((id) => ({ id, nombre: nombrePersona(id) })),
              votos: a.consejo.votos,
              foco: focoDe(a),
              guerra: a.consejo.guerra
                ? { contra: a.consejo.guerra.contra, nombre: m.aldeas.find((b) => b.id === a.consejo!.guerra!.contra)?.nombre ?? '¿?', desde: anioDe(a.consejo.guerra.desde), motivo: a.consejo.guerra.motivo }
                : null,
            }
          : null,
        facciones: a.facciones
          .filter((f) => f.anunciada)
          .map((f) => ({ id: f.id, nombre: f.nombre, opinion: f.opinion, lider: nombrePersona(f.lider), liderId: f.lider, miembros: f.miembros, descontento: r2(Math.min(1, f.descontento)) })),
      };
    }),
    relaciones: Object.entries(m.relaciones)
      .map(([k, r]) => {
        const [a, b] = k.split('-').map(Number);
        const guerra = m.aldeas.some((x) => (x.id === a && x.consejo?.guerra?.contra === b) || (x.id === b && x.consejo?.guerra?.contra === a));
        return { a, b, afinidad: r2(r.afinidad), rencor: r2(r.rencor), alianza: r.alianza, ...(guerra ? { guerra } : {}) };
      })
      .filter((r) => vivas.some((x) => x.id === r.a) && vivas.some((x) => x.id === r.b)),
    personas: m.personas.map((p) => {
      const e = edad(m, p);
      const adulto = e >= 14;
      const gustos = adulto ? pensar(p.mente, entradas({ hambre: 0.25, escasez: 0.2, edad: e / 60 })).salidas.map(r2) : null;
      const idea = p.ideas[0];
      return {
        id: p.id,
        nombre: p.nombre,
        sexo: p.sexo,
        edad: r1(e),
        aldea: p.aldea,
        x: p.x,
        y: p.y,
        act: p.actividad,
        salud: r2(p.salud),
        reservas: r1(p.reservas),
        saberes: p.saberes,
        desc: p.descubrimientos,
        hijos: p.hijos,
        padre: p.padre,
        madre: p.madre,
        pareja: p.pareja,
        genes: p.genes,
        opinion: adulto ? p.opinion : null,
        faccion: p.faccion,
        gustos,
        idea: idea ? { cosas: idea.cosas.map((c) => nombres[c] ?? TECNICA[c]?.cosa ?? c), verbo: idea.verbo } : null,
      };
    }),
    tecnicas: TECNICAS.filter((t) => m.hallazgos[t.id]).map((t) => {
      const h = m.hallazgos[t.id];
      return {
        id: t.id,
        nombre: t.nombre,
        titulo: t.titulo,
        efecto: t.efecto,
        anio: anioDe(h.t),
        por: h.por,
        porId: h.porId,
        aldea: h.nombreAldea,
        palabra: h.palabra,
        como: h.como,
        saben: m.personas.filter((p) => p.saberes.includes(t.id)).length,
        olvidado: m.olvidados.includes(t.id),
      };
    }),
    diccionario: Object.fromEntries(vivas.map((a) => [a.id, lexicos.get(a.id)])),
    parecidos,
  };
}

export type DatosWeb = ReturnType<typeof datosWeb>;
