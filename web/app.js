'use strict';

// Visor de Nueva Era. Lee datos/mundo.json, datos/cronica.json y datos/historia.json,
// que la simulación regenera cada hora, y los pinta. No usa librerías.

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

/** Añade hijos ignorando los vacíos. */
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
  pestana: 'mapa',
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
};

const ACTIVIDAD = {
  recolectar: 'recolecta', cazar: 'caza', pescar: 'pesca', lenar: 'corta leña', picar: 'pica piedra',
  barro: 'saca arcilla', cultivar: 'cultiva', pastorear: 'pastorea', construir: 'construye',
  experimentar: 'experimenta', descansar: 'descansa', jugar: 'juega',
};

const GENES = [
  ['curiosidad', 'Curiosidad'], ['sociabilidad', 'Sociabilidad'], ['fuerza', 'Fuerza'], ['destreza', 'Destreza'],
  ['resistencia', 'Resistencia'], ['fertilidad', 'Fertilidad'], ['longevidad', 'Longevidad'],
];

const CAUSAS = {
  vejez: 'Vejez', enfermedad: 'Enfermedad', hambre: 'Hambre', 'frío': 'Frío', lobos: 'Lobos', parto: 'Parto', herida: 'Heridas',
};

const EDIFICIOS = {
  hoguera: 'hoguera', choza: 'choza', casa: 'casa de adobe', campo: 'campo', corral: 'corral', almacen: 'almacén',
  horno: 'horno', empalizada: 'empalizada', archivo: 'casa de las tablillas', mercado: 'mercado',
};

const GRUPOS = {
  todo: ['Todo', null],
  saber: ['Saber', ['descubrimiento', 'redescubrimiento', 'difusion', 'perdida', 'olvido']],
  aldeas: ['Aldeas', ['inicio', 'fundacion', 'abandono', 'traslado', 'edificio', 'contacto', 'poblacion']],
  vidas: ['Vidas', ['muerte']],
  lenguas: ['Lenguas', ['lengua']],
  desgracias: ['Desgracias', ['lobos', 'epidemia', 'sequia', 'hambre', 'extincion']],
};

// ---------- utilidades ----------

const anioDe = (t) => Math.floor(t / 120) + 1;
const ESTACIONES = ['primavera', 'verano', 'otoño', 'invierno'];
const fechaDe = (t) => `Año ${anioDe(t)}, ${ESTACIONES[Math.floor((t % 120) / 30)]}`;
const frac = (x) => x - Math.floor(x);
const pct = (x) => `${Math.round(x * 100)} %`;

function haceCuanto(iso) {
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (!Number.isFinite(min)) return '';
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const horas = Math.round(min / 60);
  return horas === 1 ? 'hace 1 hora' : `hace ${horas} horas`;
}

function anios(n) {
  const k = Math.floor(n);
  return k === 1 ? '1 año' : `${k} años`;
}

function vivas() {
  return E.mundo.aldeas.filter((a) => a.abandonada === null);
}

function css(nombre) {
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
}

function mezclar(c1, c2, t) {
  const a = parseInt(c1.slice(1), 16);
  const b = parseInt(c2.slice(1), 16);
  const r = Math.round(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t);
  const g = Math.round(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t);
  const bl = Math.round((a & 255) * (1 - t) + (b & 255) * t);
  return `rgb(${r},${g},${bl})`;
}

function nombreSaber(id) {
  return E.mundo.tecnicas.find((t) => t.id === id)?.nombre ?? E.mundo.nombres[id] ?? id;
}

// ---------- carga ----------

async function cargar() {
  const leer = (n) =>
    fetch(`datos/${n}.json?v=${Date.now()}`, { cache: 'no-store' }).then((r) => {
      if (!r.ok) throw new Error(`${n}: ${r.status}`);
      return r.json();
    });
  try {
    const [mundo, cronica, historia] = await Promise.all([leer('mundo'), leer('cronica'), leer('historia')]);
    E.mundo = mundo;
    E.cronica = cronica;
    E.historia = historia;
    E.porId = new Map(mundo.personas.map((p) => [p.id, p]));
    E.aldeas = new Map(mundo.aldeas.map((a) => [a.id, a]));
    if (E.aldea !== null && !E.aldeas.has(E.aldea)) E.aldea = null;
    if (E.persona !== null && !E.porId.has(E.persona)) E.persona = null;
    pintarCabecera();
    prepararMapa();
    pintarPestana();
  } catch (e) {
    console.error(e);
    if (!E.mundo) $('#fecha').textContent = 'El mundo aún no ha despertado. Vuelve en unos minutos.';
  }
}

// ---------- cabecera ----------

function pintarCabecera() {
  const m = E.mundo;
  $('#era').textContent = `Era ${m.era}`;
  $('#era').title = m.eras.length ? `La especie se ha extinguido ${m.eras.length} ${m.eras.length === 1 ? 'vez' : 'veces'}` : 'Primera era';
  const sequia = m.clima < 0.7 ? ' · año de sequía' : '';
  $('#fecha').textContent = `Año ${m.anio} · ${m.estacion}${sequia}`;
  $('#actualizado').textContent = `Actualizado ${haceCuanto(m.generado)} · el mundo avanza un año cada hora`;
  $('#k-pob').textContent = NUM.format(m.poblacion);
  $('#k-aldeas').textContent = NUM.format(vivas().length);
  $('#k-saberes').textContent = `${m.tecnicas.length}/${m.totalSaberes}`;
  $('#k-anios').textContent = NUM.format(Math.max(0, m.anio - 1));

  const ultimos = E.cronica.filter((x) => x.era === m.era && x.tipo !== 'muerte' && x.tipo !== 'sequia').slice(-3).reverse();
  rellenar($('#ultimo'), ultimos.map((x) => h('li', {}, h('time', {}, fechaDe(x.t)), x.texto)));
}

// ---------- pestañas ----------

function irA(p) {
  E.pestana = p;
  for (const b of document.querySelectorAll('.pestanas button')) b.setAttribute('aria-selected', String(b.dataset.p === p));
  for (const panel of document.querySelectorAll('.panel')) panel.hidden = panel.id !== `p-${p}`;
  if (location.hash !== `#${p}`) history.replaceState(null, '', `#${p}`);
  if (p === 'mapa' && E.mundo) ajustarLienzo();
  pintarPestana();
}

function pintarPestana() {
  if (!E.mundo) return;
  const p = E.pestana;
  if (p === 'mapa') pintarFichas();
  if (p === 'cronica') pintarCronica();
  if (p === 'saberes') pintarSaberes();
  if (p === 'idioma') pintarIdioma();
  if (p === 'gente') pintarGente();
  if (p === 'evolucion') pintarEvolucion();
}

for (const b of document.querySelectorAll('.pestanas button')) b.addEventListener('click', () => irA(b.dataset.p));

// ---------- mapa ----------

const ESC = 12; // píxeles por casilla en el dibujo del terreno
let terreno = null;
let animando = false;
let dpr = 1;
const vista = { z: 1, cx: null, cy: null };
const lienzo = $('#mapa');

function prepararMapa() {
  const m = E.mundo;
  terreno = document.createElement('canvas');
  terreno.width = m.ancho * ESC;
  terreno.height = m.alto * ESC;
  const g = terreno.getContext('2d');
  const col = {
    agua: css('--m-agua'), orilla: css('--m-orilla'), pradera: css('--m-pradera'), bosqueClaro: css('--m-bosque-claro'),
    bosque: css('--m-bosque'), colina: css('--m-colina'), montana: css('--m-montana'),
  };
  for (let i = 0; i < m.terreno.length; i++) {
    const x = i % m.ancho;
    const y = Math.floor(i / m.ancho);
    const t = m.terreno[i];
    let color = [col.agua, col.orilla, col.pradera, col.bosque, col.colina, col.montana][t];
    if (t === 3) color = mezclar(col.bosqueClaro, col.bosque, Math.min(1, m.madera[i] / 30));
    g.fillStyle = color;
    g.fillRect(x * ESC, y * ESC, ESC, ESC);
    // Un poco de textura para que no parezca una cuadrícula plana.
    const n = frac(Math.sin(i * 12.9898) * 43758.5453);
    g.fillStyle = n > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    g.fillRect(x * ESC, y * ESC, ESC, ESC);
    if (t === 5) {
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.beginPath();
      g.moveTo(x * ESC + 3, y * ESC + ESC - 3);
      g.lineTo(x * ESC + ESC / 2, y * ESC + 3);
      g.lineTo(x * ESC + ESC - 3, y * ESC + ESC - 3);
      g.fill();
    }
  }
  if (vista.cx === null) {
    vista.cx = m.ancho / 2;
    vista.cy = m.alto / 2;
  }
  ajustarLienzo();
  pintarLeyendaMapa();
  if (!animando) {
    animando = true;
    requestAnimationFrame(cuadro);
  }
}

function ajustarLienzo() {
  const m = E.mundo;
  const ancho = lienzo.parentElement.clientWidth || 800;
  dpr = Math.min(2, window.devicePixelRatio || 1);
  lienzo.width = Math.round(ancho * dpr);
  lienzo.height = Math.round(((ancho * m.alto) / m.ancho) * dpr);
}

/** Qué parte del mundo se ve: origen en casillas y píxeles (CSS) por casilla. */
function encuadre() {
  const m = E.mundo;
  const anchoCss = lienzo.width / dpr;
  const k = (anchoCss / m.ancho) * vista.z;
  const w = m.ancho / vista.z;
  const hh = m.alto / vista.z;
  vista.cx = Math.min(m.ancho - w / 2, Math.max(w / 2, vista.cx));
  vista.cy = Math.min(m.alto - hh / 2, Math.max(hh / 2, vista.cy));
  return { x0: vista.cx - w / 2, y0: vista.cy - hh / 2, k };
}

function aPantalla(f, x, y) {
  return [(x - f.x0) * f.k, (y - f.y0) * f.k];
}

function zoom(factor, cx, cy) {
  const z = Math.min(6, Math.max(1, vista.z * factor));
  if (cx !== undefined) {
    vista.cx = cx;
    vista.cy = cy;
  }
  vista.z = z;
  $('.mapa-marco').classList.toggle('ampliado', z > 1);
  $('#alejar').disabled = z <= 1;
  $('#acercar').disabled = z >= 6;
}

$('#acercar').addEventListener('click', () => {
  const a = E.aldea !== null ? E.aldeas.get(E.aldea) : null;
  zoom(2, a ? a.x + 0.5 : undefined, a ? a.y + 0.5 : undefined);
});
$('#alejar').addEventListener('click', () => zoom(0.5));
$('#alejar').disabled = true;

function dibujarEdificio(g, e, ruina, aldea) {
  const cx = e.x * ESC + ESC / 2;
  const cy = e.y * ESC + ESC / 2;
  g.save();
  if (ruina) g.globalAlpha = 0.45;
  const gris = '#7d776c';
  switch (e.tipo) {
    case 'campo':
      g.fillStyle = ruina ? gris : e.fase === 1 ? '#d8b444' : '#9c7a4f';
      g.fillRect(e.x * ESC + 1, e.y * ESC + 1, ESC - 2, ESC - 2);
      g.strokeStyle = 'rgba(0,0,0,0.18)';
      g.lineWidth = 1;
      for (let k = 3; k < ESC; k += 3) {
        g.beginPath();
        g.moveTo(e.x * ESC + 1, e.y * ESC + k);
        g.lineTo(e.x * ESC + ESC - 1, e.y * ESC + k);
        g.stroke();
      }
      break;
    case 'empalizada': {
      const a = aldea || e;
      g.strokeStyle = ruina ? gris : '#6b4a2b';
      g.lineWidth = 2.5;
      g.setLineDash([3, 2]);
      g.beginPath();
      g.arc(a.x * ESC + ESC / 2, a.y * ESC + ESC / 2, ESC * 2.6, 0, Math.PI * 2);
      g.stroke();
      break;
    }
    case 'hoguera':
      if (!ruina) {
        g.fillStyle = 'rgba(255,190,90,0.35)';
        g.beginPath();
        g.arc(cx, cy, 6, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = ruina ? gris : '#f08a24';
      g.beginPath();
      g.arc(cx, cy, 3.2, 0, Math.PI * 2);
      g.fill();
      break;
    case 'choza':
      g.fillStyle = ruina ? gris : '#8a5a33';
      g.beginPath();
      g.moveTo(cx - 5, cy + 4);
      g.lineTo(cx, cy - 5);
      g.lineTo(cx + 5, cy + 4);
      g.closePath();
      g.fill();
      break;
    case 'casa':
      g.fillStyle = ruina ? gris : '#c0673d';
      g.fillRect(cx - 4.5, cy - 3, 9, 7);
      g.fillStyle = ruina ? gris : '#8e4526';
      g.fillRect(cx - 5.5, cy - 5, 11, 2.5);
      break;
    case 'corral':
      g.strokeStyle = ruina ? gris : '#6b4a2b';
      g.lineWidth = 1.5;
      g.strokeRect(e.x * ESC + 1.5, e.y * ESC + 1.5, ESC - 3, ESC - 3);
      if (!ruina && e.animales) {
        g.fillStyle = '#f7f1e3';
        const n = Math.min(4, Math.ceil(e.animales / 5));
        for (let k = 0; k < n; k++) {
          g.beginPath();
          g.arc(e.x * ESC + 3.5 + (k % 2) * 5, e.y * ESC + 3.5 + Math.floor(k / 2) * 5, 1.6, 0, Math.PI * 2);
          g.fill();
        }
      }
      break;
    case 'almacen':
      g.fillStyle = ruina ? gris : '#c79a5b';
      g.beginPath();
      g.ellipse(cx, cy + 1, 4, 5, 0, 0, Math.PI * 2);
      g.fill();
      break;
    case 'horno':
      g.fillStyle = ruina ? gris : '#7a2e1f';
      g.beginPath();
      g.arc(cx, cy + 3, 5, Math.PI, 0);
      g.fill();
      break;
    case 'archivo':
      g.fillStyle = ruina ? gris : '#e8dcc0';
      g.fillRect(cx - 5, cy - 4, 10, 8);
      g.strokeStyle = '#7a6a4f';
      g.lineWidth = 1;
      g.strokeRect(cx - 5, cy - 4, 10, 8);
      break;
    case 'mercado':
      g.fillStyle = ruina ? gris : '#5a6fb0';
      g.fillRect(cx - 5, cy - 5, 10, 10);
      g.fillStyle = '#f2c14e';
      g.fillRect(cx - 2, cy - 2, 4, 4);
      break;
    default:
      g.fillStyle = gris;
      g.fillRect(cx - 2, cy - 2, 4, 4);
  }
  g.restore();
}

function dibujarObra(g, o) {
  g.save();
  g.strokeStyle = 'rgba(0,0,0,0.5)';
  g.setLineDash([2, 2]);
  g.lineWidth = 1;
  if (o.tipo === 'empalizada') {
    g.beginPath();
    g.arc(o.x * ESC + ESC / 2, o.y * ESC + ESC / 2, ESC * 2.6, 0, Math.PI * 2 * o.progreso);
    g.stroke();
  } else {
    g.strokeRect(o.x * ESC + 1.5, o.y * ESC + 1.5, ESC - 3, ESC - 3);
  }
  g.restore();
}

function pintarLeyendaMapa() {
  const items = [
    ['var(--m-agua)', 'agua'], ['var(--m-pradera)', 'pradera'], ['var(--m-bosque)', 'bosque'], ['var(--m-colina)', 'colina'],
    ['var(--m-montana)', 'montaña'], ['#d8b444', 'campo sembrado'], ['#8a5a33', 'choza'], ['#c0673d', 'casa'], ['#f08a24', 'hoguera'],
    ['#7d776c', 'ruinas'],
  ];
  rellenar($('#leyenda-mapa'), items.map(([c, t]) => h('span', {}, h('i', { style: `background:${c}` }), t)));
}

/** Dónde está cada persona en este instante: va al trabajo y vuelve. */
function posicion(p, t) {
  const a = E.aldeas.get(p.aldea);
  if (!a) return [p.x + 0.5, p.y + 0.5];
  const jx = (frac(p.id * 0.3713) - 0.5) * 1.6;
  const jy = (frac(p.id * 0.7137) - 0.5) * 1.6;
  const ax = a.x + 0.5 + jx;
  const ay = a.y + 0.5 + jy;
  if (p.act === 'jugar' || p.act === 'descansar' || p.act === 'experimentar' || (p.x === a.x && p.y === a.y)) {
    return [ax + Math.sin(t / 1400 + p.id) * 0.35, ay + Math.cos(t / 1700 + p.id * 1.3) * 0.35];
  }
  const fase = frac(t / 10000 + frac(p.id * 0.618));
  const suave = (u) => u * u * (3 - 2 * u);
  const k = fase < 0.35 ? suave(fase / 0.35) : fase < 0.65 ? 1 : 1 - suave((fase - 0.65) / 0.35);
  const bx = p.x + 0.5 + jx * 0.3;
  const by = p.y + 0.5 + jy * 0.3;
  return [ax + (bx - ax) * k, ay + (by - ay) * k];
}

function cuadro(t) {
  if (E.mundo && E.pestana === 'mapa' && !document.hidden) dibujarMapa(t);
  requestAnimationFrame(cuadro);
}

function dibujarMapa(t) {
  const m = E.mundo;
  const g = lienzo.getContext('2d');
  const f = encuadre();
  const escala = (dpr * f.k) / ESC;

  // Mundo (en píxeles del dibujo del terreno).
  g.setTransform(escala, 0, 0, escala, -f.x0 * ESC * escala, -f.y0 * ESC * escala);
  g.imageSmoothingEnabled = false;
  g.drawImage(terreno, 0, 0);
  for (const r of m.ruinas || []) dibujarEdificio(g, r, true);
  for (const a of m.aldeas) {
    const ruina = a.abandonada !== null;
    for (const e of a.edificios) dibujarEdificio(g, e, ruina, a);
    if (a.obra && !ruina) dibujarObra(g, a.obra);
  }

  // Pantalla (en píxeles CSS).
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const ancho = lienzo.width / dpr;
  const alto = lienzo.height / dpr;
  if (m.estacion === 'invierno') {
    g.fillStyle = 'rgba(235,242,255,0.16)';
    g.fillRect(0, 0, ancho, alto);
  } else if (m.estacion === 'otoño') {
    g.fillStyle = 'rgba(214,140,60,0.07)';
    g.fillRect(0, 0, ancho, alto);
  }
  const gente = css('--m-gente');
  const acento = css('--acento');
  const crece = 1 + 0.35 * (vista.z - 1);
  for (const p of m.personas) {
    const [tx, ty] = posicion(p, t);
    const [x, y] = aPantalla(f, tx, ty);
    if (x < -10 || y < -10 || x > ancho + 10 || y > alto + 10) continue;
    const r = (p.edad < 12 ? 1.3 : 2) * crece;
    if (p.act === 'experimentar') {
      g.fillStyle = 'rgba(255,215,120,0.4)';
      g.beginPath();
      g.arc(x, y, r + 2.5 + Math.sin(t / 300 + p.id) * 0.8, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = acento;
    } else {
      g.fillStyle = gente;
    }
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    if (E.persona === p.id) {
      g.strokeStyle = acento;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(x, y, r + 4, 0, Math.PI * 2);
      g.stroke();
    }
  }
  g.font = '600 12px system-ui, -apple-system, sans-serif';
  g.textAlign = 'center';
  g.lineJoin = 'round';
  const borde = css('--m-borde');
  const tinta = css('--tinta');
  for (const a of m.aldeas) {
    const ruina = a.abandonada !== null;
    if (ruina && vista.z < 2) continue;
    const [x, y] = aPantalla(f, a.x + 0.5, a.y);
    const texto = ruina ? `${a.nombre} (ruinas)` : `${a.nombre} · ${a.poblacion}`;
    g.strokeStyle = borde;
    g.lineWidth = 4;
    g.strokeText(texto, x, y - 6);
    g.fillStyle = ruina ? '#7d776c' : tinta;
    g.fillText(texto, x, y - 6);
    if (E.aldea === a.id) {
      const [cx, cy] = aPantalla(f, a.x + 0.5, a.y + 0.5);
      g.strokeStyle = acento;
      g.lineWidth = 2;
      g.setLineDash([4, 3]);
      g.beginPath();
      g.arc(cx, cy, 3.2 * f.k, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
    }
  }
}

function puntoDelMapa(ev) {
  const r = lienzo.getBoundingClientRect();
  const f = encuadre();
  const k = r.width / (E.mundo.ancho / vista.z);
  return [f.x0 + (ev.clientX - r.left) / k, f.y0 + (ev.clientY - r.top) / k, r, k];
}

function buscarEnMapa(x, y, k) {
  const t = performance.now();
  let mejor = null;
  let dmin = Math.max(0.6, 10 / k);
  for (const p of E.mundo.personas) {
    const [px, py] = posicion(p, t);
    const d = Math.hypot(px - x, py - y);
    if (d < dmin) {
      dmin = d;
      mejor = { persona: p };
    }
  }
  if (mejor) return mejor;
  dmin = Math.max(3, 20 / k);
  for (const a of E.mundo.aldeas) {
    if (a.abandonada !== null && vista.z < 2) continue;
    const d = Math.hypot(a.x + 0.5 - x, a.y + 0.5 - y);
    if (d < dmin) {
      dmin = d;
      mejor = { aldea: a };
    }
  }
  return mejor;
}

function mostrarGlobo(ev) {
  if (!E.mundo) return;
  const [x, y, r, k] = puntoDelMapa(ev);
  const hallado = buscarEnMapa(x, y, k);
  const globo = $('#globo');
  if (!hallado) {
    globo.hidden = true;
    return;
  }
  let texto;
  if (hallado.persona) {
    const p = hallado.persona;
    texto = `${p.nombre}, ${anios(p.edad)} · ${ACTIVIDAD[p.act] || p.act}`;
  } else {
    const a = hallado.aldea;
    texto = a.abandonada !== null ? `${a.nombre}: abandonada en el año ${a.abandonada}` : `${a.nombre}: ${a.poblacion} personas`;
  }
  globo.textContent = texto;
  globo.style.left = `${Math.min(r.width - 80, Math.max(80, ev.clientX - r.left))}px`;
  globo.style.top = `${ev.clientY - r.top}px`;
  globo.hidden = false;
}

let arrastre = null;
lienzo.addEventListener('pointerdown', (ev) => {
  arrastre = { x: ev.clientX, y: ev.clientY, cx: vista.cx, cy: vista.cy, movido: false };
  if (vista.z > 1) lienzo.setPointerCapture(ev.pointerId);
});
lienzo.addEventListener('pointermove', (ev) => {
  if (arrastre && vista.z > 1 && (ev.buttons || ev.pointerType === 'touch')) {
    const dx = ev.clientX - arrastre.x;
    const dy = ev.clientY - arrastre.y;
    if (Math.hypot(dx, dy) > 4) arrastre.movido = true;
    if (arrastre.movido) {
      const k = lienzo.getBoundingClientRect().width / (E.mundo.ancho / vista.z);
      vista.cx = arrastre.cx - dx / k;
      vista.cy = arrastre.cy - dy / k;
      $('#globo').hidden = true;
      return;
    }
  }
  if (ev.pointerType === 'mouse') mostrarGlobo(ev);
});
lienzo.addEventListener('pointerup', (ev) => {
  const movido = arrastre?.movido;
  arrastre = null;
  if (movido || !E.mundo) return;
  const [x, y, , k] = puntoDelMapa(ev);
  const hallado = buscarEnMapa(x, y, k);
  if (hallado?.persona) {
    E.persona = hallado.persona.id;
    E.aldea = hallado.persona.aldea;
  } else if (hallado?.aldea) {
    E.aldea = hallado.aldea.id;
    E.persona = null;
  } else {
    E.aldea = null;
    E.persona = null;
  }
  mostrarGlobo(ev);
  pintarFichas();
});
lienzo.addEventListener('dblclick', (ev) => {
  if (!E.mundo) return;
  const [x, y] = puntoDelMapa(ev);
  zoom(2, x, y);
});
lienzo.addEventListener('pointerleave', () => {
  $('#globo').hidden = true;
});

function fichaPersona(p) {
  const m = E.mundo;
  const nombre = (id) => (id === null ? null : E.porId.get(id)?.nombre ?? 'ya fallecido');
  const vivos = m.personas.filter((q) => q.padre === p.id || q.madre === p.id).length;
  const padres = [nombre(p.madre), nombre(p.padre)].filter(Boolean);
  return h(
    'div',
    { class: 'tarjeta' },
    h('h3', {}, `${p.nombre} `, h('span', { class: 'etiqueta' }, p.sexo === 'M' ? 'mujer' : 'hombre')),
    h(
      'dl',
      { class: 'datos' },
      h('div', {}, h('dt', {}, 'Edad'), h('dd', {}, anios(p.edad))),
      h('div', {}, h('dt', {}, 'Aldea'), h('dd', {}, E.aldeas.get(p.aldea)?.nombre ?? '–')),
      h('div', {}, h('dt', {}, 'Ahora'), h('dd', {}, ACTIVIDAD[p.act] || p.act)),
      h('div', {}, h('dt', {}, 'Salud'), h('dd', {}, pct(p.salud))),
      h('div', {}, h('dt', {}, 'Padres'), h('dd', {}, padres.length ? padres.join(' y ') : 'de los primeros')),
      h('div', {}, h('dt', {}, 'Pareja'), h('dd', {}, nombre(p.pareja) ?? '—')),
      h('div', {}, h('dt', {}, 'Hijos'), h('dd', {}, `${p.hijos}${vivos !== p.hijos ? ` (${vivos} vivos)` : ''}`)),
      h('div', {}, h('dt', {}, 'Descubrimientos'), h('dd', {}, String(p.desc))),
    ),
    h('h3', {}, 'Genes'),
    h(
      'div',
      { class: 'genes' },
      GENES.map(([k, t]) =>
        h('div', { class: 'gen' }, h('span', {}, t), h('div', { class: 'pista' }, h('div', { style: `width:${Math.round(p.genes[k] * 100)}%` })), h('span', {}, pct(p.genes[k]))),
      ),
    ),
    h('h3', {}, `Sabe hacer (${p.saberes.length})`),
    p.saberes.length
      ? h('div', { class: 'fila' }, p.saberes.map((id) => h('span', { class: 'etiqueta' }, nombreSaber(id))))
      : h('p', { class: 'nota' }, 'Todavía nada.'),
  );
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
  return h(
    'div',
    { class: 'tarjeta' },
    h('h3', {}, a.nombre, a.abandonada !== null ? h('span', { class: 'etiqueta perdido', style: 'margin-left:8px' }, `abandonada en el año ${a.abandonada}`) : null),
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
      h('div', {}, h('dt', {}, 'Comida guardada'), h('dd', {}, a.abandonada !== null ? '—' : `${a.diasComida} días`)),
      h('div', {}, h('dt', {}, 'Construyendo'), h('dd', {}, a.obra ? `${EDIFICIOS[a.obra.tipo] || a.obra.tipo} (${pct(a.obra.progreso)})` : 'nada')),
    ),
    Object.keys(cuenta).length ? h('div', { class: 'fila' }, Object.entries(cuenta).map(([k, n]) => h('span', { class: 'etiqueta' }, `${n} × ${EDIFICIOS[k] || k}`))) : null,
    h('h3', { style: 'margin-top:10px' }, `Saberes de la aldea (${a.conocidos.length})`),
    a.conocidos.length ? h('div', { class: 'fila' }, a.conocidos.map((id) => h('span', { class: 'etiqueta' }, nombreSaber(id)))) : h('p', { class: 'nota' }, 'Ninguno todavía.'),
    a.archivo.length ? h('p', { class: 'nota' }, `Escrito en tablillas: ${a.archivo.map(nombreSaber).join(', ')}.`) : null,
    parecidos.length ? h('p', { class: 'nota' }, `Su lengua se parece a la de ${parecidos.map(([n, v]) => `${n} (${pct(v)})`).join(', ')}.`) : null,
  );
}

function pintarFichas() {
  const hijos = [];
  if (E.persona !== null && E.porId.has(E.persona)) hijos.push(fichaPersona(E.porId.get(E.persona)));
  const a = E.aldea !== null ? E.aldeas.get(E.aldea) : null;
  if (a) hijos.push(fichaAldea(a));
  if (!hijos.length) hijos.push(h('p', { class: 'nota' }, 'Toca una aldea en el mapa para ver qué saben, qué construyen y cuánta comida guardan.'));
  rellenar($('#ficha-aldea'), hijos);
}

// ---------- crónica ----------

function pintarCronica() {
  rellenar(
    $('#filtros-cronica'),
    Object.entries(GRUPOS).map(([k, [t]]) =>
      h('button', { 'aria-pressed': String(E.filtro === k), onclick: () => ((E.filtro = k), (E.cuantosCronica = 120), pintarCronica()) }, t),
    ),
  );
  const tipos = GRUPOS[E.filtro][1];
  const lista = E.cronica.filter((x) => !tipos || tipos.includes(x.tipo)).slice().reverse();
  const cont = $('#cronica');
  if (!lista.length) {
    rellenar(cont, h('p', { class: 'vacio' }, 'Nada por aquí todavía.'));
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
    out.push(h('div', { class: 'suceso' }, h('span', { class: `punto ${x.tipo}` }), h('div', {}, h('time', {}, ESTACIONES[Math.floor((x.t % 120) / 30)]), h('div', {}, x.texto))));
  }
  if (lista.length > E.cuantosCronica) {
    out.push(h('button', { class: 'mas', onclick: () => ((E.cuantosCronica += 200), pintarCronica()) }, `Ver más (${lista.length - E.cuantosCronica} restantes)`));
  }
  rellenar(cont, out);
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
        vivo ? h('span', { class: 'etiqueta' }, `${t.por} sigue con vida`) : null,
      ),
    );
  });
  const bloqueadas = Array.from({ length: Math.min(quedan, 6) }, () => h('div', { class: 'tarjeta bloqueado', 'aria-hidden': 'true' }, '???'));
  rellenar(
    $('#saberes'),
    h('p', {}, `Han descubierto ${ts.length} de ${m.totalSaberes} saberes. Lo que no han descubierto no se muestra: ni ellos lo saben.`),
    h('div', { class: 'medidor', role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': String(m.totalSaberes), 'aria-valuenow': String(ts.length) }, h('div', { style: `width:${(ts.length / m.totalSaberes) * 100}%` })),
    h('div', { class: 'rejilla' }, tarjetas, bloqueadas),
    quedan > 6 ? h('p', { class: 'nota' }, `…y ${quedan - 6} más por descubrir.`) : null,
  );
}

// ---------- idioma ----------

function pintarIdioma() {
  const m = E.mundo;
  const aldeas = vivas().filter((a) => m.diccionario[a.id] && a.poblacion >= 3);
  const cont = $('#idioma');
  if (!aldeas.length) {
    rellenar(cont, h('p', { class: 'vacio' }, 'Aún no hay palabras.'));
    return;
  }
  if (!aldeas.some((a) => a.id === E.aldeaIdioma)) E.aldeaIdioma = aldeas[0].id;
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
        h('td', { class: 'num' }, h('span', { class: 'barrita', style: `width:${Math.round(acuerdo * 60)}px` }), ' ', pct(acuerdo)),
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
    cont,
    h('p', {}, 'Nadie les enseñó a hablar. Cada palabra la inventó alguien y se extendió de boca en boca. «Acuerdo» es la parte de la aldea que usa esa palabra.'),
    aldeas.length > 1
      ? h('div', { class: 'filtros' }, aldeas.map((a) => h('button', { 'aria-pressed': String(a.id === E.aldeaIdioma), onclick: () => ((E.aldeaIdioma = a.id), pintarIdioma()) }, a.nombre)))
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
    const e = inventores.get(k) || { nombre: t.por, aldea: t.aldea, cosas: [], vivo: E.porId.has(t.porId) };
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
    $('#gente'),
    E.persona !== null && E.porId.has(E.persona) ? fichaPersona(E.porId.get(E.persona)) : null,
    top.length
      ? h(
          'div',
          { class: 'tarjeta' },
          h('h3', {}, 'Grandes inventores'),
          h('ol', { style: 'margin:0;padding-left:20px' }, top.map((x) => h('li', {}, h('strong', {}, x.nombre), ` (${x.aldea}${x.vivo ? ', vive' : ''}): ${x.cosas.join(', ')}`))),
        )
      : null,
    h(
      'div',
      { class: 'filtros' },
      [['todas', 'Todas'], ...vivas().map((a) => [String(a.id), a.nombre])].map(([k, t]) =>
        h('button', { 'aria-pressed': String(String(E.aldeaGente) === k), onclick: () => ((E.aldeaGente = k), (E.cuantosGente = 120), pintarGente()) }, t),
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
  const filas = lista.slice(0, E.cuantosGente).map((p) =>
    h(
      'div',
      {
        class: 'persona',
        tabindex: '0',
        role: 'button',
        onclick: () => {
          E.persona = p.id;
          pintarGente();
          window.scrollTo({ top: $('#p-gente').offsetTop - 60, behavior: 'smooth' });
        },
        onkeydown: (ev) => {
          if (ev.key === 'Enter') ev.currentTarget.click();
        },
      },
      h('strong', {}, `${p.nombre}, ${anios(p.edad)}`),
      h('span', {}, E.aldeas.get(p.aldea)?.nombre ?? ''),
      h('small', {}, `${ACTIVIDAD[p.act] || p.act} · sabe ${p.saberes.length} ${p.saberes.length === 1 ? 'cosa' : 'cosas'}${p.desc ? ` · ${p.desc} descubrimiento${p.desc > 1 ? 's' : ''}` : ''}`),
    ),
  );
  if (lista.length > E.cuantosGente) {
    filas.push(h('button', { class: 'mas', onclick: () => ((E.cuantosGente += 200), pintarListaGente()) }, `Ver más (${lista.length - E.cuantosGente})`));
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
  tooltip.style.top = `${ev.clientY + 14}px`;
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
function grafLinea({ titulo, nota, series, formato = (v) => NUM.format(v), yMax = null, alto = 170, ancho, mini = false, tabla = true }) {
  const fig = h('figure', { class: mini ? '' : 'grafica', style: 'margin:0 0 14px' });
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
  const ml = mini ? 34 : 44;
  const mr = mini ? 34 : 44;
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
  const marcas = mini ? 1 : Math.max(2, Math.min(5, Math.floor((W - ml - mr) / 90)));
  for (let k = 0; k <= marcas; k++) {
    const v = Math.round(x0 + ((x1 - x0) * k) / marcas);
    svg.append(s('text', { x: X(v), y: H - 5, 'text-anchor': k === 0 ? 'start' : k === marcas ? 'end' : 'middle', 'font-size': 11, fill: 'var(--g-texto)' }, `año ${v}`));
  }
  svg.append(s('line', { x1: ml, x2: W - mr, y1: Y(0), y2: Y(0), stroke: 'var(--g-eje)', 'stroke-width': 1 }));
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
function grafBarras({ titulo, nota, items, ancho }) {
  const fig = h('figure', { class: 'grafica', style: 'margin:0 0 14px' });
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
      mostrarTooltip(ev, it.etiqueta, [[NUM.format(it.valor), 'muertes', null]]);
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
  botonTabla(fig, ['Causa', 'Muertes'], items.map((i) => [i.etiqueta, NUM.format(i.valor)]));
  return fig;
}

function pintarEvolucion() {
  const m = E.mundo;
  const cont = $('#evolucion');
  const filas = E.historia.filter((f) => f.era === m.era);
  if (filas.length < 2) {
    rellenar(cont, h('p', { class: 'vacio' }, 'La historia acaba de empezar. Vuelve en unas horas para ver cómo cambia.'));
    return;
  }
  const ancho = Math.min(cont.clientWidth || 600, 1048) - 30;
  const serie = (f) => filas.map((x) => ({ x: x.anio, y: f(x) }));
  const azul = 'var(--g-serie)';
  const naranja = 'var(--g-serie-2)';
  const muertes = {};
  for (const f of filas) for (const [k, v] of Object.entries(f.muertes)) muertes[k] = (muertes[k] || 0) + v;

  // Genes: pequeños múltiplos, una línea por rasgo y una sola tabla.
  const columnas = Math.max(1, Math.floor((ancho + 10) / 170));
  const anchoMini = (ancho - (columnas - 1) * 10) / columnas;
  const mini = h('div', { class: 'multiples', style: `grid-template-columns:repeat(${columnas}, minmax(0, 1fr))` });
  for (const [k, t] of GENES) {
    mini.append(grafLinea({ titulo: t, series: [{ color: azul, puntos: serie((x) => x.genes[k]) }], formato: pct, yMax: 1, alto: 110, ancho: anchoMini, mini: true, tabla: false }));
  }
  const genes = h('div', { class: 'grafica' }, h('h3', {}, 'Genes medios'), h('p', {}, 'La selección natural en marcha: cómo cambia la media de cada rasgo.'), mini);
  botonTabla(genes, ['Año', ...GENES.map(([, t]) => t)], filas.map((f) => [String(f.anio), ...GENES.map(([k]) => pct(f.genes[k]))]));

  const parecido = filas.filter((x) => x.aldeas > 1);
  rellenar(
    cont,
    grafLinea({ titulo: 'Población', nota: 'Personas vivas al final de cada año.', series: [{ color: azul, puntos: serie((x) => x.poblacion) }], ancho }),
    grafLinea({
      titulo: 'Nacimientos y muertes',
      nota: 'Por año. Las epidemias, las hambrunas y los inviernos duros se ven como picos de muertes.',
      series: [
        { nombre: 'Nacimientos', color: azul, puntos: serie((x) => x.nacimientos) },
        { nombre: 'Muertes', color: naranja, puntos: serie((x) => Object.values(x.muertes).reduce((a, b) => a + b, 0)) },
      ],
      ancho,
    }),
    grafLinea({ titulo: 'Saberes vivos', nota: 'Cuántos saberes conoce al menos una persona viva. Si baja, algo se ha olvidado.', series: [{ color: azul, puntos: serie((x) => x.saberes) }], ancho }),
    parecido.length > 1
      ? grafLinea({
          titulo: 'Parecido entre lenguas',
          nota: 'Media del parecido entre los idiomas de las aldeas. Si baja, se están separando.',
          series: [{ color: azul, puntos: parecido.map((x) => ({ x: x.anio, y: x.parecido })) }],
          formato: pct,
          yMax: 1,
          ancho,
        })
      : null,
    genes,
    grafBarras({
      titulo: 'De qué se muere',
      nota: 'Muertes por causa en toda esta era.',
      items: Object.entries(muertes)
        .map(([k, v]) => ({ etiqueta: CAUSAS[k] || k, valor: v }))
        .sort((a, b) => b.valor - a.valor),
      ancho,
    }),
  );
}

let temporizador = null;
window.addEventListener('resize', () => {
  clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    if (!E.mundo) return;
    ajustarLienzo();
    if (E.pestana === 'evolucion') pintarEvolucion();
  }, 200);
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (E.mundo) prepararMapa();
});

// ---------- arranque ----------

const inicial = location.hash.slice(1);
if (document.querySelector(`.pestanas button[data-p="${inicial}"]`)) irA(inicial);
cargar();
setInterval(cargar, 5 * 60 * 1000);
setInterval(() => {
  if (E.mundo) $('#actualizado').textContent = `Actualizado ${haceCuanto(E.mundo.generado)} · el mundo avanza un año cada hora`;
}, 60 * 1000);
