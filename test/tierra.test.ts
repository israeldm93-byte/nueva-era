// Obras de tierra: técnicas que desbloquean acciones que cambian el terreno (explanadas y
// canteras). Cuestan, llevan tiempo y trabajo, cambian el relieve poco a poco y dejan
// consecuencias (dónde se construye, cuánta piedra hay).

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COLINA, OBRAS_TIERRA, PRADERA, validarCatalogo } from '../src/catalogo.ts';
import { planificar } from '../src/economia.ts';
import { comprobar } from '../src/invariantes.ts';
import { migrar } from '../src/migrar.ts';
import { crearMundo } from '../src/mundo.ts';
import { avanzar } from '../src/simulacion.ts';
import { desnivel, labrada } from '../src/tierra.ts';
import type { Aldea, Mundo } from '../src/tipos.ts';

test('el catálogo se valida: una obra o una técnica imposible no llega a simularse', () => {
  assert.deepEqual(validarCatalogo(), []);
  OBRAS_TIERRA.push({ id: 'teletransporte', nombre: 'X', requiere: 'magia', operacion: 'volar' as 'nivelar', terrenos: [0], radio: 9, coste: { oro: -1 }, trabajo: 0, trabajoPorAltura: 1, efecto: '' });
  try {
    const errores = validarCatalogo().join(' | ');
    for (const s of ['técnica desconocida magia', 'operación desconocida volar', 'terrenos imposibles', 'radio fuera de límites', 'cantidades imposibles', 'material desconocido oro']) assert.match(errores, new RegExp(s));
  } finally {
    OBRAS_TIERRA.pop();
  }
});

/** Una aldea con despensa llena que solo sabe lo que se le dice (para que planee lo que se quiere probar). */
function aldea(saberes: string[]): { m: Mundo; a: Aldea } {
  const m = crearMundo(5);
  const a = m.aldeas[0];
  a.conocidos = saberes.slice();
  // (Lo que sabe la aldea es lo que sabe su gente.)
  for (const p of m.personas) p.saberes = saberes.slice();
  a.despensa = { cereal: 4000, madera: 80, fibra: 30, arcilla: 60, piedra: 0 };
  for (const p of m.personas) p.reservas = 6;
  return { m, a };
}

test('una explanada: con la nivelación, una ladera se allana poco a poco para levantar encima un edificio grande', () => {
  const { m, a } = aldea(['escritura', 'nivelacion']);
  a.despensa.piedra = 40;
  // Alrededor de la aldea, todo en pendiente (escalones de 20 palmos).
  for (let y = a.y - 5; y <= a.y + 5; y++) for (let x = a.x - 5; x <= a.x + 5; x++) if (m.terreno[y * m.ancho + x] !== 0) m.relieve[y * m.ancho + x] = (x + y) % 2 ? 40 : 20;
  planificar(m, a, m.personas.filter((p) => p.aldea === a.id));
  const obra = a.obra!;
  assert.equal(obra?.tipo, 'explanada', 'antes de levantar la casa de las tablillas, hay que allanar');
  assert.equal(obra.tierra!.para, 'archivo');
  const centro = obra.y * m.ancho + obra.x;
  assert.ok(desnivel(m, centro) > 6);
  const madera = a.despensa.madera;
  // Día a día: se paga al empezar y el relieve cambia gradualmente.
  let dias = 0;
  let aMedias = false;
  while (a.obra?.tipo === 'explanada' && dias < 200) {
    avanzar(m, 1);
    dias++;
    const t = obra.tierra!;
    if (t.casillas.some((i, k) => m.relieve[i] !== t.desde[k] && m.relieve[i] !== t.hasta[k])) aMedias = true;
  }
  assert.ok(a.despensa.madera < madera, 'se pagó con madera');
  assert.ok(dias > 3, `lleva días de trabajo (${dias})`);
  assert.ok(aMedias, 'el terreno cambia poco a poco, no de golpe');
  assert.equal(desnivel(m, centro), 0, 'queda llana');
  assert.equal(labrada(m, centro), 'explanada');
  assert.ok(m.cronica.some((s) => /allanar una ladera/.test(s.texto)));
  // Y encima se levanta lo que se quería.
  for (let k = 0; k < 60 && !a.edificios.some((e) => e.tipo === 'archivo') && a.obra?.tipo !== 'archivo'; k++) avanzar(m, 1);
  const sitio = a.obra?.tipo === 'archivo' ? a.obra : a.edificios.find((e) => e.tipo === 'archivo')!;
  assert.equal(labrada(m, sitio.y * m.ancho + sitio.x), 'explanada', 'el edificio grande va sobre la explanada');
  assert.deepEqual(comprobar(m), []);
});

test('una cantera: con las canteras se abre la roca de una colina cercana; da piedra y deja una veta al descubierto', () => {
  const { m, a } = aldea(['cantera']);
  // Una colina a tres casillas.
  const c = a.y * m.ancho + a.x + 3;
  m.terreno[c] = COLINA;
  m.relieve[c] = 50;
  m.recursos.piedra[c] = 5;
  planificar(m, a, m.personas.filter((p) => p.aldea === a.id));
  assert.equal(a.obra?.tipo, 'cantera');
  const centro = a.obra!.y * m.ancho + a.obra!.x;
  const antes = m.relieve[centro];
  let dias = 0;
  while (a.obra?.tipo === 'cantera' && dias < 200) {
    avanzar(m, 1);
    dias++;
  }
  assert.ok(dias > 3, `lleva días (${dias})`);
  assert.equal(labrada(m, centro), 'cantera');
  assert.ok(m.relieve[centro] < antes - 10, 'la roca queda ahondada');
  assert.ok(m.recursos.piedra[centro] >= 60, 'veta al descubierto');
  assert.ok((a.despensa.piedra ?? 0) > 20, `ha dado piedra (${a.despensa.piedra})`);
});

test('sin la técnica no hay obra de tierra; y guardar y cargar a mitad de obra no cambia nada', () => {
  const sin = aldea(['escritura']);
  for (let y = sin.a.y - 5; y <= sin.a.y + 5; y++) for (let x = sin.a.x - 5; x <= sin.a.x + 5; x++) if (sin.m.terreno[y * sin.m.ancho + x] !== 0) sin.m.relieve[y * sin.m.ancho + x] = (x + y) % 2 ? 40 : 20;
  sin.a.despensa.piedra = 40;
  planificar(sin.m, sin.a, sin.m.personas.filter((p) => p.aldea === sin.a.id));
  assert.equal(sin.a.obra?.tipo, 'archivo', 'sin nivelación, se construye en la ladera tal cual');

  const { m, a } = aldea(['cantera']);
  const c = a.y * m.ancho + a.x + 3;
  m.terreno[c] = COLINA;
  m.relieve[c] = 50;
  planificar(m, a, m.personas.filter((p) => p.aldea === a.id));
  avanzar(m, 3);
  assert.equal(a.obra?.tipo, 'cantera');
  const s = JSON.stringify(m);
  assert.equal(JSON.stringify(migrar(JSON.parse(s) as Mundo)), s, 'se carga tal cual');
  const seguido = migrar(JSON.parse(s) as Mundo);
  avanzar(seguido, 40);
  let partido = migrar(JSON.parse(s) as Mundo);
  avanzar(partido, 17);
  partido = migrar(JSON.parse(JSON.stringify(partido)) as Mundo);
  avanzar(partido, 23);
  assert.equal(JSON.stringify(partido), JSON.stringify(seguido));
  // Una obra de tierra rota en un guardado se deja (y queda anotado), sin romper nada.
  const roto = JSON.parse(s) as Mundo;
  roto.aldeas[0].obra!.tierra!.hasta = [Number.NaN];
  roto.labrado = [[-5, 'cantera'], [3, 'nada']];
  const n = migrar(roto);
  assert.equal(n.aldeas[0].obra, null);
  assert.deepEqual(n.labrado, []);
  assert.ok(n.reparaciones!.some((r) => r.ruta.endsWith('.obra')));
  assert.deepEqual(comprobar(n), []);
  assert.equal(m.terreno[c], COLINA);
  assert.notEqual(PRADERA, COLINA);
});
