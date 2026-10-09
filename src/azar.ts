// Generador pseudoaleatorio con semilla (mulberry32). Todo el azar del mundo pasa
// por aquí y su estado se guarda con el mundo: misma semilla, misma historia.

let s = 1;

export function fijarAzar(estado: number): void {
  s = estado >>> 0;
}

export function estadoAzar(): number {
  return s;
}

export function azar(): number {
  s = (s + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function entero(n: number): number {
  return Math.floor(azar() * n);
}

export function prob(p: number): boolean {
  return azar() < p;
}

export function elegir<T>(lista: readonly T[]): T {
  return lista[entero(lista.length)];
}

/** Aproximadamente normal(0, 1): suma de doce uniformes (sin funciones trascendentes). */
export function normal(): number {
  let s = -6;
  for (let i = 0; i < 12; i++) s += azar();
  return s;
}

export function barajar<T>(lista: T[]): T[] {
  for (let i = lista.length - 1; i > 0; i--) {
    const j = entero(i + 1);
    const tmp = lista[i];
    lista[i] = lista[j];
    lista[j] = tmp;
  }
  return lista;
}

/** Elige con probabilidad proporcional al peso (pesos <= 0 nunca salen). */
export function elegirPeso<T>(lista: readonly T[], peso: (x: T) => number): T | undefined {
  let total = 0;
  for (const x of lista) total += Math.max(0, peso(x));
  if (total <= 0) return undefined;
  let r = azar() * total;
  for (const x of lista) {
    r -= Math.max(0, peso(x));
    if (r < 0) return x;
  }
  return lista[lista.length - 1];
}
