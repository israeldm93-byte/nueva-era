// El terreno: generación con ruido, recursos que se agotan y vuelven a crecer,
// y búsquedas de la mejor casilla alrededor de una aldea.

import { azar, entero } from './azar.ts';
import { AGUA, BOSQUE, CAPACIDAD, CAPAS, COLINA, MONTANA, ORILLA, PRADERA, TEMPORADA } from './catalogo.ts';
import type { Aldea, Mundo } from './tipos.ts';

const suave = (t: number) => t * t * (3 - 2 * t);
const r2 = (x: number) => Math.round(x * 100) / 100;

function ruido(ancho: number, alto: number, paso: number): number[] {
  const gw = Math.ceil(ancho / paso) + 2;
  const gh = Math.ceil(alto / paso) + 2;
  const g: number[] = [];
  for (let i = 0; i < gw * gh; i++) g.push(azar());
  const out: number[] = [];
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const gx = x / paso;
      const gy = y / paso;
      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const fx = suave(gx - x0);
      const fy = suave(gy - y0);
      const a = g[y0 * gw + x0] + (g[y0 * gw + x0 + 1] - g[y0 * gw + x0]) * fx;
      const b = g[(y0 + 1) * gw + x0] + (g[(y0 + 1) * gw + x0 + 1] - g[(y0 + 1) * gw + x0]) * fx;
      out.push(a + (b - a) * fy);
    }
  }
  return out;
}

function fbm(ancho: number, alto: number): number[] {
  const a = ruido(ancho, alto, 16);
  const b = ruido(ancho, alto, 8);
  const c = ruido(ancho, alto, 4);
  return a.map((v, i) => v * 0.55 + b[i] * 0.3 + c[i] * 0.15);
}

const cuantil = (orden: number[], q: number) => orden[Math.min(orden.length - 1, Math.floor(orden.length * q))];

export function generarTerreno(ancho: number, alto: number): { terreno: number[]; recursos: Record<string, number[]> } {
  const n = ancho * alto;
  const base = fbm(ancho, alto);
  const humedad = fbm(ancho, alto);
  const altura = base.map((v, i) => {
    const dx = ((i % ancho) / (ancho - 1)) * 2 - 1;
    const dy = (Math.floor(i / ancho) / (alto - 1)) * 2 - 1;
    const d = Math.max(Math.abs(dx), Math.abs(dy));
    return v - 0.4 * d * d * d;
  });
  const orden = altura.slice().sort((a, b) => a - b);
  const qAgua = cuantil(orden, 0.24);
  const qOrilla = cuantil(orden, 0.3);
  const qColina = cuantil(orden, 0.84);
  const qMontana = cuantil(orden, 0.94);
  const humedadTierra = humedad.filter((_, i) => altura[i] >= qOrilla && altura[i] < qColina).sort((a, b) => a - b);
  const qBosque = cuantil(humedadTierra, 0.52);

  const terreno: number[] = altura.map((e, i) => {
    if (e < qAgua) return AGUA;
    if (e < qOrilla) return ORILLA;
    if (e >= qMontana) return MONTANA;
    if (e >= qColina) return COLINA;
    return humedad[i] >= qBosque ? BOSQUE : PRADERA;
  });

  const recursos: Record<string, number[]> = {};
  for (const capa of CAPAS) {
    recursos[capa] = terreno.map((t) => r2(CAPACIDAD[capa][t] * (0.6 + 0.4 * azar())));
  }

  // Vetas de mineral en colinas y montañas.
  const rocosas: number[] = [];
  for (let i = 0; i < n; i++) if (terreno[i] === COLINA || terreno[i] === MONTANA) rocosas.push(i);
  const vetas: [string, number, number][] = [
    ['malaquita', 6, 50],
    ['casiterita', 4, 35],
    ['hematites', 6, 60],
  ];
  for (const [mineral, cuantas, cantidad] of vetas) {
    for (let k = 0; k < cuantas && rocosas.length; k++) {
      const c = rocosas[entero(rocosas.length)];
      const cx = c % ancho;
      const cy = Math.floor(c / ancho);
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const x = cx + dx;
          const y = cy + dy;
          if (x < 0 || y < 0 || x >= ancho || y >= alto) continue;
          const i = y * ancho + x;
          if (terreno[i] !== COLINA && terreno[i] !== MONTANA) continue;
          if (dx * dx + dy * dy > 9 || azar() < 0.35) continue;
          recursos[mineral][i] = r2(cantidad * (0.5 + 0.5 * azar()));
        }
      }
    }
  }
  return { terreno, recursos };
}

/** Los recursos vuelven a crecer. Se llama cada `k` días. */
export function recrecer(m: Mundo, estacion: number, k: number): void {
  const R = m.recursos;
  const n = m.terreno.length;
  const bayas = TEMPORADA.bayas[estacion] * m.clima;
  const semillas = TEMPORADA.semillas[estacion] * m.clima;
  for (let i = 0; i < n; i++) {
    const t = m.terreno[i];
    if (t === AGUA) {
      const cap = CAPACIDAD.peces[t];
      const v = R.peces[i];
      if (v < cap) R.peces[i] = r2(Math.min(cap, v + 0.02 * k * v * (1 - v / cap) + 0.01 * k));
      continue;
    }
    crecer(R.madera, i, CAPACIDAD.madera[t], 0.0015 * k);
    crecer(R.fibra, i, CAPACIDAD.fibra[t], 0.01 * k);
    crecer(R.hierbas, i, CAPACIDAD.hierbas[t], 0.006 * k);
    crecer(R.arcilla, i, CAPACIDAD.arcilla[t], 0.0005 * k);
    acercar(R.bayas, i, CAPACIDAD.bayas[t] * bayas, 0.06 * k);
    acercar(R.semillas, i, CAPACIDAD.semillas[t] * semillas, 0.06 * k);
    const cap = CAPACIDAD.caza[t];
    const v = R.caza[i];
    if (cap > 0 && v < cap) R.caza[i] = r2(Math.min(cap, v + 0.006 * k * v * (1 - v / cap) + 0.002 * k));
  }
}

function crecer(capa: number[], i: number, cap: number, ritmo: number): void {
  if (capa[i] < cap) capa[i] = r2(Math.min(cap, capa[i] + cap * ritmo));
}

function acercar(capa: number[], i: number, objetivo: number, ritmo: number): void {
  capa[i] = r2(capa[i] + (objetivo - capa[i]) * Math.min(1, ritmo));
}

const anillos = new Map<number, [number, number, number][]>();

/** Desplazamientos dentro de un círculo, del más cercano al más lejano. */
export function anillo(radio: number): [number, number, number][] {
  let r = anillos.get(radio);
  if (!r) {
    r = [];
    for (let dy = -radio; dy <= radio; dy++) {
      for (let dx = -radio; dx <= radio; dx++) {
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d <= radio + 0.01) r.push([dx, dy, d]);
      }
    }
    r.sort((a, b) => a[2] - b[2] || a[1] - b[1] || a[0] - b[0]);
    anillos.set(radio, r);
  }
  return r;
}

/** La casilla con mejor puntuación en un radio; -1 si ninguna puntúa por encima de 0. */
export function mejorCasilla(m: Mundo, cx: number, cy: number, radio: number, puntua: (i: number, d: number) => number): number {
  let mejor = -1;
  let max = 0;
  for (const [dx, dy, d] of anillo(radio)) {
    const x = cx + dx;
    const y = cy + dy;
    if (x < 0 || y < 0 || x >= m.ancho || y >= m.alto) continue;
    const i = y * m.ancho + x;
    const v = puntua(i, d);
    if (v > max) {
      max = v;
      mejor = i;
    }
  }
  return mejor;
}

export function hayCerca(m: Mundo, cx: number, cy: number, radio: number, cumple: (i: number) => boolean): boolean {
  for (const [dx, dy] of anillo(radio)) {
    const x = cx + dx;
    const y = cy + dy;
    if (x < 0 || y < 0 || x >= m.ancho || y >= m.alto) continue;
    if (cumple(y * m.ancho + x)) return true;
  }
  return false;
}

/** Lo bueno que es un sitio para vivir: comida, madera, agua y piedra cerca. */
export function puntuarSitio(m: Mundo, x: number, y: number): number {
  const t = m.terreno[y * m.ancho + x];
  if (t === AGUA || t === MONTANA) return 0;
  const R = m.recursos;
  let s = 0;
  let agua = false;
  let piedra = false;
  for (const [dx, dy, d] of anillo(5)) {
    const xx = x + dx;
    const yy = y + dy;
    if (xx < 0 || yy < 0 || xx >= m.ancho || yy >= m.alto) continue;
    const i = yy * m.ancho + xx;
    const f = 1 / (1 + 0.15 * d);
    s += f * (R.bayas[i] + R.semillas[i] + R.caza[i] * 4 + R.madera[i] * 0.15 + R.fibra[i] * 0.2 + R.peces[i] * 0.2);
    if (m.terreno[i] === AGUA && d <= 2.5) agua = true;
    if ((m.terreno[i] === COLINA || m.terreno[i] === MONTANA) && d <= 5) piedra = true;
  }
  return s + (agua ? 40 : 0) + (piedra ? 15 : 0);
}

/** El mejor sitio libre para fundar una aldea, lejos de las demás. */
export function buscarSitio(
  m: Mundo,
  desde: { x: number; y: number } | null,
  min: number,
  max: number,
  ignorar: number | null = null,
): { x: number; y: number } | null {
  const vivas = m.aldeas.filter((a) => a.abandonada === null && a.id !== ignorar);
  let mejor: { x: number; y: number } | null = null;
  let mejorP = 0;
  for (let y = 2; y < m.alto - 2; y++) {
    for (let x = 2; x < m.ancho - 2; x++) {
      if (desde) {
        const d = Math.hypot(x - desde.x, y - desde.y);
        if (d < min || d > max) continue;
      }
      if (vivas.some((a) => Math.hypot(a.x - x, a.y - y) < min)) continue;
      const p = puntuarSitio(m, x, y);
      if (p > mejorP) {
        mejorP = p;
        mejor = { x, y };
      }
    }
  }
  return mejor;
}

const DIRECCIONES = ['el este', 'el sureste', 'el sur', 'el suroeste', 'el oeste', 'el noroeste', 'el norte', 'el noreste'];

export function direccion(desde: Aldea, x: number, y: number): string {
  const ang = Math.atan2(y - desde.y, x - desde.x);
  const k = (Math.round(ang / (Math.PI / 4)) + 8) % 8;
  return DIRECCIONES[k];
}
