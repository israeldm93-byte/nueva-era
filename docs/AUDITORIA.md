# Auditoría del motor de Nueva Era

Estado del código a fecha de la auditoría (commit `4d23b03`, versión de estado 4). Este
documento describe **lo que hay de verdad**, no lo que se querría: sirve de base para el
plan de [ARQUITECTURA.md](ARQUITECTURA.md).

## 1. Cómo está hecho

Un motor de simulación determinista en TypeScript (Node 22 lo ejecuta tal cual; esbuild lo
empaqueta para el navegador) y una web estática con Three.js. El mismo motor corre en dos
sitios: en GitHub Actions cada hora (avanza el mundo y lo guarda en la rama `estado`) y en
el navegador de quien mira (lo sigue simulando en directo desde el último guardado).

| Módulo | Responsabilidad |
| --- | --- |
| `simulacion.ts` | El paso diario: orden de todos los sistemas, entierros, fin de año, extinción. |
| `mundo.ts` | Crear el mundo, personas (genes, mente, herencia) y aldeas; índices por aldea. |
| `economia.ts` | Contexto económico de cada aldea (precios por escasez), elección y ejecución del trabajo diario, obras, mantenimiento (comida que se pudre, ganado, hogueras). |
| `mente.ts` | Red neuronal individual (18→6→12) y su aprendizaje por refuerzo. |
| `saber.ts` | Experimentar, inspirarse, descubrir, enseñar, compartir ideas, escribir y leer. |
| `sociedad.ts` | Charlas al anochecer, parejas, nacimientos, salud, traslados, divisiones, encuentros entre aldeas, trueque y comercio. |
| `politica.ts` | Opiniones, consejo nocturno, facciones, cismas, relaciones entre aldeas, guerra, asaltos y paz. |
| `lenguaje.ts` | Fonología, juego de nombrar, léxico por persona, divergencia de lenguas. |
| `edades.ts`, `exodo.ts` | Edades (Piedra→Hierro), rango (aldea/pueblo/ciudad) y viajes de los que se van. |
| `fauna.ts`, `desastres.ts`, `tiempo.ts`, `mapa.ts` | Fieras, incendios, crecidas y epidemias, tiempo atmosférico, mapa y recursos. |
| `vista.ts` | Lo que se exporta a la web cada día (`datosWeb`). |
| `migrar.ts` | Puesta al día de mundos guardados con versiones anteriores. |

### El día (`paso`)

1. Tiempo atmosférico y rebrote de recursos.
2. Viajes en curso, edades y rango, planificación de obras de cada aldea.
3. **Contexto económico** de cada aldea y **jornada** de cada persona (en orden aleatorio).
4. Aprendizaje de las mentes, mantenimiento, comer, salud, peligros.
5. Fauna, desastres, charlas al anochecer (enseñar, nombrar, persuadir, parejas, nacimientos).
6. Consejo nocturno (opiniones y voto), facciones, encuentros entre aldeas, divisiones y traslados.
7. Entierros y, cada año, resumen histórico.

## 2. Diagnóstico por áreas

### 2.1. El aldeano

- **Representación** (`Persona`): genes heredables (curiosidad, sociabilidad, fuerza,
  destreza, resistencia, fertilidad, longevidad, agresividad), salud, reservas de comida,
  saberes, hasta 3 ideas a medio probar, léxico propio, rendimiento esperado de cada oficio,
  pesos de su red neuronal, opinión política, facción, padres, pareja e hijos.
- **Decisiones**: cada día elige una actividad por utilidad (lo que espera rendir × lo que
  necesita la aldea), empujada ±25 % por su red neuronal y por la prioridad del consejo
  (más en los sociables). Hay exploración (los curiosos prueban otras cosas).
- **Aprendizaje**: la red aprende por refuerzo cada noche (compara lo que esperaba con lo
  que aportó frente a la media de su aldea); el hijo hereda la mente del progenitor al que
  mejor le fue, con mutación. Los genes se heredan como media de los padres con mutación.
- **Carencias**:
  - Faltan rasgos de personalidad clave (ambición, prudencia, generosidad, lealtad,
    paciencia). Los que hay influyen poco fuera del trabajo.
  - **No hay objetivos personales**: nadie quiere aprender algo concreto, formar familia,
    prosperar, irse ni fundar. Todo es elección diaria de actividad.
  - **No hay memoria episódica**: nadie recuerda quién le ayudó o le hizo daño, qué
    hambre pasó o qué le fue mal.
  - **No hay red social** más allá de pareja y padres. Las charlas son con alguien al azar.
  - **No hay biografía viva**: solo se guarda un resumen al morir (en las tumbas).
  - **No hay oficio**: aunque cada cual aprende qué le rinde, no hay especialización ni
    pericia que mejore con la práctica.
  - **No hay migración individual** entre aldeas, salvo al casarse con alguien de fuera.

### 2.2. La aldea

- Despensa común; precios internos según escasez; planificación de obras por prioridades
  ponderadas (necesidad, peligro, tamaño); edades y rango; consejo con prioridad.
- **Carencias**: todas las aldeas siguen la misma lógica, sin especialización (todas
  producen de todo). Los excedentes se acumulan sin uso: en el mundo vivo, 17.000 de
  cereal, 5.000 pieles y 7.000 huesos. El gobierno es siempre el mismo (consejo de los más
  respetados): no hay legitimidad, sucesión ni tipos de institución. La identidad cultural
  se reduce al «valor» del grupo fundador y a la lengua.

### 2.3. Entre aldeas

- Encuentros al azar con probabilidad por distancia: visitas (se enseña y se aprenden
  palabras), bodas, trueque de materiales raros, comercio de comida con el saber
  «comercio», alianzas, rencores, asaltos y guerras con motivos rastreables.
- **Carencias**: no hay rutas ni comerciantes; el intercambio es automático y sin coste.
  No hay migración por oportunidades, ni tributos, ni dependencia entre aldeas.

### 2.4. Saberes

Ya es un proceso social y bastante sólido. Se descubre probando combinaciones con lo que
se tiene, se transmite hablando (más fácil si se comparten palabras), se escribe en
tablillas y se pierde si muere quien lo sabía. El mundo recuerda lo olvidado y celebra el
redescubrimiento. **No hace falta rehacerlo**; solo conectarlo con objetivos («quiero
aprender X») y con la red social (se aprende de quien se trata).

### 2.5. Persistencia

- Un único JSON por mundo (`mundo.json` en la rama `estado`), de 0,7 a 1,4 MB. El mapa
  (terreno y recursos por casilla) ocupa unos 700 KB fijos.
- Versión de estado 4, con migraciones encadenadas y probadas (de la 1 a la 4).
- La crónica guarda como mucho 3.000 sucesos (los importantes no se borran); las tumbas,
  las 60 últimas por aldea; la historia, una fila por año.

### 2.6. Interfaz

`vista.ts` exporta cada día todo lo que la web necesita. Secciones: Aldea, Crónica,
Saberes, Idioma, Gente y Gráficas, más el mundo 3D con fichas al tocar personas,
animales, casillas, edificios y tumbas.

## 3. Rendimiento (línea base)

Medido con `node tools/medir.ts` (Node 22, contenedor de desarrollo):

| Mundo | Población | ms por día simulado | µs por persona-día | Estado guardado |
| --- | --- | --- | --- | --- |
| Semilla 1, año 60 | 56 | 5,7 | ~95 | 912 KB |
| Semilla 2, año 60 | 57 | 2,0 | ~55 | 873 KB |
| Mundo vivo, año 100 | 127 | 14,3 | ~94 | 1.238 KB |
| Mundo vivo, año 110 | 163 | 15,0 | ~92 | 1.372 KB |

A ritmo real (un día cada 20 s) va muy sobrado; el coste crece casi linealmente con la
población. Puntos calientes (perfil de CPU de 50 años del mundo vivo):

| % de CPU | Dónde | Por qué |
| --- | --- | --- |
| ~27 % | `mejorCasilla` y sus funciones de puntuación (`economia.ts`) | Cada persona recorre cada día todas las casillas de su radio para elegir dónde trabajar. |
| ~15 % | `experimentar` y `puedeAprender` (`saber.ts`) | Cada prueba recorre todo el catálogo de técnicas. |
| ~6 % | `nombrar` y `ajustar` (`lenguaje.ts`) | El juego de nombrar de cada charla. |
| ~7 % | Recolector de basura | Arrays temporales en las búsquedas. |

## 4. Riesgos técnicos

- **Determinismo**: todo el azar sale del generador con semilla (`azar.ts`); ningún
  `Math.random` en el motor. Hay que conservarlo (existe una prueba).
- **Compatibilidad**: el navegador y el servidor ejecutan el mismo motor sobre el mismo
  guardado. Cualquier campo nuevo necesita una migración (versión 5) y valores por defecto.
- **Tamaño**: memorias y redes sociales por persona deben estar acotadas (tamaño máximo
  fijo) para que el guardado no crezca sin límite.
- **Coste**: lo nuevo debe revisarse de forma escalonada (no cada persona cada día) y
  apoyarse en eventos.
- **Acoplamiento**: `economia.ts` (≈1.000 líneas) concentra mucho. Lo nuevo irá en
  módulos propios con interfaces pequeñas.

## 5. Lo que ya existe y no hay que rehacer

Descubrimiento social de saberes, pérdida y redescubrimiento; red neuronal individual con
herencia; lenguas que divergen; consejo, facciones y cismas con viaje y consejo propio;
guerra con motivos; edades y rangos; crónica con sucesos importantes protegidos;
migraciones de versión probadas.
