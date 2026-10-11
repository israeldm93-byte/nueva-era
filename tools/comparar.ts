// Compara, década a década, los resultados de `tools/validar.ts` de varias versiones del
// motor con la misma semilla (mismas condiciones iniciales y misma medición):
//   node tools/comparar.ts <semilla|mundo-vivo> <carpeta A> <carpeta B> [...] > tabla.md
// Cada carpeta contiene `semilla-<s>.json` (o `mundo-vivo.json`) de una versión.

import { existsSync, readFileSync } from 'node:fs';
import { basename } from 'node:path';

type Dec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const [quien, ...carpetas] = process.argv.slice(2);
const archivo = quien === 'mundo-vivo' ? 'mundo-vivo.json' : `semilla-${quien}.json`;
const versiones = carpetas
  .filter((c) => existsSync(`${c}/${archivo}`))
  .map((c) => ({ nombre: basename(c), d: JSON.parse(readFileSync(`${c}/${archivo}`, 'utf8')) as Dec }));

const pct = (x: number | undefined) => (x === undefined ? '–' : `${Math.round(x * 100)} %`);
const num = (x: number | undefined | null, dec = 2) => (x === undefined || x === null ? '–' : Number.isFinite(x) ? String(Math.round(x * 10 ** dec) / 10 ** dec) : String(x));
/** Aldeas con alguna cuenta rota (NaN guardado como null) en la foto de la década. */
const rotas = (dec: Dec) => (dec.detalle ?? []).filter((a: Dec) => Object.values(a.porCabeza ?? {}).some((v) => v === null)).length;

const filas: [string, (dec: Dec) => string][] = [
  ['población', (d) => String(d.poblacion)],
  ['aldeas (rotas)', (d) => `${d.aldeas} (${rotas(d)})`],
  ['salud media / mín.', (d) => `${num(d.saludMedia)} / ${num(d.saludMin)}`],
  ['reservas media / mín.', (d) => `${num(d.reservasMedia)} / ${num(d.reservasMin)}`],
  ['comida entra / sale (por persona y año)', (d) => (d.comidaPorPersonaAnio ? `${num(d.comidaPorPersonaAnio.entra, 0)} / ${num(d.comidaPorPersonaAnio.sale, 0)}` : '–')],
  ['adultos descansando', (d) => pct(d.actividadAdultos?.descansar ?? 0)],
  ['… por vejez / enfermedad / granero lleno / otro', (d) => (d.descansoAdultos ? ['viejo', 'enfermo', 'granero_lleno', 'otro'].map((k) => pct(d.descansoAdultos[k])).join(' / ') : '–')],
  ['adultos trabajando en comida', (d) => pct(['recolectar', 'cazar', 'pescar', 'cultivar', 'pastorear'].reduce((s, k) => s + (d.actividadAdultos?.[k] ?? 0), 0))],
  ['opiniones: entropía media / acuerdo al azar', (d) => (d.opiniones ? `${num(d.opiniones.entropiaMedia)} / ${pct(d.opiniones.acuerdoAzar)}` : '–')],
  ['aldeas unánimes', (d) => (d.opiniones ? `${d.opiniones.unanimes}/${d.opiniones.aldeas}` : '–')],
  ['migrantes en la década', (d) => String(d.migrantesDecada ?? '–')],
  ['saberes del mundo / aldea mín.–máx.', (d) => `${d.saberesMundo} / ${d.saberesAldea ? `${d.saberesAldea.min}–${d.saberesAldea.max}` : '–'}`],
  ['entropía de oficios / de metas', (d) => `${num(d.entropiaOficios)} / ${num(d.entropiaMetas)}`],
  ['invariantes rotas', (d) => String(d.invariantesRotas ?? '–')],
  ['anomalías (acum.) / escrituras rotas (acum.)', (d) => `${d.anomalias ?? '–'} / ${d.escriturasRotas ?? '–'}`],
];

console.log(`## ${quien === 'mundo-vivo' ? 'Mundo vivo' : `Semilla ${quien}`}\n`);
console.log(`Versiones: ${versiones.map((v) => `**${v.nombre}**`).join(', ')}\n`);
const anios = [...new Set(versiones.flatMap((v) => v.d.decadas.map((x: Dec) => x.anio)))].sort((a, b) => a - b);
for (const [titulo, f] of filas) {
  console.log(`### ${titulo}\n`);
  console.log(`| año | ${versiones.map((v) => v.nombre).join(' | ')} |`);
  console.log(`| --- | ${versiones.map(() => '---').join(' | ')} |`);
  for (const anio of anios) {
    const celdas = versiones.map((v) => {
      const dec = v.d.decadas.find((x: Dec) => x.anio === anio);
      return dec ? f(dec) : '–';
    });
    console.log(`| ${anio} | ${celdas.join(' | ')} |`);
  }
  console.log('');
}
console.log('### Toda la simulación\n');
console.log(`| | ${versiones.map((v) => v.nombre).join(' | ')} |`);
console.log(`| --- | ${versiones.map(() => '---').join(' | ')} |`);
const total: [string, (d: Dec) => string][] = [
  ['población final', (d) => String(d.final.poblacion)],
  ['aldeas finales', (d) => String(d.final.aldeas)],
  ['mudanzas (personas)', (d) => `${d.mudanzas?.total ?? d.migraciones.length} (${d.mudanzas?.personas ?? '–'})`],
  ['vueltas a una aldea ya dejada', (d) => String(d.mudanzas?.vueltas ?? '–')],
  ['… el mismo año / en menos de 5 años', (d) => `${d.mudanzas?.vueltasMismoAnio ?? '–'} / ${d.mudanzas?.vueltasMenosDe5Anios ?? '–'}`],
  ['máx. mudanzas de una persona', (d) => String(d.mudanzas?.maxMudanzas ?? '–')],
  ['mudanzas por 1000 personas·año', (d) => num(d.mudanzas?.porMilPersonasAnio)],
  ['cambios de meta por persona·año', (d) => num(d.ciclosMetas.cambiosPorPersonaAnio)],
  ['vaivenes de meta (misma meta, < 1 año)', (d) => String(d.ciclosMetas.vaivenesMenosDeUnAnio)],
  ['actividad: descansar (todas las edades)', (d) => pct(d.actividades.descansar)],
  ['anomalías', (d) => String(d.anomalias?.total ?? '–')],
];
for (const [t, f] of total) console.log(`| ${t} | ${versiones.map((v) => f(v.d)).join(' | ')} |`);
