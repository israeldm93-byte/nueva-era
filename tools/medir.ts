// Mide el rendimiento del motor: tiempo por día simulado y por persona-día, tamaño
// del estado guardado y población, en varios mundos y escalas.
//   node tools/medir.ts [años] [semillas separadas por comas] [estado.json opcional]

import { readFileSync } from 'node:fs';
import { crearMundo } from '../src/mundo.ts';
import { migrar } from '../src/migrar.ts';
import { avanzar } from '../src/simulacion.ts';
import type { Mundo } from '../src/tipos.ts';

const anios = Number(process.argv[2] ?? 60);
const semillas = (process.argv[3] ?? '1,2,3').split(',').filter(Boolean).map(Number);
const vivo = process.argv[4];

function medir(nombre: string, m: Mundo): void {
  const filas: string[] = [];
  let personaDias = 0;
  let ms = 0;
  for (let k = 0; k < anios / 10; k++) {
    const t0 = performance.now();
    for (let d = 0; d < 1200; d++) {
      personaDias += m.personas.length;
      avanzar(m, 1);
    }
    const dt = performance.now() - t0;
    ms += dt;
    const bytes = JSON.stringify(m).length;
    filas.push(
      `  año ${String(Math.floor(m.t / 120)).padStart(3)} · ${String(m.personas.length).padStart(4)} personas · ${m.aldeas.filter((a) => a.abandonada === null).length} aldeas · ${(dt / 1200).toFixed(2)} ms/día · estado ${(bytes / 1024).toFixed(0)} KB`,
    );
  }
  const heap = process.memoryUsage().heapUsed / 1048576;
  console.log(`${nombre}: ${(ms / (anios * 120)).toFixed(2)} ms/día de media · ${((ms * 1000) / Math.max(1, personaDias)).toFixed(1)} µs por persona-día · memoria ${heap.toFixed(0)} MB`);
  console.log(filas.join('\n'));
}

for (const s of semillas) medir(`semilla ${s}`, crearMundo(s));
if (vivo) medir('mundo vivo', migrar(JSON.parse(readFileSync(vivo, 'utf8'))));
