// Animales en 3D: manadas de lobos (con ojos que brillan de noche cuando acechan una
// aldea), osos, ciervos donde hay caza, ovejas en los corrales y aves sobre las
// islas y las costas. Cuatro patas animadas al andar o al correr.

import * as THREE from 'three';
import { AGUA, B, C, Co, Do, Es, Ic, azar, cerrar, entre, fundir, instancias, suave } from './util3d.js?v=__MOTOR__';

function modelos() {
  return {
    lobo: fundir([
      { geo: B(0.62, 0.25, 0.22), color: 0x8b8d92, y: 0, sx: 1 },
      { geo: B(0.24, 0.27, 0.24), color: 0x9ea0a5, x: 0.22, y: 0.02 },
      { geo: B(0.2, 0.18, 0.17), color: 0x8b8d92, x: 0.42, y: 0.12 },
      { geo: B(0.14, 0.09, 0.1), color: 0xb9bbbf, x: 0.56, y: 0.08 },
      { geo: B(0.04, 0.03, 0.04), color: 0x1a1a1a, x: 0.63, y: 0.1 },
      { geo: Co(0.04, 0.1, 4), color: 0x7a7c80, x: 0.4, y: 0.25, z: 0.05 },
      { geo: Co(0.04, 0.1, 4), color: 0x7a7c80, x: 0.4, y: 0.25, z: -0.05 },
      { geo: C(0.035, 0.06, 0.34, 5), color: 0x8b8d92, x: -0.42, y: -0.02, rz: 1.1 },
    ]),
    ojos: fundir([
      { geo: Es(0.022, 5, 4), color: 0xffffff, x: 0.53, y: 0.15, z: 0.05 },
      { geo: Es(0.022, 5, 4), color: 0xffffff, x: 0.53, y: 0.15, z: -0.05 },
    ]),
    oso: fundir([
      { geo: Do(0.36), color: 0x5a3b24, sx: 1.55, sy: 1.0, sz: 1.05 },
      { geo: Do(0.25), color: 0x5e3e26, x: 0.48, y: 0.12 },
      { geo: B(0.14, 0.11, 0.13), color: 0x7a5232, x: 0.68, y: 0.08 },
      { geo: B(0.05, 0.04, 0.05), color: 0x121212, x: 0.76, y: 0.1 },
      { geo: Es(0.06, 5, 4), color: 0x4a301c, x: 0.43, y: 0.33, z: 0.13 },
      { geo: Es(0.06, 5, 4), color: 0x4a301c, x: 0.43, y: 0.33, z: -0.13 },
    ]),
    ciervo: fundir([
      { geo: B(0.58, 0.27, 0.23), color: 0x8a5a33 },
      { geo: B(0.12, 0.34, 0.11), color: 0x8a5a33, x: 0.27, y: 0.22, rz: -0.35 },
      { geo: B(0.22, 0.13, 0.12), color: 0x7a4e2c, x: 0.4, y: 0.4 },
      { geo: B(0.05, 0.05, 0.05), color: 0xf2efe6, x: -0.3, y: 0.07 },
      { geo: C(0.015, 0.02, 0.22, 4), color: 0x4a3420, x: 0.36, y: 0.55, z: 0.06, rx: 0.35 },
      { geo: C(0.015, 0.02, 0.22, 4), color: 0x4a3420, x: 0.36, y: 0.55, z: -0.06, rx: -0.35 },
      { geo: C(0.012, 0.015, 0.12, 4), color: 0x4a3420, x: 0.4, y: 0.6, z: 0.11, rz: -0.6 },
      { geo: C(0.012, 0.015, 0.12, 4), color: 0x4a3420, x: 0.4, y: 0.6, z: -0.11, rz: -0.6 },
    ]),
    oveja: fundir([
      { geo: Ic(0.24, 0), color: 0xf3f0e6, sx: 1.35, sy: 0.95 },
      { geo: B(0.15, 0.15, 0.13), color: 0x3a3330, x: 0.32, y: 0.06 },
      { geo: B(0.06, 0.03, 0.12), color: 0x3a3330, x: 0.3, y: 0.12 },
    ]),
    pata: fundir([{ geo: B(0.06, 0.32, 0.06), color: 0xffffff, y: -0.16 }]),
    ave: fundir([
      { geo: B(0.12, 0.05, 0.06), color: 0xf4f4f4 },
      { geo: B(0.08, 0.015, 0.34), color: 0xe9e9e9, x: -0.01, z: 0.17, rx: 0.3 },
      { geo: B(0.08, 0.015, 0.34), color: 0xe9e9e9, x: -0.01, z: -0.17, rx: -0.3 },
      { geo: Co(0.02, 0.05, 4), color: 0xe0a030, x: 0.08, rz: -Math.PI / 2 },
    ]),
  };
}

const PATAS = {
  lobo: { alto: 0.31, dx: 0.22, dz: 0.08, color: 0x7a7c80, paso: 9 },
  oso: { alto: 0.34, dx: 0.3, dz: 0.16, color: 0x4a301c, paso: 5 },
  ciervo: { alto: 0.4, dx: 0.21, dz: 0.08, color: 0x6e4826, paso: 7 },
  oveja: { alto: 0.24, dx: 0.14, dz: 0.08, color: 0x3a3330, paso: 6 },
};

const M = new THREE.Matrix4();
const P = new THREE.Matrix4();
const L = new THREE.Matrix4();
const Q = new THREE.Quaternion();
const E = new THREE.Euler();
const V = new THREE.Vector3();
const UNO = new THREE.Vector3(1, 1, 1);
const SC = new THREE.Vector3();

export class Fauna3D {
  constructor(escena, terreno) {
    this.escena = escena;
    this.terreno = terreno;
    this.geo = modelos();
    this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 });
    this.matOjos = new THREE.MeshBasicMaterial({ color: 0xffd36b });
    this.im = {};
    this.lobos = [];
    this.osos = [];
    this.ciervos = [];
    this.ovejas = [];
    this.aves = [];
  }

  actualizar(d, corrales) {
    const tr = this.terreno;
    const W = d.ancho;
    // Lobos: cada manada son n lobos alrededor de su posición.
    this.lobos = [];
    this.osos = [];
    for (const f of d.fauna) {
      const [x0, z0] = tr.aMundo(f.px, f.py);
      const [x1, z1] = tr.aMundo(f.x, f.y);
      if (f.tipo === 'oso') {
        if (f.estado !== 'hiberna') this.osos.push({ f, x0, z0, x1, z1, fase: azar(f.id) * 10 });
        continue;
      }
      for (let k = 0; k < f.n; k++) {
        const a = (k / f.n) * Math.PI * 2 + azar(f.id + k);
        const r = k === 0 ? 0 : 0.7 + azar(f.id * 3 + k) * 0.9;
        this.lobos.push({ f, x0, z0, x1, z1, ox: Math.cos(a) * r, oz: Math.sin(a) * r, fase: azar(f.id * 7 + k) * 10, k });
      }
    }
    // Ciervos donde hay caza (decorativos: rondan su sitio).
    this.ciervos = [];
    for (let i = 0; i < d.caza.length && this.ciervos.length < 220; i++) {
      if (d.caza[i] < 2.5 || d.terreno[i] === AGUA || azar(i * 41) > 0.12) continue;
      const [x, z] = tr.aMundo(i % W, Math.floor(i / W));
      this.ciervos.push({ x, z, fase: azar(i) * 100, id: i });
    }
    this.ovejas = [];
    for (const c of corrales) {
      const n = Math.min(7, Math.ceil(c.animales / 3));
      for (let k = 0; k < n; k++) this.ovejas.push({ x: c.pos[0], z: c.pos[2], fase: azar(c.pos[0] + k * 7) * 100, k });
    }
    // Aves sobre las islas y algunas costas.
    if (this.claveAves !== `${d.era}-${d.semilla}`) {
      this.claveAves = `${d.era}-${d.semilla}`;
      this.aves = this.colonias(d);
    }
    const total = this.lobos.length + this.osos.length + this.ciervos.length + this.ovejas.length;
    for (const k of ['lobo', 'oso', 'ciervo', 'oveja']) instancias(this.escena, this.im, k, this.geo[k], this.mat, 64 + Math.ceil(total * 0.2) + (k === 'ciervo' ? 440 : k === 'oveja' ? 200 : 80));
    instancias(this.escena, this.im, 'pata', this.geo.pata, this.mat, 4 * (total + 64));
    instancias(this.escena, this.im, 'ojos', this.geo.ojos, this.matOjos, 120, { sombra: false });
    instancias(this.escena, this.im, 'ave', this.geo.ave, this.mat, Math.max(40, this.aves.length), { sombra: false });
  }

  /** Islas pequeñas (y algún cabo) donde anidan aves. */
  colonias(d) {
    const W = d.ancho;
    const H = d.alto;
    const masa = new Int32Array(W * H).fill(-1);
    const tamanos = [];
    for (let i = 0; i < W * H; i++) {
      if (d.terreno[i] === AGUA || masa[i] >= 0) continue;
      const k = tamanos.length;
      const pila = [i];
      masa[i] = k;
      const casillas = [];
      while (pila.length) {
        const j = pila.pop();
        casillas.push(j);
        const x = j % W;
        const y = (j - x) / W;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          const v = yy * W + xx;
          if (d.terreno[v] !== AGUA && masa[v] < 0) {
            masa[v] = k;
            pila.push(v);
          }
        }
      }
      tamanos.push(casillas);
    }
    const aves = [];
    for (const casillas of tamanos) {
      if (casillas.length > 300 || casillas.length < 3) continue;
      let sx = 0;
      let sy = 0;
      for (const j of casillas) {
        sx += j % W;
        sy += Math.floor(j / W);
      }
      const [x, z] = this.terreno.aMundo(sx / casillas.length, sy / casillas.length);
      const n = Math.min(10, 4 + Math.floor(casillas.length / 6));
      for (let k = 0; k < n; k++) aves.push({ x, z, r: 2 + azar(x + k) * 4, h: 4 + azar(z + k * 3) * 3, v: 0.35 + azar(x * k) * 0.3, fase: azar(k * 13 + x) * 6 });
    }
    return aves;
  }

  /** Un cuadrúpedo: cuerpo, y cuatro patas que se mueven al andar. */
  cuadrupedo(tipo, n, x, y, z, ang, s, andar, t, fase, erguido = 0) {
    const pt = PATAS[tipo];
    E.set(0, ang, erguido);
    Q.setFromEuler(E);
    M.compose(V.set(x, y + pt.alto * s, z), Q, SC.set(s, s, s));
    // Un ligero balanceo al andar.
    const bote = andar ? Math.abs(Math.sin(t * pt.paso + fase)) * 0.03 * s : 0;
    if (bote) M.elements[13] += bote;
    this.im[tipo].setMatrixAt(n, M);
    const patas = this.im.pata;
    const col = this.colorPata ?? (this.colorPata = new THREE.Color());
    col.set(pt.color);
    for (let k = 0; k < 4; k++) {
      const delante = k < 2 ? 1 : -1;
      const lado = k % 2 ? 1 : -1;
      const sw = andar ? Math.sin(t * pt.paso + fase + (k === 0 || k === 3 ? 0 : Math.PI)) * 0.55 : 0;
      E.set(0, 0, sw);
      Q.setFromEuler(E);
      L.compose(V.set(delante * pt.dx, 0.02, lado * pt.dz), Q, UNO);
      P.multiplyMatrices(M, L);
      const j = this.nPatas++;
      patas.setMatrixAt(j, P);
      patas.setColorAt(j, col);
    }
  }

  animar(t, fase, noche) {
    const im = this.im;
    if (!im.lobo) return;
    const tr = this.terreno;
    this.nPatas = 0;
    // Durante el día se van moviendo de donde estaban a donde están hoy.
    const u = suave(Math.min(1, Math.max(0, (fase - 0.05) / 0.6)));
    let n = 0;
    let ojos = 0;
    for (const l of this.lobos) {
      const corre = l.f.estado === 'ataca' || l.f.estado === 'huye';
      const x = entre(l.x0, l.x1, u) + l.ox + Math.sin(t * 0.4 + l.fase) * 0.3;
      const z = entre(l.z0, l.z1, u) + l.oz + Math.cos(t * 0.33 + l.fase) * 0.3;
      const dx = l.x1 - l.x0 + Math.cos(t * 0.4 + l.fase) * 0.12;
      const dz = l.z1 - l.z0 - Math.sin(t * 0.33 + l.fase) * 0.1;
      const ang = Math.atan2(-dz, dx);
      const y = tr.alturaEn(x, z);
      this.cuadrupedo('lobo', n++, x, y, z, ang, 1, u < 1 || corre, t * (corre ? 1.8 : 1), l.fase);
      // De noche, cerca de una aldea, se les ven los ojos.
      if (noche && l.f.estado === 'acecha' && ojos < 120) im.ojos.setMatrixAt(ojos++, M);
    }
    cerrar(im.lobo, n);
    im.ojos.count = ojos;
    im.ojos.instanceMatrix.needsUpdate = true;
    n = 0;
    for (const o of this.osos) {
      const x = entre(o.x0, o.x1, u) + Math.sin(t * 0.2 + o.fase) * 0.4;
      const z = entre(o.z0, o.z1, u) + Math.cos(t * 0.17 + o.fase) * 0.4;
      const ang = Math.atan2(-(o.z1 - o.z0 + 0.01), o.x1 - o.x0 + 0.01);
      const y = tr.alturaEn(x, z);
      // Cuando ataca se pone de pie.
      const erguido = o.f.estado === 'ataca' ? 1.1 + 0.1 * Math.sin(t * 3) : 0;
      this.cuadrupedo('oso', n++, x, y + (erguido ? 0.35 : 0), z, ang, 1.25, !erguido, t, o.fase, erguido);
    }
    cerrar(im.oso, n);
    n = 0;
    for (const c of this.ciervos) {
      const v = t * 0.12 + c.fase;
      const x = c.x + Math.sin(v) * 1.6;
      const z = c.z + Math.cos(v * 0.8) * 1.4;
      const ang = Math.atan2(-(-Math.sin(v * 0.8) * 1.12), Math.cos(v) * 1.6);
      this.cuadrupedo('ciervo', n++, x, tr.alturaEn(x, z), z, ang, 0.9, true, t * 0.8, c.fase);
    }
    cerrar(im.ciervo, n);
    n = 0;
    for (const o of this.ovejas) {
      const v = t * 0.2 + o.fase;
      const x = o.x + Math.sin(v + o.k) * 0.5;
      const z = o.z + Math.cos(v * 1.3 + o.k * 2) * 0.5;
      this.cuadrupedo('oveja', n++, x, tr.alturaEn(x, z), z, -v, 1, Math.sin(v * 3) > 0, t, o.fase);
    }
    cerrar(im.oveja, n);
    cerrar(im.pata, this.nPatas);
    n = 0;
    for (const a of this.aves) {
      const v = t * a.v + a.fase;
      const x = a.x + Math.cos(v) * a.r;
      const z = a.z + Math.sin(v) * a.r;
      E.set(Math.sin(t * 6 + a.fase) * 0.3, -v - Math.PI / 2, 0.25);
      Q.setFromEuler(E);
      M.compose(V.set(x, a.h + Math.sin(t + a.fase) * 0.3, z), Q, SC.set(1.4, 1.4, 1.4));
      im.ave.setMatrixAt(n++, M);
    }
    cerrar(im.ave, n);
  }
}
