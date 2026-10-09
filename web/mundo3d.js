// Mundo 3D de Nueva Era (Three.js): terreno con relieve, agua, bosques, rocas,
// animales, edificios según lo que han descubierto y aldeanos animados que van a
// trabajar y vuelven a casa. El día visual dura lo mismo que un día del mundo.

import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';

const T = 2; // tamaño de una casilla
const S = 2; // subdivisiones del terreno por casilla
const ALTURA = [-1.4, 0.12, 0.45, 0.6, 1.9, 4.4];
const COLORES = {
  agua: 0x2a5672,
  orilla: 0xd6c287,
  pradera: 0x86b84f,
  bosque: 0x4b8a3a,
  colina: 0xa3926a,
  montana: 0x8c867e,
  nieve: 0xf2f4f6,
  otono: 0xc2a24a,
};
const PIELES = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac, 0xd4a373];
const PELOS = [0x2b1b10, 0x4a2f1b, 0x161616, 0x7a4a1e, 0xb88a4a, 0x5a3825];
const TINTES = [0xb03a2e, 0x2e86c1, 0x239b56, 0xb9770e, 0x7d3c98, 0xd35400, 0x16a085, 0xc0392b];
const MINERAL = [0, 0x3c9a6a, 0x3b3d48, 0x8a3b2a];

const azar = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const suave = (u) => u * u * (3 - 2 * u);
const entre = (a, b, u) => a + (b - a) * u;

/** Une piezas sencillas en una sola geometría con colores por vértice. */
function fundir(piezas) {
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

const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const C = (rt, rb, h, s = 7) => new THREE.CylinderGeometry(rt, rb, h, s);
const Co = (r, h, s = 7) => new THREE.ConeGeometry(r, h, s);
const Do = (r) => new THREE.DodecahedronGeometry(r, 0);
const Es = (r, a = 7, b = 5) => new THREE.SphereGeometry(r, a, b);

function modelosEdificios() {
  const madera = 0x7a5534;
  const oscuro = 0x34241a;
  const piedras = [];
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    piedras.push({ geo: Do(0.11), color: 0x7d7a74, x: Math.cos(a) * 0.36, y: 0.06, z: Math.sin(a) * 0.36 });
  }
  const postes = (lado, alto, color) => {
    const r = [];
    for (const [x, z] of [
      [-1, -1], [1, -1], [1, 1], [-1, 1], [0, -1], [1, 0], [0, 1], [-1, 0],
    ]) r.push({ geo: B(0.08, alto, 0.08), color, x: (x * lado) / 2, y: alto / 2, z: (z * lado) / 2 });
    return r;
  };
  const vasijas = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    vasijas.push({ geo: Es(0.16), color: 0xb5653a, x: Math.cos(a) * 0.32, y: 0.2, z: Math.sin(a) * 0.25, sy: 1.35 });
  }
  const puesto = (x, z, color) => [
    { geo: B(0.05, 0.7, 0.05), color: madera, x: x - 0.3, y: 0.35, z: z - 0.25 },
    { geo: B(0.05, 0.7, 0.05), color: madera, x: x + 0.3, y: 0.35, z: z - 0.25 },
    { geo: B(0.05, 0.7, 0.05), color: madera, x: x - 0.3, y: 0.35, z: z + 0.25 },
    { geo: B(0.05, 0.7, 0.05), color: madera, x: x + 0.3, y: 0.35, z: z + 0.25 },
    { geo: B(0.75, 0.04, 0.62), color, x, y: 0.72, z },
    { geo: B(0.28, 0.24, 0.28), color: 0x9c7448, x, y: 0.12, z },
  ];
  return {
    choza: fundir([
      { geo: C(0.55, 0.62, 0.55, 8), color: 0x8b5a2b, y: 0.275 },
      { geo: Co(0.88, 0.9, 8), color: 0xc9a24f, y: 1.0 },
      { geo: B(0.24, 0.34, 0.06), color: oscuro, y: 0.17, z: 0.58 },
    ]),
    casa: fundir([
      { geo: B(1.3, 0.8, 1.0), color: 0xc98a55, y: 0.4 },
      { geo: B(1.48, 0.12, 1.18), color: 0x6e4a2a, y: 0.86 },
      { geo: B(0.26, 0.44, 0.06), color: oscuro, y: 0.22, z: 0.51 },
      { geo: B(0.18, 0.16, 0.06), color: 0x22170f, x: -0.4, y: 0.52, z: 0.51 },
      { geo: B(0.18, 0.16, 0.06), color: 0x22170f, x: 0.4, y: 0.52, z: 0.51 },
    ]),
    hoguera: fundir([
      ...piedras,
      { geo: C(0.05, 0.05, 0.62, 5), color: 0x5a3a1e, y: 0.08, rz: Math.PI / 2, ry: 0.5 },
      { geo: C(0.05, 0.05, 0.62, 5), color: 0x5a3a1e, y: 0.1, rz: Math.PI / 2, ry: -0.6 },
    ]),
    campo: fundir([
      { geo: B(T * 0.92, 0.06, T * 0.92), color: 0x7a5a3a, y: 0.03 },
      ...[-0.6, -0.2, 0.2, 0.6].map((z) => ({ geo: B(T * 0.88, 0.05, 0.12), color: 0x5e4229, y: 0.07, z })),
    ]),
    corral: fundir([
      ...postes(1.6, 0.5, madera),
      { geo: B(1.68, 0.05, 0.05), color: madera, y: 0.33, z: -0.8 },
      { geo: B(1.68, 0.05, 0.05), color: madera, y: 0.33, z: 0.8 },
      { geo: B(0.05, 0.05, 1.68), color: madera, y: 0.33, x: -0.8 },
      { geo: B(0.05, 0.05, 1.68), color: madera, y: 0.33, x: 0.8 },
    ]),
    almacen: fundir([
      ...vasijas,
      { geo: B(1.1, 0.06, 0.85), color: 0x6e4a2a, y: 0.8 },
      ...[
        [-0.5, -0.38], [0.5, -0.38], [-0.5, 0.38], [0.5, 0.38],
      ].map(([x, z]) => ({ geo: B(0.06, 0.8, 0.06), color: madera, x, y: 0.4, z })),
    ]),
    horno: fundir([
      { geo: new THREE.SphereGeometry(0.58, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), color: 0xa4552f },
      { geo: C(0.1, 0.12, 0.5, 6), color: 0x5a3020, x: 0.22, y: 0.62 },
      { geo: B(0.26, 0.24, 0.12), color: 0x140c08, y: 0.13, z: 0.5 },
    ]),
    archivo: fundir([
      { geo: B(1.45, 0.15, 1.15), color: 0xd9d2c0, y: 0.075 },
      ...[
        [-0.6, -0.45], [0.6, -0.45], [-0.6, 0.45], [0.6, 0.45],
      ].map(([x, z]) => ({ geo: C(0.08, 0.09, 0.8, 6), color: 0xe9e3d3, x, y: 0.55, z })),
      { geo: B(0.9, 0.55, 0.7), color: 0xcfc6b0, y: 0.43 },
      { geo: B(1.55, 0.15, 1.25), color: 0xd2c9b4, y: 1.02 },
      { geo: Co(0.95, 0.35, 4), color: 0xb8ad94, y: 1.27, ry: Math.PI / 4, sz: 0.75 },
    ]),
    mercado: fundir([...puesto(-0.45, -0.3, 0xc0392b), ...puesto(0.45, -0.3, 0xe0b030), ...puesto(0, 0.45, 0x2f6db0)]),
    ruina: fundir([
      { geo: B(0.7, 0.35, 0.15), color: 0x8a8478, x: -0.2, y: 0.17, z: -0.3, ry: 0.2 },
      { geo: B(0.15, 0.5, 0.6), color: 0x7d776c, x: 0.35, y: 0.25, z: 0.05 },
      { geo: B(0.4, 0.15, 0.4), color: 0x6f6a60, x: -0.2, y: 0.07, z: 0.35, rz: 0.3 },
    ]),
    obra: fundir([
      ...[
        [-0.6, -0.5], [0.6, -0.5], [-0.6, 0.5], [0.6, 0.5],
      ].map(([x, z]) => ({ geo: B(0.06, 1, 0.06), color: 0xc8a878, x, y: 0.5, z })),
      { geo: B(1.26, 0.05, 0.05), color: 0xc8a878, y: 0.5, z: -0.5 },
      { geo: B(1.26, 0.05, 0.05), color: 0xc8a878, y: 0.5, z: 0.5 },
      { geo: B(1.26, 0.05, 0.05), color: 0xc8a878, y: 0.98, z: -0.5 },
      { geo: B(1.26, 0.05, 0.05), color: 0xc8a878, y: 0.98, z: 0.5 },
    ]),
  };
}

function modelosVida() {
  return {
    tronco: fundir([{ geo: C(0.08, 0.12, 0.6, 5), color: 0x6b4a2e, y: 0.3 }]),
    conifera: fundir([
      { geo: Co(0.62, 1.05, 7), color: 0xffffff, y: 0.95 },
      { geo: Co(0.46, 0.85, 7), color: 0xffffff, y: 1.45 },
    ]),
    frondoso: fundir([{ geo: new THREE.IcosahedronGeometry(0.72, 0), color: 0xffffff, y: 1.25, sy: 0.85 }]),
    roca: fundir([{ geo: Do(0.42), color: 0xffffff, y: 0.15 }]),
    oveja: fundir([
      { geo: B(0.42, 0.26, 0.26), color: 0xf2efe6, y: 0.27 },
      { geo: B(0.14, 0.14, 0.16), color: 0x3a3330, x: 0.26, y: 0.34 },
      ...[
        [-0.14, -0.08], [0.14, -0.08], [-0.14, 0.08], [0.14, 0.08],
      ].map(([x, z]) => ({ geo: B(0.05, 0.18, 0.05), color: 0x3a3330, x, y: 0.09, z })),
    ]),
    ciervo: fundir([
      { geo: B(0.55, 0.26, 0.22), color: 0x8a5a33, y: 0.5 },
      { geo: B(0.09, 0.32, 0.09), color: 0x8a5a33, x: 0.26, y: 0.72, rz: -0.35 },
      { geo: B(0.2, 0.12, 0.12), color: 0x7a4e2c, x: 0.36, y: 0.88 },
      { geo: B(0.03, 0.18, 0.03), color: 0x4a3420, x: 0.33, y: 1.0, z: 0.05, rx: 0.3 },
      { geo: B(0.03, 0.18, 0.03), color: 0x4a3420, x: 0.33, y: 1.0, z: -0.05, rx: -0.3 },
      ...[
        [-0.2, -0.07], [0.2, -0.07], [-0.2, 0.07], [0.2, 0.07],
      ].map(([x, z]) => ({ geo: B(0.05, 0.38, 0.05), color: 0x5e3e22, x, y: 0.19, z })),
    ]),
    cultivo: fundir([{ geo: Co(0.09, 0.4, 5), color: 0xffffff, y: 0.2 }]),
    tronquito: fundir([
      { geo: C(0.11, 0.12, 1.3, 6), color: 0x7a5534, y: 0.65 },
      { geo: Co(0.12, 0.28, 6), color: 0x6a4a2e, y: 1.44 },
    ]),
    llama: fundir([{ geo: Co(0.2, 0.55, 6), color: 0xffffff, y: 0.28 }]),
    humo: fundir([{ geo: Es(0.14, 6, 4), color: 0xffffff }]),
    chispa: fundir([{ geo: new THREE.OctahedronGeometry(0.06, 0), color: 0xffffff }]),
  };
}

function modelosPersona() {
  const pierna = B(0.1, 0.36, 0.11);
  pierna.translate(0, -0.18, 0);
  const brazo = B(0.075, 0.32, 0.075);
  brazo.translate(0, -0.16, 0);
  // Herramientas: cuelgan de la mano (el origen es el hombro, el brazo mide 0.32).
  const mano = -0.3;
  return {
    pierna,
    brazo,
    torso: B(0.28, 0.36, 0.17),
    cabeza: new THREE.IcosahedronGeometry(0.12, 0),
    pelo: B(0.2, 0.07, 0.2),
    herramientas: {
      hacha: fundir([
        { geo: C(0.022, 0.022, 0.5, 5), color: 0x6b4a2e, y: mano, rx: Math.PI / 2, z: 0.2 },
        { geo: B(0.04, 0.16, 0.11), color: 0x9a9a9a, y: mano, z: 0.43 },
      ]),
      lanza: fundir([
        { geo: C(0.018, 0.018, 1.3, 5), color: 0x6b4a2e, y: mano + 0.3 },
        { geo: Co(0.04, 0.16, 5), color: 0x8f8f8f, y: mano + 1.02 },
      ]),
      cesta: fundir([{ geo: C(0.13, 0.09, 0.16, 7), color: 0xb08a50, y: mano - 0.08 }]),
      cana: fundir([{ geo: C(0.01, 0.015, 1.5, 4), color: 0x7a5a3a, y: mano, z: 0.6, rx: Math.PI / 2 - 0.5 }]),
      azada: fundir([
        { geo: C(0.022, 0.022, 0.75, 5), color: 0x6b4a2e, y: mano, rx: Math.PI / 2, z: 0.3 },
        { geo: B(0.12, 0.1, 0.03), color: 0x8f8f8f, y: mano - 0.05, z: 0.66 },
      ]),
      martillo: fundir([
        { geo: C(0.02, 0.02, 0.36, 5), color: 0x6b4a2e, y: mano, rx: Math.PI / 2, z: 0.15 },
        { geo: B(0.1, 0.07, 0.07), color: 0x7f7f7f, y: mano, z: 0.32 },
      ]),
    },
  };
}

const HERRAMIENTA = {
  lenar: 'hacha', picar: 'martillo', construir: 'martillo', cazar: 'lanza', vigilar: 'lanza', defender: 'lanza', asaltar: 'lanza',
  pescar: 'cana', recolectar: 'cesta', cultivar: 'azada', barro: 'cesta', pastorear: 'lanza',
};
const TRABAJO_FUERTE = new Set(['lenar', 'picar', 'construir', 'cultivar', 'barro']);

export class Mundo3D {
  constructor(lienzo, capa, { alTocar } = {}) {
    this.lienzo = lienzo;
    this.capa = capa;
    this.alTocar = alTocar;
    this.datos = null;
    this.personas = [];
    this.seleccion = null;
    this.burbujas = [];
    this.inicioDia = Date.now();
    this.msPorDia = 30000;
    // Desplazamiento del centro de la vista (para que lo que se mira no quede tapado por los paneles).
    this.desvio = { x: 0, y: 0 };
    this.desvioActual = { x: 0, y: 0 };

    const r = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    this.render = r;

    this.escena = new THREE.Scene();
    this.escena.background = new THREE.Color(0xbfdcf0);
    this.escena.fog = new THREE.Fog(0xbfdcf0, 140, 360);
    this.camara = new THREE.PerspectiveCamera(32, 1, 0.5, 900);

    const c = new OrbitControls(this.camara, lienzo);
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.screenSpacePanning = false;
    c.minDistance = 10;
    c.maxDistance = 190;
    c.minPolarAngle = 0.35;
    c.maxPolarAngle = 1.2;
    c.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    c.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
    c.zoomToCursor = true;
    // Si quien mira mueve la cámara, deja de seguir a nadie.
    c.addEventListener('start', () => {
      this.siguiendo = null;
      this.vuelo = null;
    });
    this.controles = c;
    this.siguiendo = null;

    this.cielo = new THREE.HemisphereLight(0xcfe8ff, 0x5a4a3a, 0.9);
    this.colorCielo = new THREE.Color();
    this.cieloNoche = new THREE.Color(0x1b2a4e);
    this.cieloDia = new THREE.Color(0xbfdcf0);
    this.cieloAlba = new THREE.Color(0xf3c18c);
    this.luzNoche = new THREE.Color(0x7d93c9);
    this.luzDia = new THREE.Color(0xcfe8ff);
    this.escena.add(this.cielo);
    this.sol = new THREE.DirectionalLight(0xfff1d6, 2.4);
    this.sol.castShadow = true;
    const movil = Math.min(window.innerWidth, window.innerHeight) < 700;
    this.sol.shadow.mapSize.set(movil ? 1024 : 2048, movil ? 1024 : 2048);
    const sc = this.sol.shadow.camera;
    sc.left = -45;
    sc.right = 45;
    sc.top = 45;
    sc.bottom = -45;
    sc.near = 1;
    sc.far = 260;
    this.sol.shadow.bias = -0.0004;
    this.sol.shadow.normalBias = 0.03;
    this.escena.add(this.sol, this.sol.target);
    this.luces = [];
    for (let k = 0; k < 6; k++) {
      const l = new THREE.PointLight(0xffa64d, 0, 14, 1.6);
      this.escena.add(l);
      this.luces.push(l);
    }

    this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, metalness: 0 });
    this.matLlama = new THREE.MeshBasicMaterial({ color: 0xffa13a });
    this.matHumo = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, transparent: true, opacity: 0.45, roughness: 1, depthWrite: false });
    this.matChispa = new THREE.MeshBasicMaterial({ color: 0xffe08a });
    this.matPersona = new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.8 });

    this.modelos = { ...modelosEdificios(), ...modelosVida() };
    this.cuerpo = modelosPersona();
    this.instancias = {};
    this.raycaster = new THREE.Raycaster();
    this.tmp = new THREE.Matrix4();
    this.tmp2 = new THREE.Matrix4();
    this.mPersona = new THREE.Matrix4();
    this.mEscala = new THREE.Matrix4();
    this.vec = new THREE.Vector3();
    this.arriba = new THREE.Vector3(0, 1, 0);
    this.color = new THREE.Color();

    this.etiquetas = new Map();
    this.burbujaSel = document.createElement('div');
    this.burbujaSel.className = 'burbuja';
    this.burbujaSel.hidden = true;
    capa.append(this.burbujaSel);

    this.instalarToques();
    new ResizeObserver(() => this.ajustar()).observe(lienzo.parentElement);
    this.ajustar();
    this.reloj = new THREE.Clock();
    this.animar = this.animar.bind(this);
    requestAnimationFrame(this.animar);
  }

  ajustar() {
    const caja = this.lienzo.parentElement.getBoundingClientRect();
    const w = Math.max(1, caja.width);
    const h = Math.max(1, caja.height);
    this.render.setSize(w, h, false);
    this.camara.aspect = w / h;
    this.camara.fov = w / h < 0.8 ? 46 : w / h < 1.2 ? 38 : 32;
    this.ancho = w;
    this.alto = h;
    this.camara.updateProjectionMatrix();
    this.fijarDesvio();
  }

  /** Lo que se mira queda en (ancho/2 - x, alto/2 - y) de la pantalla. */
  desplazarVista(x, y, inmediato = false) {
    this.desvio = { x, y };
    if (inmediato) {
      this.desvioActual = { x, y };
      this.fijarDesvio();
    }
  }

  fijarDesvio() {
    const d = this.desvioActual;
    if (!d.x && !d.y) this.camara.clearViewOffset();
    else this.camara.setViewOffset(this.ancho, this.alto, d.x, d.y, this.ancho, this.alto);
  }

  moverDesvio(dt) {
    const a = this.desvioActual;
    const o = this.desvio;
    if (a.x === o.x && a.y === o.y) return;
    const k = Math.min(1, dt * 7);
    a.x = Math.abs(o.x - a.x) < 0.5 ? o.x : a.x + (o.x - a.x) * k;
    a.y = Math.abs(o.y - a.y) < 0.5 ? o.y : a.y + (o.y - a.y) * k;
    this.fijarDesvio();
  }

  // ---------- coordenadas ----------

  aMundo(tx, ty) {
    return [this.ox + tx * T + T / 2, this.oz + ty * T + T / 2];
  }

  alturaEn(wx, wz) {
    const n = this.W * S;
    const gx = Math.min(n - 0.001, Math.max(0, (wx - this.ox) / (T / S)));
    const gz = Math.min(this.H * S - 0.001, Math.max(0, (wz - this.oz) / (T / S)));
    const x0 = Math.floor(gx);
    const z0 = Math.floor(gz);
    const fx = gx - x0;
    const fz = gz - z0;
    const fila = n + 1;
    const h = this.alturas;
    const a = h[z0 * fila + x0] + (h[z0 * fila + x0 + 1] - h[z0 * fila + x0]) * fx;
    const b = h[(z0 + 1) * fila + x0] + (h[(z0 + 1) * fila + x0 + 1] - h[(z0 + 1) * fila + x0]) * fx;
    return Math.max(-0.05, a + (b - a) * fz);
  }

  // ---------- construcción del terreno (una vez por mundo) ----------

  construirTerreno(d) {
    this.W = d.ancho;
    this.H = d.alto;
    this.ox = (-d.ancho * T) / 2;
    this.oz = (-d.alto * T) / 2;
    const W = d.ancho;
    const H = d.alto;
    const alturaCasilla = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) {
      const t = d.terreno[i];
      const r = azar(i);
      let h = ALTURA[t];
      if (t === 0) h -= 0.4 * r;
      else if (t === 4) h += 0.7 * r;
      else if (t === 5) h += 2.8 * r + 0.6 * azar(i + 7);
      else h += (r - 0.5) * 0.18;
      alturaCasilla[i] = h;
    }
    const n = W * S;
    const m = H * S;
    this.alturas = new Float32Array((n + 1) * (m + 1));
    const geo = new THREE.PlaneGeometry(W * T, H * T, n, m);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let vz = 0; vz <= m; vz++) {
      for (let vx = 0; vx <= n; vx++) {
        const xs = vx % S === 0 ? [vx / S - 1, vx / S] : [Math.floor(vx / S)];
        const zs = vz % S === 0 ? [vz / S - 1, vz / S] : [Math.floor(vz / S)];
        let suma = 0;
        let k = 0;
        for (const tx of xs) for (const tz of zs) {
          if (tx < 0 || tz < 0 || tx >= W || tz >= H) continue;
          suma += alturaCasilla[tz * W + tx];
          k++;
        }
        const i = vz * (n + 1) + vx;
        const h = (k ? suma / k : -1.6) + (azar(i * 3.1) - 0.5) * 0.07;
        this.alturas[i] = h;
        pos.setY(i, h);
      }
    }
    geo.computeVertexNormals();
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array((n + 1) * (m + 1) * 3), 3));
    this.geoTerreno = geo;
    if (this.terreno) {
      this.escena.remove(this.terreno);
      this.terreno.geometry.dispose();
    }
    this.terreno = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }));
    this.terreno.receiveShadow = true;
    this.escena.add(this.terreno);

    if (!this.agua) {
      const ga = new THREE.PlaneGeometry(W * T + 260, H * T + 260, 70, 50);
      ga.rotateX(-Math.PI / 2);
      this.baseAgua = Float32Array.from(ga.attributes.position.array);
      this.agua = new THREE.Mesh(
        ga,
        new THREE.MeshStandardMaterial({ color: 0x3a7fae, transparent: true, opacity: 0.86, roughness: 0.42, metalness: 0.05, flatShading: true }),
      );
      this.agua.position.y = -0.08;
      this.agua.receiveShadow = true;
      this.escena.add(this.agua);
    }
    this.estacionPintada = null;
    this.mundoClave = `${d.era}-${d.semilla}`;
    const [cx, cz] = this.aMundo(W / 2, H / 2);
    this.controles.target.set(cx, 0, cz);
  }

  pintarTerreno(d) {
    const W = this.W;
    const H = this.H;
    const n = W * S;
    const m = H * S;
    const base = [COLORES.agua, COLORES.orilla, COLORES.pradera, COLORES.bosque, COLORES.colina, COLORES.montana].map((c) => new THREE.Color(c));
    const nieve = new THREE.Color(COLORES.nieve);
    const otono = new THREE.Color(COLORES.otono);
    const invierno = d.estacion === 'invierno';
    const esOtono = d.estacion === 'otoño';
    const colorCasilla = [];
    for (let i = 0; i < W * H; i++) {
      const t = d.terreno[i];
      const c = base[t].clone();
      const v = (azar(i * 1.7) - 0.5) * 0.12;
      c.offsetHSL(0, 0, v);
      if (esOtono && (t === 2 || t === 3)) c.lerp(otono, t === 2 ? 0.35 : 0.15);
      if (invierno && t !== 0) c.lerp(nieve, t === 1 ? 0.35 : 0.7);
      colorCasilla.push(c);
    }
    const col = this.geoTerreno.attributes.color;
    const c = new THREE.Color();
    for (let vz = 0; vz <= m; vz++) {
      for (let vx = 0; vx <= n; vx++) {
        const xs = vx % S === 0 ? [vx / S - 1, vx / S] : [Math.floor(vx / S)];
        const zs = vz % S === 0 ? [vz / S - 1, vz / S] : [Math.floor(vz / S)];
        let r = 0;
        let g = 0;
        let b = 0;
        let k = 0;
        for (const tx of xs) for (const tz of zs) {
          if (tx < 0 || tz < 0 || tx >= W || tz >= H) continue;
          const cc = colorCasilla[tz * W + tx];
          r += cc.r;
          g += cc.g;
          b += cc.b;
          k++;
        }
        const i = vz * (n + 1) + vx;
        c.setRGB(k ? r / k : base[0].r, k ? g / k : base[0].g, k ? b / k : base[0].b);
        if (this.alturas[i] > 3.4) c.lerp(nieve, Math.min(1, (this.alturas[i] - 3.4) / 1.2));
        col.setXYZ(i, c.r, c.g, c.b);
      }
    }
    col.needsUpdate = true;
    this.estacionPintada = d.estacion;
  }

  // ---------- instancias ----------

  inst(nombre, geo, mat, max, sombra = true) {
    let im = this.instancias[nombre];
    if (im && im.instanceMatrix.count >= max) return im;
    if (im) {
      this.escena.remove(im);
      im.dispose();
    }
    im = new THREE.InstancedMesh(geo, mat, max);
    im.count = 0;
    im.castShadow = sombra;
    im.receiveShadow = true;
    im.frustumCulled = false;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.setColorAt(0, new THREE.Color(1, 1, 1));
    this.escena.add(im);
    this.instancias[nombre] = im;
    return im;
  }

  colocar(im, i, x, y, z, ry = 0, s = 1, sy = s) {
    this.tmp.makeRotationY(ry);
    this.tmp.scale(this.vec.set(s, sy, s));
    this.tmp.setPosition(x, y, z);
    im.setMatrixAt(i, this.tmp);
  }

  cerrar(im, n) {
    im.count = n;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }

  // ---------- datos del día ----------

  actualizar(d) {
    if (!d) return;
    const nuevo = !this.datos || `${d.era}-${d.semilla}` !== this.mundoClave;
    this.datos = d;
    if (nuevo) this.construirTerreno(d);
    if (this.estacionPintada !== d.estacion || nuevo) this.pintarTerreno(d);
    this.aldeas = new Map(d.aldeas.map((a) => [a.id, a]));
    this.colocarVegetacion(d);
    this.colocarEdificios(d);
    this.colocarAnimales(d);
    this.prepararPersonas(d);
    this.prepararEtiquetas(d);
    if (nuevo) this.enfocarMayor();
  }

  enfocarMayor() {
    const vivas = this.datos.aldeas.filter((a) => a.abandonada === null);
    if (!vivas.length) return;
    const a = vivas.reduce((x, y) => (y.poblacion > x.poblacion ? y : x));
    this.enfocar(a.id, true);
  }

  enfocar(id, inmediato = false) {
    const a = this.aldeas?.get(id);
    if (!a) return;
    this.siguiendo = null;
    const [x, z] = this.aMundo(a.x, a.y);
    const y = this.alturaEn(x, z);
    const destino = new THREE.Vector3(x, y, z);
    if (inmediato) {
      const dir = this.camara.position.clone().sub(this.controles.target);
      if (dir.length() < 1) dir.set(0, 26, 27);
      dir.setLength(Math.min(Math.max(dir.length(), 30), 44));
      this.controles.target.copy(destino);
      this.camara.position.copy(destino).add(dir);
    } else {
      this.vuelo = { desde: this.controles.target.clone(), hasta: destino, t: 0 };
    }
  }

  /** Lleva la cámara hasta alguien y la mantiene siguiéndole mientras camina. */
  enfocarPersona(id, inmediato = false) {
    const q = this.personas.find((x) => x.p.id === id);
    if (!q) return;
    this.vuelo = null;
    this.siguiendo = id;
    if (inmediato) {
      const destino = this.vec.set(q.x, this.alturaEn(q.x, q.z), q.z);
      this.camara.position.add(destino.clone().sub(this.controles.target));
      this.controles.target.copy(destino);
    }
  }

  seguir(dt) {
    if (this.siguiendo === null) return;
    const q = this.personas.find((x) => x.p.id === this.siguiendo);
    if (!q) {
      this.siguiendo = null;
      return;
    }
    const t = this.controles.target;
    const k = Math.min(1, dt * 2.5);
    const dx = (q.x - t.x) * k;
    const dy = (this.alturaEn(q.x, q.z) - t.y) * k;
    const dz = (q.z - t.z) * k;
    t.x += dx;
    t.y += dy;
    t.z += dz;
    this.camara.position.x += dx;
    this.camara.position.y += dy;
    this.camara.position.z += dz;
  }

  /** La aldea habitada más cercana al centro de la vista. */
  aldeaCercana() {
    if (!this.datos) return null;
    const o = this.controles.target;
    let mejor = null;
    let dmin = Infinity;
    for (const a of this.datos.aldeas) {
      if (a.abandonada !== null) continue;
      const [x, z] = this.aMundo(a.x, a.y);
      const d2 = (x - o.x) ** 2 + (z - o.z) ** 2;
      if (d2 < dmin) {
        dmin = d2;
        mejor = a.id;
      }
    }
    return mejor;
  }

  /** Acerca (f < 1) o aleja (f > 1) la cámara con suavidad. */
  acercar(f) {
    const actual = this.camara.position.distanceTo(this.controles.target);
    const c = this.controles;
    this.distancia = Math.min(c.maxDistance, Math.max(c.minDistance, (this.distancia ?? actual) * f));
  }

  /** Gira la vista alrededor del punto que se mira. */
  girar(angulo) {
    this.giro = (this.giro ?? 0) + angulo;
  }

  ajustarCamara(dt) {
    if (this.distancia === undefined && !this.giro) return;
    const t = this.controles.target;
    const dir = this.camara.position.clone().sub(t);
    if (this.distancia !== undefined) {
      const l = dir.length();
      const nl = l + (this.distancia - l) * Math.min(1, dt * 7);
      dir.setLength(nl);
      if (Math.abs(nl - this.distancia) < 0.05) this.distancia = undefined;
    }
    if (this.giro) {
      const g = Math.abs(this.giro) < 0.002 ? this.giro : this.giro * Math.min(1, dt * 6);
      dir.applyAxisAngle(this.arriba, g);
      this.giro -= g;
    }
    this.camara.position.copy(t).add(dir);
  }

  colocarVegetacion(d) {
    const W = this.W;
    const H = this.H;
    const troncos = this.inst('troncos', this.modelos.tronco, this.mat, 6000);
    const coniferas = this.inst('coniferas', this.modelos.conifera, this.mat, 4000);
    const frondosos = this.inst('frondosos', this.modelos.frondoso, this.mat, 4000);
    const rocas = this.inst('rocas', this.modelos.roca, this.mat, 3000);
    const invierno = d.estacion === 'invierno';
    const otono = d.estacion === 'otoño';
    const verdeC = new THREE.Color(0x2f6b3a);
    const verdeF = new THREE.Color(0x4f8f3a);
    const blanco = new THREE.Color(0xf3f6f8);
    const ocre = new THREE.Color(0xc8702a);
    const amarillo = new THREE.Color(0xd9a03a);
    const ocupadas = new Set();
    for (const a of d.aldeas) {
      for (const e of a.edificios) ocupadas.add(e.y * W + e.x);
      // Alrededor de cada aldea hay un claro, más grande cuanta más gente vive en ella.
      const r = a.abandonada !== null ? 0 : a.poblacion > 40 ? 3 : a.poblacion > 12 ? 2 : 1;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + 1) ocupadas.add((a.y + dy) * W + a.x + dx);
    }
    let nt = 0;
    let nc = 0;
    let nf = 0;
    let nr = 0;
    for (let i = 0; i < W * H; i++) {
      const t = d.terreno[i];
      if (t === 0) continue;
      const tx = i % W;
      const ty = Math.floor(i / W);
      const [cx, cz] = this.aMundo(tx, ty);
      let arboles = 0;
      if (!ocupadas.has(i)) {
        if (t === 3) arboles = Math.min(3, Math.round(d.madera[i] / 11));
        else if (t === 2 && azar(i * 5.3) < 0.07 && d.madera[i] >= 2) arboles = 1;
        else if (t === 4 && d.madera[i] >= 5 && azar(i * 2.9) < 0.5) arboles = 1;
      }
      for (let k = 0; k < arboles && nt < 6000; k++) {
        const x = cx + (azar(i * 13 + k) - 0.5) * T * 0.85;
        const z = cz + (azar(i * 17 + k * 3) - 0.5) * T * 0.85;
        const y = this.alturaEn(x, z);
        const s = 0.75 + azar(i * 7 + k) * 0.6;
        const conifera = azar(i * 11 + k) < (t === 4 ? 0.8 : 0.45);
        this.colocar(troncos, nt++, x, y, z, 0, s);
        if (conifera && nc < 4000) {
          this.colocar(coniferas, nc, x, y, z, azar(i + k), s);
          this.color.copy(verdeC).offsetHSL((azar(i * 3 + k) - 0.5) * 0.04, 0, (azar(i * 5 + k) - 0.5) * 0.1);
          if (invierno) this.color.lerp(blanco, 0.45);
          coniferas.setColorAt(nc++, this.color);
        } else if (!conifera && nf < 4000) {
          // En invierno los árboles de hoja caduca se quedan casi desnudos.
          this.colocar(frondosos, nf, x, y, z, azar(i + k), s, invierno ? s * 0.35 : s);
          this.color.copy(verdeF).offsetHSL((azar(i * 3 + k) - 0.5) * 0.05, 0, (azar(i * 5 + k) - 0.5) * 0.12);
          if (otono) this.color.lerp(azar(i + k * 9) < 0.5 ? ocre : amarillo, 0.75);
          if (invierno) this.color.set(0x6b5a48);
          frondosos.setColorAt(nf++, this.color);
        }
      }
      const piedras = t === 5 ? 2 + Math.floor(azar(i * 9) * 2) : t === 4 ? (azar(i * 4.1) < 0.55 ? 1 : 0) : 0;
      for (let k = 0; k < piedras && nr < 3000; k++) {
        const x = cx + (azar(i * 19 + k) - 0.5) * T * 0.8;
        const z = cz + (azar(i * 23 + k) - 0.5) * T * 0.8;
        const s = t === 5 ? 0.9 + azar(i + k * 5) * 1.3 : 0.5 + azar(i + k * 5) * 0.6;
        this.colocar(rocas, nr, x, this.alturaEn(x, z) - 0.05, z, azar(i * 2 + k) * 6, s);
        const mineral = d.minerales?.[i] ?? 0;
        this.color.set(mineral ? MINERAL[mineral] : 0x8b867d).offsetHSL(0, 0, (azar(i * 31 + k) - 0.5) * 0.12);
        if (invierno && !mineral) this.color.lerp(blanco, 0.4);
        rocas.setColorAt(nr++, this.color);
      }
    }
    this.cerrar(troncos, nt);
    this.cerrar(coniferas, nc);
    this.cerrar(frondosos, nf);
    this.cerrar(rocas, nr);
  }

  colocarEdificios(d) {
    const tipos = ['choza', 'casa', 'hoguera', 'campo', 'corral', 'almacen', 'horno', 'archivo', 'mercado', 'ruina', 'obra'];
    const im = {};
    for (const k of tipos) im[k] = this.inst(`ed-${k}`, this.modelos[k], this.mat, k === 'campo' ? 2500 : k === 'ruina' ? 1500 : 600);
    const n = Object.fromEntries(tipos.map((k) => [k, 0]));
    const cultivos = this.inst('cultivos', this.modelos.cultivo, this.mat, 40000);
    const tronquitos = this.inst('empalizadas', this.modelos.tronquito, this.mat, 6000);
    const llamas = this.inst('llamas', this.modelos.llama, this.matLlama, 400, false);
    let nCult = 0;
    let nTron = 0;
    this.hogueras = [];
    this.hornos = [];
    this.corrales = [];
    const colorCultivo = { primavera: 0x6aa84f, verano: 0x9ab84a, 'otoño': 0xd9b23a, invierno: 0x8a7a5a };
    const ponerEd = (tipo, e, ry = 0, sy = 1) => {
      if (n[tipo] >= im[tipo].instanceMatrix.count) return;
      const [x, z] = this.aMundo(e.x, e.y);
      const y = this.alturaEn(x, z);
      this.colocar(im[tipo], n[tipo]++, x, y, z, ry, 1, sy);
      return [x, y, z];
    };
    for (const r of d.ruinas ?? []) ponerEd('ruina', r, azar(r.x * 31 + r.y));
    for (const a of d.aldeas) {
      const ruina = a.abandonada !== null;
      for (const e of a.edificios) {
        if (e.tipo === 'empalizada') continue;
        const tipo = ruina && e.tipo !== 'campo' ? 'ruina' : e.tipo;
        if (!im[tipo]) continue;
        const pos = ponerEd(tipo, e, tipo === 'campo' ? 0 : azar(e.x * 7 + e.y * 13) * 0.6 - 0.3);
        if (!pos) continue;
        if (tipo === 'hoguera' && !ruina) {
          this.hogueras.push(pos);
          if (llamas.count < 400) this.colocar(llamas, this.hogueras.length - 1, pos[0], pos[1] + 0.05, pos[2]);
        }
        if (tipo === 'horno') this.hornos.push(pos);
        if (tipo === 'corral') this.corrales.push({ pos, animales: e.animales ?? 0 });
        if (tipo === 'campo' && e.fase === 1 && !ruina && d.estacion !== 'invierno') {
          const alto = d.estacion === 'primavera' ? 0.45 : d.estacion === 'verano' ? 0.85 : 1;
          this.color.set(colorCultivo[d.estacion]);
          for (let fx = 0; fx < 4; fx++) {
            for (let fz = 0; fz < 4; fz++) {
              if (nCult >= 40000) break;
              const x = pos[0] + (fx - 1.5) * 0.42;
              const z = pos[2] + (fz - 1.5) * 0.4;
              this.colocar(cultivos, nCult, x, pos[1] + 0.05, z, 0, 1, alto);
              cultivos.setColorAt(nCult++, this.color);
            }
          }
        }
      }
      if (a.edificios.some((e) => e.tipo === 'empalizada')) {
        const [cx, cz] = this.aMundo(a.x, a.y);
        const radio = T * 2.6;
        const total = Math.round((2 * Math.PI * radio) / 0.26);
        for (let k = 0; k < total && nTron < 6000; k++) {
          const ang = (k / total) * Math.PI * 2;
          // Hueco para la puerta, mirando al sur.
          if (Math.abs(ang - Math.PI / 2) < 0.16) continue;
          const x = cx + Math.cos(ang) * radio;
          const z = cz + Math.sin(ang) * radio;
          this.colocar(tronquitos, nTron, x, this.alturaEn(x, z) - 0.05, z, 0, 1, 0.85 + azar(k + a.id) * 0.3);
          tronquitos.setColorAt(nTron++, this.color.set(ruina ? 0x6f6a60 : 0xffffff));
        }
      }
      if (a.obra && !ruina) {
        const pos = ponerEd('obra', a.obra, 0, Math.max(0.15, a.obra.progreso) * 1.4);
        void pos;
      }
    }
    for (const k of tipos) this.cerrar(im[k], n[k]);
    this.cerrar(cultivos, nCult);
    this.cerrar(tronquitos, nTron);
    this.cerrar(llamas, Math.min(400, this.hogueras.length));
    const humo = this.inst('humo', this.modelos.humo, this.matHumo, 400, false);
    this.cerrar(humo, Math.min(400, this.hornos.length * 4));
  }

  colocarAnimales(d) {
    const W = this.W;
    this.ciervos = [];
    for (let i = 0; i < d.caza.length && this.ciervos.length < 260; i++) {
      if (d.caza[i] < 2 || d.terreno[i] === 0) continue;
      if (azar(i * 41) > 0.35) continue;
      const [x, z] = this.aMundo(i % W, Math.floor(i / W));
      this.ciervos.push({ x, z, fase: azar(i) * 100, id: i });
    }
    this.inst('ciervos', this.modelos.ciervo, this.mat, 300);
    this.ovejas = [];
    for (const c of this.corrales) {
      const n = Math.min(6, Math.ceil(c.animales / 4));
      for (let k = 0; k < n; k++) this.ovejas.push({ x: c.pos[0], z: c.pos[2], fase: azar(c.pos[0] + k * 7) * 100, k });
    }
    this.inst('ovejas', this.modelos.oveja, this.mat, 1000);
  }

  prepararPersonas(d) {
    const max = Math.max(400, Math.ceil(d.personas.length * 1.25));
    const partes = ['torso', 'cabeza', 'pelo', 'piernaI', 'piernaD', 'brazoI', 'brazoD'];
    const geo = { torso: this.cuerpo.torso, cabeza: this.cuerpo.cabeza, pelo: this.cuerpo.pelo, piernaI: this.cuerpo.pierna, piernaD: this.cuerpo.pierna, brazoI: this.cuerpo.brazo, brazoD: this.cuerpo.brazo };
    for (const k of partes) this.inst(`p-${k}`, geo[k], this.matPersona, max);
    for (const [k, g] of Object.entries(this.cuerpo.herramientas)) this.inst(`h-${k}`, g, this.mat, max);
    this.inst('chispas', this.modelos.chispa, this.matChispa, max, false);
    const conocen = new Map(d.aldeas.map((a) => [a.id, new Set(a.conocidos)]));
    const piel = new THREE.Color();
    const pelo = new THREE.Color();
    const ropa = new THREE.Color();
    const piernas = new THREE.Color();
    this.personas = d.personas.map((p, idx) => {
      const sabe = conocen.get(p.aldea) ?? new Set();
      piel.set(PIELES[Math.floor(azar(p.id * 1.3) * PIELES.length)]);
      pelo.set(PELOS[Math.floor(azar(p.id * 2.7) * PELOS.length)]);
      if (p.edad > 55) pelo.lerp(new THREE.Color(0xd8d8d8), Math.min(1, (p.edad - 55) / 15));
      if (sabe.has('tela')) ropa.set(TINTES[p.aldea % TINTES.length]);
      else if (sabe.has('ropa')) ropa.set(0x7b5230);
      else ropa.copy(piel);
      piernas.set(sabe.has('tela') ? 0x4a3a30 : 0x6e4b2a);
      this.instancias['p-torso'].setColorAt(idx, ropa);
      this.instancias['p-brazoI'].setColorAt(idx, sabe.has('tela') ? ropa : piel);
      this.instancias['p-brazoD'].setColorAt(idx, sabe.has('tela') ? ropa : piel);
      this.instancias['p-cabeza'].setColorAt(idx, piel);
      this.instancias['p-pelo'].setColorAt(idx, pelo);
      this.instancias['p-piernaI'].setColorAt(idx, piernas);
      this.instancias['p-piernaD'].setColorAt(idx, piernas);
      const a = this.aldeas.get(p.aldea);
      const [ax, az] = a ? this.aMundo(a.x, a.y) : this.aMundo(p.x, p.y);
      const ang = azar(p.id * 0.77) * Math.PI * 2;
      const radio = 1.1 + azar(p.id * 1.91) * 2.4;
      const casa = [ax + Math.cos(ang) * radio, az + Math.sin(ang) * radio];
      let [tx, tz] = this.aMundo(p.x, p.y);
      tx += (azar(p.id * 3.3) - 0.5) * 1.2;
      tz += (azar(p.id * 4.4) - 0.5) * 1.2;
      if (p.act === 'pescar') {
        // Se queda en la orilla, mirando al agua.
        const dx = ax - tx;
        const dz = az - tz;
        const l = Math.hypot(dx, dz) || 1;
        tx += (dx / l) * 1.3;
        tz += (dz / l) * 1.3;
      }
      const metal = sabe.has('hierro') ? 0xa9b0b6 : sabe.has('bronce') ? 0xc08a3e : sabe.has('cobre') ? 0xb87333 : null;
      return {
        p,
        idx,
        casa,
        trabajo: [tx, tz],
        escala: 1.3 * (p.edad < 12 ? 0.55 + p.edad * 0.03 : 1),
        desfase: (azar(p.id * 9.1) - 0.5) * 0.08,
        herramienta: p.edad >= 12 ? HERRAMIENTA[p.act] ?? null : null,
        metal,
        x: casa[0],
        z: casa[1],
        ang: 0,
      };
    });
    for (const [k] of Object.entries(this.cuerpo.herramientas)) {
      const im = this.instancias[`h-${k}`];
      for (const per of this.personas) if (per.herramienta === k) im.setColorAt(per.idx, this.color.set(per.metal ?? 0xffffff));
    }
    for (const k of partes) this.cerrar(this.instancias[`p-${k}`], this.personas.length);
    this.consejeros = new Set();
    for (const a of d.aldeas) for (const mi of a.consejo?.miembros ?? []) this.consejeros.add(mi.id);
  }

  prepararEtiquetas(d) {
    const vistas = new Set();
    for (const a of d.aldeas) {
      if (a.abandonada !== null && !this.etiquetas.has(a.id)) continue;
      vistas.add(a.id);
      let el = this.etiquetas.get(a.id);
      if (!el) {
        el = document.createElement('button');
        el.className = 'etiqueta-aldea';
        el.addEventListener('click', () => this.alTocar?.({ aldea: a.id }));
        this.capa.append(el);
        this.etiquetas.set(a.id, el);
      }
      el.textContent = a.abandonada !== null ? `${a.nombre} (ruinas)` : `${a.nombre} · ${a.poblacion}`;
      el.classList.toggle('ruinas', a.abandonada !== null);
      el.classList.toggle('elegida', this.seleccion?.aldea === a.id);
    }
    for (const [id, el] of this.etiquetas) if (!vistas.has(id)) {
      el.remove();
      this.etiquetas.delete(id);
    }
  }

  // ---------- animación ----------

  faseDia() {
    return (((Date.now() - this.inicioDia) / this.msPorDia) % 1 + 1) % 1;
  }

  luz(fase) {
    // Amanecer 0-0.1, día hasta 0.75, atardecer hasta 0.86, noche hasta 1.
    let dia;
    if (fase < 0.1) dia = suave(fase / 0.1);
    else if (fase < 0.75) dia = 1;
    else if (fase < 0.86) dia = 1 - suave((fase - 0.75) / 0.11);
    else dia = 0;
    const calido = fase < 0.12 || (fase > 0.7 && fase < 0.88) ? 1 : 0;
    const cielo = this.colorCielo.copy(this.cieloNoche).lerp(calido ? this.cieloAlba : this.cieloDia, dia);
    this.escena.background.copy(cielo);
    this.escena.fog.color.copy(cielo);
    this.sol.intensity = 0.7 + 1.9 * dia;
    this.sol.color.set(calido && dia < 0.95 ? 0xffc48a : dia > 0.05 ? 0xfff1d6 : 0xa9bcff);
    this.cielo.intensity = 0.75 + 0.25 * dia;
    this.cielo.color.copy(this.luzNoche).lerp(this.luzDia, dia);
    const ang = entre(0.15, Math.PI - 0.15, Math.min(1, Math.max(0, (fase - 0.02) / 0.84)));
    const t = this.controles.target;
    this.sol.position.set(t.x + Math.cos(ang) * 70, t.y + 25 + Math.sin(ang) * 75 * Math.max(0.2, dia), t.z + 45);
    this.sol.target.position.copy(t);
    this.noche = 1 - dia;
  }

  animar() {
    requestAnimationFrame(this.animar);
    if (!this.datos || document.hidden || this.lienzo.offsetParent === null) return;
    const dt = Math.min(0.05, this.reloj.getDelta());
    const t = performance.now() / 1000;
    const fase = this.faseDia();
    this.seguir(dt);
    if (this.vuelo) {
      this.vuelo.t = Math.min(1, this.vuelo.t + dt * 1.4);
      const u = suave(this.vuelo.t);
      const nuevo = this.vuelo.desde.clone().lerp(this.vuelo.hasta, u);
      this.camara.position.add(nuevo.clone().sub(this.controles.target));
      this.controles.target.copy(nuevo);
      if (this.vuelo.t >= 1) this.vuelo = null;
    }
    this.ajustarCamara(dt);
    this.moverDesvio(dt);
    // Que la cámara no se salga del mundo.
    const lim = this.controles.target;
    const mx = (this.W * T) / 2;
    const mz = (this.H * T) / 2;
    const cx = Math.max(-mx, Math.min(mx, lim.x)) - lim.x;
    const cz = Math.max(-mz, Math.min(mz, lim.z)) - lim.z;
    if (cx || cz) {
      lim.x += cx;
      lim.z += cz;
      this.camara.position.x += cx;
      this.camara.position.z += cz;
    }
    this.controles.update();
    this.luz(fase);
    this.animarAgua(t);
    this.animarFuegos(t);
    this.animarAnimales(t);
    this.animarPersonas(t, fase);
    this.moverEtiquetas();
    this.render.render(this.escena, this.camara);
  }

  animarAgua(t) {
    const pos = this.agua.geometry.attributes.position;
    const base = this.baseAgua;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const z = base[i * 3 + 2];
      pos.setY(i, Math.sin(x * 0.35 + t * 1.1) * 0.06 + Math.cos(z * 0.29 + t * 0.8) * 0.06);
    }
    pos.needsUpdate = true;
    this.agua.geometry.computeVertexNormals();
  }

  animarFuegos(t) {
    const llamas = this.instancias.llamas;
    const humo = this.instancias.humo;
    if (!llamas) return;
    const brillo = 0.6 + this.noche * 1.4;
    this.matLlama.color.setRGB(1, 0.55 + 0.1 * Math.sin(t * 9), 0.2).multiplyScalar(brillo);
    for (let k = 0; k < llamas.count; k++) {
      const [x, y, z] = this.hogueras[k];
      const s = 0.85 + 0.25 * Math.sin(t * 11 + k * 1.7) + 0.1 * Math.sin(t * 23 + k);
      this.colocar(llamas, k, x, y + 0.05, z, t * 2 + k, 0.9, s);
    }
    llamas.instanceMatrix.needsUpdate = true;
    // Las hogueras más cercanas a la cámara iluminan de noche.
    const objetivo = this.controles.target;
    const cerca = this.hogueras
      .map((h) => [h, (h[0] - objetivo.x) ** 2 + (h[2] - objetivo.z) ** 2])
      .sort((a, b) => a[1] - b[1])
      .slice(0, this.luces.length);
    this.luces.forEach((l, k) => {
      const h = cerca[k]?.[0];
      l.intensity = h ? this.noche * (5 + Math.sin(t * 13 + k) * 0.8) : 0;
      if (h) l.position.set(h[0], h[1] + 0.9, h[2]);
    });
    if (humo) {
      let n = 0;
      for (const [x, y, z] of this.hornos) {
        for (let k = 0; k < 4 && n < humo.count; k++) {
          const u = (t * 0.25 + k / 4 + x * 0.01) % 1;
          this.colocar(humo, n++, x + 0.22 + Math.sin(u * 6 + k) * 0.15, y + 0.9 + u * 2.2, z + u * 0.4, 0, 0.6 + u * 1.6);
        }
      }
      humo.instanceMatrix.needsUpdate = true;
    }
  }

  animarAnimales(t) {
    const ci = this.instancias.ciervos;
    if (ci) {
      let n = 0;
      for (const c of this.ciervos) {
        const u = t * 0.12 + c.fase;
        const x = c.x + Math.sin(u) * 1.6;
        const z = c.z + Math.cos(u * 0.8) * 1.4;
        const ang = Math.atan2(-(Math.cos(u) * 1.6), -(-Math.sin(u * 0.8) * 1.12));
        this.colocar(ci, n++, x, this.alturaEn(x, z), z, ang + Math.PI / 2, 0.9);
      }
      this.cerrar(ci, n);
    }
    const ov = this.instancias.ovejas;
    if (ov) {
      let n = 0;
      for (const o of this.ovejas) {
        const u = t * 0.2 + o.fase;
        const x = o.x + Math.sin(u + o.k) * 0.45;
        const z = o.z + Math.cos(u * 1.3 + o.k * 2) * 0.45;
        this.colocar(ov, n++, x, this.alturaEn(x, z), z, u, 1);
      }
      this.cerrar(ov, n);
    }
  }

  animarPersonas(t, fase) {
    const I = this.instancias;
    if (!I['p-torso']) return;
    const herr = {};
    for (const k of Object.keys(this.cuerpo.herramientas)) herr[k] = 0;
    let chispas = 0;
    const objetivo = this.controles.target;
    const lejos2 = 110 * 110;
    const muchos = this.personas.length > 700;
    const cuadro = Math.floor(t * 60);
    for (const per of this.personas) {
      const p = per.p;
      // Con mucha gente, los que quedan lejos se actualizan uno de cada tres cuadros.
      if (muchos && (per.x - objetivo.x) ** 2 + (per.z - objetivo.z) ** 2 > lejos2 && (cuadro + per.idx) % 3) continue;
      const f = (((fase + per.desfase) % 1) + 1) % 1;
      const a = this.aldeas.get(p.aldea);
      let destino = per.trabajo;
      let mov = 0;
      let k;
      let anda = false;
      let pose = 'pie';
      const quieto = p.act === 'jugar' || p.act === 'descansar' || p.act === 'experimentar' || p.act === 'defender';
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
      let x = entre(per.casa[0], destino[0], k);
      let z = entre(per.casa[1], destino[1], k);
      // De noche, todos alrededor del fuego; el consejo, en el círculo de dentro.
      if ((f > 0.86 || f < 0.04) && a && !quieto) {
        const [hx, hz] = this.aMundo(a.x, a.y);
        const consejero = this.consejeros.has(p.id);
        const r = consejero ? 1.1 : 1.8 + azar(p.id) * 1.4;
        const ang = azar(p.id * 5.7) * Math.PI * 2;
        const u = Math.min(1, f > 0.86 ? (f - 0.86) / 0.04 : 1);
        x = entre(per.casa[0], hx + Math.cos(ang) * r, u);
        z = entre(per.casa[1], hz + Math.sin(ang) * r, u);
        anda = u < 1;
        pose = consejero && u >= 1 ? 'sentado' : 'pie';
      }
      if (p.act === 'jugar') {
        const u = t * 1.6 + p.id;
        x = per.casa[0] + Math.cos(u) * 1.2;
        z = per.casa[1] + Math.sin(u * 1.2) * 1.0;
        anda = true;
      }
      if (p.act === 'descansar') pose = 'sentado';
      if (p.act === 'experimentar') pose = 'agachado';
      const dx = x - per.x;
      const dz = z - per.z;
      mov = Math.hypot(dx, dz);
      if (mov > 0.002) per.ang = Math.atan2(dx, dz);
      else if (k === 1 && p.act === 'pescar') per.ang = Math.atan2(destino[0] - per.casa[0], destino[1] - per.casa[1]);
      per.x = x;
      per.z = z;
      const y = this.alturaEn(x, z);
      const s = per.escala;
      const trabajando = k === 1 && !anda;
      // Animación de piernas y brazos.
      const paso = anda ? Math.sin(t * 9 + p.id) : 0;
      let brazoD = -paso * 0.6;
      let brazoI = paso * 0.6;
      let inclina = 0;
      let baja = 0;
      if (trabajando && TRABAJO_FUERTE.has(p.act)) {
        const g = Math.sin(t * 5 + p.id);
        brazoD = -1.6 + g * 1.2;
        inclina = 0.15 + g * 0.08;
      } else if (trabajando && p.act === 'recolectar') {
        inclina = 0.5 + 0.25 * Math.sin(t * 2 + p.id);
        brazoD = -0.8;
        brazoI = -0.6;
      } else if (trabajando && p.act === 'pescar') {
        brazoD = -1.0;
      } else if ((trabajando && p.act === 'cazar') || p.act === 'vigilar' || p.act === 'defender' || p.act === 'asaltar') {
        brazoD = -0.4;
      }
      let piernaI = paso * 0.7;
      let piernaD = -paso * 0.7;
      if (pose === 'sentado') {
        piernaI = -1.45;
        piernaD = -1.45;
        baja = 0.3;
      } else if (pose === 'agachado') {
        piernaI = -0.9;
        piernaD = -0.9;
        baja = 0.15;
        brazoD = -1.1 + Math.sin(t * 6 + p.id) * 0.3;
        brazoI = -1.0;
        inclina = 0.35;
      }
      this.mPersona.makeRotationY(per.ang);
      this.mPersona.scale(this.vec.set(s, s, s));
      this.mPersona.setPosition(x, y - baja * s, z);
      const i = per.idx;
      this.parte(I['p-piernaI'], i, -0.07, 0.36, 0, piernaI, 0);
      this.parte(I['p-piernaD'], i, 0.07, 0.36, 0, piernaD, 0);
      this.parte(I['p-torso'], i, 0, 0.54, 0, inclina, 0);
      this.parte(I['p-cabeza'], i, 0, 0.84 - inclina * 0.12, inclina * 0.16, 0, 0);
      this.parte(I['p-pelo'], i, 0, 0.95 - inclina * 0.12, inclina * 0.18, 0, 0);
      this.parte(I['p-brazoI'], i, -0.18, 0.7, inclina * 0.1, brazoI, 0);
      this.parte(I['p-brazoD'], i, 0.18, 0.7, inclina * 0.1, brazoD, 0);
      const h = per.herramienta;
      if (h && (k > 0 || p.act === 'vigilar' || p.act === 'defender') && pose === 'pie') {
        const im = I[`h-${h}`];
        this.tmp2.makeRotationX(brazoD);
        this.tmp2.setPosition(0.18, 0.7, inclina * 0.1);
        this.tmp.multiplyMatrices(this.mPersona, this.tmp2);
        im.setMatrixAt(herr[h]++, this.tmp);
      }
      if (p.act === 'experimentar') {
        const im = I.chispas;
        const u = t * 2 + p.id;
        this.tmp.makeRotationY(u);
        this.tmp.setPosition(x + Math.cos(u) * 0.3, y + 0.95 + Math.sin(u * 2) * 0.15, z + Math.sin(u) * 0.3);
        im.setMatrixAt(chispas++, this.tmp);
      }
    }
    for (const k of ['p-torso', 'p-cabeza', 'p-pelo', 'p-piernaI', 'p-piernaD', 'p-brazoI', 'p-brazoD']) I[k].instanceMatrix.needsUpdate = true;
    for (const [k, n] of Object.entries(herr)) {
      const im = I[`h-${k}`];
      im.count = n;
      im.instanceMatrix.needsUpdate = true;
    }
    I.chispas.count = chispas;
    I.chispas.instanceMatrix.needsUpdate = true;
    this.matChispa.color.setRGB(1, 0.85 + 0.15 * Math.sin(t * 8), 0.45);
  }

  /** Coloca una parte del cuerpo: posición de la articulación y giro adelante/atrás. */
  parte(im, i, ox, oy, oz, rx, ry) {
    this.tmp2.makeRotationX(rx);
    if (ry) this.tmp2.multiply(this.tmp.makeRotationY(ry));
    this.tmp2.setPosition(ox, oy, oz);
    this.tmp.multiplyMatrices(this.mPersona, this.tmp2);
    im.setMatrixAt(i, this.tmp);
  }

  moverEtiquetas() {
    const w = this.lienzo.clientWidth;
    const h = this.lienzo.clientHeight;
    for (const [id, el] of this.etiquetas) {
      const a = this.aldeas.get(id);
      if (!a) continue;
      const [x, z] = this.aMundo(a.x, a.y);
      this.vec.set(x, this.alturaEn(x, z) + 2.6, z).project(this.camara);
      const visible = this.vec.z < 1 && Math.abs(this.vec.x) < 1.1 && Math.abs(this.vec.y) < 1.1;
      el.style.display = visible ? '' : 'none';
      if (visible) el.style.transform = `translate(-50%, -100%) translate(${((this.vec.x + 1) / 2) * w}px, ${((1 - this.vec.y) / 2) * h}px)`;
    }
    const sel = this.seleccion?.persona;
    const per = sel !== undefined ? this.personas.find((q) => q.p.id === sel) : null;
    if (per && this.textoBurbuja) {
      this.vec.set(per.x, this.alturaEn(per.x, per.z) + 1.35 * per.escala, per.z).project(this.camara);
      this.burbujaSel.hidden = this.vec.z >= 1;
      this.burbujaSel.textContent = this.textoBurbuja;
      this.burbujaSel.style.transform = `translate(-50%, -100%) translate(${((this.vec.x + 1) / 2) * w}px, ${((1 - this.vec.y) / 2) * h}px)`;
    } else {
      this.burbujaSel.hidden = true;
    }
    for (const b of this.burbujas) {
      const q = this.personas.find((x) => x.p.id === b.id);
      if (!q) {
        b.el.remove();
        continue;
      }
      this.vec.set(q.x, this.alturaEn(q.x, q.z) + 1.3 * q.escala, q.z).project(this.camara);
      b.el.style.display = this.vec.z < 1 && Math.abs(this.vec.x) < 1.05 && Math.abs(this.vec.y) < 1.05 ? '' : 'none';
      b.el.style.transform = `translate(-50%, -100%) translate(${((this.vec.x + 1) / 2) * w}px, ${((1 - this.vec.y) / 2) * h}px)`;
    }
  }

  /** Muestra un pensamiento flotando sobre alguien durante unos segundos. */
  pensamiento(id, texto, ms = 4500) {
    if (this.burbujas.length >= 2 || this.burbujas.some((b) => b.id === id)) return;
    const el = document.createElement('div');
    el.className = 'burbuja ambiente';
    el.textContent = texto;
    this.capa.append(el);
    const b = { id, el };
    this.burbujas.push(b);
    setTimeout(() => {
      el.remove();
      this.burbujas = this.burbujas.filter((x) => x !== b);
    }, ms);
  }

  /** Personas visibles cerca del centro de la vista (para pensamientos al azar). */
  visiblesCerca(n = 30) {
    const o = this.controles.target;
    return this.personas
      .filter((q) => q.p.edad >= 12 && (q.x - o.x) ** 2 + (q.z - o.z) ** 2 < 30 * 30)
      .slice(0, n)
      .map((q) => q.p);
  }

  elegir(sel, texto) {
    this.seleccion = sel;
    this.textoBurbuja = texto ?? null;
    for (const [id, el] of this.etiquetas) el.classList.toggle('elegida', sel?.aldea === id);
  }

  // ---------- toques ----------

  instalarToques() {
    let inicio = null;
    this.lienzo.addEventListener('pointerdown', (e) => {
      inicio = { x: e.clientX, y: e.clientY, t: performance.now() };
    });
    this.lienzo.addEventListener('pointerup', (e) => {
      if (!inicio) return;
      const movido = Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) > 6;
      inicio = null;
      if (movido || !this.datos) return;
      this.tocar(e);
    });
  }

  tocar(e) {
    const r = this.lienzo.getBoundingClientRect();
    const v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(v, this.camara);
    const partes = ['p-torso', 'p-cabeza', 'p-piernaI', 'p-piernaD'].map((k) => this.instancias[k]).filter(Boolean);
    const golpes = this.raycaster.intersectObjects([...partes, this.terreno], false);
    for (const g of golpes) {
      if (g.object !== this.terreno && g.instanceId !== undefined) {
        const per = this.personas[g.instanceId];
        if (per) {
          this.alTocar?.({ persona: per.p.id, aldea: per.p.aldea });
          return;
        }
      }
      if (g.object === this.terreno) {
        // ¿Cerca de una aldea?
        let mejor = null;
        let dmin = (T * 3.5) ** 2;
        for (const a of this.datos.aldeas) {
          const [x, z] = this.aMundo(a.x, a.y);
          const d2 = (x - g.point.x) ** 2 + (z - g.point.z) ** 2;
          if (d2 < dmin) {
            dmin = d2;
            mejor = a;
          }
        }
        this.alTocar?.(mejor ? { aldea: mejor.id } : {});
        return;
      }
    }
    this.alTocar?.({});
  }
}
