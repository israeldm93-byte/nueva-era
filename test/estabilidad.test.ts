// Estabilidad: ningún número roto (NaN, infinito, negativo imposible) entra ni se
// propaga; los guardados dañados se reparan al cargar; las cuentas de comida, salud y
// trabajo siguen siendo válidas durante simulaciones largas.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { anomalias, olvidarAnomalias } from '../src/anomalias.ts';
import { DIAS_ANIO } from '../src/config.ts';
import { comprobar } from '../src/invariantes.ts';
import { migrar } from '../src/migrar.ts';
import { aldeasVivas, crearMundo, edad, indexar, nuevaAldea, nuevaPersona } from '../src/mundo.ts';
import { avanzar } from '../src/simulacion.ts';
import { encuentros } from '../src/sociedad.ts';
import { balance, tratar } from '../src/mercaderes.ts';
import type { Mundo } from '../src/tipos.ts';

const comida = ['bayas', 'semillas', 'carne', 'pescado', 'cereal', 'huevos', 'leche', 'queso'];

test('comerciar con una aldea que se ha quedado sin gente no rompe ninguna despensa (causa del NaN de la semilla 23)', () => {
  const m = crearMundo(23);
  avanzar(m, 2 * DIAS_ANIO);
  const [a] = aldeasVivas(m);
  const b = nuevaAldea(m, a.x + 10, a.y, 'Vecina', null);
  a.despensa.cereal = 500;
  b.despensa.cereal = 0;
  olvidarAnomalias();
  // Antes: comidaTotal / 0 → Infinity o NaN, y NaN <= 0 dejaba escribir NaN en el cereal.
  // (Ahora el comercio lo hacen mercaderes: con una aldea sin gente no hay trato posible.)
  const ga = m.personas.filter((p) => p.aldea === a.id);
  assert.equal(tratar(m, a, ga, b, [], 0), null);
  assert.equal(tratar(m, b, [], a, ga, 0), null);
  for (const v of Object.values({ ...balance(m, b, [], 0).sobra, ...balance(m, b, [], 0).falta })) assert.ok(Number.isFinite(v));
  assert.equal(a.despensa.cereal, 500);
  assert.equal(b.despensa.cereal, 0);
  assert.deepEqual(anomalias(), []);
});

test('en los encuentros, una aldea que se vacía por una boda no contagia NaN', () => {
  const m = crearMundo(23);
  avanzar(m, 3 * DIAS_ANIO);
  const [b] = aldeasVivas(m);
  olvidarAnomalias();
  // Una aldea de una sola persona, soltera, junto a otra con gente soltera del otro sexo.
  // Tras la boda se muda uno de los dos (a suertes): si se muda ella, se prueba otra vez
  // con otro solitario hasta que sea él quien se va y su aldea se queda vacía.
  let vaciada = false;
  for (let intento = 0; intento < 12 && !vaciada; intento++) {
    const a = nuevaAldea(m, b.x + 6, b.y, `Solitaria${intento}`, null);
    a.despensa.cereal = 40;
    const solo = nuevaPersona(m, { aldea: a, nace: m.t - 25 * DIAS_ANIO, sexo: 'H' });
    const solteras = Array.from({ length: 6 }, () => nuevaPersona(m, { aldea: b, nace: m.t - 22 * DIAS_ANIO, sexo: 'M' }));
    // Que la boda llegue pronto: buscan pareja y se aprecian.
    for (const q of [solo, ...solteras]) {
      q.genes.sociabilidad = 1;
      q.meta = { tipo: 'familia', desde: m.t, motivo: 'prueba' };
    }
    solo.lazos = solteras.map((q) => [q.id, 0.9] as [number, number]);
    m.contactos.push(`${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`);
    for (let k = 0; k < 3000 && solo.pareja === null; k++) {
      encuentros(m, indexar(m), new Map());
      assert.deepEqual(comprobar(m).filter((x) => x.includes('despensa')), [], `intento ${intento}, encuentro ${k}`);
    }
    vaciada = solo.pareja !== null && solo.aldea !== a.id;
    // Un día más (con su comercio y sus encuentros) con la aldea ya vacía.
    encuentros(m, indexar(m), new Map());
    assert.deepEqual(comprobar(m).filter((x) => x.includes('despensa')), []);
  }
  assert.ok(vaciada, 'el caso se ha dado: el único vecino se casó y se fue');
  assert.deepEqual(anomalias(), []);
});

test('un guardado con números rotos (null, NaN, infinitos, negativos) se repara al cargar y sigue sano', () => {
  const m = crearMundo(5);
  avanzar(m, 4 * DIAS_ANIO);
  const [a] = aldeasVivas(m);
  a.despensa.cereal = NaN;
  a.despensa.carne = Infinity;
  a.despensa.piedra = -30;
  m.personas[0].reservas = NaN;
  m.personas[1].salud = NaN;
  m.personas[2].genes.ambicion = NaN;
  m.personas[3].mente[5] = NaN;
  m.recursos.caza[100] = -0.5;
  // Como en un guardado de verdad: NaN e infinitos acaban como null en el JSON.
  const texto = JSON.stringify(m);
  assert.ok(texto.includes('null'));
  olvidarAnomalias();
  const vecinas = m.personas.filter((q) => q.aldea === m.personas[0].aldea && q !== m.personas[0]);
  const mediaReservas = vecinas.reduce((t, q) => t + q.reservas, 0) / vecinas.length;
  const mente3 = m.personas[3].mente.slice();
  const cargado = migrar(JSON.parse(texto) as Mundo);
  assert.deepEqual(comprobar(cargado), []);
  assert.equal(anomalias().length, 1, 'la reparación queda registrada');
  // Cada arreglo queda escrito con su criterio, y se distingue lo recuperable de lo perdido.
  const rep = cargado.reparaciones ?? [];
  const de = (ruta: string) => rep.find((r) => r.ruta.endsWith(ruta));
  assert.equal(de(`${a.nombre}.despensa.cereal`)?.recuperable, false, 'el cereal perdido no se puede recuperar');
  assert.match(de(`${a.nombre}.despensa.cereal`)!.criterio, /no se inventa/);
  assert.equal(de(`${a.nombre}.despensa.piedra`)?.recuperable, true, 'un negativo es que se gastó de más: cero');
  assert.equal(cargado.aldeas[0].despensa.cereal, 0);
  // Lo perdido de una persona se estima con su aldea, no se pone a cero.
  assert.ok(Math.abs(cargado.personas[0].reservas - mediaReservas) < 0.01, `reservas estimadas ${cargado.personas[0].reservas} ≈ ${mediaReservas}`);
  assert.match(de(`#${m.personas[0].id}.reservas`)!.criterio, /media de su aldea/);
  // En la mente solo se anula la conexión rota: los demás pesos siguen exactamente igual.
  assert.equal(cargado.personas[3].mente[5], 0);
  for (let i = 0; i < mente3.length; i++) if (i !== 5) assert.equal(cargado.personas[3].mente[i], mente3[i]);
  assert.ok(rep.some((r) => r.ruta === 'recursos.caza' && r.recuperable));
  // Un mundo sano no se toca: cargar dos veces no repara nada más.
  olvidarAnomalias();
  const otra = migrar(JSON.parse(JSON.stringify(cargado)) as Mundo);
  assert.equal(otra.reparaciones?.length, rep.length, 'nada nuevo que reparar');
  assert.deepEqual(anomalias(), []);
  olvidarAnomalias();
  avanzar(cargado, 2 * DIAS_ANIO);
  assert.deepEqual(comprobar(cargado), []);
  assert.deepEqual(anomalias(), []);
});

/** Simula comprobando cada año que todo sigue siendo válido y razonable. */
function largo(semilla: number, anios: number) {
  const m = crearMundo(semilla);
  olvidarAnomalias();
  for (let y = 0; y < anios; y++) {
    const act: Record<string, number> = {};
    for (let d = 0; d < DIAS_ANIO; d++) {
      avanzar(m, 1);
      for (const p of m.personas) if (edad(m, p) >= 18) act[p.actividad] = (act[p.actividad] ?? 0) + 1;
    }
    const problemas = comprobar(m);
    assert.deepEqual(problemas, [], `semilla ${semilla}, año ${y + 1}: ${problemas.slice(0, 3).join('; ')}`);
    assert.deepEqual(anomalias(), [], `semilla ${semilla}, año ${y + 1}`);
    if (!m.personas.length) break;
    // La gente come (reservas medias razonables) y trabaja (nadie se queda de brazos cruzados en masa).
    const res = m.personas.reduce((s, p) => s + p.reservas, 0) / m.personas.length;
    assert.ok(res > 1 && res <= 8, `semilla ${semilla}, año ${y + 1}: reservas medias ${res}`);
    const tot = Object.values(act).reduce((s, v) => s + v, 0);
    if (tot > 0) assert.ok((act.descansar ?? 0) / tot < 0.35, `semilla ${semilla}, año ${y + 1}: descansan ${(act.descansar ?? 0) / tot}`);
    // Se produce comida en alguna parte.
    const almacen = aldeasVivas(m).reduce((s, a) => s + comida.reduce((t, k) => t + (a.despensa[k] ?? 0), 0), 0);
    assert.ok(almacen > 0, `semilla ${semilla}, año ${y + 1}: sin comida`);
  }
  return m;
}

test('60 años de vida: cuentas válidas cada año (sin NaN, infinitos ni negativos), se come y se trabaja', () => {
  largo(7, 60);
});

// Las tres semillas en que el código antiguo se corrompía (primer NaN: semilla 23 el día
// 15277, año 128; semilla 37 el día 12442, año 104; semilla 59 el día 14152, año 118), más
// allá de ese día.
test('la semilla 23 completa (130 años) ya no se corrompe', { skip: !process.env.LARGO && 'solo con LARGO=1 (tarda unos minutos)' }, () => {
  largo(23, 130);
});
test('la semilla 37 pasa del año 104 (allí fallaba) sano', { skip: !process.env.LARGO && 'solo con LARGO=1 (tarda unos minutos)' }, () => {
  largo(37, 110);
});
test('la semilla 59 pasa del año 118 (allí fallaba) sano', { skip: !process.env.LARGO && 'solo con LARGO=1 (tarda unos minutos)' }, () => {
  largo(59, 125);
});
