# Nueva Era

Una civilización simulada que vive sola. Empieza con una banda de unas quince personas sin palabras, sin fuego y sin herramientas, y a partir de ahí todo lo deciden ellas: en qué trabajan, qué descubren probando cosas, cómo llaman a cada cosa, qué enseñan a sus hijos y qué se pierde cuando alguien muere sin haberlo enseñado.

El mundo avanza **un año cada hora**, día y noche, gracias a GitHub Actions, y se puede seguir en una web que se actualiza sola:

**https://israeldm93-byte.github.io/nueva-era/**

## Qué aprende y cómo

No hay ningún modelo de lenguaje ni red neuronal dentro: quien aprende es la sociedad entera, mediante cuatro mecanismos reales y medibles.

- **Prueba y error.** Cada saber (el fuego, la cuerda, la agricultura, el bronce…) es una receta secreta: unas cosas y un gesto. Por ejemplo, el fuego sale de frotar madera con madera. Los aldeanos no conocen las recetas. Quien tiene curiosidad y tiempo libre combina cosas que tiene a mano con un gesto (golpear, atar, calentar…). Si el resultado se parece a algo que funcionaría, lo apunta como *idea prometedora* y la va variando. Es una búsqueda a tientas, y las ideas se comparten al hablar.
- **Aprendizaje por refuerzo.** Cada persona estima cuánto rinde cazar, pescar, recolectar o cortar leña según lo que le ha ido saliendo, y elige su trabajo comparando esa estimación con lo que necesita la aldea. Los hijos heredan esas estimaciones de sus padres.
- **Cultura.** El saber se transmite hablando: de padres a hijos y en las charlas junto a la hoguera. Muere con la última persona que lo sabía, salvo que esté escrito en tablillas.
- **Evolución.** Siete genes (curiosidad, sociabilidad, fuerza, destreza, resistencia, fertilidad y longevidad) se heredan con pequeñas mutaciones, y la selección natural hace el resto.

### El idioma

Nadie empieza sabiendo hablar. Para nombrar algo sin palabra, cada uno se la inventa con los sonidos de su pueblo. Al hablar, si el otro ya usa esa palabra, ambos la refuerzan; si no, la aprende. Es el *juego de nombrar* de Luc Steels, y gracias a él cada aldea llega a un vocabulario común sin que nadie lo decida. Los niños a veces aprenden mal una palabra, y así el idioma deriva con las generaciones. Las aldeas que se separan acaban hablando lenguas distintas, y entonces enseñarse cosas les cuesta más.

### Lo que no está programado

Ni el orden de los descubrimientos, ni quién los hace, ni qué se olvida, ni cuándo una aldea se divide o se traslada, ni si la especie sobrevive. Si se extingue, empieza una nueva era en un mundo nuevo.

## Cómo funciona por dentro

```
src/
  catalogo.ts     materiales, saberes (con sus recetas), gestos y edificios
  mapa.ts         generación del terreno, recursos que se agotan y rebrotan
  mundo.ts        creación del mundo y de las personas, genes
  economia.ts     el trabajo de cada día, la comida, cultivos y obras
  saber.ts        experimentar, descubrir, enseñar, escribir y leer
  lenguaje.ts     palabras inventadas, juego de nombrar, deriva y parecido entre lenguas
  sociedad.ts     charlas, parejas, nacimientos, salud, peligros, divisiones y encuentros
  simulacion.ts   el paso de los días, la historia anual y la extinción
  cronica.ts      la crónica en español
  exportar.ts     los datos que lee la web (sin desvelar lo no descubierto)
  cli.ts          órdenes `simular` y `avanzar`
web/              la web (HTML, CSS y JavaScript sin librerías)
test/             pruebas
```

- La simulación es **determinista**: todo el azar sale de un generador con semilla cuyo estado se guarda con el mundo. Simular de una vez o en tramos, guardando y cargando entre medias, da exactamente el mismo resultado (hay una prueba que lo comprueba).
- Cada hora, el flujo [`vida.yml`](.github/workflows/vida.yml) recupera el mundo de la rama `estado` y lo avanza hasta el momento real. Si GitHub se retrasa, recupera el tiempo perdido. Después guarda el mundo en esa misma rama, que tiene un único commit con `mundo.json` y una copia del estado anterior (`anterior.json`), y publica la web en GitHub Pages.

## Probarlo en local

Hace falta Node 22.18 o posterior (ejecuta TypeScript directamente, sin compilar).

```bash
npm install
npm run simular -- --anios 150 --semilla 7     # imprime la crónica de 150 años
npm test                                        # pruebas
npx tsc                                         # comprobación de tipos

# Ver la web con un mundo de prueba:
node src/cli.ts simular --anios 150 --semilla 7 --web web/datos
python3 -m http.server -d web 8000              # y abrir http://localhost:8000
```

Opciones de `simular`: `--todo` muestra también muertes y sucesos menores, `--cada N` imprime un resumen cada N años y `--guardar archivo.json` guarda el mundo.

## Ajustes

En [`src/config.ts`](src/config.ts):

- `ANIOS_POR_HORA`: velocidad del mundo respecto al tiempo real.
- `RITMO_SABER`: lo fácil que resulta descubrir (el ritmo del progreso).
- `GANAS_EXPERIMENTAR`: cuánto tiempo dedican a probar cosas en vez de trabajar.

**Reiniciar el mundo:** se borra la rama `estado` y se lanza a mano el flujo *Vida* (Actions → Vida → Run workflow). Nacerá un mundo nuevo con otra semilla.
