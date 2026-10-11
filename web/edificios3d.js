// Edificios, campos y fuego: chozas, casas de adobe, hogueras, campos con su cosecha,
// corrales, almacenes, hornos humeantes, la casa de las tablillas, mercados,
// empalizadas con su puerta, obras con andamios, ruinas, e incendios forestales con
// llamas y columnas de humo.

import * as THREE from 'three';
import { AGUA, B, C, Co, Do, Es, RIO, T, azar, cerrar, colocar, fundir, instancias } from './util3d.js?v=__MOTOR__';

function modelos() {
  const madera = 0x7a5534;
  const oscuro = 0x34241a;
  const paja = 0xc9a24f;
  const piedras = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    piedras.push({ geo: Do(0.11), color: 0x7d7a74, x: Math.cos(a) * 0.38, y: 0.06, z: Math.sin(a) * 0.38 });
  }
  const postes = (lado, alto, color) => {
    const r = [];
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, -1], [1, 0], [0, 1], [-1, 0]]) {
      r.push({ geo: B(0.08, alto, 0.08), color, x: (x * lado) / 2, y: alto / 2, z: (z * lado) / 2 });
    }
    return r;
  };
  const vasijas = [];
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    vasijas.push({ geo: Es(0.15, 7, 5), color: 0xb5653a, x: Math.cos(a) * 0.36, y: 0.19, z: Math.sin(a) * 0.28, sy: 1.35 });
  }
  const puesto = (x, z, color) => [
    { geo: B(0.05, 0.75, 0.05), color: madera, x: x - 0.3, y: 0.37, z: z - 0.25 },
    { geo: B(0.05, 0.75, 0.05), color: madera, x: x + 0.3, y: 0.37, z: z - 0.25 },
    { geo: B(0.05, 0.75, 0.05), color: madera, x: x - 0.3, y: 0.37, z: z + 0.25 },
    { geo: B(0.05, 0.75, 0.05), color: madera, x: x + 0.3, y: 0.37, z: z + 0.25 },
    { geo: B(0.78, 0.04, 0.64), color, x, y: 0.76, z, rx: 0.12 },
    { geo: B(0.62, 0.06, 0.4), color: 0x8a6440, x, y: 0.42, z },
    { geo: Es(0.08, 6, 4), color: 0xd8b03a, x: x - 0.15, y: 0.49, z },
    { geo: Es(0.08, 6, 4), color: 0xb5653a, x: x + 0.12, y: 0.49, z: z + 0.05 },
  ];
  // Muros de piedra con hiladas: bloques claros y oscuros alternos.
  const sillares = (w, h, d, y0, color) => {
    const r = [{ geo: B(w, h, d), color, y: y0 + h / 2 }];
    for (let k = 0; k < Math.floor(h / 0.17); k++) {
      for (const [lx, lz, ww, dd] of [[0, d / 2 + 0.005, w, 0.012], [0, -d / 2 - 0.005, w, 0.012], [w / 2 + 0.005, 0, 0.012, d], [-w / 2 - 0.005, 0, 0.012, d]]) {
        r.push({ geo: B(ww + 0.002, 0.018, dd + 0.002), color: 0x6f675c, x: lx, y: y0 + 0.17 * (k + 1), z: lz });
      }
    }
    return r;
  };
  // Tejado a dos aguas a 45° (largo en x) sobre muros de fondo `d` que acaban a la altura `y`:
  // de paja o de tejas, con sus canales.
  const tejado = (w, d, y, color, tejas = false) => {
    const L = d * 0.76;
    const r = [
      { geo: B(w, 0.06, L), color, y: y + d / 4, z: -d / 4, rx: -Math.PI / 4 },
      { geo: B(w, 0.06, L), color, y: y + d / 4, z: d / 4, rx: Math.PI / 4 },
      { geo: B(w + 0.02, 0.07, 0.1), color: tejas ? 0x8a3a22 : 0x9a7a3a, y: y + d / 2 + 0.02 },
    ];
    if (tejas) {
      for (let x = -w / 2 + 0.06; x < w / 2; x += 0.16) {
        r.push({ geo: C(0.024, 0.024, L, 4), color: 0x9c4428, x, y: y + d / 4 + 0.03, z: -d / 4 - 0.02, rx: Math.PI / 4 });
        r.push({ geo: C(0.024, 0.024, L, 4), color: 0x9c4428, x, y: y + d / 4 + 0.03, z: d / 4 + 0.02, rx: -Math.PI / 4 });
      }
    }
    return r;
  };
  // El hastial: el triángulo de pared bajo el tejado, en cada extremo.
  const pinon = (x, y, d, color) => ({ geo: B(0.05, d * 0.707, d * 0.707), color, x, y, rx: Math.PI / 4 });
  const columna = (x, z, h, color) => [
    { geo: B(0.2, 0.06, 0.2), color, x, y: 0.03, z },
    { geo: C(0.07, 0.08, h, 8), color, x, y: h / 2 + 0.06, z },
    { geo: B(0.2, 0.06, 0.2), color, x, y: h + 0.09, z },
  ];
  return {
    // Casa de piedra: muros de mampostería, tejado de paja, puerta de tablas y ventanucos.
    casapiedra: fundir([
      ...sillares(1.36, 0.85, 1.0, 0, 0xa49a88),
      ...tejado(1.56, 1.2, 0.85, 0xc9a24f),
      pinon(0.66, 0.85, 1.0, 0xa49a88),
      pinon(-0.66, 0.85, 1.0, 0xa49a88),
      { geo: B(0.3, 0.5, 0.06), color: 0x5a3d22, y: 0.25, z: 0.51 },
      { geo: B(0.38, 0.08, 0.08), color: 0x8a8070, y: 0.53, z: 0.52 },
      { geo: B(0.16, 0.16, 0.05), color: 0x22170f, x: -0.42, y: 0.55, z: 0.51 },
      { geo: B(0.16, 0.16, 0.05), color: 0x22170f, x: 0.42, y: 0.55, z: 0.51 },
      { geo: B(0.18, 0.5, 0.18), color: 0x8f877a, x: 0.42, y: 1.25, z: -0.2 },
    ]),
    // Casa grande de tejas: dos alturas de piedra encalada, tejado rojo, balcón y chimenea.
    casatejas: fundir([
      { geo: B(1.62, 0.12, 1.22), color: 0x8f877a, y: 0.06 },
      { geo: B(1.5, 1.35, 1.1), color: 0xe6dccb, y: 0.74 },
      ...[-0.75, 0.75].flatMap((x) => [-0.55, 0.55].map((z) => ({ geo: B(0.1, 1.35, 0.1), color: 0xb0a490, x, y: 0.74, z }))),
      ...tejado(1.72, 1.32, 1.41, 0xb5532f, true),
      pinon(0.73, 1.41, 1.1, 0xe6dccb),
      pinon(-0.73, 1.41, 1.1, 0xe6dccb),
      { geo: B(0.32, 0.6, 0.06), color: 0x6a3f22, y: 0.42, z: 0.56 },
      { geo: B(0.42, 0.06, 0.1), color: 0x9a8e7a, y: 0.75, z: 0.57 },
      ...[-0.5, 0.5].map((x) => ({ geo: B(0.2, 0.22, 0.05), color: 0x2a3a48, x, y: 0.5, z: 0.56 })),
      ...[-0.5, 0, 0.5].map((x) => ({ geo: B(0.2, 0.24, 0.05), color: 0x2a3a48, x, y: 1.1, z: 0.56 })),
      ...[-0.5, 0, 0.5].map((x) => ({ geo: B(0.26, 0.05, 0.08), color: 0x6a3f22, x, y: 0.97, z: 0.58 })),
      { geo: B(0.9, 0.05, 0.25), color: 0x6a3f22, y: 0.94, z: 0.66 },
      { geo: B(0.9, 0.18, 0.03), color: 0x6a3f22, y: 1.05, z: 0.78 },
      { geo: B(0.22, 0.6, 0.22), color: 0xd8ccb8, x: -0.5, y: 1.95, z: -0.15 },
      { geo: B(0.26, 0.06, 0.26), color: 0x8a3a22, x: -0.5, y: 2.27, z: -0.15 },
      { geo: Es(0.18, 6, 4), color: 0x6a8a3a, x: 0.62, y: 0.15, z: 0.75, sy: 0.7 },
    ]),
    // Torre de vigía de madera: cuatro pies arriostrados, plataforma con baranda y techo.
    torreVigia: fundir([
      ...[[-0.36, -0.36], [0.36, -0.36], [-0.36, 0.36], [0.36, 0.36]].map(([x, z]) => ({ geo: B(0.1, 2.6, 0.1), color: 0x6a4a2e, x, y: 1.3, z })),
      ...[0.5, 1.3].flatMap((y) => [
        { geo: B(0.8, 0.06, 0.06), color: 0x7a5534, y, z: 0.36, rz: 0.6 },
        { geo: B(0.8, 0.06, 0.06), color: 0x7a5534, y, z: -0.36, rz: -0.6 },
        { geo: B(0.06, 0.06, 0.8), color: 0x7a5534, y, x: 0.36, rx: 0.6 },
        { geo: B(0.06, 0.06, 0.8), color: 0x7a5534, y, x: -0.36, rx: -0.6 },
      ]),
      { geo: B(1.05, 0.08, 1.05), color: 0x8a6440, y: 2.0 },
      ...[[0, 0.52, 1.05, 0.05], [0, -0.52, 1.05, 0.05], [0.52, 0, 0.05, 1.05], [-0.52, 0, 0.05, 1.05]].map(([x, z, w, d]) => ({ geo: B(w, 0.3, d), color: 0x7a5534, x, y: 2.2, z })),
      ...[[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]].map(([x, z]) => ({ geo: B(0.06, 0.9, 0.06), color: 0x6a4a2e, x, y: 2.45, z })),
      { geo: Co(0.85, 0.55, 4), color: 0xc9a24f, y: 3.15, ry: Math.PI / 4 },
      { geo: B(0.06, 2.0, 0.3), color: 0x6a4a2e, x: 0.2, y: 1.0, z: 0.45, rx: -0.2 },
    ]),
    // Torre de piedra: cuadrada, con almenas.
    torrePiedra: fundir([
      ...sillares(1.1, 2.4, 1.1, 0, 0xa59d8f),
      { geo: B(1.22, 0.1, 1.22), color: 0xb3ab9c, y: 2.45 },
      ...[[-0.45, 0.5], [0, 0.5], [0.45, 0.5], [-0.45, -0.5], [0, -0.5], [0.45, -0.5], [0.5, 0], [-0.5, 0]].map(([x, z]) => ({ geo: B(0.24, 0.3, 0.18), color: 0xa59d8f, x, y: 2.65, z })),
      { geo: B(0.1, 0.3, 0.04), color: 0x2a2622, y: 1.6, z: 0.56 },
      { geo: B(0.3, 0.5, 0.04), color: 0x4a3020, y: 0.25, z: 0.56 },
    ]),
    // Hoja de la puerta del muro: tablones con travesaños y su refuerzo en diagonal.
    hoja: fundir([
      { geo: B(1, 1, 0.08), color: 0x7a5534, x: 0.5, y: 0.5 },
      ...[0.2, 0.8].map((y) => ({ geo: B(1, 0.08, 0.12), color: 0x5a3d22, x: 0.5, y })),
      { geo: B(1.1, 0.08, 0.1), color: 0x5a3d22, x: 0.5, y: 0.5, rz: 0.55 },
      ...[0.25, 0.5, 0.75].map((x) => ({ geo: B(0.012, 1, 0.09), color: 0x4a3020, x })),
    ]),
    // Establo: nave larga de madera con cuadras abiertas, pesebre y pacas de heno.
    establo: fundir([
      { geo: B(2.0, 0.08, 1.2), color: 0x9a8058, y: 0.04 },
      ...[-0.95, -0.32, 0.32, 0.95].flatMap((x) => [-0.55, 0.55].map((z) => ({ geo: B(0.1, 1.1, 0.1), color: 0x6a4a2e, x, y: 0.55, z }))),
      { geo: B(2.0, 0.9, 0.06), color: 0x8a5a36, y: 0.5, z: -0.57 },
      ...[-0.95, 0.95].map((x) => ({ geo: B(0.06, 0.9, 1.16), color: 0x8a5a36, x, y: 0.5 })),
      ...[-0.32, 0.32].map((x) => ({ geo: B(0.05, 0.6, 1.0), color: 0x7a5534, x, y: 0.3, z: -0.05 })),
      ...tejado(2.2, 1.4, 0.95, 0x7a5a3a),
      pinon(0.97, 0.95, 1.16, 0x8a5a36),
      pinon(-0.97, 0.95, 1.16, 0x8a5a36),
      { geo: B(1.8, 0.14, 0.2), color: 0x6a4a2e, y: 0.35, z: -0.42 },
      { geo: B(0.42, 0.28, 0.3), color: 0xd8b850, x: 1.25, y: 0.14, z: 0.3 },
      { geo: B(0.42, 0.28, 0.3), color: 0xc8a840, x: 1.25, y: 0.42, z: 0.3, ry: 0.3 },
      { geo: B(0.5, 0.14, 0.18), color: 0x6a4a2e, x: -1.25, y: 0.07, z: 0.35 },
      { geo: B(0.44, 0.03, 0.12), color: 0x5a8ab0, x: -1.25, y: 0.13, z: 0.35 },
    ]),
    // Taller: cobertizo abierto con forja humeante, yunque, banco y vasijas recién hechas.
    taller: fundir([
      { geo: B(1.6, 0.06, 1.2), color: 0x8a7a62, y: 0.03 },
      ...[[-0.75, -0.55], [0.75, -0.55], [-0.75, 0.55], [0.75, 0.55]].map(([x, z]) => ({ geo: B(0.09, 1.05, 0.09), color: 0x6a4a2e, x, y: 0.52, z })),
      { geo: B(1.6, 0.85, 0.06), color: 0x9a8a72, y: 0.43, z: -0.57 },
      ...tejado(1.76, 1.36, 1.05, 0x8a6a44),
      { geo: B(0.5, 0.45, 0.5), color: 0x7a7066, x: -0.45, y: 0.22, z: -0.25 },
      { geo: B(0.32, 0.08, 0.32), color: 0xd8501a, x: -0.45, y: 0.47, z: -0.25 },
      { geo: C(0.09, 0.12, 0.9, 6), color: 0x5a524a, x: -0.45, y: 0.9, z: -0.35 },
      { geo: C(0.12, 0.16, 0.3, 7), color: 0x4a3a2a, x: 0.15, y: 0.15, z: 0.1 },
      { geo: B(0.32, 0.1, 0.14), color: 0x3a3a3e, x: 0.15, y: 0.34, z: 0.1 },
      { geo: B(0.7, 0.06, 0.32), color: 0x8a6440, x: 0.45, y: 0.5, z: -0.35 },
      ...[0.25, 0.65].map((x) => ({ geo: B(0.05, 0.5, 0.05), color: 0x6a4a2e, x, y: 0.25, z: -0.35 })),
      ...[0.3, 0.5, 0.65].map((x, k) => ({ geo: Es(0.07 + k * 0.01, 7, 5), color: 0xb5653a, x, y: 0.6, z: -0.35, sy: 1.3 })),
    ]),
    // Plaza: un empedrado redondo de losas con su pozo en un lado.
    plaza: fundir([
      { geo: C(T * 1.45, T * 1.5, 0.05, 28), color: 0xb2a890, y: 0.02 },
      ...Array.from({ length: 36 }, (_, k) => {
        const r = 0.6 + (k % 4) * 0.6;
        const a = k * 2.399;
        return { geo: B(0.42, 0.012, 0.32), color: [0x9a907c, 0xc2b8a0, 0xa89e88][k % 3], x: Math.cos(a) * r, y: 0.052, z: Math.sin(a) * r, ry: a };
      }),
      { geo: C(0.32, 0.34, 0.4, 10), color: 0x9a948a, x: 1.9, y: 0.2, z: -1.2 },
      { geo: C(0.24, 0.24, 0.02, 10), color: 0x3a5a7a, x: 1.9, y: 0.39, z: -1.2 },
      ...[-0.22, 0.22].map((dx) => ({ geo: B(0.05, 0.6, 0.05), color: 0x6a4a2e, x: 1.9 + dx, y: 0.55, z: -1.2 })),
      { geo: B(0.5, 0.05, 0.05), color: 0x6a4a2e, x: 1.9, y: 0.85, z: -1.2 },
    ]),
    // Templo: escalinata, columnas, frontón y tejado; dentro, el altar con su fuego.
    templo: fundir([
      { geo: B(2.2, 0.16, 1.7), color: 0xb8ae98, y: 0.08 },
      { geo: B(2.0, 0.16, 1.5), color: 0xc8bea8, y: 0.24 },
      { geo: B(1.8, 0.16, 1.3), color: 0xd8cfba, y: 0.4 },
      { geo: B(1.1, 1.0, 0.8), color: 0xd0c6b0, y: 0.98, z: -0.1 },
      ...[-0.75, -0.25, 0.25, 0.75].flatMap((x) => [-0.55, 0.55].map((z) => columna(x, z, 1.05, 0xe6dece))).flat().map((c) => ({ ...c, y: c.y + 0.48 })),
      { geo: B(1.9, 0.14, 1.4), color: 0xd8cfba, y: 1.66 },
      ...tejado(2.0, 1.5, 1.73, 0xb5532f, true),
      pinon(0.93, 1.73, 1.4, 0xe6dece),
      pinon(-0.93, 1.73, 1.4, 0xe6dece),
      { geo: B(0.3, 0.55, 0.06), color: 0x3a2a1a, y: 0.75, z: 0.31 },
      { geo: B(0.3, 0.25, 0.2), color: 0x9a8e7a, y: 0.6, z: 0.75 },
      { geo: Co(0.08, 0.2, 5), color: 0xffa040, y: 0.82, z: 0.75 },
    ]),
    // Losa de calle empedrada.
    adoquin: fundir([
      { geo: B(0.98, 0.04, 0.62), color: 0xffffff, y: 0.02 },
      ...[-0.25, 0.25].map((x) => ({ geo: B(0.012, 0.045, 0.6), color: 0x7a7266, x, y: 0.02 })),
    ]),
    choza: fundir([
      { geo: C(0.56, 0.64, 0.5, 9), color: 0x8b5a2b, y: 0.25 },
      { geo: Co(0.92, 0.95, 9), color: paja, y: 0.98 },
      { geo: C(0.04, 0.08, 0.25, 5), color: 0x5a3d22, y: 1.5 },
      { geo: B(0.26, 0.38, 0.08), color: oscuro, y: 0.19, z: 0.6 },
      { geo: B(0.34, 0.05, 0.1), color: 0x5a3d22, y: 0.4, z: 0.6 },
    ]),
    casa: fundir([
      { geo: B(1.34, 0.82, 1.04), color: 0xcf9663, y: 0.41 },
      { geo: B(1.5, 0.12, 1.2), color: 0x6e4a2a, y: 0.88 },
      ...[-0.55, -0.18, 0.18, 0.55].map((x) => ({ geo: C(0.035, 0.035, 1.3, 5), color: 0x5a3d22, x, y: 0.86, rx: Math.PI / 2 })),
      { geo: B(0.28, 0.46, 0.06), color: oscuro, y: 0.23, z: 0.53 },
      { geo: B(0.2, 0.17, 0.06), color: 0x22170f, x: -0.42, y: 0.52, z: 0.53 },
      { geo: B(0.2, 0.17, 0.06), color: 0x22170f, x: 0.42, y: 0.52, z: 0.53 },
      { geo: B(0.12, 0.3, 0.12), color: 0xb9895a, x: 0.45, y: 1.05, z: -0.25 },
    ]),
    hoguera: fundir([
      ...piedras,
      { geo: C(0.05, 0.05, 0.66, 5), color: 0x5a3a1e, y: 0.08, rz: Math.PI / 2, ry: 0.5 },
      { geo: C(0.05, 0.05, 0.66, 5), color: 0x5a3a1e, y: 0.1, rz: Math.PI / 2, ry: -0.6 },
      { geo: C(0.05, 0.05, 0.6, 5), color: 0x4a2f18, y: 0.12, rz: Math.PI / 2, ry: 1.6 },
      { geo: C(0.12, 0.12, 0.07, 8), color: 0x3a3a3a, x: 1.2, y: 0.18, z: 0.4 },
      { geo: B(0.7, 0.12, 0.18), color: 0x6b4a2e, x: -1.1, y: 0.18, z: 0.5, ry: 0.6 },
      { geo: B(0.7, 0.12, 0.18), color: 0x6b4a2e, x: 0.3, y: 0.18, z: -1.15, ry: -0.2 },
    ]),
    campo: fundir([
      { geo: B(T * 0.94, 0.06, T * 0.94), color: 0x7a5a3a, y: 0.03 },
      ...[-0.66, -0.33, 0, 0.33, 0.66].map((z) => ({ geo: B(T * 0.9, 0.05, 0.1), color: 0x5e4229, y: 0.07, z })),
    ]),
    // Tumbas: un túmulo de tierra con piedras; con escritura, una lápida grabada.
    tumba: fundir([
      { geo: Es(1, 7, 4), color: 0x6a5238, sx: 0.22, sy: 0.11, sz: 0.36 },
      { geo: Do(0.05), color: 0x8b867d, x: 0.16, y: 0.02, z: 0.22 },
      { geo: Do(0.045), color: 0x9a948a, x: -0.15, y: 0.02, z: 0.24 },
      { geo: Do(0.05), color: 0x7a756d, x: 0.15, y: 0.02, z: -0.26 },
      { geo: Do(0.045), color: 0x8b867d, x: -0.16, y: 0.02, z: -0.22 },
      { geo: B(0.05, 0.16, 0.05), color: 0x8a8478, y: 0.08, z: -0.38 },
    ]),
    lapida: fundir([
      { geo: Es(1, 7, 4), color: 0x6a5238, sx: 0.22, sy: 0.11, sz: 0.36 },
      { geo: B(0.22, 0.3, 0.06), color: 0x9a948a, y: 0.15, z: -0.38 },
      { geo: B(0.14, 0.012, 0.01), color: 0x4a4640, y: 0.22, z: -0.347 },
      { geo: B(0.1, 0.012, 0.01), color: 0x4a4640, y: 0.17, z: -0.347 },
      { geo: B(0.12, 0.012, 0.01), color: 0x4a4640, y: 0.12, z: -0.347 },
    ]),
    corral: fundir([
      ...postes(1.7, 0.55, madera),
      { geo: B(1.78, 0.05, 0.05), color: madera, y: 0.36, z: -0.85 },
      { geo: B(1.78, 0.05, 0.05), color: madera, y: 0.36, z: 0.85 },
      { geo: B(0.05, 0.05, 1.78), color: madera, y: 0.36, x: -0.85 },
      { geo: B(0.05, 0.05, 1.78), color: madera, y: 0.36, x: 0.85 },
      { geo: B(1.78, 0.05, 0.05), color: madera, y: 0.18, z: -0.85 },
      { geo: B(1.78, 0.05, 0.05), color: madera, y: 0.18, z: 0.85 },
      { geo: B(0.3, 0.12, 0.2), color: 0x8a6a3a, x: 0.5, y: 0.06, z: 0.5 },
    ]),
    almacen: fundir([
      ...vasijas,
      { geo: B(1.15, 0.06, 0.9), color: 0x6e4a2a, y: 0.86 },
      { geo: Co(0.8, 0.4, 4), color: paja, y: 1.08, ry: Math.PI / 4, sz: 0.8 },
      ...[[-0.52, -0.4], [0.52, -0.4], [-0.52, 0.4], [0.52, 0.4]].map(([x, z]) => ({ geo: B(0.07, 0.86, 0.07), color: madera, x, y: 0.43, z })),
    ]),
    horno: fundir([
      { geo: new THREE.SphereGeometry(0.6, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), color: 0xa4552f },
      { geo: C(0.1, 0.13, 0.55, 6), color: 0x5a3020, x: 0.22, y: 0.65 },
      { geo: B(0.28, 0.26, 0.12), color: 0x140c08, y: 0.13, z: 0.52 },
      { geo: B(0.5, 0.08, 0.3), color: 0x6b6a66, x: -0.6, y: 0.04, z: 0.3 },
    ]),
    archivo: fundir([
      { geo: B(1.5, 0.15, 1.2), color: 0xd9d2c0, y: 0.075 },
      { geo: B(1.36, 0.1, 1.06), color: 0xcfc8b4, y: 0.2 },
      ...[[-0.6, -0.45], [0.6, -0.45], [-0.6, 0.45], [0.6, 0.45], [0, 0.45], [0, -0.45]].map(([x, z]) => ({ geo: C(0.075, 0.09, 0.8, 7), color: 0xe9e3d3, x, y: 0.6, z })),
      { geo: B(0.9, 0.55, 0.7), color: 0xcfc6b0, y: 0.5 },
      { geo: B(1.58, 0.15, 1.28), color: 0xd2c9b4, y: 1.05 },
      { geo: Co(1.0, 0.36, 4), color: 0xb8ad94, y: 1.3, ry: Math.PI / 4, sz: 0.75 },
    ]),
    mercado: fundir([...puesto(-0.45, -0.3, 0xc0392b), ...puesto(0.45, -0.3, 0xe0b030), ...puesto(0, 0.45, 0x2f6db0)]),
    ruina: fundir([
      { geo: B(0.7, 0.35, 0.15), color: 0x8a8478, x: -0.2, y: 0.17, z: -0.3, ry: 0.2 },
      { geo: B(0.15, 0.5, 0.6), color: 0x7d776c, x: 0.35, y: 0.25, z: 0.05 },
      { geo: B(0.4, 0.15, 0.4), color: 0x6f6a60, x: -0.2, y: 0.07, z: 0.35, rz: 0.3 },
      { geo: Do(0.12), color: 0x6b6660, x: 0.1, y: 0.06, z: -0.1 },
    ]),
    obra: fundir([
      ...[[-0.6, -0.5], [0.6, -0.5], [-0.6, 0.5], [0.6, 0.5]].map(([x, z]) => ({ geo: B(0.06, 1, 0.06), color: 0xc8a878, x, y: 0.5, z })),
      { geo: B(1.26, 0.05, 0.05), color: 0xc8a878, y: 0.5, z: -0.5 },
      { geo: B(1.26, 0.05, 0.05), color: 0xc8a878, y: 0.5, z: 0.5 },
      { geo: B(1.26, 0.05, 0.05), color: 0xc8a878, y: 0.98, z: -0.5 },
      { geo: B(1.26, 0.05, 0.05), color: 0xc8a878, y: 0.98, z: 0.5 },
      { geo: B(0.5, 0.25, 0.3), color: 0x9a7a52, x: 0.2, y: 0.12, z: 0.1 },
    ]),
    cultivo: fundir([
      { geo: C(0.012, 0.016, 0.42, 4), color: 0xffffff, y: 0.21 },
      { geo: Co(0.05, 0.16, 5), color: 0xffffff, y: 0.45 },
    ]),
    tronquito: fundir([
      { geo: C(0.11, 0.12, 1.35, 6), color: 0x7a5534, y: 0.67 },
      { geo: Co(0.12, 0.28, 6), color: 0x6a4a2e, y: 1.48 },
    ]),
    torre: fundir([
      ...[[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]].map(([x, z]) => ({ geo: B(0.09, 2.2, 0.09), color: 0x6a4a2e, x, y: 1.1, z })),
      { geo: B(0.8, 0.08, 0.8), color: 0x7a5534, y: 1.9 },
      { geo: Co(0.62, 0.5, 4), color: 0xc9a24f, y: 2.45, ry: Math.PI / 4 },
    ]),
    // El puente: tablero de tablones con barandillas y pilotes, de orilla a orilla (a lo largo de z).
    puente: fundir([
      { geo: B(1.0, 0.09, 2.9), color: 0x8a6440 },
      ...[-1.1, -0.55, 0, 0.55, 1.1].map((z) => ({ geo: B(1.02, 0.02, 0.06), color: 0x6a4a2e, y: 0.055, z })),
      ...[-1.35, -0.45, 0.45, 1.35].flatMap((z) => [-0.47, 0.47].map((x) => ({ geo: B(0.07, 0.5, 0.07), color: 0x5a3d22, x, y: 0.25, z }))),
      ...[-0.47, 0.47].map((x) => ({ geo: B(0.05, 0.05, 2.8), color: 0x7a5534, x, y: 0.48 })),
      ...[-0.5, 0.5].flatMap((z) => [-0.4, 0.4].map((x) => ({ geo: C(0.07, 0.07, 1.4, 6), color: 0x4e3622, x, y: -0.7, z }))),
    ]),
    // El gallinero: una casita sobre patas con su rampa y un corralito delante.
    gallinero: fundir([
      ...[[-0.3, -0.25], [0.3, -0.25], [-0.3, 0.2], [0.3, 0.2]].map(([x, z]) => ({ geo: B(0.06, 0.4, 0.06), color: 0x6a4a2e, x, y: 0.2, z: z - 0.3 })),
      { geo: B(0.75, 0.42, 0.6), color: 0x9a7448, y: 0.6, z: -0.3 },
      { geo: B(0.85, 0.05, 0.72), color: 0x7a5534, y: 0.85, z: -0.3, rz: 0.18 },
      { geo: B(0.85, 0.05, 0.72), color: 0x7a5534, y: 0.85, z: -0.3, rz: -0.18, x: 0 },
      { geo: B(0.14, 0.16, 0.02), color: 0x2a2018, y: 0.55, z: 0.01 },
      { geo: B(0.14, 0.03, 0.5), color: 0x8a6440, y: 0.22, z: 0.18, rx: 0.75 },
      ...[-0.65, 0.65].map((x) => ({ geo: B(0.04, 0.32, 1.1), color: 0x8a6a44, x, y: 0.16, z: 0.45 })),
      { geo: B(1.34, 0.32, 0.04), color: 0x8a6a44, y: 0.16, z: 1.0 },
      { geo: B(1.3, 0.02, 1.0), color: 0xb89a62, y: 0.01, z: 0.5 },
    ]),
    // La granja: un establo grande de madera con tejado a dos aguas, pajar y abrevadero.
    granja: fundir([
      { geo: B(1.6, 0.9, 1.1), color: 0x8a4a32, y: 0.45 },
      { geo: B(1.7, 0.08, 0.7), color: 0x5a3a26, y: 1.05, z: -0.27, rx: -0.62 },
      { geo: B(1.7, 0.08, 0.7), color: 0x5a3a26, y: 1.05, z: 0.27, rx: 0.62 },
      { geo: Co(0.56, 0.4, 3), color: 0x8a4a32, x: 0.8, y: 1.08, ry: Math.PI / 2, rz: Math.PI / 2, sz: 0.25 },
      { geo: Co(0.56, 0.4, 3), color: 0x8a4a32, x: -0.8, y: 1.08, ry: -Math.PI / 2, rz: -Math.PI / 2, sz: 0.25 },
      { geo: B(0.5, 0.6, 0.04), color: 0x3a2418, y: 0.3, z: 0.56 },
      { geo: B(0.04, 0.6, 0.04), color: 0xe8dcc0, x: -0.13, y: 0.3, z: 0.58, rz: 0.75 },
      { geo: B(0.04, 0.6, 0.04), color: 0xe8dcc0, x: 0.13, y: 0.3, z: 0.58, rz: -0.75 },
      { geo: C(0.32, 0.36, 0.5, 8), color: 0xd8b850, x: 1.15, y: 0.25, z: 0.3 },
      { geo: Co(0.33, 0.25, 8), color: 0xc8a840, x: 1.15, y: 0.62, z: 0.3 },
      { geo: B(0.5, 0.14, 0.18), color: 0x6a4a2e, x: -1.05, y: 0.07, z: 0.4 },
      { geo: B(0.44, 0.03, 0.12), color: 0x5a8ab0, x: -1.05, y: 0.13, z: 0.4 },
    ]),
    // La cerca de estacas: un poste y dos travesaños atados hasta el siguiente.
    estaca: fundir([
      { geo: C(0.05, 0.06, 1.05, 5), color: 0x7a5a3a, y: 0.52 },
      { geo: Co(0.05, 0.12, 5), color: 0x6a4a2e, y: 1.1 },
    ]),
    // La pirca: una cerca baja de piedra seca, piedras apiladas sin argamasa.
    pirca: fundir([
      { geo: B(0.92, 0.22, 0.42), color: 0x8f877a, y: 0.11 },
      ...[[-0.32, 0.3], [0.02, 0.31], [0.33, 0.29], [-0.16, 0.5], [0.18, 0.5], [0.0, 0.66]].map(([x, y], k) => ({
        geo: Do(0.15 + (k % 3) * 0.02),
        color: [0x9a948a, 0x8b867d, 0xa8a296, 0x7a756d][k % 4],
        x,
        y,
        rx: k,
        rz: k * 0.7,
        sz: 1.25,
      })),
    ]),
    travesano: fundir([
      { geo: B(0.92, 0.06, 0.05), color: 0x8a6a44, y: 0.4 },
      { geo: B(0.92, 0.06, 0.05), color: 0x8a6a44, y: 0.78 },
    ]),
    // Un paño de muralla de piedra, con almenas, y su torreón redondo.
    muro: fundir([
      { geo: B(1.0, 1.7, 0.5), color: 0xa59d8f, y: 0.85 },
      { geo: B(1.02, 0.12, 0.56), color: 0x8f877a, y: 0.3 },
      { geo: B(1.02, 0.08, 0.54), color: 0xb3ab9c, y: 1.72 },
      { geo: B(0.24, 0.26, 0.14), color: 0xa59d8f, x: -0.3, y: 1.89, z: 0.18 },
      { geo: B(0.24, 0.26, 0.14), color: 0xa59d8f, x: 0.3, y: 1.89, z: 0.18 },
      { geo: B(0.24, 0.26, 0.14), color: 0xa59d8f, x: 0, y: 1.89, z: -0.18 },
      { geo: B(0.3, 0.2, 0.52), color: 0x968e80, x: 0.2, y: 0.6, sz: 1.01 },
      { geo: B(0.36, 0.18, 0.52), color: 0xb0a898, x: -0.25, y: 1.2, sz: 1.01 },
    ]),
    torreon: fundir([
      { geo: C(0.62, 0.7, 2.7, 10), color: 0xa59d8f, y: 1.35 },
      { geo: C(0.72, 0.66, 0.2, 10), color: 0xb3ab9c, y: 2.78 },
      ...[0, 1, 2, 3, 4, 5, 6, 7].map((k) => ({ geo: B(0.2, 0.28, 0.16), color: 0xa59d8f, x: Math.cos((k * Math.PI) / 4) * 0.6, y: 3.0, z: Math.sin((k * Math.PI) / 4) * 0.6, ry: -(k * Math.PI) / 4 })),
      { geo: B(0.1, 0.32, 0.04), color: 0x2a2622, y: 1.9, z: 0.66 },
      { geo: B(0.1, 0.32, 0.04), color: 0x2a2622, y: 1.9, z: -0.66 },
    ]),
    // La catapulta: bastidor con ruedas, el brazo cargado con su piedra.
    catapulta: fundir([
      { geo: B(1.1, 0.12, 0.12), color: 0x6a4a2e, y: 0.32, z: -0.28 },
      { geo: B(1.1, 0.12, 0.12), color: 0x6a4a2e, y: 0.32, z: 0.28 },
      { geo: B(0.12, 0.1, 0.62), color: 0x6a4a2e, x: -0.45, y: 0.32 },
      { geo: B(0.12, 0.1, 0.62), color: 0x6a4a2e, x: 0.45, y: 0.32 },
      ...[[-0.4, -0.38], [0.4, -0.38], [-0.4, 0.38], [0.4, 0.38]].map(([x, z]) => ({ geo: C(0.22, 0.22, 0.07, 10), color: 0x5a3d22, x, y: 0.22, z, rx: Math.PI / 2 })),
      { geo: B(0.09, 0.7, 0.09), color: 0x7a5534, x: 0.1, y: 0.7, z: -0.22 },
      { geo: B(0.09, 0.7, 0.09), color: 0x7a5534, x: 0.1, y: 0.7, z: 0.22 },
      { geo: B(0.09, 0.09, 0.53), color: 0x7a5534, x: 0.1, y: 1.0 },
      { geo: C(0.035, 0.035, 0.5, 6), color: 0x8a7a5a, x: -0.1, y: 0.5, rx: Math.PI / 2 },
      { geo: B(0.8, 0.08, 0.08), color: 0x8a6440, x: -0.42, y: 0.54, rz: 0.06 },
      { geo: B(0.22, 0.08, 0.22), color: 0x5a3d22, x: -0.8, y: 0.54 },
      { geo: Do(0.11), color: 0x8b867d, x: -0.8, y: 0.66 },
      { geo: B(0.3, 0.3, 0.3), color: 0x7a756d, x: 0.42, y: 0.55 },
    ]),
    llama: fundir([
      { geo: Co(0.2, 0.55, 6), color: 0xffffff, y: 0.28 },
      { geo: Co(0.11, 0.38, 5), color: 0xfff0a0, y: 0.25, x: 0.05 },
    ]),
    humo: fundir([{ geo: Es(0.16, 6, 4), color: 0xffffff }]),
  };
}

const TIPOS = ['choza', 'casa', 'casapiedra', 'casatejas', 'hoguera', 'campo', 'corral', 'gallinero', 'granja', 'puente', 'almacen', 'horno', 'archivo', 'mercado', 'establo', 'taller', 'templo', 'plaza', 'ruina', 'obra'];

const suaveP = (u) => u * u * (3 - 2 * u);

export class Edificios3D {
  constructor(escena, terreno) {
    this.escena = escena;
    this.terreno = terreno;
    this.geo = modelos();
    this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 });
    this.matLlama = new THREE.MeshBasicMaterial({ vertexColors: true, color: 0xffa13a });
    this.matHumo = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, transparent: true, opacity: 0.45, roughness: 1, depthWrite: false });
    this.im = {};
    this.hogueras = [];
    this.hornos = [];
    this.corrales = [];
    this.fuegos = [];
  }

  actualizar(d) {
    const tr = this.terreno;
    const im = this.im;
    for (const k of TIPOS) instancias(this.escena, im, `ed-${k}`, this.geo[k], this.mat, k === 'campo' ? 2500 : k === 'ruina' ? 1500 : 600);
    const n = Object.fromEntries(TIPOS.map((k) => [k, 0]));
    const cultivos = instancias(this.escena, im, 'cultivos', this.geo.cultivo, this.mat, 40000);
    const tronquitos = instancias(this.escena, im, 'empalizadas', this.geo.tronquito, this.mat, 8000);
    const torres = instancias(this.escena, im, 'torres', this.geo.torre, this.mat, 200);
    const muros = instancias(this.escena, im, 'muros', this.geo.muro, this.mat, 1500);
    const estacas = instancias(this.escena, im, 'estacas', this.geo.estaca, this.mat, 2000);
    const pircas = instancias(this.escena, im, 'pircas', this.geo.pirca, this.mat, 2000);
    let nPirca = 0;
    const travesanos = instancias(this.escena, im, 'travesanos', this.geo.travesano, this.mat, 2000);
    let nEstaca = 0;
    let nTrav = 0;
    const torreones = instancias(this.escena, im, 'torreones', this.geo.torreon, this.mat, 300);
    const vigias = instancias(this.escena, im, 'torresVigia', this.geo.torreVigia, this.mat, 200);
    const vigiasPiedra = instancias(this.escena, im, 'torresPiedra', this.geo.torrePiedra, this.mat, 200);
    const hojas = instancias(this.escena, im, 'hojas', this.geo.hoja, this.mat, 300);
    const adoquines = instancias(this.escena, im, 'adoquines', this.geo.adoquin, this.mat, 8000);
    let nVigia = 0;
    let nVigiaP = 0;
    let nAdoq = 0;
    this.puertas = [];
    const catapultas = instancias(this.escena, im, 'catapultas', this.geo.catapulta, this.mat, 120);
    let nMuro = 0;
    let nTorreon = 0;
    let nCata = 0;
    let nCult = 0;
    let nTron = 0;
    let nTorre = 0;
    this.hogueras = [];
    this.hornos = [];
    this.corrales = [];
    const color = new THREE.Color();
    const colorAux = new THREE.Color();
    const ponerEd = (tipo, e, ry = 0, sy = 1) => {
      const ed = im[`ed-${tipo}`];
      if (n[tipo] >= ed.instanceMatrix.count) return null;
      const [x, z] = tr.aMundo(e.x, e.y);
      const y = tr.alturaEn(x, z);
      colocar(ed, n[tipo]++, x, y, z, ry, 1, sy);
      return [x, y, z];
    };
    for (const r of d.ruinas ?? []) ponerEd('ruina', r, azar(r.x * 31 + r.y));
    /**
     * Lo que rodea una aldea: cerca de estacas, pirca de piedra seca, empalizada o muralla.
     * Con `parte` < 1, solo el tramo ya levantado (se construye desde la puerta, al sur).
     */
    const anillo = (a, tipo, parte, ruina, radioCasillas, nivel = 1) => {
      // Cada vez que alzan la muralla, un cuarto más alta.
      const alza = 1 + 0.28 * (nivel - 1);
      const [cx, cz] = tr.aMundo(a.x, a.y);
      // Cada muro tiene el radio con el que se hizo: crece cuando la aldea lo amplía.
      const radio = T * radioCasillas;
      const paso = tipo === 'muralla' ? 0.95 : tipo === 'empalizada' ? 0.26 : 0.9;
      const total = Math.round((2 * Math.PI * radio) / paso);
      const hueco = tipo === 'empalizada' ? 0.16 : tipo === 'muralla' ? 0.2 : 0.14;
      const gris = (k) => color.set(ruina ? 0x6f6a60 : 0xffffff).multiplyScalar(tipo === 'muralla' || tipo === 'pirca' ? 0.92 + azar(k * 3 + a.id) * 0.16 : 1);
      const hechos = Math.ceil(total * parte);
      for (let j = 0; j < hechos; j++) {
        // Desde la puerta, alternando a un lado y a otro, como se levanta de verdad.
        const k = (Math.round(total / 4) + (j % 2 ? -Math.ceil(j / 2) : Math.ceil(j / 2)) + total) % total;
        const ang = (k / total) * Math.PI * 2;
        if (Math.abs(ang - Math.PI / 2) < hueco) continue;
        const x = cx + Math.cos(ang) * radio;
        const z = cz + Math.sin(ang) * radio;
        const y = tr.alturaEn(x, z);
        if (tipo === 'muralla' && nMuro < 1500) {
          colocar(muros, nMuro, x, y - 0.25, z, -ang - Math.PI / 2, 1, 1.4 * alza);
          muros.setColorAt(nMuro++, gris(k));
        } else if (tipo === 'pirca' && nPirca < 2000) {
          colocar(pircas, nPirca, x, y - 0.05, z, -ang - Math.PI / 2, (2 * Math.PI * radio) / total / 0.92, 1);
          pircas.setColorAt(nPirca++, gris(k));
        } else if (tipo === 'empalizada' && nTron < 8000) {
          colocar(tronquitos, nTron, x, y - 0.05, z, 0, 1, 1.1 + azar(k + a.id) * 0.3);
          tronquitos.setColorAt(nTron++, gris(k));
        } else if (tipo === 'cerca' && nEstaca < 2000) {
          colocar(estacas, nEstaca, x, y - 0.05, z, azar(k + a.id) * 3, 1, 0.9 + azar(k * 3 + a.id) * 0.2);
          estacas.setColorAt(nEstaca++, gris(k));
          // El travesaño hasta la siguiente estaca, si ya está puesta.
          const sig = ((k + 0.5) / total) * Math.PI * 2;
          if (Math.abs(sig - Math.PI / 2) < hueco + 0.06 || nTrav >= 2000 || (parte < 1 && j + 2 >= hechos)) continue;
          const mx = cx + Math.cos(sig) * radio;
          const mz = cz + Math.sin(sig) * radio;
          colocar(travesanos, nTrav, mx, tr.alturaEn(mx, mz) - 0.05, mz, -sig - Math.PI / 2, (2 * Math.PI * radio) / total / 0.92, 1);
          travesanos.setColorAt(nTrav++, gris(k));
        }
      }
      if (parte < 1 || ruina) return;
      // La puerta: dos hojas que se abren hacia dentro de día y se cierran de noche o ante el peligro.
      {
        const alto = ({ cerca: 1.05, pirca: 0.75, empalizada: 1.7, muralla: 2.2 }[tipo] ?? 1) * alza;
        const ancho = hueco * radio;
        for (const lado of [-1, 1]) {
          const ang = Math.PI / 2 + lado * hueco;
          const hx = cx + Math.cos(ang) * radio;
          const hz = cz + Math.sin(ang) * radio;
          const gx = cx + Math.cos(Math.PI / 2) * radio;
          const gz = cz + Math.sin(Math.PI / 2) * radio;
          const cerrada = Math.atan2(-(gz - hz), gx - hx);
          const abierta = Math.atan2(-(cz - hz), cx - hx);
          this.puertas.push({ aldea: a.id, x: hx, y: tr.alturaEn(hx, hz) - 0.03, z: hz, cerrada, abierta, ancho, alto });
        }
      }
      // Torres: dos a la puerta de la empalizada; torreones en la muralla.
      if (tipo === 'empalizada') {
        for (const lado of [-1, 1]) {
          const ang = Math.PI / 2 + lado * 0.24;
          const x = cx + Math.cos(ang) * radio;
          const z = cz + Math.sin(ang) * radio;
          colocar(torres, nTorre++, x, tr.alturaEn(x, z), z, 0, 1);
        }
      } else if (tipo === 'muralla') {
        for (const ang of [Math.PI / 2 - 0.27, Math.PI / 2 + 0.27, 0, Math.PI, -Math.PI / 2]) {
          if (nTorreon >= 300) break;
          const x = cx + Math.cos(ang) * radio;
          const z = cz + Math.sin(ang) * radio;
          colocar(torreones, nTorreon, x, tr.alturaEn(x, z) - 0.2, z, -ang, 1, alza * 1.1);
          torreones.setColorAt(nTorreon++, color.set(0xffffff));
        }
      }
    };
    for (const a of d.aldeas) {
      const ruina = a.abandonada !== null;
      // La casa vieja que se está rehaciendo ya no está: en su sitio, los andamios.
      const enReforma = a.obra?.reforma ? `${a.obra.x},${a.obra.y}` : null;
      for (const e of a.edificios) {
        if (e.tipo === 'cerca' || e.tipo === 'empalizada' || e.tipo === 'muralla' || e.tipo === 'torre' || e.tipo === 'calzada') continue;
        if (enReforma && `${e.x},${e.y}` === enReforma && e.tipo === a.obra.reforma) continue;
        if (e.tipo === 'puente') {
          this.ponerPuente(d, e, ruina, n);
          continue;
        }
        const tipo = ruina && e.tipo !== 'campo' ? 'ruina' : e.tipo;
        if (!TIPOS.includes(tipo)) continue;
        // Las casas miran hacia el centro de la aldea.
        const [ax, az] = tr.aMundo(a.x, a.y);
        const [ex, ez] = tr.aMundo(e.x, e.y);
        const mira = tipo === 'campo' ? 0 : Math.atan2(ax - ex, az - ez) + (azar(e.x * 7 + e.y * 13) - 0.5) * 0.3;
        const pos = ponerEd(tipo, e, mira);
        if (!pos) continue;
        if (tipo === 'hoguera' && !ruina) this.hogueras.push(pos);
        if (tipo === 'horno' && !ruina) this.hornos.push(pos);
        if ((tipo === 'corral' || tipo === 'gallinero') && !ruina) this.corrales.push({ pos, ry: mira, animales: e.animales ?? 0, especie: e.especie ?? (tipo === 'gallinero' ? 'gallina' : 'oveja'), aldea: a.id });
        // El cultivo crece día a día: brotes verdes, matas altas y espigas doradas;
        // tras la siega queda el rastrojo.
        const crece = tipo === 'campo' && !ruina ? (e.crece ?? (e.fase === 1 && d.estacion !== 'invierno' ? { primavera: 0.3, verano: 0.75, 'otoño': 1 }[d.estacion] : null)) : null;
        if (crece !== null || (tipo === 'campo' && e.rastrojo && !ruina)) {
          const rastrojo = crece === null;
          const alto = rastrojo ? 0.34 : 0.14 + crece * 0.95;
          const anchura = rastrojo ? 0.7 : 0.45 + crece * 0.6;
          if (rastrojo) color.set(0xb8a060);
          else color.set(0x6fb04a).lerp(colorAux.set(0xa8b84a), Math.min(1, crece * 1.4)).lerp(colorAux.set(0xdcb53a), Math.max(0, (crece - 0.65) / 0.35));
          for (let fx = 0; fx < 5; fx++) {
            for (let fz = 0; fz < 5; fz++) {
              if (nCult >= 40000) break;
              const x = pos[0] + (fx - 2) * 0.36 + (azar(fx * 7 + fz + e.x) - 0.5) * 0.08;
              const z = pos[2] + (fz - 2) * 0.33;
              const v = 0.85 + azar(fx * 3 + fz * 7 + e.y) * 0.3;
              colocar(cultivos, nCult, x, pos[1] + 0.05, z, azar(fx + fz * 3) * 6, anchura, alto * v);
              cultivos.setColorAt(nCult++, color);
            }
          }
        }
      }
      // Lo que rodea la aldea (lo mejor que tenga) y, si está levantando otro, el tramo ya hecho.
      const hay = (t) => a.edificios.find((e) => e.tipo === t);
      const muralla = !!hay('muralla');
      const muro = hay('muralla') ?? hay('empalizada') ?? hay('cerca');
      const radioDe = (e) => e.radio ?? (e.tipo === 'muralla' ? 3 : 2.7);
      const forma = (e) => (e.tipo === 'cerca' ? (e.material === 'piedra' ? 'pirca' : 'cerca') : e.tipo);
      const obraMuro = !ruina && a.obra && ['cerca', 'empalizada', 'muralla'].includes(a.obra.tipo) ? a.obra : null;
      // Mientras se levanta uno más grande del mismo tipo, el viejo sigue en pie.
      // Si están alzando la muralla, crece en su sitio a medida que avanza la obra.
      const alzando = obraMuro?.alza && muro?.tipo === 'muralla';
      if (muro) anillo(a, forma(muro), 1, ruina, radioDe(muro), (muro.nivel ?? 1) + (alzando ? Math.max(0, obraMuro.progreso) : 0));
      // Torres de vigía sobre el muro, en su ángulo (de madera o de piedra).
      if (muro && !ruina) {
        const [cx, cz] = tr.aMundo(a.x, a.y);
        for (const e of a.edificios) {
          if (e.tipo !== 'torre') continue;
          const x = cx + Math.cos(e.ang ?? 0) * T * radioDe(muro);
          const z = cz + Math.sin(e.ang ?? 0) * T * radioDe(muro);
          if (e.material === 'piedra' && nVigiaP < 200) colocar(vigiasPiedra, nVigiaP++, x, tr.alturaEn(x, z) - 0.1, z, -(e.ang ?? 0));
          else if (nVigia < 200) colocar(vigias, nVigia++, x, tr.alturaEn(x, z) - 0.05, z, -(e.ang ?? 0));
        }
      }
      // Calles empedradas: de la plaza a cada casa, taller o templo, y a la puerta del muro.
      if (!ruina && a.edificios.some((e) => e.tipo === 'calzada')) {
        const [cx, cz] = tr.aMundo(a.x, a.y);
        const destinos = a.edificios.filter((e) => !['campo', 'cerca', 'empalizada', 'muralla', 'torre', 'calzada', 'plaza', 'puente', 'hoguera'].includes(e.tipo)).map((e) => [...tr.aMundo(e.x, e.y), 1.05]);
        if (muro) destinos.push([cx, cz + T * radioDe(muro) + 0.6, 0]);
        for (const [ex, ez, margen] of destinos) {
          const l = Math.hypot(ex - cx, ez - cz);
          if (l < 3.3) continue;
          const ux = (ex - cx) / l;
          const uz = (ez - cz) / l;
          const ry = Math.atan2(-uz, ux) + Math.PI / 2;
          for (let s = 2.9; s < l - margen && nAdoq < 8000; s += 0.62) {
            const x = cx + ux * s;
            const z = cz + uz * s;
            colocar(adoquines, nAdoq, x, tr.alturaEn(x, z) - 0.005, z, ry);
            adoquines.setColorAt(nAdoq++, color.setRGB(0.62, 0.59, 0.53).multiplyScalar(0.9 + azar(nAdoq * 7) * 0.2));
          }
        }
      }
      if (obraMuro && !alzando) anillo(a, forma(obraMuro), Math.max(0.06, obraMuro.progreso), false, radioDe(obraMuro) + (muro && Math.abs(radioDe(muro) - radioDe(obraMuro)) < 0.3 ? 0.35 : 0));
      // Catapultas junto a la aldea, en cuanto saben hacerlas (más cuanto más grande).
      if (!ruina && a.conocidos?.includes('catapulta')) {
        // En casillas libres de tierra firme alrededor de la aldea, apuntando hacia fuera.
        const ocupadas = new Set(a.edificios.map((e) => e.y * d.ancho + e.x));
        let quedan = a.poblacion > 40 ? 2 : 1;
        // Con muralla, fuera de ella, para no meterlas en el muro.
        const rmin = muralla ? radioDe(hay('muralla')) + 1.3 : 1.9;
        const sitios = [];
        for (let dy = -7; dy <= 7; dy++) {
          for (let dx = -7; dx <= 7; dx++) {
            const r = Math.hypot(dx, dy);
            if (r >= rmin && r <= rmin + 2.4) sitios.push([dx, dy, r + azar(a.id * 7 + dx * 13 + dy * 31) * 0.8]);
          }
        }
        sitios.sort((u, v) => u[2] - v[2]);
        for (const [dx, dy] of sitios) {
          if (quedan <= 0 || nCata >= 120) break;
          const tx = a.x + dx;
          const ty = a.y + dy;
          if (tx < 0 || ty < 0 || tx >= d.ancho || ty >= d.alto || ocupadas.has(ty * d.ancho + tx)) continue;
          if (d.terreno[ty * d.ancho + tx] === AGUA || d.terreno[ty * d.ancho + tx] === RIO) continue;
          ocupadas.add(ty * d.ancho + tx);
          const [x, z] = tr.aMundo(tx, ty);
          colocar(catapultas, nCata, x, tr.alturaEn(x, z), z, -Math.atan2(ty - a.y, tx - a.x));
          catapultas.setColorAt(nCata++, color.set(0xffffff));
          quedan--;
        }
      }
      if (a.obra && !ruina && !obraMuro) ponerEd('obra', a.obra, 0, Math.max(0.15, a.obra.progreso) * 1.4);
    }
    this.cementerios(d);
    for (const k of TIPOS) cerrar(im[`ed-${k}`], n[k]);
    cerrar(cultivos, nCult);
    cerrar(tronquitos, nTron);
    cerrar(torres, nTorre);
    cerrar(muros, nMuro);
    cerrar(estacas, nEstaca);
    cerrar(pircas, nPirca);
    cerrar(travesanos, nTrav);
    cerrar(torreones, nTorreon);
    cerrar(vigias, nVigia);
    cerrar(vigiasPiedra, nVigiaP);
    cerrar(adoquines, nAdoq);
    this.apertura ??= new Map();
    cerrar(catapultas, nCata);
    // Incendios forestales: varias llamas por casilla que arde.
    this.fuegos = d.incendios.map((i) => {
      const [x, z] = tr.aMundo(i % d.ancho, Math.floor(i / d.ancho));
      return [x, tr.alturaEn(x, z), z, i];
    });
    instancias(this.escena, im, 'llamas', this.geo.llama, this.matLlama, Math.max(64, this.hogueras.length + this.fuegos.length * 4 + 16), { sombra: false });
    instancias(this.escena, im, 'humo', this.geo.humo, this.matHumo, Math.max(64, this.hornos.length * 4 + this.fuegos.length * 3 + 16), { sombra: false });
  }

  /** El puente cruza el río de través, a la altura de las orillas. */
  ponerPuente(d, e, ruina, n) {
    const tr = this.terreno;
    const im = this.im['ed-puente'];
    if (ruina || n.puente >= im.instanceMatrix.count) return;
    const W = d.ancho;
    const rio = (x, y) => x >= 0 && y >= 0 && x < W && y < d.alto && (d.terreno[y * W + x] === RIO || d.terreno[y * W + x] === AGUA);
    // Si el río corre de este a oeste, el puente va de norte a sur, y al revés.
    const esteOeste = (rio(e.x - 1, e.y) ? 1 : 0) + (rio(e.x + 1, e.y) ? 1 : 0) >= (rio(e.x, e.y - 1) ? 1 : 0) + (rio(e.x, e.y + 1) ? 1 : 0);
    const [x, z] = tr.aMundo(e.x, e.y);
    const [ax, az] = esteOeste ? [x, z - T * 0.75] : [x - T * 0.75, z];
    const [bx, bz] = esteOeste ? [x, z + T * 0.75] : [x + T * 0.75, z];
    const y = Math.max(tr.alturaEn(ax, az), tr.alturaEn(bx, bz)) + 0.12;
    colocar(im, n.puente++, x, y, z, esteOeste ? 0 : Math.PI / 2);
  }

  /** Cada aldea, sus tumbas en filas (las recientes, de tierra removida; las viejas, ya con hierba). */
  cementerios(d) {
    const tr = this.terreno;
    const total = d.aldeas.reduce((s, a) => s + (a.tumbas?.length ?? 0), 0);
    const tumbas = instancias(this.escena, this.im, 'tumbas', this.geo.tumba, this.mat, Math.max(16, total));
    const lapidas = instancias(this.escena, this.im, 'lapidas', this.geo.lapida, this.mat, Math.max(16, total));
    let nt = 0;
    let nl = 0;
    const fresca = new THREE.Color(1, 1, 1);
    const vieja = new THREE.Color(0.8, 1.15, 0.72);
    const color = new THREE.Color();
    for (const a of d.aldeas) {
      if (!a.tumbas?.length) continue;
      const escrita = a.conocidos?.includes('escritura');
      const enCasilla = new Map();
      // Las más recientes primero, hasta 30 por cementerio.
      for (let j = a.tumbas.length - 1; j >= 0; j--) {
        const [x, y, anio] = a.tumbas[j];
        const k = enCasilla.get(y * d.ancho + x) ?? 0;
        if (k >= 30) continue;
        enCasilla.set(y * d.ancho + x, k + 1);
        const [cx, cz] = tr.aMundo(x, y);
        const px = cx + ((k % 5) - 2) * 0.42;
        const pz = cz + (Math.floor(k / 5) - 1) * 0.62;
        const im = escrita ? lapidas : tumbas;
        const i = escrita ? nl++ : nt++;
        colocar(im, i, px, tr.alturaEn(px, pz) - 0.02, pz, (azar(j + a.id) - 0.5) * 0.12);
        im.setColorAt(i, color.copy(fresca).lerp(vieja, Math.min(1, Math.max(0, (d.anio - anio) / 8))));
      }
    }
    cerrar(tumbas, nt);
    cerrar(lapidas, nl);
  }

  animar(t, noche, alarmas) {
    const im = this.im;
    if (!im.llamas) return;
    // Las puertas de los muros: de día abiertas; de noche o con lobos cerca, cerradas.
    if (im.hojas && this.puertas) {
      const dt = Math.min(0.1, Math.max(0, t - (this.tPuertas ?? t)));
      this.tPuertas = t;
      let n = 0;
      for (const p of this.puertas) {
        const quiere = noche > 0.5 || alarmas?.has(p.aldea) ? 0 : 1;
        const antes = this.apertura.get(p.aldea) ?? quiere;
        const ahora = antes + Math.max(-dt * 0.8, Math.min(dt * 0.8, quiere - antes));
        this.apertura.set(p.aldea, ahora);
        let giro = p.abierta - p.cerrada;
        giro = Math.atan2(Math.sin(giro), Math.cos(giro));
        colocar(im.hojas, n++, p.x, p.y, p.z, p.cerrada + giro * suaveP(ahora), p.ancho, p.alto);
      }
      // (colocar escala x e y: ancho de la hoja y alto)
      cerrar(im.hojas, n);
    }
    const brillo = 0.7 + noche * 1.3;
    this.matLlama.color.setRGB(1, 0.55 + 0.1 * Math.sin(t * 9), 0.2).multiplyScalar(brillo);
    let n = 0;
    for (let k = 0; k < this.hogueras.length; k++) {
      const [x, y, z] = this.hogueras[k];
      const s = 0.85 + 0.25 * Math.sin(t * 11 + k * 1.7) + 0.1 * Math.sin(t * 23 + k);
      colocar(im.llamas, n++, x, y + 0.05, z, t * 2 + k, 0.9, s);
    }
    for (const [x, y, z, i] of this.fuegos) {
      for (let k = 0; k < 4; k++) {
        const ox = (azar(i * 3 + k) - 0.5) * T * 0.8;
        const oz = (azar(i * 5 + k) - 0.5) * T * 0.8;
        const s = 1.5 + 0.7 * Math.sin(t * 9 + i + k * 2.1) + azar(i + k) * 0.8;
        colocar(im.llamas, n++, x + ox, y, z + oz, t * 3 + k, 1.4, s);
      }
    }
    cerrar(im.llamas, n);
    n = 0;
    for (const [x, y, z] of this.hornos) {
      for (let k = 0; k < 4; k++) {
        const u = (t * 0.25 + k / 4 + x * 0.01) % 1;
        colocar(im.humo, n++, x + 0.22 + Math.sin(u * 6 + k) * 0.15, y + 0.95 + u * 2.2, z + u * 0.4, 0, 0.6 + u * 1.6);
      }
    }
    for (const [x, y, z, i] of this.fuegos) {
      for (let k = 0; k < 3; k++) {
        const u = (t * 0.18 + k / 3 + azar(i) * 3) % 1;
        colocar(im.humo, n++, x + Math.sin(u * 5 + i) * 0.6, y + 1.5 + u * 7, z + u * 1.5, 0, 2 + u * 5);
      }
    }
    cerrar(im.humo, n);
  }
}
