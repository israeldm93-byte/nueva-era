// Lo que existe en el mundo: materiales, saberes por descubrir, verbos y edificios.
// Los aldeanos NO conocen este catálogo: descubren cada saber probando combinaciones
// de cosas que tienen a mano con un gesto (golpear, frotar, atar...).

export const AGUA = 0;
export const ORILLA = 1;
export const PRADERA = 2;
export const BOSQUE = 3;
export const COLINA = 4;
export const MONTANA = 5;
/** Ríos: se vadean a pie, dan pesca, agua dulce y arcilla. */
export const RIO = 6;
/** Pantanos y marismas: juncos, hierbas, algo de pesca y fiebres. */
export const PANTANO = 7;
/** Estepa: hierba alta, grano silvestre y grandes manadas, pero poca agua y poca madera. */
export const ESTEPA = 8;
/** Desierto: casi nada, salvo piedra. */
export const DESIERTO = 9;
/** Tundra (solo en el norte frío de ultramar): líquenes, bayas bajas, renos; casi sin madera. */
export const TUNDRA = 10;
export const TERRENOS = ['agua', 'orilla', 'pradera', 'bosque', 'colina', 'montaña', 'río', 'pantano', 'estepa', 'desierto', 'tundra'];

/** Agua donde se puede pescar (el mar y los lagos, los ríos y los pantanos). */
export const PESCABLE = [true, false, false, false, false, false, true, true, false, false, false];

export interface Material {
  id: string;
  nombre: string;
  /** Lo que alimenta cada unidad. */
  comida?: number;
  /** Fracción que se estropea cada día (la comida; también las hierbas, que se secan, y las pieles y huesos, que se ajan). */
  pudre?: number;
  /** Cuánto se aprecia cada unidad al decidir en qué trabajar. */
  peso: number;
}

export const MATERIALES: Material[] = [
  { id: 'madera', nombre: 'madera', peso: 0.5 },
  { id: 'piedra', nombre: 'piedra', peso: 0.5 },
  { id: 'fibra', nombre: 'fibra', pudre: 0.003, peso: 0.6 },
  { id: 'hierbas', nombre: 'hierbas', pudre: 0.008, peso: 0.8 },
  { id: 'bayas', nombre: 'bayas', comida: 0.5, pudre: 0.04, peso: 1 },
  { id: 'semillas', nombre: 'semillas', comida: 0.45, pudre: 0.004, peso: 1 },
  { id: 'carne', nombre: 'carne', comida: 1, pudre: 0.035, peso: 1 },
  { id: 'pescado', nombre: 'pescado', comida: 0.8, pudre: 0.05, peso: 1 },
  { id: 'cereal', nombre: 'cereal', comida: 0.6, pudre: 0.003, peso: 1 },
  { id: 'piel', nombre: 'pieles', pudre: 0.0015, peso: 1.5 },
  { id: 'hueso', nombre: 'hueso', pudre: 0.0008, peso: 0.5 },
  { id: 'arcilla', nombre: 'arcilla', peso: 0.5 },
  { id: 'malaquita', nombre: 'malaquita', peso: 1.5 },
  { id: 'casiterita', nombre: 'casiterita', peso: 1.5 },
  { id: 'hematites', nombre: 'hematites', peso: 1.5 },
  { id: 'cria', nombre: 'crías de animal', peso: 2 },
  { id: 'huevos', nombre: 'huevos', comida: 0.6, pudre: 0.03, peso: 1 },
  { id: 'leche', nombre: 'leche', comida: 0.7, pudre: 0.2, peso: 1 },
  { id: 'queso', nombre: 'queso', comida: 1.1, pudre: 0.003, peso: 1 },
  { id: 'lana', nombre: 'lana', pudre: 0.001, peso: 0.6 },
];

export const MATERIAL: Record<string, Material> = Object.fromEntries(MATERIALES.map((x) => [x.id, x]));
export const COMIDAS = MATERIALES.filter((x) => x.comida);
/** Orden en que se come: primero lo que se estropea antes. */
export const ORDEN_COMER = ['leche', 'pescado', 'bayas', 'huevos', 'carne', 'semillas', 'cereal', 'queso'];
export const MINERALES = ['malaquita', 'casiterita', 'hematites'];

/** Cosas que todo el mundo conoce sin necesidad de recogerlas. */
export const BASICOS = ['tierra', 'agua', 'cielo'];
/** Conceptos de la vida diaria que también acaban teniendo nombre. */
export const CONCEPTOS_VIDA = ['sol', 'luna', 'lobo', 'madre', 'padre', 'hijo', 'amigo', 'muerte', 'comida', 'casa'];

export const NOMBRE_CONCEPTO: Record<string, string> = {
  tierra: 'tierra', agua: 'agua', cielo: 'cielo', sol: 'sol', luna: 'luna', lobo: 'lobo', madre: 'madre',
  padre: 'padre', hijo: 'hijo', amigo: 'amigo', muerte: 'muerte', comida: 'comida', casa: 'casa',
};

/**
 * A qué sirve cada saber, a grandes rasgos: el consejo encauza las ideas de su gente
 * hacia lo que cree que hace falta (comer, defenderse, construir o saber más).
 */
export const RAMA: Record<string, 'comida' | 'guerra' | 'obras' | 'saber'> = {
  campo: 'comida', red: 'comida', trampa: 'comida', asado: 'comida', harina: 'comida', calendario: 'comida', acequia: 'comida',
  arado: 'comida', corral: 'comida', gallinero: 'comida', ordeno: 'comida', esquileo: 'obras', queseria: 'comida', doma: 'guerra', granja: 'comida', puente: 'obras', vasija: 'comida', cerveza: 'comida', cesta: 'comida', canoa: 'comida',
  lanza: 'guerra', arco: 'guerra', escudo: 'guerra', flechaFuego: 'guerra', espada: 'guerra', catapulta: 'guerra', empalizada: 'guerra',
  muralla: 'guerra',
  choza: 'obras', adobe: 'obras', canteria: 'obras', teja: 'obras', horno: 'obras', rueda: 'obras', carro: 'obras', hacha: 'obras', carbon: 'obras', cobre: 'obras',
  bronce: 'obras', hierro: 'obras', tela: 'obras', cuerda: 'obras', lasca: 'obras', fuego: 'obras', aguja: 'obras', ropa: 'obras',
  nivelacion: 'obras', cantera: 'obras', caminos: 'obras',
  escritura: 'saber', numeros: 'saber', pintura: 'saber', tambor: 'saber', medicina: 'saber', remedio: 'saber', comercio: 'saber', vela: 'saber',
};

export interface Tecnica {
  id: string;
  /** Con artículo, para la crónica: «el fuego». */
  titulo: string;
  nombre: string;
  /** Cómo se nombra cuando es ingrediente de otra cosa. */
  cosa: string;
  cosas: string[];
  verbo: string;
  facilidad: number;
  requiere?: string[];
  efecto: string;
}

export const TECNICAS: Tecnica[] = [
  { id: 'lasca', titulo: 'la piedra tallada', nombre: 'Piedra tallada', cosa: 'lascas', cosas: ['piedra', 'piedra'], verbo: 'golpear', facilidad: 0.3, efecto: 'Cuchillos de piedra: se aprovecha más carne de cada presa.' },
  { id: 'cuerda', titulo: 'la cuerda', nombre: 'Cuerda', cosa: 'cuerda', cosas: ['fibra'], verbo: 'trenzar', facilidad: 0.3, efecto: 'Sirve para atar herramientas, redes y cestas.' },
  { id: 'fuego', titulo: 'el fuego', nombre: 'Fuego', cosa: 'fuego', cosas: ['madera', 'madera'], verbo: 'frotar', facilidad: 0.15, efecto: 'Hogueras: calor en invierno, charlas al anochecer y los lobos se alejan.' },
  { id: 'lanza', titulo: 'la lanza', nombre: 'Lanza', cosa: 'lanzas', cosas: ['cuerda', 'lasca', 'madera'], verbo: 'atar', facilidad: 0.12, efecto: 'La caza rinde casi el doble y los cazadores se hieren menos.' },
  { id: 'hacha', titulo: 'el hacha de piedra', nombre: 'Hacha de piedra', cosa: 'hachas', cosas: ['cuerda', 'madera', 'piedra'], verbo: 'atar', facilidad: 0.12, efecto: 'Se corta el doble de madera.' },
  { id: 'cesta', titulo: 'la cestería', nombre: 'Cestería', cosa: 'cestas', cosas: ['cuerda', 'fibra'], verbo: 'tejer', facilidad: 0.12, efecto: 'La recolección rinde un 40 % más.' },
  { id: 'asado', titulo: 'la cocina', nombre: 'Cocina', cosa: 'comida cocinada', cosas: ['carne', 'fuego'], verbo: 'calentar', facilidad: 0.15, efecto: 'Con hoguera, la carne, el pescado y el grano alimentan un 35 % más.' },
  { id: 'remedio', titulo: 'los remedios de hierbas', nombre: 'Remedios de hierbas', cosa: 'remedios', cosas: ['hierbas', 'piedra'], verbo: 'machacar', facilidad: 0.08, efecto: 'Las enfermedades y los partos matan menos.' },
  { id: 'choza', titulo: 'las chozas', nombre: 'Chozas', cosa: 'chozas', cosas: ['fibra', 'madera'], verbo: 'apilar', facilidad: 0.15, efecto: 'Refugio del frío para cinco personas por choza.' },
  { id: 'aguja', titulo: 'la aguja de hueso', nombre: 'Aguja de hueso', cosa: 'agujas', cosas: ['hueso', 'lasca'], verbo: 'tallar', facilidad: 0.1, efecto: 'Permite coser.' },
  { id: 'ropa', titulo: 'la ropa de pieles', nombre: 'Ropa de pieles', cosa: 'ropa', cosas: ['piel', 'piel'], verbo: 'coser', facilidad: 0.15, efecto: 'Abrigo para el invierno.' },
  { id: 'trampa', titulo: 'las trampas', nombre: 'Trampas', cosa: 'trampas', cosas: ['cuerda', 'madera'], verbo: 'atar', facilidad: 0.15, efecto: 'Más caza, y a veces se atrapan crías vivas.' },
  { id: 'red', titulo: 'la red de pesca', nombre: 'Red de pesca', cosa: 'redes', cosas: ['cuerda', 'cuerda'], verbo: 'tejer', facilidad: 0.1, efecto: 'La pesca rinde dos veces y media más.' },
  { id: 'tambor', titulo: 'la música', nombre: 'Música', cosa: 'tambores', cosas: ['madera', 'piel'], verbo: 'golpear', facilidad: 0.12, efecto: 'Más convivencia: se enseña mejor y las aldeas tardan más en dividirse.' },
  { id: 'pintura', titulo: 'la pintura', nombre: 'Pintura', cosa: 'pintura', cosas: ['arcilla', 'bayas'], verbo: 'mezclar', facilidad: 0.12, efecto: 'Arte y memoria: se enseña mejor.' },
  { id: 'campo', titulo: 'la agricultura', nombre: 'Agricultura', cosa: 'cultivos', cosas: ['semillas', 'tierra'], verbo: 'plantar', facilidad: 0.03, requiere: ['cesta'], efecto: 'Campos de cereal: mucha más comida y aldeas más grandes.' },
  { id: 'corral', titulo: 'la ganadería', nombre: 'Ganadería', cosa: 'ganado', cosas: ['cria', 'cuerda'], verbo: 'atar', facilidad: 0.04, requiere: ['trampa'], efecto: 'Corrales con animales que dan carne y pieles sin cazar.' },
  { id: 'gallinero', titulo: 'las gallinas', nombre: 'Gallinero', cosa: 'gallinas', cosas: ['cesta', 'cria', 'semillas'], verbo: 'atar', facilidad: 0.05, requiere: ['trampa'], efecto: 'Gallinas en un gallinero: huevos cada día.' },
  { id: 'ordeno', titulo: 'el ordeño', nombre: 'Ordeño', cosa: 'leche', cosas: ['corral', 'vasija'], verbo: 'ordeñar', facilidad: 0.05, requiere: ['corral'], efecto: 'Cabras y vacas dan leche cada día.' },
  { id: 'esquileo', titulo: 'el esquileo', nombre: 'Esquileo', cosa: 'lana', cosas: ['corral', 'lasca'], verbo: 'esquilar', facilidad: 0.05, requiere: ['corral'], efecto: 'Las ovejas dan lana en primavera: el mejor abrigo para el invierno.' },
  { id: 'queseria', titulo: 'el queso', nombre: 'Quesería', cosa: 'quesos', cosas: ['leche', 'vasija'], verbo: 'calentar', facilidad: 0.05, requiere: ['ordeno'], efecto: 'La leche se guarda en quesos que no se estropean.' },
  { id: 'doma', titulo: 'la doma del caballo', nombre: 'Doma', cosa: 'caballos domados', cosas: ['corral', 'cuerda'], verbo: 'montar', facilidad: 0.03, requiere: ['corral'], efecto: 'Caballos domados: a caballo se llega más lejos y más rápido, y se pelea mejor.' },
  { id: 'granja', titulo: 'la granja', nombre: 'Granja', cosa: 'granjas', cosas: ['campo', 'corral', 'madera'], verbo: 'apilar', facilidad: 0.03, requiere: ['campo', 'corral'], efecto: 'Granjas con establo y pajar: más animales, que crían más, y estiércol para los campos.' },
  { id: 'vasija', titulo: 'la alfarería', nombre: 'Alfarería', cosa: 'vasijas', cosas: ['arcilla', 'fuego'], verbo: 'calentar', facilidad: 0.05, efecto: 'Almacenes de vasijas: la comida se estropea mucho menos.' },
  { id: 'harina', titulo: 'la piedra de moler', nombre: 'Piedra de moler', cosa: 'harina', cosas: ['piedra', 'semillas'], verbo: 'machacar', facilidad: 0.06, efecto: 'El grano molido alimenta un 30 % más.' },
  { id: 'puente', titulo: 'el puente', nombre: 'Puente', cosa: 'puentes', cosas: ['cuerda', 'madera', 'piedra'], verbo: 'apilar', facilidad: 0.04, requiere: ['hacha'], efecto: 'Puentes de madera sobre los ríos: se cruza a trabajar, cazar y comerciar en la otra orilla.' },
  { id: 'canoa', titulo: 'la canoa', nombre: 'Canoa', cosa: 'canoas', cosas: ['fuego', 'madera'], verbo: 'tallar', facilidad: 0.05, requiere: ['hacha'], efecto: 'Se cruza el agua: se llega a las islas, se pesca más lejos y mejor.' },
  { id: 'calendario', titulo: 'el calendario', nombre: 'Calendario', cosa: 'calendario', cosas: ['cielo', 'piedra'], verbo: 'observar', facilidad: 0.03, requiere: ['campo'], efecto: 'Se siembra en el momento justo: cosechas un 25 % mayores.' },
  { id: 'acequia', titulo: 'el regadío', nombre: 'Regadío', cosa: 'acequias', cosas: ['agua', 'tierra'], verbo: 'cavar', facilidad: 0.03, requiere: ['campo', 'hacha'], efecto: 'Acequias: cosechas un 40 % mayores.' },
  { id: 'horno', titulo: 'el horno', nombre: 'Horno', cosa: 'hornos', cosas: ['arcilla', 'fuego', 'piedra'], verbo: 'apilar', facilidad: 0.05, requiere: ['vasija'], efecto: 'Altas temperaturas: permite fundir.' },
  { id: 'canteria', titulo: 'la cantería', nombre: 'Cantería', cosa: 'sillares', cosas: ['hacha', 'piedra', 'piedra'], verbo: 'apilar', facilidad: 0.06, requiere: ['choza'], efecto: 'Casas de piedra: abrigan más, caben más y no arden.' },
  { id: 'teja', titulo: 'las tejas', nombre: 'Tejas', cosa: 'tejas', cosas: ['arcilla', 'horno'], verbo: 'calentar', facilidad: 0.04, requiere: ['horno'], efecto: 'Tejados de teja cocida: casas grandes, secas y que no prenden.' },
  { id: 'adobe', titulo: 'el adobe', nombre: 'Adobe', cosa: 'adobe', cosas: ['arcilla', 'fibra'], verbo: 'mezclar', facilidad: 0.04, requiere: ['vasija'], efecto: 'Casas de adobe: más abrigo y más gente por casa.' },
  { id: 'carbon', titulo: 'el carbón vegetal', nombre: 'Carbón vegetal', cosa: 'carbón', cosas: ['horno', 'madera'], verbo: 'calentar', facilidad: 0.06, efecto: 'Un combustible capaz de fundir metal.' },
  { id: 'cobre', titulo: 'la metalurgia del cobre', nombre: 'Cobre', cosa: 'cobre', cosas: ['carbon', 'malaquita'], verbo: 'fundir', facilidad: 0.03, efecto: 'Herramientas de cobre: casi todo el trabajo rinde más.' },
  { id: 'bronce', titulo: 'el bronce', nombre: 'Bronce', cosa: 'bronce', cosas: ['casiterita', 'cobre'], verbo: 'fundir', facilidad: 0.02, efecto: 'Herramientas de bronce, más duras que las de cobre.' },
  { id: 'hierro', titulo: 'el hierro', nombre: 'Hierro', cosa: 'hierro', cosas: ['carbon', 'hematites'], verbo: 'fundir', facilidad: 0.012, requiere: ['bronce'], efecto: 'Herramientas de hierro: las mejores.' },
  { id: 'rueda', titulo: 'la rueda', nombre: 'Rueda', cosa: 'ruedas', cosas: ['hacha', 'madera'], verbo: 'tallar', facilidad: 0.025, efecto: 'Se trabaja más lejos de la aldea.' },
  { id: 'carro', titulo: 'el carro', nombre: 'Carro', cosa: 'carros', cosas: ['corral', 'rueda'], verbo: 'atar', facilidad: 0.015, efecto: 'Carros tirados por caballos o bueyes: se llega más lejos y se trae más leña, piedra y barro en cada viaje.' },
  { id: 'tela', titulo: 'el telar', nombre: 'Telar', cosa: 'telas', cosas: ['cuerda', 'fibra', 'madera'], verbo: 'tejer', facilidad: 0.04, requiere: ['cesta'], efecto: 'Telas: más abrigo.' },
  { id: 'escritura', titulo: 'la escritura', nombre: 'Escritura', cosa: 'tablillas', cosas: ['arcilla', 'lasca'], verbo: 'marcar', facilidad: 0.012, requiere: ['vasija', 'calendario'], efecto: 'Lo escrito no muere con quien lo sabía: el saber ya no se pierde.' },
  { id: 'empalizada', titulo: 'la empalizada', nombre: 'Empalizada', cosa: 'empalizadas', cosas: ['cuerda', 'madera', 'madera'], verbo: 'apilar', facilidad: 0.04, requiere: ['hacha'], efecto: 'Muros de madera: los lobos casi no entran.' },
  { id: 'arado', titulo: 'el arado', nombre: 'Arado', cosa: 'arados', cosas: ['corral', 'madera'], verbo: 'atar', facilidad: 0.025, requiere: ['campo'], efecto: 'Bueyes que aran: cosechas un 50 % mayores.' },
  { id: 'cerveza', titulo: 'la fermentación', nombre: 'Fermentación', cosa: 'cerveza', cosas: ['semillas', 'vasija'], verbo: 'mezclar', facilidad: 0.04, efecto: 'Cerveza y fiestas: más alegría y más nacimientos.' },
  { id: 'medicina', titulo: 'la medicina', nombre: 'Medicina', cosa: 'medicinas', cosas: ['fuego', 'remedio', 'vasija'], verbo: 'calentar', facilidad: 0.025, efecto: 'Cocimientos de hierbas: enfermedades y partos aún menos mortales.' },
  { id: 'vela', titulo: 'la navegación a vela', nombre: 'Navegación a vela', cosa: 'velas', cosas: ['canoa', 'tela'], verbo: 'atar', facilidad: 0.012, efecto: 'Barcos de vela: viajes largos por agua, pesca lejana y contacto con aldeas lejanas.' },
  { id: 'numeros', titulo: 'los números', nombre: 'Números', cosa: 'números', cosas: ['escritura', 'semillas'], verbo: 'observar', facilidad: 0.012, efecto: 'Cuentas: se planifica mejor y se desperdicia menos.' },
  { id: 'arco', titulo: 'el arco', nombre: 'Arco', cosa: 'arcos', cosas: ['cuerda', 'madera'], verbo: 'tensar', facilidad: 0.06, requiere: ['lanza'], efecto: 'Arcos y flechas: se caza desde lejos y se defiende la aldea desde lejos.' },
  { id: 'escudo', titulo: 'el escudo', nombre: 'Escudo', cosa: 'escudos', cosas: ['madera', 'piel'], verbo: 'atar', facilidad: 0.06, requiere: ['lanza'], efecto: 'Escudos de madera y cuero: menos muertos al pelear.' },
  { id: 'flechaFuego', titulo: 'las flechas de fuego', nombre: 'Flechas de fuego', cosa: 'flechas de fuego', cosas: ['arco', 'fuego'], verbo: 'atar', facilidad: 0.04, efecto: 'Flechas encendidas: en un asalto prenden las casas del enemigo.' },
  { id: 'muralla', titulo: 'la muralla de piedra', nombre: 'Muralla de piedra', cosa: 'murallas', cosas: ['canteria', 'piedra', 'piedra'], verbo: 'apilar', facilidad: 0.05, efecto: 'Muros altos de piedra con torres: mucho más fuertes que la cerca o la empalizada, y se pueden alzar aún más.' },
  { id: 'espada', titulo: 'la espada', nombre: 'Espada', cosa: 'espadas', cosas: ['bronce', 'fuego'], verbo: 'golpear', facilidad: 0.03, efecto: 'Espadas (de hierro, si se sabe forjar): los guerreros pelean mucho mejor.' },
  { id: 'catapulta', titulo: 'la catapulta', nombre: 'Catapulta', cosa: 'catapultas', cosas: ['cuerda', 'madera', 'rueda'], verbo: 'atar', facilidad: 0.02, requiere: ['lanza'], efecto: 'Máquinas de asedio: en los asaltos derriban empalizadas y murallas.' },
  // Las grandes obras: transformar el terreno (se desbloquean acciones, no objetos: ver OBRAS_TIERRA).
  { id: 'nivelacion', titulo: 'la nivelación', nombre: 'Nivelación', cosa: 'niveles de agua', cosas: ['agua', 'canteria', 'cuerda'], verbo: 'observar', facilidad: 0.03, requiere: ['canteria', 'calendario'], efecto: 'Con un nivel de agua y cuerdas tensas se allana el suelo: explanadas para levantar plazas, templos y mercados en terreno abrupto.' },
  { id: 'cantera', titulo: 'las canteras', nombre: 'Canteras', cosa: 'canteras', cosas: ['canteria', 'cobre', 'madera'], verbo: 'golpear', facilidad: 0.03, requiere: ['canteria'], efecto: 'Cuñas de madera y picos de metal abren la roca de colinas y montañas: mucha más piedra, y el monte queda tallado.' },
  { id: 'caminos', titulo: 'los caminos', nombre: 'Caminos', cosa: 'caminos', cosas: ['carro', 'tierra'], verbo: 'cavar', facilidad: 0.04, requiere: ['rueda'], efecto: 'Los senderos más pisados se convierten en caminos de tierra compactada (y, sabiendo labrar la piedra, empedrados): por ellos se viaja más deprisa.' },
  { id: 'comercio', titulo: 'el comercio', nombre: 'Comercio', cosa: 'mercancías', cosas: ['cobre', 'escritura'], verbo: 'marcar', facilidad: 0.012, efecto: 'Mercados: las aldeas intercambian comida y saberes.' },
];

for (const t of TECNICAS) t.cosas.sort();

export const TECNICA: Record<string, Tecnica> = Object.fromEntries(TECNICAS.map((t) => [t.id, t]));

export interface Verbo {
  id: string;
  gerundio: string;
  requiere?: string;
}

export const VERBOS: Verbo[] = [
  { id: 'golpear', gerundio: 'golpeando' },
  { id: 'frotar', gerundio: 'frotando' },
  { id: 'atar', gerundio: 'atando' },
  { id: 'trenzar', gerundio: 'trenzando' },
  { id: 'tejer', gerundio: 'tejiendo' },
  { id: 'apilar', gerundio: 'apilando' },
  { id: 'plantar', gerundio: 'plantando' },
  { id: 'machacar', gerundio: 'machacando' },
  { id: 'tallar', gerundio: 'tallando' },
  { id: 'tensar', gerundio: 'tensando' },
  { id: 'ordeñar', gerundio: 'ordeñando' },
  { id: 'esquilar', gerundio: 'esquilando' },
  { id: 'montar', gerundio: 'montando' },
  { id: 'observar', gerundio: 'observando' },
  { id: 'mezclar', gerundio: 'mezclando' },
  { id: 'cavar', gerundio: 'cavando' },
  { id: 'marcar', gerundio: 'marcando' },
  { id: 'calentar', gerundio: 'calentando', requiere: 'fuego' },
  { id: 'coser', gerundio: 'cosiendo', requiere: 'aguja' },
  { id: 'fundir', gerundio: 'fundiendo', requiere: 'horno' },
];

export const VERBO: Record<string, Verbo> = Object.fromEntries(VERBOS.map((v) => [v.id, v]));

export interface TipoEdificio {
  id: string;
  nombre: string;
  requiere: string;
  coste: Record<string, number>;
  /** Con qué otra cosa se puede hacer si falta lo de siempre (y de qué queda hecho). */
  alternativa?: { coste: Record<string, number>; material: string };
  trabajo: number;
  aloja?: number;
}

export const EDIFICIOS: TipoEdificio[] = [
  { id: 'hoguera', nombre: 'Hoguera', requiere: 'fuego', coste: { madera: 6, piedra: 4 }, trabajo: 2 },
  { id: 'choza', nombre: 'Choza', requiere: 'choza', coste: { madera: 12, fibra: 6 }, trabajo: 5, aloja: 5 },
  { id: 'casa', nombre: 'Casa de adobe', requiere: 'adobe', coste: { arcilla: 20, madera: 6, fibra: 4 }, trabajo: 9, aloja: 7 },
  { id: 'casapiedra', nombre: 'Casa de piedra', requiere: 'canteria', coste: { piedra: 26, madera: 6, fibra: 3 }, trabajo: 10, aloja: 8 },
  { id: 'casatejas', nombre: 'Casa de tejas', requiere: 'teja', coste: { piedra: 20, arcilla: 14, madera: 10 }, trabajo: 13, aloja: 10 },
  { id: 'campo', nombre: 'Campo', requiere: 'campo', coste: { madera: 2 }, trabajo: 6 },
  { id: 'corral', nombre: 'Corral', requiere: 'corral', coste: { madera: 15 }, trabajo: 6 },
  { id: 'almacen', nombre: 'Almacén de vasijas', requiere: 'vasija', coste: { arcilla: 15, madera: 4 }, trabajo: 6 },
  { id: 'horno', nombre: 'Horno', requiere: 'horno', coste: { arcilla: 10, piedra: 10 }, trabajo: 6 },
  { id: 'cerca', nombre: 'Cerca', requiere: 'cuerda', coste: { madera: 14 }, alternativa: { coste: { piedra: 30 }, material: 'piedra' }, trabajo: 6 },
  { id: 'puente', nombre: 'Puente', requiere: 'puente', coste: { madera: 20, piedra: 6 }, trabajo: 8 },
  { id: 'gallinero', nombre: 'Gallinero', requiere: 'gallinero', coste: { madera: 8 }, trabajo: 3 },
  { id: 'granja', nombre: 'Granja', requiere: 'granja', coste: { madera: 30, piedra: 10 }, trabajo: 12 },
  { id: 'torre', nombre: 'Torre de vigía', requiere: 'hacha', coste: { madera: 18, fibra: 4 }, alternativa: { coste: { piedra: 40 }, material: 'piedra' }, trabajo: 6 },
  { id: 'establo', nombre: 'Establo', requiere: 'doma', coste: { madera: 24, fibra: 6 }, trabajo: 8 },
  { id: 'taller', nombre: 'Taller', requiere: 'horno', coste: { madera: 14, piedra: 12, arcilla: 6 }, trabajo: 8 },
  { id: 'plaza', nombre: 'Plaza empedrada', requiere: 'canteria', coste: { piedra: 50 }, trabajo: 12 },
  { id: 'calzada', nombre: 'Calles empedradas', requiere: 'canteria', coste: { piedra: 90 }, trabajo: 20 },
  { id: 'templo', nombre: 'Templo', requiere: 'canteria', coste: { piedra: 80, madera: 20 }, trabajo: 30 },
  { id: 'empalizada', nombre: 'Empalizada', requiere: 'empalizada', coste: { madera: 40 }, trabajo: 15 },
  { id: 'muralla', nombre: 'Muralla', requiere: 'muralla', coste: { piedra: 60, madera: 10 }, trabajo: 25 },
  { id: 'archivo', nombre: 'Casa de las tablillas', requiere: 'escritura', coste: { arcilla: 20, piedra: 10 }, trabajo: 10 },
  { id: 'mercado', nombre: 'Mercado', requiere: 'comercio', coste: { madera: 20, piedra: 20 }, trabajo: 12 },
];

export const EDIFICIO: Record<string, TipoEdificio> = Object.fromEntries(EDIFICIOS.map((e) => [e.id, e]));

/** Las viviendas, de peor a mejor (las de adobe y las de piedra van a la par). */
export const CASAS = ['choza', 'casa', 'casapiedra', 'casatejas'];
export const NIVEL_CASA: Record<string, number> = { choza: 1, casa: 2, casapiedra: 2, casatejas: 3 };
/** Cuánto abrigan en invierno a quien vive en ellas. */
export const ABRIGO_CASA: Record<string, number> = { choza: 0.35, casa: 0.5, casapiedra: 0.55, casatejas: 0.65 };

/**
 * Las edades, como las cuentan los que vienen después: no se «compran», se llega a
 * ellas sabiendo hacer ciertas cosas. Cada grupo de `requiere` pide al menos uno.
 */
export const EDADES: { nombre: string; requiere: string[][] }[] = [
  { nombre: 'Edad de Piedra', requiere: [] },
  { nombre: 'Edad de las Herramientas', requiere: [['hacha'], ['campo', 'corral']] },
  { nombre: 'Edad del Bronce', requiere: [['bronce']] },
  { nombre: 'Edad del Hierro', requiere: [['hierro']] },
];

export const CAPAS = ['madera', 'bayas', 'semillas', 'fibra', 'hierbas', 'caza', 'peces', 'piedra', 'arcilla', 'malaquita', 'casiterita', 'hematites'];

/**
 * Máximo de cada recurso por casilla según el terreno
 * [agua, orilla, pradera, bosque, colina, montaña, río, pantano, estepa, desierto].
 */
export const CAPACIDAD: Record<string, number[]> = {
  // (agua, orilla, pradera, bosque, colina, montaña, río, pantano, estepa, desierto, tundra)
  madera: [0, 4, 3, 40, 10, 2, 3, 6, 1, 0, 1],
  bayas: [0, 2, 4, 10, 3, 1, 4, 3, 1, 0, 3],
  semillas: [0, 1, 12, 2, 2, 0, 4, 2, 14, 1, 1],
  fibra: [0, 8, 10, 3, 2, 0, 9, 16, 6, 0, 3],
  hierbas: [0, 3, 5, 4, 3, 1, 4, 8, 2, 1, 2],
  caza: [0, 1, 3, 4, 2, 1, 2, 2, 5, 1, 5],
  peces: [30, 0, 0, 0, 0, 0, 16, 5, 0, 0, 0],
  piedra: [0, 5, 2, 3, 80, 150, 8, 0, 10, 25, 8],
  arcilla: [0, 60, 4, 2, 6, 0, 45, 35, 2, 1, 3],
  malaquita: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  casiterita: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  hematites: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};

/** Cuánto hay de bayas y semillas silvestres en cada estación respecto al máximo. */
export const TEMPORADA: Record<string, number[]> = {
  bayas: [0.6, 1.2, 0.9, 0.1],
  semillas: [0.2, 0.7, 1.2, 0.3],
};

/** Actividades que dan comida o materiales y cuyo rendimiento aprende cada cual. */
export const OFICIOS = ['recolectar', 'cazar', 'pescar', 'lenar', 'picar', 'barro', 'pastorear'];
export const VALOR_INSTINTO: Record<string, number> = {
  recolectar: 2.5, cazar: 2.5, pescar: 1.2, lenar: 3, picar: 3, barro: 3, pastorear: 2,
};

// ---------------------------------------------------------------------------------------
// Obras de tierra: acciones que una técnica desbloquea y que cambian el terreno.
//
// Se definen como datos: qué técnica las permite, en qué terrenos, cuánto cuestan, cuánto
// trabajo llevan por cada palmo de tierra movida y qué hacen (de un repertorio cerrado de
// operaciones que el motor sabe ejecutar). Nada más: una obra nueva es una entrada nueva
// aquí, y el motor la valida al arrancar.

/** Lo que el motor sabe hacer con el terreno. */
export const OPERACIONES = ['nivelar', 'excavar', 'camino'] as const;
export type Operacion = (typeof OPERACIONES)[number];

export interface ObraTierra {
  id: string;
  nombre: string;
  /** La técnica que la permite. */
  requiere: string;
  operacion: Operacion;
  /** Terrenos donde se puede hacer (la casilla central). */
  terrenos: number[];
  /** Radio de la zona (en casillas, alrededor de la central). */
  radio: number;
  /** Materiales que se gastan al empezar (herramientas, estacas, cuñas). */
  coste: Record<string, number>;
  /** Trabajo mínimo, y trabajo por cada unidad de altura movida. */
  trabajo: number;
  trabajoPorAltura: number;
  /** Excavar: cuánto se ahonda la casilla central y las de alrededor. */
  hondo?: number;
  hondoBorde?: number;
  /** Lo que se saca por cada unidad de trabajo (a la despensa). */
  produce?: Record<string, number>;
  /** Otras técnicas que hacen falta además de `requiere`. */
  ademas?: string[];
  /** Caminos: el nivel que quedan (2 tierra, 3 empedrado) y sobre qué nivel se hacen. El coste y el trabajo son por casilla. */
  nivel?: number;
  sobre?: number;
  efecto: string;
}

export const OBRAS_TIERRA: ObraTierra[] = [
  {
    id: 'explanada',
    nombre: 'Explanada',
    requiere: 'nivelacion',
    operacion: 'nivelar',
    terrenos: [ORILLA, PRADERA, BOSQUE, COLINA, ESTEPA, DESIERTO, TUNDRA],
    radio: 1,
    coste: { madera: 6, fibra: 2 },
    trabajo: 4,
    trabajoPorAltura: 0.35,
    efecto: 'Se allana una zona en pendiente: allí se levantan los edificios grandes (y el bosque que hubiera se tala).',
  },
  {
    id: 'cantera',
    nombre: 'Cantera',
    requiere: 'cantera',
    operacion: 'excavar',
    terrenos: [COLINA, MONTANA],
    radio: 1,
    coste: { madera: 8 },
    trabajo: 6,
    trabajoPorAltura: 0.25,
    hondo: 16,
    hondoBorde: 6,
    produce: { piedra: 2.5 },
    efecto: 'Se abre la roca: mucha piedra mientras se trabaja y, después, una veta al descubierto junto a la aldea.',
  },
  {
    id: 'camino',
    nombre: 'Camino de tierra',
    requiere: 'caminos',
    operacion: 'camino',
    terrenos: [ORILLA, PRADERA, BOSQUE, COLINA, MONTANA, PANTANO, ESTEPA, DESIERTO, TUNDRA],
    radio: 0,
    coste: { madera: 1 },
    trabajo: 1.2,
    trabajoPorAltura: 0,
    nivel: 2,
    sobre: 1,
    efecto: 'Un sendero muy pisado se allana, se compacta y se bordea con estacas: por él se anda bastante más deprisa.',
  },
  {
    id: 'empedrado',
    nombre: 'Camino empedrado',
    requiere: 'caminos',
    ademas: ['canteria'],
    operacion: 'camino',
    terrenos: [ORILLA, PRADERA, BOSQUE, COLINA, MONTANA, PANTANO, ESTEPA, DESIERTO, TUNDRA],
    radio: 0,
    coste: { piedra: 4 },
    trabajo: 2.5,
    trabajoPorAltura: 0,
    nivel: 3,
    sobre: 2,
    efecto: 'Un camino de tierra se empiedra: dura siempre y por él se va aún más deprisa.',
  },
];

export const OBRA_TIERRA: Record<string, ObraTierra> = Object.fromEntries(OBRAS_TIERRA.map((o) => [o.id, o]));

/**
 * Comprueba que el catálogo tiene sentido: que todo lo que se pide existe, que no hay
 * cantidades imposibles y que las obras de tierra solo usan operaciones conocidas. Se
 * llama al cargar: un catálogo roto no llega a simular nada.
 */
export function validarCatalogo(): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  const cosaValida = (c: string) => !!TECNICA[c] || !!MATERIAL[c] || BASICOS.includes(c);
  const finito = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
  for (const t of TECNICAS) {
    if (ids.has(t.id)) out.push(`técnica repetida: ${t.id}`);
    ids.add(t.id);
    if (!t.cosas.length) out.push(`${t.id}: sin ingredientes`);
    for (const c of t.cosas) if (!cosaValida(c) || c === t.id) out.push(`${t.id}: ingrediente desconocido ${c}`);
    for (const r of t.requiere ?? []) if (!TECNICA[r] || r === t.id) out.push(`${t.id}: requiere algo desconocido ${r}`);
    if (!VERBO[t.verbo]) out.push(`${t.id}: gesto desconocido ${t.verbo}`);
    if (!(t.facilidad > 0 && t.facilidad <= 1)) out.push(`${t.id}: facilidad imposible`);
  }
  // Sin ciclos en lo que hace falta saber antes (si no, nadie podría aprenderlo nunca).
  const previas = (t: Tecnica) => [...(t.requiere ?? []), ...t.cosas.filter((c) => TECNICA[c])];
  const estado = new Map<string, number>();
  const visitar = (id: string): boolean => {
    if (estado.get(id) === 1) return false;
    if (estado.get(id) === 2) return true;
    estado.set(id, 1);
    const ok = previas(TECNICA[id]).every(visitar);
    estado.set(id, 2);
    return ok;
  };
  for (const t of TECNICAS) if (!visitar(t.id)) out.push(`${t.id}: ciclo de requisitos`);
  for (const e of EDIFICIOS) {
    if (!TECNICA[e.requiere]) out.push(`edificio ${e.id}: requiere una técnica desconocida ${e.requiere}`);
    if (!(e.trabajo > 0) || !Object.values(e.coste).every(finito)) out.push(`edificio ${e.id}: cantidades imposibles`);
  }
  for (const o of OBRAS_TIERRA) {
    if (EDIFICIO[o.id]) out.push(`obra ${o.id}: choca con un edificio del mismo nombre`);
    if (!TECNICA[o.requiere]) out.push(`obra ${o.id}: requiere una técnica desconocida ${o.requiere}`);
    for (const r of o.ademas ?? []) if (!TECNICA[r]) out.push(`obra ${o.id}: requiere una técnica desconocida ${r}`);
    if (o.operacion === 'camino' && !(Number.isInteger(o.nivel) && o.nivel! >= 2 && o.nivel! <= 3 && Number.isInteger(o.sobre) && o.sobre === o.nivel! - 1)) out.push(`obra ${o.id}: nivel de camino imposible`);
    if (!OPERACIONES.includes(o.operacion)) out.push(`obra ${o.id}: operación desconocida ${o.operacion}`);
    if (!o.terrenos.length || o.terrenos.some((t) => t === AGUA || t === RIO || !(t >= 0 && t < TERRENOS.length))) out.push(`obra ${o.id}: terrenos imposibles`);
    if (!Number.isInteger(o.radio) || o.radio < 0 || o.radio > 2) out.push(`obra ${o.id}: radio fuera de límites (0 a 2)`);
    if (!(o.trabajo > 0) || !finito(o.trabajoPorAltura) || !Object.values(o.coste).every(finito)) out.push(`obra ${o.id}: cantidades imposibles`);
    for (const k of [...Object.keys(o.coste), ...Object.keys(o.produce ?? {})]) if (!MATERIAL[k]) out.push(`obra ${o.id}: material desconocido ${k}`);
    if (o.produce && !Object.values(o.produce).every((v) => finito(v) && v <= 10)) out.push(`obra ${o.id}: produce demasiado`);
    if (o.operacion === 'excavar' && !(finito(o.hondo) && o.hondo! <= 30 && finito(o.hondoBorde ?? 0))) out.push(`obra ${o.id}: excavación imposible (como mucho 30 de hondo)`);
  }
  return out;
}

{
  const errores = validarCatalogo();
  if (errores.length) throw new Error(`Catálogo inválido:\n- ${errores.join('\n- ')}`);
}
