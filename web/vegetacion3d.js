// La vegetación del mundo: cada sitio con sus plantas según el bioma, lo al norte o al
// sur que esté, su altura y si tiene agua dulce cerca. Abetos en el frío y en lo alto,
// robles, abedules y pinos en lo templado (en bosquetes, no salpicados al azar),
// sauces y álamos junto a ríos y lagos, palmeras en las playas cálidas y en los oasis,
// cactus en el desierto, matorral en la estepa, rocas con musgo en el bosque y vetas
// de mineral. Las estaciones se notan: brotes, verano, otoño de colores, árboles
// desnudos y nieve en invierno. Todo se mece con el viento.
//
// Lo que se mira se dibuja con detalle; lo lejano, con modelos ligeros (y lo que queda
// fuera de la vista, ni se prepara). Las sombras se calculan con los modelos ligeros,
// que de sombra apenas se distinguen. La hierba, las flores, los helechos, las setas,
// los juncos y los nenúfares solo crecen cerca de la cámara.

import * as THREE from 'three';
import {
  AGUA,
  BOSQUE,
  COLINA,
  DESIERTO,
  ESTEPA,
  MONTANA,
  ORILLA,
  PANTANO,
  PRADERA,
  RIO,
  T,
  acotar,
  agua,
  azar,
  cerrar,
  entre,
  enVista,
  instancias,
  materialPlanta,
  suave,
  vista,
} from './util3d.js?v=__MOTOR__';
import { modelosPlantas } from './plantas3d.js?v=__MOTOR__';

/** Radio (en unidades del mundo) con modelos detallados alrededor de lo que se mira. */
const RADIO_DETALLE = 40;
/** Con la cámara más lejos que esto, todo con modelos ligeros. */
const VISTA_DETALLE = 140;
/** Radio (en casillas) del sotobosque y distancia de cámara a la que deja de verse. */
const RADIO_SUELO = 20;
const VISTA_SUELO = 115;

/** Cada especie: sus piezas de cerca y de lejos ([modelo, material]). */
const ESPECIES = {
  abeto: { cerca: [['abeto', 'arbol']], lejos: [['abetoL', 'arbol']] },
  pino: { cerca: [['pino', 'arbol']], lejos: [['pinoL', 'arbol']] },
  abetoNieve: { cerca: [['abetoNieve', 'arbol']], lejos: [['abetoLNieve', 'arbol']] },
  pinoNieve: { cerca: [['pinoNieve', 'arbol']], lejos: [['pinoLNieve', 'arbol']] },
  roble: { cerca: [['roble', 'arbol']], lejos: [['robleL', 'arbol']] },
  abedul: { cerca: [['abedul', 'arbol']], lejos: [['abedulL', 'arbol']] },
  sauce: { cerca: [['sauce', 'arbol']], lejos: [['sauceL', 'arbol']] },
  alamo: { cerca: [['alamo', 'arbol']], lejos: [['alamoL', 'arbol']] },
  palmera: { cerca: [['palmeraTronco', 'arbol'], ['palmeraHojas', 'palma']], lejos: [['palmeraL', 'palma']] },
  desnudo: { cerca: [['desnudo', 'arbol']], lejos: [['desnudoL', 'arbol']] },
  quemado: { cerca: [['quemado', 'rigido']], lejos: [['quemado', 'rigido']] },
  arbusto: { cerca: [['arbusto', 'arbusto']], lejos: [['arbustoL', 'arbusto']] },
  arbustoFlor: { cerca: [['arbustoFlor', 'arbusto']], lejos: [['arbustoL', 'arbusto']] },
  bayas: { cerca: [['bayas', 'arbusto']], lejos: [], sombra: false },
  matorral: { cerca: [['matorral', 'arbusto']], lejos: [['matorralL', 'arbusto']] },
  saguaro: { cerca: [['saguaro', 'rigido']], lejos: [['saguaroL', 'rigido']] },
  chumbera: { cerca: [['chumbera', 'rigido']], lejos: [['chumberaL', 'rigido']] },
  roca: { cerca: [['roca', 'rigido']], lejos: [['rocaL', 'rigido']] },
  rocaMusgo: { cerca: [['rocaMusgo', 'rigido']], lejos: [['rocaL', 'rigido']] },
  cristales: { cerca: [['cristales', 'brillo']], lejos: [['cristales', 'brillo']], sombra: false },
};

/** Sotobosque: modelo → material. */
const SUELO = {
  hierba: 'hierba',
  hierbaAlta: 'hierba',
  amapolas: 'hierba',
  margaritas: 'hierba',
  lavanda: 'hierba',
  botonOro: 'hierba',
  helecho: 'junco',
  junco: 'junco',
  setas: 'rigido',
  nenufar: 'flotante',
  guijarros: 'rigido',
};

/** Hojas de los árboles de hoja caduca en cada estación. */
const HOJAS = {
  roble: { primavera: [0x86b84e, 0x7cb048], verano: [0x4e8a37, 0x47803a], otoño: [0xb8561e, 0xcc7d2c, 0x9c4a20, 0xd4a033] },
  frutal: { primavera: [0xf4b6cc, 0xfbe4ee, 0xf7c9da], verano: [0x568f3a], otoño: [0xc0392b, 0xd35400, 0xb8561e] },
  abedul: { primavera: [0xa6d062], verano: [0x86b84a, 0x7cae46], otoño: [0xe8bb24, 0xf0cc3a, 0xd9a520] },
  sauce: { primavera: [0xb2d070], verano: [0x93b45a, 0x8aac52], otoño: [0xc9b84e, 0xb8a848] },
  alamo: { primavera: [0x96c464], verano: [0x6fa03e, 0x679a3a], otoño: [0xf2c534, 0xe8b020] },
};
const CORTEZA = { roble: 0x5e4a38, frutal: 0x5a3e30, abedul: 0xe2ded2, sauce: 0x6a5a40, alamo: 0x9a9282 };
const BAYAS = [0xc0263a, 0x4a3a8a, 0xc0263a, 0x2a1a2a];
const MINERAL = [0, 0x2fd18a, 0x3a4252, 0xd0412e];

/** Los árboles, a la medida de la gente y de las casas (un aldeano mide algo más de 1). */
const ARBOLES = new Set(['abeto', 'pino', 'abetoNieve', 'pinoNieve', 'roble', 'abedul', 'sauce', 'alamo', 'palmera', 'desnudo', 'quemado']);
const TAMANO_ARBOL = 0.8;

const BLANCO = new THREE.Color(0xeef2f5);
const OCRE = new THREE.Color(0xc8702a);
const MARRON = new THREE.Color(0x7a6a52);

/** Ruido suave (para que las especies formen bosquetes en vez de ir salpicadas). */
function ruido(x, y, semilla) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = suave(x - x0);
  const fy = suave(y - y0);
  const v = (a, b) => azar(a * 157.31 + b * 311.7 + semilla);
  return entre(entre(v(x0, y0), v(x0 + 1, y0), fx), entre(v(x0, y0 + 1), v(x0 + 1, y0 + 1), fx), fy);
}

/** Ángulo de a a b por el camino corto. */
const giroHacia = (a, b) => ((((b - a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;

/** Qué árbol crece aquí. `g` es el ruido de bosquetes y `r` el azar de este árbol. */
function especieArbol(t, h, frio, calor, dulce, g, r) {
  if (t === PANTANO) return r < 0.5 ? 'sauce' : r < 0.78 ? 'abedul' : 'alamo';
  if (t === MONTANA || h > 5.2) return r < 0.85 ? 'abeto' : 'pino';
  if (dulce && r < 0.22 + 0.25 * g) return r < 0.13 + 0.12 * g ? 'sauce' : 'alamo';
  if (t === ESTEPA) return calor > 0.2 ? 'pino' : 'roble';
  if (t === PRADERA) return r < 0.25 && frio < 0.5 ? 'frutal' : r < 0.85 ? 'roble' : 'abedul';
  const alto = h > 3.4 ? 1 : 0;
  let abeto = 0.12 + 0.85 * frio + 0.45 * alto;
  let pino = 0.15 + 0.6 * calor + (t === COLINA ? 0.2 : 0);
  let roble = 0.5 * (1 - frio) * (1 - 0.45 * calor);
  let abedul = 0.08 + 0.3 * frio * (1 - 0.5 * frio) + 0.1 * (1 - calor);
  // Bosquetes: según el sitio, unas especies pesan más.
  if (g > 0.64) abedul *= 2.6;
  else if (g < 0.32) roble *= 1.9;
  else if (g > 0.5) pino *= 1.6;
  else abeto *= 1.4;
  const total = abeto + pino + roble + abedul;
  let u = r * total;
  if ((u -= abeto) < 0) return 'abeto';
  if ((u -= pino) < 0) return 'pino';
  if ((u -= roble) < 0) return 'roble';
  return 'abedul';
}

const M = new THREE.Matrix4();
const Q = new THREE.Quaternion();
const E = new THREE.Euler();
const V = new THREE.Vector3();
const ESC = new THREE.Vector3();

/** Copia las instancias elegidas de un lote a una malla. */
function copiar(im, lote, lista) {
  const m = im.instanceMatrix.array;
  const c = im.instanceColor.array;
  for (let k = 0; k < lista.length; k++) {
    const j = lista[k];
    const o = j * 16;
    const p = k * 16;
    for (let e = 0; e < 16; e++) m[p + e] = lote.mat[o + e];
    c[k * 3] = lote.col[j * 3];
    c[k * 3 + 1] = lote.col[j * 3 + 1];
    c[k * 3 + 2] = lote.col[j * 3 + 2];
  }
}

export class Vegetacion3D {
  constructor(escena, terreno) {
    this.escena = escena;
    this.terreno = terreno;
    this.geo = modelosPlantas();
    this.mat = {
      arbol: materialPlanta({ flex: 0.006, hoja: 0.018 }),
      palma: materialPlanta({ flex: 0.011, hoja: 0.03, side: THREE.DoubleSide }),
      arbusto: materialPlanta({ flex: 0.08, hoja: 0.01 }),
      rigido: materialPlanta({}),
      hierba: materialPlanta({ flex: 0.9, side: THREE.DoubleSide }),
      junco: materialPlanta({ flex: 0.16, hoja: 0.006, side: THREE.DoubleSide }),
      flotante: materialPlanta({ flota: 1, side: THREE.DoubleSide }),
      brillo: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.25, metalness: 0.35, emissive: 0x111111 }),
    };
    // Mallas que no se ven: solo dan sombra.
    this.matSombra = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
    this.matSombraDoble = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide });
    this.mallas = {};
    this.suelo = {};
    this.lotes = {};
    this.sucio = true;
    this.sueloSucio = true;
  }

  /** Recalcula qué crece en cada sitio (cada día: se tala, se quema y cambian las estaciones). */
  actualizar(d) {
    const W = d.ancho;
    const H = d.alto;
    const tr = this.terreno;
    const mp = agua(d);
    this.mapa = mp;
    const est = d.estacion;
    const invierno = est === 'invierno';
    const otono = est === 'otoño';
    const primavera = est === 'primavera';
    const ceniza = new Map(d.cenizas.map(([i, a]) => [i, a]));
    const ocupadas = new Set();
    for (const a of d.aldeas) {
      for (const e of a.edificios) ocupadas.add(e.y * W + e.x);
      if (a.obra) ocupadas.add(a.obra.y * W + a.obra.x);
      const r = a.abandonada !== null ? 0 : a.poblacion > 40 ? 3 : a.poblacion > 12 ? 2 : 1;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + 1) ocupadas.add((a.y + dy) * W + a.x + dx);
    }
    this.ocupadas = ocupadas;
    // Por especie: x, y, z, giroX, giroY, giroZ, escala, escalaY, r, g, b.
    const L = Object.fromEntries(Object.keys(ESPECIES).map((k) => [k, []]));
    const col = new THREE.Color();
    const poner = (sp, x, z, ry, s, sy, c, hundir = 0.06, ladeo = 0.04) => {
      if (ARBOLES.has(sp)) {
        s *= TAMANO_ARBOL;
        sy *= TAMANO_ARBOL;
      }
      const y = tr.alturaEn(x, z, false) - hundir * s;
      const rx = (azar(x * 3.1 + z) - 0.5) * 2 * ladeo;
      const rz = (azar(z * 2.7 - x) - 0.5) * 2 * ladeo;
      L[sp].push(x, y, z, rx, ry, rz, s, sy, c.r, c.g, c.b);
    };
    for (let i = 0; i < W * H; i++) {
      const t = d.terreno[i];
      if (t === AGUA || t === RIO) continue;
      const tx = i % W;
      const ty = (i - tx) / W;
      const lat = ty / (H - 1);
      const [cx, cz] = tr.aMundo(tx, ty);
      const h = tr.hCasilla[i];
      const libre = !ocupadas.has(i);
      const edadCeniza = ceniza.get(i);
      const quemada = edadCeniza !== undefined && edadCeniza < 240;
      const frio = acotar((0.42 - lat) / 0.25, 0, 1);
      const calor = acotar((lat - 0.62) / 0.25, 0, 1);
      const nieve = Math.max(invierno && t !== DESIERTO ? acotar(1.1 - lat * 1.5, 0, 1) : 0, acotar((h - 6.5) / 2.5, 0, 1));
      const g = ruido(tx / 6, ty / 6, 7.7);
      const dulce = mp.dulce[i] === 1;
      let arboles = 0;
      if (libre) {
        if (t === BOSQUE) arboles = Math.min(3, Math.round(d.madera[i] / 11));
        else if (t === PRADERA && azar(i * 5.3) < 0.07 && d.madera[i] >= 2) arboles = 1;
        else if (t === COLINA && d.madera[i] >= 5 && azar(i * 2.9) < 0.5) arboles = 1;
        else if (t === MONTANA && h < 7 && azar(i * 3.7) < 0.2) arboles = 1;
        else if (t === PANTANO && azar(i * 6.1) < 0.18) arboles = 1;
        else if (t === ESTEPA && azar(i * 4.9) < 0.015) arboles = 1;
        else if (t === ORILLA && dulce && azar(i * 5.9) < 0.2) arboles = 1;
      }
      if (quemada && (t === BOSQUE || t === COLINA)) {
        // Lo que dejó el fuego: troncos negros.
        for (let k = 0; k < 2; k++) {
          const x = cx + (azar(i * 13 + k) - 0.5) * T * 0.8;
          const z = cz + (azar(i * 17 + k * 3) - 0.5) * T * 0.8;
          poner('quemado', x, z, azar(i + k) * 6.28, 0.8 + azar(i * 7 + k) * 0.5, 1, col.set(0xffffff), 0.05, 0.12);
        }
        arboles = Math.max(0, arboles - 1);
      }
      // Los bosques jóvenes (talados o tras un incendio) tienen árboles más pequeños.
      const crecido = t === BOSQUE ? 0.72 + 0.28 * Math.min(1, d.madera[i] / 30) : 1;
      for (let k = 0; k < arboles; k++) {
        const x = cx + (azar(i * 13 + k) - 0.5) * T * 0.85;
        const z = cz + (azar(i * 17 + k * 3) - 0.5) * T * 0.85;
        const s = (0.78 + azar(i * 7 + k) * 0.55) * crecido;
        const ry = azar(i * 19 + k) * 6.28;
        const v = azar(i * 23 + k) - 0.5;
        const sp = especieArbol(t, h, frio, calor, dulce, g, azar(i * 11 + k));
        if (sp === 'abeto' || sp === 'pino') {
          // Con nieve, la versión nevada (blanco encima, verde debajo).
          col.set(sp === 'pino' ? (calor > 0.3 ? 0x5d8040 : 0x4b7a3c) : frio > 0.5 ? 0x2b5245 : 0x2f5f3c).offsetHSL(v * 0.03, 0, v * 0.08);
          if (nieve > 0.3) poner(sp + 'Nieve', x, z, ry, s, s * (1 + v * 0.2), col.lerp(BLANCO, (nieve - 0.3) * 0.2));
          else poner(sp, x, z, ry, s, s * (1 + v * 0.2), nieve ? col.lerp(BLANCO, nieve * 0.5) : col);
        } else if (invierno) {
          col.set(CORTEZA[sp]).offsetHSL(0, 0, v * 0.06);
          if (nieve) col.lerp(BLANCO, nieve * 0.25);
          const ancho = sp === 'alamo' ? 0.7 : sp === 'abedul' ? 0.8 : sp === 'frutal' ? 0.72 : 1;
          const alto = sp === 'alamo' ? 1.35 : sp === 'abedul' ? 1.05 : sp === 'frutal' ? 0.72 : 1;
          poner('desnudo', x, z, ry, s * ancho, s * alto, col);
        } else {
          const paleta = HOJAS[sp][est];
          col.set(paleta[Math.floor(azar(i * 29 + k) * paleta.length)]).offsetHSL(v * 0.03, 0, v * 0.1);
          if (sp === 'frutal') poner('roble', x, z, ry, s * 0.68, s * 0.7, col);
          else poner(sp, x, z, ry, s, s * (1 + v * 0.15), col);
        }
      }
      // Palmeras en las playas cálidas y en los oasis del desierto.
      if (libre && ((t === ORILLA && lat > 0.66 && azar(i * 4.3) < 0.25) || (t === DESIERTO && dulce && azar(i * 4.7) < 0.45))) {
        const x = cx + (azar(i * 19) - 0.5) * T * 0.6;
        const z = cz + (azar(i * 23) - 0.5) * T * 0.6;
        col.set(0x5f9a3a).offsetHSL(0, 0, (azar(i * 27) - 0.5) * 0.08);
        poner('palmera', x, z, azar(i * 2) * 6.28, 0.85 + azar(i * 3) * 0.4, 1, col, 0.05, 0.02);
      }
      // Arbustos (en flor en primavera; con bayas si las hay).
      const pArbusto = t === PRADERA ? 0.24 : t === BOSQUE ? 0.38 : t === ORILLA ? 0.08 : t === COLINA ? 0.14 : t === PANTANO ? 0.12 : 0;
      if (libre && azar(i * 8.7) < pArbusto) {
        const x = cx + (azar(i * 29) - 0.5) * T * 0.8;
        const z = cz + (azar(i * 31) - 0.5) * T * 0.8;
        const s = 0.8 + azar(i * 37) * 0.6;
        const ry = azar(i * 43) * 6.28;
        col.set(t === BOSQUE ? 0x3f7a36 : t === ORILLA ? 0x6a8f4a : t === COLINA ? 0x5a7f40 : 0x4f8a3e).offsetHSL(0, 0, (azar(i * 41) - 0.5) * 0.1);
        if (otono) col.lerp(OCRE, 0.45);
        if (invierno) col.lerp(MARRON, 0.55);
        if (nieve) col.lerp(BLANCO, nieve * 0.5);
        const enFlor = (primavera && azar(i * 47) < 0.4) || (est === 'verano' && azar(i * 47) < 0.12);
        poner(enFlor && (t === PRADERA || t === COLINA || t === ORILLA) ? 'arbustoFlor' : 'arbusto', x, z, ry, s, s, col, 0.08, 0);
        if (d.bayas[i] >= 3 && !invierno) poner('bayas', x, z, ry, s, s, col.set(BAYAS[Math.floor(azar(i * 53) * BAYAS.length)]), 0.08, 0);
      }
      // Matorral en la estepa y en el desierto.
      if (libre && (t === ESTEPA || t === DESIERTO) && azar(i * 6.7) < (t === ESTEPA ? 0.22 : 0.1)) {
        const x = cx + (azar(i * 59) - 0.5) * T * 0.8;
        const z = cz + (azar(i * 61) - 0.5) * T * 0.8;
        col.set(t === ESTEPA ? 0x8f8a52 : 0xa89a68).offsetHSL(0, 0, (azar(i * 63) - 0.5) * 0.1);
        if (primavera && t === ESTEPA) col.lerp(new THREE.Color(0x6f9a48), 0.5);
        if (nieve) col.lerp(BLANCO, nieve * 0.4);
        poner('matorral', x, z, azar(i * 67) * 6.28, 0.8 + azar(i * 71) * 0.6, 0.8 + azar(i * 73) * 0.5, col, 0.04, 0);
      }
      // Cactus en el desierto cálido.
      if (libre && t === DESIERTO && lat > 0.5 && !dulce && azar(i * 9.1) < 0.12) {
        const x = cx + (azar(i * 53) - 0.5) * T * 0.7;
        const z = cz + (azar(i * 59) - 0.5) * T * 0.7;
        const saguaro = azar(i * 7.9) < 0.55;
        col.set(saguaro ? 0x4e8a46 : 0x5f9a4a).offsetHSL(0, 0, (azar(i * 61) - 0.5) * 0.08);
        poner(saguaro ? 'saguaro' : 'chumbera', x, z, azar(i * 61) * 6.28, 0.8 + azar(i * 67) * 0.5, 0.8 + azar(i * 71) * 0.5, col, 0.03, 0.03);
      }
      // Piedras, rocas y vetas.
      const mineral = d.minerales?.[i] ?? 0;
      const piedras =
        t === MONTANA ? 2 : t === COLINA ? (azar(i * 4.1) < 0.55 ? 1 : 0) : t === DESIERTO ? (azar(i * 4.7) < 0.18 ? 1 : 0) : mineral ? 1 : (t === BOSQUE || t === PRADERA || t === ESTEPA) && azar(i * 3.3) < 0.04 ? 1 : 0;
      for (let k = 0; k < piedras; k++) {
        const x = cx + (azar(i * 19 + k) - 0.5) * T * 0.8;
        const z = cz + (azar(i * 23 + k) - 0.5) * T * 0.8;
        const s = t === MONTANA ? 0.9 + azar(i + k * 5) * 1.2 : 0.45 + azar(i + k * 5) * 0.6;
        const humeda = (t === BOSQUE || t === PANTANO || (t === COLINA && d.madera[i] >= 5)) && nieve < 0.3;
        col.set(t === DESIERTO ? 0xc9a77a : t === MONTANA ? 0x8b867d : 0x938c80).offsetHSL(0, 0, (azar(i * 31 + k) - 0.5) * 0.12);
        if (nieve) col.lerp(BLANCO, nieve * 0.5);
        poner(humeda ? 'rocaMusgo' : 'roca', x, z, azar(i * 2 + k) * 6.28, s, s * (0.7 + azar(i * 5 + k) * 0.5), col, 0.22, 0.3);
        if (mineral && k === 0) poner('cristales', x, z, azar(i * 3 + k) * 6.28, 0.9 + s * 0.4, 0.9 + s * 0.4, col.set(MINERAL[mineral]), 0.1, 0.1);
      }
    }
    // A lotes: matrices ya calculadas para copiar deprisa al repartir.
    for (const sp of Object.keys(ESPECIES)) {
      const a = L[sp];
      const n = a.length / 11;
      const lote = { n, mat: new Float32Array(n * 16), col: new Float32Array(n * 3), x: new Float32Array(n), y: new Float32Array(n), z: new Float32Array(n) };
      for (let j = 0; j < n; j++) {
        const o = j * 11;
        E.set(a[o + 3], a[o + 4], a[o + 5]);
        Q.setFromEuler(E);
        M.compose(V.set(a[o], a[o + 1], a[o + 2]), Q, ESC.set(a[o + 6], a[o + 7], a[o + 6]));
        M.toArray(lote.mat, j * 16);
        lote.col[j * 3] = a[o + 8];
        lote.col[j * 3 + 1] = a[o + 9];
        lote.col[j * 3 + 2] = a[o + 10];
        lote.x[j] = a[o];
        lote.y[j] = a[o + 1];
        lote.z[j] = a[o + 2];
      }
      this.lotes[sp] = lote;
    }
    this.datos = d;
    this.sucio = true;
    this.sueloSucio = true;
  }

  /**
   * Reparte cada planta entre el modelo con detalle (cerca de lo que se mira) y el
   * ligero (lejos; lo que queda tras la niebla, ni eso). Las sombras de lo cercano se
   * hacen con los modelos ligeros, en mallas que no se ven y solo dan sombra. Se
   * rehace cuando la vista se mueve bastante.
   */
  repartir(objetivo, distancia, camara) {
    if (!this.datos) return;
    const detalle = distancia < VISTA_DETALLE;
    // Se rehace si la vista se ha movido, girado, inclinado o acercado bastante.
    const giro = Math.atan2(camara.position.x - objetivo.x, camara.position.z - objetivo.z);
    const alto = (camara.position.y - objetivo.y) / Math.max(1, distancia);
    const r = this.reparto;
    if (
      !this.sucio &&
      r &&
      r.detalle === detalle &&
      Math.abs(Math.log(distancia / r.distancia)) < 0.15 &&
      Math.abs(giroHacia(r.giro, giro)) < 0.1 &&
      Math.abs(r.alto - alto) < 0.06 &&
      (r.x - objetivo.x) ** 2 + (r.z - objetivo.z) ** 2 < 64
    )
      return;
    this.reparto = { x: objetivo.x, z: objetivo.z, detalle, distancia, giro, alto };
    this.sucio = false;
    // Lo lejano, solo si cae dentro de la vista (con margen para que no se note al girar).
    const v = vista(camara);
    const margen = 10 + distancia * 0.2;
    const R2 = RADIO_DETALLE * RADIO_DETALLE;
    const usadas = new Set();
    const llenar = (prefijo, partes, lote, lista, capacidad, sombra = false) => {
      if (!lista.length) return;
      partes.forEach(([modelo, mat], p) => {
        const nombre = `${prefijo}-${p}`;
        const material = sombra ? (this.mat[mat].side === THREE.DoubleSide ? this.matSombraDoble : this.matSombra) : this.mat[mat];
        const im = instancias(this.escena, this.mallas, nombre, this.geo[modelo], material, capacidad, { sombra, recibe: !sombra });
        if (sombra) im.customDepthMaterial = this.mat[mat].userData.profundidad;
        copiar(im, lote, lista);
        cerrar(im, lista.length);
        usadas.add(nombre);
      });
    };
    for (const [sp, def] of Object.entries(ESPECIES)) {
      const lote = this.lotes[sp];
      if (!lote?.n) continue;
      const cerca = [];
      const lejos = [];
      const sombra = [];
      for (let j = 0; j < lote.n; j++) {
        const d2 = (lote.x[j] - objetivo.x) ** 2 + (lote.z[j] - objetivo.z) ** 2;
        if (d2 < R2) {
          sombra.push(j);
          (detalle ? cerca : lejos).push(j);
        } else if (enVista(v, lote.x[j], lote.y[j] + 1.5, lote.z[j], margen)) lejos.push(j);
      }
      llenar(`c-${sp}`, def.cerca, lote, cerca, Math.ceil(cerca.length * 1.3) + 16);
      llenar(`l-${sp}`, def.lejos, lote, lejos, lote.n + 16);
      if (def.sombra !== false) llenar(`s-${sp}`, def.lejos, lote, sombra, Math.ceil(sombra.length * 1.3) + 16, true);
    }
    for (const [nombre, im] of Object.entries(this.mallas)) if (!usadas.has(nombre) && im.visible) cerrar(im, 0);
  }

  /** Hierba, flores, helechos, setas, juncos, nenúfares y guijarros alrededor de lo que se mira. */
  cercania(objetivo, distancia) {
    const d = this.datos;
    if (!d) return;
    const ver = distancia < VISTA_SUELO;
    const c = this.centroSuelo;
    if (!this.sueloSucio && c && c.ver === ver && (!ver || (c.x - objetivo.x) ** 2 + (c.z - objetivo.z) ** 2 < 12 * 12)) return;
    this.centroSuelo = { x: objetivo.x, z: objetivo.z, ver };
    this.sueloSucio = false;
    const listas = Object.fromEntries(Object.keys(SUELO).map((k) => [k, []]));
    if (ver) this.sembrarSuelo(d, objetivo, listas);
    const color = new THREE.Color();
    for (const [nombre, datos] of Object.entries(listas)) {
      const n = datos.length / 9;
      if (!n && !this.suelo[nombre]) continue;
      const im = instancias(this.escena, this.suelo, nombre, this.geo[nombre], this.mat[SUELO[nombre]], Math.ceil(n * 1.25) + 32, { sombra: false });
      for (let j = 0; j < n; j++) {
        const o = j * 9;
        E.set(0, datos[o + 3], 0);
        Q.setFromEuler(E);
        M.compose(V.set(datos[o], datos[o + 1], datos[o + 2]), Q, ESC.set(datos[o + 4], datos[o + 5], datos[o + 4]));
        im.setMatrixAt(j, M);
        im.setColorAt(j, color.setRGB(datos[o + 6], datos[o + 7], datos[o + 8]));
      }
      cerrar(im, n);
    }
  }

  sembrarSuelo(d, objetivo, listas) {
    const tr = this.terreno;
    const mp = this.mapa;
    const W = d.ancho;
    const H = d.alto;
    const est = d.estacion;
    const invierno = est === 'invierno';
    const otono = est === 'otoño';
    const primavera = est === 'primavera';
    const verano = est === 'verano';
    const [ctx, cty] = tr.aCasilla(objetivo.x, objetivo.z);
    const R = RADIO_SUELO;
    const col = new THREE.Color();
    const seco = new THREE.Color(0xa4b552);
    const poner = (lista, x, z, ry, s, sy, hex, semilla, varia = 0.1, y = null) => {
      if (typeof hex === 'number') col.set(hex);
      else col.copy(hex);
      col.offsetHSL(0, 0, (azar(semilla) - 0.5) * varia);
      lista.push(x, y ?? tr.alturaEn(x, z, false) - 0.02, z, ry, s, sy, col.r, col.g, col.b);
    };
    const verdeHierba = new THREE.Color();
    for (let ty = Math.max(0, cty - R); ty <= Math.min(H - 1, cty + R); ty++) {
      for (let tx = Math.max(0, ctx - R); tx <= Math.min(W - 1, ctx + R); tx++) {
        const d2 = (tx - ctx) ** 2 + (ty - cty) ** 2;
        if (d2 > R * R) continue;
        const i = ty * W + tx;
        const t = d.terreno[i];
        const [cx, cz] = tr.aMundo(tx, ty);
        const lat = ty / (H - 1);
        const h = tr.hCasilla[i];
        if (t === AGUA) {
          // Nenúfares en las orillas tranquilas de los lagos templados.
          if (mp.bordeLago[i] && !invierno && lat > 0.25 && d.relieve[i] > -30 && azar(i * 3.3) < 0.45) {
            const n = azar(i * 3.7) < 0.5 ? 2 : 1;
            for (let k = 0; k < n; k++) {
              const x = cx + (azar(i * 5.1 + k) - 0.5) * T * 0.9;
              const z = cz + (azar(i * 5.3 + k) - 0.5) * T * 0.9;
              poner(listas.nenufar, x, z, azar(i * 5.7 + k) * 6.28, 0.8 + azar(i * 5.9 + k) * 0.5, 1, otono ? 0x8a9a3a : 0x4f8a3a, i * 6.1 + k, 0.1, -0.03);
            }
          }
          continue;
        }
        if (t === RIO || this.ocupadas.has(i)) continue;
        const nieve = Math.max(invierno && t !== DESIERTO ? acotar(1.1 - lat * 1.5, 0, 1) : 0, acotar((h - 6.2) / 1.5, 0, 1));
        if (nieve > 0.55) continue;
        const calor = acotar((lat - 0.62) / 0.25, 0, 1);
        // Hierba según el terreno y la estación.
        let n = 0;
        let alta = false;
        switch (t) {
          case PRADERA:
            n = 6;
            verdeHierba.set(primavera ? 0x7cc04a : verano ? 0x6fa844 : otono ? 0x9aa04a : 0x8f9a6a);
            if (verano) verdeHierba.lerp(seco, calor * 0.6);
            break;
          case ESTEPA:
            n = 5;
            alta = true;
            verdeHierba.set(primavera ? 0xb8c068 : verano ? 0xd2bf6a : otono ? 0xc8a860 : 0xb9b394);
            break;
          case PANTANO:
            n = 4;
            verdeHierba.set(invierno ? 0x7a7a52 : 0x5f7f3a);
            break;
          case COLINA:
            n = 3;
            verdeHierba.set(otono ? 0x9a9a52 : 0x8a9a52);
            break;
          case BOSQUE:
            n = 2;
            verdeHierba.set(otono ? 0x7a7a3a : 0x4f7a3a);
            break;
          case MONTANA:
            n = h < 5.5 ? 1 : 0;
            verdeHierba.set(0x8a9a6a);
            break;
          case ORILLA:
            n = mp.ribera[i] ? 3 : 1;
            alta = !mp.ribera[i];
            verdeHierba.set(mp.ribera[i] ? 0x7aa848 : 0xb0b07a);
            break;
          default:
            n = azar(i * 2.3) < 0.2 ? 1 : 0;
            alta = true;
            verdeHierba.set(0xc8b878);
        }
        if (nieve > 0.2) n = Math.round(n * 0.4);
        // Más mata cerca del centro de la vista.
        if (d2 < 100 && n) n += 2;
        for (let k = 0; k < n; k++) {
          const x = cx + (azar(i * 71 + k) - 0.5) * T;
          const z = cz + (azar(i * 73 + k * 7) - 0.5) * T;
          const s = 0.75 + azar(i * 79 + k) * 0.6;
          poner(alta ? listas.hierbaAlta : listas.hierba, x, z, azar(i + k) * 6.28, s, s * (0.8 + azar(i * 83 + k) * 0.5), verdeHierba, i * 87 + k, 0.14);
        }
        // Flores en primavera y verano.
        const pFlor = t === PRADERA ? 0.5 : t === COLINA ? 0.22 : t === ESTEPA && primavera ? 0.15 : t === ORILLA && mp.ribera[i] ? 0.2 : 0;
        if ((primavera || verano) && nieve < 0.2 && azar(i * 89) < pFlor) {
          const r = azar(i * 103);
          const tipo = calor > 0.3 && r < 0.4 ? 'lavanda' : primavera ? (r < 0.45 ? 'margaritas' : r < 0.75 ? 'botonOro' : 'amapolas') : r < 0.5 ? 'amapolas' : r < 0.75 ? 'margaritas' : 'lavanda';
          const nf = azar(i * 107) < 0.4 ? 2 : 1;
          for (let k = 0; k < nf; k++) {
            const x = cx + (azar(i * 97 + k) - 0.5) * T;
            const z = cz + (azar(i * 101 + k) - 0.5) * T;
            poner(listas[tipo], x, z, azar(i * 109 + k) * 6.28, 0.9 + azar(i * 113 + k) * 0.4, 1, verdeHierba, i * 117 + k);
          }
        }
        // Helechos y setas en el bosque.
        if ((t === BOSQUE || (t === PANTANO && azar(i * 5.1) < 0.4)) && !invierno && azar(i * 7.7) < 0.55) {
          const nh = azar(i * 9.3) < 0.25 ? 2 : 1;
          for (let k = 0; k < nh; k++) {
            const x = cx + (azar(i * 121 + k) - 0.5) * T * 0.9;
            const z = cz + (azar(i * 127 + k) - 0.5) * T * 0.9;
            poner(listas.helecho, x, z, azar(i * 131 + k) * 6.28, 0.8 + azar(i * 137 + k) * 0.5, 0.8 + azar(i * 139 + k) * 0.4, otono ? 0xa8642a : primavera ? 0x6aa040 : 0x4f8a3a, i * 141 + k);
          }
        }
        if (t === BOSQUE && otono && azar(i * 11.3) < 0.3) {
          const x = cx + (azar(i * 143) - 0.5) * T * 0.8;
          const z = cz + (azar(i * 149) - 0.5) * T * 0.8;
          poner(listas.setas, x, z, azar(i * 151) * 6.28, 0.9 + azar(i * 157) * 0.4, 1, 0xffffff, i * 163, 0);
        }
        // Juncos y eneas en los pantanos, las riberas de los ríos y los lagos.
        if (t === PANTANO || mp.ribera[i]) {
          const nj = t === PANTANO ? 3 : 2;
          for (let k = 0; k < nj; k++) {
            const x = cx + (azar(i * 167 + k) - 0.5) * T;
            const z = cz + (azar(i * 173 + k) - 0.5) * T;
            poner(listas.junco, x, z, azar(i * 179 + k) * 6.28, 0.8 + azar(i * 181 + k) * 0.5, 0.8 + azar(i * 191 + k) * 0.5, invierno ? 0x9a8f6a : otono ? 0x9a9a52 : 0x6d8a3c, i * 193 + k);
          }
        }
        // Guijarros en las playas y piedrecillas en el desierto.
        if ((t === ORILLA && !mp.ribera[i] && azar(i * 13.1) < 0.6) || (t === DESIERTO && azar(i * 15.7) < 0.3)) {
          const x = cx + (azar(i * 197) - 0.5) * T * 0.9;
          const z = cz + (azar(i * 199) - 0.5) * T * 0.9;
          poner(listas.guijarros, x, z, azar(i * 211) * 6.28, 1 + azar(i * 223) * 0.6, 1, t === DESIERTO ? 0xc4a878 : 0xa8a294, i * 227, 0.15);
        }
      }
    }
  }
}
