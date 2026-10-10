# Nueva Era

Una civilización que vive sola, en 3D y en directo. Empieza con una banda de unas quince personas sin palabras, sin fuego y sin herramientas, y a partir de ahí todo lo deciden ellas: en qué trabajan, qué descubren probando cosas, cómo llaman a cada cosa, quién manda, qué facciones nacen, a quién atacan y de quién se defienden.

El mundo avanza **año y medio cada hora** (un día cada 20 segundos; 36 años al día), día y noche:

**https://israeldm93-byte.github.io/nueva-era/**

La web muestra el mundo en 3D (relieve, ríos, lagos, bosques y animales; chozas, campos y empalizadas; y cada aldeano, con su cara, su peinado y la ropa de su época, yendo a trabajar con su herramienta y volviendo de noche al fuego) y lo **simula en directo en el navegador** con el mismo motor que el servidor: como es determinista, el navegador calcula exactamente lo mismo que calculará el servidor en su siguiente ejecución. Toca a cualquiera para ver qué piensa y qué hay en su cabeza.

## Un mundo grande y peligroso

- Un continente de 160 × 112 casillas con relieve real: bosques (coníferas al norte y en las alturas, frondosos en lo templado), praderas, estepas, desiertos, pantanos, cordilleras nevadas, ríos que bajan al mar y **grandes lagos con islas**.
- Las **islas** guardan las vetas más ricas (sobre todo el estaño, imprescindible para el bronce), mucha pesca y colonias de aves. A pie no se llega: hace falta descubrir la **canoa**. Con ella se organizan viajes a las vetas, se pesca más lejos y un grupo puede irse a vivir a una isla, a salvo de las fieras y de los vecinos sin barcas.
- **Fieras** que viven en el mapa y se ven en 3D: manadas de lobos que pasan hambre de verdad (cazar les cuesta, más con nieve y pocas presas; si no comen, la manada mengua), que en invierno o famélicas rondan las aldeas (los corrales las atraen desde lejos), entran en los corrales y a veces se llevan a alguien (el fuego, las empalizadas, los vigías y las lanzas los frenan, y los cazadores salen en batida), y osos que atacan a quien trabaja en el bosque, duermen en invierno y dan carne y pieles a quien los abate.
- **Incendios** en los veranos secos (por un rayo o un descuido junto a la hoguera) que se propagan por bosques y estepas, arrasan casas y dejan cenizas; y **crecidas** de los ríos en las primaveras lluviosas.

## Fauna y flora en 3D

- **Plantas de cada sitio**: abetos de pisos dentados en el norte y en las alturas; robles, abedules de corteza blanca y pinos de copa en parasol en lo templado, agrupados en bosquetes; sauces llorones y álamos junto a ríos y lagos; frutales que florecen en primavera; palmeras en las playas cálidas y en los oasis; cactus y matorral en el desierto y la estepa; rocas con musgo en el bosque. Cerca de la cámara crecen hierba, amapolas, margaritas, lavanda, botones de oro, helechos, setas en otoño, juncos y eneas en las orillas, nenúfares en los lagos y guijarros en las playas.
- **Las estaciones se ven**: brotes en primavera, otoño de ocres y dorados, árboles desnudos en invierno y nieve sobre los pisos de las coníferas. Todo **se mece con el viento**, con rachas que cruzan el mapa (y también se mecen sus sombras).
- **Animales con esqueleto**: cuerpo, cabeza con cuello, cola y cuatro patas de dos tramos, con andares distintos (paso, trote, galope, el salto de la liebre). Las manadas de lobos rondan al trote, acechan agazapadas (de noche con los ojos brillando), atacan al galope, se tumban, se sientan y aúllan de noche; el oso se yergue al atacar y en invierno hiberna.
- **Rebaños donde hay caza**: ciervos (el macho con cuernas, alguna cría), jabalíes, liebres, caballos salvajes en la estepa y cabras monteses en las alturas. Pastan, pasean, alzan la cabeza alerta y **huyen al galope** de la gente y de las fieras; si se caza demasiado en un sitio, su rebaño desaparece. Además, ovejas en los corrales, gaviotas sobre islas y lagos, águilas sobre las cumbres, patos que se zambullen en las orillas, garzas al acecho en los pantanos y peces que saltan.
- **Perros**: cada aldea tiene los suyos, que siguen a su dueño (cazadores y pastores primero), se sientan o se tumban cuando él para, menean la cola y espantan a los ciervos.
- **Los aldeanos se mueven mejor**: las piernas van al ritmo de lo que de verdad avanzan (si tienen prisa, echan a correr), giran poco a poco y **vuelven a casa con lo que han conseguido**: el tronco al hombro, la pieza de caza a cuestas, una sarta de peces, el cesto lleno de frutos o de piedras, gavillas de trigo en verano y otoño. Los mayores andan con bastón, el pescador tiene su boya y de vez en cuando saca un pez coleando, y el cazador lanza.
- **Hojas que caen** en los bosques en otoño y **nieve que cae** en el norte en invierno.
- **Entierran a sus muertos**: cada aldea abre un cementerio a las afueras (si se muda lejos, abre otro) con un túmulo por difunto; las tumbas viejas se cubren de hierba y, con escritura, llevan lápida grabada. La ficha de la aldea dice cuántos hay enterrados y quiénes fueron los últimos.
- Para que vaya fluido, lo cercano se dibuja con detalle y lo lejano con modelos ligeros; lo que no se ve, ni se prepara.

## Cada aldeano tiene una mente

Cada persona decide con una **red neuronal** pequeña (18 entradas, 6 neuronas ocultas y 12 salidas, con pesos enteros para que todo sea exacto). Mira su hambre, su salud y su edad; la comida, la leña y los materiales de su aldea; si hay obras o campos por cosechar; si se sienten amenazados; la estación, y lo que ha decidido el consejo. Con eso estima cuánto le rendirá cada actividad comparada con la media de su aldea, y esa estimación empuja su decisión a favor o en contra.

- **Aprenden en vida** (aprendizaje por refuerzo): cada noche comparan lo que esperaban de su trabajo con lo que de verdad aportó y corrigen su error en esa situación. Lo que ya prevén bien deja de cambiar; si el mundo cambia, vuelven a aprender.
- **Lo heredan**: cada hijo nace con la mente del padre o la madre al que mejor le ha ido, con alguna mutación.
- **Se mide si aprenden**: cada mañana su mente prevé si el trabajo que elige le rendirá más o menos que a la media de su aldea, y cada año se publica qué parte de los días acierta. A ciegas sería la mitad; con lo que aprenden llegan al 65–90 %, y cuando el mundo cambia (un saber nuevo, otra tierra) fallan más hasta que vuelven a aprender. Además se les pone ante situaciones de prueba (¿y si falta leña en invierno?, ¿y si les atacan?): solo saben reaccionar a lo que han vivido.

## Política: consejo, opiniones y facciones

- Cada adulto se forma una **opinión** sobre qué es lo prioritario (comida, invierno, obras, saber, buscar tierras nuevas o defensa) mirando con su propia mente lo que viene viviendo la aldea, y la contagia al hablar.
- Cada noche se reúne junto al fuego el **consejo**: los más respetados (por edad, saber, descubrimientos e hijos). Votan y lo que deciden empuja las decisiones de todos al día siguiente, aunque cada cual obedece a su manera.
- Cuando mucha gente piensa distinto que el consejo se organiza una **facción** con su líder. Si el consejo la ignora demasiado tiempo, hay un **cisma**: la facción se marcha con sus familias y funda su propia aldea.
- Entre aldeas crece la **amistad** (bodas, comercio, origen común) o el **rencor** (competir por la misma tierra, ataques). El hambre, el rencor y la agresividad de quienes mandan pueden llevar a **asaltar** al vecino; los atacados vigilan, levantan empalizadas y pueden **aliarse**.
- **El consejo decide la guerra y la paz**: si el hambre aprieta, si hay codicia, rencor viejo o un consejo belicoso, **declara la guerra** a un vecino concreto (y lo deja escrito en la crónica con su motivo). En guerra asaltan más a menudo, ponen a más gente a defender y **encauzan las ideas hacia las armas**; firman la **paz** cuando el enemigo desaparece, cuando han perdido dos veces o tras dos años tranquilos, con una tregua de tres años. Antes de atacar miden fuerzas: nadie se lanza contra una aldea mucho más fuerte o amurallada.
- **Árbol militar, como en Age of Empires**, que también se descubre probando: **arco** (cuerda y madera), **escudo** (madera y piel), **flechas de fuego** (arco y fuego: prenden los tejados del enemigo), **muralla de piedra** (tras la empalizada; casi nadie la salta), **espada** (bronce y fuego) y **catapulta** (cuerda, madera y rueda: abre brecha en murallas). Se ven en 3D: arqueros, espadachines con escudo, murallas almenadas con torreones y catapultas junto a la aldea.
- **Tiempo atmosférico** de cada día (sol, nubes, niebla, lluvia, tormenta) según la estación y el año: la lluvia apaga incendios y crece los ríos, los rayos prenden el bosque y con tormenta se trabaja peor. En 3D, cielo gris, lluvia, aguanieve, niebla y relámpagos; arriba, año, día, hora y tiempo.
- **Ganadería y granjas**: cada corral cría la especie de su tierra (ovejas, cabras, cerdos, vacas o caballos); gallineros con gallinas que ponen huevos; ordeño (leche), esquileo (lana, el mejor abrigo), quesería y granja (más animales y más cría). Con la **doma**, cazadores, vigías y guerreros salen a caballo.
- **Ríos, puentes y barcas**: sin canoa ni puente, lo que queda al otro lado del río no se alcanza; el **puente** de madera lo cruza. Con canoa se pesca mar adentro y se llega a las islas; con la vela, la canoa lleva su vela.
- **Bosques que se talan y rebrotan**: al talar quedan tocones; con los años brota un arbolito que se hace árbol.
- **Lobos con memoria** que miden el riesgo, acechan a quien sale solo y persiguen ciervos; las aldeas amenazadas levantan una **cerca**, salen en grupo con antorchas y palos a espantarlos e investigan antes las lanzas.
- **Todo se puede tocar**: personas, aldeas, cualquier animal (con sus crías, su manada y su hambre) y cualquier casilla (madera, caza, minerales…). Arriba, los recursos de la aldea como en los juegos de estrategia.
- El consejo también **orienta la investigación**: según lo que más les preocupe (comer, construir, saber o defenderse), quien experimenta prueba antes lo de esa rama.

## Saber, idioma y genes

- **Prueba y error.** Cada saber (el fuego, la cuerda, la agricultura, el bronce…) es una receta secreta: unas cosas y un gesto. Los aldeanos no conocen las recetas: quien tiene curiosidad y tiempo combina cosas que conoce con un gesto (golpear, frotar, atar, calentar…) y, si algo parece prometer, lo va variando. Un día de pruebas da para varios intentos, y el propio trabajo **inspira**: cortando leña, recogiendo semillas o picando piedra a alguien se le ocurre a medias algo que podría hacerse con eso, y luego hay que probarlo hasta dar con ello.
- **Cultura.** El saber se transmite hablando. Muere con la última persona que lo sabía, salvo que esté escrito en tablillas.
- **Idioma propio.** Para nombrar algo sin palabra, cada uno se la inventa con los sonidos de su pueblo (el *juego de nombrar* de Luc Steels). Cada aldea llega a un vocabulario común sin que nadie lo decida, y las que se separan acaban hablando lenguas distintas.
- **Evolución.** Ocho genes (curiosidad, sociabilidad, fuerza, destreza, resistencia, fertilidad, longevidad y agresividad) se heredan con pequeñas mutaciones.

Nada de esto sigue un guion: ni el orden de los descubrimientos, ni quién manda, ni qué facciones nacen, ni quién ataca a quién, ni si la especie sobrevive. Si se extingue, empieza una nueva era. No hay ningún modelo de lenguaje dentro.

## Cómo funciona por dentro

```
src/
  catalogo.ts     materiales, saberes (con sus recetas), gestos y edificios
  mapa.ts         el continente (relieve, biomas, ríos, lagos e islas), recursos, masas de tierra
  mundo.ts        creación del mundo y de las personas, genes
  mente.ts        la red neuronal de cada aldeano, su aprendizaje y las pruebas de sensatez
  economia.ts     el trabajo de cada día (lo decide la mente), comida, cultivos y obras
  politica.ts     opiniones, consejo, facciones, cismas, asaltos, alianzas
  saber.ts        experimentar, descubrir, enseñar, escribir y leer
  lenguaje.ts     palabras inventadas, juego de nombrar y deriva de las lenguas
  sociedad.ts     charlas, parejas, nacimientos, salud, epidemias, traslados y encuentros
  fauna.ts        lobos y osos: dónde viven, qué comen, cuándo atacan y cómo se les hace frente
  desastres.ts    incendios forestales y crecidas de los ríos
  simulacion.ts   el paso de los días, la historia anual y la extinción
  matematicas.ts  funciones exactas (iguales en Node y en cualquier navegador)
  migrar.ts       pone al día mundos guardados con versiones anteriores
  vista.ts        lo que ve la web (sin desvelar lo no descubierto)
  navegador.ts    el motor empaquetado para el navegador
  cli.ts          órdenes `simular` y `avanzar`
web/
  index.html, app.js, estilo.css   la interfaz y los paneles
  mundo3d.js                       el mundo en 3D (Three.js): cámara, luz del día, nubes, etiquetas
  terreno3d.js                     relieve, agua, ríos y crecidas
  plantas3d.js, vegetacion3d.js    modelos de cada planta (cerca y lejos); qué crece dónde y cuándo
  gente3d.js                       aldeanos articulados, ropa, herramientas y animaciones
  animales3d.js, fauna3d.js        modelos y medidas de los animales; su esqueleto, andares y conducta
  edificios3d.js                   edificios, campos, hogueras e incendios
  minimapa.js                      el minimapa
  vivo.js                          el trabajador que simula en directo
tools/construir.mjs                monta la web: copia web/, empaqueta el motor y añade Three.js
test/                              pruebas
```

- La simulación es **determinista**: todo el azar sale de un generador con semilla guardado con el mundo, y las funciones matemáticas son propias para dar el mismo resultado en Node y en cualquier navegador. Simular de una vez o en tramos, guardando y cargando entre medias, da exactamente lo mismo (hay pruebas que lo comprueban).
- Cada hora, el flujo [`vida.yml`](.github/workflows/vida.yml) recupera el mundo de la rama `estado`, lo avanza hasta el momento real, lo guarda en esa rama (un único commit con `mundo.json` y una copia del estado anterior) y publica la web en GitHub Pages. Si el código cambia, el mundo no se reinicia: se pone al día con la versión nueva.

## Probarlo en local

Hace falta Node 22.18 o posterior (ejecuta TypeScript directamente, sin compilar).

```bash
npm install
npm run simular -- --anios 150 --semilla 7     # imprime la crónica de 150 años
npm test                                        # pruebas
npx tsc                                         # comprobación de tipos

# Ver la web con un mundo de prueba de 60 años:
npm run prueba-web
python3 -m http.server -d sitio 8000            # y abrir http://localhost:8000
```

Opciones de `simular`: `--todo` muestra también muertes y sucesos menores, `--cada N` imprime un resumen cada N años, `--guardar archivo.json` guarda el mundo y `--web carpeta` escribe los datos de la web.

## Ajustes

En [`src/config.ts`](src/config.ts):

- `ANIOS_POR_HORA`: velocidad del mundo respecto al tiempo real.
- `RITMO_SABER`: lo fácil que resulta descubrir (el ritmo del progreso).
- `GANAS_EXPERIMENTAR`: cuánto tiempo dedican a probar cosas en vez de trabajar.

**Reiniciar el mundo:** se borra la rama `estado` y se lanza a mano el flujo *Vida* (Actions → Vida → Run workflow). Nacerá un mundo nuevo con otra semilla.

Three.js se distribuye con su licencia MIT (`vendor/LICENSE-three.txt` en la web publicada).
