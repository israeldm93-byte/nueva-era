// Los aldeanos en 3D: cuerpo articulado (cadera, torso, cuello y cabeza con cara,
// brazos y piernas de dos tramos, manos y pies), peinados y barbas, ropa según lo que
// sabe su aldea (taparrabos, pieles cosidas, túnicas teñidas del color de su pueblo),
// capa y diadema para el consejo, herramientas y antorchas. Cada uno va a trabajar,
// trabaja a su manera y por la noche vuelve al fuego. Todo se dibuja con instancias.

import * as THREE from 'three';
import { AGUA, B, C, Co, Cup, Do, Es, RIO, acotar, azar, entre, fundir, instancias, suave } from './util3d.js?v=__MOTOR__';

const PIELES = [0xf1c8a0, 0xe3b088, 0xc98f62, 0x9a6845, 0x734a2e, 0xf6d6b6, 0xd6a77c];
const PELOS = [0x2b1b10, 0x4a2f1b, 0x161616, 0x7a4a1e, 0xb88a4a, 0x5a3825, 0x8c5a2b];
const TINTES = [0xb03a2e, 0x2e6fb8, 0x2a8a4e, 0xc17d16, 0x7d3c98, 0xd35400, 0x16a085, 0x8e2c48];
const CUERO = [0x7b5230, 0x6a4526, 0x8a5e36, 0x5e3d22];

const NEGRO = 0x161210;
const MADERA = 0x6b4a2e;

function modelos() {
  const mano = -0.16;
  return {
    pelvis: fundir([{ geo: B(0.2, 0.11, 0.13), color: 0xffffff }]),
    muslo: fundir([{ geo: C(0.052, 0.042, 0.21, 6), color: 0xffffff, y: -0.105 }]),
    pierna: fundir([{ geo: C(0.041, 0.031, 0.2, 6), color: 0xffffff, y: -0.1 }]),
    pie: fundir([{ geo: B(0.066, 0.04, 0.12), color: 0xffffff, y: -0.02, z: 0.025 }]),
    torso: fundir([
      { geo: C(0.125, 0.1, 0.27, 7), color: 0xffffff, y: 0.135, sz: 0.68 },
      { geo: B(0.21, 0.025, 0.1), color: 0xb7a99a, y: 0.012 },
    ]),
    cabeza: fundir([
      { geo: C(0.032, 0.037, 0.075, 6), color: 0xffffff, y: 0.035 },
      { geo: Es(0.088, 9, 7), color: 0xffffff, y: 0.135, sy: 1.12, sz: 1.04 },
      { geo: Co(0.019, 0.045, 4), color: 0xf2e2d6, y: 0.128, z: 0.093, rx: Math.PI / 2 },
      { geo: B(0.024, 0.017, 0.012), color: NEGRO, x: -0.033, y: 0.152, z: 0.083 },
      { geo: B(0.024, 0.017, 0.012), color: NEGRO, x: 0.033, y: 0.152, z: 0.083 },
      { geo: B(0.034, 0.006, 0.012), color: 0x7a3328, y: 0.098, z: 0.083 },
      { geo: Es(0.022, 5, 4), color: 0xffffff, x: -0.088, y: 0.135, sz: 0.6 },
      { geo: Es(0.022, 5, 4), color: 0xffffff, x: 0.088, y: 0.135, sz: 0.6 },
    ]),
    peloCorto: fundir([{ geo: Cup(0.095, 10, 6, 0.56), color: 0xffffff, y: 0.135, z: -0.006, sy: 1.12, sz: 1.08, rx: -0.12 }]),
    peloLargo: fundir([
      { geo: Cup(0.096, 10, 6, 0.56), color: 0xffffff, y: 0.135, z: -0.006, sy: 1.12, sz: 1.08, rx: -0.12 },
      { geo: B(0.18, 0.24, 0.045), color: 0xffffff, y: 0.07, z: -0.072 },
      { geo: B(0.04, 0.16, 0.08), color: 0xffffff, x: -0.088, y: 0.09, z: -0.02 },
      { geo: B(0.04, 0.16, 0.08), color: 0xffffff, x: 0.088, y: 0.09, z: -0.02 },
    ]),
    peloMono: fundir([
      { geo: Cup(0.095, 10, 6, 0.56), color: 0xffffff, y: 0.135, z: -0.006, sy: 1.12, sz: 1.08, rx: -0.12 },
      { geo: Es(0.05, 7, 5), color: 0xffffff, y: 0.2, z: -0.075 },
    ]),
    peloTrenza: fundir([
      { geo: Cup(0.095, 10, 6, 0.56), color: 0xffffff, y: 0.135, z: -0.006, sy: 1.12, sz: 1.08, rx: -0.12 },
      { geo: C(0.024, 0.016, 0.26, 5), color: 0xffffff, y: 0.0, z: -0.095, rx: 0.12 },
      { geo: Es(0.026, 5, 4), color: 0xffffff, y: -0.13, z: -0.11 },
    ]),
    barba: fundir([
      { geo: Co(0.07, 0.11, 6), color: 0xffffff, y: 0.06, z: 0.055, rx: Math.PI, sz: 0.6 },
      { geo: B(0.15, 0.05, 0.08), color: 0xffffff, y: 0.098, z: 0.05 },
    ]),
    brazo: fundir([{ geo: C(0.036, 0.031, 0.16, 6), color: 0xffffff, y: -0.08 }]),
    antebrazo: fundir([
      { geo: C(0.03, 0.026, 0.15, 6), color: 0xffffff, y: -0.075 },
      { geo: Es(0.032, 6, 5), color: 0xffffff, y: mano, sx: 0.9, sz: 0.75 },
    ]),
    faldon: fundir([{ geo: C(0.112, 0.15, 0.2, 9), color: 0xffffff, y: -0.075, sz: 0.82 }]),
    capa: fundir([
      { geo: B(0.25, 0.36, 0.022), color: 0xffffff, y: 0.09, z: -0.085, rx: 0.12 },
      { geo: B(0.27, 0.05, 0.13), color: 0xffffff, y: 0.255, z: -0.02 },
    ]),
    diadema: fundir([
      { geo: C(0.097, 0.097, 0.025, 12, 1), color: 0xffffff, y: 0.165 },
      { geo: Co(0.016, 0.16, 4), color: 0xffffff, x: -0.035, y: 0.25, z: -0.075, rz: 0.25, rx: -0.3 },
      { geo: Co(0.016, 0.15, 4), color: 0xffffff, x: 0.03, y: 0.25, z: -0.08, rz: -0.2, rx: -0.35 },
    ]),
    cestaEspalda: fundir([
      { geo: C(0.105, 0.075, 0.2, 8), color: 0xffffff, y: 0.13, z: -0.13 },
      { geo: B(0.02, 0.2, 0.02), color: 0x5a3d22, x: -0.07, y: 0.17, z: -0.06 },
      { geo: B(0.02, 0.2, 0.02), color: 0x5a3d22, x: 0.07, y: 0.17, z: -0.06 },
    ]),
    // Herramientas: el origen es la muñeca; «hacia arriba» del antebrazo es +y.
    hacha: fundir([
      { geo: C(0.017, 0.017, 0.56, 5), color: MADERA, y: mano, z: 0.16, rx: Math.PI / 2 },
      { geo: B(0.035, 0.13, 0.1), color: 0xffffff, y: mano + 0.02, z: 0.41 },
    ]),
    lanza: fundir([
      { geo: C(0.014, 0.014, 1.4, 5), color: MADERA, y: mano + 0.18 },
      { geo: Co(0.035, 0.16, 5), color: 0xffffff, y: mano + 0.95 },
    ]),
    cesta: fundir([{ geo: C(0.1, 0.075, 0.14, 8), color: 0xb08a50, y: mano - 0.09 }]),
    // La caña sale de la mano en la dirección del antebrazo.
    cana: fundir([
      { geo: C(0.014, 0.008, 1.6, 4), color: MADERA, y: mano - 0.78, z: 0.05, rx: -0.06 },
      { geo: C(0.003, 0.003, 0.7, 3), color: 0xe8e8e8, y: mano - 1.55, z: -0.3, rx: 1.2 },
    ]),
    azada: fundir([
      { geo: C(0.017, 0.017, 0.8, 5), color: MADERA, y: mano + 0.12 },
      { geo: B(0.13, 0.03, 0.1), color: 0xffffff, y: mano - 0.27, z: 0.05 },
    ]),
    martillo: fundir([
      { geo: C(0.016, 0.016, 0.34, 5), color: MADERA, y: mano, z: 0.13, rx: Math.PI / 2 },
      { geo: B(0.11, 0.07, 0.08), color: 0xffffff, y: mano, z: 0.3 },
    ]),
    // La espada, de hoja recta como el hacha: hacia delante desde el puño.
    espada: fundir([
      { geo: C(0.016, 0.016, 0.13, 5), color: MADERA, y: mano, z: 0.01, rx: Math.PI / 2 },
      { geo: B(0.15, 0.024, 0.03), color: 0xb0a890, y: mano, z: 0.085 },
      { geo: B(0.01, 0.045, 0.52), color: 0xffffff, y: mano, z: 0.36 },
      { geo: Co(0.023, 0.08, 4), color: 0xffffff, y: mano, z: 0.66, rx: Math.PI / 2, sx: 0.45 },
    ]),
    // El arco, vertical en el puño y combado hacia delante, con su cuerda.
    arco: fundir([
      { geo: new THREE.TorusGeometry(0.45, 0.013, 4, 12, 1.6).rotateZ(-0.8).rotateY(-Math.PI / 2), color: MADERA, y: mano, z: 0.03 - 0.45 },
      { geo: C(0.003, 0.003, 0.64, 3), color: 0xe8e0c8, y: mano, z: 0.03 - 0.45 * (1 - Math.cos(0.8)) },
    ]),
    // La antorcha se alza con el brazo: sale de la mano hacia donde apunta el antebrazo.
    antorcha: fundir([{ geo: C(0.016, 0.022, 0.42, 5), color: MADERA, y: mano - 0.18 }]),
    llama: fundir([
      { geo: Co(0.055, 0.15, 6), color: 0xffffff, y: mano - 0.46, rx: Math.PI },
      { geo: Co(0.032, 0.09, 5), color: 0xfff1a0, y: mano - 0.49, rx: Math.PI },
    ]),
    // Lo que traen a casa al volver del trabajo: al hombro o a la espalda (sobre el
    // torso), o colgando de la mano izquierda.
    tronco: fundir([
      { geo: C(0.056, 0.064, 0.8, 7), color: 0x7a5534, x: 0.11, y: 0.31, z: -0.06, rx: Math.PI / 2 - 0.15 },
      { geo: C(0.016, 0.022, 0.12, 4), color: 0x6a4a2e, x: 0.16, y: 0.36, z: -0.3, rz: -0.7 },
    ]),
    presa: fundir([
      { geo: Es(1, 7, 5), color: 0x8a5a33, y: 0.33, z: -0.07, sx: 0.3, sy: 0.075, sz: 0.085 },
      { geo: Es(0.045, 6, 4), color: 0x7a4e2c, x: 0.31, y: 0.27, z: -0.03 },
      { geo: C(0.012, 0.009, 0.22, 4), color: 0x4a3020, x: -0.25, y: 0.24, z: 0.04, rx: 0.5 },
      { geo: C(0.012, 0.009, 0.22, 4), color: 0x4a3020, x: 0.21, y: 0.24, z: 0.05, rx: 0.5 },
    ]),
    sarta: fundir([
      { geo: C(0.003, 0.003, 0.1, 3), color: 0x8a7a5a, y: mano - 0.05 },
      { geo: Es(1, 6, 4), color: 0xaebcc2, y: mano - 0.16, sx: 0.016, sy: 0.065, sz: 0.026 },
      { geo: Es(1, 6, 4), color: 0x9aaab0, x: 0.03, y: mano - 0.14, z: 0.01, sx: 0.016, sy: 0.055, sz: 0.024, rz: 0.3 },
      { geo: Es(1, 6, 4), color: 0xb8c4c8, x: -0.03, y: mano - 0.15, z: -0.01, sx: 0.016, sy: 0.06, sz: 0.024, rz: -0.25 },
    ]),
    frutos: fundir(
      [0xc0263a, 0xe07a1e, 0x6a3a8a, 0xc0263a, 0xd8a020, 0x8a2a3a].map((color, k) => ({
        geo: Es(0.03, 5, 4),
        color,
        x: Math.cos(k * 2.3) * 0.05,
        y: 0.235 + (k % 3) * 0.018,
        z: -0.13 + Math.sin(k * 2.3) * 0.05,
      })),
    ),
    piedras: fundir(
      [0, 1, 2, 3].map((k) => ({ geo: Do(0.042), color: [0x8b867d, 0x9a948a, 0x7a756d, 0xa09a90][k], x: Math.cos(k * 1.9) * 0.045, y: 0.245 + (k % 2) * 0.03, z: -0.13 + Math.sin(k * 1.9) * 0.045, rx: k })),
    ),
    gavilla: fundir([
      ...[0, 1, 2, 3, 4, 5, 6].map((k) => ({ geo: C(0.007, 0.007, 0.62, 3), color: 0xd8b850, x: 0.11 + Math.cos(k * 2.4) * 0.025, y: 0.31 + Math.sin(k * 2.4) * 0.025, z: -0.06, rx: Math.PI / 2 - 0.15 + (k - 3) * 0.03 })),
      ...[0, 1, 2, 3].map((k) => ({ geo: Es(0.022, 4, 3), color: 0xc8a040, x: 0.11 + Math.cos(k * 1.7) * 0.03, y: 0.27 + Math.sin(k * 1.7) * 0.02, z: -0.36, sz: 2.2 })),
      { geo: C(0.034, 0.034, 0.03, 6), color: 0x8a6a3a, x: 0.11, y: 0.31, z: -0.06, rx: Math.PI / 2 - 0.15 },
    ]),
    // El escudo redondo, embrazado en el antebrazo izquierdo.
    escudo: fundir([
      { geo: C(0.17, 0.17, 0.025, 12), color: 0x8a6438, x: -0.05, y: -0.09, rz: Math.PI / 2 },
      { geo: C(0.175, 0.175, 0.012, 12, 1, true), color: 0x5a3a20, x: -0.05, y: -0.09, rz: Math.PI / 2 },
      { geo: Es(0.04, 6, 4), color: 0x9a9488, x: -0.065, y: -0.09, sx: 0.6 },
    ]),
    // El bastón de los mayores (en la mano derecha, hasta el suelo).
    baston: fundir([
      { geo: C(0.011, 0.014, 0.5, 5), color: 0x6b4a2e, y: mano - 0.24 },
      { geo: Es(0.02, 5, 4), color: 0x5a3a22, y: mano + 0.02 },
    ]),
    // La boya del pescador y el pez cuando pica (sueltos en el mundo).
    boya: fundir([
      { geo: Es(0.03, 6, 4), color: 0xd8302a },
      { geo: C(0.031, 0.031, 0.014, 6), color: 0xf4f4f0, y: -0.006 },
    ]),
    pezCana: fundir([
      { geo: Es(1, 6, 4), color: 0xb8c4c8, sx: 0.018, sy: 0.03, sz: 0.075 },
      { geo: Co(0.03, 0.05, 4), color: 0x8a9aa0, z: -0.09, rx: -Math.PI / 2, sx: 0.4 },
    ]),
  };
}

/** Lo que trae a casa cada oficio. */
const CARGA = { lenar: 'tronco', cazar: 'presa', pescar: 'sarta', recolectar: 'frutos', picar: 'piedras', barro: 'piedras', cultivar: 'gavilla' };
const CARGAS = ['tronco', 'presa', 'sarta', 'frutos', 'piedras', 'gavilla', 'baston', 'boya', 'pezCana', 'escudo'];
/** Cargas que se llevan al hombro o a cuestas (y dejan la herramienta en el cinto). */
const PESADAS = new Set(['tronco', 'presa', 'gavilla']);
/** Ángulo de a a b por el camino corto. */
const giroHacia = (a, b) => ((((b - a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;

/** Qué lleva en la mano cada oficio. */
const HERRAMIENTA = {
  lenar: 'hacha', picar: 'martillo', construir: 'martillo', cazar: 'lanza', vigilar: 'lanza', defender: 'lanza', asaltar: 'lanza',
  pescar: 'cana', recolectar: 'cesta', cultivar: 'azada', barro: 'cesta', pastorear: 'lanza',
};
const QUIETOS = new Set(['jugar', 'descansar', 'experimentar']);
const PARES = ['muslo', 'pierna', 'pie', 'brazo', 'antebrazo'];
const SUELTAS = ['pelvis', 'torso', 'cabeza', 'peloCorto', 'peloLargo', 'peloMono', 'peloTrenza', 'barba', 'faldon', 'capa', 'diadema', 'cestaEspalda'];
const HERRAMIENTAS = ['hacha', 'lanza', 'cesta', 'cana', 'azada', 'martillo', 'antorcha', 'llama', 'espada', 'arco'];
/** Herramientas con punta o filo de piedra o metal (el resto, de madera o fibra). */
const CON_METAL = new Set(['hacha', 'lanza', 'azada', 'martillo', 'espada']);
/** Oficios de armas: con arco, espada y escudo cuando su aldea ya los sabe hacer. */
const ARMADOS = new Set(['cazar', 'vigilar', 'defender', 'asaltar']);
function armaDe(act, sabe, id) {
  const tira = azar(id * 4.3);
  if (act === 'cazar') return sabe.has('arco') && tira < 0.6 ? 'arco' : 'lanza';
  if (sabe.has('arco') && tira < (act === 'vigilar' ? 0.6 : 0.35)) return 'arco';
  if (act !== 'vigilar' && sabe.has('espada') && tira < 0.8) return 'espada';
  return 'lanza';
}

// Matrices de trabajo (sin crear objetos en cada cuadro).
const R = new THREE.Matrix4();
const L = new THREE.Matrix4();
const E = new THREE.Euler();
const Q = new THREE.Quaternion();
const V = new THREE.Vector3();
const PUNTA = new THREE.Vector3();
const ESC = new THREE.Vector3();
const UNO = new THREE.Vector3(1, 1, 1);

/**
 * M = padre · traslación · giro. En brazos y piernas se separa primero (z) y luego
 * se dobla (x), así un muslo abierto y doblado queda delante y hacia fuera; en el
 * torso y la cabeza se inclina (x) y luego se gira sobre la vertical (y).
 */
function articular(out, padre, x, y, z, rx = 0, rz = 0, ry = 0, orden = 'XZY') {
  E.set(rx, ry, rz, orden);
  Q.setFromEuler(E);
  L.compose(V.set(x, y, z), Q, UNO);
  return out.multiplyMatrices(padre, L);
}

export class Gente3D {
  constructor(escena, terreno) {
    this.escena = escena;
    this.terreno = terreno;
    this.geo = modelos();
    this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.78 });
    this.matLlama = new THREE.MeshBasicMaterial({ vertexColors: true, color: 0xffa040 });
    this.im = {};
    this.lista = [];
    this.M = {};
    for (const k of ['raiz', 'pelvis', 'torso', 'cabeza', 'musloI', 'musloD', 'piernaI', 'piernaD', 'pieI', 'pieD', 'brazoI', 'brazoD', 'antebrazoI', 'antebrazoD', 'mano', 'manoI', 'suelto']) this.M[k] = new THREE.Matrix4();
  }

  /** Prepara a la gente de un día: aspecto, casa, sitio de trabajo y herramienta. */
  preparar(d, aldeas, consejeros) {
    const max = Math.max(200, Math.ceil(d.personas.length * 1.2));
    const im = this.im;
    for (const k of PARES) instancias(this.escena, im, k, this.geo[k], this.mat, max * 2);
    for (const k of SUELTAS) instancias(this.escena, im, k, this.geo[k], this.mat, max);
    for (const k of HERRAMIENTAS) instancias(this.escena, im, k, this.geo[k], k === 'llama' ? this.matLlama : this.mat, max, { sombra: k !== 'llama' });
    for (const k of CARGAS) {
      instancias(this.escena, im, k, this.geo[k], this.mat, max, { sombra: k !== 'boya' && k !== 'pezCana' });
      im[k].instanceColor.array.fill(1);
    }
    this.d = d;
    this.estacion = d.estacion;
    const conocen = new Map(d.aldeas.map((a) => [a.id, new Set(a.conocidos)]));
    const tr = this.terreno;
    const color = new THREE.Color();
    const cuenta = Object.fromEntries([...SUELTAS, ...HERRAMIENTAS].map((k) => [k, 0]));
    this.lista = d.personas.map((p, idx) => {
      const sabe = conocen.get(p.aldea) ?? new Set();
      const a = aldeas.get(p.aldea);
      const mujer = p.sexo === 'M';
      const nino = p.edad < 14;
      const viejo = p.edad > 60;
      const piel = PIELES[Math.floor(azar(p.id * 1.3) * PIELES.length)];
      color.set(PELOS[Math.floor(azar(p.id * 2.7) * PELOS.length)]);
      if (p.edad > 50) color.lerp(new THREE.Color(0xd9d9d9), Math.min(1, (p.edad - 50) / 20));
      const pelo = color.getHex();
      const r = azar(p.id * 5.1);
      const estilo = viejo && !mujer && r < 0.35 ? null : mujer ? (r < 0.4 ? 'peloLargo' : r < 0.7 ? 'peloTrenza' : 'peloMono') : r < 0.7 ? 'peloCorto' : 'peloLargo';
      const barba = !mujer && p.edad >= 18 && azar(p.id * 6.3) < 0.6;
      // La ropa según lo que sabe su aldea.
      const tela = sabe.has('tela');
      const ropa = sabe.has('ropa');
      const tinte = TINTES[(a?.id ?? 0) % TINTES.length];
      const cuero = CUERO[Math.floor(azar(p.id * 7.7) * CUERO.length)];
      const vestido = tela ? tinte : ropa ? cuero : null;
      const consejero = consejeros.has(p.id);
      const estacion = d.estacion;
      const piezas = {
        pelvis: tela || ropa ? vestido : cuero,
        torso: vestido ?? piel,
        brazo: tela || (ropa && estacion === 'invierno') ? vestido : piel,
        antebrazo: piel,
        muslo: tela && !mujer ? 0x4a3a30 : ropa && estacion === 'invierno' ? cuero : piel,
        pierna: ropa && estacion === 'invierno' ? cuero : piel,
        pie: ropa || tela ? 0x4a3020 : piel,
        cabeza: piel,
      };
      const faldon = mujer || tela || !ropa ? (tela ? tinte : cuero) : null;
      const largoFaldon = mujer ? (tela ? 1.25 : 0.95) : 0.55;
      const capa = consejero ? 0x8e2c2c : ropa && estacion === 'invierno' && !nino ? 0x8a6a48 : null;
      // Dónde vive y dónde trabaja hoy.
      const [ax, az] = a ? tr.aMundo(a.x, a.y) : tr.aMundo(p.x, p.y);
      const ang = azar(p.id * 0.77) * Math.PI * 2;
      const radio = 1.1 + azar(p.id * 1.91) * 2.4;
      const casa = [ax + Math.cos(ang) * radio, az + Math.sin(ang) * radio];
      let [tx, tz] = tr.aMundo(p.x, p.y);
      tx += (azar(p.id * 3.3) - 0.5) * 1.2;
      tz += (azar(p.id * 4.4) - 0.5) * 1.2;
      if (p.act === 'pescar') {
        const dx = ax - tx;
        const dz = az - tz;
        const l = Math.hypot(dx, dz) || 1;
        tx += (dx / l) * 1.3;
        tz += (dz / l) * 1.3;
      }
      const metal = sabe.has('hierro') ? 0xaab1b8 : sabe.has('bronce') ? 0xc9923e : sabe.has('cobre') ? 0xc07a3a : 0x8d8a82;
      const herramienta = p.edad >= 12 ? (ARMADOS.has(p.act) ? armaDe(p.act, sabe, p.id) : HERRAMIENTA[p.act] ?? null) : null;
      const per = {
        p,
        idx,
        casa,
        trabajo: [tx, tz],
        escala: (nino ? 0.5 + p.edad * 0.035 : 1) * (mujer ? 1.18 : 1.25) * (0.94 + azar(p.id * 8.8) * 0.12),
        ancho: 0.92 + p.genes.fuerza * 0.16 + (mujer ? -0.06 : 0.04),
        cabezon: nino ? 1.25 - p.edad * 0.012 : 1,
        desfase: (azar(p.id * 9.1) - 0.5) * 0.08,
        herramienta,
        metal,
        estilo,
        barba,
        faldon,
        largoFaldon,
        capa,
        consejero,
        escudo: p.edad >= 14 && p.act !== 'cazar' && ARMADOS.has(p.act) && herramienta !== 'arco' && sabe.has('escudo'),
        cesta: (p.act === 'recolectar' || p.act === 'picar' || p.act === 'barro') && p.edad >= 12,
        viejo,
        nino,
        x: casa[0],
        z: casa[1],
        ang: azar(p.id * 3.9) * 6,
        slots: {},
      };
      // Colores de cada pieza (los pares ocupan dos huecos seguidos).
      for (const k of PARES) {
        color.set(piezas[k]);
        im[k].setColorAt(idx * 2, color);
        im[k].setColorAt(idx * 2 + 1, color);
      }
      for (const k of ['pelvis', 'torso', 'cabeza']) {
        per.slots[k] = cuenta[k]++;
        im[k].setColorAt(per.slots[k], color.set(piezas[k]));
      }
      if (estilo) {
        per.slots[estilo] = cuenta[estilo]++;
        im[estilo].setColorAt(per.slots[estilo], color.set(pelo));
      }
      if (barba) {
        per.slots.barba = cuenta.barba++;
        im.barba.setColorAt(per.slots.barba, color.set(pelo));
      }
      if (faldon !== null) {
        per.slots.faldon = cuenta.faldon++;
        im.faldon.setColorAt(per.slots.faldon, color.set(faldon));
      }
      if (capa !== null) {
        per.slots.capa = cuenta.capa++;
        im.capa.setColorAt(per.slots.capa, color.set(capa));
      }
      if (consejero) {
        per.slots.diadema = cuenta.diadema++;
        im.diadema.setColorAt(per.slots.diadema, color.set(0xd9a830));
      }
      if (per.cesta) {
        per.slots.cestaEspalda = cuenta.cestaEspalda++;
        im.cestaEspalda.setColorAt(per.slots.cestaEspalda, color.set(0xb08a50));
      }
      return per;
    });
    this.cuentas = cuenta;
    for (const k of [...PARES, ...SUELTAS, ...HERRAMIENTAS]) if (im[k].instanceColor) im[k].instanceColor.needsUpdate = true;
    for (const k of PARES) im[k].count = this.lista.length * 2;
    for (const k of SUELTAS) im[k].count = cuenta[k];
  }

  /**
   * Cada cuadro: dónde está cada uno según la hora del día y en qué postura.
   * `fase` va de 0 (amanecer) a 1; de noche se juntan alrededor del fuego.
   */
  animar(t, fase, aldeas, objetivo, hablante) {
    const im = this.im;
    if (!im.torso || !this.lista.length) return;
    const tr = this.terreno;
    const herr = Object.fromEntries(HERRAMIENTAS.map((k) => [k, 0]));
    const carg = Object.fromEntries(CARGAS.map((k) => [k, 0]));
    const dt = Math.min(0.1, Math.max(0, t - (this.tAnterior ?? t)));
    this.tAnterior = t;
    const lejos2 = 120 * 120;
    const muchos = this.lista.length > 600;
    const cuadro = Math.floor(t * 60);
    const noche = fase > 0.86 || fase < 0.04;
    for (const per of this.lista) {
      const p = per.p;
      if (muchos && (per.x - objetivo.x) ** 2 + (per.z - objetivo.z) ** 2 > lejos2 && (cuadro + per.idx) % 3) continue;
      const f = (((fase + per.desfase) % 1) + 1) % 1;
      const a = aldeas.get(p.aldea);
      const quieto = QUIETOS.has(p.act) || p.act === 'defender';
      // 0 en casa, 1 en el trabajo.
      let k;
      let anda = false;
      if (quieto || !a) k = 0;
      else if (f < 0.12) k = 0;
      else if (f < 0.3) {
        k = suave((f - 0.12) / 0.18);
        anda = true;
      } else if (f < 0.68) k = 1;
      else if (f < 0.84) {
        k = 1 - suave((f - 0.68) / 0.16);
        anda = true;
      } else k = 0;
      let x = entre(per.casa[0], per.trabajo[0], k);
      let z = entre(per.casa[1], per.trabajo[1], k);
      let pose = anda ? 'andar' : k === 1 ? p.act : 'pie';
      let mira = null;
      // De noche, alrededor del fuego; el consejo en el círculo de dentro.
      if ((f > 0.86 || f < 0.04) && a && !quieto && p.act !== 'vigilar') {
        const [hx, hz] = tr.aMundo(a.x, a.y);
        const r = per.consejero ? 1.15 : 1.9 + azar(p.id) * 1.6;
        const ang = azar(p.id * 5.7) * Math.PI * 2;
        const u = Math.min(1, f > 0.86 ? (f - 0.86) / 0.04 : 1);
        x = entre(per.casa[0], hx + Math.cos(ang) * r, u);
        z = entre(per.casa[1], hz + Math.sin(ang) * r, u);
        if (u < 1) pose = 'andar';
        else {
          pose = per.consejero && hablante === p.id ? 'hablar' : per.nino ? 'pie' : 'sentado';
          mira = [hx, hz];
        }
      }
      if (p.act === 'jugar') {
        const u = t * 1.6 + p.id;
        x = per.casa[0] + Math.cos(u) * 1.2;
        z = per.casa[1] + Math.sin(u * 1.2) * 1.0;
        pose = 'correr';
      } else if (p.act === 'descansar') pose = 'sentado';
      else if (p.act === 'experimentar') pose = 'experimentar';
      else if (p.act === 'defender' || p.act === 'asaltar') pose = k > 0 || p.act === 'defender' ? 'correr' : pose;
      if (p.act === 'vigilar' && k === 1 && noche) pose = 'vigilarNoche';
      const dx = x - per.x;
      const dz = z - per.z;
      const mov = Math.hypot(dx, dz);
      // Las piernas, al ritmo de lo que de verdad avanza; con prisa, a la carrera.
      if (dt > 0) per.vel = (per.vel ?? 0) + (mov / dt - (per.vel ?? 0)) * Math.min(1, dt * 6);
      if (pose === 'andar' && per.vel > 1.9 * per.escala) pose = 'correr';
      // Quien no se mueve no corre en el sitio: los que defienden esperan alerta.
      if ((pose === 'andar' || pose === 'correr') && mov < 0.0005 && p.act !== 'jugar') pose = p.act === 'defender' ? 'vigilar' : 'pie';
      const zancada = (pose === 'correr' ? 1.3 : 0.85) * per.escala * (per.viejo ? 0.8 : 1);
      if (mov < 3) per.fasePaso = ((per.fasePaso ?? 0) + (2 * Math.PI * mov) / zancada) % 6283.1853;
      // Giran poco a poco hacia donde van (o hacia el fuego, o hacia el agua).
      let rumbo = per.ang;
      if (mira) rumbo = Math.atan2(mira[0] - x, mira[1] - z);
      else if (mov > 0.002) rumbo = Math.atan2(dx, dz);
      else if (k === 1 && p.act === 'pescar') rumbo = Math.atan2(per.trabajo[0] - per.casa[0], per.trabajo[1] - per.casa[1]);
      per.ang += mov > 2 ? giroHacia(per.ang, rumbo) : acotar(giroHacia(per.ang, rumbo), -8 * dt, 8 * dt);
      per.x = x;
      per.z = z;
      // De vuelta a casa traen lo que han conseguido; los mayores andan con bastón.
      let carga = null;
      if ((pose === 'andar' || pose === 'correr') && f >= 0.68 && f < 0.86 && !quieto && p.edad >= 12) carga = CARGA[p.act] ?? null;
      if (carga === 'gavilla' && this.estacion !== 'verano' && this.estacion !== 'otoño') carga = null;
      per.carga = carga;
      per.baston = per.viejo && !carga && (pose === 'andar' || pose === 'pie');
      const y = tr.alturaEn(x, z);
      this.postura(per, pose, t, x, y, z);
      if (carga) this.dejar(carg, carga, carga === 'sarta' ? this.M.manoI : this.M.torso);
      if (per.baston) this.dejar(carg, 'baston', this.M.mano);
      if (per.escudo && pose !== 'sentado' && pose !== 'vigilarNoche' && (k > 0 || p.act === 'vigilar' || p.act === 'defender')) this.dejar(carg, 'escudo', this.M.antebrazoI);
      if (pose === 'pescar') this.pesca(per, t, carg);
      // Herramienta en la mano derecha (o antorcha de noche).
      const h = pose === 'vigilarNoche' ? 'antorcha' : per.herramienta;
      const visible = h && !per.baston && !PESADAS.has(carga) && pose !== 'sentado' && pose !== 'experimentar' && (k > 0 || p.act === 'vigilar' || p.act === 'defender');
      if (visible) {
        const j = herr[h]++;
        im[h].setMatrixAt(j, this.M.mano);
        if (h === 'antorcha') im.llama.setMatrixAt(herr.llama++, this.M.mano);
        else im[h].setColorAt(j, this.colorMetal(CON_METAL.has(h) ? per.metal : 0xffffff));
      }
    }
    for (const k of [...PARES, ...SUELTAS]) im[k].instanceMatrix.needsUpdate = true;
    for (const k of HERRAMIENTAS) {
      im[k].count = herr[k];
      im[k].instanceMatrix.needsUpdate = true;
      if (im[k].instanceColor) im[k].instanceColor.needsUpdate = true;
    }
    for (const k of CARGAS) {
      im[k].count = Math.min(carg[k], im[k].instanceMatrix.count);
      im[k].instanceMatrix.needsUpdate = true;
      im[k].instanceColor.needsUpdate = true;
    }
    this.matLlama.color.setRGB(1, 0.62 + 0.08 * Math.sin(t * 13), 0.25);
  }

  /** Pone una carga (o la boya, o el pez) en su sitio. */
  dejar(cuenta, nombre, m) {
    const im = this.im[nombre];
    const j = cuenta[nombre]++;
    if (j < im.instanceMatrix.count) im.setMatrixAt(j, m);
  }

  /** Altura del agua (o del suelo, si no hay agua) en un punto. */
  nivelAgua(x, z, t) {
    const tr = this.terreno;
    const d = this.d;
    const [tx, ty] = tr.aCasilla(x, z);
    const ter = d && tx >= 0 && ty >= 0 && tx < d.ancho && ty < d.alto ? d.terreno[ty * d.ancho + tx] : AGUA;
    if (ter === RIO) return tr.alturaEn(x, z, false) + 0.25;
    if (ter === AGUA) return -0.05 + Math.sin(x * 0.12 + t * 0.9) * 0.07 + Math.cos(z * 0.1 + t * 0.7) * 0.07;
    return tr.alturaEn(x, z) + 0.02;
  }

  /** La boya del pescador sobre el agua y, de vez en cuando, un pez que pica y sale coleando. */
  pesca(per, t, cuenta) {
    const M = this.M;
    PUNTA.set(0, -0.16 - 1.56, 0.05).applyMatrix4(M.mano);
    const fx = Math.sin(per.ang);
    const fz = Math.cos(per.ang);
    const bx = PUNTA.x + fx * 0.3;
    const bz = PUNTA.z + fz * 0.3;
    const nivel = this.nivelAgua(bx, bz, t);
    const c = (t * 0.06 + per.p.id * 0.37) % 1;
    if (c > 0.93) {
      const u = (c - 0.93) / 0.07;
      E.set(0.4 * Math.sin(t * 17), per.ang, Math.sin(t * 28) * 0.7, 'YXZ');
      Q.setFromEuler(E);
      M.suelto.compose(V.set(bx - fx * 0.2 * u, nivel + 0.12 + 0.4 * Math.sin(Math.PI * Math.min(1, u * 1.4)), bz - fz * 0.2 * u), Q, ESC.set(1, 1, 1));
      this.dejar(cuenta, 'pezCana', M.suelto);
    } else {
      // Cuando está a punto de picar, la boya se hunde a tirones.
      const tiron = c > 0.88 ? 0.035 * Math.abs(Math.sin(t * 22)) : 0;
      M.suelto.compose(V.set(bx, nivel + 0.01 + Math.sin(t * 2.6 + per.p.id) * 0.012 - tiron, bz), Q.identity(), ESC.set(1, 1, 1));
      this.dejar(cuenta, 'boya', M.suelto);
    }
  }

  colorMetal(hex) {
    this._c ??= new THREE.Color();
    return this._c.set(hex);
  }

  /** Calcula las articulaciones de una postura y coloca cada pieza del cuerpo. */
  postura(per, pose, t, x, y, z) {
    const M = this.M;
    const im = this.im;
    const id = per.p.id;
    const s = per.escala;
    // Ángulos: flexión hacia delante negativa en caderas, hombros y codos; rodillas positivas.
    let alto = 0.46;
    let caderaI = 0;
    let caderaD = 0;
    let abreI = 0;
    let abreD = 0;
    let rodI = 0.05;
    let rodD = 0.05;
    let inclina = per.viejo ? 0.18 : 0;
    let gira = 0;
    let hombroI = 0.05;
    let hombroD = 0.05;
    let separaI = 0.08;
    let separaD = 0.08;
    let codoI = -0.15;
    let codoD = -0.15;
    let cabezaY = 0;
    let cabezaX = 0;
    let bote = 0;
    let herrX = 0;
    const ritmo = per.nino ? 1.25 : per.viejo ? 0.75 : 1;
    let w = 0;
    switch (pose) {
      case 'andar':
      case 'correr': {
        const corre = pose === 'correr';
        w = (per.fasePaso ?? t * (corre ? 13 : 8.5) * ritmo) + id;
        const amp = corre ? 0.85 : 0.5;
        const sw = Math.sin(w);
        caderaI = -amp * sw;
        caderaD = amp * sw;
        rodI = 0.1 + (corre ? 1.1 : 0.7) * Math.max(0, Math.cos(w));
        rodD = 0.1 + (corre ? 1.1 : 0.7) * Math.max(0, -Math.cos(w));
        hombroI = (corre ? 0.7 : 0.42) * sw;
        hombroD = -(corre ? 0.7 : 0.42) * sw;
        codoI = corre ? -1.2 : -0.25 - 0.2 * Math.max(0, -sw);
        codoD = corre ? -1.2 : -0.25 - 0.2 * Math.max(0, sw);
        bote = (corre ? 0.05 : 0.025) * Math.abs(Math.cos(w));
        inclina += corre ? 0.22 : 0.04;
        gira = 0.08 * sw;
        if (corre && (per.herramienta === 'lanza' || per.herramienta === 'espada') && per.p.edad >= 14) {
          hombroD = -1.0;
          codoD = -1.5;
          herrX = 1.4;
        }
        break;
      }
      case 'sentado': {
        alto = 0.14;
        caderaI = caderaD = -1.45;
        abreI = abreD = 0.75;
        rodI = rodD = 2.2;
        hombroI = hombroD = -0.45;
        codoI = codoD = -1.0;
        separaI = separaD = 0.25;
        cabezaX = 0.08 * Math.sin(t * 0.7 + id);
        cabezaY = 0.25 * Math.sin(t * 0.4 + id * 1.7);
        if (Math.sin(t * 0.9 + id * 2.3) > 0.85) {
          // Gesto al hablar.
          hombroD = -1.2;
          codoD = -0.9;
        }
        break;
      }
      case 'hablar': {
        // Quien tiene la palabra en el consejo, de pie y gesticulando.
        hombroI = -0.9 + 0.35 * Math.sin(t * 2.1 + id);
        hombroD = -1.1 + 0.4 * Math.sin(t * 1.7 + id + 1);
        separaI = separaD = 0.45;
        codoI = codoD = -0.5;
        cabezaY = 0.5 * Math.sin(t * 0.8);
        break;
      }
      case 'experimentar': {
        alto = 0.14;
        caderaI = caderaD = -1.45;
        abreI = abreD = 0.75;
        rodI = rodD = 2.2;
        inclina = 0.35;
        hombroI = -0.85 + 0.15 * Math.sin(t * 5 + id);
        hombroD = -0.85 + 0.25 * Math.sin(t * 6.3 + id);
        codoI = codoD = -0.9;
        cabezaX = 0.35;
        break;
      }
      case 'lenar':
      case 'picar':
      case 'construir': {
        // Golpes: levantar despacio, bajar de golpe.
        const c = (t * (pose === 'construir' ? 1.9 : 1.4) + id * 0.37) % 1;
        const arriba = pose === 'picar' ? -2.2 : pose === 'construir' ? -1.9 : -2.7;
        const golpe = c < 0.62 ? entre(-0.5, arriba, suave(c / 0.62)) : c < 0.78 ? entre(arriba, -0.45, (c - 0.62) / 0.16) : -0.45;
        hombroD = golpe;
        hombroI = pose === 'lenar' ? golpe + 0.15 : -0.6;
        codoD = codoI = -0.35;
        separaI = 0.02;
        separaD = 0.02;
        inclina += c > 0.62 && c < 0.85 ? 0.32 : 0.1;
        abreI = 0.12;
        abreD = 0.12;
        if (pose === 'construir') {
          alto = 0.3;
          caderaI = -1.3;
          rodI = 1.5;
          caderaD = 0.15;
          rodD = 1.55;
        }
        break;
      }
      case 'cultivar': {
        const c = Math.sin(t * 3.2 + id);
        inclina += 0.42;
        hombroD = -1.0 + 0.45 * c;
        hombroI = -0.8 + 0.45 * c;
        codoD = codoI = -0.6;
        rodI = rodD = 0.25;
        caderaI = caderaD = -0.2;
        break;
      }
      case 'recolectar':
      case 'barro': {
        alto = 0.27;
        caderaI = caderaD = -1.5;
        rodI = rodD = 2.1;
        abreI = abreD = 0.35;
        inclina = 0.45;
        hombroD = -0.9 + 0.35 * Math.sin(t * 3 + id);
        codoD = -0.35;
        hombroI = -0.3;
        codoI = -0.9;
        break;
      }
      case 'pescar': {
        hombroD = -0.95 + 0.06 * Math.sin(t * 0.8 + id);
        codoD = -0.55;
        hombroI = -0.7;
        codoI = -0.8;
        separaI = -0.15;
        // Al picar, tirón de la caña (a la vez que el pez sale del agua).
        if ((t * 0.06 + id * 0.37) % 1 > 0.93) hombroD -= 0.6;
        break;
      }
      case 'cazar': {
        // Al acecho, agachado y con la lanza lista.
        alto = 0.38;
        caderaI = -0.55;
        caderaD = -0.25;
        rodI = 0.9;
        rodD = 0.6;
        inclina = 0.38;
        hombroD = -1.45 + 0.1 * Math.sin(t * 2 + id);
        codoD = -1.55;
        herrX = 1.3;
        hombroI = -0.7;
        codoI = -0.6;
        cabezaY = 0.4 * Math.sin(t * 0.6 + id);
        // De vez en cuando, lanza: echa el brazo atrás y lo suelta hacia delante.
        const c = (t * 0.08 + id * 0.29) % 1;
        if (c > 0.9) {
          const u = (c - 0.9) / 0.1;
          hombroD = u < 0.55 ? entre(-1.45, -2.9, suave(u / 0.55)) : entre(-2.9, -0.35, suave((u - 0.55) / 0.45));
          inclina = u < 0.55 ? 0.28 : 0.55;
          cabezaY = 0;
        }
        break;
      }
      case 'pastorear': {
        hombroD = -0.35;
        codoD = -0.7;
        cabezaY = 0.5 * Math.sin(t * 0.5 + id);
        break;
      }
      case 'vigilar':
      case 'vigilarNoche': {
        hombroD = -0.25;
        codoD = -0.7;
        cabezaY = 0.9 * Math.sin(t * 0.45 + id);
        if (pose === 'vigilarNoche') {
          hombroD = -1.0;
          codoD = -1.6;
        }
        break;
      }
      default: {
        // De pie, respirando.
        hombroI = 0.05 + 0.03 * Math.sin(t * 1.3 + id);
        hombroD = 0.05 + 0.03 * Math.sin(t * 1.3 + id + 0.5);
        cabezaY = 0.3 * Math.sin(t * 0.3 + id * 2.1);
      }
    }
    // Con carga, los brazos la sujetan; con bastón, el brazo derecho se apoya en él.
    const carga = per.carga;
    if (carga === 'tronco' || carga === 'gavilla') {
      hombroD = -2.7;
      codoD = -1.95;
      separaD = 0.12;
    } else if (carga === 'presa') {
      hombroI = hombroD = -2.75;
      codoI = codoD = -1.9;
      separaI = separaD = 0.15;
      inclina += 0.08;
    } else if (carga === 'sarta') {
      hombroI = -0.12 + 0.08 * Math.sin(w);
      codoI = -0.2;
    } else if (carga === 'frutos' || carga === 'piedras') {
      hombroI = hombroD = -0.5;
      codoI = codoD = -1.7;
      separaI = separaD = 0.2;
      inclina += 0.12;
    }
    if (per.baston) {
      hombroD = -0.38 + (pose === 'andar' ? 0.15 * Math.sin(w) : 0);
      codoD = -0.3;
    }
    // Raíz: posición, orientación y tamaño.
    E.set(0, per.ang, 0);
    Q.setFromEuler(E);
    M.raiz.compose(V.set(x, y + bote * s, z), Q, ESC.set(s * per.ancho, s, s));
    articular(M.pelvis, M.raiz, 0, alto, 0);
    articular(M.musloI, M.pelvis, -0.056, -0.02, 0, caderaI, -abreI);
    articular(M.musloD, M.pelvis, 0.056, -0.02, 0, caderaD, abreD);
    articular(M.piernaI, M.musloI, 0, -0.21, 0, rodI);
    articular(M.piernaD, M.musloD, 0, -0.21, 0, rodD);
    articular(M.pieI, M.piernaI, 0, -0.2, 0, -(rodI + caderaI) * 0.6);
    articular(M.pieD, M.piernaD, 0, -0.2, 0, -(rodD + caderaD) * 0.6);
    articular(M.torso, M.pelvis, 0, 0.045, 0, inclina, 0, gira, 'YXZ');
    articular(M.cabeza, M.torso, 0, 0.268, 0, cabezaX - inclina * 0.4, 0, cabezaY, 'YXZ');
    if (per.cabezon !== 1) M.cabeza.scale(V.set(per.cabezon, per.cabezon, per.cabezon));
    articular(M.brazoI, M.torso, -0.137, 0.235, 0, hombroI, -separaI);
    articular(M.brazoD, M.torso, 0.137, 0.235, 0, hombroD, separaD);
    articular(M.antebrazoI, M.brazoI, 0, -0.16, 0, codoI);
    articular(M.antebrazoD, M.brazoD, 0, -0.16, 0, codoD);
    articular(R, M.antebrazoI, 0, -0.16, 0);
    articular(M.manoI, R, 0, 0.16, 0);
    // La herramienta gira en la mano, no en el codo.
    articular(R, M.antebrazoD, 0, -0.16, 0, herrX);
    articular(M.mano, R, 0, 0.16, 0);
    const i = per.idx;
    im.muslo.setMatrixAt(i * 2, M.musloI);
    im.muslo.setMatrixAt(i * 2 + 1, M.musloD);
    im.pierna.setMatrixAt(i * 2, M.piernaI);
    im.pierna.setMatrixAt(i * 2 + 1, M.piernaD);
    im.pie.setMatrixAt(i * 2, M.pieI);
    im.pie.setMatrixAt(i * 2 + 1, M.pieD);
    im.brazo.setMatrixAt(i * 2, M.brazoI);
    im.brazo.setMatrixAt(i * 2 + 1, M.brazoD);
    im.antebrazo.setMatrixAt(i * 2, M.antebrazoI);
    im.antebrazo.setMatrixAt(i * 2 + 1, M.antebrazoD);
    const sl = per.slots;
    im.pelvis.setMatrixAt(sl.pelvis, M.pelvis);
    im.torso.setMatrixAt(sl.torso, M.torso);
    im.cabeza.setMatrixAt(sl.cabeza, M.cabeza);
    if (per.estilo) im[per.estilo].setMatrixAt(sl[per.estilo], M.cabeza);
    if (per.barba) im.barba.setMatrixAt(sl.barba, M.cabeza);
    if (sl.diadema !== undefined) im.diadema.setMatrixAt(sl.diadema, M.cabeza);
    if (sl.capa !== undefined) im.capa.setMatrixAt(sl.capa, M.torso);
    if (sl.cestaEspalda !== undefined) im.cestaEspalda.setMatrixAt(sl.cestaEspalda, M.torso);
    if (sl.faldon !== undefined) {
      R.copy(M.pelvis).scale(V.set(1, per.largoFaldon, 1));
      im.faldon.setMatrixAt(sl.faldon, R);
    }
  }

  /** Posición de la cabeza de alguien (para los bocadillos). */
  cabezaDe(per) {
    const y = this.terreno.alturaEn(per.x, per.z);
    return [per.x, y + 1.05 * per.escala, per.z];
  }
}

