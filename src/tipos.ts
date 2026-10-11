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
  /** Ganas de prosperar y destacar. */
  ambicion: number;
  /** Cuánto mide los riesgos antes de actuar. */
  prudencia: number;
  /** Ganas de dar y ayudar. */
  generosidad: number;
  /** Apego a los suyos (familia, amigos, aldea). */
  lealtad: number;
  /** Aguante: sigue con lo que empezó aunque tarde en dar fruto. */
  paciencia: number;
}

/**
 * Lo que alguien se propone a medio o largo plazo (aprender algo, formar familia, irse,
 * fundar, vengarse...), por qué y desde cuándo. Se revisa cada pocos días o cuando pasa
 * algo importante.
 */
export interface Meta {
  tipo: string;
  desde: number;
  /** Por qué se lo ha propuesto, dicho en llano (sale de lo que de verdad le pasa). */
  motivo: string;
  /** A qué se refiere: un saber, una aldea, una persona o un oficio. */
  ref?: number | string;
}

/** Un recuerdo: [día, tipo, sobre qué o quién, importancia 0..1]. */
export type Recuerdo = [number, string, number | string | null, number];
/** Un hito de su vida: [día, tipo, dato]. */
export type Hito = [number, string, string?];

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
  /** Si hoy volvió con algo (el cazador, con su pieza). */
  cobro?: boolean;
  hijos: number;
  descubrimientos: number;
  /** Su meta de ahora (lo que persigue más allá del trabajo del día). */
  meta?: Meta | null;
  /** Lo que recuerda (como mucho unos pocos, los que más pesan). */
  recuerdos?: Recuerdo[];
  /** Lo que siente por otros: [id, valor -1..1] (como mucho unos pocos). */
  lazos?: [number, number][];
  /** Los hitos de su vida. */
  vida?: Hito[];
  /** Días de práctica en cada oficio (se olvida poco a poco): de ahí sale la pericia. */
  practica?: Record<string, number>;
  /** Lo que se cuenta de lo que ha hecho: pesa en el respeto. */
  fama?: number;
  /** Si va de camino a su nueva aldea: de dónde sale, adónde va y cuándo llega. */
  mudanza?: { desde: [number, number]; hasta: [number, number]; salida: number; dias: number };
  /**
   * Si está de visita en otra aldea lejana: a cuál (`a`), en qué tramo (ida, estancia o
   * vuelta), de dónde a dónde va en ese tramo, cuándo empezó y cuántos días dura, y con
   * quiénes ha tratado allí.
   */
  viaje?: { a: number; fase: 'ida' | 'estancia' | 'vuelta'; desde: [number, number]; hasta: [number, number]; salida: number; dias: number; conocio: number[] };
  /** Solo durante el día en que muere en un asalto: la aldea que lo mató. */
  porAldea?: number;
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
  /** Corrales y gallineros: animales que tiene (siempre un número entero), y de qué especie. */
  animales?: number;
  /** Lo que llevan criado hacia el próximo animal (fracción de 0 a 1): nace uno al llegar a 1. */
  gestacion?: number;
  especie?: string;
  material?: string;
  /** Cercas, empalizadas y murallas: su radio en casillas (crece con la aldea). */
  radio?: number;
  /** Torres: en qué punto del muro están (ángulo desde el centro de la aldea). */
  ang?: number;
  /** Murallas: cuántas veces la han alzado (1 la de siempre, hasta 3). */
  nivel?: number;
  /** Campos: el día en que se sembraron y en que se cosecharon. */
  sembrado?: number;
  cosechado?: number;
}

export interface Obra {
  tipo: string;
  x: number;
  y: number;
  progreso: number;
  pagada: boolean;
  /** Desde cuándo está apuntada (si espera materiales demasiado, se deja para más adelante). */
  desde?: number;
  /** Si se hizo con lo que había en vez de lo de siempre (una cerca de piedra seca, por ejemplo). */
  material?: string;
  /** Cercas, empalizadas y murallas: el radio que tendrá (para rodear todo lo construido). */
  radio?: number;
  /** Si es una casa que se rehace sobre otra más vieja (una choza que pasa a ser de piedra). */
  reforma?: string;
  /** Torres: en qué punto del muro se levantan (ángulo desde el centro). */
  ang?: number;
  /** Si es para alzar la muralla que ya hay (más alta), no para hacer otra. */
  alza?: boolean;
}

export interface Aldea {
  /** Edad que ha alcanzado (0 Piedra, 1 Herramientas, 2 Bronce, 3 Hierro) y cuándo llegó a cada una. */
  edad?: number;
  edades?: number[];
  /** Mientras van de camino a su nueva tierra: de dónde salieron, adónde van y cuánto tardarán. */
  viaje?: { desde: [number, number]; hasta: [number, number]; salida: number; dias: number };
  /** Aldea, pueblo o ciudad (según lo que han crecido). */
  rango?: string;
  /** Lo que les une como pueblo (lo que defendían cuando se fueron) y de dónde vienen. */
  valor?: string;
  /** Si el barro bueno queda lejos (hay que ir a por él). */
  barroLejos?: boolean;
  /** Si el bosque queda lejos: la necesidad hace pensar en ruedas, carros y caballos. */
  maderaLejos?: boolean;
  /** Obras que se dejaron por falta de materiales, y hasta cuándo no se retoman. */
  aparcadas?: Record<string, number>;
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
  /** Lo que se recuerda de su vida: a qué se dedicaba, sus hijos, su pareja y lo que descubrió. */
  sexo?: 'H' | 'M';
  oficio?: string;
  hijos?: number;
  pareja?: string;
  descubrio?: string[];
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
  | 'edad'
  | 'migracion'
  | 'viaje'
  | 'vida'
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
  migrantes?: number;
  rivalidades?: number;
  oficios?: number;
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
  /** Lo que recuerdan: la aldea donde les fue mal (y hasta cuándo la evitan) y la que les dio de comer. */
  evita?: { aldea: number; hasta: number };
  querencia?: number;
  /** Qué hacen hoy: rondar, acechar una aldea, atacar, huir o hibernar. */
  estado: 'ronda' | 'acecha' | 'ataca' | 'huye' | 'espantada' | 'hiberna';
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
  /** El tiempo que hace hoy. */
  tiempo?: Tiempo;
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
    /** Personas que se han mudado de aldea este año. */
    migrantes?: number;
  };
  poblacionMax: number;
  eras: Era[];
  /** Instante real (ISO) hasta el que está simulado el mundo. */
  reloj: string | null;
  /** Lo que se reparó al cargar un guardado dañado (las últimas): qué, cómo y por qué. */
  reparaciones?: Reparacion[];
}

/** Una reparación hecha al cargar: ruta del dato, valor que tenía, valor que se le dio y criterio. */
export interface Reparacion {
  t: number;
  ruta: string;
  antes: string;
  despues: string;
  criterio: string;
  /** false si el valor original se perdió y lo puesto es una estimación o un vacío. */
  recuperable: boolean;
}

export type Tiempo = 'sol' | 'nubes' | 'niebla' | 'lluvia' | 'tormenta';
