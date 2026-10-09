// Monta la web en una carpeta (por defecto «sitio»): copia web/, empaqueta el motor
// de la simulación para el navegador y añade Three.js. No toca los datos que ya haya.
//   node tools/construir.mjs [carpeta]

import { build } from 'esbuild';
import { copyFileSync, cpSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const destino = process.argv[2] ?? 'sitio';
const motor = (process.env.GITHUB_SHA ?? 'dev').slice(0, 8);

mkdirSync(destino, { recursive: true });
cpSync('web', destino, { recursive: true, filter: (ruta) => !ruta.includes(`${join('web', 'datos')}`) });

await build({
  entryPoints: ['src/navegador.ts'],
  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: true,
  outfile: join(destino, 'motor.js'),
  logLevel: 'warning',
});

mkdirSync(join(destino, 'vendor'), { recursive: true });
copyFileSync('node_modules/three/build/three.module.min.js', join(destino, 'vendor', 'three.module.min.js'));
copyFileSync('node_modules/three/examples/jsm/controls/OrbitControls.js', join(destino, 'vendor', 'OrbitControls.js'));
copyFileSync('node_modules/three/LICENSE', join(destino, 'vendor', 'LICENSE-three.txt'));

// La versión del motor viaja en la página (y en las URL de sus ficheros) para saber
// si hay que recargarla y para que el navegador no mezcle ficheros de versiones distintas.
for (const nombre of readdirSync(destino)) {
  if (!/\.(html|js)$/.test(nombre) || nombre === 'motor.js') continue;
  const ruta = join(destino, nombre);
  writeFileSync(ruta, readFileSync(ruta, 'utf8').replaceAll('__MOTOR__', motor));
}
console.log(`Web montada en ${destino} (motor ${motor}).`);
