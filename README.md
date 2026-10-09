# Nueva Era

Una civilización que vive sola, en 3D y en directo. Empieza con una banda de unas quince personas sin palabras, sin fuego y sin herramientas, y a partir de ahí todo lo deciden ellas: en qué trabajan, qué descubren probando cosas, cómo llaman a cada cosa, quién manda, qué facciones nacen, a quién atacan y de quién se defienden.

El mundo avanza **un año cada hora** (un día cada 30 segundos), día y noche:

**https://israeldm93-byte.github.io/nueva-era/**

La web muestra el mundo en 3D (terreno, bosques, animales, chozas, campos, empalizadas y cada aldeano yendo a trabajar con su herramienta y volviendo de noche al fuego) y lo **simula en directo en el navegador** con el mismo motor que el servidor: como es determinista, el navegador calcula exactamente lo mismo que calculará el servidor en su siguiente ejecución. Toca a cualquiera para ver qué piensa y qué hay en su cabeza.

## Cada aldeano tiene una mente

Cada persona decide con una **red neuronal** pequeña (18 entradas, 6 neuronas ocultas y 12 salidas, con pesos enteros para que todo sea exacto). Mira su hambre, su salud y su edad; la comida, la leña y los materiales de su aldea; si hay obras o campos por cosechar; si se sienten amenazados; la estación, y lo que ha decidido el consejo. Con eso da a cada actividad un empujón a favor o en contra.

- **Aprenden en vida** (aprendizaje por refuerzo): si lo que hicieron hoy les rindió más que a la media de su aldea, la red refuerza esa elección en esa situación; si les fue peor, la debilita.
- **Lo heredan**: cada hijo nace con la mente del padre o la madre al que mejor le ha ido, con alguna mutación.
- **Se mide sin trampas**: cada año se pone a todas las mentes ante situaciones típicas (llega el invierno sin leña, hay hambre, les acaban de atacar…) y se publica qué parte reacciona con sensatez. Nadie les dice qué es lo correcto, así que esa curva sube o baja según lo que vivan.

## Política: consejo, opiniones y facciones

- Cada adulto se forma una **opinión** sobre qué es lo prioritario (comida, invierno, obras, saber, buscar tierras nuevas o defensa) mirando con su propia mente lo que viene viviendo la aldea, y la contagia al hablar.
- Cada noche se reúne junto al fuego el **consejo**: los más respetados (por edad, saber, descubrimientos e hijos). Votan y lo que deciden empuja las decisiones de todos al día siguiente, aunque cada cual obedece a su manera.
- Cuando mucha gente piensa distinto que el consejo se organiza una **facción** con su líder. Si el consejo la ignora demasiado tiempo, hay un **cisma**: la facción se marcha con sus familias y funda su propia aldea.
- Entre aldeas crece la **amistad** (bodas, comercio, origen común) o el **rencor** (competir por la misma tierra, ataques). El hambre, el rencor y la agresividad de quienes mandan pueden llevar a **asaltar** al vecino; los atacados vigilan, levantan empalizadas y pueden **aliarse**.

## Saber, idioma y genes

- **Prueba y error.** Cada saber (el fuego, la cuerda, la agricultura, el bronce…) es una receta secreta: unas cosas y un gesto. Los aldeanos no conocen las recetas: quien tiene curiosidad y tiempo combina cosas que conoce con un gesto (golpear, frotar, atar, calentar…) y, si algo parece prometer, lo va variando.
- **Cultura.** El saber se transmite hablando. Muere con la última persona que lo sabía, salvo que esté escrito en tablillas.
- **Idioma propio.** Para nombrar algo sin palabra, cada uno se la inventa con los sonidos de su pueblo (el *juego de nombrar* de Luc Steels). Cada aldea llega a un vocabulario común sin que nadie lo decida, y las que se separan acaban hablando lenguas distintas.
- **Evolución.** Ocho genes (curiosidad, sociabilidad, fuerza, destreza, resistencia, fertilidad, longevidad y agresividad) se heredan con pequeñas mutaciones.

Nada de esto sigue un guion: ni el orden de los descubrimientos, ni quién manda, ni qué facciones nacen, ni quién ataca a quién, ni si la especie sobrevive. Si se extingue, empieza una nueva era. No hay ningún modelo de lenguaje dentro.

## Cómo funciona por dentro

```
src/
  catalogo.ts     materiales, saberes (con sus recetas), gestos y edificios
  mapa.ts         terreno, recursos que se agotan y rebrotan
  mundo.ts        creación del mundo y de las personas, genes
  mente.ts        la red neuronal de cada aldeano, su aprendizaje y las pruebas de sensatez
  economia.ts     el trabajo de cada día (lo decide la mente), comida, cultivos y obras
  politica.ts     opiniones, consejo, facciones, cismas, asaltos, alianzas
  saber.ts        experimentar, descubrir, enseñar, escribir y leer
  lenguaje.ts     palabras inventadas, juego de nombrar y deriva de las lenguas
  sociedad.ts     charlas, parejas, nacimientos, salud, peligros, traslados y encuentros
  simulacion.ts   el paso de los días, la historia anual y la extinción
  matematicas.ts  funciones exactas (iguales en Node y en cualquier navegador)
  migrar.ts       pone al día mundos guardados con versiones anteriores
  vista.ts        lo que ve la web (sin desvelar lo no descubierto)
  navegador.ts    el motor empaquetado para el navegador
  cli.ts          órdenes `simular` y `avanzar`
web/
  index.html, app.js, estilo.css   la interfaz y los paneles
  mundo3d.js                       el mundo en 3D (Three.js)
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
