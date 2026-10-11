// La vida en común: charlas al anochecer (donde se aprende a hablar, se enseña
// y se comparten ideas), parejas, nacimientos, salud, peligros, aldeas que se
// dividen y encuentros entre aldeas.

import { azar, barajar, elegir, prob } from './azar.ts';
import { DIAS_ANIO, EDAD_ADULTA } from './config.ts';
import { ABRIGO_CASA, BASICOS, CONCEPTOS_VIDA, EDIFICIO, PANTANO, TECNICA } from './catalogo.ts';
import { anotar } from './cronica.ts';
import { edadSegun } from './edades.ts';
import { cargar, partir } from './exodo.ts';
import { comidaTotal, conoce, guardar, necesidad, tiene } from './economia.ts';
import { lexicoComun, nombrar, parecido } from './lenguaje.ts';
import { buscarSitio, direccion, masas, puntuarSitio } from './mapa.ts';
import { distancia, exponencial } from './matematicas.ts';
import { aldeasVivas, edad, nuevaAldea, nuevaPersona, type Indices } from './mundo.ts';
import { asaltar, boda, convivir, enGuerra, persuadir, quiereAsaltar } from './politica.ts';
import { compartirIdea, ensenar, escribir, leer } from './saber.ts';
import { acercarse } from './individuo.ts';
import { afamar, hito, lazo, tratar } from './memoria.ts';
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
  // Quien quiere aprender algo concreto pregunta más.
  if (prob(q.meta?.tipo === 'aprender' ? 0.6 : 0.35)) {
    const padre = q.padre === p.id || q.madre === p.id;
    aprendido = ensenar(m, p, q, aq, eq < 10, cultura(aq) * (padre && eq < 16 ? 1.5 : 1));
    // Al alumno le queda el agradecimiento; al maestro, el aprecio.
    if (aprendido && !padre) tratar(q, p, 0.06, 0.03);
  }
  const ep = edad(m, p);
  if (ep >= EDAD_ADULTA && eq >= EDAD_ADULTA && prob(0.15)) {
    compartirIdea(p, q, aq);
    tratar(p, q, 0.02);
  }
  // Si piensan distinto y alguno tiene genio, discuten: así nacen las rivalidades.
  if (ep >= 16 && eq >= 16 && p.opinion !== q.opinion && prob(0.06 * (p.genes.agresividad + q.genes.agresividad) * (1.2 - 0.4 * q.genes.paciencia))) tratar(p, q, -0.06);
  // Quien quiere hacer las paces da el primer paso.
  if (p.meta?.tipo === 'reconciliar' && p.meta.ref === q.id) acercarse(p, q);
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
    lazo(p, q.id) > -0.3 &&
    prob(
      0.04 *
        (0.5 + (p.genes.sociabilidad + q.genes.sociabilidad) / 2) *
        (p.meta?.tipo === 'familia' || q.meta?.tipo === 'familia' ? 2 : 1) *
        (1 + Math.max(0, lazo(p, q.id))),
    )
  ) {
    p.pareja = q.id;
    q.pareja = p.id;
    tratar(p, q, 0.6);
    hito(m, p, 'pareja', q.nombre);
    hito(m, q, 'pareja', p.nombre);
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

/**
 * Con quién se habla esta noche: a veces con quien le enseña lo que quiere aprender, con
 * quien quiere hacer las paces o con un amigo; si no, con cualquiera.
 */
function companero(p: Persona, gente: Persona[], ix: Indices): Persona | undefined {
  const meta = p.meta;
  if (meta?.tipo === 'aprender' && typeof meta.ref === 'string' && prob(0.5)) {
    const s = meta.ref;
    const maestros = gente.filter((q) => q !== p && q.saberes.includes(s));
    if (maestros.length) return elegir(maestros);
  }
  if (meta?.tipo === 'reconciliar' && typeof meta.ref === 'number' && prob(0.5)) return ix.porId.get(meta.ref);
  if (p.lazos?.length && prob(0.2)) {
    const amigos = p.lazos.filter(([, v]) => v > 0.2);
    if (amigos.length) return ix.porId.get(elegir(amigos)[0]);
  }
  return undefined;
}

/** Al anochecer: charlas, parejas y nacimientos. */
export function anochecer(m: Mundo, ix: Indices): void {
  for (const a of aldeasVivas(m)) {
    const gente = ix.porAldea.get(a.id) ?? [];
    if (gente.length < 2) continue;
    const hoguera = tiene(a, 'hoguera');
    for (const p of gente.slice()) {
      const e = edad(m, p);
      if (e < 2 || p.mudanza) continue;
      const charlas = e < 12 ? 2 : hoguera ? 2 : 1;
      for (let k = 0; k < charlas; k++) {
        let q: Persona | undefined;
        if (e < 12 && prob(0.7)) q = ix.porId.get(prob(0.5) ? (p.madre ?? -1) : (p.padre ?? -1));
        else q = companero(p, gente, ix);
        if (!q || q.aldea !== a.id || q.mudanza) q = elegir(gente);
        if (q === p || q.mudanza) continue;
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
    (tiene(a, 'casa') || tiene(a, 'casapiedra') || tiene(a, 'casatejas') ? 10 : 0) +
    (tiene(a, 'plaza') ? 8 : 0) +
    (tiene(a, 'templo') ? 10 : 0) +
    (tiene(a, 'calzada') ? 8 : 0) +
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
    if (madre.hijos === 1) hito(m, madre, 'hijo', hijo.nombre);
    if (padre.hijos === 1) hito(m, padre, 'hijo', hijo.nombre);
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
    // Se reparten bajo techo empezando por las casas que mejor abrigan.
    let quedan = n;
    const casas = a.edificios.filter((e) => ABRIGO_CASA[e.tipo]).sort((x, y) => ABRIGO_CASA[y.tipo] - ABRIGO_CASA[x.tipo]);
    for (const e of casas) {
      if (quedan <= 0) break;
      const k = Math.min(quedan, EDIFICIO[e.tipo].aloja ?? 0);
      refugio += k * ABRIGO_CASA[e.tipo];
      quedan -= k;
    }
    refugio /= n;
  }
  const pieles = (a.despensa.piel ?? 0) > 0 || (a.despensa.lana ?? 0) > 0;
  for (const p of gente) {
    const e = edad(m, p);
    if (est === 3) {
      let abrigo = refugio + (hogueraEncendida ? 0.3 : 0);
      if (pieles && p.saberes.includes('ropa')) {
        // La lana abriga más que las pieles; se gasta primero.
        const lana = (a.despensa.lana ?? 0) > 0;
        abrigo += lana ? 0.32 : 0.25;
        if (lana) a.despensa.lana = r2(Math.max(0, a.despensa.lana - 0.01));
        else a.despensa.piel = r2(Math.max(0, a.despensa.piel - 0.01));
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
  if (!gente.length || a.viaje || m.t - a.movida < DIAS_ANIO) return;
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
  if (a.viaje) return;
  const crisis = gente.length >= 20 && diasDeComida(m, a, gente) < 8;
  // Quien sueña con fundar su propio pueblo empuja a irse antes de que no quepan.
  const fundadores = gente.filter((p) => p.meta?.tipo === 'fundar' && !p.muerto);
  const empuje = fundadores.length > 0 && gente.length > limiteAldea(a) * 0.75 && prob(0.25);
  if ((gente.length <= limiteAldea(a) && !crisis && !empuje) || !prob(0.35)) return;
  const adultos = gente.filter((p) => {
    const e = edad(m, p);
    return e >= 18 && e <= 45 && !p.muerto;
  });
  if (adultos.length < 4) return;
  let lider = adultos[0];
  let mejor = -1;
  for (const p of adultos) {
    // Guía quien más lo desea (y quien tiene fama y ganas); si nadie, el más inquieto.
    const v = (p.meta?.tipo === 'fundar' ? 2 : 0) + p.genes.ambicion * 0.6 + p.genes.curiosidad * 0.4 + 0.1 * (p.fama ?? 0) + 0.5 * azar();
    if (v > mejor) {
      mejor = v;
      lider = p;
    }
  }
  // Con canoas, un grupo puede irse a vivir a una isla.
  const sitio = buscarSitio(m, a, 10, 30, null, conoce(a, 'canoa'));
  if (!sitio) return;
  const grupo = new Set<Persona>();
  const familia = (p: Persona) => {
    grupo.add(p);
    const pareja = p.pareja !== null ? ix.porId.get(p.pareja) : undefined;
    if (pareja && pareja.aldea === a.id) grupo.add(pareja);
    for (const h of gente) if ((h.padre === p.id || h.madre === p.id) && edad(m, h) < 16) grupo.add(h);
  };
  familia(lider);
  // Le siguen primero sus amigos; luego, otros.
  for (const [id, v] of lider.lazos ?? []) {
    const q = ix.porId.get(id);
    if (v > 0.3 && q && q.aldea === a.id && edad(m, q) >= 16 && grupo.size < gente.length * 0.38) familia(q);
  }
  for (const p of barajar(adultos.slice())) {
    if (grupo.size >= gente.length * 0.38) break;
    if (!grupo.has(p) && prob(0.6)) familia(p);
  }
  const b = nuevaAldea(m, a.x, a.y, lider.nombre, a.id);
  b.valor = 'expandir';
  cargar(a, b, grupo.size, grupo.size / gente.length);
  b.vistos = a.vistos.slice();
  const escriben = [...grupo].some((p) => p.saberes.includes('escritura'));
  if (escriben) b.archivo = a.archivo.slice();
  for (const p of grupo) {
    p.aldea = b.id;
    for (const s of p.saberes) if (!b.conocidos.includes(s)) b.conocidos.push(s);
  }
  partir(m, b, a, sitio, grupo);
  b.edad = edadSegun(b);
  b.edades = (a.edades ?? []).slice(0, b.edad + 1);
  b.poblacionMax = grupo.size;
  hito(m, lider, 'funda', b.nombre);
  afamar(lider, 2);
  if (lider.meta?.tipo === 'fundar') lider.meta = null;
  for (const p of grupo) if (p !== lider && edad(m, p) >= 14) hito(m, p, 'se va', b.nombre);
  // Los que se quedan: ¿siguen sabiendo todo lo que sabían?
  const quedan = gente.filter((p) => !grupo.has(p));
  a.conocidos = a.conocidos.filter((s) => quedan.some((p) => p.saberes.includes(s)) || a.archivo.includes(s));
  anotar(
    m,
    'fundacion',
    lider.meta?.tipo === 'fundar'
      ? `${lider.nombre} llevaba tiempo soñando con un pueblo propio: deja ${a.nombre} con ${grupo.size - 1} personas que confían en ${lider.sexo === 'M' ? 'ella' : 'él'} y se pone en camino hacia ${direccion(a, sitio.x, sitio.y)} para fundar ${b.nombre}.`
      : `Ya no caben todos en ${a.nombre}: ${lider.nombre} se pone en camino hacia ${direccion(a, sitio.x, sitio.y)} con ${grupo.size} personas para fundar ${b.nombre}.`,
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
