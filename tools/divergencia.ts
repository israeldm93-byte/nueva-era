// ¿Desde cuándo dejan de vivir lo mismo dos versiones del motor? Simula la misma semilla
// con las dos, día a día y a la vez, y compara una firma barata de cada mundo (estado del
// azar, población, aldeas y lo guardado en las despensas). Dice el primer día distinto y
// qué cambió.
//   node tools/divergencia.ts <carpeta src A> <carpeta src B> <semilla> <años>

const [srcA, srcB, sem, an] = process.argv.slice(2);
const cargar = async (src: string) => ({
  mundo: await import(`${src}/mundo.ts`),
  sim: await import(`${src}/simulacion.ts`),
});
const A = await cargar(srcA);
const B = await cargar(srcB);
const ma = A.mundo.crearMundo(Number(sem));
const mb = B.mundo.crearMundo(Number(sem));
const DIAS = 120;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function firma(m: any): Record<string, string> {
  let despensa = 0;
  let rotas = 0;
  for (const a of m.aldeas) {
    for (const v of Object.values(a.despensa) as number[]) {
      if (Number.isFinite(v)) despensa += v;
      else rotas++;
    }
  }
  return {
    azar: String(m.azar),
    personas: String(m.personas.length),
    aldeas: String(m.aldeas.filter((a: { abandonada: unknown }) => a.abandonada === null).length),
    despensa: despensa.toFixed(2),
    rotas: String(rotas),
  };
}

for (let d = 0; d < Number(an) * DIAS; d++) {
  A.sim.avanzar(ma, 1);
  B.sim.avanzar(mb, 1);
  const fa = firma(ma);
  const fb = firma(mb);
  const distinto = Object.keys(fa).filter((k) => fa[k] !== fb[k]);
  if (distinto.length) {
    console.log(`Primera diferencia el día ${ma.t} (año ${Math.floor(ma.t / DIAS) + 1}): ${distinto.join(', ')}`);
    for (const k of distinto) console.log(`  ${k}: A=${fa[k]} · B=${fb[k]}`);
    process.exit(0);
  }
}
console.log(`Idénticas durante ${an} años.`);
