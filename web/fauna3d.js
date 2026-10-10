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
  perro: [0x8a6a48, 0x3a3430, 0xc8a070, 0xe0d8c8, 0x6a5a48, 0xa07850],
  vaca: [0x7a5236, 0x2a2420, 0x9a7050, 0xd8cfc0, 0x6a3a26],
  cerdo: [0xe2a594, 0xd8968a, 0xeab4a4, 0x6a5a50],
  gallina: [0xffffff, 0xc8884a, 0x9a5a30, 0x2a2622, 0xe8d8b8, 0xffffff],
};
/** Los animales grandes caben de dos en dos en un corral. */
const GRANDES = new Set(['vaca', 'caballo']);

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
  'gallina',
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
    this.perros = new Map();
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
    // Cada grupo tiene sus crías: nacen en primavera y van creciendo hasta el invierno.
    if (this.estacionCrias !== `${clave}-${d.estacion}`) {
      this.estacionCrias = `${clave}-${d.estacion}`;
      for (const r of this.rebanos) this.criasDe(r, d.estacion);
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
      // Los lobeznos de la camada de primavera, detrás de la loba que guía la manada.
      const camada = esp === 'lobo' && f.n >= 3 && (d.estacion === 'primavera' || d.estacion === 'verano') ? Math.min(3, Math.floor(f.n / 2)) : 0;
      for (let k = 0; k < camada; k++) {
        const id = `${f.id}-c${k}`;
        vivos.add(id);
        let a = this.fieras.get(id);
        if (!a) {
          a = this.nuevo('lobo', x0 + 0.4 * k, z0 + 0.3, f.id * 17 + k + 50);
          this.fieras.set(id, a);
        }
        a.escala = d.estacion === 'primavera' ? 0.45 : 0.62;
        Object.assign(a, { f, k: 100 + k, n, x0, z0, x1, z1, ox: 0, oz: 0, cachorro: true, madre: this.fieras.get(`${f.id}-0`) });
      }
    }
    for (const id of this.fieras.keys()) if (!vivos.has(id)) this.fieras.delete(id);
    // El ganado en sus corrales (cada corral, su especie) y las gallinas en su corralito.
    const enCorral = new Set();
    const gallinas = [];
    for (const c of corrales) {
      const esp = c.especie ?? 'oveja';
      if (esp === 'gallina') {
        const n = Math.min(9, Math.ceil(c.animales / 3));
        // El corralito queda delante de la casita.
        const yx = c.pos[0] + Math.sin(c.ry ?? 0) * 0.5;
        const yz = c.pos[2] + Math.cos(c.ry ?? 0) * 0.5;
        for (let k = 0; k < n; k++) {
          const g = this.gallinas?.find((x) => x.clave === `${c.pos[0]},${c.pos[2]}-${k}`);
          gallinas.push(
            g ?? {
              clave: `${c.pos[0]},${c.pos[2]}-${k}`,
              x: yx + (azar(k * 3.3 + c.pos[0]) - 0.5) * 0.8,
              z: yz + (azar(k * 5.1 + c.pos[2]) - 0.5) * 0.6,
              hx: yx,
              hz: yz,
              ang: azar(k * 7.7) * 6.28,
              t: 0,
              pica: 0,
              color: new THREE.Color(COLORES.gallina[Math.floor(azar(k * 9.1 + c.pos[0]) * COLORES.gallina.length)]),
              aldea: c.aldea,
              n: c.animales,
            },
          );
        }
        continue;
      }
      const grande = GRANDES.has(esp);
      const n = Math.min(grande ? 2 : 5, Math.ceil(c.animales / (grande ? 6 : 3)));
      for (let k = 0; k < n; k++) {
        const id = `${Math.round(c.pos[0] * 10)},${Math.round(c.pos[2] * 10)}-${esp}-${k}`;
        enCorral.add(id);
        let o = this.ovejas.get(id);
        if (!o) {
          o = this.nuevo(esp, c.pos[0] + (azar(k * 3.1 + c.pos[0]) - 0.5) * 0.6, c.pos[2] + (azar(k * 4.7 + c.pos[2]) - 0.5) * 0.6, c.pos[0] * 7 + k);
          o.hx = c.pos[0];
          o.hz = c.pos[2];
          o.escala = (grande ? 0.58 : 0.72) + azar(k + c.pos[2]) * 0.1;
          o.domestico = true;
          this.ovejas.set(id, o);
        }
        Object.assign(o, { aldea: c.aldea, n: c.animales });
      }
    }
    this.gallinas = gallinas;
    for (const id of this.ovejas.keys()) if (!enCorral.has(id)) this.ovejas.delete(id);
    // Perros: cada aldea los suyos, cada uno con su dueño (cazadores y pastores primero).
    const conPerro = new Set();
    for (const a of aldeas) {
      if (a.poblacion < 6) continue;
      const gente = d.personas.filter((p) => p.aldea === a.id && p.edad >= 10);
      if (!gente.length) continue;
      const preferidos = gente.filter((p) => p.act === 'pastorear' || p.act === 'cazar');
      const [hx, hz] = tr.aMundo(a.x, a.y);
      const n = Math.min(3, 1 + Math.floor(a.poblacion / 30));
      for (let k = 0; k < n; k++) {
        const id = `${a.id}-${k}`;
        conPerro.add(id);
        let perro = this.perros.get(id);
        if (!perro) {
          perro = this.nuevo('perro', hx + k * 0.6, hz + 0.6, a.id * 31 + k);
          perro.escala = 0.72 + azar(a.id + k * 3) * 0.12;
          this.perros.set(id, perro);
        }
        Object.assign(perro, { hx, hz, k });
        if (!gente.some((p) => p.id === perro.dueno)) {
          const lista = preferidos.length > k ? preferidos : gente;
          perro.dueno = lista[Math.floor(azar(a.id * 7 + k * 13 + gente.length) * lista.length)].id;
        }
      }
    }
    for (const id of this.perros.keys()) if (!conPerro.has(id)) this.perros.delete(id);
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
        // Solo donde la especie puede andar (no en riscos nevados ni en el agua).
        if (!this.pisable(esp, x, z)) continue;
        const [a, b] = TAMANO[esp];
        const n = a + Math.floor(azar(s + 4) * (b - a + 1));
        const miembros = [];
        for (let k = 0; k < n; k++) {
          // Cada uno en su sitio, sin caer encima de otro.
          let ax = null;
          let az = null;
          for (let intento = 0; intento < 8 && ax === null; intento++) {
            const ang = azar(s + 10 + k + intento * 17) * Math.PI * 2;
            const rr = 0.6 + azar(s + 20 + k + intento * 13) * 1.6;
            const px = x + Math.cos(ang) * rr;
            const pz = z + Math.sin(ang) * rr;
            if (this.pisable(esp, px, pz) && miembros.every((o) => (o.x - px) ** 2 + (o.z - pz) ** 2 > 0.5)) {
              ax = px;
              az = pz;
            }
          }
          if (ax === null) continue;
          const m = this.nuevo(esp, ax, az, s * 31 + k);
          m.hx = x;
          m.hz = z;
          // Los machos de ciervo llevan cuernas (el que guía la manada, y alguno más).
          if (esp === 'ciervo' && (k === 0 || azar(s + 40 + k) < 0.3)) m.macho = true;
          miembros.push(m);
        }
        if (miembros.length) out.push({ esp, i, x, z, miembros, crias: [], vivo: true });
      }
    }
    return out;
  }

  /** Las crías de un rebaño en esta estación (pequeñas en primavera, casi adultas en otoño). */
  criasDe(r, estacion) {
    const tam = { primavera: 0.5, verano: 0.64, 'otoño': 0.76, invierno: 0.86 }[estacion] ?? 0;
    r.crias = [];
    if (!tam || r.esp === 'liebre') return;
    const madres = r.miembros.filter((m) => !m.macho);
    const n = Math.min(madres.length, Math.max(1, Math.round(r.miembros.length * 0.4)));
    for (let k = 0; k < n; k++) {
      const madre = madres[k];
      const c = this.nuevo(r.esp, madre.x + 0.3, madre.z + 0.3, madre.id * 7 + k + 1);
      c.escala = madre.escala * tam;
      c.madre = madre;
      r.crias.push(c);
    }
  }

  /** Una cría va pegada a su madre: si pasta, pasta; si huye, huye con ella. */
  pensarCria(a, dt) {
    const m = a.madre;
    const lado = a.id % 2 ? 1 : -1;
    const tx = m.x - Math.sin(m.ang) * 0.35 * m.escala + Math.cos(m.ang) * 0.4 * lado * m.escala;
    const tz = m.z - Math.cos(m.ang) * 0.35 * m.escala - Math.sin(m.ang) * 0.4 * lado * m.escala;
    const dx = tx - a.x;
    const dz = tz - a.z;
    const d = Math.hypot(dx, dz);
    if (d > 6) {
      a.x = tx;
      a.z = tz;
    }
    if (d > 0.18) {
      this.mover(a, dt, dx, dz, Math.min(ESPECIES[a.esp].vel[2], d * 2.6 + 0.2), 6);
      a.estado = 'andar';
    } else {
      this.mover(a, dt, 0, 0, 0);
      a.ang += acotar(giroHacia(a.ang, m.ang), -2 * dt, 2 * dt);
      a.estado = m.estado === 'echado' || m.estado === 'pastar' || m.estado === 'alerta' ? m.estado : 'pie';
      a.mira = m.mira;
    }
  }

  /** Que los de un mismo grupo no se metan unos dentro de otros. */
  separar(lista, esp) {
    const base = ESPECIES[esp].alto * 0.8;
    for (let i = 0; i < lista.length; i++) {
      const a = lista[i];
      for (let j = i + 1; j < lista.length; j++) {
        const b = lista[j];
        let dx = b.x - a.x;
        let dz = b.z - a.z;
        let d = Math.hypot(dx, dz);
        // Las crías van pegadas a la madre.
        const min = base * (a.escala + b.escala) * (a.madre || b.madre ? 0.5 : 1);
        if (d >= min) continue;
        if (d < 1e-4) {
          dx = Math.sin(b.id * 7.1);
          dz = Math.cos(b.id * 7.1);
          d = 1;
        }
        const empuje = (min - Math.min(d, min)) / 2;
        const ux = (dx / Math.max(d, 1e-4)) * empuje;
        const uz = (dz / Math.max(d, 1e-4)) * empuje;
        if (this.pisable(esp, a.x - ux, a.z - uz) || !this.pisable(esp, a.x, a.z)) {
          a.x -= ux;
          a.z -= uz;
        }
        if (this.pisable(esp, b.x + ux, b.z + uz) || !this.pisable(esp, b.x, b.z)) {
          b.x += ux;
          b.z += uz;
        }
      }
    }
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
    contar('lobo', 12);
    contar('caballo', 24);
    for (const r of this.rebanos) contar(r.esp, r.miembros.length + 3);
    for (const a of this.ovejas.values()) contar(a.esp, 1);
    cuenta.gallina = this.gallinas?.length ?? 0;
    contar('perro', this.perros.size);
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
      // Si ya está donde no debería (o el sitio nuevo es bueno), se mueve.
      if (this.pisable(a.esp, nx, nz) || !this.pisable(a.esp, a.x, a.z)) {
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
    const amenaza = a.domestico ? null : this.amenazaDe(a.x, a.z, MIEDO[a.esp]);
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
          const rr = (a.domestico ? 0.45 : RADIO[a.esp]) * Math.sqrt(azar(a.id * 2 + a.x));
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

  /** El animal de rebaño más cercano a un punto (para la caza de los lobos). */
  presaRebano(x, z) {
    let mejor = null;
    let dmin = 9 * 9;
    for (const r of this.rebanos) {
      if (!r.vivo || r.esp === 'liebre' || (r.x - x) ** 2 + (r.z - z) ** 2 > 18 * 18) continue;
      for (const m of r.crias.length ? r.crias.concat(r.miembros) : r.miembros) {
        const d2 = (m.x - x) ** 2 + (m.z - z) ** 2;
        if (d2 < dmin) {
          dmin = d2;
          mejor = [m.x, m.z];
        }
      }
    }
    return mejor;
  }

  /** La persona u oveja más cercana a un punto (para el ataque de los lobos). */
  presaCerca(x, z) {
    let mejor = null;
    let dmin = 9 * 9;
    const cx = Math.floor(x / 8);
    const cz = Math.floor(z / 8);
    for (let i = cx - 1; i <= cx + 1; i++) {
      for (let j = cz - 1; j <= cz + 1; j++) {
        for (const [ax, az, fiera] of this.rejilla?.get(i * 100003 + j) ?? []) {
          const d2 = (ax - x) ** 2 + (az - z) ** 2;
          if (!fiera && d2 < dmin) {
            dmin = d2;
            mejor = [ax, az];
          }
        }
      }
    }
    for (const o of this.ovejas.values()) {
      const d2 = (o.x - x) ** 2 + (o.z - z) ** 2;
      if (d2 < dmin) {
        dmin = d2;
        mejor = [o.x, o.z];
      }
    }
    return mejor;
  }

  /** Lobos y osos: siguen a su manada (lo que manda la simulación) y, parados, hacen lo suyo. */
  pensarFiera(a, dt, u, t, noche) {
    const f = a.f;
    const giro = Math.sin(t * 0.13 + a.id) * 0.4;
    const ox = a.ox * Math.cos(giro) - a.oz * Math.sin(giro);
    const oz = a.ox * Math.sin(giro) + a.oz * Math.cos(giro);
    let tx = entre(a.x0, a.x1, u) + ox;
    let tz = entre(a.z0, a.z1, u) + oz;
    // El día que atacan, primero se lanzan a por quien (o lo que) tienen más cerca; luego huyen.
    let presa = f.estado === 'ataca' || (f.estado === 'huye' && u < 0.35) ? this.presaCerca(f.estado === 'huye' ? a.x0 : tx, f.estado === 'huye' ? a.z0 : tz) : null;
    // Con hambre, de día, la manada sale tras el ciervo o el caballo que tenga más a mano.
    if (!presa && a.esp === 'lobo' && f.estado === 'ronda' && (f.hambre ?? 0) > 0.45 && !noche) presa = this.presaRebano(entre(a.x0, a.x1, u), entre(a.z0, a.z1, u));
    if (presa) {
      tx = presa[0] + a.ox * 0.35;
      tz = presa[1] + a.oz * 0.35;
    }
    const dx = tx - a.x;
    const dz = tz - a.z;
    const d = Math.hypot(dx, dz);
    const vel = ESPECIES[a.esp].vel;
    const max = presa || f.estado === 'ataca' || f.estado === 'huye' ? vel[2] : f.estado === 'acecha' ? vel[0] * 0.6 : vel[1];
    a.agachado = f.estado === 'acecha' && !presa;
    if (d > 0.35) {
      // Si el sitio les queda de lado o detrás, frenan para girar (y no dan vueltas alrededor).
      const falta = Math.abs(giroHacia(a.ang, Math.atan2(dx, dz)));
      this.moverLibre(a, dt, dx, dz, Math.min(max, d * 1.6) * (falta > 1.3 ? 0.2 : 1 - falta * 0.55));
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

  /** Un perro va a un paso de su dueño, a su lado; parado, olfatea, se sienta o se tumba. */
  pensarPerro(a, dt, q, noche) {
    let tx = a.hx;
    let tz = a.hz;
    if (q) {
      const lado = a.k % 2 ? 1 : -1;
      tx = q.x - Math.sin(q.ang) * 0.7 + Math.cos(q.ang) * 0.45 * lado;
      tz = q.z - Math.cos(q.ang) * 0.7 - Math.sin(q.ang) * 0.45 * lado;
    }
    const dx = tx - a.x;
    const dz = tz - a.z;
    const d = Math.hypot(dx, dz);
    // Si se ha quedado muy atrás (el dueño cambió de sitio de golpe), aparece a su lado.
    if (d > 25) {
      a.x = tx;
      a.z = tz;
    }
    if (d > 0.4) {
      this.moverLibre(a, dt, dx, dz, Math.min(ESPECIES.perro.vel[2], d * 2.2));
      a.quieto = 0;
      a.estado = 'pie';
    } else {
      this.moverLibre(a, dt, 0, 0, 0);
      a.quieto = (a.quieto ?? 0) + dt;
      if (q) a.ang += acotar(giroHacia(a.ang, q.ang), -2 * dt, 2 * dt);
      a.estado = noche || a.quieto > 14 ? 'echado' : a.quieto > 4 ? 'sentado' : a.quieto % 6 < 1.6 ? 'olfatear' : 'pie';
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
    // El perro menea la cola; el resto la mueve un poco.
    P.colaY = esp.menea ? Math.sin(t * 11 + a.id) * 0.5 : Math.sin(t * 1.3 + a.id) * 0.15;
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
    const manadas = new Map();
    for (const a of this.fieras.values()) {
      if (a.f.estado === 'hiberna') continue;
      if (a.cachorro && a.madre) this.pensarCria(a, dt);
      else this.pensarFiera(a, dt, u, t, noche);
      let l = manadas.get(a.f.id);
      if (!l) manadas.set(a.f.id, (l = []));
      l.push(a);
    }
    for (const l of manadas.values()) if (l.length > 1) this.separar(l, l[0].esp);
    for (const a of this.fieras.values()) {
      if (a.f.estado === 'hiberna') continue;
      const esp = ESPECIES[a.esp];
      meter(a.x, a.z, true);
      this.avanzar(a, esp, dt);
      this.postura(a, esp, t);
      this.cuadrupedo(a, esp, a.esp === 'lobo' && noche && (a.f.estado === 'acecha' || a.f.estado === 'ataca'));
    }
    // Los caballos de los jinetes, bajo cada uno, al paso que lleve.
    this.monturas ??= new Map();
    const caballo = ESPECIES.caballo;
    for (const q of gente) {
      if (!q.montando) continue;
      let c = this.monturas.get(q.p.id);
      if (!c) {
        c = this.nuevo('caballo', q.x, q.z, q.p.id * 3.7 + 11);
        c.escala = 1;
        this.monturas.set(q.p.id, c);
      }
      c.visto = t;
      if ((q.x - objetivo.x) ** 2 + (q.z - objetivo.z) ** 2 > RADIO_VIDA * RADIO_VIDA) continue;
      c.x = q.x;
      c.z = q.z;
      c.ang = q.ang;
      c.v = q.vel ?? 0;
      c.estado = 'pie';
      c.jinete = q.p;
      this.avanzar(c, caballo, dt);
      this.postura(c, caballo, t);
      this.cuadrupedo(c, caballo, false);
    }
    for (const [id, c] of this.monturas) if (t - c.visto > 5) this.monturas.delete(id);
    // Perros, con su dueño (y los ciervos también se asustan de ellos).
    if (this.perros.size) {
      const porId = new Map();
      for (const q of gente) porId.set(q.p.id, q);
      const perro = ESPECIES.perro;
      for (const a of this.perros.values()) {
        this.pensarPerro(a, dt, porId.get(a.dueno), noche);
        meter(a.x, a.z, true);
        if ((a.x - objetivo.x) ** 2 + (a.z - objetivo.z) ** 2 > RADIO_VIDA * RADIO_VIDA) continue;
        this.avanzar(a, perro, dt);
        this.postura(a, perro, t);
        this.cuadrupedo(a, perro, false);
      }
    }
    this.rejilla = rejilla;
    // Lo de adorno, solo cerca de lo que se mira.
    if (distancia < 220) {
      const vida2 = RADIO_VIDA * RADIO_VIDA;
      for (const r of this.rebanos) {
        if (!r.vivo || (r.x - objetivo.x) ** 2 + (r.z - objetivo.z) ** 2 > vida2 || !enVista(v, r.x, this.terreno.alturaEn(r.x, r.z), r.z, 9)) continue;
        const esp = ESPECIES[r.esp];
        for (const a of r.miembros) this.pensar(a, dt, noche);
        for (const a of r.crias) this.pensarCria(a, dt);
        const todos = r.crias.length ? r.miembros.concat(r.crias) : r.miembros;
        this.separar(todos, r.esp);
        for (const a of todos) {
          this.avanzar(a, esp, dt);
          this.postura(a, esp, t);
          this.cuadrupedo(a, esp, false);
        }
      }
      const porCorral = new Map();
      for (const a of this.ovejas.values()) {
        if ((a.x - objetivo.x) ** 2 + (a.z - objetivo.z) ** 2 > vida2) continue;
        this.pensar(a, dt, noche);
        const k = `${a.hx},${a.hz}`;
        if (!porCorral.has(k)) porCorral.set(k, []);
        porCorral.get(k).push(a);
      }
      for (const lista of porCorral.values()) {
        if (lista.length > 1) this.separar(lista, lista[0].esp);
        for (const a of lista) {
          // Que no se salgan del corral.
          const dx = a.x - a.hx;
          const dz = a.z - a.hz;
          const dd = Math.hypot(dx, dz);
          if (dd > 0.55) {
            a.x = a.hx + (dx / dd) * 0.55;
            a.z = a.hz + (dz / dd) * 0.55;
          }
          const esp = ESPECIES[a.esp];
          this.avanzar(a, esp, dt);
          this.postura(a, esp, t);
          this.cuadrupedo(a, esp, false);
        }
      }
      this.animarGallinas(t, dt, objetivo, vida2);
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

  /** Las gallinas: van a saltitos por su corralito y picotean el suelo. */
  animarGallinas(t, dt, objetivo, vida2) {
    const tr = this.terreno;
    for (const g of this.gallinas ?? []) {
      if ((g.x - objetivo.x) ** 2 + (g.z - objetivo.z) ** 2 > vida2) continue;
      g.t -= dt;
      if (g.t <= 0) {
        // Otro sitio cerca del gallinero, o a picotear un rato.
        const r = azar(g.x * 3.7 + g.z + t);
        if (r < 0.5) {
          g.dest = [g.hx + (azar(g.z * 5.3 + t) - 0.5) * 0.9, g.hz + (azar(g.x * 2.9 + t) - 0.5) * 0.7];
          g.pica = 0;
        } else {
          g.dest = null;
          g.pica = 1;
        }
        g.t = 1 + r * 3;
      }
      let salto = 0;
      if (g.dest) {
        const dx = g.dest[0] - g.x;
        const dz = g.dest[1] - g.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.04) {
          g.ang += acotar(giroHacia(g.ang, Math.atan2(dx, dz)), -6 * dt, 6 * dt);
          g.x += Math.sin(g.ang) * Math.min(d, 0.5 * dt);
          g.z += Math.cos(g.ang) * Math.min(d, 0.5 * dt);
          salto = Math.abs(Math.sin(t * 14 + g.hx)) * 0.02;
        } else g.dest = null;
      }
      const picotazo = g.pica ? Math.max(0, Math.sin(t * 9 + g.x * 5)) * 0.7 : 0;
      E.set(picotazo, g.ang, 0, 'YXZ');
      Q.setFromEuler(E);
      PIEZA.compose(V.set(g.x, tr.alturaEn(g.x, g.z) + salto, g.z), Q, ESC.set(1, 1, 1));
      this.poner('gallina', PIEZA, g.color);
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
