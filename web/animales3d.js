// Modelos de los animales y sus medidas. Los cuadrúpedos van por piezas que se
// mueven por separado: cuerpo, cabeza con el cuello (gira en la base del cuello para
// pastar, olfatear, aullar o mirar), cola, y cuatro patas de dos tramos (muslo y caña
// con pezuña o zarpa) compartidas por todas las especies y estiradas a la medida de
// cada una. Las aves llevan las alas aparte para batirlas; los peces saltan solos.
//
// Todos miran hacia +z. Los cuerpos son «tubos» con un perfil anatómico (pecho hondo,
// cintura recogida, grupa...) y el vientre de otro color.

import * as THREE from 'three';
import { B, C, CA, Co, Es, fundir, orientar, triangulos } from './util3d.js?v=__MOTOR__';

/**
 * Un tubo a lo largo de z: anillos [z, y, medio ancho, medio alto] cerrados por los
 * dos extremos con una punta redondeada.
 */
function tubo(anillos, lados = 7, tapa = 0.5) {
  const R = anillos.map(([z, y, w, h]) =>
    Array.from({ length: lados }, (_, k) => {
      const a = (k / lados) * Math.PI * 2 + Math.PI / 2;
      return [Math.cos(a) * w, y + Math.sin(a) * h, z];
    }),
  );
  const tris = [];
  for (let s = 0; s < R.length - 1; s++) {
    const yc = (anillos[s][1] + anillos[s + 1][1]) / 2;
    for (let k = 0; k < lados; k++) {
      const a = R[s][k];
      const b = R[s][(k + 1) % lados];
      const c = R[s + 1][(k + 1) % lados];
      const d = R[s + 1][k];
      const fuera = new THREE.Vector3((a[0] + b[0] + c[0] + d[0]) / 4, (a[1] + b[1] + c[1] + d[1]) / 4 - yc, 0);
      tris.push(orientar([a, b, c], fuera), orientar([a, c, d], fuera));
    }
  }
  const p = anillos[0];
  const u = anillos[anillos.length - 1];
  const dir = Math.sign(u[0] - p[0]) || 1;
  const ini = [0, p[1], p[0] - dir * Math.min(p[2], p[3]) * tapa];
  const fin = [0, u[1], u[0] + dir * Math.min(u[2], u[3]) * tapa];
  const ultimo = R[R.length - 1];
  for (let k = 0; k < lados; k++) {
    tris.push(orientar([ini, R[0][k], R[0][(k + 1) % lados]], new THREE.Vector3(0, 0, -dir)));
    tris.push(orientar([fin, ultimo[k], ultimo[(k + 1) % lados]], new THREE.Vector3(0, 0, dir)));
  }
  return triangulos(tris);
}

const NEGRO = 0x15110e;
const ojos = (x, y, z, r = 0.014) => [
  { geo: B(r * 1.4, r, r * 0.7), color: NEGRO, x: -x, y, z },
  { geo: B(r * 1.4, r, r * 0.7), color: NEGRO, x, y, z },
];
const orejas = (x, y, z, r, h, color, abre = 0.25, atras = 0) => [
  { geo: Co(r, h, 4), color, x: -x, y, z, rz: abre, rx: -atras, sz: 0.55 },
  { geo: Co(r, h, 4), color, x, y, z, rz: -abre, rx: -atras, sz: 0.55 },
];

/**
 * Medidas de cada especie. `color`: el del pelaje del modelo (cada animal lleva un
 * tono relativo a él); `patas`: anclaje [x, y, z] de las delanteras y traseras en el
 * cuerpo; `del`/`tras`: [grueso, largo] del muslo y de la caña; `cuello` y `colaEn`:
 * dónde se articulan; velocidades al paso, al trote y al galope (unidades/s).
 */
export const ESPECIES = {
  lobo: {
    color: 0x8b8d92,
    cuerpo: 'cuerpoLobo',
    cabeza: 'cabezaLobo',
    cola: 'colaLobo',
    alto: 0.5,
    patas: [
      [0.072, -0.08, 0.24],
      [0.072, -0.06, -0.3],
    ],
    del: [0.08, 0.2, 0.055, 0.22],
    tras: [0.1, 0.22, 0.055, 0.22],
    cuello: [0, 0.07, 0.3],
    colaEn: [0, 0.06, -0.42],
    cabeza0: 0.05,
    cola0: 0.55,
    pata: 0x6e7074,
    vel: [0.9, 2.0, 6.0],
    echado: 0.17,
  },
  oso: {
    color: 0x5a3b24,
    cuerpo: 'cuerpoOso',
    cabeza: 'cabezaOso',
    cola: 'colaOso',
    alto: 0.72,
    patas: [
      [0.15, -0.14, 0.3],
      [0.15, -0.12, -0.34],
    ],
    del: [0.2, 0.28, 0.16, 0.3],
    tras: [0.22, 0.3, 0.16, 0.3],
    cuello: [0, 0.08, 0.42],
    colaEn: [0, 0.04, -0.56],
    cabeza0: 0.25,
    cola0: 0.3,
    pata: 0x4a301c,
    vel: [0.7, 1.6, 4.5],
    echado: 0.3,
  },
  ciervo: {
    color: 0x8a5a33,
    cuerpo: 'cuerpoCiervo',
    cabeza: 'cabezaCierva',
    cola: 'colaCiervo',
    alto: 0.8,
    patas: [
      [0.066, -0.1, 0.27],
      [0.066, -0.08, -0.33],
    ],
    del: [0.1, 0.32, 0.05, 0.38],
    tras: [0.13, 0.32, 0.05, 0.4],
    cuello: [0, 0.08, 0.34],
    colaEn: [0, 0.06, -0.44],
    cabeza0: 0,
    cola0: 0.9,
    pata: 0x6e4826,
    vel: [0.7, 1.8, 6.5],
    echado: 0.2,
    pastar: 1.25,
  },
  jabali: {
    color: 0x4a3b30,
    cuerpo: 'cuerpoJabali',
    cabeza: 'cabezaJabali',
    cola: 'colaJabali',
    alto: 0.49,
    patas: [
      [0.08, -0.12, 0.22],
      [0.08, -0.1, -0.24],
    ],
    del: [0.1, 0.17, 0.06, 0.2],
    tras: [0.12, 0.17, 0.06, 0.22],
    cuello: [0, 0.03, 0.34],
    colaEn: [0, 0.03, -0.36],
    cabeza0: 0.1,
    cola0: 0.2,
    pata: 0x2e241c,
    vel: [0.6, 1.5, 4.5],
    echado: 0.2,
    pastar: 0.55,
  },
  liebre: {
    color: 0x9a7a55,
    cuerpo: 'cuerpoLiebre',
    cabeza: 'cabezaLiebre',
    cola: 'colaLiebre',
    alto: 0.17,
    patas: [
      [0.035, -0.06, 0.08],
      [0.045, -0.04, -0.09],
    ],
    del: [0.04, 0.05, 0.025, 0.06],
    tras: [0.06, 0.07, 0.03, 0.07],
    cuello: [0, 0.05, 0.11],
    colaEn: [0, 0.04, -0.14],
    cabeza0: -0.1,
    cola0: -0.3,
    pata: 0x8a6a48,
    vel: [0.35, 1.5, 7],
    echado: 0.07,
    pastar: 0.6,
    salta: true,
  },
  caballo: {
    color: 0xc49a5c,
    cuerpo: 'cuerpoCaballo',
    cabeza: 'cabezaCaballo',
    cola: 'colaCaballo',
    alto: 0.94,
    patas: [
      [0.1, -0.12, 0.32],
      [0.1, -0.1, -0.4],
    ],
    del: [0.14, 0.4, 0.065, 0.42],
    tras: [0.17, 0.4, 0.065, 0.44],
    cuello: [0, 0.14, 0.44],
    colaEn: [0, 0.1, -0.56],
    cabeza0: 0,
    cola0: 0.25,
    pata: 0x3a2a1c,
    vel: [0.9, 2.4, 7.5],
    echado: 0.26,
    pastar: 1.15,
  },
  cabra: {
    color: 0x8a7a62,
    cuerpo: 'cuerpoCabra',
    cabeza: 'cabezaCabra',
    cola: 'colaCabra',
    alto: 0.62,
    patas: [
      [0.066, -0.1, 0.22],
      [0.066, -0.08, -0.26],
    ],
    del: [0.1, 0.24, 0.05, 0.28],
    tras: [0.12, 0.25, 0.05, 0.29],
    cuello: [0, 0.1, 0.3],
    colaEn: [0, 0.08, -0.34],
    cabeza0: 0,
    cola0: 0.6,
    pata: 0x6a5a48,
    vel: [0.6, 1.6, 5],
    echado: 0.17,
    pastar: 1.0,
    trepa: true,
  },
  oveja: {
    color: 0xf2efe4,
    cuerpo: 'cuerpoOveja',
    cabeza: 'cabezaOveja',
    cola: 'colaOveja',
    alto: 0.46,
    patas: [
      [0.1, -0.14, 0.18],
      [0.1, -0.14, -0.2],
    ],
    del: [0.07, 0.15, 0.045, 0.17],
    tras: [0.08, 0.15, 0.045, 0.17],
    cuello: [0, 0.06, 0.28],
    colaEn: [0, 0.05, -0.3],
    cabeza0: 0.2,
    cola0: 0.8,
    pata: 0x3a3330,
    vel: [0.35, 1.0, 2.5],
    echado: 0.2,
    pastar: 0.8,
  },
};

/** El perro: un lobo domesticado, algo más pequeño, con la cola enroscada hacia arriba que menea. */
ESPECIES.perro = { ...ESPECIES.lobo, cabeza0: -0.05, cola0: -0.7, vel: [1.1, 2.6, 6.5], menea: true };

/** Todas las geometrías de los animales. */
export function modelosAnimales() {
  const m = {};
  // ---------- patas (compartidas): de y = 0 a y = -1, se estiran a la medida ----------
  m.muslo = fundir([{ geo: tubo([[0, 0, 0.38, 0.5], [1, 0, 0.32, 0.36]], 5, 0.6), color: 0xffffff, rx: Math.PI / 2 }]);
  m.canilla = fundir([
    { geo: tubo([[0, 0, 0.36, 0.38], [0.86, 0, 0.27, 0.28]], 5, 0.1), color: 0xffffff, rx: Math.PI / 2 },
    { geo: tubo([[0.84, 0, 0.32, 0.34], [1, 0.08, 0.36, 0.4]], 5, 0.1), color: 0x3a3430, rx: Math.PI / 2 },
  ]);

  // ---------- lobo ----------
  const gris = 0x8b8d92;
  const claro = 0xd8d2c4;
  m.cuerpoLobo = fundir([
    {
      geo: tubo([
        [-0.43, 0.04, 0.05, 0.06],
        [-0.36, 0.02, 0.11, 0.13],
        [-0.17, 0.02, 0.1, 0.11],
        [0.04, 0.0, 0.12, 0.16],
        [0.22, -0.01, 0.13, 0.18],
        [0.34, 0.03, 0.1, 0.13],
      ]),
      color: gris,
      bajo: claro,
    },
    { geo: Es(0.13, 6, 4), color: 0xa4a6aa, y: 0.01, z: 0.28, sx: 1.05, sy: 1.25, sz: 0.9 },
  ]);
  m.cabezaLobo = fundir([
    { geo: tubo([[0, 0, 0.08, 0.095], [0.1, 0, 0.072, 0.082], [0.18, 0, 0.066, 0.072]], 6), color: gris, bajo: claro, rx: -0.75 },
    {
      geo: tubo([
        [0.06, 0.15, 0.075, 0.08],
        [0.13, 0.165, 0.088, 0.085],
        [0.2, 0.15, 0.066, 0.064],
        [0.28, 0.125, 0.04, 0.044],
        [0.34, 0.115, 0.028, 0.03],
      ]),
      color: gris,
      bajo: claro,
    },
    { geo: Es(0.022, 5, 4), color: NEGRO, y: 0.12, z: 0.36 },
    ...orejas(0.05, 0.25, 0.1, 0.035, 0.09, 0x5e6064, 0.25, 0.15),
    ...ojos(0.05, 0.18, 0.225),
  ]);
  m.colaLobo = fundir([
    {
      geo: tubo([[0.02, 0, 0.035, 0.035], [-0.09, -0.02, 0.055, 0.058], [-0.2, -0.05, 0.055, 0.055], [-0.3, -0.08, 0.03, 0.03]], 6),
      color: gris,
      bajo: 0xb8b4aa,
    },
    { geo: Es(0.03, 5, 4), color: 0x2a2a2a, y: -0.085, z: -0.32 },
  ]);
  m.ojos = fundir([
    { geo: Es(0.02, 5, 4), color: 0xffffff, x: -0.05, y: 0.18, z: 0.23 },
    { geo: Es(0.02, 5, 4), color: 0xffffff, x: 0.05, y: 0.18, z: 0.23 },
  ]);

  // ---------- oso ----------
  const pardo = 0x5a3b24;
  m.cuerpoOso = fundir([
    {
      geo: tubo([
        [-0.58, 0.02, 0.1, 0.1],
        [-0.47, 0.02, 0.25, 0.27],
        [-0.2, 0.02, 0.28, 0.3],
        [0.08, 0.04, 0.3, 0.32],
        [0.28, 0.08, 0.27, 0.32],
        [0.45, 0.05, 0.17, 0.21],
      ], 8),
      color: pardo,
      bajo: 0x46301e,
    },
    { geo: Es(0.2, 6, 4), color: 0x664429, y: 0.26, z: 0.22, sx: 1.1, sy: 0.6, sz: 1.2 },
  ]);
  m.cabezaOso = fundir([
    { geo: tubo([[0, 0, 0.16, 0.18], [0.12, 0.02, 0.15, 0.16]], 7), color: pardo, rx: -0.3 },
    {
      geo: tubo([
        [0.1, 0.07, 0.15, 0.14],
        [0.2, 0.08, 0.15, 0.14],
        [0.3, 0.04, 0.09, 0.08],
        [0.4, 0.02, 0.065, 0.06],
      ], 7),
      color: 0x5e3e26,
    },
    { geo: Es(0.07, 6, 4), color: 0x8a6a48, y: 0.0, z: 0.38, sy: 0.75 },
    { geo: Es(0.035, 5, 4), color: NEGRO, y: 0.03, z: 0.45 },
    { geo: Es(0.05, 5, 4), color: 0x4a301c, x: -0.11, y: 0.2, z: 0.15, sz: 0.55 },
    { geo: Es(0.05, 5, 4), color: 0x4a301c, x: 0.11, y: 0.2, z: 0.15, sz: 0.55 },
    ...ojos(0.075, 0.12, 0.29, 0.018),
  ]);
  m.colaOso = fundir([{ geo: Es(0.055, 5, 4), color: pardo, z: -0.03 }]);

  // ---------- ciervo ----------
  const rojizo = 0x8a5a33;
  const vientre = 0xd8c4a0;
  m.cuerpoCiervo = fundir([
    {
      geo: tubo([
        [-0.45, 0.04, 0.05, 0.05],
        [-0.38, 0.03, 0.12, 0.15],
        [-0.15, 0.02, 0.12, 0.14],
        [0.1, 0.0, 0.14, 0.18],
        [0.28, 0.02, 0.12, 0.17],
        [0.38, 0.08, 0.08, 0.1],
      ]),
      color: rojizo,
      bajo: vientre,
    },
    { geo: Es(1, 6, 4), color: 0xf2ece0, y: 0.03, z: -0.41, sx: 0.09, sy: 0.11, sz: 0.05 },
  ]);
  const cuelloCiervo = { geo: tubo([[0, 0, 0.07, 0.09], [0.16, 0, 0.06, 0.075], [0.32, 0, 0.05, 0.062]], 6), color: rojizo, bajo: 0xe8dcc4, rx: -1.05 };
  const cabezaCierva = [
    cuelloCiervo,
    {
      geo: tubo([
        [0.06, 0.32, 0.055, 0.06],
        [0.13, 0.34, 0.062, 0.066],
        [0.22, 0.31, 0.044, 0.05],
        [0.3, 0.28, 0.03, 0.035],
      ], 6),
      color: 0x7a4e2c,
      bajo: 0xc8b090,
    },
    { geo: Es(0.02, 5, 4), color: NEGRO, y: 0.285, z: 0.32 },
    ...orejas(0.065, 0.39, 0.08, 0.036, 0.12, 0x7a4e2c, 1.0, 0.3),
    ...ojos(0.05, 0.35, 0.17),
  ];
  m.cabezaCierva = fundir(cabezaCierva);
  // Las cuernas del macho: dos varas con candiles.
  const asta = 0xd8c8a8;
  const cuerna = (lado) => {
    const out = [];
    const tramo = (x, y, z, rx, rz, l, g) => {
      const e = new THREE.Euler(rx, 0, rz);
      const d = new THREE.Vector3(0, 1, 0).applyEuler(e).multiplyScalar(l / 2);
      out.push({ geo: CA(g * 0.7, g, l, 4), color: asta, x: x + d.x, y: y + d.y, z: z + d.z, rx, rz });
      return [x + 2 * d.x, y + 2 * d.y, z + 2 * d.z];
    };
    const a = tramo(lado * 0.035, 0.4, 0.09, -0.45, -lado * 0.5, 0.18, 0.016);
    const b = tramo(...a, -0.2, -lado * 0.3, 0.16, 0.013);
    tramo(a[0], a[1] - 0.02, a[2], 0.9, -lado * 0.2, 0.1, 0.009);
    const c = tramo(...b, -0.55, -lado * 0.15, 0.12, 0.011);
    tramo(...b, 0.5, -lado * 0.3, 0.09, 0.008);
    tramo(...c, 0.3, -lado * 0.5, 0.07, 0.007);
    tramo(...c, -0.6, lado * 0.2, 0.07, 0.007);
    return out;
  };
  m.cabezaCiervo = fundir([...cabezaCierva, ...cuerna(-1), ...cuerna(1)]);
  m.colaCiervo = fundir([{ geo: tubo([[0.01, 0, 0.03, 0.035], [-0.05, -0.03, 0.035, 0.035], [-0.09, -0.07, 0.02, 0.02]], 5), color: rojizo, bajo: 0xf6f0e4 }]);

  // ---------- jabalí ----------
  const jabali = 0x4a3b30;
  m.cuerpoJabali = fundir([
    {
      geo: tubo([
        [-0.37, 0.0, 0.05, 0.05],
        [-0.3, 0.0, 0.13, 0.15],
        [-0.1, 0.02, 0.15, 0.17],
        [0.12, 0.04, 0.17, 0.21],
        [0.27, 0.04, 0.15, 0.2],
        [0.35, 0.03, 0.1, 0.13],
      ]),
      color: jabali,
      bajo: 0x3a2d24,
    },
    { geo: tubo([[-0.24, 0.165, 0.012, 0.02], [-0.05, 0.2, 0.02, 0.035], [0.14, 0.245, 0.02, 0.04], [0.3, 0.215, 0.012, 0.022]], 5), color: 0x2a2018 },
  ]);
  m.cabezaJabali = fundir([
    {
      geo: tubo([
        [0, 0.0, 0.12, 0.14],
        [0.12, -0.03, 0.1, 0.11],
        [0.24, -0.07, 0.06, 0.068],
        [0.31, -0.09, 0.045, 0.05],
      ], 7),
      color: jabali,
    },
    { geo: C(0.048, 0.048, 0.03, 7), color: 0x7a5a50, y: -0.093, z: 0.335, rx: Math.PI / 2 },
    { geo: Co(0.012, 0.08, 4), color: 0xf0ead8, x: -0.05, y: -0.07, z: 0.25, rx: -0.5 },
    { geo: Co(0.012, 0.08, 4), color: 0xf0ead8, x: 0.05, y: -0.07, z: 0.25, rx: -0.5 },
    ...orejas(0.075, 0.1, 0.03, 0.04, 0.08, 0x2a2018, 0.4, 0.2),
    ...ojos(0.07, 0.02, 0.13, 0.012),
  ]);
  m.colaJabali = fundir([{ geo: tubo([[0.01, 0, 0.014, 0.014], [-0.03, -0.08, 0.011, 0.011], [-0.04, -0.15, 0.015, 0.015]], 5), color: 0x2a2018 }]);

  // ---------- liebre ----------
  const liebre = 0x9a7a55;
  m.cuerpoLiebre = fundir([
    {
      geo: tubo([
        [-0.15, 0.0, 0.03, 0.03],
        [-0.12, 0.0, 0.075, 0.08],
        [-0.03, 0.02, 0.078, 0.085],
        [0.07, 0.02, 0.064, 0.07],
        [0.12, 0.03, 0.04, 0.05],
      ], 6),
      color: liebre,
      bajo: 0xe8e0d0,
    },
  ]);
  m.cabezaLiebre = fundir([
    { geo: tubo([[-0.01, 0.02, 0.04, 0.045], [0.05, 0.04, 0.046, 0.046], [0.1, 0.03, 0.03, 0.03], [0.125, 0.025, 0.014, 0.014]], 6), color: liebre, bajo: 0xe8e0d0 },
    { geo: B(0.026, 0.15, 0.01), color: 0x8a6a48, x: -0.02, y: 0.13, z: 0.01, rx: -0.3, rz: 0.12 },
    { geo: B(0.026, 0.15, 0.01), color: 0x8a6a48, x: 0.02, y: 0.13, z: 0.01, rx: -0.3, rz: -0.12 },
    { geo: B(0.027, 0.03, 0.012), color: NEGRO, x: -0.028, y: 0.2, z: -0.012, rx: -0.3, rz: 0.12 },
    { geo: B(0.027, 0.03, 0.012), color: NEGRO, x: 0.028, y: 0.2, z: -0.012, rx: -0.3, rz: -0.12 },
    ...ojos(0.035, 0.055, 0.07, 0.01),
  ]);
  m.colaLiebre = fundir([{ geo: Es(0.026, 5, 4), color: 0xf6f2ea }]);

  // ---------- caballo salvaje ----------
  const bayo = 0xc49a5c;
  const crin = 0x3a2a1c;
  m.cuerpoCaballo = fundir([
    {
      geo: tubo([
        [-0.57, 0.06, 0.06, 0.06],
        [-0.48, 0.04, 0.17, 0.21],
        [-0.25, 0.02, 0.18, 0.22],
        [0.05, 0.0, 0.19, 0.24],
        [0.3, 0.03, 0.18, 0.24],
        [0.45, 0.1, 0.11, 0.15],
      ], 8),
      color: bayo,
      bajo: 0xe6d2a8,
    },
    { geo: B(0.04, 0.03, 0.6), color: 0x5a4028, y: 0.235, z: -0.05 },
  ]);
  m.cabezaCaballo = fundir([
    { geo: tubo([[0, 0, 0.1, 0.15], [0.2, 0, 0.085, 0.12], [0.38, 0, 0.07, 0.095]], 7), color: bayo, bajo: 0xe6d2a8, rx: -0.95 },
    { geo: B(0.04, 0.42, 0.06), color: crin, y: 0.21, z: 0.06, rx: 0.62 },
    {
      geo: tubo([[0, 0, 0.065, 0.075], [0.1, -0.01, 0.06, 0.07], [0.24, -0.03, 0.045, 0.055], [0.32, -0.04, 0.04, 0.045]], 7),
      color: bayo,
      y: 0.35,
      z: 0.2,
      rx: 0.75,
    },
    { geo: Es(0.048, 6, 4), color: 0xe8dcc0, y: 0.13, z: 0.43, sy: 0.9 },
    ...orejas(0.04, 0.46, 0.2, 0.025, 0.08, crin, 0.2, 0),
    ...ojos(0.058, 0.37, 0.28),
  ]);
  m.colaCaballo = fundir([{ geo: tubo([[0.02, 0, 0.03, 0.03], [-0.07, -0.08, 0.045, 0.05], [-0.11, -0.25, 0.05, 0.05], [-0.12, -0.44, 0.025, 0.025]], 6), color: crin }]);

  // ---------- cabra montés ----------
  const cabra = 0x8a7a62;
  m.cuerpoCabra = fundir([
    {
      geo: tubo([
        [-0.34, 0.03, 0.05, 0.05],
        [-0.28, 0.02, 0.12, 0.15],
        [-0.08, 0.02, 0.13, 0.16],
        [0.12, 0.02, 0.14, 0.18],
        [0.26, 0.05, 0.11, 0.15],
        [0.33, 0.09, 0.07, 0.09],
      ]),
      color: cabra,
      bajo: 0xd8cbb2,
    },
  ]);
  const cuernoCabra = (lado) =>
    [
      [0.3, 0.07, -0.25, 0.026],
      [0.38, 0.03, -0.95, 0.022],
      [0.4, -0.05, -1.7, 0.018],
      [0.37, -0.12, -2.4, 0.014],
    ].map(([y, z, rx, g], k) => ({ geo: CA(g * 0.8, g, 0.12, 5), color: 0x6a5a48, x: lado * (0.03 + k * 0.006), y, z, rx }));
  m.cabezaCabra = fundir([
    { geo: tubo([[0, 0, 0.07, 0.09], [0.12, 0, 0.06, 0.075], [0.2, 0, 0.055, 0.065]], 6), color: cabra, rx: -0.85 },
    {
      geo: tubo([[0.07, 0.2, 0.05, 0.055], [0.14, 0.21, 0.055, 0.06], [0.22, 0.17, 0.035, 0.04], [0.27, 0.15, 0.024, 0.026]], 6),
      color: cabra,
      bajo: 0xd8cbb2,
    },
    { geo: Co(0.02, 0.08, 4), color: 0x3a2a1a, y: 0.1, z: 0.19, rx: Math.PI },
    ...cuernoCabra(-1),
    ...cuernoCabra(1),
    ...orejas(0.055, 0.24, 0.08, 0.02, 0.06, cabra, 1.1, 0.2),
    ...ojos(0.045, 0.22, 0.16),
  ]);
  m.colaCabra = fundir([{ geo: tubo([[0.01, 0, 0.02, 0.025], [-0.05, 0.02, 0.02, 0.02]], 5), color: 0x4a3a2a }]);

  // ---------- oveja ----------
  const lana = 0xf2efe4;
  const lanas = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    lanas.push({ geo: new THREE.IcosahedronGeometry(0.1, 0), color: lana, x: Math.cos(a) * 0.15, y: 0.06 + Math.sin(a) * 0.1, z: -0.18 + (k % 3) * 0.17 });
  }
  m.cuerpoOveja = fundir([
    { geo: tubo([[-0.3, 0.02, 0.1, 0.1], [-0.24, 0.02, 0.19, 0.19], [0.0, 0.03, 0.21, 0.21], [0.2, 0.03, 0.19, 0.19], [0.28, 0.04, 0.12, 0.12]], 8), color: lana, bajo: 0xe0dccf },
    ...lanas,
  ]);
  m.cabezaOveja = fundir([
    { geo: tubo([[0.0, 0.04, 0.06, 0.07], [0.08, 0.03, 0.055, 0.065], [0.15, -0.01, 0.035, 0.04]], 6), color: 0x3a3330 },
    { geo: B(0.17, 0.02, 0.035), color: 0x3a3330, y: 0.075, z: 0.04 },
    { geo: new THREE.IcosahedronGeometry(0.065, 0), color: lana, y: 0.1, z: 0.0 },
    ...ojos(0.05, 0.06, 0.08, 0.011),
  ]);
  m.colaOveja = fundir([{ geo: new THREE.IcosahedronGeometry(0.05, 0), color: lana, y: -0.03, z: -0.03 }]);

  // ---------- aves ----------
  m.gaviota = fundir([
    {
      geo: tubo([
        [-0.2, 0.0, 0.012, 0.008],
        [-0.13, 0.0, 0.045, 0.032],
        [0.0, 0.0, 0.065, 0.06],
        [0.11, 0.01, 0.055, 0.055],
        [0.17, 0.03, 0.042, 0.042],
        [0.22, 0.03, 0.026, 0.026],
      ], 6),
      color: 0xf6f6f6,
    },
    { geo: Co(0.012, 0.07, 4), color: 0xe8b830, y: 0.025, z: 0.27, rx: Math.PI / 2 },
    { geo: B(0.09, 0.008, 0.07), color: 0xc8ccd0, z: -0.2 },
    ...ojos(0.025, 0.045, 0.2, 0.008),
  ]);
  // Ala derecha (hacia +x); la izquierda es la misma dada la vuelta.
  m.ala = fundir([
    {
      geo: triangulos([
        [[0, 0, 0.06], [0.2, 0.01, 0.055], [0.2, 0.01, -0.07]],
        [[0, 0, 0.06], [0.2, 0.01, -0.07], [0, 0, -0.06]],
        [[0.2, 0.01, 0.055], [0.36, 0.0, 0.02], [0.32, 0.0, -0.08]],
        [[0.2, 0.01, 0.055], [0.32, 0.0, -0.08], [0.2, 0.01, -0.07]],
      ]),
      color: 0xd0d4d8,
    },
    {
      geo: triangulos([
        [[0.36, 0.0, 0.02], [0.5, -0.01, -0.06], [0.32, 0.0, -0.08]],
      ]),
      color: 0x24221f,
    },
  ]);
  m.pato = fundir([
    {
      geo: tubo([
        [-0.17, 0.05, 0.018, 0.014],
        [-0.12, 0.035, 0.07, 0.05],
        [0.0, 0.03, 0.09, 0.065],
        [0.1, 0.035, 0.08, 0.062],
        [0.15, 0.05, 0.05, 0.05],
      ], 7),
      color: 0x8a7e70,
      bajo: 0xb0a698,
    },
    { geo: Es(0.065, 6, 4), color: 0x7a4a2a, y: 0.04, z: 0.1 },
    { geo: tubo([[0.0, 0.0, 0.03, 0.03], [0.07, 0.0, 0.028, 0.03]], 6), color: 0x2f6a3a, y: 0.06, z: 0.13, rx: -1.2 },
    { geo: Es(0.045, 6, 5), color: 0x2f6a3a, y: 0.15, z: 0.16 },
    { geo: C(0.031, 0.031, 0.012, 7), color: 0xf4f4f0, y: 0.1, z: 0.145 },
    { geo: B(0.032, 0.012, 0.06), color: 0xd8b030, y: 0.14, z: 0.215 },
    { geo: B(0.04, 0.02, 0.03), color: 0x1e1e1e, y: 0.07, z: -0.17, rx: 0.4 },
    ...ojos(0.035, 0.165, 0.18, 0.008),
  ]);
  m.garza = fundir([
    { geo: tubo([[-0.2, 0.0, 0.02, 0.02], [-0.13, 0.0, 0.06, 0.06], [0.0, 0.02, 0.07, 0.08], [0.09, 0.05, 0.05, 0.06]], 7), color: 0x9aa0a8, bajo: 0xe8e8ec },
    { geo: B(0.12, 0.02, 0.18), color: 0x6a707a, y: 0.06, z: -0.04 },
    { geo: CA(0.008, 0.01, 0.48, 4), color: 0xb0a050, x: -0.03, y: -0.27, z: 0.0 },
    { geo: CA(0.008, 0.01, 0.48, 4), color: 0xb0a050, x: 0.03, y: -0.27, z: 0.0 },
  ]);
  m.cuelloGarza = fundir([
    { geo: tubo([[0, 0, 0.028, 0.028], [0.08, 0.02, 0.022, 0.022], [0.15, 0.0, 0.02, 0.02]], 5), color: 0xe8e8ec, rx: -1.3 },
    { geo: tubo([[0.0, 0.0, 0.02, 0.02], [0.06, 0.0, 0.022, 0.022], [0.12, 0.0, 0.025, 0.025]], 5), color: 0xe8e8ec, y: 0.15, z: 0.02, rx: -0.4 },
    { geo: tubo([[0.0, 0.0, 0.026, 0.024], [0.05, 0.0, 0.028, 0.026], [0.08, 0.0, 0.02, 0.018]], 6), color: 0xf0f0f2, y: 0.26, z: 0.07 },
    { geo: Co(0.011, 0.15, 4), color: 0xd8b030, y: 0.26, z: 0.22, rx: Math.PI / 2 },
    { geo: B(0.01, 0.01, 0.1), color: 0x1e1e1e, y: 0.28, z: 0.02, rx: 0.3 },
    ...ojos(0.022, 0.27, 0.13, 0.007),
  ]);
  // ---------- peces y salpicaduras ----------
  m.pez = fundir([
    { geo: tubo([[-0.1, 0, 0.006, 0.012], [-0.06, 0, 0.02, 0.035], [0.02, 0, 0.03, 0.05], [0.08, 0, 0.016, 0.026], [0.105, 0, 0.005, 0.008]], 6), color: 0x8aa0a8, bajo: 0xe0e8ea },
    { geo: triangulos([[[0, 0, -0.09], [0, 0.05, -0.15], [0, -0.05, -0.15]]]), color: 0x6a8088 },
    { geo: triangulos([[[0, 0.04, 0.0], [0, 0.07, -0.04], [0, 0.04, -0.06]]]), color: 0x6a8088 },
  ]);
  m.ola = fundir([{ geo: new THREE.RingGeometry(0.32, 0.42, 14), color: 0xffffff, rx: -Math.PI / 2 }]);
  return m;
}
