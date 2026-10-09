// Trabajador que sigue simulando el mundo en directo dentro del navegador.
// Parte del mismo estado que guardó el servidor y avanza un día cada vez que
// pasa un día real del mundo (30 segundos). El motor es determinista: calcula
// exactamente lo mismo que calculará el servidor en su siguiente ejecución.

const parametros = new URL(self.location.href).searchParams;
const version = parametros.get('v') ?? 'dev';
const motor = await import(`./motor.js?v=${version}`);
motor.fijarMotor(version);

let mundo = null;
let base = 0;
let hechos = 0;
let cargando = false;

const datos = (url) => new URL(`${url}?v=${Date.now()}`, self.location.href);

async function cargar() {
  if (cargando) return;
  cargando = true;
  try {
    const r = await fetch(datos('datos/estado.json'), { cache: 'no-store' });
    if (!r.ok) throw new Error(`estado: ${r.status}`);
    mundo = motor.migrar(await r.json());
    // Sin reloj (un mundo de prueba), el directo empieza ahora.
    base = Date.parse(mundo.reloj) || Date.now();
    hechos = 0;
    ponerAlDia();
  } catch (e) {
    postMessage({ tipo: 'error', mensaje: String(e) });
  } finally {
    cargando = false;
  }
}

function ponerAlDia() {
  if (!mundo) return;
  const objetivo = Math.floor((Date.now() - base) / motor.MS_POR_DIA);
  if (objetivo <= hechos && hechos > 0) return;
  // Si la página lleva mucho tiempo sin datos nuevos no se recalcula sin fin.
  const limite = Math.min(objetivo, hechos + 2000);
  while (hechos < limite) {
    motor.avanzar(mundo, 1);
    hechos++;
  }
  postMessage({
    tipo: 'dia',
    datos: motor.datosWeb(mundo, new Date()),
    cronica: mundo.cronica,
    historia: mundo.historia,
    inicioDia: base + hechos * motor.MS_POR_DIA,
    msPorDia: motor.MS_POR_DIA,
  });
}

/** Cada pocos minutos se comprueba si el servidor ya ha guardado un mundo más reciente. */
async function revisarServidor() {
  try {
    const r = await fetch(datos('datos/mundo.json'), { cache: 'no-store' });
    if (!r.ok) return;
    const servidor = await r.json();
    if (servidor.motor !== version) postMessage({ tipo: 'recargar' });
    else if (Date.parse(servidor.reloj) > base) await cargar();
  } catch {
    // Sin conexión: se sigue simulando por nuestra cuenta.
  }
}

onmessage = (e) => {
  if (e.data?.tipo === 'empezar') {
    cargar();
    setInterval(ponerAlDia, 1000);
    setInterval(revisarServidor, 5 * 60 * 1000);
  }
};
