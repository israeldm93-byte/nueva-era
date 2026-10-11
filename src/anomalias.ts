// Registro de anomalías: si alguna cuenta saliera rota (NaN, infinita o negativa donde
// no puede serlo), no se escribe y queda apuntado aquí. Las pruebas exigen que esté vacío;
// en producción sirve de alarma sin corromper el mundo.

const registro: string[] = [];

export function anomalia(texto: string): void {
  if (registro.length < 50) registro.push(texto);
  if (typeof console !== 'undefined') console.warn(`[anomalía] ${texto}`);
}

export function anomalias(): readonly string[] {
  return registro;
}

export function olvidarAnomalias(): void {
  registro.length = 0;
}

/** ¿Es una cantidad válida (finita y no negativa más allá del redondeo)? */
export const valida = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > -0.01;
