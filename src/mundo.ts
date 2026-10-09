// Creación del mundo y de sus habitantes, y utilidades comunes.

import { azar, entero, estadoAzar, fijarAzar, normal, prob } from './azar.ts';
import { DIAS_ANIO, DIAS_ESTACION, ALTO, ANCHO, VERSION_ESTADO } from './config.ts';
import { OFICIOS, VALOR_INSTINTO } from './catalogo.ts';
import { anotar } from './cronica.ts';
import { crearFonologia, nombrePropio } from './lenguaje.ts';
import { buscarSitio, generarTerreno } from './mapa.ts';
import { heredarMente, menteNueva } from './mente.ts';
import type { Aldea, Genes, Mundo, Persona } from './tipos.ts';

const r2 = (x: number) => Math.round(x * 100) / 100;
const r3 = (x: number) => Math.round(x * 1000) / 1000;

export function edad(m: Mundo, p: Persona): number {
  return (m.t - p.nace) / DIAS_ANIO;
}

export function estacionDe(t: number): number {
  return Math.floor((t % DIAS_ANIO) / DIAS_ESTACION);
}

export interface Indices {
  porId: Map<number, Persona>;
  porAldea: Map<number, Persona[]>;
}

export function indexar(m: Mundo): Indices {
  const porId = new Map<number, Persona>();
  const porAldea = new Map<number, Persona[]>();
  for (const a of m.aldeas) if (a.abandonada === null) porAldea.set(a.id, []);
  for (const p of m.personas) {
    porId.set(p.id, p);
    porAldea.get(p.aldea)?.push(p);
  }
  return { porId, porAldea };
}

export function aldeasVivas(m: Mundo): Aldea[] {
  return m.aldeas.filter((a) => a.abandonada === null);
}

const GENES: (keyof Genes)[] = ['curiosidad', 'sociabilidad', 'fuerza', 'destreza', 'resistencia', 'fertilidad', 'longevidad', 'agresividad'];

export function genesAlAzar(): Genes {
  const g = {} as Genes;
  for (const k of GENES) g[k] = r3(0.3 + 0.4 * azar());
  return g;
}

/** Cada gen del hijo es la media de los padres más una pequeña mutación. */
export function heredarGenes(a: Genes, b: Genes): Genes {
  const g = {} as Genes;
  for (const k of GENES) g[k] = r3(Math.min(0.98, Math.max(0.02, (a[k] + b[k]) / 2 + normal() * 0.06)));
  return g;
}

export function mediaGenes(gente: Persona[]): Genes {
  const g = {} as Genes;
  for (const k of GENES) g[k] = gente.length ? r3(gente.reduce((s, p) => s + p.genes[k], 0) / gente.length) : 0;
  return g;
}

export function nuevaPersona(
  m: Mundo,
  datos: { aldea: Aldea; nace: number; sexo?: 'H' | 'M'; padre?: Persona | null; madre?: Persona | null; genes?: Genes },
): Persona {
  const { aldea, padre = null, madre = null } = datos;
  const valor: Record<string, number> = {};
  for (const o of OFICIOS) {
    // Lo que «sabe» un recién nacido de qué trabajos rinden: lo que vieron sus padres.
    const heredado = padre && madre ? (padre.valor[o] + madre.valor[o]) / 2 : VALOR_INSTINTO[o] * (0.8 + 0.4 * azar());
    valor[o] = r2(heredado);
  }
  const p: Persona = {
    id: m.sigId++,
    nombre: nombrePropio(m.fonologia),
    sexo: datos.sexo ?? (prob(0.5) ? 'H' : 'M'),
    nace: datos.nace,
    padre: padre?.id ?? null,
    madre: madre?.id ?? null,
    pareja: null,
    aldea: aldea.id,
    genes: datos.genes ?? (padre && madre ? heredarGenes(padre.genes, madre.genes) : genesAlAzar()),
    mente: padre && madre ? heredarMente(padre.recompensa >= madre.recompensa ? padre.mente : madre.mente) : menteNueva(),
    recompensa: 0.5,
    opinion: madre?.opinion ?? 'comida',
    faccion: null,
    salud: 1,
    reservas: 6,
    causa: '',
    ultimoParto: -100000,
    saberes: [],
    ideas: [],
    lexico: {},
    valor,
    x: aldea.x,
    y: aldea.y,
    actividad: 'descansar',
    hijos: 0,
    descubrimientos: 0,
  };
  m.personas.push(p);
  return p;
}

export function nuevaAldea(m: Mundo, x: number, y: number, fundador: string, origen: number | null): Aldea {
  const a: Aldea = {
    id: m.sigId++,
    nombre: nombrePropio(m.fonologia),
    x,
    y,
    fundada: m.t,
    fundador,
    origen,
    despensa: {},
    edificios: [],
    obra: null,
    vistos: [],
    conocidos: [],
    archivo: [],
    abandonada: null,
    poblacionMax: 0,
    movida: m.t,
    consejo: null,
    facciones: [],
    amenaza: 0,
  };
  m.aldeas.push(a);
  return a;
}

export function crearMundo(semilla: number, previo?: Mundo): Mundo {
  fijarAzar(semilla);
  const { terreno, recursos } = generarTerreno(ANCHO, ALTO);
  const m: Mundo = {
    version: VERSION_ESTADO,
    semilla,
    era: previo ? previo.era + 1 : 1,
    t: 0,
    azar: 0,
    ancho: ANCHO,
    alto: ALTO,
    terreno,
    recursos,
    clima: 1,
    fonologia: crearFonologia(),
    personas: [],
    aldeas: [],
    sigId: 1,
    hallazgos: {},
    olvidados: [],
    contactos: [],
    relaciones: {},
    construidos: [],
    ruinas: [],
    lenguasSeparadas: [],
    hitos: [],
    cronica: previo?.cronica ?? [],
    historia: previo?.historia ?? [],
    anual: { nacimientos: 0, muertes: {}, asaltos: 0 },
    poblacionMax: 0,
    eras: previo?.eras ?? [],
    reloj: previo?.reloj ?? null,
  };

  const sitio = buscarSitio(m, null, 0, 0) ?? { x: Math.floor(ANCHO / 2), y: Math.floor(ALTO / 2) };
  const aldea = nuevaAldea(m, sitio.x, sitio.y, '', null);
  // Lo que llevan encima: algo de comida y cuatro cosas recogidas por el camino.
  aldea.despensa = { bayas: 40, semillas: 30, madera: 10, piedra: 5, fibra: 5, hierbas: 2 };
  aldea.vistos = ['bayas', 'semillas', 'madera', 'piedra', 'fibra', 'hierbas'];

  // Una pequeña banda: cuatro parejas jóvenes, una pareja mayor y sus hijos.
  const parejas: [Persona, Persona][] = [];
  const edades = [18 + entero(6), 20 + entero(8), 22 + entero(8), 25 + entero(8), 40 + entero(8)];
  for (const e of edades) {
    const h = nuevaPersona(m, { aldea, nace: -Math.floor(e * DIAS_ANIO) - entero(DIAS_ANIO), sexo: 'H' });
    const mu = nuevaPersona(m, { aldea, nace: -Math.floor((e - 2 + entero(4)) * DIAS_ANIO) - entero(DIAS_ANIO), sexo: 'M' });
    h.pareja = mu.id;
    mu.pareja = h.id;
    parejas.push([h, mu]);
  }
  for (let k = 0; k < 6; k++) {
    const [padre, madre] = parejas[1 + entero(parejas.length - 1)];
    const e = Math.min(12, Math.max(0, edad(m, madre) - 17)) * azar();
    const hijo = nuevaPersona(m, { aldea, nace: -Math.floor(e * DIAS_ANIO), padre, madre });
    padre.hijos++;
    madre.hijos++;
    madre.ultimoParto = Math.max(madre.ultimoParto, hijo.nace);
  }
  aldea.fundador = parejas[0][0].nombre;
  aldea.poblacionMax = m.personas.length;
  m.poblacionMax = m.personas.length;

  const lugar = LUGAR[terreno[sitio.y * ANCHO + sitio.x]] ?? 'un claro';
  anotar(
    m,
    'inicio',
    `${previo ? `Comienza la era ${m.era}. ` : ''}Una banda de ${m.personas.length} personas se asienta en ${lugar}. ` +
      `Su campamento acabará llamándose ${aldea.nombre}. No tienen palabras, ni fuego, ni herramientas: solo sus manos y su curiosidad.`,
    aldea.id,
  );
  m.azar = estadoAzar();
  return m;
}

const LUGAR: Record<number, string> = {
  1: 'una orilla',
  2: 'una pradera',
  3: 'un bosque',
  4: 'una colina',
};
