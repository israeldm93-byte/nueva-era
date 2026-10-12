// Explorar el mar y colonizar ultramar: se viaja de verdad (días, víveres, riesgo), lo que
// se descubre no llega a casa hasta que vuelven, y solo se coloniza lo que se conoce.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fijarAzar } from '../src/azar.ts';
import { AGUA } from '../src/catalogo.ts';
import { caminar, partir } from '../src/exodo.ts';
import { ESTANCIA_TIERRA, navegar, puerto, trazar, zarpar } from '../src/exploracion.ts';
import { buscarSitio, deUltramar, habitable, masas, puntuarSitio } from '../src/mapa.ts';
import { migrar } from '../src/migrar.ts';
import { crearMundo, indexar, nuevaAldea } from '../src/mundo.ts';
import { avanzar } from '../src/simulacion.ts';
import type { Aldea, Mundo, Persona } from '../src/tipos.ts';
import { frioDe } from '../src/ultramar.ts';

const RUMBOS: [number, number][] = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

/** Una aldea en la costa este del continente, con barcos de vela, comida y madera de sobra. */
function escenario(vela = true): { m: Mundo; a: Aldea; gente: Persona[]; rumbo: [number, number] | null } {
  const m = crearMundo(5);
  const a = m.aldeas[0];
  let x = 159;
  while (x > 0 && m.terreno[a.y * m.ancho + x] === AGUA) x--;
  a.x = x - 1;
  a.y = a.y;
  const gente = m.personas.filter((p) => p.aldea === a.id);
  for (const p of gente) [p.x, p.y] = [a.x, a.y];
  a.conocidos.push('canoa', ...(vela ? ['vela'] : []));
  a.despensa = { cereal: 3000, madera: 30 };
  const desde = puerto(m, a)!;
  const rumbo = RUMBOS.find((r) => trazar(m, a, desde, r, 90).tierra) ?? null;
  m.tiempo = 'sol';
  return { m, a, gente, rumbo };
}

test('una expedición tarda lo que tarda, descubre tierra y la aldea no lo sabe hasta que vuelven', () => {
  const { m, a, gente, rumbo } = escenario();
  assert.ok(rumbo, 'hay tierra de ultramar a la vista de algún rumbo');
  fijarAzar(3);
  const madera = a.despensa.madera;
  const comida = a.despensa.cereal;
  assert.ok(zarpar(m, a, gente, { rumbo: rumbo! }));
  const van = gente.filter((p) => p.viaje?.mar);
  assert.equal(van.length, 3, 'con vela, tres tripulantes');
  assert.ok(a.despensa.madera < madera && a.despensa.cereal < comida, 'la barca y los víveres salen de la despensa');
  const { ida, tierra, zarpo } = van[0].viaje!.mar!;
  assert.ok(tierra && deUltramar(tierra[0], tierra[1]) && ida >= 3);
  const vistos = a.vistos.slice();
  const fases: [number, string][] = [];
  for (let k = 0; k < 2 * ida + ESTANCIA_TIERRA + 5 && van.some((p) => p.viaje); k++) {
    m.t++;
    navegar(m, indexar(m), false);
    assert.ok(!van.some((p) => p.muerto), 'con buen tiempo y vela, esta vez no naufragan');
    const v = van[0].viaje;
    if (v && fases[fases.length - 1]?.[1] !== v.fase) fases.push([m.t - zarpo, v.fase]);
    // Mientras no vuelvan, en casa no se sabe nada (ni de la tierra ni de lo que allí hay).
    if (van.some((p) => p.viaje)) {
      assert.equal(a.tierras, undefined);
      assert.deepEqual(a.vistos, vistos);
    }
  }
  assert.deepEqual(fases, [[1, 'ida'], [ida, 'estancia'], [ida + ESTANCIA_TIERRA, 'vuelta']], 'ida, unos días en tierra y vuelta, sin saltos');
  assert.ok(van.every((p) => !p.viaje && p.x === a.x && p.y === a.y), 'han vuelto a casa');
  assert.ok(m.t - zarpo === 2 * ida + ESTANCIA_TIERRA, 'la vuelta dura lo mismo que la ida');
  assert.deepEqual(a.tierras, [tierra], 'ahora la aldea conoce esa tierra');
  assert.match(m.cronica[m.cronica.length - 1].texto, /con noticias/);
  assert.ok(van.every((p) => p.vida?.some((h) => h[1] === 'explora')));
});

test('en el mar se puede naufragar: se pierden todos y en casa no se sabe nada', () => {
  let hundida = false;
  for (let semilla = 1; semilla <= 30 && !hundida; semilla++) {
    const { m, a, gente } = escenario(false);
    fijarAzar(semilla);
    if (!zarpar(m, a, gente, {})) continue;
    const van = gente.filter((p) => p.viaje?.mar);
    const ida = van[0].viaje!.mar!.ida;
    m.tiempo = 'tormenta';
    for (let k = 0; k < 2 * ida + ESTANCIA_TIERRA && van.some((p) => p.viaje && !p.muerto); k++) {
      m.t++;
      navegar(m, indexar(m), true);
    }
    if (!van.some((p) => p.muerto)) continue;
    hundida = true;
    assert.ok(van.every((p) => p.muerto === 'ahogado'), 'la barca se hunde con todos');
    assert.equal(a.tierras, undefined, 'lo que vieron se pierde con ellos');
    assert.match(m.cronica[m.cronica.length - 1].texto, /hunde/);
  }
  assert.ok(hundida, 'con tormentas en invierno, alguna barca acaba hundida');
});

test('guardar y cargar en mitad de una expedición no cambia nada', () => {
  const { m, a, gente, rumbo } = escenario();
  fijarAzar(3);
  assert.ok(zarpar(m, a, gente, { rumbo: rumbo! }));
  const ida = gente.find((p) => p.viaje?.mar)!.viaje!.mar!.ida;
  const s = JSON.stringify(m);
  assert.equal(JSON.stringify(migrar(JSON.parse(s) as Mundo)), s, 'cargar no repara ni pierde nada de la expedición');
  const seguido = migrar(JSON.parse(s) as Mundo);
  avanzar(seguido, 2 * ida + ESTANCIA_TIERRA + 3);
  let partido = migrar(JSON.parse(s) as Mundo);
  avanzar(partido, ida + 2);
  assert.ok(partido.personas.some((p) => p.viaje?.mar?.como), 'se guarda mientras recorren la tierra nueva');
  partido = migrar(JSON.parse(JSON.stringify(partido)) as Mundo);
  avanzar(partido, ida + ESTANCIA_TIERRA + 1);
  assert.equal(JSON.stringify(partido), JSON.stringify(seguido));
});

test('solo se coloniza lo que se conoce y donde se puede vivir; el viaje lleva su tiempo', () => {
  const { m, a, gente } = escenario();
  const { masa } = masas(m);
  // Un punto de mar junto a una tierra del sur donde se puede vivir.
  let mar = -1;
  let tierra = -1;
  for (let i = 0; i < m.terreno.length && mar < 0; i++) {
    const x = i % m.ancho;
    const y = (i - x) / m.ancho;
    if (y < 125 || y > m.alto - 15 || m.terreno[i] === AGUA || masa[i] < 0 || puntuarSitio(m, x, y) < 80) continue;
    for (let d = 2; d < 10; d++) {
      if (m.terreno[(y + d) * m.ancho + x] === AGUA) {
        mar = (y + d) * m.ancho + x;
        tierra = i;
        break;
      }
    }
  }
  assert.ok(mar >= 0);
  const [mx, my] = [mar % m.ancho, Math.floor(mar / m.ancho)];
  const [tx, ty] = [tierra % m.ancho, Math.floor(tierra / m.ancho)];
  // Sin saber que existe, no se va (aunque se pueda cruzar el agua).
  assert.equal(buscarSitio(m, { x: mx, y: my, conocidos: ['ropa'] }, 0, 12, null, true), null);
  const sitio = buscarSitio(m, { x: mx, y: my, conocidos: ['ropa'], tierras: [[tx, ty]] }, 0, 12, null, true);
  assert.ok(sitio && deUltramar(sitio.x, sitio.y) && masa[sitio.y * m.ancho + sitio.x] === masa[tierra], 'conociéndola, sí');
  // Condiciones: hace falta agua o comida de sobra y, en el norte helado, ropa de abrigo.
  assert.equal(habitable(m, { conocidos: [] }, tx, ty, 30), false);
  let norte = -1;
  for (let i = 0; i < m.terreno.length && norte < 0; i++) if (m.terreno[i] !== AGUA && frioDe(m, i % m.ancho, Math.floor(i / m.ancho)) > 0.5) norte = i;
  const [nx, ny] = [norte % m.ancho, Math.floor(norte / m.ancho)];
  assert.equal(habitable(m, { conocidos: [] }, nx, ny, 200), false);
  assert.equal(habitable(m, { conocidos: ['ropa'] }, nx, ny, 200), true);
  // La fundación: los que se van heredan lo que su aldea sabía y cruzan el mar día a día.
  a.tierras = [[tx, ty]];
  const b = nuevaAldea(m, a.x, a.y, gente[0].nombre, a.id);
  assert.deepEqual(b.tierras, a.tierras);
  const grupo = gente.slice(0, 8);
  for (const p of grupo) p.aldea = b.id;
  fijarAzar(4);
  partir(m, b, a, sitio!, grupo);
  const dias = b.viaje!.dias;
  assert.ok(dias >= 10, `no es instantáneo (${dias} días)`);
  const t0 = m.t;
  while (b.viaje && m.t - t0 < dias + 2) {
    m.t++;
    caminar(m, b, grupo.filter((p) => !p.muerto));
  }
  assert.equal(m.t - t0, dias);
  assert.ok(!b.viaje && b.x === sitio!.x && b.y === sitio!.y && deUltramar(b.x, b.y), 'fundan en ultramar');
  assert.match(m.cronica[m.cronica.length - 1].texto, /levantan allí su aldea/);
});
