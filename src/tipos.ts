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
  agresividad: number;
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
  /** Pesos de su red neuronal (en centésimas). */
  mente: number[];
  /** Lo que suele rendirle un día de trabajo: la vara con que su mente mide si hoy fue bien. */
  recompensa: number;
  /** Lo que cree que debería ser la prioridad de su aldea. */
  opinion: string;
  faccion: number | null;
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
  consejo: Consejo | null;
  facciones: Faccion[];
  /** 0..1: lo amenazados que se sienten (asaltos, lobos). */
  amenaza: number;
  /** Necesidades recordadas de los últimos meses, por prioridad. */
  memoria?: Record<string, number>;
  /** Dónde entierran a sus muertos (a las afueras; si la aldea se muda, abren otro). */
  cementerio?: { x: number; y: number } | null;
  /** Las últimas tumbas (las más viejas se pierden) y cuántos han enterrado en total. */
  tumbas?: Tumba[];
  enterrados?: number;
}

export interface Tumba {
  x: number;
  y: number;
  t: number;
  nombre: string;
  edad: number;
  causa: string;
}

export interface Consejo {
  prioridad: string;
  desde: number;
  anunciado: number;
  /** Última prioridad que se anunció en la crónica. */
  anunciada: string;
  miembros: number[];
  votos: Record<string, number>;
  /** La guerra que ha decidido hacer (contra quién, desde cuándo y por qué). */
  guerra?: Guerra | null;
}

export interface Guerra {
  contra: number;
  desde: number;
  motivo: string;
  derrotas: number;
}

export interface Faccion {
  id: number;
  nombre: string;
  opinion: string;
  lider: number;
  nacida: number;
  miembros: number;
  /** Crece mientras el consejo decide otra cosa; si se colma, se van. */
  descontento: number;
  anunciada: boolean;
  /** Revisiones seguidas con pocos apoyos. */
  debil?: number;
}

export interface Relacion {
  afinidad: number;
  rencor: number;
  ultimoAsalto: number;
  alianza: boolean;
  /** Cuándo hicieron las paces (tras una paz hay unos años de tregua). */
  paz?: number;
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
  | 'fieras'
  | 'incendio'
  | 'inundacion'
  | 'epidemia'
  | 'sequia'
  | 'hambre'
  | 'edificio'
  | 'contacto'
  | 'lengua'
  | 'consejo'
  | 'faccion'
  | 'cisma'
  | 'asalto'
  | 'guerra'
  | 'paz'
  | 'alianza'
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
  sensatez?: number;
  pruebas?: number[];
  /** Parte de los días en que sus mentes previeron bien lo que rendiría su trabajo. */
  acierto?: number;
  asaltos?: number;
  facciones?: number;
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

/** Fieras que viven en el mapa: una manada de lobos o un oso. */
export interface Fiera {
  id: number;
  tipo: 'lobos' | 'oso';
  x: number;
  y: number;
  /** Dónde estaba ayer (la web los anima de un sitio a otro). */
  px: number;
  py: number;
  /** Casilla de su guarida. */
  guarida: number;
  /** Cuántos son (una manada) o 1 (un oso). */
  n: number;
  hambre: number;
  /** Qué hacen hoy: rondar, acechar una aldea, atacar, huir o hibernar. */
  estado: 'ronda' | 'acecha' | 'ataca' | 'huye' | 'hiberna';
  /** Días que esperan antes de volver a acercarse a una aldea. */
  espera: number;
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
  /** Altura de cada casilla en centésimas (negativa bajo el agua). */
  relieve: number[];
  fauna: Fiera[];
  /** Casillas ardiendo: [casilla, días que le quedan]. */
  incendios: [number, number][];
  /** Casillas quemadas: [casilla, día en que ardieron]. */
  cenizas: [number, number][];
  /** Casillas anegadas por una crecida: [casilla, días que le quedan]. */
  inundadas: [number, number][];
  /** Último día en que se contó cada tipo de aviso (para no repetir la crónica). */
  avisos: Record<string, number>;
  recursos: Record<string, number[]>;
  clima: number;
  fonologia: Fonologia;
  personas: Persona[];
  aldeas: Aldea[];
  sigId: number;
  hallazgos: Record<string, Hallazgo>;
  olvidados: string[];
  contactos: string[];
  /** Afinidad y rencor entre aldeas, por pares «a-b» (a < b). */
  relaciones: Record<string, Relacion>;
  /** Restos de campamentos abandonados al trasladarse. */
  ruinas: { tipo: string; x: number; y: number }[];
  /** Tipos de edificio que ya se han levantado alguna vez en esta era. */
  construidos: string[];
  lenguasSeparadas: string[];
  hitos: number[];
  cronica: Suceso[];
  historia: FilaHistoria[];
  anual: {
    nacimientos: number;
    muertes: Record<string, number>;
    asaltos: number;
    /** Días de trabajo en que la mente previó bien si le iría mejor o peor que a su aldea. */
    aciertos: number;
    predicciones: number;
  };
  poblacionMax: number;
  eras: Era[];
  /** Instante real (ISO) hasta el que está simulado el mundo. */
  reloj: string | null;
}
