# Recursos gráficos: procedencia y licencias

Todo lo que se dibuja en Nueva Era sale de este registro. Antes de incorporar un recurso
externo hay que apuntarlo aquí: qué es, de dónde viene, su licencia, los avisos de atribución
que exige y en qué ficheros se usa.

## Lo que se usa hoy

| Recurso | Procedencia | Licencia | Dónde |
| --- | --- | --- | --- |
| Three.js (motor 3D) | npm `three` 0.170 | MIT (copia en `vendor/LICENSE-three.txt` de la web) | toda la web |
| Edificios, gente, animales, plantas, terreno | Geometría procedural propia (cajas, cilindros, conos y esferas fundidos con colores por vértice) | La del proyecto | `web/*3d.js` |
| Biblioteca modular de construcción (cimientos, muros, entramados, tejados, puertas, ventanas, chimeneas, balcones, andamios, estacas, pilas de material) | Procedural propia | La del proyecto | `web/modulos3d.js` |

No hay ningún modelo, textura ni sonido de terceros.

## Evaluados y no incorporados (hito de ciudades 1)

- **Kenney, «Starter Kit City Builder»**
  (github.com/KenneyNL/Starter-Kit-City-Builder).
  - Licencia: modelos CC0 y código MIT; se ha verificado el fichero LICENSE del repositorio.
  - Contenido: 15 modelos GLB, unos 380 KB.
  - No encaja: son de época moderna (garaje, carreteras con farolas, edificios de ciudad
    actual). Mezclados con el mundo de Nueva Era parecerían de otro juego.
- **Kenney, «Castle Kit» y «Fantasy Town Kit»** (kenney.nl, CC0).
  - Encajarían por época y por estilo low-poly.
  - No se han podido descargar ni revisar desde el entorno de desarrollo: la red bloquea
    kenney.nl.
  - Quedan como candidatos: incorporar solo piezas sueltas (portón, torreón, tramo de muralla),
    tras comprobar su licencia, su peso y su paleta. Antes habría que reducir su paleta a la
    de `PALETA` en `web/modulos3d.js`.
- **0 A.D. (Wildfire Games)**: su arte está bajo CC-BY-SA 3.0, según el `LICENSE.txt` del
  repositorio.
  - El «compartir igual» obligaría a publicar con esa licencia lo que se derive de él.
  - Su estilo, con texturas realistas, no casa con la geometría plana de colores por vértice.
  - No se incorpora.

## Cómo incorporar un recurso externo (si algún día encaja)

1. Comprobar la licencia en su fuente original y copiar aquí el aviso que pida.
2. Reducirlo a una pieza de la biblioteca modular: la misma escala (1 casilla = 2 unidades),
   la puerta mirando a +z y colores dentro de `PALETA`.
3. Medir su coste: triángulos por instancia y tamaño de descarga. Si una pieza no cabe en unos
   pocos miles de triángulos, se simplifica o se rehace procedural.
4. Dibujarlo siempre con instancias (`instancias()` en `web/util3d.js`): nunca un objeto por edificio.
