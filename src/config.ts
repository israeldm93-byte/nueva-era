export const DIAS_ESTACION = 30;
export const DIAS_ANIO = DIAS_ESTACION * 4;
export const ESTACIONES = ['primavera', 'verano', 'otoño', 'invierno'] as const;

export const ANCHO = 72;
export const ALTO = 48;

/** Ritmo del mundo respecto al tiempo real: años simulados por cada hora real. */
export const ANIOS_POR_HORA = 1;
export const MS_POR_DIA = 3_600_000 / (DIAS_ANIO * ANIOS_POR_HORA);

export const VERSION_ESTADO = 1;
export const EDAD_ADULTA = 14;
export const RADIO_TRABAJO = 6;
export const MAX_CRONICA = 3000;

/** Multiplica la facilidad de todos los descubrimientos: el ritmo del progreso. */
export const RITMO_SABER = Number(process.env.RITMO_SABER ?? 0.35);
/** Cuánto les tira experimentar frente a trabajar. */
export const GANAS_EXPERIMENTAR = Number(process.env.GANAS_EXPERIMENTAR ?? 1.4);
