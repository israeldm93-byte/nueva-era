// Economía entre aldeas: perfiles que salen del entorno, reservas que frenan la producción
// inútil, excedentes que no tocan lo esencial y mercaderes que llevan bienes de verdad.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { anomalias, olvidarAnomalias } from '../src/anomalias.ts';
import { fijarAzar } from '../src/azar.ts';
import { AGUA, BOSQUE, COLINA, RIO } from '../src/catalogo.ts';
import { CAMINO, caminosDe, linea, tocarCaminos } from '../src/caminos.ts';
import { comidaTotal, contexto, necesidad } from '../src/economia.ts';
import { comprobar } from '../src/invariantes.ts';
import { balance, despachar, mercados, sectores, tratar } from '../src/mercaderes.ts';
import { migrar } from '../src/migrar.ts';
import { crearMundo, edad, indexar, nuevaAldea, nuevaPersona } from '../src/mundo.ts';
import { avanzar } from '../src/simulacion.ts';
import type { Aldea, Mundo } from '../src/tipos.ts';
import { viajes } from '../src/viajes.ts';

/** Dos aldeas en la misma tierra, a unas 12 casillas, que se conocen. */
function dosAldeas(): { m: Mundo; a: Aldea; b: Aldea } {
  const m = crearMundo(5);
  const a = m.aldeas[0];
  for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1]]) {
    const x = a.x + dx * 12;
    const y = a.y + dy * 12;
    if (linea(a.x, a.y, x, y).every(([lx, ly]) => ![AGUA, RIO].includes(m.terreno[ly * m.ancho + lx]))) {
      const b = nuevaAldea(m, x, y, 'Vecina', null);
      for (let k = 0; k < 10; k++) nuevaPersona(m, { aldea: b, nace: m.t - (20 + k) * 120 });
      m.contactos.push(`${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`);
      // Cada una tiene una obra pendiente que pide lo que a la otra le sobra.
      a.despensa = { cereal: 3000, madera: 2, piedra: 200 };
      b.despensa = { cereal: 3000, madera: 300, piedra: 2 };
      a.obra = { tipo: 'corral', x: a.x + 1, y: a.y, progreso: 0, pagada: false, desde: m.t };
      b.obra = { tipo: 'plaza', x: b.x, y: b.y, progreso: 0, pagada: false, desde: m.t };
      for (const p of m.personas) p.reservas = 6;
      return { m, a, b };
    }
  }
  throw new Error('sin sitio');
}

const gente = (m: Mundo, a: Aldea) => m.personas.filter((p) => p.aldea === a.id);

test('cada aldea se dedica a lo que su entorno da (y a lo que otros le piden)', () => {
  const perfilEn = (terreno: number): Record<string, number> => {
    const m = crearMundo(5);
    const a = m.aldeas[0];
    for (let y = a.y - 6; y <= a.y + 6; y++) {
      for (let x = a.x - 6; x <= a.x + 6; x++) {
        const i = y * m.ancho + x;
        if ([AGUA, RIO].includes(m.terreno[i]) || (x === a.x && y === a.y)) continue;
        m.terreno[i] = terreno;
        m.recursos.madera[i] = terreno === BOSQUE ? 20 : 0;
        m.recursos.piedra[i] = terreno === COLINA ? 25 : 0;
      }
    }
    a.despensa = { cereal: 3000 };
    for (let mes = 0; mes < 12; mes++) {
      a.encargos = { madera: 300, piedra: 300 };
      avanzar(m, 30);
    }
    return { ...(Object.fromEntries(sectores(a)) as Record<string, number>), madera: a.despensa.madera ?? 0, piedra: a.despensa.piedra ?? 0 };
  };
  const bosque = perfilEn(BOSQUE);
  const roca = perfilEn(COLINA);
  // Con los mismos encargos, cada una saca más de lo que su entorno da.
  assert.ok(bosque.madera > roca.madera, `en el bosque, más madera (${bosque.madera} frente a ${roca.madera})`);
  assert.ok(roca.piedra > bosque.piedra, `entre colinas, más piedra (${roca.piedra} frente a ${bosque.piedra})`);
  assert.ok((roca.picar ?? 0) > (bosque.picar ?? 0), `entre colinas, más jornadas picando piedra (${roca.picar} frente a ${bosque.picar})`);
});

test('con reservas de sobra, producir más comida pierde prioridad (salvo que otros la pidan)', () => {
  const { m, a } = dosAldeas();
  const g = gente(m, a);
  const consumo = g.reduce((s, p) => s + necesidad(m, p), 0);
  a.despensa.cereal = (consumo * 100) / 0.6;
  const normal = contexto(m, a, g, 1).precio.comida;
  a.despensa.cereal = (consumo * 900) / 0.6;
  const lleno = contexto(m, a, g, 1).precio.comida;
  assert.ok(lleno < normal, `con graneros para años, menos prisa por la comida (${lleno} frente a ${normal})`);
  // Si otras aldeas piden más de lo que ya sobra, producir más vuelve a tener sentido.
  a.despensa.cereal = (consumo * 400) / 0.6;
  const sinPedir = contexto(m, a, g, 1).precio.comida;
  a.encargos = { comida: consumo * 400 };
  assert.ok(contexto(m, a, g, 1).precio.comida > sinPedir, 'con encargos que no se cubren con lo que sobra, sube');
});

test('el excedente es solo lo que pasa de la reserva: lo esencial no se ofrece', () => {
  const { m, a } = dosAldeas();
  const g = gente(m, a);
  a.despensa.piedra = 100;
  const { sobra, falta } = balance(m, a, g, 1);
  assert.ok(sobra.piedra > 0 && sobra.piedra <= 100 - 12, `sobra piedra, pero no toda (${sobra.piedra})`);
  a.despensa.piedra = 3;
  assert.equal(balance(m, a, g, 1).sobra.piedra, undefined);
  assert.ok(balance(m, a, g, 1).falta.piedra > 0, 'y si no llega, le falta');
  // De la comida, solo lo que pasa de medio año de reservas.
  const consumo = g.reduce((s, p) => s + necesidad(m, p), 0);
  a.despensa.cereal = (consumo * 400) / 0.6;
  const s = balance(m, a, g, 1).sobra;
  const queda = comidaTotal({ ...a, despensa: { ...a.despensa, cereal: a.despensa.cereal - (s.cereal ?? 0) } });
  assert.ok(queda >= consumo * 180 - 1, 'tras dar lo que sobra, quedan seis meses de comida');
  assert.equal(falta.comida, undefined);
});

test('solo se comercia si a una le sobra lo que a la otra le falta (y la otra puede dar algo a cambio)', () => {
  const { m, a, b } = dosAldeas();
  const t = tratar(m, a, gente(m, a), b, gente(m, b), 1);
  assert.ok(t && t.lleva.piedra > 0 && t.trae.madera > 0, 'piedra por madera');
  b.obra = null;
  assert.equal(tratar(m, a, gente(m, a), b, gente(m, b), 1), null, 'si a la otra no le falta (casi) nada de lo que sobra, no hay viaje');
  b.obra = { tipo: 'plaza', x: b.x, y: b.y, progreso: 0, pagada: false, desde: m.t };
  b.despensa.piedra = 2;
  a.despensa.piedra = 10;
  assert.equal(tratar(m, a, gente(m, a), b, gente(m, b), 1), null, 'sin excedente, tampoco');
});

test('las mercancías salen de una despensa y llegan a la otra, sin aparecer de la nada ni duplicarse', () => {
  const { m, a, b } = dosAldeas();
  const t = tratar(m, a, gente(m, a), b, gente(m, b), 1)!;
  const total = (k: string) => (a.despensa[k] ?? 0) + (b.despensa[k] ?? 0) + m.personas.reduce((s, p) => s + (p.viaje?.carga?.[k] ?? 0), 0);
  const antes = { piedra: total('piedra'), madera: total('madera') };
  const piedraB = b.despensa.piedra ?? 0;
  const mercader = gente(m, a).find((p) => edad(m, p) >= 18)!;
  despachar(m, mercader, a, b, t);
  assert.equal(a.despensa.piedra, 200 - t.lleva.piedra, 'sale de la despensa al partir');
  a.obra = null; // (la obra no se paga durante la prueba: solo se mira el viaje)
  let llego = false;
  for (let d = 0; d < 80 && mercader.viaje; d++) {
    m.t++;
    viajes(m, indexar(m));
    assert.ok(Math.abs(total('piedra') - antes.piedra) < 0.05 && Math.abs(total('madera') - antes.madera) < 0.05, 'nada aparece ni se pierde por el camino');
    if (!llego && mercader.viaje?.fase === 'estancia') {
      llego = true;
      assert.ok(Math.abs((b.despensa.piedra ?? 0) - (piedraB + t.lleva.piedra)) < 0.05, 'al llegar, entrega');
    }
  }
  assert.ok(llego && !mercader.viaje, 'ha ido y ha vuelto');
  assert.ok((a.despensa.madera ?? 0) > 2, 'y ha traído madera');
  assert.ok(a.balanza?.exporta.piedra && a.balanza?.importa.madera);
});

test('un camino abarata el comercio cuando la ruta lo aprovecha', () => {
  const { m, a, b } = dosAldeas();
  const sin = tratar(m, a, gente(m, a), b, gente(m, b), 1)!;
  for (const [x, y] of linea(a.x, a.y, b.x, b.y)) caminosDe(m)[y * m.ancho + x] = CAMINO;
  tocarCaminos(m);
  const con = tratar(m, a, gente(m, a), b, gente(m, b), 1)!;
  assert.ok(con.dias < sin.dias && con.coste < sin.coste, `por camino: ${con.dias} días frente a ${sin.dias}`);
});

test('guardar y cargar con un mercader de camino conserva la carga y el trato', () => {
  const { m, a, b } = dosAldeas();
  const t = tratar(m, a, gente(m, a), b, gente(m, b), 1)!;
  despachar(m, gente(m, a).find((p) => edad(m, p) >= 18)!, a, b, t);
  avanzar(m, 3);
  assert.ok(m.personas.some((p) => p.viaje?.carga?.piedra));
  const s = JSON.stringify(m);
  assert.equal(JSON.stringify(migrar(JSON.parse(s) as Mundo)), s, 'se carga tal cual');
  const seguido = migrar(JSON.parse(s) as Mundo);
  avanzar(seguido, 40);
  let partido = migrar(JSON.parse(s) as Mundo);
  avanzar(partido, 11);
  partido = migrar(JSON.parse(JSON.stringify(partido)) as Mundo);
  avanzar(partido, 29);
  assert.equal(JSON.stringify(partido), JSON.stringify(seguido));
});

test('años de comercio sin valores rotos, sin ir y venir con lo mismo y sin pasar hambre', () => {
  const { m, a, b } = dosAldeas();
  // Que no puedan resolverlo por su cuenta: sin bosque cerca de una ni piedra cerca de la otra.
  for (let y = 0; y < m.alto; y++) {
    for (let x = 0; x < m.ancho; x++) {
      const i = y * m.ancho + x;
      if (Math.hypot(x - a.x, y - a.y) < 14) m.recursos.madera[i] = 0;
      if (Math.hypot(x - b.x, y - b.y) < 14) for (const k of ['piedra', 'malaquita', 'casiterita', 'hematites']) m.recursos[k][i] = 0;
    }
  }
  // Una necesidad que dura: la vecina sabe fundir (quiere minerales) y no tiene vetas cerca;
  // a la primera le sobra malaquita.
  for (const p of gente(m, b)) p.saberes.push('fuego', 'vasija', 'horno');
  b.conocidos.push('fuego', 'vasija', 'horno');
  a.despensa.malaquita = 200;
  olvidarAnomalias();
  fijarAzar(3);
  // (La balanza se va olvidando: se mira el comercio de todos estos años, no solo el del final.)
  let comerciado = 0;
  for (let mes = 0; mes < 36; mes++) {
    avanzar(m, 30);
    if (mes % 6 === 0) mercados(m, indexar(m));
    comerciado = Math.max(comerciado, (a.balanza?.exporta.malaquita ?? 0) + (a.balanza?.exporta.piedra ?? 0) + (b.balanza?.exporta.madera ?? 0));
  }
  assert.deepEqual(comprobar(m), []);
  assert.deepEqual(anomalias(), []);
  for (const x of [a, b]) {
    for (const k of Object.keys(x.balanza?.exporta ?? {})) assert.ok(!(x.balanza?.importa[k] ?? 0), `${x.nombre} no compra y vende ${k} a la vez`);
    const c = gente(m, x).reduce((s, p) => s + necesidad(m, p), 0);
    assert.ok(comidaTotal(x) / Math.max(1, c) > 60, `${x.nombre} sigue bien de comida`);
  }
  assert.ok(comerciado > 0, 'ha habido comercio');
});
