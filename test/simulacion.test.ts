import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fijarAzar } from '../src/azar.ts';
import { DIAS_ANIO, VERSION_ESTADO } from '../src/config.ts';
import { TECNICAS } from '../src/catalogo.ts';
import { datosWeb } from '../src/vista.ts';
import { migrar } from '../src/migrar.ts';
import { ACCIONES, aprender, entradas, menteNueva, pensar } from '../src/mente.ts';
import { AGUA, MONTANA, RIO } from '../src/catalogo.ts';
import { alcanzable, masas } from '../src/mapa.ts';
import { lexicoComun } from '../src/lenguaje.ts';
import { aldeasVivas, crearMundo, indexar } from '../src/mundo.ts';
import { avanzar } from '../src/simulacion.ts';
import type { Mundo } from '../src/tipos.ts';

const copiar = (m: Mundo): Mundo => JSON.parse(JSON.stringify(m));

test('misma semilla, misma historia', () => {
  const a = crearMundo(42);
  const b = crearMundo(42);
  avanzar(a, 3 * DIAS_ANIO);
  avanzar(b, 3 * DIAS_ANIO);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

test('guardar y cargar a mitad no cambia nada', () => {
  const seguido = crearMundo(7);
  avanzar(seguido, 4 * DIAS_ANIO);

  let partido = crearMundo(7);
  avanzar(partido, 2 * DIAS_ANIO + 17);
  partido = copiar(partido);
  avanzar(partido, 2 * DIAS_ANIO - 17);

  assert.equal(JSON.stringify(partido), JSON.stringify(seguido));
});

test('en 30 años la banda sobrevive, descubre cosas y crea su idioma', () => {
  const m = crearMundo(3);
  avanzar(m, 30 * DIAS_ANIO);
  assert.equal(m.era, 1, 'la especie no debería extinguirse tan pronto');
  assert.ok(m.personas.length > 10, `población ${m.personas.length}`);
  assert.ok(Object.keys(m.hallazgos).length >= 3, 'debería haber algún descubrimiento');
  assert.equal(m.historia.length, 30);

  const ix = indexar(m);
  const mayor = aldeasVivas(m).sort((a, b) => (ix.porAldea.get(b.id)?.length ?? 0) - (ix.porAldea.get(a.id)?.length ?? 0))[0];
  const lexico = Object.values(lexicoComun(ix.porAldea.get(mayor.id) ?? []));
  assert.ok(lexico.length >= 10, 'deberían tener palabras para varias cosas');
  const acuerdo = lexico.reduce((s, [, x]) => s + x, 0) / lexico.length;
  assert.ok(acuerdo > 0.5, `acuerdo medio ${acuerdo}`);
});

test('la web no desvela saberes sin descubrir', () => {
  const m = crearMundo(11);
  avanzar(m, 10 * DIAS_ANIO);
  const datos = datosWeb(m, new Date('2026-01-01T00:00:00Z'));
  const descubiertos = Object.keys(m.hallazgos);
  assert.deepEqual(datos.tecnicas.map((t) => t.id).sort(), descubiertos.sort());
  assert.equal(datos.totalSaberes, TECNICAS.length);
  for (const p of datos.personas) for (const s of p.saberes) assert.ok(descubiertos.includes(s));
  for (const t of TECNICAS) if (!descubiertos.includes(t.id)) assert.ok(!JSON.stringify(datos).includes(t.efecto), `se desvela ${t.id}`);
  for (const t of TECNICAS) if (!descubiertos.includes(t.id)) assert.equal(datos.nombres[t.id], undefined, `se desvela el nombre de ${t.id}`);
});

test('cada saber se puede llegar a descubrir', () => {
  // Todo ingrediente es un material del mundo, algo básico o el producto de otro saber.
  const ids = new Set(TECNICAS.map((t) => t.id));
  const basicos = new Set(['tierra', 'agua', 'cielo']);
  const materiales = new Set(['madera', 'piedra', 'fibra', 'hierbas', 'bayas', 'semillas', 'carne', 'pescado', 'cereal', 'piel', 'hueso', 'arcilla', 'malaquita', 'casiterita', 'hematites', 'cria']);
  const firmas = new Set<string>();
  for (const t of TECNICAS) {
    for (const c of t.cosas) assert.ok(ids.has(c) || basicos.has(c) || materiales.has(c), `${t.id}: ingrediente desconocido ${c}`);
    for (const r of t.requiere ?? []) assert.ok(ids.has(r), `${t.id}: requisito desconocido ${r}`);
    const firma = `${t.cosas.join('+')}/${t.verbo}`;
    assert.ok(!firmas.has(firma), `receta repetida: ${firma}`);
    firmas.add(firma);
  }
});

test('un mundo de la versión 1 se pone al día y sigue vivo', () => {
  const m = crearMundo(5);
  avanzar(m, 2 * DIAS_ANIO);
  // Lo convertimos en un mundo antiguo, sin mentes ni política.
  const viejo = copiar(m) as unknown as Record<string, unknown> & Mundo;
  viejo.version = 1;
  for (const p of viejo.personas) {
    delete (p as Partial<typeof p>).mente;
    delete (p.genes as Partial<typeof p.genes>).agresividad;
  }
  for (const a of viejo.aldeas) delete (a as Partial<typeof a>).consejo;
  delete (viejo as Partial<Mundo>).relaciones;
  const nuevo = migrar(viejo);
  assert.equal(nuevo.version, VERSION_ESTADO);
  assert.ok(nuevo.personas.every((p) => p.mente.length > 0 && p.genes.agresividad > 0));
  avanzar(nuevo, DIAS_ANIO);
  assert.ok(nuevo.personas.length > 0);
});

test('el consejo decide y las mentes aprenden', () => {
  const m = crearMundo(9);
  const antes = JSON.stringify(m.personas[0].mente);
  avanzar(m, 5 * DIAS_ANIO);
  assert.ok(m.aldeas.some((a) => a.consejo !== null), 'debería haber consejo');
  const p = m.personas.find((q) => q.id === 1);
  if (p) assert.notEqual(JSON.stringify(p.mente), antes, 'la mente debería haber cambiado al aprender');
  assert.ok(m.historia.every((f) => Array.isArray(f.pruebas)));
});

test('un mundo de la versión 2 se pone al día y sus mentes piensan igual', () => {
  const m = crearMundo(13);
  avanzar(m, 3 * DIAS_ANIO);
  const viejo = copiar(m);
  // En la versión 2 los pesos eran centésimas.
  viejo.version = 2;
  for (const p of viejo.personas) p.mente = p.mente.map((w) => Math.round(w / 10));
  const x = entradas({ hambre: 0.4, escasez: 0.3, frio: 1, edad: 0.5 });
  const antes = viejo.personas.map((p) => pensar(p.mente.map((w) => w * 10), x).salidas);
  const nuevo = migrar(viejo);
  assert.equal(nuevo.version, VERSION_ESTADO);
  nuevo.personas.forEach((p, i) => assert.deepEqual(pensar(p.mente, x).salidas, antes[i]));
  avanzar(nuevo, DIAS_ANIO);
  assert.ok(nuevo.historia.at(-1)!.acierto !== undefined, 'debería medirse cuánto aciertan');
});

test('una mente aprende qué rinde según la situación', () => {
  // Cortar leña rinde en invierno y no en verano: la mente tiene que distinguirlo.
  fijarAzar(12345);
  const mente = menteNueva();
  const lenar = ACCIONES.indexOf('lenar');
  const invierno = entradas({ frio: 1, madera: 0.8, edad: 0.5 });
  const verano = entradas({ frio: 0, cosecha: 0.5, madera: 0.1, edad: 0.5 });
  for (let dia = 0; dia < 600; dia++) {
    const x = dia % 2 ? invierno : verano;
    aprender(mente, pensar(mente, x), lenar, dia % 2 ? 0.6 : -0.5, x);
  }
  const enInvierno = pensar(mente, invierno).salidas[lenar];
  const enVerano = pensar(mente, verano).salidas[lenar];
  assert.ok(enInvierno > 0.4 && enVerano < -0.3, `invierno ${enInvierno}, verano ${enVerano}`);
});

test('un mundo de la versión 3 pasa al mapa grande sin perder a su gente', () => {
  const m = crearMundo(17);
  avanzar(m, 3 * DIAS_ANIO);
  const viejo = copiar(m) as unknown as Record<string, unknown> & Mundo;
  viejo.version = 3;
  for (const k of ['relieve', 'fauna', 'incendios', 'cenizas', 'inundadas', 'avisos']) delete (viejo as Record<string, unknown>)[k];
  const personas = viejo.personas.map((p) => p.id).sort();
  const nuevo = migrar(viejo);
  assert.equal(nuevo.version, VERSION_ESTADO);
  assert.deepEqual(nuevo.personas.map((p) => p.id).sort(), personas);
  assert.equal(nuevo.relieve.length, nuevo.ancho * nuevo.alto);
  assert.ok(nuevo.fauna.length > 0, 'debería haber fieras');
  const { masa, continente } = masas(nuevo);
  for (const a of aldeasVivas(nuevo)) {
    const i = a.y * nuevo.ancho + a.x;
    assert.equal(masa[i], continente, `${a.nombre} debería estar en el continente`);
    assert.ok(![AGUA, RIO, MONTANA].includes(nuevo.terreno[i]));
  }
  for (const p of nuevo.personas) {
    const a = nuevo.aldeas.find((x) => x.id === p.aldea)!;
    assert.deepEqual([p.x, p.y], [a.x, a.y]);
  }
  avanzar(nuevo, DIAS_ANIO);
  assert.ok(nuevo.personas.length > 0);
});

test('a las islas solo se llega en barca y las fieras no cruzan el agua', () => {
  const m = crearMundo(7);
  const { masa, continente } = masas(m);
  const a = m.aldeas[0];
  const isla = masa.findIndex((k) => k >= 0 && k !== continente);
  assert.ok(isla >= 0, 'el mapa debería tener islas');
  assert.equal(alcanzable(m, a, isla, false), false);
  assert.equal(alcanzable(m, a, isla, true), true);
  avanzar(m, 2 * DIAS_ANIO);
  const { masa: ahora } = masas(m);
  for (const f of m.fauna) {
    const i = f.y * m.ancho + f.x;
    assert.notEqual(m.terreno[i], AGUA, 'una fiera en el agua');
    assert.equal(ahora[i], ahora[f.guarida], 'una fiera fuera de su tierra');
  }
});
