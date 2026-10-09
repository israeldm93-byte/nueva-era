// Los animales del mundo en 3D, con su esqueleto y su forma de moverse.
//
// - Las fieras de la simulación (manadas de lobos y osos) van adonde dice el mundo:
//   rondan al trote, acechan agazapados (de noche se les ven los ojos), atacan al
//   galope, huyen; parados, olfatean, se tumban, se sientan y de noche aúllan. El oso
//   se yergue sobre las patas de atrás cuando ataca y en invierno hiberna.
// - Donde hay caza viven rebaños: ciervos (el macho con cuernas, alguna cría), jabalíes,
//   liebres, caballos salvajes en la estepa y cabras monteses en las alturas. Pastan,
//   pasean, levantan la cabeza alerta y huyen al galope de la gente y de las fieras.
//   Si se caza demasiado en un sitio, su rebaño desaparece.
// - Ovejas en los corrales, gaviotas sobre las islas y los lagos, águilas sobre las
//   montañas, patos en las orillas de los lagos, garzas en los pantanos y peces que
//   saltan cerca de la cámara.

import * as THREE from 'three';
import { AGUA, BOSQUE, COLINA, DESIERTO, ESTEPA, MONTANA, PANTANO, PRADERA, RIO, acotar, agua, azar, entre, enVista, instancias, suave, vista } from './util3d.js?v=__MOTOR__';
import { ESPECIES, modelosAnimales } from './animales3d.js?v=__MOTOR__';

/** Alrededor de lo que se mira (unidades del mundo) viven y se dibujan los animales de adorno. */
const RADIO_VIDA = 95;
/** Rejilla (en casillas) para repartir los rebaños por el mapa. */
const BLOQUE = 9;

/** Qué rebaños hay en cada terreno, con su probabilidad. */
const FAUNA_TERRENO = {
  [BOSQUE]: [
    ['ciervo', 0.55],
    ['jabali', 0.45],
  ],
  [PRADERA]: [
    ['ciervo', 0.5],
    ['liebre', 0.5],
  ],
  [ESTEPA]: [
    ['caballo', 0.7],
    ['liebre', 0.3],
  ],
  [COLINA]: [
    ['cabra', 0.4],
    ['ciervo', 0.3],
    ['liebre', 0.3],
  ],
  [MONTANA]: [['cabra', 1]],
  [PANTANO]: [['jabali', 1]],
  [DESIERTO]: [['liebre', 1]],
};
const TAMANO = { ciervo: [3, 6], jabali: [2, 5], liebre: [1, 2], caballo: [4, 8], cabra: [2, 4] };
const RADIO = { ciervo: 3.5, jabali: 2.5, liebre: 2, caballo: 5, cabra: 3, oveja: 0.42 };
/** De quién se asustan y a qué distancia: [gente, fieras]. */
const MIEDO = { ciervo: [6, 9], jabali: [4, 6], liebre: [4, 6], caballo: [7, 10], cabra: [5, 8], oveja: [0, 0] };
const COLORES = {
  lobo: [0x8b8d92, 0x7d7a74, 0x9a9690, 0x6a6660, 0xb8b6b0, 0x5a5a5e],
  oso: [0x5a3b24, 0x4e3220, 0x6a4a2c],
  ciervo: [0x8a5a33, 0x9a6438, 0x7d5230],
  jabali: [0x4a3b30, 0x3e3128, 0x55443a],
  liebre: [0x9a7a55, 0x8a6e50, 0xa88a62],
  caballo: [0xc49a5c, 0xb8905a, 0xd0a868, 0xa87a48],
  cabra: [0x8a7a62, 0x9a8a70, 0x7a6a56],
  oveja: [0xf2efe4, 0xf2efe4, 0xece4d2, 0xf2efe4, 0xd8cdb8, 0x3a3430],
};

// Andares: desfase de cada pata [delantera izq., delantera der., trasera izq., trasera der.],
// amplitud del paso, cuánto se dobla la pata al levantarla, largo de la zancada (en largos
// de pata), bote del cuerpo y cabeceo.
const PASO = { desfase: [0.25, 0.75, 0, 0.5], amp: 0.42, dobla: 0.9, zancada: 1.6, bote: 0.025, cabeceo: 0 };
const TROTE = { desfase: [0, 0.5, 0.5, 0], amp: 0.55, dobla: 1.2, zancada: 2.5, bote: 0.045, cabeceo: 0 };
const GALOPE = { desfase: [0.55, 0.65, 0, 0.1], amp: 0.8, dobla: 1.4, zancada: 4.6, bote: 0.07, cabeceo: 0.12 };
const SALTO = { desfase: [0.5, 0.56, 0, 0.03], amp: 0.95, dobla: 1.2, zancada: 13, bote: 0.35, cabeceo: 0.3 };

const PIEZAS = [
  ...new Set(Object.values(ESPECIES).flatMap((e) => [e.cuerpo, e.cabeza, e.cola])),
  'cabezaCiervo',
  'muslo',
  'canilla',
  'ojos',
  'gaviota',
  'ala',
  'pato',
  'garza',
  'cuelloGarza',
  'pez',
  'ola',
];

// Matrices de trabajo.
const RAIZ = new THREE.Matrix4();
const CUERPO = new THREE.Matrix4();
const CAB = new THREE.Matrix4();
const COLA = new THREE.Matrix4();
const CADERA = new THREE.Matrix4();
const RODILLA = new THREE.Matrix4();
const PIEZA = new THREE.Matrix4();
const L = new THREE.Matrix4();
const E = new THREE.Euler();
const Q = new THREE.Quaternion();
const V = new THREE.Vector3();
const UNO = new THREE.Vector3(1, 1, 1);
const ESC = new THREE.Vector3();

/** out = padre · traslación · giro (primero en vertical, luego cabeceo y alabeo). */
function articular(out, padre, x, y, z, rx = 0, ry = 0, rz = 0) {
  E.set(rx, ry, rz, 'YXZ');
  Q.setFromEuler(E);
  L.compose(V.set(x, y, z), Q, UNO);
  return out.multiplyMatrices(padre, L);
}

/** Ángulo de a a b por el camino corto. */
const giroHacia = (a, b) => ((((b - a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;

/** Postura de un cuadrúpedo en un instante (se rellena sin crear objetos). */
const P = { y: 0, cabeceo: 0, atras: false, patas: new Float32Array(8), cab: 0, cabY: 0, colaX: 0, colaY: 0 };

export class Fauna3D {
  constructor(escena, terreno) {
    this.escena = escena;
    this.terreno = terreno;
    this.geo = modelosAnimales();
    this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 });
    this.matDoble = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.8, side: THREE.DoubleSide });
    this.matOjos = new THREE.MeshBasicMaterial({ color: 0xffd36b });
    this.matOla = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false });
    this.im = {};
    this.fieras = new Map();
    this.rebanos = [];
    this.ovejas = new Map();
    this.aves = [];
    this.patos = [];
    this.garzas = [];
    this.saltos = [];
    this.proximoSalto = 0;
    this.rejilla = new Map();
    this.color = new THREE.Color();
    this.pardo = new THREE.Color(0x6a4a2a);
    this.blanco = new THREE.Color(0xffffff);
    this.capacidad = {};
  }

  // ---------- el mundo de cada día ----------

  actualizar(d, corrales) {
    const tr = this.terreno;
    const clave = `${d.era}-${d.semilla}-${d.ancho}`;
    this.d = d;
    if (clave !== this.clave) {
      this.clave = clave;
      this.agua = agua(d);
      this.rebanos = this.generarRebanos(d);
      this.aves = this.generarAves(d);
      this.patos = this.generarPatos(d);
      this.garzas = this.generarGarzas(d);
      this.fieras.clear();
      this.ovejas.clear();
    }
    // Rebaños: si en su sitio ya no queda caza (o ha crecido una aldea al lado), no están.
    const W = d.ancho;
    const aldeas = d.aldeas.filter((a) => a.abandonada === null);
    for (const r of this.rebanos) {
      const tx = r.i % W;
      const ty = Math.floor(r.i / W);
      r.vivo = d.caza[r.i] >= 2 && !aldeas.some((a) => (a.x - tx) ** 2 + (a.y - ty) ** 2 < 25);
    }
    // Fieras de la simulación: cada lobo de cada manada, y cada oso.
    const vivos = new Set();
    for (const f of d.fauna) {
      const [x0, z0] = tr.aMundo(f.px, f.py);
      const [x1, z1] = tr.aMundo(f.x, f.y);
      const esp = f.tipo === 'oso' ? 'oso' : 'lobo';
      const n = esp === 'oso' ? 1 : f.n;
      for (let k = 0; k < n; k++) {
        const id = `${f.id}-${k}`;
        vivos.add(id);
        const ang = (k / n) * Math.PI * 2 + azar(f.id + k);
        const r = k === 0 ? 0 : 0.7 + azar(f.id * 3 + k) * 0.9;
        let a = this.fieras.get(id);
        if (!a) {
          a = this.nuevo(esp, x0 + Math.cos(ang) * r, z0 + Math.sin(ang) * r, f.id * 13 + k);
          this.fieras.set(id, a);
        }
        Object.assign(a, { f, k, n, x0, z0, x1, z1, ox: Math.cos(ang) * r, oz: Math.sin(ang) * r });
      }
    }
    for (const id of this.fieras.keys()) if (!vivos.has(id)) this.fieras.delete(id);
    // Ovejas en los corrales (cada corral con las suyas).
    const enCorral = new Set();
    for (const c of corrales) {
      const n = Math.min(5, Math.ceil(c.animales / 3));
      for (let k = 0; k < n; k++) {
        const id = `${Math.round(c.pos[0] * 10)},${Math.round(c.pos[2] * 10)}-${k}`;
        enCorral.add(id);
        if (this.ovejas.has(id)) continue;
        const o = this.nuevo('oveja', c.pos[0] + (azar(k * 3.1 + c.pos[0]) - 0.5) * 0.6, c.pos[2] + (azar(k * 4.7 + c.pos[2]) - 0.5) * 0.6, c.pos[0] * 7 + k);
        o.hx = c.pos[0];
        o.hz = c.pos[2];
        o.escala = 0.72 + azar(k + c.pos[2]) * 0.1;
        this.ovejas.set(id, o);
      }
    }
    for (const id of this.ovejas.keys()) if (!enCorral.has(id)) this.ovejas.delete(id);
    this.dimensionar();
  }

  /** Un animal nuevo con su estado (posición, rumbo, velocidad, paso, ánimo). */
  nuevo(esp, x, z, semilla) {
    const colores = COLORES[esp];
    const c = new THREE.Color(colores[Math.floor(azar(semilla * 1.3) * colores.length)]).offsetHSL(0, 0, (azar(semilla * 2.1) - 0.5) * 0.06);
    // El modelo ya tiene el pelaje de su especie: cada animal lleva su tono relativo a él.
    const base = new THREE.Color(ESPECIES[esp].color);
    const tono = new THREE.Color(c.r / base.r, c.g / base.g, c.b / base.b);
    // Las patas de lobos y osos, de su color; las de los demás, más oscuras.
    const pata = new THREE.Color(ESPECIES[esp].pata).lerp(c, esp === 'lobo' || esp === 'oso' ? 0.6 : 0);
    return {
      esp,
      x,
      z,
      hx: x,
      hz: z,
      ang: azar(semilla * 3.3) * Math.PI * 2,
      v: 0,
      fase: azar(semilla * 5.1),
      estado: 'pastar',
      t: azar(semilla * 7.7) * 4,
      dest: null,
      huye: null,
      escala: 0.9 + azar(semilla * 9.9) * 0.2,
      color: tono,
      pata,
      id: semilla,
    };
  }

  generarRebanos(d) {
    const W = d.ancho;
    const H = d.alto;
    const tr = this.terreno;
    const out = [];
    for (let by = 0; by < H; by += BLOQUE) {
      for (let bx = 0; bx < W; bx += BLOQUE) {
        const s = bx * 7.13 + by * 3.71 + (d.semilla % 1000) * 0.37;
        if (azar(s) > 0.6) continue;
        const tx = bx + Math.floor(azar(s + 1) * BLOQUE);
        const ty = by + Math.floor(azar(s + 2) * BLOQUE);
        if (tx >= W || ty >= H) continue;
        const i = ty * W + tx;
        const opciones = FAUNA_TERRENO[d.terreno[i]];
        if (!opciones) continue;
        let r = azar(s + 3);
        let esp = opciones[0][0];
        for (const [e, p] of opciones) {
          if ((r -= p) < 0) {
            esp = e;
            break;
          }
        }
        const [x, z] = tr.aMundo(tx, ty);
        const [a, b] = TAMANO[esp];
        const n = a + Math.floor(azar(s + 4) * (b - a + 1));
        const miembros = [];
        for (let k = 0; k < n; k++) {
          const ang = azar(s + 10 + k) * Math.PI * 2;
          const rr = 0.4 + azar(s + 20 + k) * 1.4;
          let ax = x + Math.cos(ang) * rr;
          let az = z + Math.sin(ang) * rr;
          if (!this.pisable(esp, ax, az)) {
            ax = x;
            az = z;
          }
          const m = this.nuevo(esp, ax, az, s * 31 + k);
          m.hx = x;
          m.hz = z;
          if (esp === 'ciervo' && k === 0) m.macho = true;
          // Una cría en los rebaños grandes.
          if ((esp === 'ciervo' || esp === 'jabali' || esp === 'caballo') && k === n - 1 && n >= 4) m.escala *= 0.6;
          miembros.push(m);
        }
        out.push({ esp, i, x, z, miembros, vivo: true });
      }
    }
    return out;
  }

  /** Gaviotas sobre las islas pequeñas y los lagos grandes; águilas sobre las montañas. */
  generarAves(d) {
    const W = d.ancho;
    const H = d.alto;
    const tr = this.terreno;
    const marca = new Int32Array(W * H).fill(-1);
    const grupos = [];
    const vecinos = (j, f) => {
      const x = j % W;
      const y = (j - x) / W;
      if (x > 0) f(j - 1);
      if (x < W - 1) f(j + 1);
      if (y > 0) f(j - W);
      if (y < H - 1) f(j + W);
    };
    // Cada tierra y cada lago, un grupo de casillas.
    for (let i = 0; i < W * H; i++) {
      if (marca[i] >= 0) continue;
      const tierra = d.terreno[i] !== AGUA;
      if (!tierra && !this.agua.lago[i]) continue;
      const k = grupos.length;
      const pila = [i];
      marca[i] = k;
      const casillas = [];
      while (pila.length) {
        const j = pila.pop();
        casillas.push(j);
        vecinos(j, (v) => {
          if (marca[v] < 0 && (d.terreno[v] !== AGUA) === tierra && (tierra || this.agua.lago[v])) {
            marca[v] = k;
            pila.push(v);
          }
        });
      }
      grupos.push({ tierra, casillas });
    }
    const aves = [];
    for (const g of grupos) {
      const n = g.casillas.length;
      if (g.tierra ? n > 300 || n < 3 : n < 30) continue;
      let sx = 0;
      let sy = 0;
      for (const j of g.casillas) {
        sx += j % W;
        sy += Math.floor(j / W);
      }
      const [x, z] = tr.aMundo(sx / n, sy / n);
      const cuantas = g.tierra ? Math.min(10, 4 + Math.floor(n / 6)) : Math.min(6, 2 + Math.floor(n / 40));
      for (let k = 0; k < cuantas; k++) {
        aves.push({ tipo: 'gaviota', x, z, r: 2 + azar(x + k) * 5, h: 4 + azar(z + k * 3) * 3.5, w: (0.3 + azar(x * k) * 0.25) * (k % 3 ? 1 : -1), fase: azar(k * 13 + x) * 6.28, s: 1.3 });
      }
    }
    // Águilas sobre las cumbres más altas, separadas entre sí.
    const cumbres = [];
    for (let i = 0; i < W * H; i++) if (d.terreno[i] === MONTANA) cumbres.push(i);
    cumbres.sort((a, b) => d.relieve[b] - d.relieve[a]);
    const elegidas = [];
    for (const i of cumbres) {
      if (elegidas.length >= 4) break;
      const x = i % W;
      const y = Math.floor(i / W);
      if (elegidas.some((j) => ((j % W) - x) ** 2 + (Math.floor(j / W) - y) ** 2 < 30 * 30)) continue;
      elegidas.push(i);
    }
    for (const i of elegidas) {
      const [x, z] = tr.aMundo(i % W, Math.floor(i / W));
      for (let k = 0; k < (azar(i) < 0.5 ? 2 : 1); k++) {
        aves.push({ tipo: 'aguila', x, z, r: 8 + azar(i + k) * 6, h: tr.hCasilla[i] + 9 + k * 3, w: 0.16 + azar(i * 3 + k) * 0.08, fase: azar(i * 7 + k) * 6.28, s: 2.6 });
      }
    }
    return aves;
  }

  /** Patos en las orillas de los lagos templados. */
  generarPatos(d) {
    const W = d.ancho;
    const tr = this.terreno;
    const out = [];
    for (let i = 0; i < W * d.alto && out.length < 36; i++) {
      if (!this.agua.bordeLago[i] || azar(i * 1.37) > 0.05) continue;
      if (Math.floor(i / W) / (d.alto - 1) < 0.2) continue;
      const [x, z] = tr.aMundo(i % W, Math.floor(i / W));
      const n = 3 + Math.floor(azar(i * 2.1) * 3);
      const miembros = [];
      for (let k = 0; k < n; k++) {
        miembros.push({ x: x + (azar(i + k) - 0.5) * 1.2, z: z + (azar(i * 3 + k) - 0.5) * 1.2, ang: azar(i * 5 + k) * 6.28, estado: 'flotar', t: azar(i * 7 + k) * 5, dest: null, hx: x, hz: z, id: i * 10 + k, s: 0.95 + azar(i * 11 + k) * 0.15 });
      }
      out.push({ x, z, miembros });
    }
    return out;
  }

  /** Garzas al acecho en los pantanos y en las riberas. */
  generarGarzas(d) {
    const W = d.ancho;
    const tr = this.terreno;
    const out = [];
    for (let i = 0; i < W * d.alto && out.length < 30; i++) {
      if (!(d.terreno[i] === PANTANO || this.agua.ribera[i]) || azar(i * 2.71) > 0.035) continue;
      const [x, z] = tr.aMundo(i % W, Math.floor(i / W));
      out.push({ x: x + (azar(i) - 0.5) * 1.2, z: z + (azar(i * 3) - 0.5) * 1.2, ang: azar(i * 5) * 6.28, fase: azar(i * 7) * 20, id: i });
    }
    return out;
  }

  /** Reserva sitio en cada malla para todos los animales que pueden llegar a verse. */
  dimensionar() {
    const cuenta = Object.fromEntries(PIEZAS.map((k) => [k, 0]));
    const contar = (esp, n) => {
      const e = ESPECIES[esp];
      cuenta[e.cuerpo] += n;
      cuenta[e.cabeza] += n;
      cuenta[e.cola] += n;
      if (esp === 'ciervo') cuenta.cabezaCiervo += n;
      cuenta.muslo += n * 4;
      cuenta.canilla += n * 4;
    };
    for (const a of this.fieras.values()) contar(a.esp, 1);
    for (const r of this.rebanos) contar(r.esp, r.miembros.length);
    contar('oveja', this.ovejas.size);
    cuenta.ojos = 80;
    cuenta.gaviota = this.aves.length;
    cuenta.ala = this.aves.length * 2;
    cuenta.pato = this.patos.reduce((s, g) => s + g.miembros.length, 0);
    cuenta.garza = this.garzas.length;
    cuenta.cuelloGarza = this.garzas.length;
    cuenta.pez = 8;
    cuenta.ola = 16;
    for (const k of PIEZAS) {
      const max = cuenta[k] + 8;
      if ((this.capacidad[k] ?? 0) >= max) continue;
      this.capacidad[k] = Math.ceil(max * 1.3);
      const mat = k === 'ojos' ? this.matOjos : k === 'ola' ? this.matOla : k === 'ala' || k === 'pez' ? this.matDoble : this.mat;
      instancias(this.escena, this.im, k, this.geo[k], mat, this.capacidad[k], { sombra: k !== 'ojos' && k !== 'ola' && k !== 'pez' });
    }
  }

  // ---------- el terreno para los animales ----------

  /** ¿Puede pisar aquí? (no se meten en el agua; solo las cabras suben a los riscos). */
  pisable(esp, x, z) {
    const tr = this.terreno;
    const d = this.d;
    if (!d) return true;
    const [tx, ty] = tr.aCasilla(x, z);
    if (tx < 0 || ty < 0 || tx >= d.ancho || ty >= d.alto) return false;
    const i = ty * d.ancho + tx;
    const t = d.terreno[i];
    if (t === AGUA || t === RIO) return false;
    return ESPECIES[esp]?.trepa || tr.hCasilla[i] < 5.6;
  }

  enAgua(x, z) {
    const d = this.d;
    const [tx, ty] = this.terreno.aCasilla(x, z);
    if (tx < 0 || ty < 0 || tx >= d.ancho || ty >= d.alto) return false;
    return d.terreno[ty * d.ancho + tx] === AGUA;
  }

  /** Altura del agua (con sus olas) en un punto. */
  nivelAgua(x, z, t) {
    return -0.05 + Math.sin(x * 0.12 + t * 0.9) * 0.07 + Math.cos(z * 0.1 + t * 0.7) * 0.07;
  }

  // ---------- comportamiento ----------

  /** Gira hacia (dx, dz) y acelera hasta `vel`; si delante no se puede pisar, se frena. */
  mover(a, dt, dx, dz, vel, giro = 3.5) {
    if (dx || dz) {
      const dif = giroHacia(a.ang, Math.atan2(dx, dz));
      a.ang += acotar(dif, -giro * dt, giro * dt);
      // Al girar mucho, más despacio.
      vel *= 1 - Math.min(0.7, Math.abs(dif) / Math.PI);
    }
    a.v += acotar(vel - a.v, -7 * dt, 5 * dt);
    a.bloqueado = false;
    if (a.v > 0.001) {
      const nx = a.x + Math.sin(a.ang) * a.v * dt;
      const nz = a.z + Math.cos(a.ang) * a.v * dt;
      if (this.pisable(a.esp, nx, nz)) {
        a.x = nx;
        a.z = nz;
      } else {
        a.v *= 0.3;
        a.bloqueado = true;
      }
    }
  }

  /** Como `mover`, pero sin mirar el terreno (las fieras van por donde dice el mundo). */
  moverLibre(a, dt, dx, dz, vel) {
    if (dx || dz) a.ang += acotar(giroHacia(a.ang, Math.atan2(dx, dz)), -4 * dt, 4 * dt);
    a.v += acotar(vel - a.v, -7 * dt, 5 * dt);
    a.x += Math.sin(a.ang) * a.v * dt;
    a.z += Math.cos(a.ang) * a.v * dt;
  }

  /** La amenaza más cercana (gente o fieras) dentro del radio de miedo de un animal. */
  amenazaDe(x, z, [rg, rf]) {
    let mejor = null;
    let dmin = Infinity;
    const cx = Math.floor(x / 8);
    const cz = Math.floor(z / 8);
    for (let i = cx - 1; i <= cx + 1; i++) {
      for (let j = cz - 1; j <= cz + 1; j++) {
        const lista = this.rejilla.get(i * 100003 + j);
        if (!lista) continue;
        for (const [ax, az, fiera] of lista) {
          const r = fiera ? rf : rg;
          const d2 = (ax - x) ** 2 + (az - z) ** 2;
          if (d2 < r * r && d2 < dmin) {
            dmin = d2;
            mejor = [ax, az];
          }
        }
      }
    }
    return mejor;
  }

  /** Un animal de rebaño: pasta, pasea, se alerta, descansa y huye. */
  pensar(a, dt, noche) {
    a.t -= dt;
    const amenaza = a.esp === 'oveja' ? null : this.amenazaDe(a.x, a.z, MIEDO[a.esp]);
    if (amenaza) {
      if (a.estado !== 'huir') a.t = 2.2 + azar(a.id + a.t) * 1.6;
      a.estado = 'huir';
      a.huye = amenaza;
    }
    switch (a.estado) {
      case 'huir': {
        let dx = a.x - a.huye[0];
        let dz = a.z - a.huye[1];
        // Si se topa con el agua o un risco, prueba a escapar de lado.
        if (a.bloqueado) a.desvio = (a.desvio ?? 0) + (azar(a.id) < 0.5 ? 1.3 : -1.3);
        if (a.desvio) {
          const c = Math.cos(a.desvio);
          const s = Math.sin(a.desvio);
          [dx, dz] = [dx * c - dz * s, dx * s + dz * c];
        }
        this.mover(a, dt, dx, dz, ESPECIES[a.esp].vel[2], 5);
        if (a.t <= 0) {
          a.estado = 'alerta';
          a.t = 1.5 + azar(a.id * 3 + a.x) * 2.5;
          a.desvio = 0;
          // Se queda a vivir donde ha llegado.
          a.hx = a.x;
          a.hz = a.z;
        }
        break;
      }
      case 'andar': {
        const dx = a.dest[0] - a.x;
        const dz = a.dest[1] - a.z;
        const d = Math.hypot(dx, dz);
        this.mover(a, dt, dx, dz, Math.min(ESPECIES[a.esp].vel[0], d * 1.5 + 0.1));
        if (d < 0.2 || a.t <= 0 || a.bloqueado) {
          a.estado = 'pastar';
          a.t = 3 + azar(a.id + a.x) * 6;
        }
        break;
      }
      default: {
        this.mover(a, dt, 0, 0, 0);
        if (a.t > 0) break;
        const r = azar(a.id * 1.7 + a.x * 3.1 + a.z);
        if (noche && r < 0.35) {
          a.estado = 'echado';
          a.t = 15 + r * 30;
        } else if (r < 0.6) {
          // A pasear, sin alejarse de los suyos.
          const ang = azar(a.id + a.z * 2.3) * Math.PI * 2;
          const rr = RADIO[a.esp] * Math.sqrt(azar(a.id * 2 + a.x));
          const dest = [a.hx + Math.cos(ang) * rr, a.hz + Math.sin(ang) * rr];
          if (this.pisable(a.esp, dest[0], dest[1])) {
            a.estado = 'andar';
            a.dest = dest;
            a.t = 10;
          } else a.t = 1;
        } else if (r < 0.75) {
          a.estado = 'alerta';
          a.t = 1.5 + r * 2;
          a.mira = (azar(a.id * 5 + a.x) - 0.5) * 1.6;
          a.huye = null;
        } else {
          a.estado = 'pastar';
          a.t = 3 + r * 5;
        }
      }
    }
    // Alerta tras huir: mira hacia lo que le asustó.
    if (a.estado === 'alerta' && a.huye) a.mira = acotar(giroHacia(a.ang, Math.atan2(a.huye[0] - a.x, a.huye[1] - a.z)), -1.2, 1.2);
  }

  /** Lobos y osos: siguen a su manada (lo que manda la simulación) y, parados, hacen lo suyo. */
  pensarFiera(a, dt, u, t, noche) {
    const f = a.f;
    const giro = Math.sin(t * 0.13 + a.id) * 0.4;
    const ox = a.ox * Math.cos(giro) - a.oz * Math.sin(giro);
    const oz = a.ox * Math.sin(giro) + a.oz * Math.cos(giro);
    const dx = entre(a.x0, a.x1, u) + ox - a.x;
    const dz = entre(a.z0, a.z1, u) + oz - a.z;
    const d = Math.hypot(dx, dz);
    const vel = ESPECIES[a.esp].vel;
    const max = f.estado === 'ataca' || f.estado === 'huye' ? vel[2] : f.estado === 'acecha' ? vel[0] * 0.6 : vel[1];
    a.agachado = f.estado === 'acecha';
    if (d > 0.25) {
      this.moverLibre(a, dt, dx, dz, Math.min(max, d * 1.6));
      a.quieto = 0;
    } else {
      this.moverLibre(a, dt, 0, 0, 0);
      a.quieto = (a.quieto ?? 0) + dt;
      // Al acecho, encarados hacia la aldea.
      if (f.estado === 'acecha') a.ang += acotar(giroHacia(a.ang, Math.atan2(a.x1 - a.x0, a.z1 - a.z0)), -dt, dt);
    }
    a.estado = 'pie';
    if (a.esp === 'oso' && f.estado === 'ataca' && d < 1.2) a.estado = 'erguido';
    else if (a.quieto > 0.5) {
      const ciclo = (t * 0.05 + azar(a.id)) % 1;
      if (a.esp === 'lobo' && noche && (t + f.id * 7.3) % 24 < 5 && (a.k === 0 || azar(f.id * 3 + a.k) < 0.5)) a.estado = 'aullar';
      else if (f.estado === 'acecha') a.estado = 'acecho';
      else if (ciclo < 0.35) a.estado = 'olfatear';
      else if (ciclo < 0.6) a.estado = a.esp === 'oso' && ciclo > 0.5 ? 'sentado' : 'pie';
      else if (ciclo < 0.85 && !noche) a.estado = 'echado';
      else a.estado = a.esp === 'lobo' ? 'sentado' : 'pie';
    }
  }

  // ---------- posturas ----------

  /** El andar que toca a esta velocidad. */
  andar(a, esp) {
    const vel = esp.vel;
    if (esp.salta && a.v > vel[0] * 1.6) return SALTO;
    return a.v < (vel[0] + vel[1]) / 2 ? PASO : a.v < (vel[1] + vel[2]) / 2 ? TROTE : GALOPE;
  }

  /** Avanza el ciclo de las patas según lo que ha recorrido. */
  avanzar(a, esp, dt) {
    a.fase = (a.fase + (a.v * dt) / (this.andar(a, esp).zancada * (esp.del[1] + esp.del[3]))) % 1;
  }

  /** Rellena P con la postura de un cuadrúpedo según lo que hace y su velocidad. */
  postura(a, esp, t) {
    const del = esp.del[1] + esp.del[3];
    const tras = esp.tras[1] + esp.tras[3];
    P.y = esp.alto;
    P.cabeceo = 0;
    P.atras = false;
    P.patas.fill(0);
    P.cab = esp.cabeza0;
    P.cabY = 0;
    P.colaX = esp.cola0;
    P.colaY = Math.sin(t * 1.3 + a.id) * 0.15;
    if (a.v > 0.06) {
      const g = this.andar(a, esp);
      const f = a.fase * Math.PI * 2;
      for (let k = 0; k < 4; k++) {
        const u = (a.fase + g.desfase[k]) * Math.PI * 2;
        P.patas[k * 2] = -g.amp * Math.sin(u);
        P.patas[k * 2 + 1] = g.dobla * Math.max(0, Math.cos(u)) + (k > 1 ? 0.12 : 0.05);
      }
      if (g === GALOPE || g === SALTO) {
        P.cabeceo = g.cabeceo * Math.sin(f);
        P.y += g.bote * del * (0.5 + 0.5 * Math.sin(f - 0.6));
        P.colaX = esp.cola0 - 0.5;
      } else P.y += g.bote * del * (0.5 + 0.5 * Math.cos(2 * f));
      P.cab += 0.07 * Math.sin(2 * f) - (g === GALOPE ? 0.15 : 0);
      if (a.agachado) {
        P.y *= 0.84;
        P.cab += 0.35;
        P.colaX -= 0.35;
      }
      return;
    }
    switch (a.estado) {
      case 'pastar': {
        P.cab = (esp.pastar ?? 0.7) + 0.04 * Math.sin(t * 4 + a.id);
        P.cabY = 0.12 * Math.sin(t * 0.5 + a.id);
        break;
      }
      case 'olfatear': {
        P.cab = 0.75 + 0.08 * Math.sin(t * 6 + a.id);
        P.cabY = 0.35 * Math.sin(t * 0.8 + a.id);
        break;
      }
      case 'alerta': {
        P.cab = -0.3;
        P.cabY = a.mira ?? 0;
        // El ciervo alza la cola y enseña el blanco.
        P.colaX = esp.cola0 - (a.esp === 'ciervo' ? 1.4 : 0.4);
        break;
      }
      case 'acecho': {
        P.y = esp.alto * 0.8;
        P.cab = 0.3;
        P.colaX = esp.cola0 + 0.2;
        for (let k = 0; k < 4; k++) {
          P.patas[k * 2] = k < 2 ? -0.35 : -0.45;
          P.patas[k * 2 + 1] = k < 2 ? 0.75 : 0.9;
        }
        break;
      }
      case 'echado': {
        P.y = esp.echado;
        P.cab = -0.15 + 0.05 * Math.sin(t * 0.3 + a.id);
        P.cabY = 0.3 * Math.sin(t * 0.2 + a.id);
        // Patas dobladas bajo el cuerpo (las delanteras de lobos y osos, estiradas al frente).
        const fiera = a.esp === 'lobo' || a.esp === 'oso';
        for (let k = 0; k < 4; k++) {
          P.patas[k * 2] = k < 2 ? (fiera ? -1.45 : 0.2) : -1.25;
          P.patas[k * 2 + 1] = k < 2 ? (fiera ? 0.1 : 2.7) : 2.6;
        }
        P.colaX = esp.cola0 + 0.6;
        break;
      }
      case 'sentado':
      case 'aullar': {
        // Sentado sobre las patas de atrás: el cuerpo se inclina hacia arriba.
        const inc = a.esp === 'oso' ? -0.95 : -0.62;
        P.atras = true;
        P.cabeceo = inc;
        P.y = tras * 0.32 - esp.patas[1][1];
        for (let k = 0; k < 4; k++) {
          P.patas[k * 2] = k < 2 ? -inc : -1.5 - inc;
          P.patas[k * 2 + 1] = k < 2 ? 0 : 2.7;
        }
        P.cab = -inc * 0.8;
        if (a.estado === 'aullar') P.cab = -0.85 + 0.06 * Math.sin(t * 2.3 + a.id);
        P.colaX = esp.cola0 + 0.9;
        break;
      }
      case 'erguido': {
        // El oso de pie, con las zarpas por delante.
        P.atras = true;
        P.cabeceo = -1.2;
        P.y = tras - esp.patas[1][1];
        for (let k = 0; k < 4; k++) {
          P.patas[k * 2] = k < 2 ? 0.55 + 0.25 * Math.sin(t * 4 + k * 2) : 1.2;
          P.patas[k * 2 + 1] = k < 2 ? -0.5 : 0;
        }
        P.cab = 0.85 + 0.12 * Math.sin(t * 3);
        P.cabY = 0.25 * Math.sin(t * 1.7);
        break;
      }
      default: {
        P.cab = esp.cabeza0 + 0.05 * Math.sin(t * 0.7 + a.id);
        P.cabY = 0.3 * Math.sin(t * 0.33 + a.id * 1.7);
      }
    }
    if (a.agachado && a.estado !== 'acecho' && a.estado !== 'aullar') {
      P.y *= 0.85;
      P.cab += 0.3;
    }
  }

  // ---------- dibujo ----------

  poner(nombre, m, color) {
    const im = this.im[nombre];
    const j = this.n[nombre]++;
    if (j >= im.instanceMatrix.count) return;
    im.setMatrixAt(j, m);
    if (color) im.setColorAt(j, color);
  }

  /** Coloca las piezas de un cuadrúpedo según su postura (P). */
  cuadrupedo(a, esp, ojos) {
    const tr = this.terreno;
    const s = a.escala;
    let y = tr.alturaEn(a.x, a.z);
    let cuesta = 0;
    if (!P.atras) {
      // En las cuestas el cuerpo sigue la pendiente.
      const largo = (esp.patas[0][2] - esp.patas[1][2]) * s * 0.5;
      const fx = Math.sin(a.ang) * largo;
      const fz = Math.cos(a.ang) * largo;
      const hd = tr.alturaEn(a.x + fx, a.z + fz);
      const ht = tr.alturaEn(a.x - fx, a.z - fz);
      cuesta = -Math.atan2(hd - ht, 2 * largo) * 0.85;
      y = Math.max(y, (hd + ht) / 2);
    }
    E.set(0, a.ang, 0);
    Q.setFromEuler(E);
    RAIZ.compose(V.set(a.x, y, a.z), Q, ESC.set(s, s, s));
    // El cuerpo gira sobre su centro o, al sentarse o erguirse, sobre las caderas de atrás.
    const [, ay, az] = esp.patas[1];
    if (P.atras) {
      articular(CUERPO, RAIZ, 0, P.y + ay, az, P.cabeceo);
      articular(CUERPO, CUERPO, 0, -ay, -az);
    } else articular(CUERPO, RAIZ, 0, P.y, 0, P.cabeceo + cuesta);
    this.poner(esp.cuerpo, CUERPO, a.color);
    const [cx, cy, cz] = esp.cuello;
    articular(CAB, CUERPO, cx, cy, cz, P.cab - cuesta * 0.5, P.cabY);
    this.poner(a.macho ? 'cabezaCiervo' : esp.cabeza, CAB, a.color);
    if (ojos) this.poner('ojos', CAB, this.blanco);
    const [kx, ky, kz] = esp.colaEn;
    articular(COLA, CUERPO, kx, ky, kz, -P.colaX, P.colaY);
    this.poner(esp.cola, COLA, a.color);
    // Las patas compensan la pendiente para seguir verticales.
    const comp = P.atras ? 0 : -cuesta;
    for (let k = 0; k < 4; k++) {
      const [px, py, pz] = k < 2 ? esp.patas[0] : esp.patas[1];
      const [g1, l1, g2, l2] = k < 2 ? esp.del : esp.tras;
      articular(CADERA, CUERPO, k % 2 ? px : -px, py, pz, P.patas[k * 2] + comp);
      PIEZA.copy(CADERA).scale(ESC.set(g1, l1, g1));
      this.poner('muslo', PIEZA, a.pata);
      articular(RODILLA, CADERA, 0, -l1, 0, P.patas[k * 2 + 1]);
      PIEZA.copy(RODILLA).scale(ESC.set(g2, l2, g2));
      this.poner('canilla', PIEZA, a.pata);
    }
  }

  /**
   * Cada cuadro. `gente` son los aldeanos (con su x, z) para que los animales huyan de
   * ellos; `objetivo` es lo que se mira y `distancia`, lo lejos que está la cámara.
   */
  animar(t, dt, fase, noche, gente, objetivo, distancia, camara) {
    if (!this.im.muslo || !this.d) return;
    const v = vista(camara);
    const im = this.im;
    this.n = Object.fromEntries(PIEZAS.map((k) => [k, 0]));
    // Rejilla de amenazas: la gente cerca de la vista y las fieras.
    const rejilla = new Map();
    const meter = (x, z, fiera) => {
      const k = Math.floor(x / 8) * 100003 + Math.floor(z / 8);
      let l = rejilla.get(k);
      if (!l) rejilla.set(k, (l = []));
      l.push([x, z, fiera]);
    };
    const lejos2 = (RADIO_VIDA + 20) ** 2;
    for (const q of gente) if ((q.x - objetivo.x) ** 2 + (q.z - objetivo.z) ** 2 < lejos2) meter(q.x, q.z, false);
    // Fieras de la simulación (siempre, estén donde estén).
    const u = suave(acotar((fase - 0.05) / 0.6, 0, 1));
    for (const a of this.fieras.values()) {
      if (a.f.estado === 'hiberna') continue;
      const esp = ESPECIES[a.esp];
      this.pensarFiera(a, dt, u, t, noche);
      meter(a.x, a.z, true);
      this.avanzar(a, esp, dt);
      this.postura(a, esp, t);
      this.cuadrupedo(a, esp, a.esp === 'lobo' && noche && (a.f.estado === 'acecha' || a.f.estado === 'ataca'));
    }
    this.rejilla = rejilla;
    // Lo de adorno, solo cerca de lo que se mira.
    if (distancia < 220) {
      const vida2 = RADIO_VIDA * RADIO_VIDA;
      for (const r of this.rebanos) {
        if (!r.vivo || (r.x - objetivo.x) ** 2 + (r.z - objetivo.z) ** 2 > vida2 || !enVista(v, r.x, this.terreno.alturaEn(r.x, r.z), r.z, 9)) continue;
        const esp = ESPECIES[r.esp];
        for (const a of r.miembros) {
          this.pensar(a, dt, noche);
          this.avanzar(a, esp, dt);
          this.postura(a, esp, t);
          this.cuadrupedo(a, esp, false);
        }
      }
      const oveja = ESPECIES.oveja;
      for (const a of this.ovejas.values()) {
        if ((a.x - objetivo.x) ** 2 + (a.z - objetivo.z) ** 2 > vida2) continue;
        this.pensar(a, dt, noche);
        // Que no se salgan del corral.
        const dx = a.x - a.hx;
        const dz = a.z - a.hz;
        const dd = Math.hypot(dx, dz);
        if (dd > 0.55) {
          a.x = a.hx + (dx / dd) * 0.55;
          a.z = a.hz + (dz / dd) * 0.55;
        }
        this.avanzar(a, oveja, dt);
        this.postura(a, oveja, t);
        this.cuadrupedo(a, oveja, false);
      }
      this.animarPatos(t, dt, objetivo, vida2);
      this.animarGarzas(t, objetivo, vida2);
      if (distancia < 90) this.animarPeces(t, objetivo);
    }
    this.animarAves(t, objetivo);
    for (const k of PIEZAS) {
      const n = Math.min(this.n[k], im[k].instanceMatrix.count);
      im[k].count = n;
      im[k].visible = n > 0;
      im[k].instanceMatrix.needsUpdate = true;
      if (im[k].instanceColor) im[k].instanceColor.needsUpdate = true;
    }
  }

  animarAves(t, objetivo) {
    const blanco = this.color.set(0xffffff);
    const lejos2 = (RADIO_VIDA * 1.8) ** 2;
    for (const a of this.aves) {
      if ((a.x - objetivo.x) ** 2 + (a.z - objetivo.z) ** 2 > lejos2) continue;
      const th = t * a.w + a.fase;
      const x = a.x + Math.cos(th) * a.r;
      const z = a.z + Math.sin(th) * a.r;
      const y = a.h + Math.sin(t * 0.4 + a.fase) * 0.6;
      // Rumbo: la tangente del círculo; se inclinan hacia dentro al girar.
      const sentido = Math.sign(a.w);
      const rumbo = Math.atan2(-Math.sin(th) * sentido, Math.cos(th) * sentido);
      const aguila = a.tipo === 'aguila';
      // Baten las alas a ratos y a ratos planean (el águila casi siempre planea).
      const bate = aguila ? Math.sin(t * 0.25 + a.fase) > 0.85 : Math.sin(t * 0.5 + a.fase) > -0.1;
      const ala = bate ? 0.6 * Math.sin(t * (aguila ? 5 : 10) + a.fase) : aguila ? 0.12 : 0.08 + 0.04 * Math.sin(t * 2 + a.fase);
      E.set(bate ? -0.08 : 0.05, rumbo, 0.35 * sentido, 'YXZ');
      Q.setFromEuler(E);
      RAIZ.compose(V.set(x, y, z), Q, ESC.set(a.s, a.s, a.s));
      const color = aguila ? this.pardo : blanco;
      this.poner('gaviota', RAIZ, color);
      articular(PIEZA, RAIZ, 0.035, 0.02, 0.02, 0, 0, ala);
      this.poner('ala', PIEZA, color);
      articular(PIEZA, RAIZ, -0.035, 0.02, 0.02, 0, 0, -ala);
      PIEZA.scale(ESC.set(-1, 1, 1));
      this.poner('ala', PIEZA, color);
    }
  }

  animarPatos(t, dt, objetivo, vida2) {
    const blanco = this.color.set(0xffffff);
    for (const g of this.patos) {
      if ((g.x - objetivo.x) ** 2 + (g.z - objetivo.z) ** 2 > vida2) continue;
      for (const p of g.miembros) {
        p.t -= dt;
        // De la gente se apartan nadando deprisa.
        const a = this.amenazaDe(p.x, p.z, [3.5, 0]);
        if (a && p.estado !== 'huir') {
          p.estado = 'huir';
          p.t = 2;
          p.dest = [p.x + (p.x - a[0]) * 2, p.z + (p.z - a[1]) * 2];
        }
        if (p.estado === 'nadar' || p.estado === 'huir') {
          const dx = p.dest[0] - p.x;
          const dz = p.dest[1] - p.z;
          p.ang += acotar(giroHacia(p.ang, Math.atan2(dx, dz)), -2.5 * dt, 2.5 * dt);
          const v = p.estado === 'huir' ? 0.9 : 0.25;
          const nx = p.x + Math.sin(p.ang) * v * dt;
          const nz = p.z + Math.cos(p.ang) * v * dt;
          if (this.enAgua(nx, nz)) {
            p.x = nx;
            p.z = nz;
          } else p.t = 0;
          if (Math.hypot(dx, dz) < 0.15 || p.t <= 0) {
            p.estado = 'flotar';
            p.t = 2 + azar(p.id + p.x) * 5;
          }
        } else if (p.t <= 0) {
          const r = azar(p.id * 1.3 + p.x * 7);
          if (r < 0.3 && p.estado !== 'zambullir') {
            // Mete la cabeza y saca la cola.
            p.estado = 'zambullir';
            p.t = 1.6;
          } else {
            const ang = azar(p.id + p.z * 3) * 6.28;
            p.estado = 'nadar';
            p.dest = [p.hx + Math.cos(ang) * 1.5 * r, p.hz + Math.sin(ang) * 1.5 * r];
            p.t = 8;
          }
        }
        const y = this.nivelAgua(p.x, p.z, t) - 0.03;
        const cabeceo = p.estado === 'zambullir' ? 1.25 * Math.sin(Math.PI * acotar((1.6 - p.t) / 1.6, 0, 1)) : 0.05 * Math.sin(t * 2 + p.id);
        E.set(cabeceo, p.ang, 0.05 * Math.sin(t * 1.7 + p.id), 'YXZ');
        Q.setFromEuler(E);
        RAIZ.compose(V.set(p.x, y, p.z), Q, ESC.set(p.s, p.s, p.s));
        this.poner('pato', RAIZ, blanco);
      }
    }
  }

  animarGarzas(t, objetivo, vida2) {
    const blanco = this.color.set(0xffffff);
    const tr = this.terreno;
    for (const g of this.garzas) {
      if ((g.x - objetivo.x) ** 2 + (g.z - objetivo.z) ** 2 > vida2) continue;
      const y = tr.alturaEn(g.x, g.z);
      E.set(0, g.ang + 0.4 * Math.sin(t * 0.07 + g.fase), 0);
      Q.setFromEuler(E);
      RAIZ.compose(V.set(g.x, y + 0.6, g.z), Q, ESC.set(1.2, 1.2, 1.2));
      this.poner('garza', RAIZ, blanco);
      // Acecha con el cuello recogido; a veces lo estira y de vez en cuando lanza el pico.
      const c = (t + g.fase) % 14;
      const golpe = c > 12.6 && c < 13.2 ? Math.sin(((c - 12.6) / 0.6) * Math.PI) : 0;
      const estira = c > 5 && c < 9 ? suave(Math.min(1, (c - 5) / 0.8)) * suave(Math.min(1, (9 - c) / 0.8)) : 0;
      articular(PIEZA, RAIZ, 0, 0.06, 0.08, 0.25 - 0.45 * estira + 1.1 * golpe, 0.3 * Math.sin(t * 0.3 + g.fase));
      this.poner('cuelloGarza', PIEZA, blanco);
    }
  }

  /** Cerca de la cámara, de vez en cuando un pez salta fuera del agua. */
  animarPeces(t, objetivo) {
    const tr = this.terreno;
    const d = this.d;
    if (t > this.proximoSalto && this.saltos.length < 4) {
      this.proximoSalto = t + 0.6 + Math.random() * 1.8;
      const [cx, cz] = tr.aCasilla(objetivo.x, objetivo.z);
      const tx = cx + Math.floor((Math.random() - 0.5) * 30);
      const ty = cz + Math.floor((Math.random() - 0.5) * 30);
      if (tx >= 0 && ty >= 0 && tx < d.ancho && ty < d.alto) {
        const i = ty * d.ancho + tx;
        const ter = d.terreno[i];
        if ((ter === AGUA && (this.agua.lago[i] || d.relieve[i] > -25)) || ter === RIO) {
          const [x, z] = tr.aMundo(tx + Math.random() - 0.5, ty + Math.random() - 0.5);
          const y = ter === RIO ? tr.alturaEn(x, z, false) + 0.27 : null;
          this.saltos.push({ x, z, y, ang: Math.random() * 6.28, t0: t, alto: 0.35 + Math.random() * 0.35 });
        }
      }
    }
    const blanco = this.color.set(0xffffff);
    this.saltos = this.saltos.filter((s) => t - s.t0 < 1.6);
    for (const s of this.saltos) {
      const e = t - s.t0;
      const nivel = s.y ?? this.nivelAgua(s.x, s.z, t);
      const u = e / 0.8;
      if (u < 1) {
        const y = nivel + 4 * s.alto * u * (1 - u) - 0.05;
        E.set(-Math.atan((4 * s.alto * (1 - 2 * u)) / 0.8), s.ang, Math.sin(e * 20) * 0.2, 'YXZ');
        Q.setFromEuler(E);
        RAIZ.compose(V.set(s.x + Math.sin(s.ang) * 0.8 * (u - 0.5), y, s.z + Math.cos(s.ang) * 0.8 * (u - 0.5)), Q, ESC.set(1.3, 1.3, 1.3));
        this.poner('pez', RAIZ, blanco);
      }
      // Ondas en el agua donde sale y donde cae.
      for (const [w, inicio] of [
        [-0.5, 0],
        [0.5, 0.8],
      ]) {
        const k = (e - inicio) / 0.8;
        if (k < 0 || k > 1) continue;
        const r = 0.3 + k * 1.1;
        RAIZ.compose(V.set(s.x + Math.sin(s.ang) * 0.8 * w, nivel + 0.03, s.z + Math.cos(s.ang) * 0.8 * w), Q.identity(), ESC.set(r, 1, r));
        this.poner('ola', RAIZ, blanco);
      }
    }
  }
}
