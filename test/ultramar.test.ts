// El mundo ampliado (versión 6): el continente de siempre no se mueve ni cambia, y lo que
// hay más allá del mar se añade sin tocar nada de lo que ya existía.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fijarAzar } from '../src/azar.ts';
import { AGUA, BOSQUE, CAPACIDAD, DESIERTO, ESTEPA, ORILLA, PRADERA, TEMPORADA, TUNDRA } from '../src/catalogo.ts';
import { ALTO, ANCHO, DIAS_ANIO, MUNDO_ALTO, MUNDO_ANCHO } from '../src/config.ts';
import { comprobar } from '../src/invariantes.ts';
import { masas, recrecer } from '../src/mapa.ts';
import { migrar } from '../src/migrar.ts';
import { crearMundo } from '../src/mundo.ts';
import { avanzar } from '../src/simulacion.ts';
import { salud } from '../src/sociedad.ts';
import type { Mundo } from '../src/tipos.ts';
import { frioDe } from '../src/ultramar.ts';
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

// ---------------------------------------------------------------------------------------
// Las regiones de ultramar: distintas y con efecto en la vida, no solo de adorno.

const NORTE = (y: number) => y < 76;
const SUR = (y: number) => y >= 120;

/** Lo que hay fuera del continente de origen, por región. */
function regiones(m: Mundo) {
  const cuenta = { norte: new Map<number, number>(), sur: new Map<number, number>(), islas: new Map<number, number>() };
  for (let i = 0; i < m.terreno.length; i++) {
    const x = i % m.ancho;
    const y = (i - x) / m.ancho;
    if (x < ANCHO && y < ALTO) continue;
    const t = m.terreno[i];
    if (t === AGUA) continue;
    const r = NORTE(y) ? cuenta.norte : SUR(y) ? cuenta.sur : cuenta.islas;
    r.set(t, (r.get(t) ?? 0) + 1);
  }
  return cuenta;
}

test('ultramar tiene un norte de tundra y taiga, un sur árido y un archipiélago verde, separados del continente por el mar', () => {
  for (const semilla of [5, 23]) {
    const m = crearMundo(semilla);
    const { norte, sur, islas } = regiones(m);
    // Norte: tundra y bosque (taiga); nada de desierto.
    assert.ok((norte.get(TUNDRA) ?? 0) > 150, `tundra en el norte (${norte.get(TUNDRA)})`);
    assert.ok((norte.get(BOSQUE) ?? 0) > 150, 'taiga en el norte');
    assert.equal(norte.get(DESIERTO) ?? 0, 0);
    // Sur: desierto y estepa, sin tundra, con algún oasis (agua dulce rodeada de pradera).
    assert.ok((sur.get(DESIERTO) ?? 0) > 800 && (sur.get(ESTEPA) ?? 0) > 300, 'desierto y estepa en el sur');
    assert.equal(sur.get(TUNDRA) ?? 0, 0);
    assert.ok((sur.get(PRADERA) ?? 0) > 0, 'oasis en el sur');
    // Islas: tierra verde y playas.
    assert.ok((islas.get(PRADERA) ?? 0) + (islas.get(BOSQUE) ?? 0) > 100 && (islas.get(ORILLA) ?? 0) > 20, 'islas habitables');
    // Ninguna tierra de ultramar está unida al continente de origen (hay que cruzar el mar).
    const { masa } = masas(m);
    const dentro = new Set<number>();
    for (let y = 0; y < ALTO; y++) for (let x = 0; x < ANCHO; x++) if (masa[y * m.ancho + x] >= 0) dentro.add(masa[y * m.ancho + x]);
    for (let i = 0; i < m.terreno.length; i++) {
      const x = i % m.ancho;
      const y = (i - x) / m.ancho;
      if ((x >= ANCHO || y >= ALTO) && masa[i] >= 0) assert.ok(!dentro.has(masa[i]), `la casilla ${x},${y} está unida al continente de origen`);
    }
    // Recursos: todos finitos y dentro de lo posible; minerales en el sur.
    for (const [capa, v] of Object.entries(m.recursos)) assert.ok(v.every((x) => Number.isFinite(x) && x >= 0), capa);
    let hierroSur = 0;
    for (let i = 0; i < m.terreno.length; i++) if (SUR(Math.floor(i / m.ancho)) && m.recursos.hematites[i] > 0) hierroSur++;
    assert.ok(hierroSur >= 5, 'vetas de hierro en las sierras del sur');
  }
});

test('el frío es cosa del norte de ultramar: en el continente de origen no cambia nada', () => {
  const m = crearMundo(5);
  for (let y = 0; y < ALTO; y += 7) for (let x = 0; x < ANCHO; x += 7) assert.equal(frioDe(m, x, y), 0);
  assert.ok(frioDe(m, 210, 10) > 0.9, 'el extremo norte es muy frío');
  assert.ok(frioDe(m, 210, 40) > 0.3 && frioDe(m, 210, 40) < frioDe(m, 210, 20), 'más frío cuanto más al norte');
  assert.equal(frioDe(m, 120, 160), 0, 'el sur no es frío');
});

test('en el norte el invierno hace más daño a los que están a la intemperie', () => {
  const m = crearMundo(5);
  const a = m.aldeas[0];
  const gente = m.personas.filter((p) => p.aldea === a.id);
  const perdido = (x: number, y: number) => {
    const c = JSON.parse(JSON.stringify({ a, gente })) as { a: typeof a; gente: typeof gente };
    c.a.x = x;
    c.a.y = y;
    c.a.edificios = [];
    c.a.despensa = {};
    fijarAzar(99);
    salud(m, c.a, c.gente, 3, false);
    return c.gente.reduce((s, p, k) => s + (gente[k].salud - p.salud), 0);
  };
  const casa = perdido(a.x, a.y);
  const norte = perdido(210, 14);
  // (La salud va en centésimas: en el continente, a un adulto un día de frío apenas le resta.)
  assert.ok(norte > 0.01 * gente.length * 0.9, `en el norte, a todos (${norte.toFixed(3)})`);
  assert.ok(norte > casa + 0.01 * gente.length * 0.5, `en el norte, mucho más (${norte.toFixed(3)} frente a ${casa.toFixed(3)})`);
});

test('en el norte el verano es corto: los frutos no llegan a tanto como en el continente', () => {
  const m = crearMundo(5);
  recrecer(m, 1, 400);
  const objetivo = (t: number) => CAPACIDAD.bayas[t] * TEMPORADA.bayas[1] * m.clima;
  let norte = 0;
  let casa = 0;
  for (let i = 0; i < m.terreno.length; i++) {
    const t = m.terreno[i];
    if (t !== BOSQUE) continue;
    const x = i % m.ancho;
    const y = (i - x) / m.ancho;
    if (x < ANCHO && y < ALTO) {
      assert.ok(Math.abs(m.recursos.bayas[i] - objetivo(t)) < 0.02, 'en el continente, como siempre');
      casa++;
    } else if (frioDe(m, x, y) > 0.5) {
      assert.ok(m.recursos.bayas[i] < objetivo(t) * 0.75, `en ${x},${y}, menos bayas`);
      norte++;
    }
  }
  assert.ok(casa > 0 && norte > 0);
});
