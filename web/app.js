// Visor de Nueva Era: el mundo en 3D a pantalla completa y, encima, los paneles.
// Un trabajador (vivo.js) sigue simulando el mundo en el navegador, un día cada
// 30 segundos; mientras arranca (o si no puede) se muestran los datos que publicó
// el servidor en datos/*.json.

import { Mundo3D } from './mundo3d.js?v=__MOTOR__';

const MOTOR = '__MOTOR__';
const $ = (s) => document.querySelector(s);
const NUM = new Intl.NumberFormat('es-ES');

/** Crea un elemento. Los textos siempre como nodos de texto (nunca HTML). */
function h(tag, attrs, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  poner(el, ...hijos);
  return el;
}

function poner(el, ...hijos) {
  for (const c of hijos.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

function rellenar(el, ...hijos) {
  el.replaceChildren();
  return poner(el, ...hijos);
}

const SVG = 'http://www.w3.org/2000/svg';
function s(tag, attrs, texto) {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
  if (texto !== undefined) el.textContent = texto;
  return el;
}

const E = {
  mundo: null,
  cronica: [],
  historia: [],
  pestana: null,
  foco: null,
  aldea: null,
  persona: null,
  filtro: 'todo',
  cuantosCronica: 120,
  cuantosGente: 120,
  busqueda: '',
  aldeaGente: 'todas',
  aldeaIdioma: null,
  porId: new Map(),
  aldeas: new Map(),
  directo: false,
  vistos: null,
  historiaPintada: '',
};

const TITULOS = {
  aldea: 'Aldea', cronica: 'Crónica', saberes: 'Saberes', idioma: 'Idioma', gente: 'Gente', evolucion: 'Gráficas', como: '¿Qué es esto?',
};

const ACTIVIDAD = {
  recolectar: 'recolecta', cazar: 'caza', pescar: 'pesca', lenar: 'corta leña', picar: 'pica piedra',
  barro: 'saca arcilla', cultivar: 'cultiva', pastorear: 'pastorea', construir: 'construye',
  experimentar: 'experimenta', descansar: 'descansa', jugar: 'juega', vigilar: 'vigila',
  asaltar: 'asalta otra aldea', defender: 'defiende la aldea',
};

const ACCION = {
  recolectar: 'recolectar', cazar: 'cazar', pescar: 'pescar', lenar: 'cortar leña', picar: 'picar piedra', barro: 'sacar arcilla',
  cultivar: 'cultivar', pastorear: 'pastorear', construir: 'construir', experimentar: 'experimentar', descansar: 'descansar', vigilar: 'vigilar',
};

const PRIORIDAD = {
  comida: 'Comida', invierno: 'Invierno', obras: 'Obras', saber: 'Saber', expandir: 'Nuevas tierras', defensa: 'Defensa',
};

const GENES = [
  ['curiosidad', 'Curiosidad'], ['sociabilidad', 'Sociabilidad'], ['fuerza', 'Fuerza'], ['destreza', 'Destreza'],
  ['resistencia', 'Resistencia'], ['fertilidad', 'Fertilidad'], ['longevidad', 'Longevidad'], ['agresividad', 'Agresividad'],
];

const CAUSAS = {
  vejez: 'Vejez', enfermedad: 'Enfermedad', hambre: 'Hambre', 'frío': 'Frío', lobos: 'Lobos', oso: 'Osos', parto: 'Parto', herida: 'Heridas',
  combate: 'Combates', fuego: 'Incendios', ahogado: 'Ahogados',
};

const EDIFICIOS = {
  hoguera: 'hoguera', choza: 'choza', casa: 'casa de adobe', campo: 'campo', corral: 'corral', almacen: 'almacén',
  horno: 'horno', empalizada: 'empalizada', muralla: 'muralla de piedra', archivo: 'casa de las tablillas', mercado: 'mercado',
};

/** Hacia dónde empuja el consejo a los que experimentan. */
const FOCOS = {
  comida: 'la comida (cultivar, criar, pescar mejor)',
  obras: 'las obras (construir y trabajar los materiales)',
  saber: 'el saber (contar, escribir, comerciar)',
  guerra: 'las armas y las defensas',
};

const UNA = {
  hoguera: 'una hoguera', choza: 'una choza', casa: 'una casa de adobe', campo: 'un campo nuevo', corral: 'un corral', almacen: 'un almacén',
  horno: 'un horno', empalizada: 'la empalizada', muralla: 'la muralla de piedra', archivo: 'la casa de las tablillas', mercado: 'el mercado',
};

const GRUPOS = {
  todo: ['Todo', null],
  politica: ['Política', ['consejo', 'faccion', 'cisma', 'guerra', 'asalto', 'paz', 'alianza']],
  saber: ['Saber', ['descubrimiento', 'redescubrimiento', 'difusion', 'perdida', 'olvido']],
  aldeas: ['Aldeas', ['inicio', 'fundacion', 'abandono', 'traslado', 'edificio', 'contacto', 'poblacion']],
  vidas: ['Vidas', ['muerte']],
  lenguas: ['Lenguas', ['lengua']],
  desgracias: ['Desgracias', ['lobos', 'fieras', 'incendio', 'inundacion', 'epidemia', 'sequia', 'hambre', 'extincion']],
};

// ---------- utilidades ----------

const DIAS_ANIO = 120;
const anioDe = (t) => Math.floor(t / DIAS_ANIO) + 1;
const ESTACIONES = ['primavera', 'verano', 'otoño', 'invierno'];
const fechaDe = (t) => `Año ${anioDe(t)}, ${ESTACIONES[Math.floor((t % DIAS_ANIO) / 30)]}`;
const pct = (x) => `${Math.round(x * 100)} %`;
const mayus = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const alAzar = (lista) => lista[Math.floor(Math.random() * lista.length)];
const reducido = window.matchMedia('(prefers-reduced-motion: reduce)');

function anios(n) {
  const k = Math.floor(n);
  return k === 1 ? '1 año' : `${k} años`;
}

function listar(xs) {
  if (xs.length <= 1) return xs.join('');
  return `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`;
}

function vivas() {
  return E.mundo.aldeas.filter((a) => a.abandonada === null);
}

function nombreSaber(id) {
  return E.mundo.tecnicas.find((t) => t.id === id)?.nombre ?? E.mundo.nombres[id] ?? id;
}

function frase(prioridad) {
  return E.mundo?.frases?.[prioridad] ?? prioridad;
}

function faccionDe(p) {
  if (p.faccion === null || p.faccion === undefined) return null;
  return E.aldeas.get(p.aldea)?.facciones?.find((f) => f.id === p.faccion) ?? null;
}

const ICONOS = {
  gente: 'M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6.5 9a6.5 6.5 0 0 1 13 0',
  comida: 'M12 8c-2-2-7-1.5-7 3.5 0 4.5 3.5 8.5 7 8.5s7-4 7-8.5C19 6.5 14 6 12 8Zm0 0c0-2 1-3.5 3-4.5',
  madera: 'M6 8h10a4 4 0 0 1 0 8H6a4 4 0 0 1 0-8Zm10 2.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z',
  piedra: 'M4 18l2.5-7L11 6l6 2 3 10Zm7-12 1 5 5 2',
  saber: 'M12 3a6 6 0 0 0-3.5 10.9V17h7v-3.1A6 6 0 0 0 12 3Zm-2.5 17h5',
  peligro: 'M12 3l9 16H3Zm0 6v4m0 3v.5',
};

function icono(nombre) {
  const svg = s('svg', { viewBox: '0 0 24 24', width: 16, height: 16, 'aria-hidden': 'true' });
  svg.append(s('path', { d: ICONOS[nombre], fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  return svg;
}

// ---------- el mundo en 3D ----------

let mundo = null;
try {
  mundo = new Mundo3D($('#lienzo'), $('#capa'), { alTocar: tocado, minimapa: $('#minimapa') });
} catch (e) {
  console.error(e);
  $('#cargando').textContent = 'Tu navegador no puede mostrar el mundo en 3D, pero puedes seguirlo desde las secciones de abajo.';
  $('#camara').hidden = true;
  $('#minimapa-caja').hidden = true;
}

// El minimapa se puede plegar (y se recuerda en este navegador).
function plegarMapa(plegado) {
  $('#minimapa-caja').classList.toggle('plegado', plegado);
  $('#plegar-mapa').setAttribute('aria-pressed', String(plegado));
  $('#plegar-mapa').setAttribute('aria-label', plegado ? 'Mostrar el minimapa' : 'Plegar el minimapa');
  try {
    localStorage.setItem('nueva-era-minimapa', plegado ? 'plegado' : '');
  } catch {}
}
$('#plegar-mapa').addEventListener('click', () => plegarMapa(!$('#minimapa-caja').classList.contains('plegado')));
try {
  if (localStorage.getItem('nueva-era-minimapa') === 'plegado') plegarMapa(true);
} catch {}

function tocado({ persona, aldea } = {}) {
  if (persona !== undefined) {
    E.persona = persona;
    E.aldea = aldea;
    seleccionar();
    mundo?.enfocarPersona(persona, reducido.matches);
    abrir('aldea');
  } else if (aldea !== undefined) {
    E.aldea = aldea;
    E.persona = null;
    seleccionar();
    mundo?.enfocar(aldea, reducido.matches);
    abrir('aldea');
  } else {
    E.persona = null;
    seleccionar();
    if (E.pestana === 'aldea') pintarPestana();
  }
}

function seleccionar() {
  const p = E.persona !== null ? E.porId.get(E.persona) : null;
  mundo?.elegir(p ? { persona: p.id, aldea: p.aldea } : E.aldea !== null ? { aldea: E.aldea } : null, p ? pensamientoDe(p, true) : null);
}

$('#acercar').addEventListener('click', () => mundo?.acercar(0.7));
$('#alejar').addEventListener('click', () => mundo?.acercar(1 / 0.7));
$('#girar').addEventListener('click', () => mundo?.girar(Math.PI / 4));

// Para hacer pruebas: ?depurar deja el mundo a mano en la consola.
if (new URLSearchParams(location.search).has('depurar')) window.nuevaEra = { get mundo() { return mundo; }, E };

// ---------- lo que piensan ----------

function pensamientoDe(p, elegido = false) {
  const d = E.mundo;
  const a = E.aldeas.get(p.aldea);
  if (p.edad < 5) return alAzar(['¡Mamá!', '¿Por qué quema el fuego?', 'Tengo sueño…', '¡Mira, un pájaro!']);
  const urgentes = [];
  if (p.reservas < 1.5) urgentes.push('Tengo hambre…', 'Hoy apenas he comido.');
  if (p.salud < 0.4) urgentes.push('No me encuentro bien…');
  if (p.act === 'asaltar') urgentes.push('¡Necesitamos su comida!', '¡Que paguen por lo que nos hicieron!');
  if (p.act === 'defender') urgentes.push('¡Fuera de nuestra aldea!', '¡Defended a los niños!');
  if (a && (d.incendios ?? []).some((i) => Math.hypot((i % d.ancho) - a.x, Math.floor(i / d.ancho) - a.y) < 7)) {
    urgentes.push('¡El bosque arde! ¡Hay que salvar las casas!', 'Huele a humo… el fuego viene hacia aquí.');
  }
  if (urgentes.length) return alAzar(urgentes);
  if (p.edad < 14) {
    return alAzar(['¡A jugar!', 'De mayor quiero cazar.', '¿Me enseñas a hacer eso?', p.act === 'jugar' ? '¡No me pillas!' : 'Ya casi soy mayor.']);
  }
  const otono = d.estacion === 'otoño';
  const invierno = d.estacion === 'invierno';
  const idea = p.idea;
  const trabajo = {
    recolectar: ['Estas bayas están en su punto.', 'Hay que llenar la cesta antes de que oscurezca.'],
    cazar: ['Silencio… hay un ciervo cerca.', 'Hoy volveré con carne.'],
    pescar: ['Hoy pican.', 'El agua da de comer a quien tiene paciencia.'],
    lenar: [otono || invierno ? 'Sin leña no pasaremos el invierno.' : 'Buena madera, esta.'],
    picar: ['Esta piedra servirá.', 'Más piedra para las obras.'],
    barro: ['Buen barro, este.'],
    cultivar: otono ? ['¡Qué cosecha!', 'Hay que recogerlo todo antes del frío.'] : ['Si llueve, este año comeremos bien.'],
    pastorear: ['Las ovejas están tranquilas.'],
    construir: [a?.obra ? `Estamos levantando ${UNA[a.obra.tipo] ?? 'algo nuevo'}.` : 'Un poco más y está.'],
    experimentar: idea ? [`¿Y si pruebo a ${idea.verbo} ${listar(idea.cosas)}?`] : ['Tiene que haber otra manera…', '¿Qué pasará si…?'],
    descansar: ['Necesito descansar.', 'Qué bien se está aquí.'],
    vigilar: [(a?.amenaza ?? 0) > 0.3 ? 'No volverán a pillarnos desprevenidos.' : 'Todo tranquilo por ahora.'],
  }[p.act] ?? [];
  if (elegido && trabajo.length) return alAzar(trabajo);
  const ops = [...trabajo, ...trabajo];
  if (a?.consejo && p.opinion) {
    if (p.opinion === a.consejo.prioridad) ops.push(`El consejo acierta: ${frase(p.opinion)}.`);
    else ops.push(`Yo creo que ${frase(p.opinion)}.`, 'El consejo se equivoca.');
  }
  const f = faccionDe(p);
  if (f) ops.push(f.descontento > 0.6 ? 'Si el consejo no nos escucha, nos iremos.' : `Los ${f.nombre} tenemos razón.`);
  if (invierno) ops.push('Qué frío…');
  const fieras = a ? (d.fauna ?? []).filter((f) => Math.hypot(f.x - a.x, f.y - a.y) < 7) : [];
  if (fieras.some((f) => f.tipo === 'lobos')) ops.push('Esta noche se oyen lobos muy cerca.', 'No dejéis solos a los niños: hay lobos.');
  if (fieras.some((f) => f.tipo === 'oso')) ops.push('He visto huellas de oso junto al arroyo.');
  if (p.act === 'pescar' && p.saberes.includes('canoa')) ops.push('Con la canoa llegaremos a la isla.');
  if (p.edad > 60) ops.push('Cuando yo era joven, todo esto era distinto.');
  if (p.desc > 0) ops.push('Yo descubrí algo que nadie sabía.');
  if (p.pareja === null && p.edad > 18 && p.edad < 40) ops.push('Algún día formaré una familia.');
  const rencor = (d.relaciones ?? []).filter((r) => (r.a === p.aldea || r.b === p.aldea) && r.rencor > 0.4 && !r.alianza);
  if (rencor.length) {
    const otra = E.aldeas.get(rencor[0].a === p.aldea ? rencor[0].b : rencor[0].a);
    if (otra) ops.push(`No me fío de los de ${otra.nombre}.`);
  }
  return ops.length ? alAzar(ops) : 'Un día más.';
}

setInterval(() => {
  if (!mundo || !E.mundo || document.hidden) return;
  const cerca = mundo.visiblesCerca(40).filter((p) => p.id !== E.persona);
  if (!cerca.length) return;
  const p = alAzar(cerca);
  mundo.pensamiento(p.id, pensamientoDe(E.porId.get(p.id) ?? p));
}, 6500);

// ---------- datos ----------

function recibir(datos, cronica, historia, inicioDia, msPorDia) {
  const primero = !E.mundo;
  const antes = E.cronica;
  E.mundo = datos;
  E.cronica = cronica;
  E.historia = historia;
  E.porId = new Map(datos.personas.map((p) => [p.id, p]));
  E.aldeas = new Map(datos.aldeas.map((a) => [a.id, a]));
  if (E.persona !== null && !E.porId.has(E.persona)) E.persona = null;
  if (E.aldea !== null && !E.aldeas.has(E.aldea)) E.aldea = null;
  $('#cargando').hidden = true;
  if (mundo) {
    mundo.inicioDia = inicioDia;
    mundo.msPorDia = msPorDia;
    mundo.actualizar(datos);
    E.foco = mundo.aldeaCercana() ?? E.foco;
    seleccionar();
  } else if (E.foco === null || !E.aldeas.has(E.foco)) {
    const v = vivas();
    E.foco = v.length ? v.reduce((x, y) => (y.poblacion > x.poblacion ? y : x)).id : null;
  }
  avisarNovedades(primero, antes);
  pintarHud();
  pintarPestana(true);
}

/** Lo que ha pasado desde la última vez sale como aviso. */
function avisarNovedades(primero, antes) {
  const era = E.mundo.era;
  const interesa = (x) => x.era === era && x.tipo !== 'sequia' && x.tipo !== 'difusion';
  if (primero) {
    const ultimo = E.cronica.filter(interesa).at(-1);
    if (ultimo) avisar(ultimo);
  } else {
    const clave = (x) => `${x.era}-${x.t}-${x.texto}`;
    const viejos = new Set(antes.slice(-200).map(clave));
    const nuevos = E.cronica.slice(-30).filter((x) => interesa(x) && !viejos.has(clave(x)));
    for (const x of nuevos.slice(-3)) avisar(x);
  }
}

const cola = [];
let avisando = false;
function avisar(suceso) {
  cola.push(suceso);
  if (!avisando) siguienteAviso();
}

function siguienteAviso() {
  const x = cola.shift();
  if (!x) {
    avisando = false;
    return;
  }
  avisando = true;
  const el = h(
    'button',
    { class: 'aviso', 'data-tipo': x.tipo, type: 'button', onclick: () => {
      if (x.aldea !== undefined && E.aldeas.has(x.aldea)) tocado({ aldea: x.aldea });
      else abrir('cronica');
    } },
    h('span', { class: `punto t-${x.tipo}` }),
    h('span', {}, h('time', {}, fechaDe(x.t)), x.texto),
  );
  $('#avisos').append(el);
  setTimeout(() => {
    el.classList.add('fuera');
    setTimeout(() => {
      el.remove();
      siguienteAviso();
    }, 400);
  }, 7000);
}

let worker = null;
let respaldo = null;

function arrancarDirecto() {
  try {
    worker = new Worker(new URL(`vivo.js?v=${MOTOR}`, import.meta.url), { type: 'module' });
  } catch (e) {
    console.warn('Sin simulación en directo:', e);
    return;
  }
  worker.onmessage = (e) => {
    const m = e.data;
    if (m.tipo === 'dia') {
      if (!E.directo) {
        E.directo = true;
        $('#directo').hidden = false;
        clearInterval(respaldo);
      }
      recibir(m.datos, m.cronica, m.historia, m.inicioDia, m.msPorDia);
    } else if (m.tipo === 'recargar') {
      recargar();
    } else if (m.tipo === 'error') {
      console.warn('El trabajador no pudo simular:', m.mensaje);
    }
  };
  worker.onerror = (e) => {
    console.warn('El trabajador falló:', e.message);
    E.directo = false;
    $('#directo').hidden = true;
  };
  worker.postMessage({ tipo: 'empezar' });
}

/** Hay una versión nueva del motor: se recarga (como mucho una vez cada 15 minutos). */
function recargar() {
  let ultima = 0;
  try {
    ultima = Number(sessionStorage.getItem('nueva-era-recarga') || 0);
  } catch {}
  if (Date.now() - ultima < 15 * 60 * 1000) return;
  try {
    sessionStorage.setItem('nueva-era-recarga', String(Date.now()));
  } catch {}
  location.reload();
}

async function cargarPublicado() {
  const leer = (n) =>
    fetch(`datos/${n}.json?v=${Date.now()}`, { cache: 'no-store' }).then((r) => {
      if (!r.ok) throw new Error(`${n}: ${r.status}`);
      return r.json();
    });
  try {
    const [datos, cronica, historia] = await Promise.all([leer('mundo'), leer('cronica'), leer('historia')]);
    if (E.directo) return;
    recibir(datos, cronica, historia, Date.parse(datos.reloj) || Date.now(), 30000);
  } catch (e) {
    console.error(e);
    if (!E.mundo) $('#cargando').textContent = 'El mundo aún no ha despertado. Vuelve en unos minutos.';
  }
}

// ---------- barra superior ----------

function pintarHud() {
  const m = E.mundo;
  $('#era').textContent = `Era ${m.era}`;
  $('#era').classList.toggle('primera', m.era === 1);
  $('#era').title = m.eras.length ? `La especie se ha extinguido ${m.eras.length} ${m.eras.length === 1 ? 'vez' : 'veces'}` : 'Primera era';
  const sequia = m.clima < 0.7 ? ' · sequía' : '';
  $('#fecha').textContent = `Año ${m.anio} · ${m.estacion}${sequia}`;
  const a = E.foco !== null ? E.aldeas.get(E.foco) : null;
  const rec = $('#recursos');
  if (!a || a.abandonada !== null) {
    rellenar(rec, h('span', { class: 'recurso' }, icono('gente'), `${NUM.format(m.poblacion)} personas`), h('span', { class: 'recurso' }, icono('saber'), `${m.tecnicas.length}/${m.totalSaberes} saberes`));
    $('#consejo').hidden = true;
    return;
  }
  const comida = a.diasComida;
  rellenar(
    rec,
    h('button', { class: 'recurso aldea', type: 'button', onclick: () => tocado({ aldea: a.id }) }, a.nombre),
    h('span', { class: 'recurso', title: 'Habitantes de la aldea' }, icono('gente'), `${a.poblacion}`),
    h('span', { class: `recurso${comida < 10 ? ' mal' : ''}`, title: 'Días de comida guardada' }, icono('comida'), `${comida} d`),
    h('span', { class: 'recurso', title: 'Madera guardada' }, icono('madera'), NUM.format(a.despensa.madera ?? 0)),
    h('span', { class: 'recurso', title: 'Piedra guardada' }, icono('piedra'), NUM.format(a.despensa.piedra ?? 0)),
    h('span', { class: 'recurso', title: 'Saberes de la aldea' }, icono('saber'), `${a.conocidos.length}`),
    a.amenaza > 0.3 ? h('span', { class: 'recurso mal', title: 'Se sienten amenazados' }, icono('peligro'), 'alerta') : null,
  );
  const c = $('#consejo');
  if (a.consejo) {
    const f = a.facciones.filter((x) => x.opinion !== a.consejo.prioridad);
    rellenar(
      c,
      h('span', { class: 'consejo-l' }, 'Consejo'),
      h('span', { class: 'consejo-t' }, mayus(frase(a.consejo.prioridad))),
      a.consejo.guerra ? h('span', { class: 'consejo-f guerra' }, `· en guerra con ${a.consejo.guerra.nombre}`) : null,
      f.length ? h('span', { class: 'consejo-f' }, f.length === 1 ? `· los ${f[0].nombre} no están de acuerdo` : `· ${f.length} facciones en contra`) : null,
    );
    c.hidden = false;
    c.onclick = () => tocado({ aldea: a.id });
  } else {
    c.hidden = true;
  }
}

/** La barra de arriba muestra la aldea más cercana al centro de la vista. */
setInterval(() => {
  if (!mundo || !E.mundo) return;
  const f = mundo.aldeaCercana();
  if (f !== null && f !== E.foco) {
    E.foco = f;
    pintarHud();
    if (E.pestana === 'aldea' && E.aldea === null && E.persona === null) pintarPestana(true);
  }
}, 700);

new ResizeObserver(() => {
  document.documentElement.style.setProperty('--alto-hud', `${$('#hud').offsetHeight}px`);
  encuadrar(true);
}).observe($('#hud'));

// ---------- paneles ----------

const hoja = $('#hoja');
const cuerpo = $('#cuerpo');

/** Que lo que se mira quede en el centro de la parte del mundo que no tapan los paneles. */
function encuadrar(inmediato = false) {
  if (!mundo) return;
  const w = window.innerWidth;
  const alto = window.innerHeight;
  const arriba = $('#hud').getBoundingClientRect().bottom;
  let abajo = $('#barra').getBoundingClientRect().top;
  let derecha = w;
  if (!hoja.hidden) {
    const r = hoja.getBoundingClientRect();
    if (r.left > w * 0.3) derecha = r.left;
    else abajo = r.top;
  }
  mundo.desplazarVista(w / 2 - derecha / 2, alto / 2 - (arriba + abajo) / 2, inmediato || reducido.matches);
}

function abrir(p) {
  E.pestana = p;
  hoja.hidden = false;
  document.body.classList.add('con-hoja');
  encuadrar();
  $('#hoja-titulo').textContent = TITULOS[p];
  for (const b of document.querySelectorAll('[data-p]')) b.setAttribute('aria-pressed', String(b.dataset.p === p));
  E.historiaPintada = '';
  cuerpo.scrollTop = 0;
  pintarPestana();
}

function cerrar() {
  E.pestana = null;
  hoja.hidden = true;
  document.body.classList.remove('con-hoja');
  encuadrar();
  for (const b of document.querySelectorAll('[data-p]')) b.setAttribute('aria-pressed', 'false');
}

for (const b of document.querySelectorAll('[data-p]')) {
  b.addEventListener('click', () => (E.pestana === b.dataset.p ? cerrar() : abrir(b.dataset.p)));
}
$('#cerrar').addEventListener('click', cerrar);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && E.pestana) cerrar();
});

/** Repinta la sección abierta. Con «auto» (llegó un día nuevo) se respeta lo que se está haciendo. */
function pintarPestana(auto = false) {
  const p = E.pestana;
  if (!p) return;
  if (p === 'como') {
    if (!cuerpo.querySelector('.prosa')) rellenar(cuerpo, $('#t-como').content.cloneNode(true));
    return;
  }
  if (!E.mundo) {
    rellenar(cuerpo, h('p', { class: 'vacio' }, 'Cargando…'));
    return;
  }
  if (auto && cuerpo.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;
  if (auto && p === 'evolucion' && E.historiaPintada === `${E.historia.length}-${cuerpo.clientWidth}`) return;
  const arriba = cuerpo.scrollTop;
  if (p === 'aldea') pintarAldea();
  if (p === 'cronica') pintarCronica();
  if (p === 'saberes') pintarSaberes();
  if (p === 'idioma') pintarIdioma();
  if (p === 'gente') pintarGente();
  if (p === 'evolucion') pintarEvolucion();
  if (auto) cuerpo.scrollTop = arriba;
}

// ---------- aldea y persona ----------

function enlacePersona(id, texto) {
  const p = E.porId.get(id);
  if (!p) return texto ?? 'ya fallecido';
  return h('button', { class: 'enlace', type: 'button', onclick: () => elegirPersona(p.id) }, texto ?? p.nombre);
}

function elegirPersona(id) {
  const p = E.porId.get(id);
  if (!p) return;
  E.persona = id;
  E.aldea = p.aldea;
  seleccionar();
  mundo?.enfocarPersona(id, reducido.matches);
  abrir('aldea');
}

/** Barra que crece hacia la derecha (positivo) o la izquierda (negativo) desde el centro. */
function divergente(v) {
  const ancho = Math.round(Math.min(1, Math.abs(v) / 0.6) * 50);
  return h('div', { class: 'pista divergente' }, h('div', { class: v < 0 ? 'neg' : 'pos', style: `width:${ancho}%` }));
}

function medidor(valor, clase = '') {
  return h('div', { class: `pista ${clase}` }, h('div', { style: `width:${Math.round(Math.max(0, Math.min(1, valor)) * 100)}%` }));
}

function fichaPersona(p) {
  const m = E.mundo;
  const vivos = m.personas.filter((q) => q.padre === p.id || q.madre === p.id).length;
  const pariente = (id) => (E.porId.has(id) ? enlacePersona(id) : 'ya murió');
  const a = E.aldeas.get(p.aldea);
  const f = faccionDe(p);
  const hijos = [
    h('h3', {}, `${p.nombre} `, h('span', { class: 'etiqueta' }, p.sexo === 'M' ? 'mujer' : 'hombre'), f ? h('span', { class: 'etiqueta faccion' }, `de los ${f.nombre}`) : null),
    h('p', { class: 'cita' }, `«${pensamientoDe(p, true)}»`),
    h(
      'dl',
      { class: 'datos' },
      h('div', {}, h('dt', {}, 'Edad'), h('dd', {}, anios(p.edad))),
      h('div', {}, h('dt', {}, 'Aldea'), h('dd', {}, a?.nombre ?? '–')),
      h('div', {}, h('dt', {}, 'Ahora'), h('dd', {}, ACTIVIDAD[p.act] || p.act)),
      h('div', {}, h('dt', {}, 'Salud'), h('dd', {}, pct(p.salud))),
      p.madre === null && p.padre === null
        ? h('div', {}, h('dt', {}, 'Padres'), h('dd', {}, 'de los primeros'))
        : [h('div', {}, h('dt', {}, 'Madre'), h('dd', {}, p.madre !== null ? pariente(p.madre) : '—')), h('div', {}, h('dt', {}, 'Padre'), h('dd', {}, p.padre !== null ? pariente(p.padre) : '—'))],
      h('div', {}, h('dt', {}, 'Pareja'), h('dd', {}, p.pareja !== null ? enlacePersona(p.pareja) : '—')),
      h('div', {}, h('dt', {}, 'Hijos'), h('dd', {}, `${p.hijos}${vivos !== p.hijos ? ` (${vivos} vivos)` : ''}`)),
      h('div', {}, h('dt', {}, 'Descubrimientos'), h('dd', {}, String(p.desc))),
    ),
  ];
  if (p.opinion) {
    const deAcuerdo = a?.consejo?.prioridad === p.opinion;
    hijos.push(
      h('h3', {}, 'Qué opina'),
      h('p', {}, `Cree que ${frase(p.opinion)}${a?.consejo ? (deAcuerdo ? ', como el consejo.' : '; el consejo no piensa igual.') : '.'}`),
    );
  }
  if (p.gustos) {
    const orden = m.acciones.map((k, i) => [k, p.gustos[i]]).sort((x, y) => y[1] - x[1]);
    hijos.push(
      h('h3', {}, 'Su mente'),
      h('p', { class: 'nota' }, 'Lo que su red neuronal espera de cada actividad en un día normal: más que la media de su aldea (+) o menos (−). Lo ha aprendido viviendo y lo heredó de sus padres.'),
      h(
        'div',
        { class: 'mente' },
        orden.map(([k, v]) => h('div', { class: 'gen' }, h('span', {}, mayus(ACCION[k] ?? k)), divergente(v), h('span', {}, `${v > 0 ? '+' : ''}${Math.round(v * 100)}`))),
      ),
    );
  }
  hijos.push(
    h('h3', {}, 'Genes'),
    h('div', { class: 'genes' }, GENES.map(([k, t]) => h('div', { class: 'gen' }, h('span', {}, t), medidor(p.genes[k] ?? 0), h('span', {}, pct(p.genes[k] ?? 0))))),
    h('h3', {}, `Sabe hacer (${p.saberes.length})`),
    p.saberes.length ? h('div', { class: 'fila' }, p.saberes.map((id) => h('span', { class: 'etiqueta' }, nombreSaber(id)))) : h('p', { class: 'nota' }, 'Todavía nada.'),
  );
  return h('div', { class: 'tarjeta' }, hijos);
}

function relacionTexto(r) {
  if (r.guerra) return ['En guerra', 'mal'];
  if (r.alianza) return ['Aliados', 'bien'];
  if (r.rencor > 0.5) return ['Enemistad', 'mal'];
  if (r.rencor > 0.2) return ['Recelo', 'mal'];
  if (r.afinidad > 0.5) return ['Amistad', 'bien'];
  return ['Trato normal', ''];
}

/** La manada de lobos y el oso despiertos más cercanos a una aldea. */
function fierasCerca(a, m) {
  const cerca = (tipo) =>
    (m.fauna ?? [])
      .filter((f) => f.tipo === tipo && f.estado !== 'hiberna')
      .map((f) => ({ f, d: Math.round(Math.hypot(f.x - a.x, f.y - a.y)) }))
      .sort((x, y) => x.d - y.d)[0];
  const lobos = cerca('lobos');
  const oso = cerca('oso');
  const partes = [];
  const famelicos = (f) => (f.hambre >= 0.85 ? ', famélicos' : f.hambre >= 0.5 ? ', con hambre' : '');
  if (lobos) partes.push(`${lobos.f.estado === 'acecha' || lobos.f.estado === 'ataca' ? '¡lobos rondando la aldea!' : `${lobos.f.n} lobos a ${lobos.d} casillas${famelicos(lobos.f)}`}`);
  if (oso) partes.push(`${oso.f.estado === 'ataca' ? '¡un oso atacando!' : `un oso a ${oso.d}`}`);
  return partes.length ? partes.join(', ') : 'ninguna a la vista';
}

function fichaAldea(a) {
  const m = E.mundo;
  const cuenta = {};
  for (const e of a.edificios) cuenta[e.tipo] = (cuenta[e.tipo] || 0) + 1;
  const origen = a.origen !== null ? E.aldeas.get(a.origen)?.nombre : null;
  const parecidos = m.parecidos
    .filter(([x, y]) => x === a.id || y === a.id)
    .map(([x, y, v]) => [E.aldeas.get(x === a.id ? y : x)?.nombre, v])
    .sort((p, q) => q[1] - p[1]);
  const ruina = a.abandonada !== null;
  const hijos = [
    h(
      'div',
      { class: 'cab-aldea' },
      h('h3', {}, a.nombre, ruina ? h('span', { class: 'etiqueta perdido' }, `abandonada en el año ${a.abandonada}`) : null),
      mundo ? h('button', { class: 'ir', type: 'button', onclick: () => mundo.enfocar(a.id, reducido.matches) }, 'Ver en el mapa') : null,
    ),
    h(
      'p',
      { class: 'nota' },
      origen === null && !a.fundador
        ? 'El primer campamento del mundo.'
        : `Fundada en el año ${a.fundada}${a.fundador ? ` por ${a.fundador}` : ''}${origen ? `, que venía de ${origen}` : ''}.`,
    ),
    h(
      'dl',
      { class: 'datos' },
      h('div', {}, h('dt', {}, 'Habitantes'), h('dd', {}, `${a.poblacion} (máximo ${a.poblacionMax})`)),
      h('div', {}, h('dt', {}, 'Comida guardada'), h('dd', {}, ruina ? '—' : `${a.diasComida} días`)),
      h('div', {}, h('dt', {}, 'Construyendo'), h('dd', {}, a.obra ? `${EDIFICIOS[a.obra.tipo] || a.obra.tipo} (${pct(a.obra.progreso)})` : 'nada')),
      h('div', {}, h('dt', {}, 'Sensación de peligro'), h('dd', {}, a.amenaza > 0.3 ? 'alta' : a.amenaza > 0.1 ? 'algo' : 'tranquilos')),
      ruina ? null : h('div', {}, h('dt', {}, 'Fieras cerca'), h('dd', {}, fierasCerca(a, m))),
      h('div', {}, h('dt', {}, 'Cementerio'), h('dd', {}, a.enterrados ? `${a.enterrados} ${a.enterrados === 1 ? 'tumba' : 'tumbas'}` : 'nadie enterrado aún')),
    ),
    a.difuntos?.length
      ? h('p', { class: 'nota' }, 'Últimos enterrados: ', a.difuntos.map((x) => `${x.nombre} (${anios(x.edad)}, ${(CAUSAS[x.causa] ?? x.causa).toLowerCase()}, año ${x.anio})`).join(' · '), '.')
      : null,
  ];
  if (a.consejo && !ruina) {
    const c = a.consejo;
    const total = Object.values(c.votos).reduce((x, y) => x + y, 0) || 1;
    hijos.push(
      h('h3', {}, 'El consejo'),
      h('p', { class: 'cita' }, `«${mayus(frase(c.prioridad))}»`),
      c.guerra ? h('p', { class: 'aviso-guerra' }, `En guerra con ${c.guerra.nombre} desde el año ${c.guerra.desde}: ${c.guerra.motivo}.`) : null,
      c.foco ? h('p', { class: 'nota' }, `Encauzan las ideas hacia ${FOCOS[c.foco] ?? c.foco}: quien experimenta prueba antes eso.`) : null,
      h('p', { class: 'nota' }, `Lo deciden desde el año ${c.desde}. Se reúnen cada noche junto al fuego: `, c.miembros.flatMap((x, i) => [i ? (i === c.miembros.length - 1 ? ' y ' : ', ') : '', enlacePersona(x.id, x.nombre ?? '¿?')]), '.'),
      h(
        'div',
        { class: 'genes' },
        Object.entries(c.votos)
          .sort((x, y) => y[1] - x[1])
          .map(([k, v]) => h('div', { class: 'gen' }, h('span', {}, PRIORIDAD[k] ?? k), medidor(v / total), h('span', {}, pct(v / total)))),
      ),
    );
  }
  if (a.facciones?.length && !ruina) {
    hijos.push(
      h('h3', {}, 'Facciones'),
      a.facciones.map((f) =>
        h(
          'div',
          { class: 'faccion-caja' },
          h('strong', {}, `Los ${f.nombre}`),
          h('p', {}, `Creen que ${frase(f.opinion)}. Son ${f.miembros}${f.lider ? ', guiados por ' : ''}`, f.lider ? enlacePersona(f.liderId, f.lider) : null, '.'),
          h('div', { class: 'gen' }, h('span', {}, 'Descontento'), medidor(f.descontento, 'naranja'), h('span', {}, pct(f.descontento))),
        ),
      ),
    );
  }
  const vecinos = (m.relaciones ?? []).filter((r) => r.a === a.id || r.b === a.id);
  if (vecinos.length && !ruina) {
    hijos.push(
      h('h3', {}, 'Vecinos'),
      h(
        'div',
        { class: 'vecinos' },
        vecinos
          .map((r) => [r, E.aldeas.get(r.a === a.id ? r.b : r.a)])
          .filter(([, b]) => b)
          .sort((x, y) => y[0].rencor + y[0].afinidad - (x[0].rencor + x[0].afinidad))
          .map(([r, b]) => {
            const [t, clase] = relacionTexto(r);
            return h(
              'div',
              { class: 'vecino' },
              h('button', { class: 'enlace', type: 'button', onclick: () => tocado({ aldea: b.id }) }, b.nombre),
              h('span', { class: `etiqueta ${clase}` }, t),
              h('div', { class: 'gen' }, h('span', {}, 'Amistad'), medidor(r.afinidad), h('span', {}, pct(r.afinidad))),
              h('div', { class: 'gen' }, h('span', {}, 'Rencor'), medidor(r.rencor, 'naranja'), h('span', {}, pct(r.rencor))),
            );
          }),
      ),
    );
  }
  hijos.push(
    Object.keys(cuenta).length ? [h('h3', {}, 'Edificios'), h('div', { class: 'fila' }, Object.entries(cuenta).map(([k, n]) => h('span', { class: 'etiqueta' }, `${n} × ${EDIFICIOS[k] || k}`)))] : null,
    h('h3', {}, `Saberes de la aldea (${a.conocidos.length})`),
    a.conocidos.length ? h('div', { class: 'fila' }, a.conocidos.map((id) => h('span', { class: 'etiqueta' }, nombreSaber(id)))) : h('p', { class: 'nota' }, 'Ninguno todavía.'),
    a.archivo.length ? h('p', { class: 'nota' }, `Escrito en tablillas: ${a.archivo.map(nombreSaber).join(', ')}.`) : null,
    parecidos.length ? h('p', { class: 'nota' }, `Su lengua se parece a la de ${parecidos.map(([n, v]) => `${n} (${pct(v)})`).join(', ')}.`) : null,
  );
  return h('div', { class: 'tarjeta' }, hijos);
}

function pintarAldea() {
  const hijos = [];
  if (E.persona !== null && E.porId.has(E.persona)) hijos.push(fichaPersona(E.porId.get(E.persona)));
  const id = E.aldea ?? E.foco;
  const a = id !== null ? E.aldeas.get(id) : null;
  if (a) hijos.push(fichaAldea(a));
  const otras = vivas().filter((x) => x.id !== id);
  if (otras.length) {
    hijos.push(
      h('h3', { class: 'sub' }, 'Otras aldeas'),
      h('div', { class: 'filtros' }, otras.map((x) => h('button', { type: 'button', onclick: () => tocado({ aldea: x.id }) }, `${x.nombre} · ${x.poblacion}`))),
    );
  }
  if (!hijos.length) hijos.push(h('p', { class: 'vacio' }, 'No queda nadie.'));
  rellenar(cuerpo, hijos);
}

// ---------- crónica ----------

function pintarCronica() {
  const filtros = h(
    'div',
    { class: 'filtros' },
    Object.entries(GRUPOS).map(([k, [t]]) =>
      h('button', { type: 'button', 'aria-pressed': String(E.filtro === k), onclick: () => ((E.filtro = k), (E.cuantosCronica = 120), pintarCronica()) }, t),
    ),
  );
  const tipos = GRUPOS[E.filtro][1];
  const lista = E.cronica.filter((x) => !tipos || tipos.includes(x.tipo)).slice().reverse();
  if (!lista.length) {
    rellenar(cuerpo, filtros, h('p', { class: 'vacio' }, 'Nada por aquí todavía.'));
    return;
  }
  const out = [];
  let clave = null;
  for (const x of lista.slice(0, E.cuantosCronica)) {
    const k = `${x.era}-${anioDe(x.t)}`;
    if (k !== clave) {
      clave = k;
      out.push(h('div', { class: 'cronica-anio' }, E.mundo.eras.length ? `Era ${x.era} · año ${anioDe(x.t)}` : `Año ${anioDe(x.t)}`));
    }
    out.push(h('div', { class: 'suceso' }, h('span', { class: `punto t-${x.tipo}` }), h('div', {}, h('time', {}, ESTACIONES[Math.floor((x.t % DIAS_ANIO) / 30)]), h('div', {}, x.texto))));
  }
  if (lista.length > E.cuantosCronica) {
    out.push(h('button', { class: 'mas', type: 'button', onclick: () => ((E.cuantosCronica += 200), pintarCronica()) }, `Ver más (${lista.length - E.cuantosCronica} restantes)`));
  }
  rellenar(cuerpo, filtros, out);
}

// ---------- saberes ----------

function pintarSaberes() {
  const m = E.mundo;
  const ts = m.tecnicas.slice().sort((a, b) => a.anio - b.anio);
  const quedan = m.totalSaberes - ts.length;
  const tarjetas = ts.map((t) => {
    const vivo = E.porId.get(t.porId);
    return h(
      'div',
      { class: 'tarjeta' },
      h('h3', {}, t.nombre, ' ', h('span', { class: 'palabra' }, `«${t.palabra}»`)),
      h('p', { class: 'nota', style: 'margin:0 0 6px' }, `Año ${t.anio} · ${t.por}, de ${t.aldea}, ${t.como}.`),
      h('p', { style: 'margin:0 0 8px' }, t.efecto),
      h(
        'div',
        { class: 'fila' },
        t.olvidado ? h('span', { class: 'etiqueta perdido' }, 'olvidado: nadie lo sabe ya') : h('span', { class: 'etiqueta' }, `lo saben ${NUM.format(t.saben)} personas`),
        vivo ? h('button', { class: 'etiqueta enlace-etiqueta', type: 'button', onclick: () => elegirPersona(vivo.id) }, `${t.por} sigue con vida`) : null,
      ),
    );
  });
  const bloqueadas = Array.from({ length: Math.min(quedan, 4) }, () => h('div', { class: 'tarjeta bloqueado', 'aria-hidden': 'true' }, '???'));
  rellenar(
    cuerpo,
    h('p', {}, `Han descubierto ${ts.length} de ${m.totalSaberes} saberes. Lo que no han descubierto no se muestra: ni ellos lo saben.`),
    h('div', { class: 'medidor', role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': String(m.totalSaberes), 'aria-valuenow': String(ts.length) }, h('div', { style: `width:${(ts.length / m.totalSaberes) * 100}%` })),
    tarjetas,
    bloqueadas,
    quedan > 4 ? h('p', { class: 'nota' }, `…y ${quedan - 4} más por descubrir.`) : null,
  );
}

// ---------- idioma ----------

function pintarIdioma() {
  const m = E.mundo;
  const aldeas = vivas().filter((a) => m.diccionario[a.id] && a.poblacion >= 3);
  if (!aldeas.length) {
    rellenar(cuerpo, h('p', { class: 'vacio' }, 'Aún no hay palabras.'));
    return;
  }
  if (!aldeas.some((a) => a.id === E.aldeaIdioma)) E.aldeaIdioma = aldeas.some((a) => a.id === E.foco) ? E.foco : aldeas[0].id;
  const dic = m.diccionario[E.aldeaIdioma] || {};
  const orden = (c) => (m.conceptos.includes(c) ? 0 : m.tecnicas.some((t) => t.id === c) ? 2 : 1);
  const filas = Object.entries(dic)
    .sort((a, b) => orden(a[0]) - orden(b[0]) || (m.nombres[a[0]] || a[0]).localeCompare(m.nombres[b[0]] || b[0], 'es'))
    .map(([c, [w, acuerdo]]) =>
      h(
        'tr',
        {},
        h('td', {}, m.nombres[c] || c),
        h('td', {}, h('span', { class: 'palabra' }, w)),
        h('td', { class: 'num' }, h('span', { class: 'barrita', style: `width:${Math.round(acuerdo * 50)}px` }), ' ', pct(acuerdo)),
      ),
    );
  const pares = m.parecidos
    .slice()
    .sort((a, b) => b[2] - a[2])
    .map(([x, y, v]) =>
      h(
        'tr',
        {},
        h('td', {}, `${E.aldeas.get(x)?.nombre} y ${E.aldeas.get(y)?.nombre}`),
        h('td', { class: 'num' }, pct(v)),
        h('td', {}, v >= 0.75 ? 'hablan igual' : v >= 0.45 ? 'se entienden a medias' : 'lenguas distintas'),
      ),
    );
  rellenar(
    cuerpo,
    h('p', {}, 'Nadie les enseñó a hablar. Cada palabra la inventó alguien y se extendió de boca en boca. «Acuerdo» es la parte de la aldea que usa esa palabra.'),
    aldeas.length > 1
      ? h('div', { class: 'filtros' }, aldeas.map((a) => h('button', { type: 'button', 'aria-pressed': String(a.id === E.aldeaIdioma), onclick: () => ((E.aldeaIdioma = a.id), pintarIdioma()) }, a.nombre)))
      : null,
    h('div', { class: 'tarjeta tabla-scroll' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Significa'), h('th', {}, 'Dicen'), h('th', { class: 'num' }, 'Acuerdo'))), h('tbody', {}, filas))),
    pares.length
      ? h(
          'div',
          { class: 'tarjeta tabla-scroll' },
          h('h3', {}, 'Parecido entre lenguas'),
          h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Aldeas'), h('th', { class: 'num' }, 'Parecido'), h('th', {}, ''))), h('tbody', {}, pares)),
        )
      : null,
  );
}

// ---------- gente ----------

function pintarGente() {
  const m = E.mundo;
  const inventores = new Map();
  for (const t of m.tecnicas) {
    const k = String(t.porId);
    const e = inventores.get(k) || { id: t.porId, nombre: t.por, aldea: t.aldea, cosas: [], vivo: E.porId.has(t.porId) };
    e.cosas.push(t.nombre);
    inventores.set(k, e);
  }
  const top = [...inventores.values()].sort((a, b) => b.cosas.length - a.cosas.length).slice(0, 8);
  const buscador = h('input', { class: 'buscador', type: 'search', placeholder: 'Buscar por nombre', value: E.busqueda, 'aria-label': 'Buscar por nombre' });
  buscador.addEventListener('input', () => {
    E.busqueda = buscador.value;
    E.cuantosGente = 120;
    pintarListaGente();
  });
  rellenar(
    cuerpo,
    top.length
      ? h(
          'div',
          { class: 'tarjeta' },
          h('h3', {}, 'Grandes inventores'),
          h('ol', { class: 'inventores' }, top.map((x) => h('li', {}, x.vivo ? enlacePersona(x.id, x.nombre) : h('strong', {}, x.nombre), ` (${x.aldea}${x.vivo ? ', vive' : ''}): ${x.cosas.join(', ')}`))),
        )
      : null,
    h(
      'div',
      { class: 'filtros' },
      [['todas', 'Todas'], ...vivas().map((a) => [String(a.id), a.nombre])].map(([k, t]) =>
        h('button', { type: 'button', 'aria-pressed': String(String(E.aldeaGente) === k), onclick: () => ((E.aldeaGente = k), (E.cuantosGente = 120), pintarGente()) }, t),
      ),
    ),
    buscador,
    h('div', { id: 'lista-gente' }),
  );
  pintarListaGente();
}

function pintarListaGente() {
  const m = E.mundo;
  const q = E.busqueda.trim().toLowerCase();
  const lista = m.personas
    .filter((p) => (E.aldeaGente === 'todas' || p.aldea === Number(E.aldeaGente)) && (!q || p.nombre.toLowerCase().includes(q)))
    .sort((a, b) => b.saberes.length - a.saberes.length || b.edad - a.edad);
  const cont = $('#lista-gente');
  if (!cont) return;
  const filas = lista.slice(0, E.cuantosGente).map((p) => {
    const f = faccionDe(p);
    return h(
      'button',
      { class: 'persona', type: 'button', onclick: () => elegirPersona(p.id) },
      h('strong', {}, `${p.nombre}, ${anios(p.edad)}`),
      h('span', {}, E.aldeas.get(p.aldea)?.nombre ?? ''),
      h('small', {}, `${ACTIVIDAD[p.act] || p.act} · sabe ${p.saberes.length} ${p.saberes.length === 1 ? 'cosa' : 'cosas'}${p.desc ? ` · ${p.desc} descubrimiento${p.desc > 1 ? 's' : ''}` : ''}${f ? ` · de los ${f.nombre}` : ''}`),
    );
  });
  if (lista.length > E.cuantosGente) {
    filas.push(h('button', { class: 'mas', type: 'button', onclick: () => ((E.cuantosGente += 200), pintarListaGente()) }, `Ver más (${lista.length - E.cuantosGente})`));
  }
  rellenar(cont, filas.length ? filas : h('p', { class: 'vacio' }, 'Nadie con ese nombre.'));
}

// ---------- gráficas ----------

const tooltip = $('#tooltip');

function mostrarTooltip(ev, titulo, filas) {
  rellenar(
    tooltip,
    h('span', {}, titulo),
    filas.map(([valor, etiqueta, color]) => h('div', {}, h('strong', {}, valor), color ? h('span', { class: 'clave', style: `background:${color}` }) : null, etiqueta)),
  );
  tooltip.hidden = false;
  const w = tooltip.offsetWidth;
  tooltip.style.left = `${Math.max(8, Math.min(window.innerWidth - w - 8, ev.clientX + 14))}px`;
  tooltip.style.top = `${Math.max(8, ev.clientY - tooltip.offsetHeight - 14)}px`;
}

function ocultarTooltip() {
  tooltip.hidden = true;
}

function paso(max) {
  if (max <= 0) return 1;
  const bruto = max / 4;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const n = bruto / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
}

function tablaDe(cabeceras, filas) {
  return h(
    'div',
    { class: 'tabla-scroll' },
    h('table', {}, h('thead', {}, h('tr', {}, cabeceras.map((c, i) => h('th', { class: i ? 'num' : '' }, c)))), h('tbody', {}, filas.map((f) => h('tr', {}, f.map((c, i) => h('td', { class: i ? 'num' : '' }, c)))))),
  );
}

function botonTabla(fig, cabeceras, filas) {
  let tabla = null;
  const boton = h('button', { class: 'ver-tabla', type: 'button' }, 'Ver tabla');
  boton.addEventListener('click', () => {
    if (tabla) {
      tabla.remove();
      tabla = null;
      boton.textContent = 'Ver tabla';
    } else {
      tabla = tablaDe(cabeceras, filas);
      fig.append(tabla);
      boton.textContent = 'Ocultar tabla';
    }
  });
  fig.append(boton);
}

/**
 * Líneas sobre los años. Una serie: área suave y sin leyenda (el título la nombra).
 * Varias: leyenda y etiqueta al final de cada línea. Cruceta con todos los valores.
 */
function grafLinea({ titulo, nota, series, formato = (v) => NUM.format(v), yMax = null, alto = 160, ancho, mini = false, tabla = true, referencia = null }) {
  const fig = h('figure', { class: mini ? 'mini' : 'grafica' });
  fig.append(mini ? h('h4', {}, titulo) : h('h3', {}, titulo));
  if (nota) fig.append(h('p', {}, nota));
  const puntos = series[0].puntos;
  if (puntos.length < 2) {
    fig.append(h('p', { class: 'nota' }, 'Hace falta algo más de historia para dibujar esto.'));
    return fig;
  }
  if (series.length > 1) {
    fig.append(h('div', { class: 'leyenda-series' }, series.map((se) => h('span', {}, h('i', { style: `background:${se.color}` }), se.nombre))));
  }
  const W = Math.max(140, ancho);
  const H = alto;
  const ml = mini ? 34 : 40;
  const mr = mini ? 34 : 40;
  const mt = 10;
  const mb = 22;
  const x0 = puntos[0].x;
  const x1 = puntos[puntos.length - 1].x;
  const maxY = yMax ?? Math.max(...series.flatMap((se) => se.puntos.map((p) => p.y)), 1);
  const salto = yMax === 1 ? (mini ? 0.5 : 0.25) : paso(maxY);
  const tope = yMax ?? Math.max(salto, Math.ceil(maxY / salto) * salto);
  const X = (v) => ml + ((v - x0) / Math.max(1, x1 - x0)) * (W - ml - mr);
  const Y = (v) => mt + (1 - v / tope) * (H - mt - mb);
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': titulo });
  for (let v = 0; v <= tope + 1e-9; v += salto) {
    svg.append(s('line', { x1: ml, x2: W - mr, y1: Y(v), y2: Y(v), stroke: 'var(--g-rejilla)', 'stroke-width': 1 }));
    svg.append(s('text', { x: ml - 6, y: Y(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--g-texto)' }, formato(v)));
  }
  const marcas = mini ? 1 : Math.max(2, Math.min(4, Math.floor((W - ml - mr) / 90)));
  for (let k = 0; k <= marcas; k++) {
    const v = Math.round(x0 + ((x1 - x0) * k) / marcas);
    svg.append(s('text', { x: X(v), y: H - 5, 'text-anchor': k === 0 ? 'start' : k === marcas ? 'end' : 'middle', 'font-size': 11, fill: 'var(--g-texto)' }, `año ${v}`));
  }
  svg.append(s('line', { x1: ml, x2: W - mr, y1: Y(0), y2: Y(0), stroke: 'var(--g-eje)', 'stroke-width': 1 }));
  if (referencia) {
    svg.append(s('line', { x1: ml, x2: W - mr, y1: Y(referencia.y), y2: Y(referencia.y), stroke: 'var(--g-texto)', 'stroke-width': 1, 'stroke-dasharray': '4 4' }));
    svg.append(s('text', { x: ml + 4, y: Y(referencia.y) - 5, 'font-size': 11, fill: 'var(--g-texto)' }, referencia.texto));
  }
  for (const se of series) {
    const d = se.puntos.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join('');
    if (series.length === 1) svg.append(s('path', { d: `${d}L${X(x1)},${Y(0)}L${X(x0)},${Y(0)}Z`, fill: se.color, 'fill-opacity': 0.1 }));
    svg.append(s('path', { d, fill: 'none', stroke: se.color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    const u = se.puntos[se.puntos.length - 1];
    svg.append(s('circle', { cx: X(u.x), cy: Y(u.y), r: 4, fill: se.color, stroke: 'var(--g-superficie)', 'stroke-width': 2 }));
    svg.append(s('text', { x: X(u.x) + 7, y: Y(u.y) + 4, 'font-size': mini ? 11 : 12, 'font-weight': 600, fill: 'var(--tinta)' }, formato(u.y)));
  }
  const cruz = s('line', { y1: mt, y2: H - mb, stroke: 'var(--g-eje)', 'stroke-width': 1, visibility: 'hidden' });
  const marcadores = series.map((se) => s('circle', { r: 4, fill: se.color, stroke: 'var(--g-superficie)', 'stroke-width': 2, visibility: 'hidden' }));
  svg.append(cruz, ...marcadores);
  const zona = s('rect', { x: ml, y: 0, width: W - ml - mr, height: H, fill: 'transparent' });
  const mover = (ev) => {
    const r = svg.getBoundingClientRect();
    const vx = x0 + (((ev.clientX - r.left) * (W / r.width) - ml) / (W - ml - mr)) * (x1 - x0);
    let i = 0;
    for (let j = 0; j < puntos.length; j++) if (Math.abs(puntos[j].x - vx) < Math.abs(puntos[i].x - vx)) i = j;
    const x = X(puntos[i].x);
    cruz.setAttribute('x1', x);
    cruz.setAttribute('x2', x);
    cruz.setAttribute('visibility', 'visible');
    series.forEach((se, k) => {
      marcadores[k].setAttribute('cx', x);
      marcadores[k].setAttribute('cy', Y(se.puntos[i].y));
      marcadores[k].setAttribute('visibility', 'visible');
    });
    mostrarTooltip(
      ev,
      `año ${puntos[i].x}`,
      series.map((se) => [formato(se.puntos[i].y), series.length > 1 ? se.nombre : titulo, se.color]),
    );
  };
  zona.addEventListener('pointermove', mover);
  zona.addEventListener('pointerdown', mover);
  zona.addEventListener('pointerleave', () => {
    cruz.setAttribute('visibility', 'hidden');
    for (const mk of marcadores) mk.setAttribute('visibility', 'hidden');
    ocultarTooltip();
  });
  svg.append(zona);
  fig.append(svg);
  if (tabla) {
    botonTabla(
      fig,
      ['Año', ...series.map((se) => (series.length > 1 ? se.nombre : titulo))],
      puntos.map((p, i) => [String(p.x), ...series.map((se) => formato(se.puntos[i].y))]),
    );
  }
  return fig;
}

/** Barras horizontales de una sola serie. */
function grafBarras({ titulo, nota, items, ancho, unidad }) {
  const fig = h('figure', { class: 'grafica' });
  fig.append(h('h3', {}, titulo));
  if (nota) fig.append(h('p', {}, nota));
  if (!items.length) {
    fig.append(h('p', { class: 'nota' }, 'Nada que contar todavía.'));
    return fig;
  }
  const W = Math.max(240, ancho);
  const fila = 28;
  const ml = 96;
  const mr = 52;
  const H = items.length * fila + 6;
  const max = Math.max(...items.map((i) => i.valor), 1);
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': titulo });
  svg.append(s('line', { x1: ml, x2: ml, y1: 0, y2: H, stroke: 'var(--g-eje)', 'stroke-width': 1 }));
  items.forEach((it, k) => {
    const y = k * fila + 6;
    const largo = Math.max(2, (it.valor / max) * (W - ml - mr));
    const r = Math.min(4, largo / 2);
    const grueso = 14;
    const d = `M${ml},${y}H${ml + largo - r}A${r},${r} 0 0 1 ${ml + largo},${y + r}V${y + grueso - r}A${r},${r} 0 0 1 ${ml + largo - r},${y + grueso}H${ml}Z`;
    const barra = s('path', { d, fill: 'var(--g-serie)' });
    const zona = s('rect', { x: 0, y: y - 6, width: W, height: fila, fill: 'transparent' });
    zona.addEventListener('pointermove', (ev) => {
      barra.setAttribute('fill-opacity', '0.8');
      mostrarTooltip(ev, it.etiqueta, [[NUM.format(it.valor), unidad, null]]);
    });
    zona.addEventListener('pointerleave', () => {
      barra.setAttribute('fill-opacity', '1');
      ocultarTooltip();
    });
    svg.append(
      barra,
      s('text', { x: ml - 8, y: y + 11, 'text-anchor': 'end', 'font-size': 12, fill: 'var(--tinta-2)' }, it.etiqueta),
      s('text', { x: ml + largo + 6, y: y + 11, 'font-size': 12, 'font-weight': 600, fill: 'var(--tinta)' }, NUM.format(it.valor)),
      zona,
    );
  });
  fig.append(svg);
  botonTabla(fig, ['Causa', mayus(unidad)], items.map((i) => [i.etiqueta, NUM.format(i.valor)]));
  return fig;
}

/** Pequeños múltiplos: una línea por rasgo, todas en la misma escala, y una sola tabla. */
function multiples({ titulo, nota, filas, rasgos, ancho, valor }) {
  const columnas = Math.max(1, Math.floor((ancho + 10) / 160));
  const anchoMini = (ancho - (columnas - 1) * 10) / columnas;
  const cont = h('div', { class: 'multiples', style: `grid-template-columns:repeat(${columnas}, minmax(0, 1fr))` });
  for (const [k, t] of rasgos) {
    cont.append(grafLinea({ titulo: t, series: [{ color: 'var(--g-serie)', puntos: filas.map((x) => ({ x: x.anio, y: valor(x, k) })) }], formato: pct, yMax: 1, alto: 104, ancho: anchoMini, mini: true, tabla: false }));
  }
  const fig = h('div', { class: 'grafica' }, h('h3', {}, titulo), h('p', {}, nota), cont);
  botonTabla(fig, ['Año', ...rasgos.map(([, t]) => t)], filas.map((f) => [String(f.anio), ...rasgos.map(([k]) => pct(valor(f, k)))]));
  return fig;
}

function pintarEvolucion() {
  const m = E.mundo;
  const filas = E.historia.filter((f) => f.era === m.era);
  E.historiaPintada = `${E.historia.length}-${cuerpo.clientWidth}`;
  if (filas.length < 2) {
    rellenar(cuerpo, h('p', { class: 'vacio' }, 'La historia acaba de empezar. Vuelve en unas horas para ver cómo cambia.'));
    return;
  }
  const ancho = Math.max(240, cuerpo.clientWidth - 30);
  const serie = (f, xs = filas) => xs.map((x) => ({ x: x.anio, y: f(x) }));
  const azul = 'var(--g-serie)';
  const naranja = 'var(--g-serie-2)';
  const muertes = {};
  for (const f of filas) for (const [k, v] of Object.entries(f.muertes)) muertes[k] = (muertes[k] || 0) + v;
  const conMente = filas.filter((x) => x.sensatez !== undefined);
  const conAcierto = filas.filter((x) => x.acierto !== undefined);
  const conPolitica = filas.filter((x) => x.asaltos !== undefined);
  const parecido = filas.filter((x) => x.aldeas > 1);
  rellenar(
    cuerpo,
    grafLinea({ titulo: 'Población', nota: 'Personas vivas al final de cada año.', series: [{ color: azul, puntos: serie((x) => x.poblacion) }], ancho }),
    conAcierto.length > 1
      ? grafLinea({
          titulo: 'Lo que aprenden sus mentes',
          nota: 'Cada mañana, la mente de cada uno prevé si el trabajo que elige le rendirá más o menos que a la media de su aldea. Esta es la parte de los días en que acierta. A ciegas acertarían la mitad. Cuando el mundo cambia (un saber nuevo, otra tierra) fallan más, hasta que vuelven a aprender.',
          series: [{ color: azul, puntos: serie((x) => x.acierto, conAcierto) }],
          formato: pct,
          yMax: 1,
          ancho,
          referencia: { y: 0.5, texto: 'a ciegas' },
        })
      : null,
    conMente.length > 1 && m.pruebas?.length
      ? multiples({
          titulo: '¿Y si…?',
          nota: 'Situaciones de prueba: qué parte de los adultos se inclinaría por la reacción sensata. Solo saben reaccionar a lo que han vivido: si nunca les ha faltado leña o comida, no lo saben.',
          filas: conMente,
          rasgos: m.pruebas.map((t, i) => [i, t]),
          ancho,
          valor: (x, i) => x.pruebas?.[i] ?? 0,
        })
      : null,
    grafLinea({
      titulo: 'Nacimientos y muertes',
      nota: 'Por año. Las epidemias, las hambrunas, los inviernos duros y las guerras se ven como picos de muertes.',
      series: [
        { nombre: 'Nacimientos', color: azul, puntos: serie((x) => x.nacimientos) },
        { nombre: 'Muertes', color: naranja, puntos: serie((x) => Object.values(x.muertes).reduce((a, b) => a + b, 0)) },
      ],
      ancho,
    }),
    conPolitica.length > 1
      ? grafLinea({
          titulo: 'Asaltos y facciones',
          nota: 'Asaltos entre aldeas cada año y facciones organizadas al final del año.',
          series: [
            { nombre: 'Asaltos', color: naranja, puntos: serie((x) => x.asaltos ?? 0, conPolitica) },
            { nombre: 'Facciones', color: azul, puntos: serie((x) => x.facciones ?? 0, conPolitica) },
          ],
          ancho,
        })
      : null,
    grafLinea({ titulo: 'Saberes vivos', nota: 'Cuántos saberes conoce al menos una persona viva. Si baja, algo se ha olvidado.', series: [{ color: azul, puntos: serie((x) => x.saberes) }], ancho }),
    parecido.length > 1
      ? grafLinea({
          titulo: 'Parecido entre lenguas',
          nota: 'Media del parecido entre los idiomas de las aldeas. Si baja, se están separando.',
          series: [{ color: azul, puntos: serie((x) => x.parecido, parecido) }],
          formato: pct,
          yMax: 1,
          ancho,
        })
      : null,
    multiples({
      titulo: 'Genes medios',
      nota: 'La selección natural en marcha: cómo cambia la media de cada rasgo.',
      filas,
      rasgos: GENES.filter(([k]) => filas.some((f) => f.genes[k] !== undefined)),
      ancho,
      valor: (x, k) => x.genes[k] ?? 0,
    }),
    grafBarras({
      titulo: 'De qué se muere',
      nota: 'Muertes por causa en toda esta era.',
      items: Object.entries(muertes)
        .map(([k, v]) => ({ etiqueta: CAUSAS[k] || k, valor: v }))
        .sort((a, b) => b.valor - a.valor),
      ancho,
      unidad: 'muertes',
    }),
  );
}

let temporizador = null;
window.addEventListener('resize', () => {
  clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    encuadrar(true);
    if (E.mundo && E.pestana === 'evolucion') pintarPestana(true);
  }, 250);
});

// ---------- arranque ----------

cargarPublicado();
arrancarDirecto();
respaldo = setInterval(() => {
  if (!E.directo) cargarPublicado();
}, 5 * 60 * 1000);
const inicial = location.hash.slice(1);
if (TITULOS[inicial]) abrir(inicial);
