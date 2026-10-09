// Escribe los ficheros que lee la web: el resumen del mundo, la crónica, la
// historia y el estado completo (con él, el navegador sigue simulando en directo).

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { datosWeb } from './vista.ts';
import type { Mundo } from './tipos.ts';

export function exportar(m: Mundo, dir: string, ahora: Date): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'mundo.json'), JSON.stringify(datosWeb(m, ahora)));
  writeFileSync(join(dir, 'cronica.json'), JSON.stringify(m.cronica));
  writeFileSync(join(dir, 'historia.json'), JSON.stringify(m.historia));
  writeFileSync(join(dir, 'estado.json'), JSON.stringify(m));
}
