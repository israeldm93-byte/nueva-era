// Vegetación y rocas: cada bioma con sus plantas (coníferas en el norte y en las
// alturas, frondosos en lo templado, palmeras en las playas cálidas, cactus en el
// desierto, juncos en los pantanos), arbustos con bayas cuando las hay, árboles
// quemados tras los incendios y vetas de mineral. Se agrupa en trozos del mapa para
// que solo se dibuje lo que se ve. La hierba y las flores, solo cerca de la cámara.

import * as THREE from 'three';
import {
  AGUA,
  BOSQUE,
  C,
  CA,
  COLINA,
  Co,
  CoA,
  DESIERTO,
  ESTEPA,
  Ic,
  MONTANA,
  ORILLA,
  PANTANO,
  PRADERA,
  RIO,
  T,
  azar,
  cerrar,
  colocar,
  fundir,
  instancias,
} from './util3d.js?v=__MOTOR__';

const TROZO = 40;
/** El tronco de los árboles: se multiplica por el color de la copa, así que se oscurece. */
const TRONCO = 0x8a6040;

function modelos() {
  const rama = (x, y, z, rz, rx, l) => ({ geo: C(0.035, 0.05, l, 5), color: 0x2e2620, x, y, z, rz, rx });
  return {
    conifera: fundir([
      { geo: CA(0.07, 0.12, 0.7, 5), color: TRONCO, y: 0.35 },
      { geo: CoA(0.66, 0.95, 7), color: 0xffffff, y: 0.85 },
      { geo: CoA(0.52, 0.8, 7), color: 0xffffff, y: 1.3 },
      { geo: CoA(0.36, 0.65, 6), color: 0xffffff, y: 1.72 },
    ]),
    frondoso: fundir([
      { geo: CA(0.07, 0.12, 0.8, 5), color: TRONCO, y: 0.4 },
      { geo: Ic(0.62, 0), color: 0xffffff, y: 1.22, sy: 0.85 },
      { geo: Ic(0.42, 0), color: 0xffffff, x: 0.34, y: 1.0, z: 0.1 },
    ]),
    palmera: fundir([
      { geo: C(0.07, 0.09, 0.7, 6), color: 0x8a6a45, x: 0.02, y: 0.35, rz: 0.08 },
      { geo: C(0.06, 0.07, 0.7, 6), color: 0x8a6a45, x: 0.1, y: 1.0, rz: 0.2 },
      { geo: C(0.05, 0.06, 0.6, 6), color: 0x8a6a45, x: 0.24, y: 1.6, rz: 0.32 },
      ...[0, 1, 2, 3, 4, 5].map((k) => ({
        geo: Co(0.13, 0.95, 4),
        color: 0x4f8f3a,
        x: 0.32 + Math.cos((k / 6) * Math.PI * 2) * 0.38,
        y: 1.88,
        z: Math.sin((k / 6) * Math.PI * 2) * 0.38,
        rx: Math.sin((k / 6) * Math.PI * 2) * 1.2,
        rz: -Math.cos((k / 6) * Math.PI * 2) * 1.2,
        sz: 0.35,
      })),
    ]),
    arbusto: fundir([{ geo: Ic(0.34, 0), color: 0xffffff, y: 0.22, sx: 1.2, sy: 0.72 }]),
    bayas: fundir(
      [0, 1, 2, 3].map((k) => ({
        geo: new THREE.OctahedronGeometry(0.06, 0),
        color: 0xffffff,
        x: Math.cos(k * 1.7) * 0.26,
        y: 0.3 + 0.08 * (k % 2),
        z: Math.sin(k * 1.7) * 0.22,
      })),
    ),
    cactus: fundir([
      { geo: C(0.1, 0.12, 0.9, 7), color: 0x4e8a46, y: 0.45 },
      { geo: C(0.06, 0.06, 0.32, 6), color: 0x4e8a46, x: 0.16, y: 0.5, rz: -1.2 },
      { geo: C(0.06, 0.06, 0.3, 6), color: 0x4e8a46, x: 0.25, y: 0.68 },
      { geo: C(0.05, 0.05, 0.22, 6), color: 0x4e8a46, x: -0.14, y: 0.62, rz: 1.2 },
      { geo: C(0.05, 0.05, 0.22, 6), color: 0x4e8a46, x: -0.22, y: 0.78 },
    ]),
    roca: fundir([{ geo: Ic(0.44, 0), color: 0xffffff, y: 0.1, sx: 1.15, sy: 0.75 }]),
    cristales: fundir(
      [0, 1, 2, 3].map((k) => ({
        geo: new THREE.OctahedronGeometry(0.11, 0),
        color: 0xffffff,
        x: Math.cos(k * 1.9) * 0.18,
        y: 0.42 + 0.06 * k,
        z: Math.sin(k * 1.9) * 0.18,
        sy: 2.2,
        rx: (k - 1.5) * 0.25,
      })),
    ),
    muerto: fundir([
      { geo: C(0.06, 0.11, 1.4, 5), color: 0x2a2420, y: 0.7 },
      rama(0.18, 1.1, 0, -0.9, 0, 0.5),
      rama(-0.16, 0.95, 0.05, 0.8, 0.2, 0.45),
      rama(0.02, 1.25, -0.15, 0.2, -0.8, 0.4),
    ]),
    hierba: fundir(
      [0, 1, 2, 3, 4].map((k) => ({ geo: CoA(0.03, 0.24, 3), color: 0xffffff, x: Math.cos(k * 2.1) * 0.09, y: 0.11, z: Math.sin(k * 2.1) * 0.09, rz: (k - 2) * 0.22, rx: (k % 2 ? 0.2 : -0.15) })),
    ),
    junco: fundir(
      [0, 1, 2, 3, 4].map((k) => ({ geo: CA(0.012, 0.02, 0.95, 3), color: 0xffffff, x: Math.cos(k * 1.3) * 0.1, y: 0.47, z: Math.sin(k * 1.3) * 0.1, rx: (k - 2) * 0.08 })),
    ),
    flor: fundir([0, 1, 2].map((k) => ({ geo: Ic(0.045, 0), color: 0xffffff, x: Math.cos(k * 2.4) * 0.12, y: 0.12, z: Math.sin(k * 2.4) * 0.12 }))),
  };
}

const TIPOS = ['conifera', 'frondoso', 'palmera', 'arbusto', 'bayas', 'cactus', 'roca', 'cristales', 'muerto'];
const MINERAL = [0, 0x2fd18a, 0x3a4252, 0xd0412e];

export class Vegetacion3D {
  constructor(escena, terreno) {
    this.escena = escena;
    this.terreno = terreno;
    this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 });
    this.matBrillo = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.25, metalness: 0.35, emissive: 0x111111 });
    this.modelos = modelos();
    this.trozos = {};
    this.cerca = {};
    this.centroCerca = null;
  }

  /** Recalcula qué crece en cada sitio (cada día, porque se tala, se quema y cambian las estaciones). */
  actualizar(d) {
    const W = d.ancho;
    const H = d.alto;
    const tr = this.terreno;
    const invierno = d.estacion === 'invierno';
    const otono = d.estacion === 'otoño';
    const ceniza = new Map(d.cenizas.map(([i, a]) => [i, a]));
    const ocupadas = new Set();
    for (const a of d.aldeas) {
      for (const e of a.edificios) ocupadas.add(e.y * W + e.x);
      if (a.obra) ocupadas.add(a.obra.y * W + a.obra.x);
      const r = a.abandonada !== null ? 0 : a.poblacion > 40 ? 3 : a.poblacion > 12 ? 2 : 1;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + 1) ocupadas.add((a.y + dy) * W + a.x + dx);
    }
    // Listas por trozo y tipo: [x, y, z, giro, escala, escalaY, color].
    const nx = Math.ceil(W / TROZO);
    const nz = Math.ceil(H / TROZO);
    const listas = [];
    for (let k = 0; k < nx * nz; k++) listas.push(Object.fromEntries(TIPOS.map((t) => [t, []])));
    const verdeC = new THREE.Color(0x2c6438);
    const verdeF = new THREE.Color(0x4e8e38);
    const blanco = new THREE.Color(0xeef2f5);
    const ocre = new THREE.Color(0xc8702a);
    const amarillo = new THREE.Color(0xdba63a);
    const marron = new THREE.Color(0x6b5a48);
    const color = new THREE.Color();
    const poner = (tipo, i, x, z, ry, s, sy, col) => {
      const tx = i % W;
      const ty = Math.floor(i / W);
      const k = Math.floor(ty / TROZO) * nx + Math.floor(tx / TROZO);
      const y = tr.alturaEn(x, z, false);
      listas[k][tipo].push(x, y, z, ry, s, sy, col.r, col.g, col.b);
    };
    for (let i = 0; i < W * H; i++) {
      const t = d.terreno[i];
      if (t === AGUA || t === RIO) continue;
      const tx = i % W;
      const ty = Math.floor(i / W);
      const lat = ty / (H - 1);
      const [cx, cz] = tr.aMundo(tx, ty);
      const h = tr.hCasilla[i];
      const libre = !ocupadas.has(i);
      const quemada = ceniza.has(i) && ceniza.get(i) < 240;
      let arboles = 0;
      if (libre) {
        if (t === BOSQUE) arboles = Math.min(3, Math.round(d.madera[i] / 11));
        else if (t === PRADERA && azar(i * 5.3) < 0.07 && d.madera[i] >= 2) arboles = 1;
        else if (t === COLINA && d.madera[i] >= 5 && azar(i * 2.9) < 0.5) arboles = 1;
        else if (t === MONTANA && h < 7 && azar(i * 3.7) < 0.2) arboles = 1;
        else if (t === PANTANO && azar(i * 6.1) < 0.12) arboles = 1;
      }
      if (quemada && (t === BOSQUE || t === COLINA)) {
        // Lo que dejó el fuego: troncos negros.
        for (let k = 0; k < 2; k++) {
          const x = cx + (azar(i * 13 + k) - 0.5) * T * 0.8;
          const z = cz + (azar(i * 17 + k * 3) - 0.5) * T * 0.8;
          poner('muerto', i, x, z, azar(i + k) * 6, 0.8 + azar(i * 7 + k) * 0.5, 1, color.set(0xffffff));
        }
        arboles = Math.max(0, arboles - 1);
      }
      for (let k = 0; k < arboles; k++) {
        const x = cx + (azar(i * 13 + k) - 0.5) * T * 0.85;
        const z = cz + (azar(i * 17 + k * 3) - 0.5) * T * 0.85;
        const s = 0.75 + azar(i * 7 + k) * 0.6;
        // Coníferas en el frío y en lo alto; frondosos en lo templado.
        const pConifera = t === MONTANA || h > 4 ? 0.9 : lat < 0.35 ? 0.85 : lat > 0.75 ? 0.1 : 0.45;
        if (azar(i * 11 + k) < pConifera) {
          color.copy(verdeC).offsetHSL((azar(i * 3 + k) - 0.5) * 0.04, 0, (azar(i * 5 + k) - 0.5) * 0.1);
          if (invierno) color.lerp(blanco, lat < 0.6 ? 0.55 : 0.25);
          poner('conifera', i, x, z, azar(i + k) * 6, s, s, color);
        } else {
          color.copy(verdeF).offsetHSL((azar(i * 3 + k) - 0.5) * 0.05, 0, (azar(i * 5 + k) - 0.5) * 0.12);
          if (otono) color.lerp(azar(i + k * 9) < 0.5 ? ocre : amarillo, 0.75);
          if (invierno) color.copy(marron);
          // En invierno los de hoja caduca se quedan casi desnudos.
          poner('frondoso', i, x, z, azar(i + k) * 6, s, invierno ? s * 0.4 : s, color);
        }
      }
      // Palmeras en las playas cálidas.
      if (libre && t === ORILLA && lat > 0.68 && azar(i * 4.3) < 0.22) {
        const x = cx + (azar(i * 19) - 0.5) * T * 0.6;
        const z = cz + (azar(i * 23) - 0.5) * T * 0.6;
        poner('palmera', i, x, z, azar(i * 2) * 6, 0.9 + azar(i * 3) * 0.4, 1, color.set(0xffffff));
      }
      // Arbustos (con bayas si las hay).
      const pArbusto = t === PRADERA ? 0.22 : t === BOSQUE ? 0.35 : t === ESTEPA ? 0.06 : t === ORILLA ? 0.08 : t === COLINA ? 0.12 : 0;
      if (libre && azar(i * 8.7) < pArbusto) {
        const x = cx + (azar(i * 29) - 0.5) * T * 0.8;
        const z = cz + (azar(i * 31) - 0.5) * T * 0.8;
        const s = 0.8 + azar(i * 37) * 0.6;
        color.set(t === ESTEPA ? 0x8a8a4a : 0x4f8a3e).offsetHSL(0, 0, (azar(i * 41) - 0.5) * 0.1);
        if (otono) color.lerp(ocre, 0.4);
        if (invierno) color.lerp(marron, 0.6);
        poner('arbusto', i, x, z, azar(i * 43) * 6, s, s, color);
        if (d.bayas[i] >= 3 && !invierno) {
          poner('bayas', i, x, z, azar(i * 43) * 6, s, s, color.set(azar(i * 47) < 0.6 ? 0xc0263a : 0x5a3a8a));
        }
      }
      if (libre && t === DESIERTO && lat > 0.55 && azar(i * 9.1) < 0.08) {
        const x = cx + (azar(i * 53) - 0.5) * T * 0.7;
        const z = cz + (azar(i * 59) - 0.5) * T * 0.7;
        poner('cactus', i, x, z, azar(i * 61) * 6, 0.8 + azar(i * 67) * 0.5, 1, color.set(0xffffff));
      }
      // Piedras y vetas.
      const mineral = d.minerales?.[i] ?? 0;
      const piedras = t === MONTANA ? 2 : t === COLINA ? (azar(i * 4.1) < 0.55 ? 1 : 0) : t === DESIERTO ? (azar(i * 4.7) < 0.15 ? 1 : 0) : mineral ? 1 : 0;
      for (let k = 0; k < piedras; k++) {
        const x = cx + (azar(i * 19 + k) - 0.5) * T * 0.8;
        const z = cz + (azar(i * 23 + k) - 0.5) * T * 0.8;
        const s = t === MONTANA ? 0.9 + azar(i + k * 5) * 1.2 : 0.5 + azar(i + k * 5) * 0.6;
        color.set(t === DESIERTO ? 0xc9a77a : 0x8b867d).offsetHSL(0, 0, (azar(i * 31 + k) - 0.5) * 0.12);
        if (invierno && lat < 0.6) color.lerp(blanco, 0.45);
        poner('roca', i, x, z, azar(i * 2 + k) * 6, s, s * 0.8, color);
        if (mineral && k === 0) poner('cristales', i, x, z, azar(i * 3 + k) * 6, 0.9 + s * 0.4, 0.9 + s * 0.4, color.set(MINERAL[mineral]));
      }
    }
    // Volcar a las instancias de cada trozo.
    for (let k = 0; k < listas.length; k++) {
      for (const tipo of TIPOS) {
        const datos = listas[k][tipo];
        const n = datos.length / 9;
        const nombre = `${k}-${tipo}`;
        if (!n && !this.trozos[nombre]) continue;
        const sombra = tipo !== 'bayas' && tipo !== 'cristales';
        const im = instancias(this.escena, this.trozos, nombre, this.modelos[tipo], tipo === 'cristales' ? this.matBrillo : this.mat, Math.max(8, Math.ceil(n * 1.2)), { sombra, recorte: true });
        for (let j = 0; j < n; j++) {
          const o = j * 9;
          colocar(im, j, datos[o], datos[o + 1], datos[o + 2], datos[o + 3], datos[o + 4], datos[o + 5]);
          im.setColorAt(j, color.setRGB(datos[o + 6], datos[o + 7], datos[o + 8]));
        }
        cerrar(im, n);
      }
    }
    this.datos = d;
    this.centroCerca = null;
  }

  /** Hierba, juncos y flores alrededor de lo que se mira (se rehace al mover la cámara). */
  cercania(objetivo) {
    const d = this.datos;
    if (!d) return;
    if (this.centroCerca && (this.centroCerca.x - objetivo.x) ** 2 + (this.centroCerca.z - objetivo.z) ** 2 < 14 * 14 && this.estacionCerca === d.estacion) return;
    this.centroCerca = objetivo.clone();
    this.estacionCerca = d.estacion;
    const tr = this.terreno;
    const W = d.ancho;
    const [ctx, cty] = tr.aCasilla(objetivo.x, objetivo.z);
    const R = 22;
    const hierba = [];
    const juncos = [];
    const flores = [];
    const invierno = d.estacion === 'invierno';
    const flor = d.estacion === 'primavera' || d.estacion === 'verano';
    const color = new THREE.Color();
    for (let ty = cty - R; ty <= cty + R; ty++) {
      for (let tx = ctx - R; tx <= ctx + R; tx++) {
        if (tx < 0 || ty < 0 || tx >= W || ty >= d.alto) continue;
        if ((tx - ctx) ** 2 + (ty - cty) ** 2 > R * R) continue;
        const i = ty * W + tx;
        const t = d.terreno[i];
        const [cx, cz] = tr.aMundo(tx, ty);
        const lat = ty / (d.alto - 1);
        const cuantas = t === PRADERA ? 4 : t === ESTEPA ? 5 : t === PANTANO ? 3 : t === ORILLA ? 1 : t === COLINA ? 2 : t === BOSQUE ? 1 : 0;
        for (let k = 0; k < cuantas; k++) {
          const x = cx + (azar(i * 71 + k) - 0.5) * T;
          const z = cz + (azar(i * 73 + k * 7) - 0.5) * T;
          const s = 0.75 + azar(i * 79 + k) * 0.6;
          if (t === ESTEPA) color.set(invierno ? 0xb9b394 : 0xd2bf6a);
          else if (t === PANTANO) color.set(0x5f7f3a);
          else color.set(invierno ? (lat < 0.6 ? 0xe9eef0 : 0x8f9a6a) : 0x6fa844).offsetHSL(0, 0, (azar(i * 83 + k) - 0.5) * 0.12);
          hierba.push(x, tr.alturaEn(x, z, false), z, azar(i + k) * 6, s, s, color.r, color.g, color.b);
        }
        if (flor && t === PRADERA && azar(i * 89) < 0.35) {
          const x = cx + (azar(i * 97) - 0.5) * T;
          const z = cz + (azar(i * 101) - 0.5) * T;
          color.set([0xffffff, 0xf2d64b, 0xb06ad6, 0xe85a5a][Math.floor(azar(i * 103) * 4)]);
          flores.push(x, tr.alturaEn(x, z, false), z, azar(i) * 6, 1, 1, color.r, color.g, color.b);
        }
        // Juncos en los pantanos y a la orilla de los ríos y lagos.
        let orilla = t === PANTANO;
        if (!orilla && t !== AGUA && t !== RIO && t !== MONTANA) {
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const j = (ty + dy) * W + tx + dx;
            if (d.terreno[j] === RIO) orilla = true;
          }
        }
        if (orilla) {
          for (let k = 0; k < 3; k++) {
            const x = cx + (azar(i * 107 + k) - 0.5) * T;
            const z = cz + (azar(i * 109 + k) - 0.5) * T;
            color.set(invierno ? 0x9a8f6a : 0x6d8a3c);
            juncos.push(x, tr.alturaEn(x, z, false), z, azar(i * 113 + k) * 6, 0.8 + azar(i + k) * 0.5, 1, color.r, color.g, color.b);
          }
        }
      }
    }
    for (const [nombre, datos] of [
      ['hierba', hierba],
      ['junco', juncos],
      ['flor', flores],
    ]) {
      const n = datos.length / 9;
      const im = instancias(this.escena, this.cerca, nombre, this.modelos[nombre], this.mat, Math.max(16, Math.ceil(n * 1.2)), { sombra: false });
      for (let j = 0; j < n; j++) {
        const o = j * 9;
        colocar(im, j, datos[o], datos[o + 1], datos[o + 2], datos[o + 3], datos[o + 4], datos[o + 5]);
        im.setColorAt(j, color.setRGB(datos[o + 6], datos[o + 7], datos[o + 8]));
      }
      cerrar(im, n);
    }
  }
}

