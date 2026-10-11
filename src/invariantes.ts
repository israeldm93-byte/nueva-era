// Lo que nunca debe pasar en un mundo sano. Sirve a las pruebas y a la carga de guardados:
// ningún número puede ser NaN ni infinito, nada puede quedar en negativo, nadie puede vivir
// en una aldea que no existe y las parejas tienen que corresponderse.

import { MAX_LAZOS, MAX_RECUERDOS, MAX_VIDA } from './memoria.ts';
import type { Mundo } from './tipos.ts';

/** Busca números inválidos (NaN, infinitos o null donde debería haber un número) en cualquier parte. */
function numerosRotos(valor: unknown, ruta: string, out: string[], limite = 20): void {
  if (out.length >= limite) return;
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) out.push(`${ruta} = ${valor}`);
    return;
  }
  if (!valor || typeof valor !== 'object') return;
  if (Array.isArray(valor)) {
    for (let i = 0; i < valor.length && out.length < limite; i++) numerosRotos(valor[i], `${ruta}[${i}]`, out, limite);
    return;
  }
  for (const [k, v] of Object.entries(valor)) numerosRotos(v, `${ruta}.${k}`, out, limite);
}

/** Lista de problemas encontrados (vacía si el mundo está sano). */
export function comprobar(m: Mundo): string[] {
  const out: string[] = [];
  for (const a of m.aldeas) {
    for (const [k, v] of Object.entries(a.despensa)) {
      if (typeof v !== 'number' || !Number.isFinite(v)) out.push(`${a.nombre}: despensa.${k} = ${v}`);
      else if (v < -0.01) out.push(`${a.nombre}: despensa.${k} negativa (${v})`);
    }
    numerosRotos(a.edificios, `${a.nombre}.edificios`, out);
    for (const e of a.edificios) {
      if (e.animales !== undefined && (!Number.isInteger(e.animales) || e.animales < 0)) out.push(`${a.nombre}: ${e.tipo} con ${e.animales} animales (deben ser enteros y no negativos)`);
    }
    if (a.obra) numerosRotos(a.obra, `${a.nombre}.obra`, out);
  }
  const ids = new Set<number>();
  const vivas = new Set(m.aldeas.filter((a) => a.abandonada === null).map((a) => a.id));
  const porId = new Map(m.personas.map((p) => [p.id, p]));
  for (const p of m.personas) {
    if (ids.has(p.id)) out.push(`id repetido ${p.id}`);
    ids.add(p.id);
    for (const k of ['reservas', 'salud', 'x', 'y', 'nace', 'hijos', 'recompensa'] as const) {
      const v = p[k];
      if (typeof v !== 'number' || !Number.isFinite(v)) out.push(`${p.nombre}: ${k} = ${v}`);
    }
    if (p.reservas < 0 || p.reservas > 8.01) out.push(`${p.nombre}: reservas fuera de rango (${p.reservas})`);
    if (p.salud < -0.01 || p.salud > 1.01) out.push(`${p.nombre}: salud fuera de rango (${p.salud})`);
    for (const [g, v] of Object.entries(p.genes)) if (!Number.isFinite(v) || v < 0 || v > 1) out.push(`${p.nombre}: gen ${g} = ${v}`);
    if (p.mente.some((w) => !Number.isFinite(w))) out.push(`${p.nombre}: mente con números rotos`);
    for (const [k, v] of Object.entries(p.valor)) if (!Number.isFinite(v)) out.push(`${p.nombre}: valor.${k} = ${v}`);
    if (!vivas.has(p.aldea)) out.push(`${p.nombre} vive en una aldea que no existe (${p.aldea})`);
    if (p.pareja !== null) {
      const q = porId.get(p.pareja);
      if (!q) out.push(`${p.nombre}: su pareja ${p.pareja} no existe`);
      else if (q.pareja !== p.id) out.push(`${p.nombre}: pareja no correspondida`);
    }
    if ((p.recuerdos?.length ?? 0) > MAX_RECUERDOS || (p.lazos?.length ?? 0) > MAX_LAZOS || (p.vida?.length ?? 0) > MAX_VIDA) out.push(`${p.nombre}: memoria desbordada`);
    for (const [, v] of p.lazos ?? []) if (!Number.isFinite(v) || v < -1 || v > 1) out.push(`${p.nombre}: lazo inválido ${v}`);
    for (const r of p.recuerdos ?? []) if (!Number.isFinite(r[3])) out.push(`${p.nombre}: recuerdo inválido`);
    if (p.mudanza && !Number.isFinite(p.mudanza.dias)) out.push(`${p.nombre}: mudanza inválida`);
    if (p.viaje && (![p.viaje.dias, p.viaje.salida, ...p.viaje.desde, ...p.viaje.hasta].every(Number.isFinite) || !m.aldeas.some((a) => a.id === p.viaje!.a))) out.push(`${p.nombre}: viaje inválido`);
    if (p.muerto) out.push(`${p.nombre}: muerto sin enterrar`);
    if (out.length > 40) break;
  }
  for (const [k, v] of Object.entries(m.recursos)) {
    for (let i = 0; i < v.length; i++) {
      if (!Number.isFinite(v[i]) || v[i] < -0.01) {
        out.push(`recursos.${k}[${i}] = ${v[i]}`);
        break;
      }
    }
  }
  for (const [k, r] of Object.entries(m.relaciones)) if (!Number.isFinite(r.afinidad) || !Number.isFinite(r.rencor)) out.push(`relación ${k} rota`);
  return out;
}
