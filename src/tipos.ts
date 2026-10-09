// Tipos del estado del mundo. Todo es JSON plano: el mundo se guarda y se carga
// tal cual, y una simulación partida en dos tramos da lo mismo que de una vez.

export interface Genes {
  curiosidad: number;
  sociabilidad: number;
  fuerza: number;
  destreza: number;
  resistencia: number;
  fertilidad: number;
  longevidad: number;
}

/** Combinación probada que pareció acercarse a algo. */
export interface Idea {
  cosas: string[];
  verbo: string;
  puntos: number;
}

export interface Persona {
  id: number;
  nombre: string;
  sexo: 'H' | 'M';
  nace: number;
  padre: number | null;
  madre: number | null;
  pareja: number | null;
  aldea: number;
  genes: Genes;
  salud: number;
  /** Días de comida que el cuerpo aguanta sin comer (0..8). */
  reservas: number;
  /** Última causa de daño, para saber de qué murió. */
  causa: string;
  ultimoParto: number;
  saberes: string[];
  ideas: Idea[];
  /** concepto -> palabras candidatas con su fuerza, la más fuerte primero. */
  lexico: Record<string, [string, number][]>;
  /** Rendimiento que espera de cada actividad, aprendido de su experiencia. */
  valor: Record<string, number>;
  x: number;
  y: number;
  actividad: string;
  hijos: number;
  descubrimientos: number;
  /** Solo durante el día en que muere; nunca se guarda. */
  muerto?: string;
}

export interface Edificio {
  tipo: string;
  x: number;
  y: number;
  /** Campos: 0 en barbecho, 1 sembrado. */
  fase?: number;
  trabajo?: number;
  cuidado?: number;
  /** Corrales: animales que tiene. */
  animales?: number;
}

export interface Obra {
  tipo: string;
  x: number;
  y: number;
  progreso: number;
  pagada: boolean;
}

export interface Aldea {
  id: number;
  nombre: string;
  x: number;
  y: number;
  fundada: number;
  fundador: string;
  origen: number | null;
  despensa: Record<string, number>;
  edificios: Edificio[];
  obra: Obra | null;
  /** Materiales que han tenido entre manos (con ellos se experimenta). */
  vistos: string[];
  /** Saberes que conoce al menos alguien de la aldea. */
  conocidos: string[];
  /** Saberes escritos en tablillas: no se pierden aunque muera quien los sabía. */
  archivo: string[];
  abandonada: number | null;
  poblacionMax: number;
  /** Último día en que trasladó el campamento. */
  movida: number;
}

export type TipoSuceso =
  | 'inicio'
  | 'descubrimiento'
  | 'redescubrimiento'
  | 'difusion'
  | 'perdida'
  | 'olvido'
  | 'fundacion'
  | 'abandono'
  | 'traslado'
  | 'muerte'
  | 'lobos'
  | 'epidemia'
  | 'sequia'
  | 'hambre'
  | 'edificio'
  | 'contacto'
  | 'lengua'
  | 'poblacion'
  | 'extincion';

export interface Suceso {
  era: number;
  t: number;
  tipo: TipoSuceso;
  texto: string;
  aldea?: number;
}

export interface Hallazgo {
  t: number;
  por: string;
  porId: number;
  aldea: number;
  nombreAldea: string;
  palabra: string;
  como: string;
}

export interface FilaHistoria {
  era: number;
  anio: number;
  poblacion: number;
  aldeas: number;
  nacimientos: number;
  muertes: Record<string, number>;
  saberes: number;
  reservas: number;
  edadMedia: number;
  genes: Genes;
  parecido: number;
  clima: number;
}

export interface Era {
  era: number;
  semilla: number;
  anios: number;
  poblacionMax: number;
  saberes: number;
  fin: string;
}

export interface Fonologia {
  consonantes: string[];
  vocales: string[];
  finales: string[];
}

export interface Mundo {
  version: number;
  semilla: number;
  era: number;
  t: number;
  azar: number;
  ancho: number;
  alto: number;
  terreno: number[];
  recursos: Record<string, number[]>;
  clima: number;
  fonologia: Fonologia;
  personas: Persona[];
  aldeas: Aldea[];
  sigId: number;
  hallazgos: Record<string, Hallazgo>;
  olvidados: string[];
  contactos: string[];
  /** Restos de campamentos abandonados al trasladarse. */
  ruinas: { tipo: string; x: number; y: number }[];
  /** Tipos de edificio que ya se han levantado alguna vez en esta era. */
  construidos: string[];
  lenguasSeparadas: string[];
  hitos: number[];
  cronica: Suceso[];
  historia: FilaHistoria[];
  anual: { nacimientos: number; muertes: Record<string, number> };
  poblacionMax: number;
  eras: Era[];
  /** Instante real (ISO) hasta el que está simulado el mundo. */
  reloj: string | null;
}
