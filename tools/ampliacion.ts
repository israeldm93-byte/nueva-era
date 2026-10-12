// Comprueba que ampliar el mapa (versión 5 → 6) conserva el mundo tal cual:
//   node tools/ampliacion.ts <mundo.json de la versión 5>
//
// 1. Se migra y se vuelve a recortar al tamaño de antes: debe salir exactamente el mismo
//    mundo (cada casilla, aldea, persona, relación, saber, crónica, fecha y estado del azar).
// 2. Nada se ha movido: las coordenadas de aldeas, edificios, personas y fieras son las mismas
//    y cada índice de casilla guardado apunta a la misma x e y.
// 3. Guardar, cargar y volver a guardar no cambia nada.
// 4. Sigue vivo: se simula un tiempo sin anomalías ni invariantes rotas.

import { readFileSync } from 'node:fs';
import { anomalias } from '../src/anomalias.ts';
import { comprobar } from '../src/invariantes.ts';
import { migrar } from '../src/migrar.ts';
import { avanzar } from '../src/simulacion.ts';
import type { Mundo } from '../src/tipos.ts';

/** Lo contrario de ampliar: deja solo el rectángulo de arriba a la izquierda. */
export function recortar(m: Mundo, w0: number, h0: number): Mundo {
  const c = JSON.parse(JSON.stringify(m)) as Mundo;
  const W = c.ancho;
  const corta = <T>(a: T[]) => {
    const out: T[] = [];
    for (let y = 0; y < h0; y++) for (let x = 0; x < w0; x++) out.push(a[y * W + x]);
    return out;
  };
  c.terreno = corta(c.terreno);
  c.relieve = corta(c.relieve);
  for (const k of Object.keys(c.recursos)) c.recursos[k] = corta(c.recursos[k]);
  const indice = (i: number) => (i % W) + Math.floor(i / W) * w0;
  for (const f of c.fauna) f.guarida = indice(f.guarida);
  for (const l of [c.incendios, c.cenizas, c.inundadas]) for (const e of l) e[0] = indice(e[0]);
  c.ancho = w0;
  c.alto = h0;
  return c;
}

/** Ejecuta las comprobaciones y devuelve la lista de problemas (vacía si todo va bien). */
export function verificarAmpliacion(texto: string, anios = 2): { problemas: string[]; migrado: Mundo } {
  const problemas: string[] = [];
  const original = JSON.parse(texto) as Mundo;
  if (original.version !== 5) problemas.push(`se esperaba un mundo de la versión 5 (es de la ${original.version})`);
  const migrado = migrar(JSON.parse(texto) as Mundo);
  const { ancho: w0, alto: h0 } = original;
  // 1. Recortado, es el mismo mundo (salvo el número de versión y lo que la carga ya reparaba antes).
  const vuelta = recortar(migrado, w0, h0);
  vuelta.version = original.version;
  const referencia = JSON.parse(texto) as Mundo;
  // La carga de siempre repara lo que hubiera roto (y lo deja anotado); eso no es de la ampliación.
  if (migrado.reparaciones && migrado.reparaciones.length !== (referencia.reparaciones?.length ?? 0)) problemas.push('la carga ha tenido que reparar datos: compárese con cuidado');
  referencia.reparaciones = migrado.reparaciones;
  const a = JSON.stringify(vuelta);
  const b = JSON.stringify(referencia);
  if (a !== b) {
    // Dónde difiere, para poder decirlo.
    const ka = JSON.parse(a) as Record<string, unknown>;
    const kb = JSON.parse(b) as Record<string, unknown>;
    for (const k of new Set([...Object.keys(ka), ...Object.keys(kb)])) if (JSON.stringify(ka[k]) !== JSON.stringify(kb[k])) problemas.push(`recortado, «${k}» no coincide con el original`);
  }
  // 2. Nada se ha movido.
  if (migrado.ancho < w0 || migrado.alto < h0) problemas.push('el mapa ha encogido');
  for (let y = 0; y < h0; y++) {
    for (let x = 0; x < w0; x++) {
      const i0 = y * w0 + x;
      const i1 = y * migrado.ancho + x;
      if (migrado.terreno[i1] !== original.terreno[i0] || migrado.relieve[i1] !== original.relieve[i0]) {
        problemas.push(`la casilla ${x},${y} ha cambiado`);
        y = h0;
        break;
      }
    }
  }
  for (const [k, f] of migrado.fauna.entries()) {
    const g = original.fauna[k];
    if (f.guarida % migrado.ancho !== g.guarida % w0 || Math.floor(f.guarida / migrado.ancho) !== Math.floor(g.guarida / w0)) problemas.push(`la guarida de la fiera ${f.id} se ha movido`);
  }
  // 3. Guardar, cargar y volver a guardar.
  const s1 = JSON.stringify(migrado);
  const s2 = JSON.stringify(migrar(JSON.parse(s1) as Mundo));
  if (s1 !== s2) problemas.push('guardar y volver a cargar cambia el mundo');
  // 4. Sigue vivo.
  const vivo = migrar(JSON.parse(s1) as Mundo);
  const antes = anomalias().length;
  avanzar(vivo, anios * 120);
  for (const x of comprobar(vivo).slice(0, 5)) problemas.push(`tras simular: ${x}`);
  if (anomalias().length > antes) problemas.push(`tras simular, anomalías: ${anomalias().slice(antes, antes + 3).join('; ')}`);
  return { problemas, migrado };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const ruta = process.argv[2];
  const texto = readFileSync(ruta, 'utf8');
  const o = JSON.parse(texto) as Mundo;
  const ini = Date.now();
  const { problemas, migrado } = verificarAmpliacion(texto);
  console.log(`${ruta}: versión ${o.version}, ${o.ancho}×${o.alto}, día ${o.t}, ${o.personas.length} personas, ${o.aldeas.filter((a) => a.abandonada === null).length} aldeas`);
  console.log(`  → versión ${migrado.version}, ${migrado.ancho}×${migrado.alto}; guardado ${(texto.length / 1024).toFixed(0)} KB → ${(JSON.stringify(migrado).length / 1024).toFixed(0)} KB`);
  console.log(problemas.length ? `  PROBLEMAS:\n   - ${problemas.join('\n   - ')}` : `  Conservado: mismo mundo al recortar, nada desplazado, guardar/cargar estable, 2 años más sin anomalías (${((Date.now() - ini) / 1000).toFixed(1)} s).`);
  process.exitCode = problemas.length ? 1 : 0;
}
