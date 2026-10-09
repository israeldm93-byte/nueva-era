// Matemáticas deterministas. Las funciones como Math.exp o Math.hypot pueden dar
// resultados distintos en el último decimal según el navegador; estas usan solo
// sumas, productos, divisiones y raíces (exactas según IEEE 754), así que el mismo
// mundo evoluciona igual en el servidor y en cualquier navegador.

/** Distancia euclídea. */
export function distancia(dx: number, dy: number): number {
  return Math.sqrt(dx * dx + dy * dy);
}

/** e^x: se reduce el argumento a la mitad hasta |x| < 0.5, serie de Taylor y se eleva al cuadrado. */
export function exponencial(x: number): number {
  let y = x;
  let k = 0;
  while (y > 0.5 || y < -0.5) {
    y /= 2;
    k++;
  }
  let termino = 1;
  let suma = 1;
  for (let n = 1; n <= 12; n++) {
    termino = (termino * y) / n;
    suma += termino;
  }
  for (let i = 0; i < k; i++) suma *= suma;
  return suma;
}

/** Tangente hiperbólica aproximada (Padé), continua y acotada en [-1, 1]. */
export function tanh(x: number): number {
  if (x >= 3) return 1;
  if (x <= -3) return -1;
  const x2 = x * x;
  return (x * (27 + x2)) / (27 + 9 * x2);
}
