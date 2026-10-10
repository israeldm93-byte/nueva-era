// Edificios, campos y fuego: chozas, casas de adobe, hogueras, campos con su cosecha,
// corrales, almacenes, hornos humeantes, la casa de las tablillas, mercados,
// empalizadas con su puerta, obras con andamios, ruinas, e incendios forestales con
// llamas y columnas de humo.

import * as THREE from 'three';
import { B, C, Co, Do, Es, T, azar, cerrar, colocar, fundir, instancias } from './util3d.js?v=__MOTOR__';

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
  return {
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
    llama: fundir([
      { geo: Co(0.2, 0.55, 6), color: 0xffffff, y: 0.28 },
      { geo: Co(0.11, 0.38, 5), color: 0xfff0a0, y: 0.25, x: 0.05 },
    ]),
    humo: fundir([{ geo: Es(0.16, 6, 4), color: 0xffffff }]),
  };
}

const TIPOS = ['choza', 'casa', 'hoguera', 'campo', 'corral', 'almacen', 'horno', 'archivo', 'mercado', 'ruina', 'obra'];

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
    let nCult = 0;
    let nTron = 0;
    let nTorre = 0;
    this.hogueras = [];
    this.hornos = [];
    this.corrales = [];
    const color = new THREE.Color();
    const colorCultivo = { primavera: 0x7ab84f, verano: 0xa8b84a, 'otoño': 0xdcb53a, invierno: 0x8a7a5a };
    const ponerEd = (tipo, e, ry = 0, sy = 1) => {
      const ed = im[`ed-${tipo}`];
      if (n[tipo] >= ed.instanceMatrix.count) return null;
      const [x, z] = tr.aMundo(e.x, e.y);
      const y = tr.alturaEn(x, z);
      colocar(ed, n[tipo]++, x, y, z, ry, 1, sy);
      return [x, y, z];
    };
    for (const r of d.ruinas ?? []) ponerEd('ruina', r, azar(r.x * 31 + r.y));
    for (const a of d.aldeas) {
      const ruina = a.abandonada !== null;
      for (const e of a.edificios) {
        if (e.tipo === 'empalizada') continue;
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
        if (tipo === 'corral' && !ruina) this.corrales.push({ pos, animales: e.animales ?? 0 });
        if (tipo === 'campo' && e.fase === 1 && !ruina && d.estacion !== 'invierno') {
          const alto = d.estacion === 'primavera' ? 0.45 : d.estacion === 'verano' ? 0.9 : 1.05;
          color.set(colorCultivo[d.estacion]);
          for (let fx = 0; fx < 5; fx++) {
            for (let fz = 0; fz < 5; fz++) {
              if (nCult >= 40000) break;
              const x = pos[0] + (fx - 2) * 0.36 + (azar(fx * 7 + fz + e.x) - 0.5) * 0.08;
              const z = pos[2] + (fz - 2) * 0.33;
              colocar(cultivos, nCult, x, pos[1] + 0.05, z, azar(fx + fz * 3) * 6, 1, alto);
              cultivos.setColorAt(nCult++, color);
            }
          }
        }
      }
      if (a.edificios.some((e) => e.tipo === 'empalizada')) {
        const [cx, cz] = tr.aMundo(a.x, a.y);
        const radio = T * (a.poblacion > 40 ? 3.6 : 2.7);
        const total = Math.round((2 * Math.PI * radio) / 0.26);
        for (let k = 0; k < total && nTron < 8000; k++) {
          const ang = (k / total) * Math.PI * 2;
          // Hueco para la puerta, al sur, con dos torres de vigía.
          if (Math.abs(ang - Math.PI / 2) < 0.16) continue;
          const x = cx + Math.cos(ang) * radio;
          const z = cz + Math.sin(ang) * radio;
          colocar(tronquitos, nTron, x, tr.alturaEn(x, z) - 0.05, z, 0, 1, 0.85 + azar(k + a.id) * 0.3);
          tronquitos.setColorAt(nTron++, color.set(ruina ? 0x6f6a60 : 0xffffff));
        }
        if (!ruina) {
          for (const lado of [-1, 1]) {
            const ang = Math.PI / 2 + lado * 0.24;
            const x = cx + Math.cos(ang) * radio;
            const z = cz + Math.sin(ang) * radio;
            colocar(torres, nTorre++, x, tr.alturaEn(x, z), z, 0, 1);
          }
        }
      }
      if (a.obra && !ruina) ponerEd('obra', a.obra, 0, Math.max(0.15, a.obra.progreso) * 1.4);
    }
    this.cementerios(d);
    for (const k of TIPOS) cerrar(im[`ed-${k}`], n[k]);
    cerrar(cultivos, nCult);
    cerrar(tronquitos, nTron);
    cerrar(torres, nTorre);
    // Incendios forestales: varias llamas por casilla que arde.
    this.fuegos = d.incendios.map((i) => {
      const [x, z] = tr.aMundo(i % d.ancho, Math.floor(i / d.ancho));
      return [x, tr.alturaEn(x, z), z, i];
    });
    instancias(this.escena, im, 'llamas', this.geo.llama, this.matLlama, Math.max(64, this.hogueras.length + this.fuegos.length * 4 + 16), { sombra: false });
    instancias(this.escena, im, 'humo', this.geo.humo, this.matHumo, Math.max(64, this.hornos.length * 4 + this.fuegos.length * 3 + 16), { sombra: false });
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

  animar(t, noche) {
    const im = this.im;
    if (!im.llamas) return;
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
