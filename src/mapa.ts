// El terreno: generación con ruido, recursos que se agotan y vuelven a crecer,
// y búsquedas de la mejor casilla alrededor de una aldea.

import { azar, entero } from './azar.ts';
import { AGUA, BOSQUE, CAPACIDAD, CAPAS, COLINA, DESIERTO, ESTEPA, MONTANA, ORILLA, PANTANO, PESCABLE, PRADERA, RIO, TEMPORADA } from './catalogo.ts';
import { distancia } from './matematicas.ts';
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

function fbm(ancho: number, alto: number, pasos: number[], pesos: number[]): number[] {
  const capas = pasos.map((p) => ruido(ancho, alto, p));
  const out: number[] = [];
  for (let i = 0; i < ancho * alto; i++) {
    let v = 0;
    for (let k = 0; k < capas.length; k++) v += capas[k][i] * pesos[k];
    out.push(v);
  }
  return out;
}

const cuantil = (orden: number[], q: number) => orden[Math.min(orden.length - 1, Math.floor(orden.length * q))];
const entre01 = (a: number, b: number, x: number) => {
  const t = x <= a ? 0 : x >= b ? 1 : (x - a) / (b - a);
  return t * t * (3 - 2 * t);
};
/** Campana suave: 1 en el centro, 0 a partir de u = 1. */
const campana = (u: number) => (u >= 1 ? 0 : (1 - u * u) * (1 - u * u));
const VECINOS4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export interface TerrenoGenerado {
  terreno: number[];
  recursos: Record<string, number[]>;
  /** Altura de cada casilla en centésimas: negativa bajo el agua, hasta 100 en las cumbres. */
  relieve: number[];
}

/**
 * Un continente rodeado de mar, con cordilleras, grandes lagos con islas, ríos que
 * bajan de las montañas y biomas según el frío (más al norte) y la humedad. Las
 * islas guardan las mejores vetas (sobre todo estaño), pesca rica y aves.
 */
export function generarTerreno(ancho: number, alto: number): TerrenoGenerado {
  const n = ancho * alto;
  const base = fbm(ancho, alto, [36, 18, 9, 4], [0.5, 0.27, 0.15, 0.08]);
  const crestas = ruido(ancho, alto, 14);
  const cordilleras = ruido(ancho, alto, 40);
  const xy = (i: number) => [i % ancho, Math.floor(i / ancho)];

  // 1. El continente: el mar rodea la tierra (con una costa irregular) y algunas
  //    zonas se levantan en cordilleras.
  const costa = ruido(ancho, alto, 11);
  const e = base.map((v, i) => {
    const [x, y] = xy(i);
    const dx = (x / (ancho - 1)) * 2 - 1;
    const dy = (y / (alto - 1)) * 2 - 1;
    const d = 0.5 * Math.max(Math.abs(dx), Math.abs(dy)) + 0.5 * (Math.sqrt(dx * dx + dy * dy) / 1.4143) + 0.16 * (costa[i] - 0.5);
    const cresta = 1 - Math.abs(2 * crestas[i] - 1);
    return v - 0.65 * entre01(0.52, 0.97, d) + 0.16 * cresta * cresta * entre01(0.58, 0.8, cordilleras[i]);
  });
  const nivel = cuantil(e.slice().sort((a, b) => a - b), 0.24);

  // 2. Grandes lagos de orillas irregulares, cada uno con sus islas, y algunas
  //    islas en el mar cerca de la costa.
  const lagos: { x: number; y: number; r: number }[] = [];
  const cuantosLagos = 3 + entero(2);
  for (let intento = 0; intento < 800 && lagos.length < cuantosLagos; intento++) {
    const r = 9 + entero(7);
    const x = r + 8 + entero(ancho - 2 * r - 16);
    const y = r + 8 + entero(alto - 2 * r - 16);
    if (e[y * ancho + x] < nivel + 0.04) continue;
    if (lagos.some((l) => distancia(l.x - x, l.y - y) < l.r + r + 10)) continue;
    lagos.push({ x, y, r });
  }
  const orla = ruido(ancho, alto, 5);
  const islas: { x: number; y: number; r: number }[] = [];
  for (const l of lagos) {
    const R = Math.ceil(l.r * 1.4);
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        const x = l.x + dx;
        const y = l.y + dy;
        if (x < 1 || y < 1 || x >= ancho - 1 || y >= alto - 1) continue;
        const i = y * ancho + x;
        const u = distancia(dx, dy) / (l.r * (0.72 + 0.56 * orla[i]));
        if (u < 1) e[i] = Math.min(e[i], nivel - 0.015 - 0.25 * campana(u));
        else if (u < 1.35) e[i] = Math.min(e[i], nivel + 0.06 * (u - 1));
      }
    }
    const cuantas = 1 + entero(3);
    for (let k = 0; k < cuantas; k++) {
      for (let t = 0; t < 30; t++) {
        const ox = (azar() * 2 - 1) * 0.6 * l.r;
        const oy = (azar() * 2 - 1) * 0.6 * l.r;
        const ri = 2 + azar() * 2.6;
        if (ox * ox + oy * oy > 0.36 * l.r * l.r) continue;
        if (islas.some((s) => distancia(s.x - l.x - ox, s.y - l.y - oy) < s.r + ri + 2)) continue;
        islas.push({ x: l.x + ox, y: l.y + oy, r: ri });
        break;
      }
    }
  }
  for (let k = 0, intento = 0; k < 4 && intento < 300; intento++) {
    const x = 4 + entero(ancho - 8);
    const y = 4 + entero(alto - 8);
    const i = y * ancho + x;
    const ri = 2.4 + azar() * 3;
    // En el mar, pero no lejos de la costa.
    if (e[i] > nivel - 0.08 || e[i] < nivel - 0.3) continue;
    if (islas.some((s) => distancia(s.x - x, s.y - y) < s.r + ri + 6)) continue;
    islas.push({ x, y, r: ri });
    k++;
  }
  for (const s of islas) {
    const R = Math.ceil(s.r) + 1;
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        const x = Math.round(s.x) + dx;
        const y = Math.round(s.y) + dy;
        if (x < 1 || y < 1 || x >= ancho - 1 || y >= alto - 1) continue;
        const u = distancia(x - s.x, y - s.y) / s.r;
        if (u < 1) e[y * ancho + x] = Math.max(e[y * ancho + x], nivel + 0.01 + 0.28 * campana(u * 0.9));
      }
    }
  }

  // 3. La altura de cada casilla: negativa bajo el agua, de 0 a 1 en tierra.
  const tierraAlta = e.filter((v) => v >= nivel).sort((a, b) => a - b);
  const cima = tierraAlta[tierraAlta.length - 1];
  const fondo = Math.min(...e);
  const alt = e.map((v) => (v >= nivel ? (v - nivel) / (cima - nivel) : -(nivel - v) / (nivel - fondo)));
  // Montañas y colinas: una parte fija de la tierra, para que todos los mundos se parezcan en eso.
  const qMontana = (cuantil(tierraAlta, 0.94) - nivel) / (cima - nivel);
  const qColina = (cuantil(tierraAlta, 0.8) - nivel) / (cima - nivel);
  const terreno: number[] = alt.map((a) => (a < 0 ? AGUA : PRADERA));

  // Distancia (en casillas) al agua más cercana.
  const dAgua = distanciaA(ancho, alto, (i) => terreno[i] === AGUA);

  // 4. Frío y humedad.
  const temple = ruido(ancho, alto, 20);
  const humedadBase = fbm(ancho, alto, [28, 14, 7], [0.55, 0.3, 0.15]);
  const temp = alt.map((a, i) => 0.12 + 0.88 * (xy(i)[1] / (alto - 1)) - 0.55 * Math.max(0, a) + 0.14 * (temple[i] - 0.5));
  const humBruta = humedadBase.map((h, i) => h + 0.22 * Math.max(0, 1 - dAgua[i] / 10));
  const tierra: number[] = [];
  for (let i = 0; i < n; i++) if (alt[i] >= 0) tierra.push(humBruta[i]);
  tierra.sort((a, b) => a - b);
  const rango = (v: number) => {
    // Posición de la humedad entre las de toda la tierra (0..1).
    let lo = 0;
    let hi = tierra.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tierra[mid] < v) lo = mid + 1;
      else hi = mid;
    }
    return lo / tierra.length;
  };
  const hum = humBruta.map((h, i) => (alt[i] >= 0 ? rango(h) : 1));

  // 5. Biomas.
  for (let i = 0; i < n; i++) {
    const a = alt[i];
    if (a < 0) continue;
    const t = temp[i];
    const h = hum[i];
    let b: number;
    if (a >= qMontana) b = MONTANA;
    else if (a >= qColina) b = COLINA;
    else if (dAgua[i] <= 1 && a < 0.12) b = h > 0.72 && t > 0.3 ? PANTANO : ORILLA;
    else if (a < 0.06 && h > 0.88 && t > 0.3) b = PANTANO;
    else if (h > 0.52) b = BOSQUE;
    else if (h < 0.1 && t > 0.62) b = DESIERTO;
    else if (h < 0.2 || (t < 0.22 && h < 0.32)) b = ESTEPA;
    else b = PRADERA;
    terreno[i] = b;
  }

  // 6. Ríos: nacen en las alturas húmedas y bajan hasta el agua.
  const fuentes: number[] = [];
  for (let i = 0; i < n; i++) if (alt[i] >= qColina * 0.85 && alt[i] < qMontana && hum[i] > 0.35) fuentes.push(i);
  const elegidas: number[] = [];
  for (let k = 0; k < fuentes.length * 4 && elegidas.length < 12 && fuentes.length; k++) {
    const f = fuentes[entero(fuentes.length)];
    const [fx, fy] = xy(f);
    if (elegidas.some((g) => distancia(xy(g)[0] - fx, xy(g)[1] - fy) < 14)) continue;
    elegidas.push(f);
  }
  for (const f of elegidas) {
    const camino: number[] = [];
    const visto = new Set<number>();
    let cur = f;
    let llega = false;
    for (let paso = 0; paso < 260; paso++) {
      if (terreno[cur] === AGUA || terreno[cur] === RIO) {
        llega = true;
        break;
      }
      camino.push(cur);
      visto.add(cur);
      const [x, y] = xy(cur);
      let mejor = -1;
      let mejorP = 0;
      for (const [dx, dy] of VECINOS4) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= ancho || yy >= alto) continue;
        const j = yy * ancho + xx;
        if (visto.has(j)) continue;
        // Un cauce no se ensancha: se evitan casillas que ya tocan otro tramo del río.
        let tocan = 0;
        for (const [ex, ey] of VECINOS4) {
          const v = (yy + ey) * ancho + xx + ex;
          if (v !== cur && visto.has(v)) tocan++;
        }
        const recto = camino.length > 1 && j - cur === cur - camino[camino.length - 2] ? 0.004 : 0;
        const p = e[j] + tocan * 0.5 - recto;
        if (mejor < 0 || p < mejorP) {
          mejor = j;
          mejorP = p;
        }
      }
      if (mejor < 0) break;
      if (e[mejor] > e[cur] + 0.03) {
        // Una hondonada sin salida: el agua se embalsa en una laguna.
        terreno[cur] = AGUA;
        camino.pop();
        llega = camino.length >= 6;
        break;
      }
      // El cauce siempre baja (o se queda a nivel): así no se da la vuelta.
      e[mejor] = Math.min(e[mejor], e[cur]);
      cur = mejor;
    }
    if (!llega || camino.length < 6) continue;
    for (const c of camino) if (terreno[c] !== AGUA) terreno[c] = RIO;
  }

  // 7. Recursos.
  const recursos: Record<string, number[]> = {};
  for (const capa of CAPAS) recursos[capa] = terreno.map((t) => r2(CAPACIDAD[capa][t] * (0.6 + 0.4 * azar())));
  // Las orillas de los ríos son fértiles.
  for (let i = 0; i < n; i++) {
    if (terreno[i] !== RIO) continue;
    const [x, y] = xy(i);
    for (const [dx, dy] of VECINOS4) {
      const xx = x + dx;
      const yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= ancho || yy >= alto) continue;
      const j = yy * ancho + xx;
      if (terreno[j] === PRADERA || terreno[j] === ESTEPA || terreno[j] === ORILLA) {
        recursos.semillas[j] = r2(recursos.semillas[j] * 1.3 + 2);
        recursos.arcilla[j] = r2(recursos.arcilla[j] + 15);
      }
    }
  }

  // 8. Vetas: pocas en tierra firme; las más ricas, en las islas.
  const masa = calcularMasas(terreno, ancho, alto);
  const tamano = new Map<number, number>();
  for (let i = 0; i < n; i++) if (masa[i] >= 0) tamano.set(masa[i], (tamano.get(masa[i]) ?? 0) + 1);
  let continente = -1;
  for (const [k, v] of tamano) if (continente < 0 || v > (tamano.get(continente) ?? 0)) continente = k;
  const rocosas: number[] = [];
  for (let i = 0; i < n; i++) if ((terreno[i] === COLINA || terreno[i] === MONTANA) && masa[i] === continente) rocosas.push(i);
  const vetas: [string, number, number][] = [
    ['malaquita', 10, 50],
    ['casiterita', 2, 25],
    ['hematites', 10, 60],
  ];
  for (const [mineral, cuantas, cantidad] of vetas) {
    for (let k = 0; k < cuantas && rocosas.length; k++) {
      const c = rocosas[entero(rocosas.length)];
      const [cx, cy] = xy(c);
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
  const tesoros = ['casiterita', 'malaquita', 'hematites'];
  let turno = entero(3);
  for (const [k, v] of tamano) {
    if (k === continente || v < 3) continue;
    const mineral = tesoros[turno++ % 3];
    for (let i = 0; i < n; i++) {
      if (masa[i] !== k) continue;
      if (azar() < 0.6) {
        recursos[mineral][i] = r2(55 + 40 * azar());
        recursos.piedra[i] = Math.max(recursos.piedra[i], 40);
      }
      // Sin fieras: las aves anidan tranquilas.
      recursos.caza[i] = r2(recursos.caza[i] * 1.5 + 1);
    }
  }
  // Mucha pesca alrededor de las islas.
  for (let i = 0; i < n; i++) {
    if (terreno[i] !== AGUA) continue;
    const [x, y] = xy(i);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= ancho || yy >= alto) continue;
        const j = yy * ancho + xx;
        if (masa[j] >= 0 && masa[j] !== continente) recursos.peces[i] = 45;
      }
    }
  }

  // 9. El relieve que verá la web (los ríos van un poco hundidos en su cauce).
  const relieve = alt.map((a) => Math.round(Math.max(-1, Math.min(1, a)) * 100));
  for (let i = 0; i < n; i++) {
    if (terreno[i] !== RIO) continue;
    const [x, y] = xy(i);
    let min = relieve[i];
    for (const [dx, dy] of VECINOS4) {
      const xx = x + dx;
      const yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= ancho || yy >= alto) continue;
      min = Math.min(min, relieve[yy * ancho + xx]);
    }
    relieve[i] = Math.max(0, min - 1);
  }
  return { terreno, recursos, relieve };
}

/** Distancia en pasos (4 vecinos) hasta la casilla más cercana que cumple algo. */
function distanciaA(ancho: number, alto: number, cumple: (i: number) => boolean): number[] {
  const n = ancho * alto;
  const d = new Array<number>(n).fill(1e9);
  let frente: number[] = [];
  for (let i = 0; i < n; i++) {
    if (cumple(i)) {
      d[i] = 0;
      frente.push(i);
    }
  }
  while (frente.length) {
    const siguiente: number[] = [];
    for (const i of frente) {
      const x = i % ancho;
      const y = (i - x) / ancho;
      for (const [dx, dy] of VECINOS4) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= ancho || yy >= alto) continue;
        const j = yy * ancho + xx;
        if (d[j] > d[i] + 1) {
          d[j] = d[i] + 1;
          siguiente.push(j);
        }
      }
    }
    frente = siguiente;
  }
  return d;
}

/** Masas de tierra: casillas unidas a pie (los ríos se vadean). -1 en el agua. */
export function calcularMasas(terreno: number[], ancho: number, alto: number): number[] {
  const n = ancho * alto;
  const id = new Array<number>(n).fill(-1);
  let k = 0;
  for (let i = 0; i < n; i++) {
    if (terreno[i] === AGUA || id[i] >= 0) continue;
    const pila = [i];
    id[i] = k;
    while (pila.length) {
      const j = pila.pop()!;
      const x = j % ancho;
      const y = (j - x) / ancho;
      for (const [dx, dy] of VECINOS4) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= ancho || yy >= alto) continue;
        const v = yy * ancho + xx;
        if (terreno[v] !== AGUA && id[v] < 0) {
          id[v] = k;
          pila.push(v);
        }
      }
    }
    k++;
  }
  return id;
}

const cacheMasas = new WeakMap<number[], { masa: number[]; continente: number }>();

/** Hasta dónde se mira qué queda en la misma orilla que una aldea. */
const RADIO_ORILLA = 16;
const cacheOrillas = new WeakMap<number[], Map<number, Set<number>>>();

/**
 * Las casillas a las que se llega a pie desde una aldea sin cruzar ríos ni lagos (y el
 * agua que las toca, para pescar desde la orilla).
 */
export function orilla(m: Mundo, a: { x: number; y: number }): Set<number> {
  let porAldea = cacheOrillas.get(m.terreno);
  if (!porAldea) cacheOrillas.set(m.terreno, (porAldea = new Map()));
  const inicio = a.y * m.ancho + a.x;
  let set = porAldea.get(inicio);
  if (set) return set;
  set = new Set([inicio]);
  const pila = [inicio];
  const agua = (t: number) => t === AGUA || t === RIO;
  while (pila.length) {
    const j = pila.pop()!;
    const x = j % m.ancho;
    const y = (j - x) / m.ancho;
    for (const [dx, dy] of VECINOS4) {
      const xx = x + dx;
      const yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= m.ancho || yy >= m.alto || Math.max(Math.abs(xx - a.x), Math.abs(yy - a.y)) > RADIO_ORILLA) continue;
      const v = yy * m.ancho + xx;
      if (set.has(v)) continue;
      if (agua(m.terreno[v])) {
        set.add(v);
        continue;
      }
      set.add(v);
      pila.push(v);
    }
  }
  porAldea.set(inicio, set);
  return set;
}

/** Masas de tierra del mundo (se calculan una vez por mapa) y cuál es el continente. */
export function masas(m: Mundo): { masa: number[]; continente: number } {
  let c = cacheMasas.get(m.terreno);
  if (!c) {
    const masa = calcularMasas(m.terreno, m.ancho, m.alto);
    const tamano = new Map<number, number>();
    for (const k of masa) if (k >= 0) tamano.set(k, (tamano.get(k) ?? 0) + 1);
    let continente = -1;
    for (const [k, v] of tamano) if (continente < 0 || v > (tamano.get(continente) ?? 0)) continente = k;
    c = { masa, continente };
    cacheMasas.set(m.terreno, c);
  }
  return c;
}

/** Los recursos vuelven a crecer. Se llama cada `k` días. */
export function recrecer(m: Mundo, estacion: number, k: number): void {
  const R = m.recursos;
  const n = m.terreno.length;
  const bayas = TEMPORADA.bayas[estacion] * m.clima;
  const semillas = TEMPORADA.semillas[estacion] * m.clima;
  for (let i = 0; i < n; i++) {
    const t = m.terreno[i];
    if (PESCABLE[t]) {
      const cap = CAPACIDAD.peces[t];
      const v = R.peces[i];
      if (v < cap) R.peces[i] = r2(Math.min(cap, v + 0.02 * k * v * (1 - v / cap) + 0.01 * k));
      if (t === AGUA) continue;
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
  const centro = y * m.ancho + x;
  const t = m.terreno[centro];
  if (t === AGUA || t === MONTANA || t === RIO) return 0;
  const { masa } = masas(m);
  const k = masa[centro];
  const R = m.recursos;
  let s = 0;
  let agua = false;
  let piedra = false;
  for (const [dx, dy, d] of anillo(5)) {
    const xx = x + dx;
    const yy = y + dy;
    if (xx < 0 || yy < 0 || xx >= m.ancho || yy >= m.alto) continue;
    const i = yy * m.ancho + xx;
    const ti = m.terreno[i];
    if (ti !== AGUA && masa[i] !== k) continue;
    const f = 1 / (1 + 0.15 * d);
    s += f * (R.bayas[i] + R.semillas[i] + R.caza[i] * 4 + R.madera[i] * 0.15 + R.fibra[i] * 0.2 + R.peces[i] * 0.2);
    if ((ti === AGUA || ti === RIO) && d <= 2.5) agua = true;
    if ((ti === COLINA || ti === MONTANA) && d <= 5) piedra = true;
  }
  // Los pantanos traen fiebres y el desierto apenas da de comer.
  const lugar = t === PANTANO ? 0.6 : t === DESIERTO ? 0.5 : 1;
  return (s + (agua ? 40 : 0) + (piedra ? 15 : 0)) * lugar;
}

/**
 * ¿Puede alguien de esta aldea trabajar en la casilla i? A pie solo se llega a la
 * propia tierra (los ríos se vadean) y se pesca desde la orilla; en barca, a todas partes.
 */
export function alcanzable(m: Mundo, a: { x: number; y: number; edificios?: { tipo: string }[] }, i: number, barca: boolean): boolean {
  if (barca) return true;
  // Sin barca ni puente, lo que queda al otro lado del río no se alcanza.
  if (a.edificios && !a.edificios.some((e) => e.tipo === 'puente') && !orilla(m, a).has(i)) {
    const x = i % m.ancho;
    const y = (i - x) / m.ancho;
    if (Math.max(Math.abs(x - a.x), Math.abs(y - a.y)) <= RADIO_ORILLA) return false;
  }
  const { masa } = masas(m);
  const k = masa[a.y * m.ancho + a.x];
  if (m.terreno[i] !== AGUA) return masa[i] === k;
  const x = i % m.ancho;
  const y = (i - x) / m.ancho;
  for (const [dx, dy] of VECINOS4) {
    const xx = x + dx;
    const yy = y + dy;
    if (xx < 0 || yy < 0 || xx >= m.ancho || yy >= m.alto) continue;
    if (masa[yy * m.ancho + xx] === k) return true;
  }
  return false;
}

/** El mejor sitio libre para fundar una aldea, lejos de las demás. */
export function buscarSitio(
  m: Mundo,
  desde: { x: number; y: number } | null,
  min: number,
  max: number,
  ignorar: number | null = null,
  cruzanAgua = false,
): { x: number; y: number } | null {
  const vivas = m.aldeas.filter((a) => a.abandonada === null && a.id !== ignorar);
  const { masa, continente } = masas(m);
  // A pie solo se llega a la misma tierra; sin punto de partida, se empieza en el continente.
  const tierra = desde ? masa[desde.y * m.ancho + desde.x] : continente;
  let mejor: { x: number; y: number } | null = null;
  let mejorP = 0;
  // La primera banda llega a tierras templadas: ni el norte helado ni el sur más seco.
  const y0 = desde ? 2 : Math.floor(m.alto * 0.3);
  const y1 = desde ? m.alto - 2 : Math.floor(m.alto * 0.78);
  for (let y = y0; y < y1; y++) {
    for (let x = 2; x < m.ancho - 2; x++) {
      if (!cruzanAgua && masa[y * m.ancho + x] !== tierra) continue;
      if (desde) {
        const d = distancia(x - desde.x, y - desde.y);
        if (d < min || d > max) continue;
      }
      if (vivas.some((a) => distancia(a.x - x, a.y - y) < min)) continue;
      const p = puntuarSitio(m, x, y);
      if (p > mejorP) {
        mejorP = p;
        mejor = { x, y };
      }
    }
  }
  return mejor;
}

/** Hacia dónde queda un punto (la y crece hacia el sur). */
export function direccion(desde: Aldea, x: number, y: number): string {
  const dx = x - desde.x;
  const dy = y - desde.y;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ay <= ax * 0.4142) return dx >= 0 ? 'el este' : 'el oeste';
  if (ax <= ay * 0.4142) return dy >= 0 ? 'el sur' : 'el norte';
  return (dy >= 0 ? 'el sur' : 'el nor') + (dx >= 0 ? 'este' : 'oeste');
}
