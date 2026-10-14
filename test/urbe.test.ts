// Urbanismo: el plano de cada aldea (calles, solares, barrios) y los edificios que crecen en
// él: separados, con su entrada a la calle, sobre terreno posible, construidos poco a poco con
// sus materiales y su trabajo, y mejorados en su sitio en vez de repetidos al lado.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AGUA, EDIFICIO, MEJORAS, MONTANA, RIO, USO_URBANO, mejoraDe, validarCatalogo } from '../src/catalogo.ts';
import { construir, contexto, mantener, planificar, plazas } from '../src/economia.ts';
import { comprobar } from '../src/invariantes.ts';
import { migrar } from '../src/migrar.ts';
import { crearMundo, edad, estacionDe } from '../src/mundo.ts';
import { avanzar } from '../src/simulacion.ts';
import { desnivel } from '../src/tierra.ts';
import type { Aldea, Mundo } from '../src/tipos.ts';
import { CUESTA_SOLAR, callesEnUso, comprobarPlano, enPlaza, frenteDe, resumenPlano, solarPara, suelo, trazarPlano } from '../src/urbe.ts';

const gente = (m: Mundo, a: Aldea) => m.personas.filter((p) => p.aldea === a.id && !p.muerto);
const cheb = (m: Mundo, i: number, j: number) => Math.max(Math.abs((i % m.ancho) - (j % m.ancho)), Math.abs(Math.floor(i / m.ancho) - Math.floor(j / m.ancho)));

/** Un mundo con 40 años de historia (se calcula una vez y lo comparten varias pruebas). */
let historia: Mundo | null = null;
function conHistoria(): Mundo {
  if (!historia) {
    historia = crearMundo(5);
    avanzar(historia, 40 * 120);
  }
  return historia;
}
const conPlano = (m: Mundo) => m.aldeas.filter((a) => a.abandonada === null && a.urbe && a.urbe.parcelas.length);

/** Una aldea que sabe construir de todo, con la despensa llena, sin plano todavía. */
function aldea(): { m: Mundo; a: Aldea } {
  const m = crearMundo(5);
  const a = m.aldeas[0];
  const saberes = ['fuego', 'choza', 'adobe', 'canteria', 'teja', 'horno', 'vasija', 'numeros', 'escritura', 'hacha', 'cuerda', 'corral', 'campo'];
  a.conocidos = saberes.slice();
  for (const p of m.personas) p.saberes = saberes.slice();
  a.despensa = { cereal: 4000, madera: 400, fibra: 200, arcilla: 400, piedra: 400 };
  for (const p of m.personas) p.reservas = 6;
  // (Con su hoguera ya encendida, que es lo primero que harían.)
  if (!a.edificios.some((e) => e.tipo === 'hoguera')) a.edificios.push({ tipo: 'hoguera', x: a.x, y: a.y });
  return { m, a };
}

/** Levanta un edificio en el solar que le toque, de golpe (para probar el plano sin esperar años). */
function levantar(m: Mundo, a: Aldea, tipo: string) {
  const p = solarPara(m, a, tipo, [])!;
  assert.ok(p, `hay solar para ${tipo}`);
  a.edificios.push({ tipo, x: p.i % m.ancho, y: Math.floor(p.i / m.ancho), frente: frenteDe(m, p) });
  return p;
}

test('el catálogo urbano se valida (usos y mejoras con cantidades posibles)', () => {
  assert.deepEqual(validarCatalogo(), []);
  for (const k of Object.keys(USO_URBANO)) assert.ok(EDIFICIO[k]);
  for (const x of MEJORAS) assert.ok(EDIFICIO[x.tipo] && x.nivel === 2);
});

test('las construcciones no se solapan ni tapan sus entradas, y cada una da a su calle', () => {
  const m = conHistoria();
  const aldeas = conPlano(m);
  assert.ok(aldeas.length >= 2, 'las aldeas han trazado su plano');
  let conFrente = 0;
  for (const a of aldeas) {
    assert.deepEqual(comprobarPlano(m, a), [], a.nombre);
    const calles = new Set(a.urbe!.calles.flatMap((c) => c.casillas));
    const s = suelo(m);
    for (const e of a.edificios) {
      if (!e.frente) continue;
      conFrente++;
      const i = e.y * m.ancho + e.x;
      const entrada = i + e.frente[1] * m.ancho + e.frente[0];
      assert.ok(calles.has(entrada), `${e.tipo} de ${a.nombre}: su entrada es una calle`);
      assert.ok(!s.ocupado.has(entrada), 'y está libre');
    }
  }
  assert.ok(conFrente >= 10, `muchos edificios dan a una calle (${conFrente})`);
  assert.deepEqual(comprobar(m), []);
});

test('los solares respetan el terreno y la separación; las calles no suben cuestas imposibles', () => {
  const m = conHistoria();
  for (const a of conPlano(m)) {
    const u = a.urbe!;
    for (const p of u.parcelas) {
      const t = m.terreno[p.i];
      assert.ok(t !== AGUA && t !== RIO && t !== MONTANA, 'nunca en el agua ni en la montaña');
      assert.ok(desnivel(m, p.i) <= CUESTA_SOLAR, 'ni en una ladera imposible');
      assert.ok(!enPlaza(m, a, p.i), 'ni en la plaza');
      for (const q of u.parcelas) if (q !== p) assert.ok(cheb(m, p.i, q.i) >= 2, 'con una casilla libre en medio');
    }
    for (const c of u.calles) {
      for (let k = 1; k < c.casillas.length; k++) assert.ok(Math.abs(m.relieve[c.casillas[k]] - m.relieve[c.casillas[k - 1]]) <= 10);
    }
  }
});

test('las calles son continuas desde la plaza y el pueblo se reparte por ellas (no es un apelotonamiento)', () => {
  const m = conHistoria();
  for (const a of conPlano(m)) {
    // Desde la plaza se llega por las calles en uso a la entrada de todo lo construido en el plano.
    const uso = callesEnUso(m, a);
    const centro = a.y * m.ancho + a.x;
    const alcanzadas = new Set<number>();
    const cola = [...uso].filter((i) => cheb(m, i, centro) <= 1);
    for (const i of cola) alcanzadas.add(i);
    while (cola.length) {
      const i = cola.pop()!;
      for (const j of uso) if (!alcanzadas.has(j) && cheb(m, i, j) === 1) {
        alcanzadas.add(j);
        cola.push(j);
      }
    }
    assert.equal(alcanzadas.size, uso.size, `${a.nombre}: todas sus calles en uso salen de la plaza`);
    for (const e of a.edificios) if (e.frente) assert.ok(alcanzadas.has((e.y + e.frente[1]) * m.ancho + e.x + e.frente[0]), `${a.nombre}: se llega a ${e.tipo}`);
    // Nada de lo construido en el plano está pegado a otro edificio.
    const casas = a.edificios.filter((e) => e.frente);
    for (const e of casas) for (const f of a.edificios) if (f !== e && f.tipo !== 'campo' && !['cerca', 'empalizada', 'muralla', 'torre', 'calzada', 'plaza', 'puente'].includes(f.tipo)) assert.ok(Math.max(Math.abs(e.x - f.x), Math.abs(e.y - f.y)) >= 2, `${a.nombre}: ${e.tipo} separado de ${f.tipo}`);
  }
  // Al menos una aldea tiene calles en dos direcciones distintas desde la plaza.
  assert.ok(conPlano(m).some((a) => a.urbe!.calles.filter((c) => c.padre < 0).length >= 2));
});

test('cuando no le queda solar, la aldea crece por barrios: calles y ramales nuevos, sin irse lejos de golpe', () => {
  const { m, a } = aldea();
  trazarPlano(m, a);
  const inicio = resumenPlano(m, a);
  const distancias: number[] = [];
  for (let k = 0; k < 24; k++) {
    const p = levantar(m, a, k % 6 === 5 ? 'taller' : 'casatejas');
    distancias.push(Math.hypot((p.i % m.ancho) - a.x, Math.floor(p.i / m.ancho) - a.y));
  }
  const fin = resumenPlano(m, a);
  assert.ok(fin.calles > inicio.calles && fin.solares > inicio.solares, `crece: ${JSON.stringify(inicio)} → ${JSON.stringify(fin)}`);
  // Se llena de dentro afuera: los primeros, cerca; los últimos, más lejos (pero no de golpe).
  const media = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  assert.ok(media(distancias.slice(0, 6)) < media(distancias.slice(-6)), 'de dentro afuera');
  assert.ok(Math.max(...distancias) <= 16, 'sin saltar lejos');
  // Y siempre quedan solares reservados para lo que venga.
  assert.ok(fin.solares - fin.ocupados >= 1, 'con reserva para crecer');
  assert.deepEqual(comprobarPlano(m, a), []);
});

test('cada edificio va donde le conviene: lo público a la plaza, el ganado a las afueras, el almacén junto a los talleres', () => {
  const { m, a } = aldea();
  trazarPlano(m, a);
  for (let k = 0; k < 6; k++) levantar(m, a, 'casatejas');
  const templo = levantar(m, a, 'templo');
  const taller = levantar(m, a, 'taller');
  const almacen = levantar(m, a, 'almacen');
  for (let k = 0; k < 3; k++) levantar(m, a, 'casatejas');
  const corral = levantar(m, a, 'corral');
  const d = (i: number) => Math.hypot((i % m.ancho) - a.x, Math.floor(i / m.ancho) - a.y);
  assert.equal(templo.uso, 'publico', 'el templo, en un solar que da a la plaza');
  assert.ok(d(templo.i) < 4);
  const casas = a.edificios.filter((e) => e.tipo === 'casatejas').map((e) => Math.hypot(e.x - a.x, e.y - a.y));
  assert.ok(d(corral.i) > Math.min(...casas), 'el corral, más afuera que las casas');
  assert.ok(cheb(m, almacen.i, taller.i) <= 6, 'el almacén, cerca del taller');
});

test('una obra se paga con sus materiales y se levanta con trabajo, día a día; la mejora cambia el edificio que hay', () => {
  const { m, a } = aldea();
  const g = gente(m, a);
  a.edificios = a.edificios.filter((e) => !['choza', 'casa', 'casapiedra', 'casatejas'].includes(e.tipo));
  // Hace falta casa: va a un solar del plano, con su puerta a la calle.
  planificar(m, a, g);
  const obra = a.obra!;
  assert.ok(obra && USO_URBANO[obra.tipo] === 'vivienda', `planea una casa (${obra?.tipo})`);
  assert.ok(obra.frente, 'en un solar con calle');
  const coste = EDIFICIO[obra.tipo].coste;
  const antes = { ...a.despensa };
  const c = contexto(m, a, g, estacionDe(m.t));
  const obrero = g.find((p) => edad(m, p) >= 16)!;
  construir(m, obrero, c);
  for (const [k, v] of Object.entries(coste)) assert.equal(a.despensa[k], antes[k] - v, `se paga ${k} justo`);
  let dias = 1;
  while (a.obra && dias < 200) {
    construir(m, obrero, c);
    dias++;
  }
  assert.ok(dias >= EDIFICIO[obra.tipo].trabajo / 1.6, `lleva días de trabajo (${dias})`);
  const casa = a.edificios.find((e) => e.x === obra.x && e.y === obra.y && e.tipo === obra.tipo)!;
  assert.ok(casa && casa.frente, 'en pie y mirando a su calle');
  // La mejora: misma casa, nivel 2, más plazas, y cuesta lo que dice el catálogo.
  const mj = mejoraDe(casa.tipo, 2)!;
  const plazasAntes = plazas(a);
  const n = a.edificios.length;
  a.obra = { tipo: casa.tipo, x: casa.x, y: casa.y, progreso: 0, pagada: false, desde: m.t, mejora: 2 };
  const antes2 = { ...a.despensa };
  construir(m, obrero, c);
  for (const [k, v] of Object.entries(mj.coste)) assert.equal(a.despensa[k], antes2[k] - v, `la mejora paga ${k} justo`);
  for (let k = 0; a.obra && k < 200; k++) construir(m, obrero, c);
  assert.equal(a.edificios.length, n, 'no aparece otro edificio');
  assert.equal(casa.nivel, 2, 'el mismo, mejorado');
  assert.equal(plazas(a) - plazasAntes, Math.round(EDIFICIO[casa.tipo].aloja! * mj.efecto.aloja!) - EDIFICIO[casa.tipo].aloja!, 'caben más');
  assert.ok(m.cronica.some((x) => x.texto.includes('planta alta')));
  assert.deepEqual(comprobar(m), []);
});

test('un almacén grande conserva mejor la comida (la mejora cambia lo que da, no solo cómo se ve)', () => {
  const perdida = (nivel: number) => {
    const { m, a } = aldea();
    a.edificios.push({ tipo: 'almacen', x: a.x + 3, y: a.y + 3, nivel });
    a.despensa.carne = 1000;
    mantener(m, a, 1, 10);
    return 1000 - a.despensa.carne;
  };
  assert.ok(perdida(2) < perdida(1) * 0.8, `menos pérdida: ${perdida(2)} frente a ${perdida(1)}`);
});

test('una casa del casco viejo se rehace en un solar de las calles nuevas y la vieja se derriba al acabar', () => {
  const { m, a } = aldea();
  const g = gente(m, a);
  a.edificios = a.edificios.filter((e) => !['choza', 'casa', 'casapiedra', 'casatejas'].includes(e.tipo));
  // Una choza vieja, pegada al centro (sin calle), y casas de sobra (no hace falta otra).
  // (Y los campos que ya tiene le bastan: que no se ponga a sembrar.)
  a.conocidos = a.conocidos.filter((k) => k !== 'campo');
  a.edificios.push({ tipo: 'choza', x: a.x + 1, y: a.y });
  for (let k = 0; k < 4; k++) levantar(m, a, 'casatejas');
  for (let k = 0; k < 10 && !(a.obra?.reforma); k++) {
    a.obra = null;
    planificar(m, a, g);
  }
  const obra = a.obra!;
  assert.equal(obra?.reforma, 'choza', 'rehace la choza');
  assert.deepEqual(obra.viejo, [a.x + 1, a.y], 'sabe cuál sustituye');
  assert.ok(obra.frente && (obra.x !== a.x + 1 || obra.y !== a.y), 'en un solar nuevo, con calle');
  obra.pagada = true;
  obra.progreso = 0.999;
  const c = contexto(m, a, g, estacionDe(m.t));
  construir(m, g.find((p) => edad(m, p) >= 16)!, c);
  assert.ok(!a.edificios.some((e) => e.tipo === 'choza'), 'la vieja ya no está');
  assert.ok(a.edificios.some((e) => e.x === obra.x && e.y === obra.y && e.tipo === obra.tipo), 'la nueva, sí');
  assert.ok(a.urbe!.patios.includes(a.y * m.ancho + a.x + 1), 'donde estaba queda un patio');
  assert.deepEqual(comprobar(m), []);
});

test('guardar y cargar conserva el plano, los niveles y las obras en curso (también una mejora a medias)', () => {
  const m = structuredClone(conHistoria());
  const a = conPlano(m)[0];
  const casa = a.edificios.find((e) => mejoraDe(e.tipo, 2) && (e.nivel ?? 1) < 2) ?? a.edificios.find((e) => e.frente)!;
  if (mejoraDe(casa.tipo, 2)) a.obra = { tipo: casa.tipo, x: casa.x, y: casa.y, progreso: 0.4, pagada: true, desde: m.t, mejora: 2 };
  const s = JSON.stringify(m);
  assert.equal(JSON.stringify(migrar(JSON.parse(s) as Mundo)), s, 'se carga tal cual');
  const seguido = migrar(JSON.parse(s) as Mundo);
  avanzar(seguido, 50);
  let partido = migrar(JSON.parse(s) as Mundo);
  avanzar(partido, 21);
  partido = migrar(JSON.parse(JSON.stringify(partido)) as Mundo);
  avanzar(partido, 29);
  assert.equal(JSON.stringify(partido), JSON.stringify(seguido));
  // Un plano roto en el guardado: se olvida (y se volverá a trazar), sin romper nada.
  const roto = JSON.parse(s) as Mundo;
  const ar = roto.aldeas.find((x) => x.id === a.id)!;
  ar.urbe!.parcelas[0].acceso = -5;
  const arreglado = migrar(roto);
  assert.equal(arreglado.aldeas.find((x) => x.id === a.id)!.urbe, undefined);
  assert.ok(arreglado.reparaciones!.some((r) => r.ruta.endsWith('.urbe')));
  assert.deepEqual(comprobar(arreglado), []);
});

test('los modelos 3D: cada mejora tiene su aspecto, y las piezas no son caras de dibujar', async () => {
  // (La biblioteca de la web, en JavaScript: se carga tal cual, sin tipos.)
  const ruta = '../web/modulos3d.js';
  const { RECETAS, VARIANTES, geometrias, faseObra } = await import(ruta);
  for (const x of MEJORAS) assert.ok((VARIANTES as Set<string>).has(`${x.tipo}-${x.nivel}`), `${x.tipo} nivel ${x.nivel} tiene modelo`);
  const geos = geometrias();
  for (const k of Object.keys(RECETAS as object)) {
    const g = geos[k] as { attributes: { position: { count: number; array: Float32Array } } };
    const tri = g.attributes.position.count / 3;
    assert.ok(tri > 10 && tri < 4000, `${k}: ${tri} triángulos`);
    for (const v of g.attributes.position.array) assert.ok(Number.isFinite(v));
  }
  assert.equal(faseObra({ pagada: false, progreso: 0 }), 'solar');
  assert.equal(faseObra({ pagada: true, progreso: 0.1 }), 'cimientos');
  assert.equal(faseObra({ pagada: true, progreso: 0.5 }), 'armazon');
  assert.equal(faseObra({ pagada: true, progreso: 0.9 }), 'remate');
});
