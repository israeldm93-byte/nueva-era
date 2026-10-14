// Diplomacia y guerra: relaciones con memoria, conflictos con motivo, incursiones que hacen
// el camino de verdad (y gastan, hieren y matan), paces que llegan y alianzas que protegen.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fijarAzar } from '../src/azar.ts';
import { AGUA, ORDEN_COMER, RIO } from '../src/catalogo.ts';
import { linea } from '../src/caminos.ts';
import { DIAS_ANIO } from '../src/config.ts';
import { diplomacia, guerrear, lanzarIncursion, trato } from '../src/guerra.ts';
import { comprobar } from '../src/invariantes.ts';
import { tratar } from '../src/mercaderes.ts';
import { migrar } from '../src/migrar.ts';
import { crearMundo, edad, indexar, nuevaAldea, nuevaPersona } from '../src/mundo.ts';
import { combatir, convivir, defensoresDe, fuerzas, quiereAsaltar, relacion, repensarGuerra } from '../src/politica.ts';
import { avanzar } from '../src/simulacion.ts';
import type { Aldea, Mundo } from '../src/tipos.ts';

const gente = (m: Mundo, a: Aldea) => m.personas.filter((p) => p.aldea === a.id && !p.muerto);
const adultos = (m: Mundo, a: Aldea) => gente(m, a).filter((p) => edad(m, p) >= 16 && edad(m, p) <= 55);
/** Cuánta comida hay (en cantidades, sin pesar lo que alimenta cada cosa). */
const comidaDe = (r: Record<string, number>) => ORDEN_COMER.reduce((s, k) => s + (r[k] ?? 0), 0);
const comidaTotal = (a: Aldea) => comidaDe(a.despensa);

/** Un consejo con los adultos más mayores de la aldea, de la agresividad que se pida. */
function consejo(m: Mundo, a: Aldea, agresividad: number): void {
  const miembros = adultos(m, a).slice(0, 3);
  for (const p of miembros) p.genes.agresividad = agresividad;
  a.consejo = { prioridad: 'comida', miembros: miembros.map((p) => p.id), votos: {}, desde: m.t, anunciada: 'comida', anunciado: m.t, guerra: null };
}

/** Dos aldeas en la misma tierra, a unas 12 casillas, que se conocen y tienen de todo. */
function dosAldeas(semilla = 5): { m: Mundo; a: Aldea; b: Aldea } {
  const m = crearMundo(semilla);
  const a = m.aldeas[0];
  for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1]]) {
    const x = a.x + dx * 12;
    const y = a.y + dy * 12;
    if (!linea(a.x, a.y, x, y).every(([lx, ly]) => ![AGUA, RIO].includes(m.terreno[ly * m.ancho + lx]))) continue;
    const b = nuevaAldea(m, x, y, 'Vecina', null);
    for (let k = 0; k < 8; k++) nuevaPersona(m, { aldea: b, nace: m.t - (20 + k) * 120 });
    m.contactos.push(`${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`);
    a.despensa = { cereal: 3000, madera: 300, piedra: 200 };
    b.despensa = { cereal: 3000, madera: 300, piedra: 200 };
    for (const p of m.personas) {
      p.reservas = 6;
      p.salud = 1;
    }
    consejo(m, a, 0.5);
    consejo(m, b, 0.5);
    return { m, a, b };
  }
  throw new Error('sin sitio');
}

/** Días de guerra (solo las incursiones), sin el resto de la vida, para contar exacto. */
function dias(m: Mundo, n: number, cada?: () => void): void {
  for (let k = 0; k < n; k++) {
    m.t++;
    guerrear(m, indexar(m));
    cada?.();
  }
}

test('una disputa por las mismas tierras acaba en conflicto, con su motivo', () => {
  const { m, a, b } = dosAldeas();
  // A las dos les falta lo mismo (comida), mes tras mes: se disputan las tierras.
  a.despensa.cereal = 0;
  b.despensa.cereal = 0;
  for (let mes = 0; mes < 12; mes++) diplomacia(m, indexar(m));
  const rel = relacion(m, a.id, b.id);
  assert.ok((rel.disputa ?? 0) >= 0.4, `la disputa crece: ${rel.disputa}`);
  assert.ok(rel.rencor > 0.05, `y con ella el rencor: ${rel.rencor}`);
  assert.equal(trato(m, a, b), 'tensión');
  // Un consejo algo belicoso decide ir a por ellas (sin hambre que lo empuje: la disputa basta).
  consejo(m, a, 0.8);
  const ix = indexar(m);
  const motivo = quiereAsaltar(m, a, b, ix.porAldea.get(a.id)!, ix.porAldea.get(b.id)!, 0, ix.porId);
  assert.equal(motivo, 'tierras');
  a.despensa.cereal = 400;
  const inc = lanzarIncursion(m, a, b, ix.porAldea.get(a.id)!, motivo!);
  assert.ok(inc, 'salen los guerreros');
  assert.equal(a.consejo!.guerra?.contra, b.id);
  assert.equal(trato(m, a, b), 'guerra');
  assert.ok(m.cronica.some((c) => c.tipo === 'guerra' && c.texto.includes('se disputan las mismas tierras')), 'la crónica dice por qué');
  // Y no hay dos incursiones a la vez contra la misma aldea.
  assert.equal(lanzarIncursion(m, a, b, ix.porAldea.get(a.id)!, motivo!), null);
  assert.equal(m.incursiones!.length, 1);
});

test('sin motivo no hay guerra: vecinas con de todo, sin disputas ni agravios, viven en paz', () => {
  const { m, a, b } = dosAldeas();
  const ix = indexar(m);
  assert.equal(quiereAsaltar(m, a, b, ix.porAldea.get(a.id)!, ix.porAldea.get(b.id)!, 0, ix.porId), null);
  assert.equal(quiereAsaltar(m, b, a, ix.porAldea.get(b.id)!, ix.porAldea.get(a.id)!, 0, ix.porId), null);
  // Aun con un consejo belicoso, si se comercia mucho con ellos, pelear no compensa.
  consejo(m, a, 0.75);
  relacion(m, a.id, b.id).rencor = 0.2;
  const antes = quiereAsaltar(m, a, b, ix.porAldea.get(a.id)!, ix.porAldea.get(b.id)!, 0, ix.porId);
  relacion(m, a.id, b.id).comercio = 60;
  relacion(m, a.id, b.id).afinidad = 0.4;
  assert.equal(quiereAsaltar(m, a, b, ix.porAldea.get(a.id)!, ix.porAldea.get(b.id)!, 0, ix.porId), null, `con comercio y amistad, no (sin él: ${antes})`);
  // Dos años de vida normal con graneros llenos: ninguna guerra entre ellas.
  consejo(m, a, 0.5);
  relacion(m, a.id, b.id).rencor = 0;
  for (let k = 0; k < 8; k++) {
    a.despensa.cereal = Math.max(a.despensa.cereal ?? 0, 3000);
    b.despensa.cereal = Math.max(b.despensa.cereal ?? 0, 3000);
    avanzar(m, 90);
  }
  assert.ok(!m.cronica.some((c) => c.tipo === 'guerra' || c.tipo === 'asalto'), m.cronica.filter((c) => c.tipo === 'guerra').map((c) => c.texto).join(' | '));
  assert.ok(!m.incursiones?.length);
});

test('el combate cuenta las fuerzas, las armas, las murallas y los aliados', () => {
  const { m, a, b } = dosAldeas();
  const guerreros = adultos(m, a).slice(0, 6);
  const defensores = defensoresDe(m, gente(m, b));
  const base = fuerzas(m, a, b, guerreros, defensores, []);
  // Más guerreros, más fuerza.
  assert.ok(fuerzas(m, a, b, adultos(m, a).slice(0, 9), defensores, []).fA > base.fA);
  // Mejores armas.
  a.conocidos.push('cobre', 'hierro', 'espada');
  const armado = fuerzas(m, a, b, guerreros, defensores, []);
  assert.ok(armado.fA > base.fA * 2, `con hierro y espada: ${armado.fA} frente a ${base.fA}`);
  // Murallas: defienden más (salvo catapultas).
  b.edificios.push({ tipo: 'muralla', x: b.x + 2, y: b.y, nivel: 1 } as Aldea['edificios'][number]);
  const amurallada = fuerzas(m, a, b, guerreros, defensores, []);
  assert.ok(amurallada.fB > armado.fB * 2.5, `la muralla: ${amurallada.fB} frente a ${armado.fB}`);
  a.conocidos.push('catapulta');
  assert.ok(fuerzas(m, a, b, guerreros, defensores, []).fB < amurallada.fB, 'las catapultas abren brecha');
  // Los aliados que acuden suman.
  const ayuda = adultos(m, a).slice(6, 9);
  assert.ok(fuerzas(m, a, b, guerreros, defensores, ayuda).fB > fuerzas(m, a, b, guerreros, defensores, []).fB);
  // Y el resultado sigue a las fuerzas: con mucha ventaja se gana casi siempre; con mucha desventaja, casi nunca.
  const ganar = (armas: string[], muralla: boolean) => {
    let gana = 0;
    for (let k = 0; k < 60; k++) {
      const c = dosAldeas();
      c.a.conocidos.push(...armas);
      if (muralla) c.b.edificios.push({ tipo: 'muralla', x: c.b.x + 2, y: c.b.y, nivel: 1 } as Aldea['edificios'][number]);
      fijarAzar(1000 + k);
      if (combatir(c.m, c.a, c.b, adultos(c.m, c.a).slice(0, 8), gente(c.m, c.b), 'codicia').gana) gana++;
    }
    return gana / 60;
  };
  const fuertes = ganar(['cobre', 'hierro', 'espada', 'arco'], false);
  const debiles = ganar([], true);
  assert.ok(fuertes > 0.7 && debiles < 0.3 && fuertes > debiles, `bien armados contra una aldea abierta: ${fuertes}; sin armas contra una muralla: ${debiles}`);
});

/** Una incursión de principio a fin, contando todo lo que entra y sale. */
function incursionCompleta(semilla: number): { resultado?: string; botin: number; muertos: number; heridos: number } {
  const { m, a, b } = dosAldeas();
  fijarAzar(semilla);
  a.conocidos.push('cobre', 'hierro', 'espada');
  consejo(m, a, 0.8);
  const ga = gente(m, a);
  const madera = a.despensa.madera!;
  const comida = comidaTotal(a);
  const inc = lanzarIncursion(m, a, b, ga, 'codicia')!;
  const n = inc.gente.length;
  assert.ok(n >= 2);
  // Las armas (madera) y la comida del camino salen de la despensa: ni más ni menos.
  assert.equal(a.despensa.madera, madera - 2 * n);
  assert.ok(Math.abs(comidaTotal(a) + comidaDe(inc.viveres) - comida) < 0.05, 'la comida que se llevan sale de casa');
  // Mientras van, comen de lo que llevan (y no de casa).
  const enCasa = comidaTotal(a);
  let antes = comidaDe(inc.viveres);
  let comidaB = comidaTotal(b);
  let llegada = -1;
  dias(m, inc.dias, () => {
    if (inc.fase === 'ida') {
      assert.ok(comidaDe(inc.viveres) < antes, 'cada día gastan víveres');
      antes = comidaDe(inc.viveres);
    } else if (llegada < 0) llegada = m.t;
  });
  assert.ok(llegada > 0 || inc.fase === 'vuelta', 'al cabo de los días de camino, llegan y pelean (o se retiran)');
  assert.equal(comidaTotal(a), enCasa, 'en casa no se toca nada mientras');
  assert.ok(inc.resultado, `resultado: ${inc.resultado}`);
  const botin = comidaDe(inc.botin);
  assert.ok(Math.abs(comidaB - comidaTotal(b) - botin) < 0.05, `lo que pierde ${b.nombre} es lo que cargan (${comidaB - comidaTotal(b)} / ${botin})`);
  comidaB = comidaTotal(b);
  // Los muertos lo están de verdad, y quienes vuelven vuelven heridos o sanos (nunca con salud imposible).
  const muertos = m.personas.filter((p) => p.muerto === 'combate');
  const heridos = m.personas.filter((p) => p.vida?.some((h) => h[1] === 'herido'));
  for (const p of [...muertos, ...heridos]) assert.ok(Number.isFinite(p.salud) && p.salud <= 1);
  for (const p of heridos) if (!p.muerto) assert.ok(p.salud < 1, `${p.nombre} herido: ${p.salud}`);
  const texto = m.cronica.filter((c) => c.tipo === 'asalto').at(-1)?.texto ?? '';
  if (inc.resultado !== 'retirada') assert.match(texto, /heridos/);
  // El botín no llega a casa hasta que llegan ellos; entonces entra todo (botín y víveres que sobran).
  // (De vuelta siguen comiendo de lo que llevan, pero el botín no se toca.)
  const carga = comidaDe(inc.viveres) + botin;
  dias(m, inc.dias + 1);
  assert.ok(!m.incursiones?.length, 'la incursión ha terminado');
  const entra = comidaTotal(a) - enCasa;
  assert.ok(entra >= botin - 0.05 && entra <= carga + 0.05, `entra el botín y lo que sobró: ${entra} (botín ${botin}, llevaban ${carga})`);
  assert.equal(comidaTotal(b), comidaB);
  for (const id of inc.gente) {
    const p = m.personas.find((q) => q.id === id)!;
    if (p.muerto) continue;
    assert.ok(!p.viaje, `${p.nombre} está en casa`);
    assert.deepEqual([p.x, p.y], [a.x, a.y]);
  }
  // (Un día de vida normal: se entierra a los muertos y todo sigue en orden.)
  avanzar(m, 1);
  assert.deepEqual(comprobar(m), []);
  return { resultado: inc.resultado, botin, muertos: muertos.length, heridos: heridos.length };
}

test('las incursiones gastan de verdad, y el botín, las heridas y los muertos cuadran', () => {
  const vistos: string[] = [];
  let botin = 0;
  let bajas = 0;
  for (let k = 1; k <= 12; k++) {
    const r = incursionCompleta(k);
    vistos.push(r.resultado!);
    botin = Math.max(botin, r.botin);
    bajas += r.muertos + r.heridos;
  }
  assert.ok(vistos.includes('victoria') && vistos.includes('derrota'), `se gana y se pierde: ${vistos.join(', ')}`);
  assert.ok(botin > 0 && bajas > 0, `hay botín (${botin}) y bajas (${bajas})`);
});

test('la derrota, el cansancio o un cambio de circunstancias acaban la guerra (y vuelve el comercio)', () => {
  // Dos derrotas: paz, tregua y la crónica lo cuenta.
  {
    const { m, a, b } = dosAldeas();
    a.consejo!.guerra = { contra: b.id, desde: m.t, motivo: 'codicia', derrotas: 2 };
    m.t += 10;
    repensarGuerra(m, a);
    assert.equal(a.consejo!.guerra, null);
    assert.equal(relacion(m, a.id, b.id).paz, m.t);
    assert.ok(m.cronica.some((c) => c.tipo === 'paz' && c.texto.includes('tras dos derrotas')));
    // Durante la tregua no se vuelve a atacar.
    consejo(m, a, 0.95);
    relacion(m, a.id, b.id).rencor = 0.9;
    const ix = indexar(m);
    assert.equal(quiereAsaltar(m, a, b, ix.porAldea.get(a.id)!, ix.porAldea.get(b.id)!, 0.9, ix.porId), null);
  }
  // Agotados: muertos y heridos pesan.
  {
    const { m, a, b } = dosAldeas();
    a.consejo!.guerra = { contra: b.id, desde: m.t, motivo: 'rencor', derrotas: 0, cansancio: 1.1 };
    relacion(m, a.id, b.id).rencor = 0.9;
    relacion(m, a.id, b.id).agravio = 0.6;
    relacion(m, a.id, b.id).ultimoAsalto = m.t;
    repensarGuerra(m, a);
    assert.equal(a.consejo!.guerra, null);
    assert.ok(m.cronica.some((c) => c.tipo === 'paz' && c.texto.includes('agotados')));
    // El rencor baja, pero el agravio deja poso.
    assert.ok(relacion(m, a.id, b.id).rencor >= 0.3 && relacion(m, a.id, b.id).rencor < 0.9);
  }
  // Una paz firmada con los guerreros de camino: se dan la vuelta y la comida vuelve a casa.
  {
    const { m, a, b } = dosAldeas();
    consejo(m, a, 0.8);
    const comida = comidaTotal(a);
    const inc = lanzarIncursion(m, a, b, gente(m, a), 'codicia')!;
    dias(m, 1);
    a.consejo!.guerra = null;
    dias(m, 1);
    assert.equal(inc.resultado, 'paz');
    assert.equal(inc.fase, 'vuelta');
    dias(m, 40);
    assert.ok(!m.incursiones?.length);
    assert.ok(comida - comidaTotal(a) > 0 && comida - comidaTotal(a) < 40, 'solo se gastó lo que comieron por el camino');
  }
  // En guerra no se comercia; con la paz, los mercaderes vuelven.
  {
    const { m, a, b } = dosAldeas();
    a.despensa = { cereal: 3000, madera: 2, piedra: 200 };
    b.despensa = { cereal: 3000, madera: 300, piedra: 2 };
    a.obra = { tipo: 'corral', x: a.x + 1, y: a.y, progreso: 0, pagada: false, desde: m.t };
    b.obra = { tipo: 'plaza', x: b.x, y: b.y, progreso: 0, pagada: false, desde: m.t };
    a.consejo!.guerra = { contra: b.id, desde: m.t, motivo: 'codicia', derrotas: 2 };
    assert.equal(tratar(m, a, gente(m, a), b, gente(m, b), 1), null, 'en guerra, nada');
    repensarGuerra(m, a);
    assert.ok(tratar(m, a, gente(m, a), b, gente(m, b), 1), 'con la paz, vuelve el trato');
  }
});

test('una guerra recién declarada no se da por enfriada solo porque aún no haya habido asaltos', () => {
  const { m, a, b } = dosAldeas();
  consejo(m, a, 0.8);
  // Nunca se han asaltado (sin «último asalto») y el rencor es moderado: declaran la guerra.
  const rel = relacion(m, a.id, b.id);
  rel.rencor = 0.3;
  a.consejo!.guerra = { contra: b.id, desde: m.t, motivo: 'rencor', derrotas: 0 };
  // Pasan todos los repasos mensuales de sus dos primeros años: la guerra sigue (antes se apagaba
  // en el primero, porque contaba desde un «último asalto» que nunca hubo).
  const desde = m.t;
  for (let mes = 1; m.t + 30 - desde <= DIAS_ANIO * 2; mes++) {
    m.t += 30;
    repensarGuerra(m, a);
    assert.equal(a.consejo!.guerra?.contra, b.id, `sigue en guerra al mes ${mes}`);
  }
  assert.ok(!m.cronica.some((c) => c.tipo === 'paz'), 'sin paces prematuras');
  // Pero si pasan dos años desde que empezó sin asaltos y el rencor sigue bajo, se enfría como siempre.
  m.t = a.consejo!.guerra!.desde + DIAS_ANIO * 2 + 30;
  repensarGuerra(m, a);
  assert.equal(a.consejo!.guerra, null, 'tras dos años sin asaltos, la paz');
  assert.ok(m.cronica.some((c) => c.tipo === 'paz' && c.texto.includes(b.nombre)));
});

test('la alianza y la reconciliación cambian las relaciones con coherencia', () => {
  const { m, a, b } = dosAldeas();
  const rel = relacion(m, a.id, b.id);
  // Venían de malas: un asalto viejo, rencor alto y algún agravio.
  rel.rencor = 0.6;
  rel.peor = 0.6;
  rel.agravio = 0.2;
  assert.equal(trato(m, a, b), 'hostiles');
  let reconcilian = -1;
  let alianza = -1;
  for (let k = 0; k < 400 && alianza < 0; k++) {
    m.t += 15;
    convivir(m, a, b, 0, 0);
    // (Cada mes, los agravios se van olvidando muy despacio.)
    if (k % 2) diplomacia(m, indexar(m));
    assert.ok(rel.rencor >= Math.min(0.6, (rel.agravio ?? 0) * 0.5) - 0.006, 'el agravio no deja que el rencor baje del todo');
    if (reconcilian < 0 && m.cronica.some((c) => c.texto.includes('se reconcilian'))) reconcilian = k;
    if (rel.alianza) alianza = k;
  }
  assert.ok(reconcilian >= 0, 'con el trato, se reconcilian');
  assert.ok(alianza > reconcilian, `y después (no antes) se alían: ${reconcilian} → ${alianza}`);
  assert.equal(trato(m, a, b), 'aliados');
  // La alianza protege: un tercero que ataque a B se encuentra con A.
  const [cx, cy] = [b.x + (b.x - a.x), b.y + (b.y - a.y)];
  const c = nuevaAldea(m, Math.max(1, Math.min(m.ancho - 2, cx)), Math.max(1, Math.min(m.alto - 2, cy)), 'Tercera', null);
  for (let k = 0; k < 12; k++) nuevaPersona(m, { aldea: c, nace: m.t - (20 + k) * 120 });
  consejo(m, c, 0.8);
  const ix = indexar(m);
  const sin = fuerzas(m, c, b, gente(m, c), defensoresDe(m, gente(m, b)), []);
  const r = combatir(m, c, b, gente(m, c).filter((p) => edad(m, p) >= 16 && edad(m, p) <= 55), ix.porAldea.get(b.id)!, 'codicia');
  assert.ok(m.cronica.at(-1)!.texto.includes(`Acuden a defenderla sus aliados de ${a.nombre}`), m.cronica.at(-1)!.texto);
  assert.ok(sin.fB > 0 && r, 'combate hecho');
  assert.ok(relacion(m, c.id, a.id).rencor > 0, 'quien atacó a su aliada se gana el rencor de A');
  // Y ayudar en el hambre acerca (convivir con hambre en una y comida en la otra).
  const af = rel.afinidad;
  b.despensa.cereal = 0;
  a.despensa.cereal = 5000;
  convivir(m, a, b, 0, 0.8);
  assert.ok(rel.afinidad > af, `la ayuda en el hambre acerca: ${af} → ${rel.afinidad}`);
});

test('guardar y cargar conserva la diplomacia y las incursiones en marcha', () => {
  const { m, a, b } = dosAldeas();
  consejo(m, a, 0.8);
  const rel = relacion(m, a.id, b.id);
  rel.agravio = 0.3;
  rel.disputa = 0.4;
  rel.comercio = 12.5;
  rel.peor = 0.5;
  a.consejo!.guerra = { contra: b.id, desde: m.t, motivo: 'tierras', derrotas: 0, cansancio: 0.2 };
  lanzarIncursion(m, a, b, gente(m, a), 'tierras');
  avanzar(m, 2);
  assert.ok(m.incursiones?.length === 1 && m.personas.some((p) => p.viaje?.incursion !== undefined));
  const s = JSON.stringify(m);
  assert.equal(JSON.stringify(migrar(JSON.parse(s) as Mundo)), s, 'se carga tal cual');
  const seguido = migrar(JSON.parse(s) as Mundo);
  avanzar(seguido, 30);
  let partido = migrar(JSON.parse(s) as Mundo);
  avanzar(partido, 7);
  partido = migrar(JSON.parse(JSON.stringify(partido)) as Mundo);
  avanzar(partido, 23);
  assert.equal(JSON.stringify(partido), JSON.stringify(seguido));
  // Una incursión rota en el guardado: los guerreros vuelven a casa y lo que llevaban, también.
  const roto = JSON.parse(s) as Mundo;
  const inc = roto.incursiones![0];
  const llevan = comidaDe(inc.viveres);
  const casa = roto.aldeas.find((x) => x.id === inc.de)!;
  const antes = comidaTotal(casa);
  inc.dias = Number.NaN;
  const arreglado = migrar(roto);
  assert.equal(arreglado.incursiones!.length, 0);
  assert.ok(!arreglado.personas.some((p) => p.viaje?.incursion !== undefined), 'nadie queda en una incursión que no existe');
  assert.ok(Math.abs(comidaTotal(arreglado.aldeas.find((x) => x.id === inc.de)!) - antes - llevan) < 0.05, 'la comida vuelve a su despensa');
  assert.ok(arreglado.reparaciones!.some((r) => r.ruta.startsWith('incursiones')));
  assert.deepEqual(comprobar(arreglado), []);
});

test('décadas de vida: sin valores imposibles, sin incursiones repetidas y sin guerras eternas', () => {
  for (const semilla of [11, 23]) {
    const m = crearMundo(semilla);
    let peor = 0;
    for (let anio = 0; anio < 40; anio++) {
      avanzar(m, DIAS_ANIO);
      assert.deepEqual(comprobar(m), [], `semilla ${semilla}, año ${anio}`);
      const parejas = (m.incursiones ?? []).map((x) => `${x.de}-${x.contra}`);
      assert.equal(new Set(parejas).size, parejas.length, 'una sola incursión por pareja');
      for (const x of m.incursiones ?? []) assert.ok(m.t - x.salida < 120, `una incursión no dura para siempre (${m.t - x.salida} días)`);
      for (const a of m.aldeas) {
        const g = a.consejo?.guerra;
        if (g) peor = Math.max(peor, m.t - g.desde);
      }
      for (const r of Object.values(m.relaciones)) for (const v of [r.afinidad, r.rencor, r.agravio ?? 0, r.disputa ?? 0]) assert.ok(v >= 0 && v <= 1);
    }
    assert.ok(peor < 15 * DIAS_ANIO, `semilla ${semilla}: ninguna guerra dura más de 15 años (la más larga, ${Math.round(peor / DIAS_ANIO)})`);
    // Los guerreros vivos están todos en una incursión que existe.
    const enIncursion = new Set((m.incursiones ?? []).flatMap((x) => x.gente));
    for (const p of m.personas) if (p.viaje?.incursion !== undefined) assert.ok(enIncursion.has(p.id));
  }
});
