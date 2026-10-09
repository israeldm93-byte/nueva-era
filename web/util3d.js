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

/**
 * El agua de un mundo (se calcula una vez por mundo): qué es mar (toca el borde del
 * mapa) y qué lago, qué tierra está a la orilla de agua dulce (`ribera`), a dos
 * casillas o menos (`dulce`), y qué agua de lago toca tierra (`bordeLago`).
 */
let aguaClave = '';
let aguaDatos = null;
export function agua(d) {
  const clave = `${d.era}-${d.semilla}-${d.ancho}-${d.alto}`;
  if (clave === aguaClave) return aguaDatos;
  const W = d.ancho;
  const H = d.alto;
  const n = W * H;
  const ter = d.terreno;
  const vecinos = (i, f) => {
    const x = i % W;
    const y = (i - x) / W;
    if (x > 0) f(i - 1);
    if (x < W - 1) f(i + 1);
    if (y > 0) f(i - W);
    if (y < H - 1) f(i + W);
  };
  const mar = new Uint8Array(n);
  const pila = [];
  for (let i = 0; i < n; i++) {
    const x = i % W;
    const y = (i - x) / W;
    if (ter[i] === AGUA && (x === 0 || y === 0 || x === W - 1 || y === H - 1)) {
      mar[i] = 1;
      pila.push(i);
    }
  }
  while (pila.length) {
    vecinos(pila.pop(), (j) => {
      if (ter[j] === AGUA && !mar[j]) {
        mar[j] = 1;
        pila.push(j);
      }
    });
  }
  const tierra = (j) => ter[j] !== AGUA && ter[j] !== RIO;
  const lago = new Uint8Array(n);
  const ribera = new Uint8Array(n);
  const dulce = new Uint8Array(n);
  const bordeLago = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (ter[i] === AGUA && !mar[i]) lago[i] = 1;
  for (let i = 0; i < n; i++) {
    if (!tierra(i)) {
      if (lago[i]) vecinos(i, (j) => tierra(j) && (bordeLago[i] = 1));
      continue;
    }
    vecinos(i, (j) => (lago[j] || ter[j] === RIO) && (ribera[i] = 1));
  }
  for (let i = 0; i < n; i++) if (ribera[i]) dulce[i] = 1;
  for (let i = 0; i < n; i++) if (ribera[i]) vecinos(i, (j) => tierra(j) && (dulce[j] = 1));
  aguaClave = clave;
  aguaDatos = { mar, lago, ribera, dulce, bordeLago };
  return aguaDatos;
}

/**
 * Une piezas sencillas en una sola geometría con colores por vértice. Cada pieza
 * puede llevar `oscuro` (0-1: se oscurece hacia su parte de abajo, como a la sombra),
 * `fijo` (1: su color no se tiñe con el de cada instancia, como el tronco de un árbol
 * frente a su copa) y `bajo` (otro color para las caras que miran abajo, como el
 * vientre claro de muchos animales). Los triángulos sin área (las puntas de los
 * conos) se quitan.
 */
export function fundir(piezas) {
  const listas = [];
  let total = 0;
  let conFijo = false;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (const p of piezas) {
    const g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
    if (!g.attributes.normal) g.computeVertexNormals();
    e.set(p.rx ?? 0, p.ry ?? 0, p.rz ?? 0, p.orden ?? 'XYZ');
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(p.x ?? 0, p.y ?? 0, p.z ?? 0), q, new THREE.Vector3(p.sx ?? 1, p.sy ?? 1, p.sz ?? 1));
    g.applyMatrix4(m);
    // Solo los triángulos con área.
    const pos = g.attributes.position.array;
    const nor = g.attributes.normal.array;
    const vale = [];
    let ymin = Infinity;
    let ymax = -Infinity;
    for (let t = 0; t < pos.length / 9; t++) {
      a.fromArray(pos, t * 9);
      b.fromArray(pos, t * 9 + 3);
      c.fromArray(pos, t * 9 + 6);
      if (b.sub(a).cross(c.sub(a)).lengthSq() < 1e-12) continue;
      vale.push(t);
      for (let k = 0; k < 3; k++) {
        const y = pos[t * 9 + k * 3 + 1];
        if (y < ymin) ymin = y;
        if (y > ymax) ymax = y;
      }
    }
    const color = p.color?.isColor ? p.color : new THREE.Color(p.color ?? 0xffffff);
    const bajo = p.bajo === undefined ? null : p.bajo?.isColor ? p.bajo : new THREE.Color(p.bajo);
    if (p.fijo !== undefined) conFijo = true;
    listas.push({ pos, nor, vale, color, bajo, oscuro: p.oscuro ?? 0, fijo: p.fijo ?? 0, ymin, alto: Math.max(1e-6, ymax - ymin) });
    total += vale.length * 3;
  }
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  const fijo = conFijo ? new Float32Array(total) : null;
  let o = 0;
  for (const l of listas) {
    for (const t of l.vale) {
      for (let k = 0; k < 9; k++) {
        pos[o * 3 + k] = l.pos[t * 9 + k];
        nor[o * 3 + k] = l.nor[t * 9 + k];
      }
      // Las caras que miran abajo pueden llevar otro color (el vientre más claro).
      a.fromArray(pos, o * 3);
      b.fromArray(pos, o * 3 + 3).sub(a);
      c.fromArray(pos, o * 3 + 6).sub(a);
      const ny = b.cross(c).normalize().y;
      const cara = l.bajo && ny < -0.25 ? l.bajo : l.color;
      for (let k = 0; k < 3; k++) {
        const v = o + k;
        const luz = 1 - l.oscuro * (1 - (pos[v * 3 + 1] - l.ymin) / l.alto);
        col[v * 3] = cara.r * luz;
        col[v * 3 + 1] = cara.g * luz;
        col[v * 3 + 2] = cara.b * luz;
        if (fijo) fijo[v] = l.fijo;
      }
      o += 3;
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (fijo) out.setAttribute('fijo', new THREE.BufferAttribute(fijo, 1));
  out.computeBoundingSphere();
  return out;
}

/** Da la vuelta a un triángulo si no mira hacia `fuera`. */
export function orientar(tri, fuera) {
  const [a, b, c] = tri;
  const ux = b[0] - a[0];
  const uy = b[1] - a[1];
  const uz = b[2] - a[2];
  const vx = c[0] - a[0];
  const vy = c[1] - a[1];
  const vz = c[2] - a[2];
  const n = (uy * vz - uz * vy) * fuera.x + (uz * vx - ux * vz) * fuera.y + (ux * vy - uy * vx) * fuera.z;
  return n >= 0 ? tri : [a, c, b];
}

/** Geometría a partir de triángulos sueltos ([x,y,z] × 3 cada uno). */
export function triangulos(lista) {
  const pos = new Float32Array(lista.length * 9);
  lista.forEach((t, k) => {
    for (let v = 0; v < 3; v++) for (let j = 0; j < 3; j++) pos[k * 9 + v * 3 + j] = t[v][j];
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** Un gris en el espacio lineal (para multiplicar colores sin que se oscurezcan de más). */
export const gris = (k) => new THREE.Color().setRGB(k, k, k);

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
  // Las plantas se mecen también en su sombra.
  if (mat.userData.profundidad) im.customDepthMaterial = mat.userData.profundidad;
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  im.setColorAt(0, new THREE.Color(1, 1, 1));
  escena.add(im);
  cache[nombre] = im;
  return im;
}

/** Cierra un InstancedMesh tras rellenarlo (si no hay nada, ni se intenta dibujar). */
export function cerrar(im, n) {
  im.count = n;
  im.visible = n > 0;
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  if (im.frustumCulled && n > 0) im.computeBoundingSphere();
}

const _vista = new THREE.Frustum();
const _vp = new THREE.Matrix4();
const _bola = new THREE.Sphere();

/** Lo que abarca ahora la cámara (para no preparar lo que no se ve). */
export function vista(camara) {
  camara.updateMatrixWorld();
  return _vista.setFromProjectionMatrix(_vp.multiplyMatrices(camara.projectionMatrix, camara.matrixWorldInverse));
}

/** ¿Se ve algo de una bola de radio r en (x, y, z)? */
export function enVista(v, x, y, z, r) {
  _bola.center.set(x, y, z);
  _bola.radius = r;
  return v.intersectsSphere(_bola);
}

// ---------- viento ----------

/** El reloj del viento: todo lo que se mece lo comparte (se pone al día en cada cuadro). */
export const VIENTO = { value: 0 };

const CABECERA_VIENTO = /* glsl */ `
uniform float uTiempo;
uniform float uFlex;
uniform float uHoja;
uniform float uFlota;
attribute float fijo;
`;

// Cada planta se inclina con las rachas (que cruzan el mapa como olas) y se mece a su
// ritmo; cuanto más alto el punto, más se mueve. Las hojas, además, tiemblan.
const MECER = /* glsl */ `
vec4 mvPosition = vec4( transformed, 1.0 );
vec3 raiz = vec3( 0.0 );
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
  raiz = instanceMatrix[ 3 ].xyz;
#endif
{
  float alto = max( mvPosition.y - raiz.y, 0.0 );
  float fase = dot( raiz.xz, vec2( 0.37, 0.29 ) );
  float racha = 0.55 + 0.45 * sin( uTiempo * 0.45 - dot( raiz.xz, vec2( 0.031, 0.022 ) ) );
  float vaiven = sin( uTiempo * 1.7 + fase ) * 0.7 + sin( uTiempo * 2.9 + fase * 1.3 ) * 0.3;
  float k = uFlex * alto * alto * racha * ( 0.9 + vaiven );
  mvPosition.x += k * 0.8;
  mvPosition.z += k * 0.55;
  float hoja = uHoja * ( 1.0 - fijo ) * racha;
  mvPosition.xyz += hoja * vec3(
    sin( uTiempo * 7.3 + mvPosition.y * 5.1 + mvPosition.x * 3.7 ),
    0.5 * sin( uTiempo * 6.1 + mvPosition.z * 4.3 ),
    cos( uTiempo * 6.7 + mvPosition.x * 4.9 + mvPosition.z * 2.3 ) );
  mvPosition.y += uFlota * ( sin( raiz.x * 0.12 + uTiempo * 0.9 ) * 0.07 + cos( raiz.z * 0.1 + uTiempo * 0.7 ) * 0.07 );
}
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;
`;

// Las partes «fijas» (troncos, flores, frutos) conservan su color; el resto se tiñe con
// el de cada planta (verde en verano, ocre en otoño, blanco si ha nevado...).
const TENIR = /* glsl */ `
#if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
  vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
  vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
  vColor *= mix( instanceColor, vec3( 1.0 ), fijo );
#endif
`;

function viento(shader) {
  Object.assign(shader.uniforms, this.userData.uniformes);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${CABECERA_VIENTO}`)
    .replace('#include <project_vertex>', MECER)
    .replace('#include <color_vertex>', TENIR);
}

/**
 * Material para plantas: se mecen con el viento (`flex`: cuánto se dobla según su
 * altura; `hoja`: cuánto tiemblan las hojas; `flota`: sube y baja con las olas).
 * Lleva su propio material de sombra para que la sombra se mezca igual.
 */
export function materialPlanta({ flex = 0, hoja = 0, flota = 0, ...op } = {}) {
  const uniformes = { uTiempo: VIENTO, uFlex: { value: flex }, uHoja: { value: hoja }, uFlota: { value: flota } };
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, ...op });
  mat.userData.uniformes = uniformes;
  mat.onBeforeCompile = viento;
  const sombra = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  sombra.userData.uniformes = uniformes;
  sombra.onBeforeCompile = viento;
  mat.userData.profundidad = sombra;
  return mat;
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
