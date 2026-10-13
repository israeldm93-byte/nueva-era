// Caminos y exploración con memoria: los senderos nacen del uso, los caminos se construyen
// con trabajo y materiales y acortan los viajes; las expediciones recuerdan sus rutas,
// zarpan desde varios puntos de la costa y llegan a tierras que antes eran inalcanzables.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fijarAzar } from '../src/azar.ts';
import { AGUA } from '../src/catalogo.ts';
import { CAMINO, SENDERO, caminosDe, diasEntre, linea, pisar, senderos, tocarCaminos, transitoDe } from '../src/caminos.ts';
import { construir, contexto, planificar } from '../src/economia.ts';
import { ESTANCIA_TIERRA, RUMBOS16, navegar, puerto, puertos, rutasPosibles, trazar, zarpar } from '../src/exploracion.ts';
import { comprobar } from '../src/invariantes.ts';
import { deUltramar, masas } from '../src/mapa.ts';
import { migrar } from '../src/migrar.ts';
import { crearMundo, edad, indexar } from '../src/mundo.ts';
import { avanzar } from '../src/simulacion.ts';
import { planearCamino } from '../src/tierra.ts';
import type { Aldea, Mundo } from '../src/tipos.ts';

/** Un punto de tierra a unas casillas de la aldea, con toda la línea por tierra. */
function destinoPorTierra(m: Mundo, a: Aldea, d: number): [number, number] {
  for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const x = a.x + dx * d;
    const y = a.y + dy * d;
    if (linea(a.x, a.y, x, y).every(([lx, ly]) => m.terreno[ly * m.ancho + lx] !== AGUA && m.terreno[ly * m.ancho + lx] !== 6)) return [x, y];
  }
  throw new Error('sin línea por tierra');
}

test('los senderos nacen de ir y venir por el mismo sitio (y solo allí), y se borran si se deja de pasar', () => {
  const m = crearMundo(5);
  const a = m.aldeas[0];
  const [x, y] = destinoPorTierra(m, a, 10);
  for (let mes = 0; mes < 4; mes++) {
    for (let d = 0; d < 30; d++) pisar(m, a.x, a.y, x, y, 3, 2);
    senderos(m);
  }
  const cam = caminosDe(m);
  const enLinea = new Set(linea(a.x, a.y, x, y).slice(2).map(([lx, ly]) => ly * m.ancho + lx));
  const hechos = cam.flatMap((v, i) => (v ? [i] : []));
  assert.ok(hechos.length >= enLinea.size - 1 && hechos.every((i) => enLinea.has(i)), `sendero solo por donde se pasa (${hechos.length} de ${enLinea.size})`);
  // Pisar una vez de lejos no deja nada.
  const [ox, oy] = destinoPorTierra(m, { ...a, y: a.y + 3 } as Aldea, 8);
  pisar(m, a.x, a.y + 3, ox, oy, 20, 2);
  senderos(m);
  assert.equal(caminosDe(m).filter((v) => v).length, hechos.length, 'un viaje suelto no hace sendero');
  // Si nadie pasa, la hierba vuelve.
  for (let mes = 0; mes < 12; mes++) senderos(m);
  assert.equal(caminosDe(m).filter((v) => v).length, 0, 'sin uso, el sendero se borra');
});

test('ni el tránsito ni los caminos cruzan el agua', () => {
  const m = crearMundo(5);
  // Una línea de la costa este del continente mar adentro.
  const a = m.aldeas[0];
  let x = 159;
  while (m.terreno[a.y * m.ancho + x] === AGUA) x--;
  pisar(m, x - 4, a.y, x + 12, a.y, 500, 0);
  for (let k = 0; k < 3; k++) senderos(m);
  const tr = transitoDe(m);
  const cam = caminosDe(m);
  for (let xx = x + 1; xx <= x + 12; xx++) {
    const i = a.y * m.ancho + xx;
    if (m.terreno[i] !== AGUA) continue;
    assert.equal(tr[i], 0);
    assert.equal(cam[i], 0);
  }
  const agua = a.y * m.ancho + x + 6;
  assert.equal(m.terreno[agua], AGUA);
  a.conocidos.push('caminos', 'rueda');
  cam[agua] = SENDERO; // aunque alguien lo apuntara, no se construye
  assert.equal(planearCamino(m, a, 'camino', [agua]), null);
});

/** Una aldea que sabe hacer caminos, con un sendero marcado hacia fuera. */
function conSendero(): { m: Mundo; a: Aldea; tramo: number[] } {
  const m = crearMundo(5);
  const a = m.aldeas[0];
  a.conocidos = ['caminos', 'rueda'];
  for (const p of m.personas) p.saberes = a.conocidos.slice();
  a.despensa = { cereal: 4000, madera: 100, piedra: 200, fibra: 20 };
  const [x, y] = destinoPorTierra(m, a, 10);
  const tramo = linea(a.x, a.y, x, y).slice(2).map(([lx, ly]) => ly * m.ancho + lx);
  const cam = caminosDe(m);
  const tr = transitoDe(m);
  for (const i of tramo) {
    cam[i] = SENDERO;
    tr[i] = 300;
  }
  return { m, a, tramo };
}

test('mejorar un sendero cuesta lo previsto (madera por casilla y días de trabajo) y avanza casilla a casilla', () => {
  const { m, a, tramo } = conSendero();
  const gente = m.personas.filter((p) => p.aldea === a.id);
  for (const p of gente) p.reservas = 6;
  planificar(m, a, gente);
  const obra = a.obra!;
  assert.equal(obra?.tipo, 'camino', 'con caminos y senderos pisados, la aldea decide mejorarlos');
  const casillas = obra.tierra!.casillas;
  assert.ok(casillas.length >= 3 && casillas.every((i) => tramo.includes(i)), 'sobre su sendero');
  const madera = a.despensa.madera;
  const c = contexto(m, a, gente, 0);
  const obrero = gente.find((p) => edad(m, p) >= 18)!;
  let jornadas = 0;
  let aMedias = false;
  while (a.obra && jornadas < 100) {
    construir(m, obrero, c);
    jornadas++;
    if (jornadas === 1) assert.equal(a.despensa.madera, madera - casillas.length, 'una de madera por casilla, al empezar');
    const hechas = casillas.filter((i) => caminosDe(m)[i] === CAMINO).length;
    if (hechas > 0 && hechas < casillas.length) aMedias = true;
  }
  assert.ok(jornadas >= casillas.length, `lleva trabajo (${jornadas} jornadas para ${casillas.length} casillas)`);
  assert.ok(aMedias, 'el camino avanza casilla a casilla');
  assert.ok(casillas.every((i) => caminosDe(m)[i] === CAMINO));
});

test('un camino acorta los viajes por tierra que lo aprovechan (y no los demás)', () => {
  const { m, a, tramo } = conSendero();
  const fin = [tramo[tramo.length - 1] % m.ancho, Math.floor(tramo[tramo.length - 1] / m.ancho)];
  for (const i of linea(a.x, a.y, fin[0], fin[1]).map(([x, y]) => y * m.ancho + x)) caminosDe(m)[i] = 0;
  tocarCaminos(m);
  const base = diasEntre(m, [a.x, a.y], fin, 1.5);
  assert.ok(Math.abs(base - Math.hypot(fin[0] - a.x, fin[1] - a.y) / 1.5) < 1e-9, 'sin caminos, como siempre');
  // Con todo el recorrido convertido en camino, se tarda bastante menos...
  for (const [x, y] of linea(a.x, a.y, fin[0], fin[1])) caminosDe(m)[y * m.ancho + x] = CAMINO;
  tocarCaminos(m);
  const con = diasEntre(m, [a.x, a.y], fin, 1.5);
  assert.ok(con < base * 0.7, `por camino: ${con.toFixed(2)} días frente a ${base.toFixed(2)}`);
  // ...pero un viaje en otra dirección no gana nada.
  const [ox, oy] = [a.x - (fin[0] - a.x), a.y - (fin[1] - a.y)];
  assert.ok(Math.abs(diasEntre(m, [a.x, a.y], [ox, oy], 1.5) - Math.hypot(ox - a.x, oy - a.y) / 1.5) < 0.15);
});

/** Una aldea en la costa este, con barcos de vela, comida y madera de sobra. */
function costera(): { m: Mundo; a: Aldea } {
  const m = crearMundo(5);
  const a = m.aldeas[0];
  let x = 159;
  while (x > 0 && m.terreno[a.y * m.ancho + x] === AGUA) x--;
  a.x = x - 1;
  for (const p of m.personas.filter((q) => q.aldea === a.id)) [p.x, p.y] = [a.x, a.y];
  a.conocidos.push('canoa', 'vela');
  a.despensa = { cereal: 3000, madera: 30 };
  m.tiempo = 'sol';
  return { m, a };
}

test('las expediciones zarpan desde varios puntos de la costa, recuerdan sus rutas y no repiten enseguida las inútiles', () => {
  const { m, a } = costera();
  const gente = m.personas.filter((p) => p.aldea === a.id);
  assert.ok(puertos(m, a).length >= 2, 'más de un sitio de donde zarpar');
  const antes = rutasPosibles(m, a);
  assert.ok(antes.length > 8, `muchas rutas posibles (${antes.length})`);
  fijarAzar(11);
  assert.ok(zarpar(m, a, gente, {}));
  const van = gente.filter((p) => p.viaje?.mar);
  const { puerto: p0, ruta } = van[0].viaje!.mar!;
  assert.ok(p0 && ruta !== undefined);
  const ida = van[0].viaje!.mar!.ida;
  for (let k = 0; k < 2 * ida + ESTANCIA_TIERRA + 5 && van.some((p) => p.viaje); k++) {
    m.t++;
    navegar(m, indexar(m), false);
    // Lo que ven no llega a casa hasta que vuelven.
    if (van.some((p) => p.viaje)) assert.equal(a.rutas, undefined);
  }
  assert.ok(van.every((p) => !p.viaje && !p.muerto));
  assert.equal(a.rutas?.length, 1, 'al volver, la ruta queda en la memoria de la aldea');
  const [rx, ry, rr] = a.rutas![0];
  assert.deepEqual([rx, ry, rr], [p0![0], p0![1], ruta]);
  const despues = rutasPosibles(m, a);
  assert.ok(!despues.some((r) => r.ruta === ruta && Math.abs(r.puerto[0] - p0![0]) <= 3 && Math.abs(r.puerto[1] - p0![1]) <= 3), 'esa ruta no se repite mientras se recuerde');
  // Pasados muchos años, se puede volver a intentar (con menos ganas).
  m.t += 30 * 120;
  assert.ok(rutasPosibles(m, a).some((r) => r.ruta === ruta && r.probada && r.peso < 1));
});

test('con puertos alternativos y más rumbos se alcanzan tierras que antes quedaban fuera de toda ruta', () => {
  const m = crearMundo(5);
  const { masa } = masas(m);
  // Para cada aldea (imaginaria, a lo largo de la costa), qué tierras de ultramar tiene a su alcance.
  const alcanzadas = (nuevo: boolean) => {
    const out = new Set<string>();
    // Aldeas imaginarias a lo largo de toda la costa del continente (cada 6 casillas).
    for (let y = 2; y < 110; y += 6) {
      for (let x = 2; x < 158; x += 6) {
        const i = y * m.ancho + x;
        if (m.terreno[i] === AGUA || masa[i] < 0) continue;
        const a = { ...m.aldeas[0], x, y, tierras: [] } as Aldea;
        const salidas = nuevo ? rutasPosibles(m, a).map((r) => [r.puerto, RUMBOS16[r.ruta]] as const) : (() => {
          const p = puerto(m, a);
          return p ? ([[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]] as [number, number][]).map((r) => [p, r] as const) : [];
        })();
        for (const [p, r] of salidas) {
          const { tierra } = trazar(m, a, p, r as [number, number], 90);
          if (tierra && deUltramar(tierra[0], tierra[1])) out.add(`${x},${y}:${masa[tierra[1] * m.ancho + tierra[0]]}`);
        }
      }
    }
    return out;
  };
  const antes = alcanzadas(false);
  const ahora = alcanzadas(true);
  const nuevas = [...ahora].filter((k) => !antes.has(k));
  assert.ok(ahora.size > antes.size * 1.3 && nuevas.length > 10, `muchas más tierras al alcance de cada aldea: ${antes.size} → ${ahora.size} pares aldea-tierra`);
});

test('guardar y cargar conserva senderos, caminos, una obra de camino a medias y una expedición en el mar', () => {
  const { m, a } = conSendero();
  a.conocidos.push('canoa', 'vela');
  const gente = m.personas.filter((p) => p.aldea === a.id);
  planificar(m, a, gente);
  assert.equal(a.obra?.tipo, 'camino');
  avanzar(m, 2);
  // Una expedición en curso (si la aldea tiene costa a mano), forzada para la prueba.
  const { m: m2, a: a2 } = costera();
  fijarAzar(5);
  zarpar(m2, a2, m2.personas.filter((p) => p.aldea === a2.id), {});
  avanzar(m2, 3);
  for (const mundo of [m, m2]) {
    const s = JSON.stringify(mundo);
    assert.equal(JSON.stringify(migrar(JSON.parse(s) as Mundo)), s, 'se carga tal cual, sin reparar nada');
    const seguido = migrar(JSON.parse(s) as Mundo);
    avanzar(seguido, 40);
    let partido = migrar(JSON.parse(s) as Mundo);
    avanzar(partido, 13);
    partido = migrar(JSON.parse(JSON.stringify(partido)) as Mundo);
    avanzar(partido, 27);
    assert.equal(JSON.stringify(partido), JSON.stringify(seguido));
    assert.deepEqual(comprobar(seguido), []);
  }
  assert.ok(m2.personas.some((p) => p.viaje?.mar), 'la expedición seguía en el mar al guardar');
});
