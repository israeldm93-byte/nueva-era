// Uso:
//   node src/cli.ts simular --anios 200 --semilla 7     (en memoria, imprime la crónica)
//   node src/cli.ts avanzar --estado estado/mundo.json --web sitio/datos [--crear --prologo 3]
//       Avanza el mundo hasta el momento real actual (1 año por hora real) y
//       exporta los datos de la web. Con --crear, si no hay estado nace un mundo nuevo.

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DIAS_ANIO, MS_POR_DIA } from './config.ts';
import { fecha } from './cronica.ts';
import { exportar } from './exportar.ts';
import { fijarMotor } from './vista.ts';
import { migrar } from './migrar.ts';
import { aldeasVivas, crearMundo, indexar } from './mundo.ts';
import { avanzar } from './simulacion.ts';
import type { Mundo } from './tipos.ts';

fijarMotor((process.env.GITHUB_SHA ?? 'dev').slice(0, 8));
const orden = process.argv[2];
const args: Record<string, string> = {};
for (let i = 3; i < process.argv.length; i++) {
  const k = process.argv[i];
  if (k.startsWith('--')) {
    const v = process.argv[i + 1];
    if (v === undefined || v.startsWith('--')) args[k.slice(2)] = 'si';
    else {
      args[k.slice(2)] = v;
      i++;
    }
  }
}

function resumen(m: Mundo): string {
  const ix = indexar(m);
  const saberes = new Set<string>();
  for (const p of m.personas) for (const s of p.saberes) saberes.add(s);
  const aldeas = aldeasVivas(m)
    .map((a) => `${a.nombre}(${ix.porAldea.get(a.id)?.length ?? 0})`)
    .join(' ');
  const reservas = m.personas.reduce((s, p) => s + p.reservas, 0) / Math.max(1, m.personas.length);
  return `--- ${fecha(m.t)} · era ${m.era} · ${m.personas.length} personas · ${saberes.size} saberes · reservas ${reservas.toFixed(1)} · ${aldeas}`;
}

function simular(): void {
  const anios = Number(args.anios ?? 100);
  const m = crearMundo(Number(args.semilla ?? 1));
  const cada = Number(args.cada ?? 10);
  const ocultar = new Set((args.ocultar ?? 'muerte,lobos,epidemia,contacto,difusion,perdida').split(','));
  if (args.todo) ocultar.clear();
  let vistos = 0;
  const imprimir = () => {
    for (; vistos < m.cronica.length; vistos++) {
      const s = m.cronica[vistos];
      if (!ocultar.has(s.tipo)) console.log(`${fecha(s.t)} · ${s.texto}`);
    }
  };
  imprimir();
  const t0 = Date.now();
  for (let y = 1; y <= anios; y++) {
    avanzar(m, DIAS_ANIO);
    imprimir();
    if (y % cada === 0) console.log(resumen(m));
  }
  console.log(`(${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  // El reloj arranca ahora: así la web lo sigue simulando en directo desde este momento.
  m.reloj ??= new Date().toISOString();
  if (args.guardar) writeFileSync(args.guardar, JSON.stringify(m));
  if (args.web) exportar(m, args.web, new Date());
}

function avanzarHastaAhora(): void {
  const ruta = args.estado ?? 'estado/mundo.json';
  const ahora = args.ahora ? new Date(args.ahora) : new Date();
  let m: Mundo;
  if (existsSync(ruta)) {
    m = migrar(JSON.parse(readFileSync(ruta, 'utf8')) as Mundo);
  } else {
    // Nunca se crea un mundo nuevo por accidente (por ejemplo, si falló la descarga del estado).
    if (!args.crear) throw new Error(`No existe ${ruta}. Usa --crear para que nazca un mundo nuevo.`);
    const semilla = Number(args.semilla ?? Math.floor(ahora.getTime() / 1000) % 2147483647);
    m = crearMundo(semilla);
    m.reloj = ahora.toISOString();
    // Un pequeño prólogo para que la web no amanezca vacía.
    const prologo = Number(args.prologo ?? 0);
    if (prologo > 0) avanzar(m, prologo * DIAS_ANIO);
    console.log(`Mundo nuevo con semilla ${semilla}.`);
  }
  const max = DIAS_ANIO * Number(args.maxAnios ?? 30);
  let pendiente = Math.floor((ahora.getTime() - Date.parse(m.reloj ?? ahora.toISOString())) / MS_POR_DIA);
  if (pendiente > max * 8) {
    // Si la simulación estuvo parada mucho tiempo, ese tiempo no se recupera.
    m.reloj = new Date(ahora.getTime() - max * MS_POR_DIA).toISOString();
    pendiente = max;
  }
  const objetivo = Math.max(0, Math.min(pendiente, max));
  const limite = Date.now() + Number(args.segundos ?? 240) * 1000;
  let hechos = 0;
  while (hechos < objetivo && Date.now() < limite) {
    const tramo = Math.min(DIAS_ANIO / 4, objetivo - hechos);
    avanzar(m, tramo);
    hechos += tramo;
  }
  m.reloj = new Date(Date.parse(m.reloj ?? ahora.toISOString()) + hechos * MS_POR_DIA).toISOString();
  mkdirSync(dirname(ruta), { recursive: true });
  // Se guarda una copia del estado anterior por si algo saliera mal.
  if (existsSync(ruta)) copyFileSync(ruta, join(dirname(ruta), 'anterior.json'));
  writeFileSync(ruta, JSON.stringify(m));
  if (args.web) exportar(m, args.web, ahora);
  console.log(`Simulados ${hechos} días (pendientes ${pendiente}).`);
  console.log(resumen(m));
}

if (orden === 'simular') simular();
else if (orden === 'avanzar') avanzarHastaAhora();
else {
  console.log('Órdenes: simular [--anios N --semilla S --todo --web dir] | avanzar [--estado ruta --web dir]');
  process.exitCode = 1;
}
