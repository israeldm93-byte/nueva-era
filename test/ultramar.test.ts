// El mundo ampliado (versión 6): el continente de siempre no se mueve ni cambia, y lo que
// hay más allá del mar se añade sin tocar nada de lo que ya existía.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALTO, ANCHO, DIAS_ANIO, MUNDO_ALTO, MUNDO_ANCHO } from '../src/config.ts';
import { comprobar } from '../src/invariantes.ts';
import { migrar } from '../src/migrar.ts';
import { crearMundo } from '../src/mundo.ts';
import { avanzar } from '../src/simulacion.ts';
import type { Mundo } from '../src/tipos.ts';
import { recortar, verificarAmpliacion } from '../tools/ampliacion.ts';

/** Un guardado de la versión 5 (el mundo de antes de ampliar), con años de historia. */
function guardadoV5(semilla: number, anios: number): string {
  const m = crearMundo(semilla);
  avanzar(m, anios * DIAS_ANIO);
  const viejo = recortar(m, ANCHO, ALTO);
  viejo.version = 5;
  return JSON.stringify(viejo);
}

test('un mundo nuevo nace con el mapa ampliado y el continente de origen arriba a la izquierda', () => {
  const m = crearMundo(5);
  assert.equal(m.ancho, MUNDO_ANCHO);
  assert.equal(m.alto, MUNDO_ALTO);
  for (const a of m.aldeas) assert.ok(a.x < ANCHO && a.y < ALTO, 'la banda empieza en el continente de origen');
  // Las guaridas (guardadas como número de casilla) siguen en tierra del continente.
  for (const f of m.fauna) {
    const [gx, gy] = [f.guarida % m.ancho, Math.floor(f.guarida / m.ancho)];
    assert.ok(gx < ANCHO && gy < ALTO && m.terreno[f.guarida] !== 0, `guarida en ${gx},${gy}`);
  }
  assert.deepEqual(comprobar(m), []);
});

test('ampliar un guardado de la versión 5 conserva el mundo entero: recortado otra vez, es idéntico', () => {
  const texto = guardadoV5(23, 30);
  const { problemas, migrado } = verificarAmpliacion(texto, 1);
  assert.deepEqual(problemas, []);
  assert.equal(migrado.version, 6);
  assert.equal(migrado.ancho, MUNDO_ANCHO);
  const o = JSON.parse(texto) as Mundo;
  // Mismas coordenadas para todo lo que tiene coordenadas.
  assert.deepEqual(migrado.aldeas.map((a) => [a.id, a.x, a.y]), o.aldeas.map((a) => [a.id, a.x, a.y]));
  assert.deepEqual(migrado.personas.map((p) => [p.id, p.x, p.y]), o.personas.map((p) => [p.id, p.x, p.y]));
  assert.deepEqual(
    migrado.aldeas.flatMap((a) => a.edificios.map((e) => [e.tipo, e.x, e.y])),
    o.aldeas.flatMap((a) => a.edificios.map((e) => [e.tipo, e.x, e.y])),
  );
  // Misma fecha, mismo azar, misma historia.
  assert.equal(migrado.t, o.t);
  assert.equal(migrado.azar, o.azar);
  assert.equal(migrado.cronica.length, o.cronica.length);
});

test('la comprobación no es complaciente: si algo se moviera, lo detectaría', () => {
  const texto = guardadoV5(23, 10);
  const migrado = migrar(JSON.parse(texto) as Mundo);
  migrado.aldeas[0].x += 1;
  const vuelta = recortar(migrado, ANCHO, ALTO);
  vuelta.version = 5;
  assert.notEqual(JSON.stringify(vuelta), texto);
});

test('guardar, cargar y volver a guardar el mundo ampliado no cambia nada; y sigue igual que sin parar', () => {
  const m = migrar(JSON.parse(guardadoV5(7, 15)) as Mundo);
  const s1 = JSON.stringify(m);
  assert.equal(JSON.stringify(migrar(JSON.parse(s1) as Mundo)), s1);
  const seguido = migrar(JSON.parse(s1) as Mundo);
  avanzar(seguido, 2 * DIAS_ANIO);
  let partido = migrar(JSON.parse(s1) as Mundo);
  avanzar(partido, 97);
  partido = migrar(JSON.parse(JSON.stringify(partido)) as Mundo);
  avanzar(partido, 2 * DIAS_ANIO - 97);
  assert.equal(JSON.stringify(partido), JSON.stringify(seguido));
  assert.deepEqual(comprobar(seguido), []);
});
