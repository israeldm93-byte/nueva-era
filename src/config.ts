export const DIAS_ESTACION = 30;
export const DIAS_ANIO = DIAS_ESTACION * 4;
export const ESTACIONES = ['primavera', 'verano', 'otoño', 'invierno'] as const;

/** El continente de origen (donde empieza todo); queda arriba a la izquierda del mundo. */
export const ANCHO = 160;
export const ALTO = 112;
/** El mundo entero (versión 6): el continente de origen y, al este y al sur, tierras de ultramar. */
export const MUNDO_ANCHO = 256;
export const MUNDO_ALTO = 192;

/** Ritmo del mundo respecto al tiempo real: años simulados por cada hora real. */
export const ANIOS_POR_HORA = 1.5;
export const MS_POR_DIA = 3_600_000 / (DIAS_ANIO * ANIOS_POR_HORA);

export const VERSION_ESTADO = 6;
export const EDAD_ADULTA = 14;
export const RADIO_TRABAJO = 6;
export const MAX_CRONICA = 3000;

/** Multiplica la facilidad de todos los descubrimientos: el ritmo del progreso. */
export const RITMO_SABER = 1.0;
/** Probabilidad diaria (por curiosidad) de que el trabajo les dé una idea a medias. */
export const INSPIRACION = 0.018;
/** Cuántas pruebas hace en un día quien se pone a experimentar. */
export const PRUEBAS_DIA = 3;
/** Cuánto les tira experimentar frente a trabajar. */
export const GANAS_EXPERIMENTAR = 1.0;
