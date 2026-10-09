// Punto de entrada del motor para el navegador (se empaqueta en web/motor.js).
// El navegador carga el mismo mundo que el servidor y lo sigue simulando en
// directo: como el motor es determinista, calcula exactamente lo mismo.

export { DIAS_ANIO, MS_POR_DIA } from './config.ts';
export { migrar } from './migrar.ts';
export { avanzar } from './simulacion.ts';
export { datosWeb, fijarMotor } from './vista.ts';
