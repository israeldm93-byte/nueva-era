// Modelos de las plantas, cada uno en dos versiones: con detalle (para lo que se ve de
// cerca) y ligera (para lo lejano). Abetos con faldas dentadas, pinos de copa en
// parasol, robles de copa ancha, abedules de corteza blanca, sauces llorones, álamos
// como columnas, palmeras, cactus, arbustos con flores o bayas, rocas con musgo y, a
// ras de suelo, hierba, flores, helechos, setas, juncos y nenúfares.
//
// Los colores de cada pieza son grises o colores «fijos»: lo gris se tiñe con el color
// de cada planta (según la especie, la estación y el sitio) y lo fijo no (troncos,
// flores, frutos).

import * as THREE from 'three';
import { CA, CoA, Cup, azar, fundir, gris, orientar, triangulos } from './util3d.js?v=__MOTOR__';

const ARRIBA = new THREE.Vector3(0, 1, 0);

/**
 * Un piso de conífera: un cono de borde dentado cuyas puntas caen un poco. Devuelve
 * la cara de arriba y la de abajo (más oscura) por separado.
 */
function falda(r, h, n, { dentro = 0.66, caida = 0.14 } = {}) {
  const cima = [0, h, 0];
  const borde = [];
  for (let k = 0; k < 2 * n; k++) {
    const a = (k / (2 * n)) * Math.PI * 2;
    const rr = k % 2 ? r * dentro : r;
    borde.push([Math.cos(a) * rr, k % 2 ? h * 0.05 : -h * caida, Math.sin(a) * rr]);
  }
  const lado = [];
  const bajo = [];
  const centro = [0, h * 0.18, 0];
  for (let k = 0; k < 2 * n; k++) {
    const p = borde[k];
    const q = borde[(k + 1) % (2 * n)];
    const fuera = new THREE.Vector3(p[0] + q[0], 0.4 * r, p[2] + q[2]);
    lado.push(orientar([cima, p, q], fuera));
    bajo.push(orientar([centro, q, p], new THREE.Vector3(0, -1, 0)));
  }
  return { lado: triangulos(lado), bajo: triangulos(bajo) };
}

/**
 * Una hoja larga (fronda de palmera o de helecho) que sale del origen hacia +x, sube
 * y se arquea hacia abajo; con un pliegue en el nervio para que no sea plana.
 */
function hoja(largo, ancho, { sube = 0.35, cae = 0.8, tramos = 3, pliegue = 0.45, punta = 0.75, abre = 1, dientes = 1 } = {}) {
  const corte = [];
  for (let s = 0; s <= tramos; s++) {
    const t = s / tramos;
    const x = largo * abre * t;
    const y = largo * (sube * t - cae * t * t);
    // Con `dientes` < 1, la hoja se estrecha a tramos (como los foliolos de un helecho).
    const w = ancho * Math.sin(Math.PI * Math.pow(t, punta)) * (s % 2 ? dientes : 1);
    corte.push([
      [x, y, -w],
      [x, y + pliegue * w, 0],
      [x, y, w],
    ]);
  }
  const tris = [];
  for (let s = 0; s < tramos; s++) {
    const [l0, c0, r0] = corte[s];
    const [l1, c1, r1] = corte[s + 1];
    tris.push([l0, c0, l1], [c0, c1, l1], [c0, r0, c1], [r0, r1, c1]);
  }
  return triangulos(tris);
}

/** Una brizna: un triángulo largo y estrecho, algo inclinado. */
function brizna(alto, ancho, inclina = 0) {
  return triangulos([
    [
      [-ancho / 2, 0, 0],
      [ancho / 2, 0, 0],
      [inclina, alto, 0],
    ],
  ]);
}

/** Un bulto irregular (copas, rocas): un icosaedro con los vértices movidos. */
function bulto(r, semilla, rugoso = 0.16, detalle = 0) {
  const g = new THREE.IcosahedronGeometry(r, detalle);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const clave = Math.round(x * 1000) * 0.1307 + Math.round(y * 1000) * 0.0919 + Math.round(z * 1000) * 0.1733;
    const k = 1 + (azar(clave + semilla * 17.1) - 0.5) * 2 * rugoso;
    p.setXYZ(i, x * k, y * k, z * k);
  }
  g.computeVertexNormals();
  return g;
}

/** Una rama que nace en (x, y, z) y sale en la dirección marcada por los giros. */
function rama(x, y, z, rx, rz, largo, grueso, color, extra = {}) {
  const e = new THREE.Euler(rx, 0, rz);
  const d = ARRIBA.clone().applyEuler(e).multiplyScalar(largo / 2);
  return { geo: CA(grueso * 0.55, grueso, largo, 5), color, x: x + d.x, y: y + d.y, z: z + d.z, rx, rz, ...extra };
}

/** Pone puntos (flores, bayas, frutos) repartidos sobre una copa redonda. */
function salpicar(n, r, cy, sy, geo, colores, semilla, extra = {}) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const a = k * 2.39996 + azar(semilla + k) * 0.6;
    const v = 0.15 + 0.8 * azar(semilla * 3 + k);
    const rr = r * Math.sqrt(1 - v * v);
    out.push({ geo, color: colores[k % colores.length], x: Math.cos(a) * rr, y: cy + v * r * sy, z: Math.sin(a) * rr, ...extra });
  }
  return out;
}

/** Vuelve «musgo» (color fijo) las caras que miran hacia arriba. */
function conMusgo(geo, color, umbral = 0.55) {
  const n = geo.attributes.normal;
  const c = geo.attributes.color;
  const f = geo.attributes.fijo ?? new THREE.BufferAttribute(new Float32Array(n.count), 1);
  const musgo = new THREE.Color(color);
  for (let t = 0; t < n.count; t += 3) {
    const ny = (n.getY(t) + n.getY(t + 1) + n.getY(t + 2)) / 3;
    if (ny < umbral) continue;
    for (let k = 0; k < 3; k++) {
      c.setXYZ(t + k, musgo.r, musgo.g, musgo.b);
      f.setX(t + k, 1);
    }
  }
  geo.setAttribute('fijo', f);
  return geo;
}

/**
 * Versión nevada de un árbol: en cada cara que mira hacia arriba, su punto más alto
 * queda blanco (y sin teñir), así la nieve se ve encima de cada piso y de cada mata y
 * el verde asoma por debajo y por los bordes.
 */
function nevado(geo) {
  const g = geo.clone();
  const pos = g.attributes.position;
  const c = g.attributes.color;
  const f = g.attributes.fijo ?? new THREE.BufferAttribute(new Float32Array(pos.count), 1);
  const nieve = new THREE.Color(0xf4f7fa);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const d = new THREE.Vector3();
  for (let t = 0; t < pos.count; t += 3) {
    if (f.getX(t) === 1) continue;
    a.fromBufferAttribute(pos, t);
    b.fromBufferAttribute(pos, t + 1).sub(a);
    d.fromBufferAttribute(pos, t + 2).sub(a);
    if (b.cross(d).normalize().y < 0.3) continue;
    let alto = t;
    for (let k = 1; k < 3; k++) if (pos.getY(t + k) > pos.getY(alto)) alto = t + k;
    c.setXYZ(alto, nieve.r, nieve.g, nieve.b);
    f.setX(alto, 1);
  }
  g.setAttribute('fijo', f);
  return g;
}

const CORTEZA = 0x5e4630;
const ABEDUL = 0xe9e5da;
const OCT = (r) => new THREE.OctahedronGeometry(r, 0);

function arboles() {
  // ----- abeto -----
  const pisos = [
    [0.95, 0.86, 0.38],
    [0.8, 0.8, 0.8],
    [0.64, 0.74, 1.18],
    [0.48, 0.64, 1.52],
    [0.3, 0.58, 1.84],
  ];
  const abeto = [{ geo: CA(0.065, 0.12, 1.0, 6), color: 0x55402c, y: 0.5, fijo: 1, oscuro: 0.4 }];
  pisos.forEach(([r, h, y], k) => {
    const f = falda(r, h, 7);
    abeto.push({ geo: f.lado, color: gris(k % 2 ? 0.92 : 1), y, ry: k * 0.45, oscuro: 0.18 });
    if (k < 3) abeto.push({ geo: f.bajo, color: gris(0.42), y, ry: k * 0.45 });
  });

  // ----- pino -----
  const pino = [
    { geo: CA(0.072, 0.11, 1.35, 6), color: 0x7a4a2c, y: 0.67, rz: 0.04, fijo: 1, oscuro: 0.3 },
    { geo: CA(0.048, 0.072, 0.95, 5), color: 0x7a4a2c, x: 0.05, y: 1.75, rz: -0.08, fijo: 1 },
    rama(0.05, 1.7, 0, 0, -0.95, 0.6, 0.04, 0x6a4026, { fijo: 1 }),
    rama(0.02, 1.85, 0.03, 0.15, 0.95, 0.55, 0.035, 0x6a4026, { fijo: 1 }),
    { geo: bulto(0.56, 1), color: gris(1), y: 2.32, sx: 1.25, sy: 0.5, sz: 1.15, oscuro: 0.5 },
    { geo: bulto(0.42, 2), color: gris(0.9), x: 0.55, y: 2.1, z: 0.12, sx: 1.2, sy: 0.5, sz: 1.1, oscuro: 0.5 },
    { geo: bulto(0.4, 3), color: gris(0.94), x: -0.48, y: 2.2, z: -0.15, sx: 1.2, sy: 0.5, sz: 1.1, oscuro: 0.5 },
    { geo: bulto(0.3, 4), color: gris(1.06), x: 0.06, y: 2.58, z: -0.18, sx: 1.2, sy: 0.55, oscuro: 0.35 },
  ];

  // ----- roble (y frutales, con otros colores) -----
  const roble = [
    { geo: CA(0.11, 0.19, 1.0, 7), color: CORTEZA, y: 0.5, fijo: 1, oscuro: 0.35 },
    rama(0.05, 0.9, 0, 0.1, -0.85, 0.75, 0.075, CORTEZA, { fijo: 1 }),
    rama(-0.05, 0.92, 0.04, 0.35, 0.8, 0.7, 0.07, CORTEZA, { fijo: 1 }),
    rama(0, 0.95, -0.06, -0.8, 0.05, 0.65, 0.065, CORTEZA, { fijo: 1 }),
    { geo: bulto(0.72, 5), color: gris(1), y: 1.78, sx: 1.15, sy: 0.82, sz: 1.1, oscuro: 0.45 },
    { geo: bulto(0.5, 6), color: gris(0.88), x: 0.66, y: 1.5, z: 0.1, sy: 0.85, oscuro: 0.45 },
    { geo: bulto(0.48, 7), color: gris(0.92), x: -0.58, y: 1.54, z: 0.24, sy: 0.85, oscuro: 0.45 },
    { geo: bulto(0.46, 8), color: gris(0.86), x: 0.06, y: 1.5, z: -0.62, sy: 0.85, oscuro: 0.45 },
    { geo: bulto(0.4, 9), color: gris(1.08), x: 0.12, y: 2.24, z: 0.16, sy: 0.85, oscuro: 0.3 },
  ];

  // ----- abedul -----
  const blanco = ABEDUL;
  const veta = 0x2a2622;
  const abedul = [
    { geo: CA(0.05, 0.075, 1.3, 6), color: blanco, y: 0.65, fijo: 1 },
    { geo: CA(0.034, 0.05, 0.95, 5), color: blanco, x: 0.03, y: 1.76, rz: -0.06, fijo: 1 },
    { geo: CA(0.071, 0.072, 0.07, 6), color: veta, y: 0.33, fijo: 1 },
    { geo: CA(0.062, 0.063, 0.06, 6), color: veta, y: 0.86, fijo: 1 },
    { geo: CA(0.047, 0.048, 0.05, 5), color: veta, x: 0.02, y: 1.5, rz: -0.06, fijo: 1 },
    rama(0.03, 1.45, 0, 0.2, -0.8, 0.45, 0.025, blanco, { fijo: 1 }),
    rama(0.02, 1.6, 0.02, -0.3, 0.75, 0.4, 0.022, blanco, { fijo: 1 }),
    { geo: bulto(0.48, 11), color: gris(1), y: 2.08, sy: 1.35, oscuro: 0.4 },
    { geo: bulto(0.36, 12), color: gris(0.9), x: 0.3, y: 1.62, z: 0.08, sy: 1.2, oscuro: 0.4 },
    { geo: bulto(0.34, 13), color: gris(0.94), x: -0.26, y: 1.76, z: -0.12, sy: 1.2, oscuro: 0.4 },
  ];

  // ----- sauce llorón: copa redonda de la que cuelga una cortina de ramas -----
  const sauce = [
    { geo: CA(0.1, 0.17, 1.15, 6), color: 0x5a4a38, x: 0.04, y: 0.57, rz: -0.08, fijo: 1, oscuro: 0.3 },
    rama(0.08, 1.0, 0, 0.2, -0.9, 0.55, 0.06, 0x5a4a38, { fijo: 1 }),
    rama(0.06, 1.05, 0.02, -0.4, 0.8, 0.5, 0.055, 0x5a4a38, { fijo: 1 }),
    { geo: bulto(0.7, 21, 0.14), color: gris(1.04), y: 1.78, sx: 1.12, sy: 0.72, sz: 1.12, oscuro: 0.25 },
  ];
  for (let k = 0; k < 16; k++) {
    const fuera = k % 2 === 0;
    const a = (k / 16) * Math.PI * 2 + azar(k) * 0.25;
    const r = (fuera ? 0.74 : 0.5) + azar(k * 3) * 0.08;
    const largo = (fuera ? 1.25 : 0.95) + azar(k * 7) * 0.3;
    sauce.push({ geo: CoA(0.12, largo, 4), color: gris(0.86 + azar(k * 5) * 0.16), x: Math.cos(a) * r, y: 1.72 - largo / 2, z: Math.sin(a) * r, rx: Math.PI, ry: a, oscuro: -0.25 });
  }

  // ----- álamo: una columna alta y estrecha, como una llama -----
  const alamo = [
    { geo: CA(0.055, 0.1, 1.0, 5), color: 0x8a8070, y: 0.5, fijo: 1, oscuro: 0.3 },
    { geo: bulto(0.44, 31, 0.13, 1), color: gris(1), y: 1.95, sy: 2.5, oscuro: 0.35 },
    { geo: bulto(0.26, 32, 0.15), color: gris(1.08), x: 0.06, y: 3.05, z: 0.02, sy: 1.6, oscuro: 0.2 },
  ];

  // ----- palmera -----
  const palmeraTronco = [];
  let px = 0;
  let py = 0;
  const giros = [0.05, 0.12, 0.2, 0.29];
  giros.forEach((g, k) => {
    const L = 0.64;
    const cx = px + (Math.sin(g) * L) / 2;
    const cy = py + (Math.cos(g) * L) / 2;
    const r0 = 0.1 - k * 0.011;
    palmeraTronco.push({ geo: CA(r0 - 0.012, r0, L * 1.06, 6), color: k % 2 ? 0x7a5a3a : 0x8f6e48, x: cx, y: cy, rz: -g, fijo: 1 });
    px += Math.sin(g) * L;
    py += Math.cos(g) * L;
  });
  for (let k = 0; k < 3; k++) {
    const a = k * 2.1;
    palmeraTronco.push({ geo: OCT(0.075), color: 0x5a4026, x: px + Math.cos(a) * 0.09, y: py - 0.08, z: Math.sin(a) * 0.09, fijo: 1 });
  }
  const palmeraHojas = [];
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + azar(k * 11) * 0.4;
    palmeraHojas.push({ geo: hoja(1.15 + azar(k) * 0.25, 0.18, { sube: 0.45, cae: 0.95, tramos: 5, dientes: 0.55 }), color: gris(0.92 + azar(k * 3) * 0.14), x: px, y: py, ry: -a });
  }
  for (let k = 0; k < 2; k++) {
    palmeraHojas.push({ geo: hoja(0.6, 0.1, { sube: 1.2, cae: 0.9 }), color: gris(1.1), x: px, y: py, ry: k * 2.6 + 0.4 });
  }

  // ----- árboles de hoja caduca en invierno: solo las ramas -----
  const desnudo = [
    { geo: CA(0.09, 0.16, 1.0, 6), color: gris(1), y: 0.5, oscuro: 0.3 },
    rama(0, 0.95, 0, 0.05, 0.08, 1.1, 0.06, gris(0.95)),
  ];
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + 0.4;
    const inc = 0.65 + azar(k * 3) * 0.25;
    const rx = Math.sin(a) * inc;
    const rz = -Math.cos(a) * inc;
    const y0 = 0.85 + (k % 3) * 0.14;
    const largo = 0.85 + azar(k * 5) * 0.25;
    desnudo.push(rama(0, y0, 0, rx, rz, largo, 0.055, gris(0.95)));
    const e = new THREE.Euler(rx, 0, rz);
    const fin = ARRIBA.clone().applyEuler(e).multiplyScalar(largo * 0.92).add(new THREE.Vector3(0, y0, 0));
    const medio = ARRIBA.clone().applyEuler(e).multiplyScalar(largo * 0.5).add(new THREE.Vector3(0, y0, 0));
    desnudo.push(rama(fin.x, fin.y, fin.z, rx * 0.35, rz * 0.35 + 0.3, 0.45, 0.024, gris(0.9)));
    desnudo.push(rama(fin.x, fin.y, fin.z, rx * 1.3, rz * 1.3 - 0.25, 0.38, 0.02, gris(0.9)));
    desnudo.push(rama(medio.x, medio.y, medio.z, rx * 0.2 - 0.3, rz * 0.2, 0.4, 0.02, gris(0.9)));
  }

  return { abeto, pino, roble, abedul, sauce, alamo, palmeraTronco, palmeraHojas, desnudo, cimaPalmera: [px, py] };
}

/** Todos los modelos (geometrías ya fundidas). */
export function modelosPlantas() {
  const a = arboles();
  const [px, py] = a.cimaPalmera;
  const m = {};
  // ---------- de cerca ----------
  m.abeto = fundir(a.abeto);
  m.pino = fundir(a.pino);
  m.roble = fundir(a.roble);
  m.abedul = fundir(a.abedul);
  m.sauce = fundir(a.sauce);
  m.alamo = fundir(a.alamo);
  m.palmeraTronco = fundir(a.palmeraTronco);
  m.palmeraHojas = fundir(a.palmeraHojas);
  m.desnudo = fundir(a.desnudo);
  m.quemado = fundir([
    { geo: CA(0.06, 0.11, 1.4, 5), color: 0x2a2420, y: 0.7, fijo: 1 },
    rama(0, 1.0, 0, 0.1, -0.9, 0.5, 0.04, 0x2a2420, { fijo: 1 }),
    rama(0, 0.85, 0.02, 0.3, 0.8, 0.45, 0.035, 0x2a2420, { fijo: 1 }),
    rama(0, 1.2, -0.03, -0.8, 0.2, 0.4, 0.03, 0x2a2420, { fijo: 1 }),
  ]);
  // El tocón que queda al talar: corteza, el corte claro con sus anillos y raíces.
  m.tocon = fundir([
    { geo: CA(0.13, 0.17, 0.28, 7), color: 0x5e4a38, y: 0.14, fijo: 1 },
    { geo: new THREE.CircleGeometry(0.13, 7).rotateX(-Math.PI / 2), color: 0xd9bf8c, y: 0.28, fijo: 1 },
    { geo: new THREE.RingGeometry(0.05, 0.065, 7).rotateX(-Math.PI / 2), color: 0xb08a5a, y: 0.282, fijo: 1 },
    { geo: CA(0.025, 0.055, 0.24, 4), color: 0x4e3c2c, x: 0.15, y: 0.05, rz: -1.2, fijo: 1 },
    { geo: CA(0.025, 0.05, 0.2, 4), color: 0x4e3c2c, x: -0.09, y: 0.05, z: 0.13, rx: 1.2, rz: 0.5, fijo: 1 },
    { geo: CA(0.02, 0.045, 0.2, 4), color: 0x4e3c2c, x: -0.07, y: 0.05, z: -0.14, rx: -1.2, rz: 0.4, fijo: 1 },
  ]);
  const matas = [
    { geo: bulto(0.34, 41), color: gris(1), y: 0.24, sx: 1.2, sy: 0.75, oscuro: 0.55 },
    { geo: bulto(0.26, 42), color: gris(0.88), x: 0.24, y: 0.18, z: 0.1, sy: 0.8, oscuro: 0.55 },
    { geo: bulto(0.24, 43), color: gris(0.94), x: -0.2, y: 0.17, z: -0.14, sy: 0.8, oscuro: 0.55 },
  ];
  m.arbusto = fundir(matas);
  m.arbustoFlor = fundir([...matas, ...salpicar(10, 0.36, 0.22, 0.75, OCT(0.048), [0xfaf6f0, 0xf2a0c0, 0xfaf6f0, 0xf4d04b], 7, { fijo: 1, sy: 0.5 })]);
  m.bayas = fundir(salpicar(8, 0.37, 0.2, 0.7, OCT(0.05), [gris(1), gris(0.8)], 19));
  const matorral = [{ geo: bulto(0.14, 61), color: gris(0.85), y: 0.08, sy: 0.7 }];
  for (let k = 0; k < 8; k++) {
    const a = k * 2.39996;
    const inc = 0.35 + azar(k * 7) * 0.5;
    matorral.push(rama(0, 0.04, 0, Math.sin(a) * inc, -Math.cos(a) * inc, 0.38 + azar(k) * 0.2, 0.03, gris(0.9 + azar(k * 3) * 0.2)));
  }
  m.matorral = fundir(matorral);
  m.saguaro = fundir([
    { geo: CA(0.13, 0.15, 1.7, 8), color: gris(1), y: 0.85, oscuro: 0.25 },
    { geo: CoA(0.13, 0.13, 8), color: gris(1.06), y: 1.765 },
    { geo: CA(0.075, 0.075, 0.26, 6), color: gris(0.94), x: 0.24, y: 0.76, rz: Math.PI / 2 },
    { geo: CA(0.07, 0.075, 0.6, 6), color: gris(0.94), x: 0.35, y: 1.03 },
    { geo: CoA(0.07, 0.07, 6), color: gris(1), x: 0.35, y: 1.365 },
    { geo: CA(0.065, 0.065, 0.2, 6), color: gris(0.94), x: -0.2, y: 1.0, rz: Math.PI / 2 },
    { geo: CA(0.06, 0.065, 0.4, 6), color: gris(0.94), x: -0.29, y: 1.18 },
    { geo: CoA(0.06, 0.06, 6), color: gris(1), x: -0.29, y: 1.415 },
  ]);
  const pala = (x, y, z, ry, rz, s, k) => ({ geo: bulto(0.2, 70 + k, 0.08), color: gris(0.92 + 0.04 * (k % 3)), x, y, z, ry, rz, sx: s, sy: s * 1.15, sz: s * 0.32 });
  m.chumbera = fundir([
    pala(0, 0.2, 0, 0, 0, 1, 0),
    pala(0.16, 0.48, 0.02, 0.3, -0.5, 0.85, 1),
    pala(-0.14, 0.45, -0.03, -0.4, 0.45, 0.8, 2),
    pala(0.05, 0.7, 0.05, 1.2, -0.15, 0.7, 3),
    pala(0.3, 0.72, -0.04, 0.6, -0.9, 0.6, 4),
    { geo: OCT(0.04), color: 0xb0305a, x: 0.06, y: 0.93, z: 0.05, fijo: 1 },
    { geo: OCT(0.04), color: 0xc8483a, x: -0.2, y: 0.66, z: -0.02, fijo: 1 },
    { geo: OCT(0.04), color: 0xb0305a, x: 0.42, y: 0.86, z: -0.04, fijo: 1 },
  ]);
  const rocas = [
    { geo: bulto(0.45, 51, 0.24), color: gris(1), y: 0.12, sx: 1.15, sy: 0.72, oscuro: 0.35 },
    { geo: bulto(0.22, 52, 0.24), color: gris(0.9), x: 0.4, y: 0.02, z: 0.16, oscuro: 0.35 },
  ];
  m.roca = fundir(rocas);
  m.rocaMusgo = conMusgo(fundir(rocas), 0x5f7a3a);
  m.cristales = fundir(
    [0, 1, 2, 3].map((k) => ({ geo: OCT(0.11), color: 0xffffff, x: Math.cos(k * 1.9) * 0.18, y: 0.42 + 0.06 * k, z: Math.sin(k * 1.9) * 0.18, sy: 2.2, rx: (k - 1.5) * 0.25 })),
  );

  // ---------- de lejos (pocas caras) ----------
  m.abetoL = fundir([
    { geo: CA(0.08, 0.12, 0.6, 4), color: 0x55402c, y: 0.3, fijo: 1 },
    { geo: CoA(0.94, 1.32, 6), color: gris(0.9), y: 1.04 },
    { geo: CoA(0.62, 1.15, 6), color: gris(1), y: 1.86 },
  ]);
  m.pinoL = fundir([
    { geo: CA(0.06, 0.1, 2.05, 4), color: 0x7a4a2c, y: 1.02, fijo: 1 },
    { geo: OCT(0.7), color: gris(1), y: 2.32, sx: 1.2, sy: 0.42, sz: 1.1 },
    { geo: OCT(0.48), color: gris(0.9), x: 0.45, y: 2.12, z: 0.1, sy: 0.45 },
  ]);
  m.robleL = fundir([
    { geo: CA(0.11, 0.17, 1.1, 5), color: CORTEZA, y: 0.55, fijo: 1 },
    { geo: new THREE.IcosahedronGeometry(0.88, 0), color: gris(1), y: 1.72, sx: 1.12, sy: 0.82, sz: 1.08, oscuro: 0.4 },
    { geo: OCT(0.55), color: gris(0.9), x: 0.55, y: 1.5, z: 0.2, sy: 0.8 },
  ]);
  m.abedulL = fundir([
    { geo: CA(0.045, 0.07, 1.8, 4), color: ABEDUL, y: 0.9, fijo: 1 },
    { geo: new THREE.IcosahedronGeometry(0.5, 0), color: gris(1), y: 1.9, sy: 1.6, oscuro: 0.35 },
  ]);
  const sauceL = [
    { geo: CA(0.1, 0.16, 1.05, 4), color: 0x5a4a38, y: 0.52, fijo: 1 },
    { geo: new THREE.IcosahedronGeometry(0.8, 0), color: gris(1), y: 1.6, sx: 1.15, sy: 0.6, sz: 1.15 },
  ];
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.4;
    sauceL.push({ geo: CoA(0.26, 1.05, 4), color: gris(0.92), x: Math.cos(a) * 0.62, y: 1.05, z: Math.sin(a) * 0.62, rx: Math.PI, ry: a });
  }
  m.sauceL = fundir(sauceL);
  m.alamoL = fundir([
    { geo: CA(0.055, 0.09, 1.3, 4), color: 0x8a8070, y: 0.65, fijo: 1 },
    { geo: new THREE.IcosahedronGeometry(0.44, 0), color: gris(1), y: 2.1, sy: 3.3, oscuro: 0.3 },
  ]);
  const palmeraL = [
    { geo: CA(0.07, 0.1, 1.3, 4), color: 0x8f6e48, x: 0.08, y: 0.64, rz: -0.12, fijo: 1 },
    { geo: CA(0.06, 0.07, 1.3, 4), color: 0x7a5a3a, x: 0.3, y: 1.86, rz: -0.24, fijo: 1 },
  ];
  for (let k = 0; k < 6; k++) palmeraL.push({ geo: hoja(1.2, 0.2, { tramos: 2, sube: 0.4, cae: 0.85, pliegue: 0 }), color: gris(1), x: px, y: py, ry: -(k / 6) * Math.PI * 2 });
  m.palmeraL = fundir(palmeraL);
  m.desnudoL = fundir([
    { geo: CA(0.09, 0.15, 1.0, 4), color: gris(1), y: 0.5 },
    rama(0, 0.9, 0, 0.6, -0.4, 0.9, 0.05, gris(0.95)),
    rama(0, 0.9, 0, -0.5, 0.5, 0.85, 0.05, gris(0.95)),
    rama(0, 0.95, 0, 0.1, 0.8, 0.8, 0.045, gris(0.95)),
  ]);
  m.arbustoL = fundir([{ geo: OCT(0.36), color: gris(1), y: 0.22, sx: 1.25, sy: 0.7, oscuro: 0.5 }]);
  m.matorralL = fundir([{ geo: CoA(0.26, 0.38, 5), color: gris(0.95), y: 0.19 }]);
  m.saguaroL = fundir([
    { geo: CA(0.13, 0.15, 1.75, 5), color: gris(1), y: 0.88 },
    { geo: CA(0.07, 0.07, 0.6, 4), color: gris(0.94), x: 0.35, y: 1.03 },
  ]);
  m.chumberaL = fundir([
    { geo: OCT(0.22), color: gris(1), y: 0.22, sy: 1.1, sz: 0.35 },
    { geo: OCT(0.17), color: gris(0.95), x: 0.15, y: 0.5, ry: 0.3, rz: -0.5, sz: 0.35 },
  ]);
  m.abetoNieve = nevado(m.abeto);
  m.pinoNieve = nevado(m.pino);
  m.abetoLNieve = nevado(m.abetoL);
  m.pinoLNieve = nevado(m.pinoL);
  m.rocaL = fundir([{ geo: new THREE.IcosahedronGeometry(0.46, 0), color: gris(1), y: 0.12, sx: 1.15, sy: 0.72, oscuro: 0.3 }]);

  // ---------- a ras de suelo (solo cerca de la cámara) ----------
  const mata = (n, alto, ancho, abre, semilla) => {
    const out = [];
    for (let k = 0; k < n; k++) {
      const a = k * 2.39996 + azar(semilla + k) * 0.5;
      const r = 0.03 + azar(semilla * 2 + k) * 0.08;
      out.push({
        geo: brizna(alto * (0.7 + azar(semilla * 3 + k) * 0.5), ancho, abre * (0.5 + azar(semilla * 5 + k))),
        color: gris(0.9 + azar(semilla * 7 + k) * 0.3),
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        ry: -a,
        oscuro: 0.45,
      });
    }
    return out;
  };
  m.hierba = fundir(mata(7, 0.3, 0.05, 0.08, 3));
  m.hierbaAlta = fundir([
    ...mata(9, 0.46, 0.045, 0.12, 5),
    ...[0, 1, 2].map((k) => ({ geo: OCT(0.02), color: gris(1.25), x: Math.cos(k * 2.1) * 0.08, y: 0.42 + k * 0.03, z: Math.sin(k * 2.1) * 0.08, sy: 3 })),
  ]);
  const tallo = (x, z, alto, k) => ({ geo: brizna(alto, 0.018, 0.02), color: gris(0.75), x, z, ry: k * 1.3, oscuro: 0.4 });
  const ramillete = (n, semilla, flor) => {
    const out = [];
    for (let k = 0; k < n; k++) {
      const a = k * 2.39996 + azar(semilla + k);
      const r = 0.04 + azar(semilla * 3 + k) * 0.12;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const alto = 0.18 + azar(semilla * 5 + k) * 0.1;
      out.push(tallo(x, z, alto, k), ...flor(x, alto, z, k));
    }
    return out;
  };
  m.amapolas = fundir([
    ...mata(4, 0.2, 0.04, 0.06, 9),
    ...ramillete(4, 11, (x, y, z) => [
      { geo: Cup(0.048, 6, 2), color: 0xd8241e, x, y: y + 0.035, z, rx: Math.PI, sy: 0.8, fijo: 1 },
      { geo: OCT(0.016), color: 0x1a1414, x, y: y + 0.012, z, fijo: 1 },
    ]),
  ]);
  m.margaritas = fundir([
    ...mata(4, 0.2, 0.04, 0.06, 13),
    ...ramillete(5, 17, (x, y, z) => [
      { geo: new THREE.CircleGeometry(0.042, 6), color: 0xfbfaf4, x, y, z, rx: -Math.PI / 2 + 0.35, fijo: 1 },
      { geo: OCT(0.016), color: 0xf2c32b, x, y: y + 0.008, z, fijo: 1 },
    ]),
  ]);
  m.lavanda = fundir(
    ramillete(7, 23, (x, y, z) => [{ geo: OCT(0.024), color: 0x8a5ac8, x, y: y + 0.03, z, sy: 2.6, fijo: 1 }]),
  );
  m.botonOro = fundir([
    ...mata(4, 0.18, 0.04, 0.06, 29),
    ...ramillete(5, 31, (x, y, z) => [{ geo: OCT(0.03), color: 0xf4c82b, x, y, z, sy: 0.6, fijo: 1 }]),
  ]);
  const helecho = [];
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + azar(k * 13) * 0.4;
    helecho.push({ geo: hoja(0.42 + azar(k) * 0.14, 0.1, { sube: 2.4, cae: 1.6, abre: 0.6, tramos: 4, pliegue: 0.2, punta: 0.55, dientes: 0.5 }), color: gris(0.85 + azar(k * 5) * 0.25), ry: -a, oscuro: 0.4 });
  }
  m.helecho = fundir(helecho);
  const seta = (x, z, r, alto, color) => [
    { geo: CA(0.016, 0.021, alto, 5), color: 0xefe6d2, x, y: alto / 2, z, fijo: 1 },
    { geo: Cup(r, 6, 2), color, x, y: alto - 0.005, z, sy: 0.75, fijo: 1 },
  ];
  m.setas = fundir([...seta(0, 0, 0.065, 0.1, 0xc8281e), ...seta(0.12, 0.05, 0.045, 0.07, 0x8a5a32), ...seta(0.05, -0.1, 0.04, 0.06, 0x9a6a3a)]);
  m.junco = fundir([
    ...mata(6, 0.85, 0.035, 0.1, 37),
    { geo: brizna(0.95, 0.014, 0.0), color: gris(0.8), x: 0.03, ry: 0.3 },
    { geo: CA(0.022, 0.022, 0.14, 4), color: 0x5a3a20, x: 0.03, y: 0.86, fijo: 1 },
    { geo: brizna(0.85, 0.014, 0.0), color: gris(0.8), x: -0.05, z: 0.04, ry: 1.9 },
    { geo: CA(0.02, 0.02, 0.12, 4), color: 0x5a3a20, x: -0.05, y: 0.77, z: 0.04, fijo: 1 },
  ]);
  const nenufar = [];
  for (let k = 0; k < 3; k++) {
    const a = k * 2.2;
    nenufar.push({ geo: new THREE.CircleGeometry(0.17 - k * 0.025, 7, 0.5, Math.PI * 2 - 0.5), color: gris(0.9 + k * 0.08), x: Math.cos(a) * 0.2, z: Math.sin(a) * 0.2, rx: -Math.PI / 2, ry: a });
  }
  nenufar.push({ geo: OCT(0.05), color: 0xf6e4ec, x: 0.2, y: 0.03, sy: 0.6, fijo: 1 }, { geo: OCT(0.018), color: 0xf2c32b, x: 0.2, y: 0.055, fijo: 1 });
  m.nenufar = fundir(nenufar);
  m.guijarros = fundir([0, 1, 2, 3].map((k) => ({ geo: bulto(0.06 + azar(k) * 0.03, 80 + k, 0.2), color: gris(0.85 + azar(k * 3) * 0.3), x: Math.cos(k * 2.3) * 0.18, y: 0.01, z: Math.sin(k * 2.3) * 0.16, sy: 0.55 })));
  return m;
}
