// Casos límite de la integridad del mundo: poblaciones vacías, cantidades fraccionarias o
// insuficientes, despensas sin un material (o sin despensa), referencias rotas en un
// guardado, animales que se cuentan en enteros y remedios que se gastan al usarse. Y que
// guardar, recargar y seguir da exactamente lo mismo que no parar.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { anomalias, olvidarAnomalias } from '../src/anomalias.ts';
import { DIAS_ANIO } from '../src/config.ts';
import { acercar, apuntar, capacidadCorral, comer, comidaTotal, construir, contexto, guardar, mantener, RITMO_CRIA } from '../src/economia.ts';
import { vidas } from '../src/individuo.ts';
import { comprobar } from '../src/invariantes.ts';
import { ajustarLazo, enfriar, lazo } from '../src/memoria.ts';
import { convivir, noche, relacion } from '../src/politica.ts';
import { migrar } from '../src/migrar.ts';
import { aldeasVivas, crearMundo, indexar, nuevaAldea, nuevaPersona } from '../src/mundo.ts';
import { avanzar } from '../src/simulacion.ts';
import { comerciar, salud } from '../src/sociedad.ts';
import type { Edificio, Mundo } from '../src/tipos.ts';

const recargar = (m: Mundo): Mundo => migrar(JSON.parse(JSON.stringify(m)) as Mundo);

test('sin gente no se divide por cero: contexto, comida, salud y comercio de una aldea vacía', () => {
  const m = crearMundo(11);
  avanzar(m, DIAS_ANIO);
  const [a] = aldeasVivas(m);
  olvidarAnomalias();
  const c = contexto(m, a, [], 0);
  for (const [k, v] of Object.entries(c.precio)) assert.ok(Number.isFinite(v), `precio de ${k} = ${v}`);
  assert.ok(Number.isFinite(c.escasez));
  comer(m, a, []);
  salud(m, a, [], 3, false);
  const otra = { ...a, id: -1, despensa: { cereal: 10 } };
  comerciar(a, otra, 0, 0);
  comerciar(otra, a, 3, 0);
  assert.deepEqual(comprobar(m), []);
  assert.deepEqual(anomalias(), []);
});

test('cantidades fraccionarias, insuficientes o ausentes nunca dejan una despensa negativa ni rota', () => {
  const m = crearMundo(11);
  avanzar(m, DIAS_ANIO);
  const [a] = aldeasVivas(m);
  const gente = m.personas.filter((p) => p.aldea === a.id);
  for (const k of Object.keys(a.despensa)) a.despensa[k] = 0;
  // Migajas: menos de lo que nadie necesita.
  a.despensa.cereal = 0.004;
  a.despensa.carne = 0.37;
  delete a.despensa.pescado;
  olvidarAnomalias();
  comer(m, a, gente);
  for (const [k, v] of Object.entries(a.despensa)) assert.ok(v >= 0 && Number.isFinite(v), `${k} = ${v}`);
  assert.equal(comidaTotal(a), 0, 'se lo han comido todo, sin pasarse');
  for (const p of gente) assert.ok(Number.isFinite(p.reservas) && p.reservas >= 0);
  // Un material que no existe en la despensa cuenta como cero.
  guardar(a, 'lana', 0.25);
  assert.equal(a.despensa.lana, 0.25);
  // Gastar más de lo que hay no se trunca en silencio: se rechaza y queda registrado.
  apuntar(a, 'lana', a.despensa.lana - 3);
  assert.equal(a.despensa.lana, 0.25, 'la cuenta rota no se escribe');
  assert.equal(anomalias().length, 1);
  assert.match(anomalias()[0], /lana/);
  // Lo que es solo redondeo (−0,004) sí es cero.
  olvidarAnomalias();
  apuntar(a, 'lana', -0.004);
  assert.equal(a.despensa.lana, 0);
  assert.deepEqual(anomalias(), []);
  // Y guardar algo no finito tampoco entra.
  guardar(a, 'piedra', NaN);
  guardar(a, 'piedra', Infinity);
  assert.equal(a.despensa.piedra, 0);
  assert.equal(anomalias().length, 2);
});

/** Una aldea con un solo corral (sin granja ni establo) para ver criar a un rebaño. */
function conCorral(especie: string, animales: number) {
  const m = crearMundo(11);
  avanzar(m, 2 * DIAS_ANIO);
  const [a] = aldeasVivas(m);
  a.edificios = a.edificios.filter((e) => !['granja', 'establo', 'corral', 'gallinero'].includes(e.tipo));
  a.despensa.cria = 0;
  const corral: Edificio = { tipo: especie === 'gallina' ? 'gallinero' : 'corral', x: a.x + 2, y: a.y + 2, animales, especie };
  a.edificios.push(corral);
  const dia = (d: number) => mantener(m, a, Math.floor((d % DIAS_ANIO) / 30), d % DIAS_ANIO);
  return { corral, dia, cabe: corral.tipo === 'gallinero' ? 30 : capacidadCorral(a), tasa: corral.tipo === 'gallinero' ? 0.006 : RITMO_CRIA[especie] };
}

test('rebaños pequeños: un incremento diario menor de 0,005 se acumula y el animal nace el día que toca', () => {
  for (const [especie, n] of [['vaca', 2], ['caballo', 2], ['vaca', 3], ['oveja', 2]] as const) {
    const { corral, dia, cabe, tasa } = conCorral(especie, n);
    const diario = n * tasa * (1 - n / cabe);
    assert.ok(diario < 0.005, `${especie} ×${n}: ${diario} al día (antes se perdía al redondear)`);
    // Mientras son n, cada día suman lo mismo: el siguiente nace al completar la unidad.
    const nace = Math.ceil((1 - 1e-12) / diario);
    for (let d = 1; d <= nace; d++) {
      dia(d);
      assert.ok(Number.isInteger(corral.animales), `${especie}: ${corral.animales}`);
      if (d < nace) {
        assert.equal(corral.animales, n, `${especie} ×${n}: aún no ha nacido el día ${d}`);
        assert.ok(Math.abs(corral.gestacion! - d * diario) < 1e-9, `lo criado se suma sin perder nada (día ${d})`);
      }
    }
    assert.equal(corral.animales, n + 1, `${especie} ×${n}: nace uno el día ${nace}`);
    assert.ok(Math.abs(corral.gestacion! - (nace * diario - 1)) < 1e-9, 'y lo que sobra queda para el siguiente');
  }
});

test('varios meses de cría: el rebaño crece como dice la cuenta exacta, sin inflarse ni perder fracciones', () => {
  for (const [especie, n0] of [['vaca', 2], ['cabra', 4], ['cerdo', 5], ['gallina', 2], ['oveja', 9]] as const) {
    const { corral, dia, cabe, tasa } = conCorral(especie, n0);
    // La cuenta exacta, a mano: cada día cría lo que corresponde a los animales que hay.
    let n = n0;
    let g = 0;
    // Y el modelo continuo (sin enteros), que es el techo: con enteros nunca se cría más.
    let continuo = n0;
    const dias = 6 * 30;
    for (let d = 1; d <= dias; d++) {
      dia(d);
      g += n * tasa * (1 - n / cabe);
      const k = Math.trunc(g);
      n += k;
      g -= k;
      continuo += continuo * tasa * (1 - continuo / cabe);
      assert.equal(corral.animales, n, `${especie}: día ${d}`);
      assert.ok(Math.abs(corral.gestacion! - g) < 1e-9);
      assert.ok(corral.animales! + corral.gestacion! <= continuo + 1e-9, `${especie}: no cría más que el modelo continuo (día ${d})`);
    }
    assert.ok(continuo - (corral.animales! + corral.gestacion!) < 1, `${especie}: en seis meses la diferencia con el continuo es menor de un animal`);
  }
});

test('si hay más animales de los que caben, se pierden de uno en uno (también en enteros)', () => {
  const { corral, dia, cabe } = conCorral('oveja', 0);
  corral.animales = cabe + 5;
  let antes = corral.animales;
  for (let d = 1; d <= 4 * DIAS_ANIO; d++) {
    dia(d);
    assert.ok(Number.isInteger(corral.animales));
    assert.ok(corral.animales! <= antes, 'no crecen por encima de lo que cabe');
    assert.ok(antes - corral.animales! <= 1, 'se pierden de uno en uno');
    antes = corral.animales!;
  }
  assert.ok(corral.animales! < cabe + 5);
});

test('un guardado con animales fraccionarios (versiones anteriores) pasa a enteros sin perder la cría en camino', () => {
  const m = crearMundo(11);
  avanzar(m, DIAS_ANIO);
  const [a] = aldeasVivas(m);
  a.edificios.push({ tipo: 'corral', x: a.x + 2, y: a.y + 2, animales: 7.43, especie: 'oveja' });
  olvidarAnomalias();
  const n = recargar(m);
  const c = n.aldeas.find((x) => x.id === a.id)!.edificios.find((e) => e.tipo === 'corral' && e.especie === 'oveja')!;
  assert.equal(c.animales, 7);
  assert.ok(Math.abs(c.gestacion! - 0.43) < 1e-9, `la fracción queda como cría en camino: ${c.gestacion}`);
  assert.deepEqual(comprobar(n), []);
  assert.deepEqual(anomalias(), [], 'no es un daño, es el modelo nuevo: no se registra como reparación');
});

test('los remedios gastan una dosis de hierbas por enfermo curado, y sin hierbas no hay remedio', () => {
  const m = crearMundo(11);
  avanzar(m, DIAS_ANIO);
  const [a] = aldeasVivas(m);
  if (!a.conocidos.includes('remedio')) a.conocidos.push('remedio');
  const gente = m.personas.filter((p) => p.aldea === a.id);
  for (const p of gente) {
    p.salud = 1;
    p.reservas = 6;
  }
  const enfermos = gente.slice(0, 5);
  for (const p of enfermos) p.salud = 0.5;
  a.despensa.hierbas = 0.25;
  salud(m, a, gente, 0, false);
  // Hay para dos dosis: dos enfermos se curan algo más rápido y las hierbas se gastan.
  assert.equal(a.despensa.hierbas, 0.05);
  const curados = enfermos.filter((p) => p.salud >= 0.514 - 1e-9).length;
  assert.ok(curados <= 2, `solo dos dosis: ${enfermos.map((p) => p.salud).join(', ')}`);
  salud(m, a, gente, 0, false);
  assert.equal(a.despensa.hierbas, 0.05, 'con menos de una dosis, no se gasta nada');
});

test('referencias rotas en un guardado (aldea inexistente, pareja que no corresponde, despensa ausente) se arreglan con constancia', () => {
  const m = crearMundo(11);
  avanzar(m, 3 * DIAS_ANIO);
  const [a] = aldeasVivas(m);
  const [p, q, r] = m.personas;
  p.aldea = 9999;
  q.pareja = r.id;
  r.pareja = null;
  (a as unknown as Record<string, unknown>).despensa = null;
  olvidarAnomalias();
  const n = recargar(m);
  assert.deepEqual(comprobar(n), []);
  const rep = n.reparaciones ?? [];
  assert.ok(rep.some((x) => x.ruta.endsWith('.aldea') && /más cercana/.test(x.criterio)));
  assert.ok(rep.some((x) => x.ruta.endsWith('.pareja') && /no correspondida/.test(x.criterio)));
  assert.ok(rep.some((x) => x.ruta.endsWith('.despensa') && !x.recuperable));
  assert.equal(anomalias().length, 1);
  avanzar(n, DIAS_ANIO);
  assert.deepEqual(comprobar(n), []);
});

test('guardar, recargar (con migración y reparación) y seguir da lo mismo que no parar, durante 20 años', () => {
  const seguido = crearMundo(31);
  avanzar(seguido, 20 * DIAS_ANIO);
  let partido = crearMundo(31);
  for (let k = 0; k < 8; k++) {
    // Cortes en días sueltos, a mitad de estación.
    const tramo = k < 7 ? 2 * DIAS_ANIO + 37 : 20 * DIAS_ANIO - 7 * (2 * DIAS_ANIO + 37);
    avanzar(partido, tramo);
    partido = recargar(partido);
  }
  assert.equal(partido.t, seguido.t);
  assert.equal(JSON.stringify(partido), JSON.stringify(seguido));
});

test('el índice por aldea cuadra con la gente tras mudanzas y muertes', () => {
  const m = crearMundo(31);
  avanzar(m, 15 * DIAS_ANIO);
  nuevaPersona(m, { aldea: aldeasVivas(m)[0], nace: m.t - 20 * DIAS_ANIO });
  const ix = indexar(m);
  let n = 0;
  for (const [id, g] of ix.porAldea) {
    for (const p of g) assert.equal(p.aldea, id);
    n += g.length;
  }
  assert.equal(n, m.personas.length);
});

test('la práctica que no se ejerce se olvida del todo (antes se quedaba atascada en 1,6 días por el redondeo)', () => {
  const m = crearMundo(31);
  avanzar(m, 3 * DIAS_ANIO);
  const vivas = aldeasVivas(m);
  const p = m.personas.find((q) => q.aldea === vivas[0].id)!;
  p.practica = { cazar: 1.6, pescar: 30 };
  const ix = indexar(m);
  // Solo se repasa a cada cual en su turno (un día de cada diez): se simulan dos años de turnos.
  for (let k = 0; k < 24; k++) {
    while (m.t % 10 !== p.id % 10) m.t++;
    vidas(m, ix, vivas);
    m.t++;
  }
  assert.equal(p.practica.cazar, undefined, 'lo que apenas se practicó se olvida');
  assert.ok(p.practica.pescar > 1 && p.practica.pescar < 30, `lo mucho practicado se va perdiendo poco a poco: ${p.practica.pescar}`);
});

test('la amenaza de una aldea se pasa con el tiempo (antes se quedaba clavada en 0,5)', () => {
  const m = crearMundo(11);
  avanzar(m, 2 * DIAS_ANIO);
  const [a] = aldeasVivas(m);
  const gente = m.personas.filter((p) => p.aldea === a.id);
  a.amenaza = 0.5;
  // Sin ataques nuevos, cada noche baja un 1 %: la cuenta exacta, sin acelerarla.
  for (let d = 1; d <= 400; d++) {
    noche(m, a, gente, contexto(m, a, gente, 0));
    const exacto = 0.5 * 0.99 ** d;
    // Sigue la cuenta exacta (a menos de una milésima) hasta que, por debajo de 0,01, es nada.
    assert.ok(Math.abs(a.amenaza - exacto) < 0.001 || a.amenaza === 0, `noche ${d}: ${a.amenaza} frente a ${exacto}`);
  }
  assert.ok(a.amenaza < 0.02, `el miedo se pasa: ${a.amenaza}`);
});

test('la afinidad entre aldeas vecinas sube a pasitos de 0,005 sin perder ninguno (ni ganar de más)', () => {
  const m = crearMundo(11);
  avanzar(m, 2 * DIAS_ANIO);
  const [a] = aldeasVivas(m);
  const b = nuevaAldea(m, a.x + 30, a.y, 'Lejana', null);
  const rel = relacion(m, a.id, b.id);
  rel.afinidad = 0.2;
  rel.rencor = 0.5;
  for (let k = 0; k < 100; k++) convivir(m, a, b, 0, 0);
  // Antes, 0,2 + 0,005 × 100 se quedaba en 0,57 por el redondeo; debe ser 0,7.
  assert.ok(Math.abs(rel.afinidad - 0.7) < 1e-6, `afinidad ${rel.afinidad}`);
});

test('un lazo ya fuerte aún crece con tratos pequeños, cada vez menos, y se enfría a su ritmo', () => {
  const m = crearMundo(11);
  avanzar(m, DIAS_ANIO);
  const [p, q] = m.personas;
  p.lazos = [[q.id, 0.8]];
  // Antes 0,8 + 0,02 × 0,2 = 0,804 se redondeaba otra vez a 0,8 y no se movía.
  let esperado = 0.8;
  for (let k = 0; k < 50; k++) {
    ajustarLazo(p, q.id, 0.02);
    esperado += 0.02 * (1 - esperado);
  }
  assert.ok(Math.abs(lazo(p, q.id) - esperado) < 0.001, `${lazo(p, q.id)} frente a ${esperado}`);
  assert.ok(lazo(p, q.id) < 1, 'se satura, pero no llega al tope');
  // Enfriarse: ×0,985 por repaso, hasta que se olvida por debajo de 0,03.
  p.lazos = [[q.id, 0.04]];
  let repasos = 0;
  while (p.lazos.length && repasos < 100) {
    enfriar(p, () => true);
    repasos++;
  }
  const exacto = Math.log(0.03 / 0.04) / Math.log(0.985);
  assert.ok(Math.abs(repasos - exacto) <= 1, `se olvida cuando le toca: ${repasos} repasos (exacto ${exacto.toFixed(2)})`);
  // Y se conserva igual al guardar y cargar.
  p.lazos = [[q.id, 0.8123]];
  const n = recargar(m);
  assert.equal(lazo(n.personas.find((x) => x.id === p.id)!, q.id), 0.8123);
});

test('las medias de recompensa y de lo que rinde un trabajo llegan a su valor sin pasarse', () => {
  // Antes, con centésimas: la media 0,5 frente a recompensas de 0,59 no se movía nunca.
  let recompensa = 0.5;
  let valor = 1;
  for (let k = 0; k < 300; k++) {
    const r = acercar(recompensa, 0.59, 0.05);
    const v = acercar(valor, 1.03, 0.15);
    assert.ok(r >= recompensa && r <= 0.59 && v >= valor && v <= 1.03, 'se acercan sin pasarse');
    recompensa = r;
    valor = v;
  }
  assert.ok(Math.abs(recompensa - 0.59) < 0.002, `recompensa ${recompensa}`);
  assert.ok(Math.abs(valor - 1.03) < 0.001, `valor ${valor}`);
  // Y bajan igual de bien.
  let baja = 1;
  for (let k = 0; k < 300; k++) baja = acercar(baja, 0.95, 0.15);
  assert.ok(Math.abs(baja - 0.95) < 0.001, `baja ${baja}`);
});

test('una obra avanza exactamente lo que se trabaja: ni se pierde ni se adelanta por redondeos', () => {
  const m = crearMundo(11);
  avanzar(m, 2 * DIAS_ANIO);
  const [a] = aldeasVivas(m);
  const gente = m.personas.filter((p) => p.aldea === a.id);
  const p = gente[0];
  p.genes.fuerza = 0.3;
  p.saberes = p.saberes.filter((s) => s !== 'hacha');
  a.conocidos = a.conocidos.filter((s) => s !== 'numeros');
  a.obra = { tipo: 'templo', x: a.x + 3, y: a.y, progreso: 0, pagada: true, desde: m.t };
  const c = contexto(m, a, gente, 0);
  // El ritmo de esta persona: (0,6 + 0,4 × 0,3) × herramienta, y el templo pide 30 jornadas.
  const ritmo = construir(m, p, c);
  const paso = ritmo / 30;
  let dias = 1;
  while (a.obra && dias < 200) {
    assert.ok(Math.abs(a.obra.progreso - paso * dias) < 1e-3, `día ${dias}: ${a.obra.progreso} frente a ${paso * dias}`);
    construir(m, p, c);
    dias++;
  }
  // Se termina el día que toca (con centésimas, 0,024 se contaba como 0,02 y tardaba más).
  assert.equal(dias, Math.ceil((1 - 1e-9) / paso), `terminada en ${dias} jornadas`);
});
