// Pruebas de la vida individual: carácter, metas, recuerdos, lazos y mudanzas.
// Comprueban que las decisiones cambian cuando cambian las circunstancias y que lo que
// pasa tiene consecuencias rastreables, no solo que el código corre.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DIAS_ANIO } from '../src/config.ts';
import { panorama, revisarMeta, sesgo } from '../src/individuo.ts';
import { MAX_LAZOS, MAX_RECUERDOS, MAX_VIDA, memoria, recordar } from '../src/memoria.ts';
import { mudar } from '../src/migracion.ts';
import { migrar } from '../src/migrar.ts';
import { aldeasVivas, crearMundo, edad, indexar, nuevaAldea, nuevaPersona } from '../src/mundo.ts';
import { avanzar } from '../src/simulacion.ts';
import { masas } from '../src/mapa.ts';
import { AGUA, MONTANA } from '../src/catalogo.ts';
import type { Aldea, Meta, Mundo, Persona } from '../src/tipos.ts';

const adultos = (m: Mundo, a: Aldea) => m.personas.filter((p) => p.aldea === a.id && edad(m, p) >= 18);

/** Un mundo con una aldea crecida (la de la semilla) para montar situaciones. */
function mundoConAldea(semilla: number, anios = 25): { m: Mundo; a: Aldea } {
  const m = crearMundo(semilla);
  avanzar(m, anios * DIAS_ANIO);
  const a = aldeasVivas(m).sort((x, y) => adultos(m, y).length - adultos(m, x).length)[0];
  return { m, a };
}

/** Una casilla de tierra firme en la misma tierra que la aldea, a esa distancia. */
function sitioCerca(m: Mundo, a: Aldea, min: number, max: number): [number, number] {
  const { masa } = masas(m);
  const k = masa[a.y * m.ancho + a.x];
  for (let r = min; r <= max; r++) {
    for (let g = 0; g < 32; g++) {
      const x = Math.round(a.x + Math.cos((g / 32) * Math.PI * 2) * r);
      const y = Math.round(a.y + Math.sin((g / 32) * Math.PI * 2) * r);
      if (x < 0 || y < 0 || x >= m.ancho || y >= m.alto) continue;
      const i = y * m.ancho + x;
      if (masa[i] === k && m.terreno[i] !== AGUA && m.terreno[i] !== MONTANA) return [x, y];
    }
  }
  throw new Error('no hay sitio cerca');
}

/** Repasa la meta de todos los adultos de una aldea y cuenta cuántos persiguen cada cosa. */
function repasar(m: Mundo, a: Aldea): Record<string, number> {
  const ix = indexar(m);
  const gente = ix.porAldea.get(a.id) ?? [];
  const pan = panorama(m, a, gente);
  const cuenta: Record<string, number> = {};
  for (const p of gente) {
    if (edad(m, p) < 18) continue;
    p.meta = null;
    revisarMeta(m, p, a, gente, pan, ix);
    const k = (p.meta as Meta | null | undefined)?.tipo ?? '-';
    cuenta[k] = (cuenta[k] ?? 0) + 1;
  }
  return cuenta;
}

test('el carácter pesa: el prudente caza menos cuando rondan fieras y el paciente aguanta en el campo', () => {
  const { m, a } = mundoConAldea(4, 5);
  const [p] = adultos(m, a);
  const prudente: Persona = { ...p, genes: { ...p.genes, prudencia: 0.9, paciencia: 0.9 }, meta: null, recuerdos: [] };
  const temerario: Persona = { ...p, genes: { ...p.genes, prudencia: 0.1, paciencia: 0.1 }, meta: null, recuerdos: [] };
  assert.ok(sesgo(m, prudente, 'cazar', 0.6) < sesgo(m, temerario, 'cazar', 0.6) * 0.6);
  assert.ok(sesgo(m, prudente, 'vigilar', 0.6) > sesgo(m, temerario, 'vigilar', 0.6));
  assert.ok(sesgo(m, prudente, 'cultivar', 0) > sesgo(m, temerario, 'cultivar', 0));
  // Tras un ataque de lobos, hasta el temerario se lo piensa.
  recordar(m, temerario, 'fieras', 'lobos', 0.9);
  assert.ok(sesgo(m, temerario, 'cazar', 0.6) < 1.24 * 0.7);
});

test('las metas cambian con las circunstancias: con hambre, sobrevivir; con abundancia, otras cosas', () => {
  const { m, a } = mundoConAldea(6);
  // Abundancia: graneros llenos, todos bien comidos.
  for (const k of Object.keys(a.despensa)) a.despensa[k] = 0;
  a.despensa.cereal = 20000;
  for (const p of m.personas) p.reservas = 7.5;
  const bien = repasar(m, a);
  assert.equal(bien.sobrevivir ?? 0, 0, JSON.stringify(bien));
  assert.ok(Object.keys(bien).filter((k) => k !== '-').length >= 2, `metas variadas en la abundancia: ${JSON.stringify(bien)}`);
  // Hambre: despensa vacía y todos con el estómago vacío.
  for (const k of Object.keys(a.despensa)) a.despensa[k] = 0;
  for (const p of m.personas) p.reservas = 1;
  const mal = repasar(m, a);
  const n = adultos(m, a).length;
  assert.ok((mal.sobrevivir ?? 0) > n * 0.5, `con hambre, casi todos piensan en comer: ${JSON.stringify(mal)}`);
});

test('quien no cabe y pasa hambre busca otra aldea mejor que conoce; al irse, cambian las dos aldeas', () => {
  const { m, a } = mundoConAldea(6);
  // Aquí no caben (sin casas) y no hay comida; a 12 casillas hay otra aldea próspera y conocida.
  a.edificios = a.edificios.filter((e) => !['choza', 'casa', 'casapiedra', 'casatejas'].includes(e.tipo));
  for (const k of Object.keys(a.despensa)) a.despensa[k] = 0;
  for (const p of m.personas) if (p.aldea === a.id) p.reservas = 2;
  const [bx, by] = sitioCerca(m, a, 10, 16);
  const b = nuevaAldea(m, bx, by, 'Fundadora', null);
  b.despensa.cereal = 30000;
  for (let k = 0; k < 6; k++) b.edificios.push({ tipo: 'casa', x: b.x + k - 3, y: b.y + 2 });
  for (let k = 0; k < 4; k++) nuevaPersona(m, { aldea: b, nace: m.t - 25 * DIAS_ANIO });
  m.contactos.push(`${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`);
  for (const p of adultos(m, a)) p.genes.lealtad = 0.1;
  const metas = repasar(m, a);
  assert.ok((metas.emigrar ?? 0) > 0, `alguien quiere irse: ${JSON.stringify(metas)}`);
  const quien = m.personas.find((p) => (p.meta as Meta | null | undefined)?.tipo === 'emigrar')!;
  assert.equal(quien.meta!.ref, b.id);
  assert.match(quien.meta!.motivo, /Quiere irse a/);
  // Se va con su familia: la aldea de origen pierde gente y la de destino la gana.
  const antesA = m.personas.filter((p) => p.aldea === a.id).length;
  const antesB = m.personas.filter((p) => p.aldea === b.id).length;
  const ix = indexar(m);
  const familia = mudar(m, ix, quien, a, b);
  assert.equal(m.personas.filter((p) => p.aldea === a.id).length, antesA - familia.length);
  assert.equal(m.personas.filter((p) => p.aldea === b.id).length, antesB + familia.length);
  for (const s of quien.saberes) assert.ok(b.conocidos.includes(s), 'lo que saben llega con ellos');
  // No llegan de golpe: van andando y tardan días.
  assert.ok(quien.mudanza && quien.mudanza.dias >= 2);
  assert.ok(m.cronica.some((s) => s.tipo === 'migracion' && s.texto.includes(quien.nombre)));
  avanzar(m, quien.mudanza.dias + 1);
  const llegado = m.personas.find((p) => p.id === quien.id);
  if (llegado) {
    assert.equal(llegado.mudanza, undefined);
    assert.deepEqual([llegado.x, llegado.y].map((v, i) => Math.abs(v - [b.x, b.y][i]) <= 6), [true, true]);
  }
});

test('la muerte en un asalto deja agravio a los suyos y empuja a vengarse', () => {
  const { m, a } = mundoConAldea(6);
  const [ex, ey] = sitioCerca(m, a, 12, 20);
  const enemiga = nuevaAldea(m, ex, ey, 'Enemigo', null);
  for (let k = 0; k < 4; k++) nuevaPersona(m, { aldea: enemiga, nace: m.t - 25 * DIAS_ANIO });
  const casados = adultos(m, a).filter((p) => p.pareja !== null);
  assert.ok(casados.length > 0);
  const muerto = casados[0];
  const viuda = m.personas.find((p) => p.id === muerto.pareja)!;
  viuda.genes.lealtad = 0.95;
  viuda.genes.agresividad = 0.95;
  viuda.genes.ambicion = 0.5;
  muerto.muerto = 'combate';
  muerto.porAldea = enemiga.id;
  avanzar(m, 1);
  assert.ok(memoria(m, viuda, 'agravio', enemiga.id) > 0.5, JSON.stringify(viuda.recuerdos));
  assert.ok(viuda.vida?.some((h) => h[1] === 'enviuda' && h[2] === muerto.nombre));
  const ix = indexar(m);
  const gente = ix.porAldea.get(a.id) ?? [];
  viuda.meta = null;
  revisarMeta(m, viuda, a, gente, panorama(m, a, gente), ix);
  const meta = viuda.meta as Meta | null | undefined;
  assert.equal(meta?.tipo, 'vengar', JSON.stringify(meta));
  assert.equal(meta?.ref, enemiga.id);
});

test('tras 60 años: memorias y lazos acotados, nadie en una aldea inexistente, nada negativo, ids únicos', () => {
  const m = crearMundo(5);
  avanzar(m, 60 * DIAS_ANIO);
  const ids = new Set<number>();
  const vivas = new Set(m.aldeas.filter((a) => a.abandonada === null).map((a) => a.id));
  let conMeta = 0;
  let conLazos = 0;
  for (const p of m.personas) {
    assert.ok(!ids.has(p.id), `id repetido ${p.id}`);
    ids.add(p.id);
    assert.ok(vivas.has(p.aldea), `${p.nombre} vive en una aldea que no existe`);
    assert.ok((p.recuerdos?.length ?? 0) <= MAX_RECUERDOS);
    assert.ok((p.lazos?.length ?? 0) <= MAX_LAZOS);
    assert.ok((p.vida?.length ?? 0) <= MAX_VIDA);
    for (const [, v] of p.lazos ?? []) assert.ok(v >= -1 && v <= 1);
    if (p.meta) conMeta++;
    if (p.lazos?.length) conLazos++;
    assert.equal(p.muerto, undefined);
  }
  for (const a of m.aldeas) for (const [k, v] of Object.entries(a.despensa)) assert.ok(v >= -0.01, `${a.nombre}: ${k} = ${v}`);
  assert.ok(conMeta > 0 && conLazos > m.personas.length * 0.5, 'la gente tiene metas y lazos');
});

test('un mundo de la versión 4 se pone al día: cada cual recibe los rasgos nuevos y sigue viviendo', () => {
  const m = crearMundo(9);
  avanzar(m, 3 * DIAS_ANIO);
  const viejo = JSON.parse(JSON.stringify(m)) as Mundo;
  viejo.version = 4;
  for (const p of viejo.personas) {
    const g = p.genes as unknown as Record<string, number>;
    for (const k of ['ambicion', 'prudencia', 'generosidad', 'lealtad', 'paciencia']) delete g[k];
    delete p.meta;
    delete p.lazos;
    delete p.recuerdos;
    delete p.vida;
    delete p.practica;
  }
  const nuevo = migrar(viejo);
  for (const p of nuevo.personas) for (const k of ['ambicion', 'prudencia', 'generosidad', 'lealtad', 'paciencia'] as const) assert.ok(p.genes[k] > 0 && p.genes[k] < 1);
  avanzar(nuevo, 2 * DIAS_ANIO);
  assert.ok(nuevo.personas.length > 0);
});
