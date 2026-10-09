// Prepara los datos que lee la web. Solo se publica lo que ya ha pasado:
// los saberes por descubrir no aparecen (nada de destripes).

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ESTACIONES } from './config.ts';
import { BASICOS, CONCEPTOS_VIDA, MATERIALES, NOMBRE_CONCEPTO, TECNICAS } from './catalogo.ts';
import { anioDe, fecha } from './cronica.ts';
import { comidaTotal, necesidad } from './economia.ts';
import { lexicoComun, parecido } from './lenguaje.ts';
import { aldeasVivas, edad, estacionDe, indexar } from './mundo.ts';
import type { Mundo } from './tipos.ts';

const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;

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

  return {
    generado: ahora.toISOString(),
    reloj: m.reloj,
    era: m.era,
    semilla: m.semilla,
    t: m.t,
    anio: anioDe(m.t),
    estacion: ESTACIONES[estacionDe(m.t)],
    fecha: fecha(m.t),
    ancho: m.ancho,
    alto: m.alto,
    terreno: m.terreno,
    madera: m.recursos.madera.map((v) => Math.round(v)),
    clima: m.clima,
    poblacion: m.personas.length,
    poblacionMax: m.poblacionMax,
    totalSaberes: TECNICAS.length,
    eras: m.eras,
    ruinas: m.ruinas,
    conceptos: [...BASICOS, ...CONCEPTOS_VIDA],
    nombres,
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
        edificios: a.edificios.map((e) => ({ tipo: e.tipo, x: e.x, y: e.y, ...(e.fase !== undefined ? { fase: e.fase } : {}), ...(e.animales !== undefined ? { animales: Math.round(e.animales) } : {}) })),
        obra: a.obra ? { tipo: a.obra.tipo, x: a.obra.x, y: a.obra.y, progreso: r2(a.obra.progreso) } : null,
        conocidos: a.conocidos,
        archivo: a.archivo,
        despensa,
        diasComida: consumo > 0 ? Math.round(comidaTotal(a) / consumo) : 0,
      };
    }),
    personas: m.personas.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      sexo: p.sexo,
      edad: r1(edad(m, p)),
      aldea: p.aldea,
      x: p.x,
      y: p.y,
      act: p.actividad,
      salud: r2(p.salud),
      saberes: p.saberes,
      desc: p.descubrimientos,
      hijos: p.hijos,
      padre: p.padre,
      madre: p.madre,
      pareja: p.pareja,
      genes: p.genes,
    })),
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

export function exportar(m: Mundo, dir: string, ahora: Date): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'mundo.json'), JSON.stringify(datosWeb(m, ahora)));
  writeFileSync(join(dir, 'cronica.json'), JSON.stringify(m.cronica));
  writeFileSync(join(dir, 'historia.json'), JSON.stringify(m.historia));
}
