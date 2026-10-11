// Lo que piensa una aldea y el trato entre aldeas: opiniones coherentes con lo que de
// verdad les falta, y aldeas lejanas (hijas de un cisma) que siguen sabiendo unas de otras.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DIAS_ANIO } from '../src/config.ts';
import { comidaTotal, contexto } from '../src/economia.ts';
import { aldeasVivas, crearMundo, edad } from '../src/mundo.ts';
import { noche } from '../src/politica.ts';
import { avanzar } from '../src/simulacion.ts';
import type { Aldea, Mundo } from '../src/tipos.ts';

const copiar = (m: Mundo): Mundo => JSON.parse(JSON.stringify(m));

/** Unas noches de opiniones y consejo; devuelve qué opinan los adultos y qué decide el consejo. */
function opinar(m: Mundo, a: Aldea, noches: number) {
  const gente = m.personas.filter((p) => p.aldea === a.id);
  for (let d = 0; d < noches; d++) {
    noche(m, a, gente, contexto(m, a, gente, 0));
    m.t++;
  }
  const adultos = gente.filter((p) => edad(m, p) >= 16);
  return { comida: adultos.filter((p) => p.opinion === 'comida').length / adultos.length, consejo: a.consejo?.prioridad };
}

test('con cientos de días de comida guardada y todos bien comidos, la aldea no se obsesiona con conseguir más comida', () => {
  const base = crearMundo(6);
  avanzar(base, 25 * DIAS_ANIO);
  const id = aldeasVivas(base).sort((x, y) => base.personas.filter((p) => p.aldea === y.id).length - base.personas.filter((p) => p.aldea === x.id).length)[0].id;
  // Abundancia: graneros para más de un año y todos saciados (como Kebi en el mundo vivo).
  const rico = copiar(base);
  const a = rico.aldeas.find((x) => x.id === id)!;
  const n = rico.personas.filter((p) => p.aldea === id).length;
  for (const k of Object.keys(a.despensa)) if (['bayas', 'semillas', 'carne', 'pescado', 'cereal', 'huevos', 'leche', 'queso'].includes(k)) a.despensa[k] = 0;
  a.despensa.cereal = 500 * n;
  for (const p of rico.personas) p.reservas = 6.1;
  assert.ok(comidaTotal(a) / (n * 0.9) > 300, 'más de 300 días de comida');
  const abundancia = opinar(rico, a, 60);
  // Hambre: la misma aldea sin comida y con el estómago vacío.
  const pobre = copiar(base);
  const b = pobre.aldeas.find((x) => x.id === id)!;
  for (const k of Object.keys(b.despensa)) b.despensa[k] = 0;
  for (const p of pobre.personas) p.reservas = 1.5;
  const hambre = opinar(pobre, b, 60);
  assert.ok(abundancia.comida < 0.6, `con comida de sobra, piensan en otras cosas: ${Math.round(abundancia.comida * 100)} % por la comida`);
  assert.notEqual(abundancia.consejo, 'comida', 'y el consejo no la pone por delante');
  assert.ok(hambre.comida > 0.8 && hambre.consejo === 'comida', `con hambre de verdad, sí: ${Math.round(hambre.comida * 100)} %, consejo ${hambre.consejo}`);
});
