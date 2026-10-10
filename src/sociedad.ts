// La vida en común: charlas al anochecer (donde se aprende a hablar, se enseña
// y se comparten ideas), parejas, nacimientos, salud, peligros, aldeas que se
// dividen y encuentros entre aldeas.

import { azar, barajar, elegir, prob } from './azar.ts';
import { DIAS_ANIO, EDAD_ADULTA } from './config.ts';
import { BASICOS, CONCEPTOS_VIDA, PANTANO, TECNICA } from './catalogo.ts';
import { anotar } from './cronica.ts';
import { comidaTotal, conoce, guardar, necesidad, tiene } from './economia.ts';
import { lexicoComun, nombrar, parecido } from './lenguaje.ts';
import { buscarSitio, direccion, masas, puntuarSitio } from './mapa.ts';
import { distancia, exponencial } from './matematicas.ts';
import { aldeasVivas, edad, nuevaAldea, nuevaPersona, type Indices } from './mundo.ts';
import { asaltar, boda, convivir, enGuerra, persuadir, quiereAsaltar } from './politica.ts';
import { compartirIdea, ensenar, escribir, leer } from './saber.ts';
import type { Aldea, Mundo, Persona } from './tipos.ts';

const r2 = (x: number) => Math.round(x * 100) / 100;

const TEMAS: Record<string, string[]> = {
  recolectar: ['bayas', 'semillas', 'fibra', 'hierbas', 'comida'],
  cazar: ['carne', 'piel', 'hueso', 'lobo', 'lanza'],
  pescar: ['pescado', 'agua', 'red'],
  lenar: ['madera', 'hacha'],
  picar: ['piedra', 'malaquita', 'casiterita', 'hematites'],
  barro: ['arcilla', 'vasija'],
  cultivar: ['semillas', 'cereal', 'tierra', 'campo'],
  pastorear: ['cria', 'corral'],
  construir: ['casa', 'madera', 'piedra'],
  jugar: ['madre', 'padre', 'sol', 'luna', 'agua', 'amigo'],
  descansar: ['casa', 'comida', 'cielo', 'muerte'],
};

/** De qué se habla: de lo que uno ha hecho hoy, de lo que sabe o de la vida. */
function tema(p: Persona, a: Aldea): string {
  const r = azar();
  if (r < 0.4) {
    const t = TEMAS[p.actividad];
    if (t) {
      const c = elegir(t);
      if (BASICOS.includes(c) || CONCEPTOS_VIDA.includes(c) || a.vistos.includes(c) || p.saberes.includes(c)) return c;
    }
  }
  if (r < 0.65 && p.saberes.length) return elegir(p.saberes);
  const todos = [...BASICOS, ...CONCEPTOS_VIDA, ...a.vistos];
  return elegir(todos);
}

function parientes(a: Persona, b: Persona): boolean {
  return (
    a.padre === b.id ||
    a.madre === b.id ||
    b.padre === a.id ||
    b.madre === a.id ||
    (a.madre !== null && a.madre === b.madre) ||
    (a.padre !== null && a.padre === b.padre)
  );
}

function conversar(m: Mundo, p: Persona, q: Persona, ap: Aldea, aq: Aldea, ix: Indices): string | null {
  const eq = edad(m, q);
  nombrar(m.fonologia, p, q, tema(p, ap), eq < 10);
  let aprendido: string | null = null;
  if (prob(0.35)) {
    const padre = q.padre === p.id || q.madre === p.id;
    aprendido = ensenar(m, p, q, aq, eq < 10, cultura(aq) * (padre && eq < 16 ? 1.5 : 1));
  }
  const ep = edad(m, p);
  if (ep >= EDAD_ADULTA && eq >= EDAD_ADULTA && prob(0.15)) compartirIdea(p, q, aq);
  persuadir(m, p, q);
  if (prob(0.1)) escribir(p, ap);
  if (
    p.pareja === null &&
    q.pareja === null &&
    p.sexo !== q.sexo &&
    ep >= 16 &&
    eq >= 16 &&
    Math.abs(ep - eq) < 15 &&
    !parientes(p, q) &&
    prob(0.04 * (0.5 + (p.genes.sociabilidad + q.genes.sociabilidad) / 2))
  ) {
    p.pareja = q.id;
    q.pareja = p.id;
    if (p.aldea !== q.aldea) {
      boda(m, ap.id, aq.id);
      // Uno de los dos se muda a la aldea del otro, y se lleva lo que sabe.
      const [quien, destino, origen] = prob(0.5) ? [p, aq, ap] : [q, ap, aq];
      quien.aldea = destino.id;
      quien.x = destino.x;
      quien.y = destino.y;
      const lista = ix.porAldea.get(origen.id);
      if (lista && lista.includes(quien)) lista.splice(lista.indexOf(quien), 1);
      ix.porAldea.get(destino.id)?.push(quien);
      for (const s of quien.saberes) if (!destino.conocidos.includes(s)) destino.conocidos.push(s);
    }
  }
  return aprendido;
}

/** Al anochecer: charlas, parejas y nacimientos. */
export function anochecer(m: Mundo, ix: Indices): void {
  for (const a of aldeasVivas(m)) {
    const gente = ix.porAldea.get(a.id) ?? [];
    if (gente.length < 2) continue;
    const hoguera = tiene(a, 'hoguera');
    for (const p of gente.slice()) {
      const e = edad(m, p);
      if (e < 2) continue;
      const charlas = e < 12 ? 2 : hoguera ? 2 : 1;
      for (let k = 0; k < charlas; k++) {
        let q: Persona | undefined;
        if (e < 12 && prob(0.7)) q = ix.porId.get(prob(0.5) ? (p.madre ?? -1) : (p.padre ?? -1));
        if (!q || q.aldea !== a.id) q = elegir(gente);
        if (q === p) continue;
        // Normalmente habla el mayor (los niños escuchan); a veces al revés.
        if (edad(m, q) > e || prob(0.3)) conversar(m, q, p, a, a, ix);
        else conversar(m, p, q, a, a, ix);
      }
      if (prob(0.03)) leer(p, a);
    }
    nacimientos(m, a, gente, ix);
  }
}

export function limiteAldea(a: Aldea): number {
  return (a.consejo?.prioridad === 'expandir' ? 0.75 : 1) * (
    32 +
    (conoce(a, 'campo') ? 25 : 0) +
    (tiene(a, 'casa') ? 10 : 0) +
    (conoce(a, 'escritura') ? 15 : 0) +
    (conoce(a, 'tambor') ? 5 : 0) +
    (conoce(a, 'pintura') ? 5 : 0) +
    (conoce(a, 'comercio') ? 10 : 0)
  );
}

const cultura = (a: Aldea) =>
  (conoce(a, 'tambor') ? 1.2 : 1) * (conoce(a, 'pintura') ? 1.15 : 1) * (conoce(a, 'escritura') ? 1.2 : 1) * (a.consejo?.prioridad === 'saber' ? 1.4 : 1);

function nacimientos(m: Mundo, a: Aldea, gente: Persona[], ix: Indices): void {
  const densidad = Math.max(0.03, 1 - gente.length / (limiteAldea(a) * 1.4));
  for (const madre of gente) {
    if (madre.sexo !== 'M' || madre.pareja === null || madre.muerto) continue;
    const e = edad(m, madre);
    if (e < 16 || e > 44 || m.t - madre.ultimoParto < DIAS_ANIO) continue;
    const padre = ix.porId.get(madre.pareja);
    if (!padre || padre.aldea !== a.id || padre.muerto) continue;
    const fertil = 0.5 + (madre.genes.fertilidad + padre.genes.fertilidad) / 2;
    const p = (fertil / (DIAS_ANIO * 2.2)) * (madre.reservas > 3 ? 1 : 0.25) * (conoce(a, 'cerveza') ? 1.1 : 1) * densidad;
    if (!prob(p)) continue;
    const hijo = nuevaPersona(m, { aldea: a, nace: m.t, padre, madre });
    hijo.salud = 0.8;
    hijo.reservas = 4;
    madre.ultimoParto = m.t;
    madre.hijos++;
    padre.hijos++;
    m.anual.nacimientos++;
    if (prob(0.02 * (conoce(a, 'remedio') ? 0.6 : 1) * (conoce(a, 'medicina') ? 0.5 : 1))) morir(madre, 'parto');
  }
}

export function morir(p: Persona, causa: string): void {
  if (!p.muerto) p.muerto = causa;
}

export function danar(p: Persona, x: number, causa: string): void {
  p.salud = r2(p.salud - x);
  p.causa = causa;
}

/** Frío, enfermedades y vejez. */
export function salud(m: Mundo, a: Aldea, gente: Persona[], est: number, hogueraEncendida: boolean): void {
  const n = gente.length;
  if (!n) return;
  const remedio = conoce(a, 'remedio');
  const medicina = conoce(a, 'medicina');
  const cura = (remedio ? 0.6 : 1) * (medicina ? 0.6 : 1);
  let refugio = 0;
  if (est === 3) {
    const casas = Math.min(n, a.edificios.filter((e) => e.tipo === 'casa').length * 7);
    const chozas = Math.min(n - casas, a.edificios.filter((e) => e.tipo === 'choza').length * 5);
    refugio = (casas * 0.5 + chozas * 0.35) / n;
  }
  const pieles = (a.despensa.piel ?? 0) > 0;
  for (const p of gente) {
    const e = edad(m, p);
    if (est === 3) {
      let abrigo = refugio + (hogueraEncendida ? 0.3 : 0);
      if (pieles && p.saberes.includes('ropa')) {
        abrigo += 0.25;
        a.despensa.piel = r2(Math.max(0, a.despensa.piel - 0.01));
      }
      if (p.saberes.includes('tela') && (a.despensa.fibra ?? 0) > 0) abrigo += 0.1;
      const expuesto = Math.max(0, 1 - abrigo);
      const vulnerable = (e < 5 || e > 60 ? 1.6 : 1) * (1.25 - 0.5 * p.genes.resistencia);
      if (expuesto > 0) danar(p, 0.005 * expuesto * vulnerable, 'frío');
    }
    if (prob(0.0005 * (1 + n / 80))) danar(p, (0.15 + 0.2 * azar()) * cura * (1.25 - 0.5 * p.genes.resistencia), 'enfermedad');
    let riesgo = 0.0006 * exponencial(0.085 * e * (1.25 - 0.5 * p.genes.longevidad));
    if (e < 3) riesgo += 0.1 * (remedio ? 0.7 : 1) * (medicina ? 0.7 : 1) * (hogueraEncendida ? 0.85 : 1);
    if (prob(riesgo / DIAS_ANIO)) morir(p, e > 50 ? 'vejez' : 'enfermedad');
    if (p.reservas > 1 && p.salud < 1) p.salud = r2(Math.min(1, p.salud + 0.01 + (remedio ? 0.004 : 0) + (medicina ? 0.004 : 0)));
    if (p.salud <= 0) morir(p, p.causa || 'enfermedad');
  }
}

/** Epidemias (las fieras viven ahora en el mapa: ver fauna.ts). Los pantanos traen fiebres. */
export function peligros(m: Mundo, a: Aldea, gente: Persona[], diaDelAnio: number): void {
  if (!gente.length) return;
  if (m.terreno[a.y * m.ancho + a.x] === PANTANO && prob(0.0015)) {
    const cura = (conoce(a, 'remedio') ? 0.6 : 1) * (conoce(a, 'medicina') ? 0.6 : 1);
    const p = elegir(gente);
    danar(p, 0.25 * cura * (1.25 - 0.5 * p.genes.resistencia), 'enfermedad');
  }
  if (diaDelAnio === 90 && prob(0.05 * Math.min(3, gente.length / 40))) {
    const cura = (conoce(a, 'remedio') ? 0.6 : 1) * (conoce(a, 'medicina') ? 0.6 : 1);
    for (const p of gente) if (prob(0.5)) danar(p, 0.3 * cura * (1.25 - 0.5 * p.genes.resistencia), 'enfermedad');
    anotar(m, 'epidemia', `Unas fiebres se extienden por ${a.nombre}.`, a.id);
  }
}

function diasDeComida(m: Mundo, a: Aldea, gente: Persona[]): number {
  const consumo = gente.reduce((s, p) => s + necesidad(m, p), 0);
  return comidaTotal(a) / Math.max(1, consumo);
}

/**
 * Antes de cultivar, un grupo que ha agotado lo que hay alrededor recoge el
 * campamento y se va a un sitio mejor. Lo que construyeron queda en ruinas.
 */
export function trasladar(m: Mundo, a: Aldea, gente: Persona[]): void {
  if (!gente.length || m.t - a.movida < DIAS_ANIO) return;
  if (a.edificios.some((e) => e.tipo === 'campo' || e.tipo === 'corral') || a.obra?.tipo === 'campo') return;
  if (diasDeComida(m, a, gente) > 15 && a.consejo?.prioridad !== 'expandir') return;
  const sitio = buscarSitio(m, a, 4, 14, a.id, conoce(a, 'canoa'));
  if (!sitio || puntuarSitio(m, sitio.x, sitio.y) < puntuarSitio(m, a.x, a.y) * 1.5) return;
  for (const e of a.edificios) m.ruinas.push({ tipo: e.tipo, x: e.x, y: e.y });
  if (m.ruinas.length > 400) m.ruinas.splice(0, m.ruinas.length - 400);
  const hacia = direccion(a, sitio.x, sitio.y);
  a.edificios = [];
  a.obra = null;
  a.x = sitio.x;
  a.y = sitio.y;
  a.movida = m.t;
  for (const p of gente) {
    p.x = a.x;
    p.y = a.y;
  }
  anotar(m, 'traslado', `Los de ${a.nombre} recogen el campamento y se van hacia ${hacia} en busca de comida.`, a.id);
}

/** Una aldea demasiado grande se divide: un grupo se va a fundar otra. */
export function dividir(m: Mundo, a: Aldea, gente: Persona[], ix: Indices): void {
  const crisis = gente.length >= 20 && diasDeComida(m, a, gente) < 8;
  if ((gente.length <= limiteAldea(a) && !crisis) || !prob(0.35)) return;
  const adultos = gente.filter((p) => {
    const e = edad(m, p);
    return e >= 18 && e <= 45 && !p.muerto;
  });
  if (adultos.length < 4) return;
  let lider = adultos[0];
  let mejor = -1;
  for (const p of adultos) {
    const v = p.genes.curiosidad + 0.5 * azar();
    if (v > mejor) {
      mejor = v;
      lider = p;
    }
  }
  // Con canoas, un grupo puede irse a vivir a una isla.
  const sitio = buscarSitio(m, a, 8, 22, null, conoce(a, 'canoa'));
  if (!sitio) return;
  const grupo = new Set<Persona>();
  const familia = (p: Persona) => {
    grupo.add(p);
    const pareja = p.pareja !== null ? ix.porId.get(p.pareja) : undefined;
    if (pareja && pareja.aldea === a.id) grupo.add(pareja);
    for (const h of gente) if ((h.padre === p.id || h.madre === p.id) && edad(m, h) < 16) grupo.add(h);
  };
  familia(lider);
  for (const p of barajar(adultos.slice())) {
    if (grupo.size >= gente.length * 0.38) break;
    if (!grupo.has(p) && prob(0.6)) familia(p);
  }
  const b = nuevaAldea(m, sitio.x, sitio.y, lider.nombre, a.id);
  const parte = grupo.size / gente.length;
  for (const [k, v] of Object.entries(a.despensa)) {
    const lleva = r2(v * parte);
    b.despensa[k] = lleva;
    a.despensa[k] = r2(v - lleva);
  }
  b.vistos = a.vistos.slice();
  const escriben = [...grupo].some((p) => p.saberes.includes('escritura'));
  if (escriben) b.archivo = a.archivo.slice();
  for (const p of grupo) {
    p.aldea = b.id;
    p.x = b.x;
    p.y = b.y;
    for (const s of p.saberes) if (!b.conocidos.includes(s)) b.conocidos.push(s);
  }
  b.poblacionMax = grupo.size;
  // Los que se quedan: ¿siguen sabiendo todo lo que sabían?
  const quedan = gente.filter((p) => !grupo.has(p));
  a.conocidos = a.conocidos.filter((s) => quedan.some((p) => p.saberes.includes(s)) || a.archivo.includes(s));
  anotar(
    m,
    'fundacion',
    `${lider.nombre} guió a ${grupo.size} personas de ${a.nombre} hacia ${direccion(a, b.x, b.y)}. Allí fundaron ${b.nombre}.`,
    b.id,
  );
}

/** Aldeas cercanas se visitan (o se asaltan): se aprenden palabras y saberes, surgen parejas y rencores. */
export function encuentros(m: Mundo, ix: Indices, escasez: Map<number, number>): void {
  const vivas = aldeasVivas(m);
  const { masa } = masas(m);
  for (let i = 0; i < vivas.length; i++) {
    for (let j = i + 1; j < vivas.length; j++) {
      const a = vivas[i];
      const b = vivas[j];
      const ga = ix.porAldea.get(a.id) ?? [];
      const gb = ix.porAldea.get(b.id) ?? [];
      if (!ga.length || !gb.length) continue;
      // Sin barcas no se cruza el agua: la gente de las islas vive aparte.
      if (masa[a.y * m.ancho + a.x] !== masa[b.y * m.ancho + b.x] && !conoce(a, 'canoa') && !conoce(b, 'canoa')) continue;
      // En guerra se va a buscar al enemigo más lejos y más a menudo.
      const guerra = enGuerra(a, b) || enGuerra(b, a);
      const alcance = 18 + alcanceExtra(a) + alcanceExtra(b) + (guerra ? 8 : 0);
      const d = distancia(a.x - b.x, a.y - b.y);
      if (d > alcance || !prob((guerra ? 0.55 : 0.35) * (tiene(a, 'mercado') && tiene(b, 'mercado') ? 2 : 1))) continue;
      const ea = escasez.get(a.id) ?? 0;
      const eb = escasez.get(b.id) ?? 0;
      const motivoA = quiereAsaltar(m, a, b, ga, gb, ea, ix.porId);
      if (motivoA) {
        asaltar(m, a, b, ga, gb, motivoA);
        continue;
      }
      const motivoB = quiereAsaltar(m, b, a, gb, ga, eb, ix.porId);
      if (motivoB) {
        asaltar(m, b, a, gb, ga, motivoB);
        continue;
      }
      const clave = `${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`;
      if (!m.contactos.includes(clave)) {
        m.contactos.push(clave);
        anotar(m, 'contacto', `Gente de ${a.nombre} y de ${b.nombre} se encuentra por primera vez.`, a.id);
      }
      for (let k = 0; k < 3 && ga.length && gb.length; k++) {
        visita(m, elegir(ga), elegir(gb), a, b, ix);
        if (ga.length && gb.length) visita(m, elegir(gb), elegir(ga), b, a, ix);
      }
      truequear(a, b);
      convivir(m, a, b, ea, eb);
      if (conoce(a, 'comercio') && conoce(b, 'comercio')) comerciar(a, b, ga.length, gb.length);
    }
  }
}

function alcanceExtra(a: Aldea): number {
  return (conoce(a, 'rueda') ? 4 : 0) + (conoce(a, 'carro') ? 8 : 0) + (conoce(a, 'vela') ? 10 : 0) + (conoce(a, 'comercio') ? 6 : 0);
}

function visita(m: Mundo, p: Persona, q: Persona, ap: Aldea, aq: Aldea, ix: Indices): void {
  if (edad(m, p) < EDAD_ADULTA || edad(m, q) < EDAD_ADULTA) return;
  const antes = aq.conocidos.length;
  const aprendido = conversar(m, p, q, ap, aq, ix);
  if (aprendido && aq.conocidos.length > antes) {
    const t = TECNICA[aprendido];
    anotar(m, 'difusion', `${t.nombre} llega a ${aq.nombre}: ${q.nombre} lo aprendió de ${p.nombre}, de ${ap.nombre}.`, aq.id);
  }
}

const TRUEQUE = ['piedra', 'arcilla', 'piel', 'hueso', 'fibra', 'hierbas', 'malaquita', 'casiterita', 'hematites', 'cria'];

/** Al encontrarse se intercambian un poco de lo que a los otros les falta: así viajan las piedras raras. */
function truequear(a: Aldea, b: Aldea): void {
  for (const [da, db] of [
    [a, b],
    [b, a],
  ]) {
    for (const mat of TRUEQUE) {
      const hay = da.despensa[mat] ?? 0;
      if (hay < 4 || (db.despensa[mat] ?? 0) >= 1) continue;
      const n = r2(Math.min(2, hay * 0.25));
      da.despensa[mat] = r2(hay - n);
      guardar(db, mat, n);
    }
  }
}

function comerciar(a: Aldea, b: Aldea, na: number, nb: number): void {
  const ca = comidaTotal(a) / na;
  const cb = comidaTotal(b) / nb;
  const [rica, pobre] = ca > cb ? [a, b] : [b, a];
  for (const mat of ['cereal', 'semillas', 'carne', 'pescado']) {
    const v = rica.despensa[mat] ?? 0;
    const pasa = r2(v * 0.1 * Math.min(1, Math.abs(ca - cb) / Math.max(ca, cb, 1)));
    if (pasa <= 0) continue;
    rica.despensa[mat] = r2(v - pasa);
    pobre.despensa[mat] = r2((pobre.despensa[mat] ?? 0) + pasa);
  }
}

/** Una vez al año: ¿las lenguas de aldeas que se conocen se han separado? */
export function vigilarLenguas(m: Mundo, ix: Indices): void {
  const vivas = aldeasVivas(m).filter((a) => (ix.porAldea.get(a.id)?.length ?? 0) >= 5);
  const lexicos = new Map(vivas.map((a) => [a.id, lexicoComun(ix.porAldea.get(a.id) ?? [])]));
  for (let i = 0; i < vivas.length; i++) {
    for (let j = i + 1; j < vivas.length; j++) {
      const a = vivas[i];
      const b = vivas[j];
      const clave = `${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`;
      if (m.lenguasSeparadas.includes(clave)) continue;
      const sim = parecido(lexicos.get(a.id)!, lexicos.get(b.id)!);
      if (sim < 0.45) {
        m.lenguasSeparadas.push(clave);
        anotar(m, 'lengua', `En ${a.nombre} y en ${b.nombre} ya hablan lenguas distintas: apenas se entienden.`, a.id);
      }
    }
  }
}
