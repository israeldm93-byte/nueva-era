// Minimapa: el mapa entero visto desde arriba, con las aldeas, las fieras que
// rondan, los incendios y el trozo que se está mirando. Tocarlo lleva la cámara allí.

const COLORES = [
  [44, 96, 146],
  [214, 196, 140],
  [126, 176, 74],
  [61, 118, 52],
  [147, 137, 92],
  [139, 134, 126],
  [70, 150, 210],
  [86, 111, 62],
  [198, 182, 106],
  [228, 208, 154],
];

export class Minimapa {
  constructor(lienzo, alTocar) {
    this.lienzo = lienzo;
    this.alTocar = alTocar;
    this.fondo = document.createElement('canvas');
    this.clave = '';
    lienzo.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.tocar(e);
      const mover = (ev) => this.tocar(ev);
      const soltar = () => {
        window.removeEventListener('pointermove', mover);
        window.removeEventListener('pointerup', soltar);
      };
      window.addEventListener('pointermove', mover);
      window.addEventListener('pointerup', soltar);
    });
  }

  tocar(e) {
    if (!this.d) return;
    const r = this.lienzo.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * this.d.ancho;
    const y = ((e.clientY - r.top) / r.height) * this.d.alto;
    this.alTocar?.(Math.max(0, Math.min(this.d.ancho - 1, x)), Math.max(0, Math.min(this.d.alto - 1, y)));
  }

  /** El terreno se pinta una vez por mundo y estación (y cuando cambia lo quemado). */
  preparar(d) {
    this.d = d;
    const clave = `${d.era}-${d.semilla}-${d.estacion}-${d.cenizas.length}-${d.incendios.length > 0}`;
    if (clave === this.clave) return;
    this.clave = clave;
    const W = d.ancho;
    const H = d.alto;
    this.fondo.width = W;
    this.fondo.height = H;
    const g = this.fondo.getContext('2d');
    const img = g.createImageData(W, H);
    const quemada = new Set(d.cenizas.map(([i]) => i));
    const invierno = d.estacion === 'invierno';
    for (let i = 0; i < W * H; i++) {
      const t = d.terreno[i];
      let [r, gg, b] = COLORES[t] ?? COLORES[0];
      const h = d.relieve[i];
      if (t === 0) {
        const k = 1 + h / 150;
        r *= k;
        gg *= k;
        b *= k;
      } else {
        const k = 0.82 + 0.4 * (h / 100);
        r *= k;
        gg *= k;
        b *= k;
        if (h > 70 || (invierno && Math.floor(i / W) < H * 0.5 && t !== 6)) [r, gg, b] = [236, 240, 244];
      }
      if (quemada.has(i)) [r, gg, b] = [70, 62, 56];
      img.data[i * 4] = r;
      img.data[i * 4 + 1] = gg;
      img.data[i * 4 + 2] = b;
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }

  /** Cada poco: aldeas, fieras, fuego y la vista actual. */
  dibujar(objetivo, radio, seleccion) {
    const d = this.d;
    if (!d) return;
    const c = this.lienzo;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(c.clientWidth * dpr);
    const h = Math.round(c.clientHeight * dpr);
    if (!w || !h) return;
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(this.fondo, 0, 0, w, h);
    const kx = w / d.ancho;
    const ky = h / d.alto;
    for (const i of d.incendios) {
      g.fillStyle = '#ff7a1a';
      g.fillRect((i % d.ancho) * kx - kx * 0.5, Math.floor(i / d.ancho) * ky - ky * 0.5, kx * 2, ky * 2);
    }
    for (const f of d.fauna) {
      if (f.estado !== 'acecha' && f.estado !== 'ataca') continue;
      g.fillStyle = f.tipo === 'oso' ? '#6b3d1e' : '#d8443a';
      g.beginPath();
      g.arc((f.x + 0.5) * kx, (f.y + 0.5) * ky, Math.max(2, 1.6 * dpr), 0, Math.PI * 2);
      g.fill();
    }
    for (const a of d.aldeas) {
      if (a.abandonada !== null) continue;
      const r = Math.max(2.5 * dpr, Math.min(6 * dpr, (1.5 + Math.sqrt(a.poblacion) * 0.6) * dpr));
      g.fillStyle = seleccion === a.id ? '#ffe28a' : '#ffffff';
      g.strokeStyle = '#241910';
      g.lineWidth = 1.5 * dpr;
      g.beginPath();
      g.arc((a.x + 0.5) * kx, (a.y + 0.5) * ky, r, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
    if (objetivo) {
      g.strokeStyle = 'rgba(255, 236, 170, 0.95)';
      g.lineWidth = 1.5 * dpr;
      const rx = Math.max(4 * dpr, radio * kx);
      const ry = Math.max(3 * dpr, radio * 0.7 * ky);
      g.strokeRect(objetivo[0] * kx - rx, objetivo[1] * ky - ry, rx * 2, ry * 2);
    }
  }
}
