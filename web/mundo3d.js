// Mundo 3D de Nueva Era (Three.js). Reúne el terreno, la vegetación, los edificios,
// la gente y los animales; lleva el ciclo del día (que dura lo mismo que un día del
// mundo), las nubes, la cámara, las etiquetas de las aldeas, los bocadillos con lo
// que piensa cada uno y el minimapa.

import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { Edificios3D } from './edificios3d.js?v=__MOTOR__';
import { Fauna3D } from './fauna3d.js?v=__MOTOR__';
import { Gente3D } from './gente3d.js?v=__MOTOR__';
import { Minimapa } from './minimapa.js?v=__MOTOR__';
import { Terreno3D } from './terreno3d.js?v=__MOTOR__';
import { Ic, T, azar, entre, fundir, suave } from './util3d.js?v=__MOTOR__';
import { Vegetacion3D } from './vegetacion3d.js?v=__MOTOR__';

export class Mundo3D {
  constructor(lienzo, capa, { alTocar, minimapa } = {}) {
    this.lienzo = lienzo;
    this.capa = capa;
    this.alTocar = alTocar;
    this.datos = null;
    this.seleccion = null;
    this.burbujas = [];
    this.inicioDia = Date.now();
    this.msPorDia = 30000;
    this.desvio = { x: 0, y: 0 };
    this.desvioActual = { x: 0, y: 0 };
    this.siguiendo = null;
    this.aldeas = new Map();

    const r = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, powerPreference: 'high-performance' });
    // En pantallas pequeñas se limita la resolución: el móvil lo agradece.
    const pequena = Math.min(window.innerWidth, window.innerHeight) < 700;
    r.setPixelRatio(Math.min(pequena ? 1.5 : 2, window.devicePixelRatio || 1));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    this.render = r;

    this.escena = new THREE.Scene();
    this.escena.background = new THREE.Color(0xbfdcf0);
    this.escena.fog = new THREE.Fog(0xbfdcf0, 220, 520);
    this.camara = new THREE.PerspectiveCamera(32, 1, 0.3, 1200);

    const c = new OrbitControls(this.camara, lienzo);
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.screenSpacePanning = false;
    c.minDistance = 5;
    c.maxDistance = 300;
    c.minPolarAngle = 0.3;
    c.maxPolarAngle = 1.25;
    c.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    c.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
    c.zoomToCursor = true;
    // Si quien mira mueve la cámara, deja de seguir a nadie.
    c.addEventListener('start', () => {
      this.siguiendo = null;
      this.vuelo = null;
    });
    this.controles = c;

    this.cielo = new THREE.HemisphereLight(0xcfe8ff, 0x5a4a3a, 0.9);
    this.escena.add(this.cielo);
    this.colorCielo = new THREE.Color();
    this.cieloNoche = new THREE.Color(0x1b2a4e);
    this.cieloDia = new THREE.Color(0xbfdcf0);
    this.cieloAlba = new THREE.Color(0xf3c18c);
    this.luzNoche = new THREE.Color(0x7d93c9);
    this.luzDia = new THREE.Color(0xcfe8ff);
    this.sol = new THREE.DirectionalLight(0xfff1d6, 2.4);
    this.sol.castShadow = true;
    const movil = Math.min(window.innerWidth, window.innerHeight) < 700;
    this.sol.shadow.mapSize.set(movil ? 1024 : 2048, movil ? 1024 : 2048);
    const sc = this.sol.shadow.camera;
    sc.left = -42;
    sc.right = 42;
    sc.top = 42;
    sc.bottom = -42;
    sc.near = 1;
    sc.far = 300;
    this.sol.shadow.bias = -0.0004;
    this.sol.shadow.normalBias = 0.04;
    this.escena.add(this.sol, this.sol.target);
    this.luces = [];
    for (let k = 0; k < 6; k++) {
      const l = new THREE.PointLight(0xffa64d, 0, 16, 1.6);
      this.escena.add(l);
      this.luces.push(l);
    }

    this.terreno = new Terreno3D(this.escena);
    this.vegetacion = new Vegetacion3D(this.escena, this.terreno);
    this.edificios = new Edificios3D(this.escena, this.terreno);
    this.gente = new Gente3D(this.escena, this.terreno);
    this.fauna = new Fauna3D(this.escena, this.terreno);
    this.crearNubes();
    this.minimapa = minimapa ? new Minimapa(minimapa, (x, y) => this.irA(x, y)) : null;

    this.raycaster = new THREE.Raycaster();
    this.vec = new THREE.Vector3();
    this.arriba = new THREE.Vector3(0, 1, 0);
    this.mNube = new THREE.Matrix4();
    this.qNube = new THREE.Quaternion();
    this.sNube = new THREE.Vector3();
    this.pNube = new THREE.Vector3();
    this.etiquetas = new Map();
    this.burbujaSel = document.createElement('div');
    this.burbujaSel.className = 'burbuja';
    this.burbujaSel.hidden = true;
    capa.append(this.burbujaSel);

    this.instalarToques();
    new ResizeObserver(() => this.ajustar()).observe(lienzo.parentElement);
    this.ajustar();
    this.reloj = new THREE.Clock();
    this.animar = this.animar.bind(this);
    requestAnimationFrame(this.animar);
  }

  ajustar() {
    const caja = this.lienzo.parentElement.getBoundingClientRect();
    const w = Math.max(1, caja.width);
    const h = Math.max(1, caja.height);
    this.render.setSize(w, h, false);
    this.camara.aspect = w / h;
    this.camara.fov = w / h < 0.8 ? 46 : w / h < 1.2 ? 38 : 32;
    this.ancho = w;
    this.alto = h;
    this.camara.updateProjectionMatrix();
    this.fijarDesvio();
  }

  crearNubes() {
    const geo = fundir([
      { geo: Ic(1.6, 0), color: 0xffffff, sy: 0.6 },
      { geo: Ic(1.2, 0), color: 0xffffff, x: 1.5, y: -0.1, sy: 0.6 },
      { geo: Ic(1.1, 0), color: 0xffffff, x: -1.4, y: -0.15, z: 0.3, sy: 0.55 },
      { geo: Ic(0.9, 0), color: 0xffffff, x: 0.3, y: 0.5, z: -0.4, sy: 0.6 },
    ]);
    this.matNube = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, transparent: true, opacity: 0.92, roughness: 1 });
    this.nubes = new THREE.InstancedMesh(geo, this.matNube, 26);
    this.nubes.castShadow = true;
    this.nubes.frustumCulled = false;
    this.escena.add(this.nubes);
    this.datosNubes = Array.from({ length: 26 }, (_, k) => ({
      x: (azar(k * 3.1) - 0.5) * 420,
      z: (azar(k * 5.7) - 0.5) * 300,
      y: 26 + azar(k * 7.3) * 14,
      s: 2 + azar(k * 9.1) * 3,
      v: 0.6 + azar(k) * 0.8,
    }));
  }

  // ---------- coordenadas y cámara ----------

  aMundo(tx, ty) {
    return this.terreno.aMundo(tx, ty);
  }

  alturaEn(x, z) {
    return this.terreno.alturaEn(x, z);
  }

  /** Lo que se mira queda en (ancho/2 - x, alto/2 - y) de la pantalla. */
  desplazarVista(x, y, inmediato = false) {
    this.desvio = { x, y };
    if (inmediato) {
      this.desvioActual = { x, y };
      this.fijarDesvio();
    }
  }

  fijarDesvio() {
    const d = this.desvioActual;
    if (!d.x && !d.y) this.camara.clearViewOffset();
    else this.camara.setViewOffset(this.ancho, this.alto, d.x, d.y, this.ancho, this.alto);
  }

  moverDesvio(dt) {
    const a = this.desvioActual;
    const o = this.desvio;
    if (a.x === o.x && a.y === o.y) return;
    const k = Math.min(1, dt * 7);
    a.x = Math.abs(o.x - a.x) < 0.5 ? o.x : a.x + (o.x - a.x) * k;
    a.y = Math.abs(o.y - a.y) < 0.5 ? o.y : a.y + (o.y - a.y) * k;
    this.fijarDesvio();
  }

  enfocar(id, inmediato = false) {
    const a = this.aldeas.get(id);
    if (!a) return;
    this.siguiendo = null;
    const [x, z] = this.aMundo(a.x, a.y);
    this.volar(x, z, inmediato);
  }

  /** Vuela a una casilla (desde el minimapa). */
  irA(tx, ty) {
    const [x, z] = this.aMundo(tx, ty);
    this.siguiendo = null;
    this.volar(x, z, false);
  }

  volar(x, z, inmediato) {
    const destino = new THREE.Vector3(x, this.alturaEn(x, z), z);
    if (inmediato) {
      const dir = this.camara.position.clone().sub(this.controles.target);
      if (dir.length() < 1) dir.set(0, 24, 25);
      dir.setLength(Math.min(Math.max(dir.length(), 26), 44));
      this.controles.target.copy(destino);
      this.camara.position.copy(destino).add(dir);
    } else {
      this.vuelo = { desde: this.controles.target.clone(), hasta: destino, t: 0 };
    }
  }

  /** Lleva la cámara hasta alguien y la mantiene siguiéndole mientras camina. */
  enfocarPersona(id, inmediato = false) {
    const q = this.gente.lista.find((x) => x.p.id === id);
    if (!q) return;
    this.vuelo = null;
    this.siguiendo = id;
    if (inmediato) {
      const destino = this.vec.set(q.x, this.alturaEn(q.x, q.z), q.z);
      this.camara.position.add(destino.clone().sub(this.controles.target));
      this.controles.target.copy(destino);
    }
  }

  seguir(dt) {
    if (this.siguiendo === null) return;
    const q = this.gente.lista.find((x) => x.p.id === this.siguiendo);
    if (!q) {
      this.siguiendo = null;
      return;
    }
    const t = this.controles.target;
    const k = Math.min(1, dt * 2.5);
    const dx = (q.x - t.x) * k;
    const dy = (this.alturaEn(q.x, q.z) - t.y) * k;
    const dz = (q.z - t.z) * k;
    t.x += dx;
    t.y += dy;
    t.z += dz;
    this.camara.position.x += dx;
    this.camara.position.y += dy;
    this.camara.position.z += dz;
  }

  /** La aldea habitada más cercana al centro de la vista. */
  aldeaCercana() {
    if (!this.datos) return null;
    const o = this.controles.target;
    let mejor = null;
    let dmin = Infinity;
    for (const a of this.datos.aldeas) {
      if (a.abandonada !== null) continue;
      const [x, z] = this.aMundo(a.x, a.y);
      const d2 = (x - o.x) ** 2 + (z - o.z) ** 2;
      if (d2 < dmin) {
        dmin = d2;
        mejor = a.id;
      }
    }
    return mejor;
  }

  /** Acerca (f < 1) o aleja (f > 1) la cámara con suavidad. */
  acercar(f) {
    const actual = this.camara.position.distanceTo(this.controles.target);
    const c = this.controles;
    this.distancia = Math.min(c.maxDistance, Math.max(c.minDistance, (this.distancia ?? actual) * f));
  }

  girar(angulo) {
    this.giro = (this.giro ?? 0) + angulo;
  }

  ajustarCamara(dt) {
    if (this.distancia === undefined && !this.giro) return;
    const t = this.controles.target;
    const dir = this.camara.position.clone().sub(t);
    if (this.distancia !== undefined) {
      const l = dir.length();
      const nl = l + (this.distancia - l) * Math.min(1, dt * 7);
      dir.setLength(nl);
      if (Math.abs(nl - this.distancia) < 0.05) this.distancia = undefined;
    }
    if (this.giro) {
      const g = Math.abs(this.giro) < 0.002 ? this.giro : this.giro * Math.min(1, dt * 6);
      dir.applyAxisAngle(this.arriba, g);
      this.giro -= g;
    }
    this.camara.position.copy(t).add(dir);
  }

  // ---------- datos del día ----------

  actualizar(d) {
    if (!d) return;
    const clave = `${d.era}-${d.semilla}-${d.ancho}`;
    const nuevo = !this.datos || clave !== this.clave;
    this.datos = d;
    this.aldeas = new Map(d.aldeas.map((a) => [a.id, a]));
    if (nuevo) {
      this.clave = clave;
      this.terreno.construir(d);
      const [cx, cz] = this.aMundo(d.ancho / 2, d.alto / 2);
      this.controles.target.set(cx, 0, cz);
    }
    this.terreno.pintar(d);
    this.vegetacion.actualizar(d);
    this.edificios.actualizar(d);
    this.fauna.actualizar(d, this.edificios.corrales);
    this.consejeros = new Set();
    for (const a of d.aldeas) for (const mi of a.consejo?.miembros ?? []) this.consejeros.add(mi.id);
    this.gente.preparar(d, this.aldeas, this.consejeros);
    this.prepararEtiquetas(d);
    this.minimapa?.preparar(d);
    if (nuevo) this.enfocarMayor();
  }

  enfocarMayor() {
    const vivas = this.datos.aldeas.filter((a) => a.abandonada === null);
    if (!vivas.length) return;
    const a = vivas.reduce((x, y) => (y.poblacion > x.poblacion ? y : x));
    this.enfocar(a.id, true);
  }

  prepararEtiquetas(d) {
    const vistas = new Set();
    for (const a of d.aldeas) {
      if (a.abandonada !== null && !this.etiquetas.has(a.id)) continue;
      vistas.add(a.id);
      let el = this.etiquetas.get(a.id);
      if (!el) {
        el = document.createElement('button');
        el.className = 'etiqueta-aldea';
        el.addEventListener('click', () => this.alTocar?.({ aldea: a.id }));
        this.capa.append(el);
        this.etiquetas.set(a.id, el);
      }
      el.textContent = a.abandonada !== null ? `${a.nombre} (ruinas)` : `${a.nombre} · ${a.poblacion}`;
      el.classList.toggle('ruinas', a.abandonada !== null);
      el.classList.toggle('peligro', a.abandonada === null && a.amenaza > 0.3);
      el.classList.toggle('elegida', this.seleccion?.aldea === a.id);
    }
    for (const [id, el] of this.etiquetas) {
      if (!vistas.has(id)) {
        el.remove();
        this.etiquetas.delete(id);
      }
    }
  }

  // ---------- animación ----------

  faseDia() {
    return (((Date.now() - this.inicioDia) / this.msPorDia) % 1 + 1) % 1;
  }

  luz(fase) {
    // Amanecer 0-0.1, día hasta 0.75, atardecer hasta 0.86, noche hasta 1.
    let dia;
    if (fase < 0.1) dia = suave(fase / 0.1);
    else if (fase < 0.75) dia = 1;
    else if (fase < 0.86) dia = 1 - suave((fase - 0.75) / 0.11);
    else dia = 0;
    const calido = fase < 0.12 || (fase > 0.7 && fase < 0.88) ? 1 : 0;
    const cielo = this.colorCielo.copy(this.cieloNoche).lerp(calido ? this.cieloAlba : this.cieloDia, dia);
    this.escena.background.copy(cielo);
    this.escena.fog.color.copy(cielo);
    this.sol.intensity = 0.7 + 1.9 * dia;
    this.sol.color.set(calido && dia < 0.95 ? 0xffc48a : dia > 0.05 ? 0xfff1d6 : 0xa9bcff);
    this.cielo.intensity = 0.75 + 0.25 * dia;
    this.cielo.color.copy(this.luzNoche).lerp(this.luzDia, dia);
    const ang = entre(0.15, Math.PI - 0.15, Math.min(1, Math.max(0, (fase - 0.02) / 0.84)));
    const t = this.controles.target;
    this.sol.position.set(t.x + Math.cos(ang) * 80, t.y + 30 + Math.sin(ang) * 85 * Math.max(0.2, dia), t.z + 50);
    this.sol.target.position.copy(t);
    this.noche = 1 - dia;
  }

  animar() {
    requestAnimationFrame(this.animar);
    if (!this.datos || document.hidden || this.lienzo.offsetParent === null) return;
    const dt = Math.min(0.05, this.reloj.getDelta());
    const t = performance.now() / 1000;
    const fase = this.faseDia();
    this.seguir(dt);
    if (this.vuelo) {
      this.vuelo.t = Math.min(1, this.vuelo.t + dt * 1.2);
      const u = suave(this.vuelo.t);
      const nuevo = this.vuelo.desde.clone().lerp(this.vuelo.hasta, u);
      this.camara.position.add(nuevo.clone().sub(this.controles.target));
      this.controles.target.copy(nuevo);
      if (this.vuelo.t >= 1) this.vuelo = null;
    }
    this.ajustarCamara(dt);
    this.moverDesvio(dt);
    // Que la cámara no se salga del mundo ni se meta bajo el suelo.
    const lim = this.controles.target;
    const mx = (this.terreno.W * T) / 2;
    const mz = (this.terreno.H * T) / 2;
    const cx = Math.max(-mx, Math.min(mx, lim.x)) - lim.x;
    const cz = Math.max(-mz, Math.min(mz, lim.z)) - lim.z;
    if (cx || cz) {
      lim.x += cx;
      lim.z += cz;
      this.camara.position.x += cx;
      this.camara.position.z += cz;
    }
    const suelo = this.alturaEn(this.camara.position.x, this.camara.position.z) + 1.2;
    if (this.camara.position.y < suelo) this.camara.position.y = suelo;
    this.controles.update();
    const distancia = this.camara.position.distanceTo(lim);
    const lejos = Math.min(1200, 170 + distancia * 3.2);
    if (Math.abs(lejos - this.camara.far) > 8) {
      this.camara.far = lejos;
      this.camara.updateProjectionMatrix();
      if (this.desvioActual.x || this.desvioActual.y) this.fijarDesvio();
    }
    this.escena.fog.near = lejos * 0.45;
    this.escena.fog.far = lejos * 0.95;
    this.luz(fase);
    const noche = this.noche > 0.5;
    this.terreno.animarAgua(t);
    this.vegetacion.cercania(this.controles.target);
    this.edificios.animar(t, this.noche);
    this.animarLuces(t);
    this.fauna.animar(t, fase, noche);
    this.gente.animar(t, fase, this.aldeas, this.controles.target, this.hablante(t));
    this.animarNubes(t);
    this.moverEtiquetas();
    if (this.minimapa && (!this.ultimoMinimapa || t - this.ultimoMinimapa > 0.25)) {
      this.ultimoMinimapa = t;
      const [tx, ty] = this.terreno.aCasilla(lim.x, lim.z);
      const radio = (this.camara.position.distanceTo(lim) * Math.tan((this.camara.fov * Math.PI) / 360) * this.camara.aspect) / T;
      this.minimapa.dibujar([tx + 0.5, ty + 0.5], radio, this.seleccion?.aldea ?? null);
    }
    this.render.render(this.escena, this.camara);
  }

  /** En cada consejo habla uno cada pocos segundos. */
  hablante(t) {
    const lista = [...(this.consejeros ?? [])];
    if (!lista.length) return null;
    return lista[Math.floor(t / 4) % lista.length];
  }

  animarLuces(t) {
    // Las hogueras e incendios más cercanos a la cámara iluminan de noche.
    const objetivo = this.controles.target;
    const focos = [...this.edificios.hogueras.map((h) => [h, 5]), ...this.edificios.fuegos.map((f) => [f, 9])];
    const cerca = focos
      .map(([h, fuerza]) => [h, fuerza, (h[0] - objetivo.x) ** 2 + (h[2] - objetivo.z) ** 2])
      .sort((a, b) => a[2] - b[2])
      .slice(0, this.luces.length);
    this.luces.forEach((l, k) => {
      const h = cerca[k];
      l.intensity = h ? (this.noche * 0.85 + 0.15) * (h[1] + Math.sin(t * 13 + k) * 0.8) : 0;
      if (h) l.position.set(h[0][0], h[0][1] + 1, h[0][2]);
    });
  }

  animarNubes(t) {
    const ancho = this.terreno.W * T + 200;
    this.datosNubes.forEach((n, k) => {
      const x = ((((n.x + t * n.v) % ancho) + ancho * 1.5) % ancho) - ancho / 2;
      this.mNube.compose(this.pNube.set(x, n.y, n.z), this.qNube, this.sNube.set(n.s, n.s, n.s));
      this.nubes.setMatrixAt(k, this.mNube);
    });
    this.nubes.instanceMatrix.needsUpdate = true;
    this.matNube.opacity = 0.55 + 0.37 * (1 - this.noche);
  }

  posPantalla(x, y, z) {
    this.vec.set(x, y, z).project(this.camara);
    const visible = this.vec.z < 1 && Math.abs(this.vec.x) < 1.1 && Math.abs(this.vec.y) < 1.1;
    return [visible, ((this.vec.x + 1) / 2) * this.lienzo.clientWidth, ((1 - this.vec.y) / 2) * this.lienzo.clientHeight];
  }

  moverEtiquetas() {
    for (const [id, el] of this.etiquetas) {
      const a = this.aldeas.get(id);
      if (!a) continue;
      const [x, z] = this.aMundo(a.x, a.y);
      const [visible, px, py] = this.posPantalla(x, this.alturaEn(x, z) + 3, z);
      el.style.display = visible ? '' : 'none';
      if (visible) el.style.transform = `translate(-50%, -100%) translate(${px}px, ${py}px)`;
    }
    const sel = this.seleccion?.persona;
    const per = sel !== undefined ? this.gente.lista.find((q) => q.p.id === sel) : null;
    if (per && this.textoBurbuja) {
      const [visible, px, py] = this.posPantalla(...this.gente.cabezaDe(per));
      this.burbujaSel.hidden = !visible;
      this.burbujaSel.textContent = this.textoBurbuja;
      this.burbujaSel.style.transform = `translate(-50%, -100%) translate(${px}px, ${py}px)`;
    } else {
      this.burbujaSel.hidden = true;
    }
    for (const b of this.burbujas) {
      const q = this.gente.lista.find((x) => x.p.id === b.id);
      if (!q) {
        b.el.remove();
        continue;
      }
      const [visible, px, py] = this.posPantalla(...this.gente.cabezaDe(q));
      b.el.style.display = visible ? '' : 'none';
      b.el.style.transform = `translate(-50%, -100%) translate(${px}px, ${py}px)`;
    }
  }

  /** Muestra un pensamiento flotando sobre alguien durante unos segundos. */
  pensamiento(id, texto, ms = 4500) {
    if (this.burbujas.length >= 2 || this.burbujas.some((b) => b.id === id)) return;
    const el = document.createElement('div');
    el.className = 'burbuja ambiente';
    el.textContent = texto;
    this.capa.append(el);
    const b = { id, el };
    this.burbujas.push(b);
    setTimeout(() => {
      el.remove();
      this.burbujas = this.burbujas.filter((x) => x !== b);
    }, ms);
  }

  /** Personas visibles cerca del centro de la vista (para pensamientos al azar). */
  visiblesCerca(n = 30) {
    const o = this.controles.target;
    return this.gente.lista
      .filter((q) => q.p.edad >= 12 && (q.x - o.x) ** 2 + (q.z - o.z) ** 2 < 30 * 30)
      .slice(0, n)
      .map((q) => q.p);
  }

  elegir(sel, texto) {
    this.seleccion = sel;
    this.textoBurbuja = texto ?? null;
    for (const [id, el] of this.etiquetas) el.classList.toggle('elegida', sel?.aldea === id);
  }

  // ---------- toques ----------

  instalarToques() {
    let inicio = null;
    this.lienzo.addEventListener('pointerdown', (e) => {
      inicio = { x: e.clientX, y: e.clientY };
    });
    this.lienzo.addEventListener('pointerup', (e) => {
      if (!inicio) return;
      const movido = Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) > 6;
      inicio = null;
      if (movido || !this.datos) return;
      this.tocar(e);
    });
  }

  tocar(e) {
    const r = this.lienzo.getBoundingClientRect();
    const v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(v, this.camara);
    const im = this.gente.im;
    const cuerpos = [im.torso, im.cabeza, im.pelvis].filter(Boolean);
    const golpes = this.raycaster.intersectObjects([...cuerpos, this.terreno.malla], false);
    for (const g of golpes) {
      if (g.object !== this.terreno.malla && g.instanceId !== undefined) {
        const per = this.gente.lista[g.instanceId];
        if (per) {
          this.alTocar?.({ persona: per.p.id, aldea: per.p.aldea });
          return;
        }
      }
      if (g.object === this.terreno.malla) {
        // ¿Cerca de una aldea?
        let mejor = null;
        let dmin = (T * 4) ** 2;
        for (const a of this.datos.aldeas) {
          const [x, z] = this.aMundo(a.x, a.y);
          const d2 = (x - g.point.x) ** 2 + (z - g.point.z) ** 2;
          if (d2 < dmin) {
            dmin = d2;
            mejor = a;
          }
        }
        this.alTocar?.(mejor ? { aldea: mejor.id } : {});
        return;
      }
    }
    this.alTocar?.({});
  }
}
