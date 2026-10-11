// Lo que piensa una aldea y el trato entre aldeas: opiniones coherentes con lo que de
// verdad les falta, y aldeas lejanas (hijas de un cisma) que siguen sabiendo unas de otras.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AGUA, MONTANA, TECNICA } from '../src/catalogo.ts';
import { DIAS_ANIO } from '../src/config.ts';
import { comidaTotal, contexto } from '../src/economia.ts';
import { comprobar } from '../src/invariantes.ts';
import { masas } from '../src/mapa.ts';
import { buscarDestino } from '../src/migracion.ts';
import { migrar } from '../src/migrar.ts';
import { aldeasVivas, crearMundo, edad, indexar, nuevaAldea, nuevaPersona } from '../src/mundo.ts';
import { noche } from '../src/politica.ts';
import { avanzar } from '../src/simulacion.ts';
import { conversar } from '../src/sociedad.ts';
import { diasDeCamino, partir, viajes } from '../src/viajes.ts';
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

// ---------------------------------------------------------------------------------------
// Viajes entre aldeas lejanas emparentadas

/** Una aldea hija, a esa distancia y en la misma tierra, con unos cuantos adultos. */
function hijaLejos(m: Mundo, a: Aldea, min: number, max: number, adultos = 8): Aldea {
  const { masa } = masas(m);
  const k = masa[a.y * m.ancho + a.x];
  for (let r = min; r <= max; r++) {
    for (let g = 0; g < 48; g++) {
      const x = Math.round(a.x + Math.cos((g / 48) * Math.PI * 2) * r);
      const y = Math.round(a.y + Math.sin((g / 48) * Math.PI * 2) * r);
      if (x < 2 || y < 2 || x >= m.ancho - 2 || y >= m.alto - 2) continue;
      const i = y * m.ancho + x;
      if (masa[i] !== k || m.terreno[i] === AGUA || m.terreno[i] === MONTANA) continue;
      const b = nuevaAldea(m, x, y, 'Lejana', a.id);
      b.despensa.cereal = 3000;
      for (let n = 0; n < adultos; n++) nuevaPersona(m, { aldea: b, nace: m.t - (20 + n) * DIAS_ANIO });
      return b;
    }
  }
  throw new Error('no hay sitio');
}

/** Un mundo con su aldea más grande bien comida y una hija lejos. */
function dosAldeas(semilla: number, min = 60, max = 80) {
  const m = crearMundo(semilla);
  avanzar(m, 25 * DIAS_ANIO);
  const a = aldeasVivas(m).sort((x, y) => m.personas.filter((p) => p.aldea === y.id).length - m.personas.filter((p) => p.aldea === x.id).length)[0];
  a.despensa.cereal = (a.despensa.cereal ?? 0) + 5000;
  const b = hijaLejos(m, a, min, max);
  return { m, a, b, d: Math.hypot(a.x - b.x, a.y - b.y) };
}

const viajeros = (m: Mundo, a: Aldea) => m.personas.filter((p) => p.aldea === a.id && edad(m, p) >= 18 && edad(m, p) <= 55 && !p.viaje && !p.mudanza);

test('un viaje de visita: tarda lo que marca la distancia, no trabaja mientras, y lo aprendido allí no llega a casa hasta que vuelve', () => {
  const { m, a, b, d } = dosAldeas(6);
  const ida = diasDeCamino(a, d);
  assert.ok(ida >= 30, `está lejos de verdad: ${ida} días`);
  // Allí saben algo que aquí no (y que los de aquí podrían aprender).
  const lista = viajeros(m, a).slice(0, 6);
  const novedad = Object.values(TECNICA).find((t) => !a.conocidos.includes(t.id) && lista.every((p) => (t.requiere ?? []).every((r) => p.saberes.includes(r))))!;
  assert.ok(novedad, 'hay algo que aprender allí');
  for (const q of m.personas.filter((x) => x.aldea === b.id)) {
    q.saberes.push(novedad.id);
    q.genes.sociabilidad = 1;
  }
  b.conocidos.push(novedad.id);
  let aprendidoFuera = 0;
  for (const p of lista) {
    p.salud = 1;
    const sabia = new Set(p.saberes);
    const conocidos = new Set(a.conocidos);
    partir(m, p, a, b);
    const salida = m.t;
    let llegada = -1;
    let vuelta = -1;
    for (let k = 0; k < 4 * ida && p.viaje; k++) {
      avanzar(m, 1);
      if (!p.viaje || !m.personas.includes(p)) break;
      assert.equal(p.actividad, 'viajar', 'de viaje no trabaja en su aldea');
      if (p.viaje.fase === 'estancia' && llegada < 0) llegada = m.t;
      if (p.viaje.fase === 'vuelta' && vuelta < 0) vuelta = m.t;
      // Lo que aprende allí no está aún en su aldea (salvo que alguien de casa lo descubra solo).
      for (const s of p.saberes) if (!sabia.has(s) && !conocidos.has(s)) assert.ok(!a.conocidos.includes(s) || m.personas.some((q) => q !== p && q.aldea === a.id && q.saberes.includes(s)), `${s} no llega antes que él`);
    }
    if (p.aldea !== a.id || !m.personas.includes(p)) continue; // se casó allí y se quedó (o murió)
    assert.equal(p.viaje, undefined, 'ha vuelto');
    assert.ok(llegada - salida >= ida && llegada - salida <= ida + 2, `llega cuando toca: ${llegada - salida} días (ida ${ida})`);
    assert.ok(vuelta - llegada >= 5, 'pasa unos días allí');
    assert.ok(m.contactos.includes(`${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`), 'desde ahora se conocen');
    const nuevos = p.saberes.filter((s) => !sabia.has(s));
    for (const s of nuevos) assert.ok(a.conocidos.includes(s), `al volver, ${s} ya se sabe en su aldea`);
    aprendidoFuera += nuevos.length;
  }
  assert.ok(m.cronica.some((s) => s.tipo === 'viaje'), 'la crónica lo cuenta');
  assert.ok(aprendidoFuera >= 1 && a.conocidos.includes(novedad.id), `algún viajero trajo ${novedad.nombre} (${aprendidoFuera} saberes traídos)`);
  assert.deepEqual(comprobar(m), []);
});

test('los viajes son raros y tienen condiciones: nunca en invierno ni si en casa falta comida', () => {
  const contar = (preparar: (m: Mundo, a: Aldea) => void, invierno: boolean) => {
    const { m, a } = dosAldeas(6);
    preparar(m, a);
    let salidas = 0;
    const deAqui = (p: { aldea: number }) => p.aldea === a.id;
    const t0 = m.t - (m.t % DIAS_ANIO) + (invierno ? 3 * 30 + 5 : 30 + 5);
    for (let k = 0; k < 3000; k++) {
      m.t = t0 + (k % 20);
      viajes(m, indexar(m));
      for (const p of m.personas) {
        if (p.viaje) {
          if (deAqui(p)) salidas++;
          delete p.viaje;
        }
      }
    }
    return salidas;
  };
  const normal = contar(() => {}, false);
  const sinComida = contar((m, a) => {
    for (const k of Object.keys(a.despensa)) a.despensa[k] = 0;
  }, false);
  const enInvierno = contar(() => {}, true);
  // 3000 días con buen tiempo: la probabilidad diaria es pequeña, pero alguno sale.
  assert.ok(normal >= 1 && normal <= 25, `con buen tiempo y comida, alguno (pocos): ${normal}`);
  assert.equal(sinComida, 0, 'si falta comida, nadie se va tanto tiempo');
  assert.equal(enInvierno, 0, 'en invierno nadie se echa a los caminos');
});

test('guardar y cargar a mitad de un viaje da lo mismo que no parar', () => {
  const { m, a, b } = dosAldeas(6);
  const [p] = viajeros(m, a);
  partir(m, p, a, b);
  const seguido = copiar(m);
  avanzar(seguido, 120);
  let partido = copiar(m);
  avanzar(partido, 37);
  assert.ok(partido.personas.find((q) => q.id === p.id)?.viaje, 'a mitad de camino');
  partido = migrar(JSON.parse(JSON.stringify(partido)) as Mundo);
  avanzar(partido, 83);
  assert.equal(JSON.stringify(partido), JSON.stringify(seguido));
});

test('si en una visita lejana surge una boda, quien se muda va andando (no aparece de golpe en la otra aldea)', () => {
  const { m, a, b, d } = dosAldeas(6);
  const ix = indexar(m);
  const p = viajeros(m, a).find((q) => q.pareja === null) ?? nuevaPersona(m, { aldea: a, nace: m.t - 22 * DIAS_ANIO, sexo: 'H' });
  const q = nuevaPersona(m, { aldea: b, nace: p.nace, sexo: p.sexo === 'H' ? 'M' : 'H' });
  p.pareja = null;
  for (const x of [p, q]) {
    x.genes.sociabilidad = 1;
    x.meta = { tipo: 'familia', desde: m.t, motivo: 'prueba' };
  }
  p.lazos = [[q.id, 0.9]];
  q.lazos = [[p.id, 0.9]];
  // El visitante está allí, en la otra aldea.
  p.x = b.x;
  p.y = b.y;
  const indice = indexar(m);
  for (let k = 0; k < 5000 && p.pareja === null; k++) conversar(m, p, q, a, b, indice);
  assert.equal(p.pareja, q.id, 'se casan');
  void ix;
  if (q.aldea === a.id) {
    // Ella (o él) se va a la aldea lejana del otro: a pie, días y días.
    assert.ok(q.mudanza, 'se muda andando');
    assert.ok(q.mudanza!.dias >= Math.ceil(d / 1.5) - 1, `${q.mudanza!.dias} días de camino`);
    assert.deepEqual([q.x, q.y], [q.mudanza!.desde[0], q.mudanza!.desde[1]], 'aún no ha llegado');
  } else {
    // El visitante se queda allí, donde ya está.
    assert.equal(p.aldea, b.id);
    assert.equal(p.mudanza, undefined);
  }
});

test('a una aldea lejana (más de 70 casillas) solo se plantea irse quien sabe el camino: hace falta que alguien haya viajado allí', () => {
  const { m, a, b } = dosAldeas(6, 80, 100);
  // Aquí no caben y pasan hambre; allí hay comida, casas y familia.
  a.edificios = a.edificios.filter((e) => !['choza', 'casa', 'casapiedra', 'casatejas'].includes(e.tipo));
  for (const k of Object.keys(a.despensa)) a.despensa[k] = 0;
  for (const p of m.personas) if (p.aldea === a.id) p.reservas = 2;
  b.despensa.cereal = 30000;
  for (let k = 0; k < 8; k++) b.edificios.push({ tipo: 'casa', x: b.x + k - 4, y: b.y + 2 });
  const ix = indexar(m);
  const gente = ix.porAldea.get(a.id) ?? [];
  const p = gente.find((q) => edad(m, q) >= 25)!;
  p.genes.lealtad = 0.1;
  const nec = { vivienda: 1, hambre: 0.8, seguridad: 0, pertenencia: 0.3, reconocimiento: 0.2 };
  m.contactos = m.contactos.filter((k) => k !== `${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`);
  assert.equal(buscarDestino(m, p, a, nec, ix), null, 'sin noticias del camino, no');
  m.contactos.push(`${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`);
  assert.equal(buscarDestino(m, p, a, nec, ix)?.aldea.id, b.id, 'con alguien que ya hizo el camino, sí (pagando la distancia)');
});

test('un viaje roto en un guardado (datos rotos o a una aldea que ya no existe) se da por terminado y queda registrado', () => {
  const { m, a, b } = dosAldeas(6);
  const [p, q] = viajeros(m, a);
  partir(m, p, a, b);
  partir(m, q, a, b);
  const roto = JSON.parse(JSON.stringify(m)) as Mundo;
  const rp = roto.personas.find((x) => x.id === p.id)!;
  const rq = roto.personas.find((x) => x.id === q.id)!;
  rp.viaje!.dias = null as unknown as number;
  rq.viaje!.a = 99999;
  const n = migrar(roto);
  assert.equal(n.personas.find((x) => x.id === p.id)!.viaje, undefined);
  assert.equal(n.personas.find((x) => x.id === q.id)!.viaje, undefined);
  assert.equal(n.reparaciones?.filter((r) => r.ruta.endsWith('.viaje')).length, 2);
  assert.deepEqual(comprobar(n), []);
});
