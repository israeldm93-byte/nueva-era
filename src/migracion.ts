// Familias que se mudan de aldea.
//
// Nadie se muda al azar: se va quien tiene motivos (en su casa ya no caben, pasan hambre,
// tiene miedo, se siente solo o nadie le tiene en cuenta) y sabe de otra aldea donde le
// iría mejor (hay comida y casas, es segura, allí vive familia o amigos). Se lleva a su
// pareja y a sus hijos pequeños, y lo que saben: la aldea de origen pierde brazos y quizá
// algún saber; la de destino los gana. El viaje se hace andando, y tarda.

import { DIAS_ANIO } from './config.ts';
import { anotar } from './cronica.ts';
import { comidaTotal, conoce, plazas } from './economia.ts';
import { hito, lazo, memoria, recordar } from './memoria.ts';
import { masas } from './mapa.ts';
import { distancia } from './matematicas.ts';
import { aviso } from './fauna.ts';
import { edad, type Indices } from './mundo.ts';
import { relacion } from './politica.ts';
import type { Aldea, Mundo, Persona } from './tipos.ts';

const r2 = (x: number) => Math.round(x * 100) / 100;

/** Lo que tira de alguien hacia una aldea: comida, casas, seguridad (y si es grande, oportunidades). */
function atractivo(m: Mundo, a: Aldea, n: number): number {
  const dias = comidaTotal(a) / Math.max(1, n * 0.9);
  const libre = Math.max(-0.5, Math.min(0.5, (plazas(a) - n) / Math.max(1, n)));
  return Math.min(1, dias / 90) * 0.8 + libre * 0.8 + (1 - a.amenaza) * 0.4 + (n >= 35 ? 0.1 : 0) - (a.consejo?.guerra ? 0.3 : 0);
}

/** Qué es para él alguien de otra aldea (para contarlo): «su hermana», «su hijo», «su amigo»... */
function parentesco(p: Persona, q: Persona): string | null {
  const ella = q.sexo === 'M';
  if (q.id === p.madre) return 'su madre';
  if (q.id === p.padre) return 'su padre';
  if (q.madre === p.id || q.padre === p.id) return ella ? 'su hija' : 'su hijo';
  if ((p.madre !== null && q.madre === p.madre) || (p.padre !== null && q.padre === p.padre)) return ella ? 'su hermana' : 'su hermano';
  if (lazo(p, q.id) > 0.3) return ella ? 'su amiga' : 'su amigo';
  return null;
}

/**
 * La mejor aldea conocida y alcanzable a la que irse, con lo que gana y por qué, o null si
 * no sabe de ninguna claramente mejor.
 */
export function buscarDestino(
  m: Mundo,
  p: Persona,
  a: Aldea,
  nec: { vivienda: number; hambre: number; seguridad: number; pertenencia: number; reconocimiento: number },
  ix: Indices,
): { aldea: Aldea; ventaja: number; motivo: string } | null {
  const { masa } = masas(m);
  const origen = ix.porAldea.get(a.id) ?? [];
  const aqui = atractivo(m, a, origen.length);
  // Mudarse cuesta (dejar casa, campos y vecinos): quien acaba de hacerlo necesita
  // muchas más razones para volver a cargar con todo.
  const recien = memoria(m, p, 'emigro');
  const umbral = 0.25 + 0.8 * recien;
  // Con él se van su pareja y sus hijos pequeños: allí harán falta casas para todos.
  const familia = 1 + (p.pareja !== null ? 1 : 0) + origen.filter((q) => (q.madre === p.id || q.padre === p.id) && edad(m, q) < 16).length;
  let mejor: { aldea: Aldea; ventaja: number; quien: [Persona, string] | null } | null = null;
  for (const b of m.aldeas) {
    if (b === a || b.abandonada !== null || b.viaje) continue;
    // Solo se va a donde se conoce: aldeas con las que ha habido trato (o la de origen).
    const clave = `${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`;
    if (!m.contactos.includes(clave) && a.origen !== b.id && b.origen !== a.id) continue;
    const d = distancia(a.x - b.x, a.y - b.y);
    if (d > 70) continue;
    if (masa[a.y * m.ancho + a.x] !== masa[b.y * m.ancho + b.x] && !conoce(a, 'canoa')) continue;
    const rel = relacion(m, a.id, b.id);
    if (rel.rencor > 0.6) continue;
    const gente = ix.porAldea.get(b.id) ?? [];
    let quien: [Persona, string] | null = null;
    for (const q of gente) {
      const k = parentesco(p, q);
      if (k) {
        quien = [q, k];
        break;
      }
    }
    // A la aldea que dejó hace poco no se vuelve sin un buen motivo: se fue por algo.
    const dejada = memoria(m, p, 'emigro', b.id);
    const v = atractivo(m, b, gente.length + familia) + (quien ? 0.35 : 0) + rel.afinidad * 0.2 - d / 80 - aqui - 0.8 * dejada;
    if (v > umbral && (!mejor || v > mejor.ventaja)) mejor = { aldea: b, ventaja: v, quien };
  }
  if (!mejor) return null;
  // El motivo: lo que más le empuja a irse y lo que le atrae de allí.
  const empujes: [number, string][] = [
    [nec.vivienda, 'en su casa ya no caben'],
    [nec.hambre, 'aquí pasan hambre'],
    [nec.seguridad, 'aquí no se siente a salvo'],
    [nec.pertenencia * 0.8, 'aquí se siente solo'.replace('solo', p.sexo === 'M' ? 'sola' : 'solo')],
    [nec.reconocimiento * p.genes.ambicion, 'aquí nadie le tiene en cuenta'],
  ];
  const empuje = empujes.reduce((x, y) => (y[0] > x[0] ? y : x))[1];
  const b = mejor.aldea;
  const tira = mejor.quien ? `allí vive ${mejor.quien[1]} ${mejor.quien[0].nombre}` : comidaTotal(b) > comidaTotal(a) ? 'allí no falta la comida' : 'allí hay sitio';
  return { aldea: b, ventaja: mejor.ventaja, motivo: `Quiere irse a ${b.nombre}: ${empuje}, y ${tira}.` };
}

/** Quienes tienen decidido irse (desde hace unos días) se ponen en camino con su familia. */
export function mudanzas(m: Mundo, ix: Indices): void {
  const turno = m.t % 10;
  for (const p of m.personas) {
    if (p.id % 10 !== turno || p.muerto || p.mudanza || p.meta?.tipo !== 'emigrar' || m.t - p.meta.desde < 15) continue;
    const a = ix.aldeas.get(p.aldea);
    const b = m.aldeas.find((x) => x.id === p.meta!.ref);
    if (!a || !b || b.abandonada !== null || b.viaje || a.viaje) {
      p.meta = null;
      continue;
    }
    mudar(m, ix, p, a, b);
  }
}

/** La familia se va: pareja e hijos pequeños con ella; el saber viaja con ellos. */
export function mudar(m: Mundo, ix: Indices, p: Persona, a: Aldea, b: Aldea): Persona[] {
  const origen = ix.porAldea.get(a.id) ?? [];
  const familia = new Set<Persona>([p]);
  const pareja = p.pareja !== null ? ix.porId.get(p.pareja) : undefined;
  if (pareja && pareja.aldea === a.id && !pareja.muerto) familia.add(pareja);
  for (const q of origen) {
    if (q.muerto || edad(m, q) >= 16) continue;
    for (const f of [...familia]) if (q.madre === f.id || q.padre === f.id) familia.add(q);
  }
  const razon = p.meta?.motivo.split(': ').slice(1).join(': ').replace(/\.$/, '') ?? '';
  const dias = Math.max(2, Math.ceil(distancia(a.x - b.x, a.y - b.y) / 1.5));
  for (const q of familia) {
    q.aldea = b.id;
    q.faccion = null;
    q.mudanza = { desde: [a.x, a.y], hasta: [b.x, b.y], salida: m.t, dias };
    q.x = a.x;
    q.y = a.y;
    if (q.meta?.tipo === 'emigrar') q.meta = null;
    recordar(m, q, 'emigro', a.id, 0.5);
    if (edad(m, q) >= 14) hito(m, q, 'emigra', b.nombre);
    for (const s of q.saberes) if (!b.conocidos.includes(s)) b.conocidos.push(s);
    const i = origen.indexOf(q);
    if (i >= 0) origen.splice(i, 1);
    const destino = ix.porAldea.get(b.id);
    if (destino) destino.push(q);
    else ix.porAldea.set(b.id, [q]);
  }
  // Lo que solo sabían ellos se va con ellos (salvo que esté escrito).
  a.conocidos = a.conocidos.filter((s) => origen.some((q) => q.saberes.includes(s)) || a.archivo.includes(s));
  const rel = relacion(m, a.id, b.id);
  rel.afinidad = r2(Math.min(1, rel.afinidad + 0.03));
  m.anual.migrantes = (m.anual.migrantes ?? 0) + familia.size;
  const otros = familia.size - 1;
  if (aviso(m, `migra-${a.id}-${b.id}`, DIAS_ANIO)) {
    anotar(
      m,
      'migracion',
      `${p.nombre}${otros ? ` y su familia (${otros} más)` : ''} ${otros ? 'dejan' : 'deja'} ${a.nombre} y se ${otros ? 'van' : 'va'} a vivir a ${b.nombre}${razon ? `: ${razon}` : ''}.`,
      b.id,
    );
  }
  return [...familia];
}

/** Un día de camino de quien se muda; al llegar, ya es uno más. */
export function caminarMudanza(m: Mundo, p: Persona): void {
  const v = p.mudanza;
  if (!v) return;
  p.actividad = 'viajar';
  const f = (m.t - v.salida) / v.dias;
  if (f >= 1) {
    p.x = v.hasta[0];
    p.y = v.hasta[1];
    delete p.mudanza;
    return;
  }
  p.x = Math.round(v.desde[0] + (v.hasta[0] - v.desde[0]) * f);
  p.y = Math.round(v.desde[1] + (v.hasta[1] - v.desde[1]) * f);
}
