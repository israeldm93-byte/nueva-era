// Utilidades del mundo 3D: medidas, alturas, colores y piezas sencillas que se
// funden en una sola geometría con colores por vértice (estilo low-poly).

import * as THREE from 'three';

/** Tamaño de una casilla en unidades del mundo 3D. */
export const T = 2;
/** Subdivisiones del terreno por casilla. */
export const S = 2;

/** Azar repetible a partir de un número (para que cada árbol esté siempre en su sitio). */
export const azar = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
export const suave = (u) => u * u * (3 - 2 * u);
export const entre = (a, b, u) => a + (b - a) * u;
export const acotar = (x, a, b) => (x < a ? a : x > b ? b : x);

/** Altura en el mundo 3D a partir del relieve (centésimas: negativo bajo el agua). */
export function alturaRelieve(r) {
  if (r >= 0) {
    const u = r / 100;
    return 0.15 + 11.5 * Math.pow(u, 1.6);
  }
  return -0.35 + (r / 100) * 4;
}

export const AGUA = 0;
export const ORILLA = 1;
export const PRADERA = 2;
export const BOSQUE = 3;
export const COLINA = 4;
export const MONTANA = 5;
export const RIO = 6;
export const PANTANO = 7;
export const ESTEPA = 8;
export const DESIERTO = 9;

/** Une piezas sencillas en una sola geometría con colores por vértice. */
export function fundir(piezas) {
  const listas = [];
  let total = 0;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  for (const p of piezas) {
    const g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
    e.set(p.rx ?? 0, p.ry ?? 0, p.rz ?? 0);
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(p.x ?? 0, p.y ?? 0, p.z ?? 0), q, new THREE.Vector3(p.sx ?? 1, p.sy ?? 1, p.sz ?? 1));
    g.applyMatrix4(m);
    listas.push([g, new THREE.Color(p.color ?? 0xffffff)]);
    total += g.attributes.position.count;
  }
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  let o = 0;
  for (const [g, c] of listas) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    for (let i = 0; i < n; i++) {
      col[(o + i) * 3] = c.r;
      col[(o + i) * 3 + 1] = c.g;
      col[(o + i) * 3 + 2] = c.b;
    }
    o += n;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

export const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
export const C = (rt, rb, h, s = 7) => new THREE.CylinderGeometry(rt, rb, h, s);
export const Co = (r, h, s = 7) => new THREE.ConeGeometry(r, h, s);
/** Versiones ligeras, abiertas por abajo (para árboles, hierba y troncos que no se ven por debajo). */
export const CoA = (r, h, s = 6) => new THREE.ConeGeometry(r, h, s, 1, true);
export const CA = (rt, rb, h, s = 5) => new THREE.CylinderGeometry(rt, rb, h, s, 1, true);
export const Do = (r) => new THREE.DodecahedronGeometry(r, 0);
export const Ic = (r, d = 0) => new THREE.IcosahedronGeometry(r, d);
export const Es = (r, a = 8, b = 6) => new THREE.SphereGeometry(r, a, b);
/** Media esfera (cúpula) hacia arriba. */
export const Cup = (r, a = 9, b = 5, corte = 0.5) => new THREE.SphereGeometry(r, a, b, 0, Math.PI * 2, 0, Math.PI * corte);

/** Crea (o reutiliza si cabe) un InstancedMesh. */
export function instancias(escena, cache, nombre, geo, mat, max, { sombra = true, recibe = true, recorte = false } = {}) {
  let im = cache[nombre];
  if (im && im.instanceMatrix.count >= max) return im;
  if (im) {
    escena.remove(im);
    im.dispose();
  }
  im = new THREE.InstancedMesh(geo, mat, Math.max(1, max));
  im.count = 0;
  im.castShadow = sombra;
  im.receiveShadow = recibe;
  im.frustumCulled = recorte;
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  im.setColorAt(0, new THREE.Color(1, 1, 1));
  escena.add(im);
  cache[nombre] = im;
  return im;
}

/** Cierra un InstancedMesh tras rellenarlo. */
export function cerrar(im, n) {
  im.count = n;
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  if (im.frustumCulled && n > 0) im.computeBoundingSphere();
}

const _m = new THREE.Matrix4();
const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();

/** Pone una instancia con posición, giro (en Y, y opcionalmente X/Z) y escala. */
export function colocar(im, i, x, y, z, ry = 0, s = 1, sy = s, rx = 0, rz = 0) {
  _e.set(rx, ry, rz);
  _q.setFromEuler(_e);
  _m.compose(_v.set(x, y, z), _q, _s.set(s, sy, s));
  im.setMatrixAt(i, _m);
}
