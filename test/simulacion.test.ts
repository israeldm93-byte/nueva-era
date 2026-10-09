import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DIAS_ANIO } from '../src/config.ts';
import { TECNICAS } from '../src/catalogo.ts';
import { datosWeb } from '../src/exportar.ts';
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
