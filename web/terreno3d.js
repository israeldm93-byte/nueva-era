// El terreno en 3D: relieve continuo a partir de la altura de cada casilla, colores
// según el bioma, la estación, el frío del norte y la pendiente (roca en las laderas
// y nieve en las cumbres), el agua del mar y los lagos, el agua de los ríos y las
// crecidas, y las tierras quemadas por los incendios.

import * as THREE from 'three';
import {
  AGUA,
  BOSQUE,
  COLINA,
  DESIERTO,
  ESTEPA,
  MONTANA,
  ORILLA,
  PANTANO,
  PRADERA,
  RIO,
  S,
  T,
  acotar,
  alturaRelieve,
  azar,
} from './util3d.js?v=__MOTOR__';

const c = (hex) => new THREE.Color(hex);
const COLOR = {
  arena: c(0xd9c58e),
  arenaFria: c(0xa7a299),
  arenaCalida: c(0xe9d7a3),
  pradera: c(0x7db04a),
  praderaFria: c(0x76a05c),
  praderaSeca: c(0xa4b552),
  bosque: c(0x3d7634),
  bosqueFrio: c(0x395f3c),
  colina: c(0x93895c),
  roca: c(0x8b867e),
  rocaOscura: c(0x6c675f),
  rio: c(0x6c8c50),
  pantano: c(0x566f3e),
  estepa: c(0xc6b66a),
  estepaFria: c(0xa6a07c),
  desierto: c(0xe4d09a),
  fondo: c(0x8a9a82),
  fondoHondo: c(0x355a63),
  nieve: c(0xf3f5f7),
  otono: c(0xc9a14a),
  ceniza: c(0x3b3631),
  barro: c(0x6f6847),
};

export class Terreno3D {
  constructor(escena) {
    this.escena = escena;
    this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0 });
    this.matRio = new THREE.MeshStandardMaterial({ color: 0x3f93c8, transparent: true, opacity: 0.88, roughness: 0.3, metalness: 0.05 });
    this.matCrecida = new THREE.MeshStandardMaterial({ color: 0x7d7650, transparent: true, opacity: 0.8, roughness: 0.4, depthWrite: false });
  }

  /** Centro de una casilla en el mundo 3D. */
  aMundo(tx, ty) {
    return [this.ox + tx * T + T / 2, this.oz + ty * T + T / 2];
  }

  /** De vuelta: la casilla bajo un punto del mundo. */
  aCasilla(wx, wz) {
    return [Math.floor((wx - this.ox) / T), Math.floor((wz - this.oz) / T)];
  }

  construir(d) {
    const W = d.ancho;
    const H = d.alto;
    this.W = W;
    this.H = H;
    this.ox = (-W * T) / 2;
    this.oz = (-H * T) / 2;
    this.terreno = d.terreno;
    this.relieve = d.relieve;
    // Altura de cada casilla (los ríos van hundidos en su cauce).
    const bruta = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) bruta[i] = alturaRelieve(d.relieve[i]);
    // Se suavizan los escalones entre casillas de tierra (sin tocar el agua ni los cauces).
    const hc = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) {
      const t = d.terreno[i];
      if (t === AGUA || t === RIO) {
        hc[i] = bruta[i] - (t === RIO ? 0.45 : 0);
        continue;
      }
      const x = i % W;
      const y = (i - x) / W;
      let s = 0;
      let k = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          const j = yy * W + xx;
          if (d.terreno[j] === AGUA) continue;
          s += bruta[j];
          k++;
        }
      }
      hc[i] = 0.45 * bruta[i] + 0.55 * (s / k);
    }
    this.hCasilla = hc;
    const n = W * S;
    const m = H * S;
    this.fila = n + 1;
    const geo = new THREE.PlaneGeometry(W * T, H * T, n, m);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    this.alturas = new Float32Array((n + 1) * (m + 1));
    for (let vz = 0; vz <= m; vz++) {
      for (let vx = 0; vx <= n; vx++) {
        const i = vz * (n + 1) + vx;
        let h = this.interpolar(hc, vx / S - 0.5, vz / S - 0.5);
        // Algo de rugosidad, más en lo alto.
        const r = azar(i * 3.1) - 0.5;
        h += r * (h > 2 ? 0.35 : 0.08);
        this.alturas[i] = h;
        pos.setY(i, h);
      }
    }
    geo.computeVertexNormals();
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3));
    this.geo = geo;
    if (this.malla) {
      this.escena.remove(this.malla);
      this.malla.geometry.dispose();
    }
    this.malla = new THREE.Mesh(geo, this.mat);
    this.malla.receiveShadow = true;
    this.escena.add(this.malla);

    if (!this.agua) {
      const ga = new THREE.PlaneGeometry(W * T + 700, H * T + 700, 90, 70);
      ga.rotateX(-Math.PI / 2);
      this.baseAgua = Float32Array.from(ga.attributes.position.array);
      this.agua = new THREE.Mesh(
        ga,
        new THREE.MeshStandardMaterial({ color: 0x2f78a8, transparent: true, opacity: 0.82, roughness: 0.38, metalness: 0.08, flatShading: true }),
      );
      this.agua.position.y = -0.05;
      this.agua.receiveShadow = true;
      this.escena.add(this.agua);
    }
    this.construirRios(d);
    this.pintado = '';
  }

  interpolar(campo, u, v) {
    const W = this.W;
    const H = this.H;
    const x0 = Math.floor(u);
    const z0 = Math.floor(v);
    const fx = u - x0;
    const fz = v - z0;
    const a = (x, z) => campo[acotar(z, 0, H - 1) * W + acotar(x, 0, W - 1)];
    const h0 = a(x0, z0) + (a(x0 + 1, z0) - a(x0, z0)) * fx;
    const h1 = a(x0, z0 + 1) + (a(x0 + 1, z0 + 1) - a(x0, z0 + 1)) * fx;
    return h0 + (h1 - h0) * fz;
  }

  /** Altura del suelo en un punto del mundo (sin bajar del nivel del agua si se pide). */
  alturaEn(wx, wz, sobreAgua = true) {
    const n = this.W * S;
    const gx = Math.min(n - 0.001, Math.max(0, (wx - this.ox) / (T / S)));
    const gz = Math.min(this.H * S - 0.001, Math.max(0, (wz - this.oz) / (T / S)));
    const x0 = Math.floor(gx);
    const z0 = Math.floor(gz);
    const fx = gx - x0;
    const fz = gz - z0;
    const f = this.fila;
    const h = this.alturas;
    const a = h[z0 * f + x0] + (h[z0 * f + x0 + 1] - h[z0 * f + x0]) * fx;
    const b = h[(z0 + 1) * f + x0] + (h[(z0 + 1) * f + x0 + 1] - h[(z0 + 1) * f + x0]) * fx;
    const y = a + (b - a) * fz;
    return sobreAgua ? Math.max(-0.05, y) : y;
  }

  /** Agua de los ríos: cada tramo a su altura, unido con los vecinos para que el agua baje en pendiente. */
  construirRios(d) {
    const W = this.W;
    const H = this.H;
    const rio = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d.terreno[y * W + x] === RIO;
    const superficie = (x, y) => alturaRelieve(d.relieve[y * W + x]) - 0.2;
    // Altura de cada esquina: la media de los tramos de río que la tocan.
    const esquina = (cx, cy) => {
      let s = 0;
      let k = 0;
      for (const [x, y] of [
        [cx - 1, cy - 1],
        [cx, cy - 1],
        [cx - 1, cy],
        [cx, cy],
      ]) {
        if (!rio(x, y)) continue;
        s += superficie(x, y);
        k++;
      }
      return s / k;
    };
    const pos = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!rio(x, y)) continue;
        const x0 = this.ox + x * T;
        const z0 = this.oz + y * T;
        const h00 = esquina(x, y);
        const h10 = esquina(x + 1, y);
        const h01 = esquina(x, y + 1);
        const h11 = esquina(x + 1, y + 1);
        pos.push(x0, h00, z0, x0, h01, z0 + T, x0 + T, h10, z0);
        pos.push(x0 + T, h10, z0, x0, h01, z0 + T, x0 + T, h11, z0 + T);
      }
    }
    if (this.rios) {
      this.escena.remove(this.rios);
      this.rios.geometry.dispose();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    this.rios = new THREE.Mesh(g, this.matRio);
    this.rios.receiveShadow = true;
    this.escena.add(this.rios);
  }

  /** Colores: bioma, estación, frío del norte, cenizas, crecidas, pendiente y nieve en lo alto. */
  pintar(d) {
    const W = this.W;
    const H = this.H;
    const clave = `${d.estacion}|${d.cenizas.length}|${d.inundadas.length}|${d.cenizas.reduce((s, [i, a]) => s + i + Math.floor(a / 30), 0)}`;
    if (clave === this.pintado) return;
    this.pintado = clave;
    const invierno = d.estacion === 'invierno';
    const otono = d.estacion === 'otoño';
    const ceniza = new Map(d.cenizas.map(([i, a]) => [i, a]));
    const anegada = new Set(d.inundadas);
    const r = new Float32Array(W * H);
    const g = new Float32Array(W * H);
    const b = new Float32Array(W * H);
    const nieveCasilla = new Float32Array(W * H);
    const col = new THREE.Color();
    for (let i = 0; i < W * H; i++) {
      const t = d.terreno[i];
      const y = Math.floor(i / W);
      // 0 en el norte (frío), 1 en el sur (cálido).
      const lat = y / (H - 1);
      const frio = acotar((0.45 - lat) / 0.3, 0, 1);
      const calor = acotar((lat - 0.65) / 0.3, 0, 1);
      switch (t) {
        case AGUA:
          col.copy(COLOR.fondo).lerp(COLOR.fondoHondo, acotar(-d.relieve[i] / 40, 0, 1));
          break;
        case ORILLA:
          col.copy(COLOR.arena).lerp(COLOR.arenaFria, frio).lerp(COLOR.arenaCalida, calor);
          break;
        case PRADERA:
          col.copy(COLOR.pradera).lerp(COLOR.praderaFria, frio).lerp(COLOR.praderaSeca, calor * 0.7);
          break;
        case BOSQUE:
          col.copy(COLOR.bosque).lerp(COLOR.bosqueFrio, frio);
          break;
        case COLINA:
          col.copy(COLOR.colina);
          break;
        case MONTANA:
          col.copy(COLOR.roca);
          break;
        case RIO:
          col.copy(COLOR.rio);
          break;
        case PANTANO:
          col.copy(COLOR.pantano);
          break;
        case ESTEPA:
          col.copy(COLOR.estepa).lerp(COLOR.estepaFria, frio);
          break;
        default:
          col.copy(COLOR.desierto);
      }
      col.offsetHSL(0, 0, (azar(i * 1.7) - 0.5) * 0.06);
      if (otono && (t === PRADERA || t === BOSQUE || t === COLINA)) col.lerp(COLOR.otono, t === PRADERA ? 0.3 : 0.18);
      if (ceniza.has(i)) col.lerp(COLOR.ceniza, acotar(1 - ceniza.get(i) / 240, 0, 1) * 0.85);
      if (anegada.has(i)) col.lerp(COLOR.barro, 0.6);
      // En invierno nieva en el norte y en las tierras altas.
      if (invierno && t !== AGUA && t !== RIO && t !== DESIERTO) nieveCasilla[i] = acotar(1.1 - lat * 1.5, 0, 1) * (t === ORILLA ? 0.5 : 0.9);
      r[i] = col.r;
      g[i] = col.g;
      b[i] = col.b;
    }
    const n = W * S;
    const m = H * S;
    const color = this.geo.attributes.color;
    const normal = this.geo.attributes.normal;
    const roca = COLOR.rocaOscura;
    const nieve = COLOR.nieve;
    for (let vz = 0; vz <= m; vz++) {
      for (let vx = 0; vx <= n; vx++) {
        const i = vz * (n + 1) + vx;
        const u = vx / S - 0.5;
        const v = vz / S - 0.5;
        col.setRGB(this.interpolar(r, u, v), this.interpolar(g, u, v), this.interpolar(b, u, v));
        const h = this.alturas[i];
        // Laderas empinadas: roca desnuda.
        const ny = normal.getY(i);
        if (h > 0.3 && ny < 0.82) col.lerp(roca, acotar((0.82 - ny) * 3, 0, 0.85));
        // Cumbres nevadas todo el año; en invierno, nieve también abajo.
        let blanco = acotar((h - 6.5) / 2.5, 0, 1);
        blanco = Math.max(blanco, this.interpolar(nieveCasilla, u, v) * acotar((h + 0.2) / 1.5, 0, 1));
        if (blanco > 0) col.lerp(nieve, blanco);
        color.setXYZ(i, col.r, col.g, col.b);
      }
    }
    color.needsUpdate = true;
    this.pintarCrecidas(d, anegada);
  }

  pintarCrecidas(d, anegada) {
    if (this.crecidas) {
      this.escena.remove(this.crecidas);
      this.crecidas.geometry.dispose();
      this.crecidas = null;
    }
    if (!anegada.size) return;
    const pos = [];
    for (const i of anegada) {
      const x = i % this.W;
      const y = Math.floor(i / this.W);
      const x0 = this.ox + x * T;
      const z0 = this.oz + y * T;
      const h = this.hCasilla[i] + 0.15;
      pos.push(x0, h, z0, x0, h, z0 + T, x0 + T, h, z0, x0 + T, h, z0, x0, h, z0 + T, x0 + T, h, z0 + T);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    this.crecidas = new THREE.Mesh(g, this.matCrecida);
    this.escena.add(this.crecidas);
  }

  animarAgua(t) {
    const pos = this.agua.geometry.attributes.position;
    const base = this.baseAgua;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const z = base[i * 3 + 2];
      pos.setY(i, Math.sin(x * 0.12 + t * 0.9) * 0.07 + Math.cos(z * 0.1 + t * 0.7) * 0.07);
    }
    pos.needsUpdate = true;
    this.agua.geometry.computeVertexNormals();
  }
}
