# Estado del proyecto y cómo retomarlo

Situación al cerrar la fase del **mundo ampliado** (12 de octubre de 2026). Este documento
sirve para retomar el trabajo más adelante sin perder el contexto. La arquitectura general
está en [ARQUITECTURA.md](ARQUITECTURA.md) y la auditoría anterior en [AUDITORIA.md](AUDITORIA.md).

## Dónde está cada cosa

| Qué | Dónde |
| --- | --- |
| Código publicado | rama `main`, commit `fc07b54` («Exploración por mar y colonización de ultramar») |
| Rama de trabajo de esta fase | `claude/festive-noether-f3jpmw` (igual que `main` en `fc07b54`, más este documento) |
| Mundo vivo | rama `estado`, `mundo.json` (versión de estado 6, mapa 256×192) |
| Web publicada | https://israeldm93-byte.github.io/nueva-era/ (GitHub Pages) |
| Copia de seguridad del mundo | rama `respaldo/estado-2026-10-11` (commit `7a1b672`, día 7116) |
| Copia antes de reparar | `antes-de-reparar-7116.json` en la rama `estado` |

**No tocar:** el mundo guardado (`estado`) ni las dos copias de seguridad.

Automatización (`.github/workflows`):

- `pruebas.yml` («Pruebas»): la batería de pruebas en cada envío.
- `vida.yml` («Vida»): cada hora avanza el mundo vivo y lo guarda en `estado`. Al enviar
  a `main`, publica también la web.

Cualquier envío a `main` vuelve a desplegar la web y hace que la próxima «Vida» use el
código nuevo con el mundo vivo.

## Historia reciente (fases cerradas)

| Commit | Fase |
| --- | --- |
| `436aeb2` | Estabilidad y reparación (NaN, límites, guardados reparados con registro). |
| `17eff5f` | Hambre en las opiniones, viajes entre aldeas lejanas, plaza que sigue el terreno, cisma moderado. |
| `5924b3a` | **Paso 1:** mapa ampliado de 160×112 a 256×192 (mar al este y al sur) sin mover nada. Estado versión 6. |
| `3ddb782` | **Paso 2:** regiones de ultramar: norte frío (tundra y taiga), sur árido (desierto, estepa, oasis, vetas) y archipiélago. |
| `fc07b54` | **Paso 3:** exploración por mar y colonización emergente de ultramar. Publicado. |

## El mundo ampliado, en resumen

### El mapa

- El continente de siempre ocupa el rectángulo de arriba a la izquierda (`ANCHO`×`ALTO` =
  160×112, en `src/config.ts`). Cada casilla está en la misma x e y que antes.
- El mapa completo mide `MUNDO_ANCHO`×`MUNDO_ALTO` = 256×192.
- Lo nuevo se genera en `src/ultramar.ts`:
  - `ampliarMapa` añade mar y vuelve a calcular los índices de casilla guardados (guaridas,
    incendios, cenizas e inundadas).
  - `crearUltramar` crea las tierras con su propio azar, sacado de la semilla. El azar de la
    simulación no se toca.
- Entre el continente de origen y ultramar hay siempre al menos 8 casillas de mar
  (`MARGEN`): ninguna tierra nueva queda unida al continente.
- La migración de la versión 5 a la 6 está en `src/migrar.ts`.

### Las regiones

| Región | Terreno y recursos | Efecto en la vida |
| --- | --- | --- |
| **Norte frío** | Terreno nuevo `TUNDRA = 10`, taiga y cumbres. | `frioDe` (0 en el continente de origen): el frío del invierno daña ×(1 + 3·frío) a la intemperie, y bayas y semillas crecen hasta ×(1 − 0,6·frío). Con refugio, hoguera y pieles se aguanta igual que en el continente. |
| **Sur árido** | Desierto, estepa, sierras con cobre, estaño y hierro, y 6 oasis. | Poca comida fuera de los oasis y la estepa. |
| **Archipiélago** | Islas bajas de pradera, bosque y playa. | Pesca en el mar de alrededor. |

### La exploración (`src/exploracion.ts`)

Reutiliza `persona.viaje` con un campo `mar` (tipo `Travesia`) y tiene tres fases: ida,
estancia en la tierra hallada y vuelta.

- **Quién puede salir:** una aldea que conoce la canoa, está a 10 casillas o menos del mar
  abierto y tiene comida y madera de sobra. Nunca se sale en invierno.
- **Preparación:** la barca cuesta 4 de madera. Los víveres salen de la despensa y se comen
  a bordo. La tripulación es de 2 personas (3 con vela).
- **Alcance:** 32 casillas en canoa y 90 a vela.
- **Riesgo:** cada día en el mar pueden naufragar (0,4 % en canoa y 0,15 % a vela; ×5 con
  tormenta y ×2 en invierno). Si naufragan, se pierden todos y lo que vieron.
- **Noticias:** la tierra hallada (`aldea.tierras`) y los minerales vistos (`vistos`) solo
  llegan a la aldea **cuando vuelven**. Las aldeas hijas heredan lo que sabía su madre, y las
  visitas entre aldeas lo cuentan.

### La colonización

- `buscarSitio` (`src/mapa.ts`) solo acepta sitios de ultramar si:
  - la aldea **conoce** esa tierra (`conoceTierra`);
  - se puede vivir allí (`habitable`): una puntuación de 60 o más y, en el norte helado,
    saber hacer ropa de pieles.
- El éxodo cruza el mar día a día (`src/exodo.ts`) y puede perder gente si vuelca una barca.

### En la web

- Colores y vegetación de la tundra, y su fauna.
- Latitudes medidas respecto al continente de origen.
- Expediciones y colonos van en barca sobre el agua.
- Cada aldea muestra las tierras que conoce.
- La crónica tiene un tipo nuevo, `exploracion`.

## Resultados medidos al cerrar

- **Conservación:** `node tools/ampliacion.ts <mundo v5.json>` confirma que, al recortar el
  mundo ampliado, sale exactamente el mismo mundo. Nada se ha movido, guardar y cargar no
  cambia nada y la simulación sigue 2 años sin anomalías. Se comprobó con el mundo vivo del
  día 10540 justo antes de publicar. Tras publicar, el mundo vivo está en la versión 6, día
  10592, con 129 personas y 5 aldeas.
- **Pruebas:** 58 pasan, 0 fallan y 3 se omiten (las largas, que necesitan `LARGO=1` y no se
  ejecutaron en esta fase). `tsc` sin errores. Las pruebas nuevas están en
  `test/ultramar.test.ts` y `test/exploracion.test.ts`.
- **Cismas:** en 3 ejecuciones comparables de 20 años sobre el mundo vivo:
  - código anterior: 5, 6 y 8;
  - código nuevo: 8, 1 y 6.
  - No hay bucles de escisión, aldeas inviables ni fundaciones descontroladas.
- **Exploración en 20 años simulados:** varias salidas sin hallar nada desde la costa norte,
  el descubrimiento del sur árido, la noticia difundida por visitas y, en algunas ejecuciones,
  colonias fundadas en ultramar.
- **Rendimiento:**
  - Simulación: unos 5,5 ms por día y por cada 100 personas, frente a 4,9 antes (alrededor
    de +13 %).
  - Web: alrededor de +18 % de triángulos por fotograma.
  - Memoria JS: de 57 a 68 MB, frente a 44 a 52 MB antes.
  - Estado guardado: unos 2,4 MB, frente a 1,3 MB.

## Cosas a tener en cuenta

- **Historia:** las tierras nuevas cambian la historia aleatoria de cualquier semilla. Las
  pruebas que dependen de una historia concreta (escenarios a 25 años de una semilla) pueden
  romperse por eso, sin que haya un error. Dos de `test/convivencia.test.ts` se aislaron de
  la historia de su semilla en `fc07b54`: la escasez recordada de la aldea y su aldea madre.
- **Salud en centésimas:** la salud se redondea a centésimas. En el continente, a un adulto
  bien comido el frío de un día apenas le resta, porque recupera +0,01 al día. Por eso el
  factor del norte es ×(1 + 3·frío).
- **Riesgo del éxodo:** solo se aplica a los grupos que van hacia ultramar. Los cruces de
  lagos dentro del continente siguen como antes.

## Cómo retomar

1. **Partir de `main`.** Si la rama de trabajo ya se fusionó, se crea de nuevo desde `main`.
2. **Antes de publicar:**
   - `npx tsc`;
   - `npm test`;
   - si se toca la simulación de fondo, `LARGO=1 node --test test/estabilidad.test.ts`
     (semillas 23, 37 y 59).
3. **Si cambia el formato del estado:** subir `VERSION_ESTADO`, añadir la migración en
   `src/migrar.ts` y comprobar la conservación con un mundo real de la rama `estado`, por
   ejemplo con `git show origin/estado:mundo.json > mundo.json`.
4. **Publicar:** avanzar `main` sin reescribir la historia y comprobar «Pruebas», «Vida» y el
   despliegue de Pages por la API de GitHub.
5. **Copias:** no tocar `estado` ni las copias de seguridad, y hacer una copia nueva antes de
   cualquier cambio que reescriba el mundo.

Esta fase está cerrada. Los cambios futuros parten de los problemas concretos que se observen
en el mundo publicado.

## Hito 1 de la nueva etapa: técnicas que desbloquean acciones y obras de tierra

Primera pieza de la evolución tecnológica y de la transformación del mundo.

### Técnicas nuevas

Las dos tienen ingredientes, gesto y requisitos, así que se descubren combinando lo que
se conoce, se enseñan, se pierden y se redescubren como todas las demás:

- `nivelacion`: requiere `canteria` y `calendario`.
- `cantera`: requiere `canteria` y se hace con cobre y madera.

### Acciones declarativas (`OBRAS_TIERRA`, en `src/catalogo.ts`)

Cada obra de tierra se define como datos:

- qué técnica la desbloquea;
- en qué terrenos se puede hacer;
- el radio de la zona;
- el coste en materiales;
- el trabajo (un mínimo más una parte por cada palmo de tierra movida);
- la operación: solo `nivelar` o `excavar`, que son las que el motor sabe ejecutar;
- lo que produce mientras se trabaja.

`validarCatalogo()` revisa al cargar todo el catálogo: técnicas, edificios y obras.
Comprueba que lo que se pide existe, que no hay ciclos de requisitos ni cantidades
imposibles y que no se pasan los límites de radio, profundidad y producción. Un catálogo
roto no llega a simular.

### Motor (`src/tierra.ts`)

- Las obras de tierra usan el mismo circuito que los edificios: se pagan al empezar, las
  hacen los que construyen y se aparcan si faltan materiales.
- El relieve cambia poco a poco según avanza la obra (`moverTierra`).
- Al acabar, la casilla queda en `m.labrado` (`acabarTierra`), con sus consecuencias:
  - **Explanada:** iguala la zona a su altura media y tala el bosque. Los edificios grandes
    (`GRANDES`) prefieren la explanada; quien sabe nivelar allana antes un sitio con más de
    6 palmos de desnivel.
  - **Cantera:** ahonda la roca, da piedra mientras se trabaja y deja una veta de 60 a 80 de
    piedra.

### Web

- El relieve 3D se rehace cuando cambia lo labrado, como mucho cada 4 s.
- Hay colores para la explanada, la cantera y la tierra removida, y no crece vegetación en
  lo labrado.

### Resultados

- **Pruebas:** `test/tierra.test.ts`: catálogo, explanada gradual con el edificio encima,
  cantera, guardar y cargar a mitad de obra, y reparación de datos rotos.
- **Mundo vivo (día 16646), 30 años simulados:** las técnicas se descubren solas y se
  difunden. Aparecen explanadas para plazas y casas de las tablillas, y canteras en las
  colinas. 0 invariantes rotas y 0 anomalías.
- **Rendimiento:** unos 7,4 ms al día por cada 100 personas, frente a 6,8 antes.

### Cómo ampliar

- **Una técnica nueva:** una entrada en `TECNICAS` (y su rama en `RAMA`). Si desbloquea una
  obra de tierra, otra entrada en `OBRAS_TIERRA`.
- **Una operación nueva sobre el terreno** (terrazas, acequias, caminos): añadirla a
  `OPERACIONES`, a `planear` y a `acabarTierra`, y decir en `planificar` cuándo la quiere una
  aldea.

### Próximos hitos previstos (sin empezar)

1. Más operaciones: terrazas de cultivo, acequias de riego y caminos que aceleren los viajes.
2. Una edad nueva (`EDADES`) tras el Hierro, ligada a estas técnicas, con ramas de
   especialización: agricultura, minería, navegación, construcción y comercio.
3. Pueblos distintos según sus técnicas y su geografía; difusión limitada por contacto y
   aislamiento.
4. Guerras con causas (rivalidad, agravios, recursos, territorio), preparación, asedios,
   conquistas y tratados.

## Hito 2: caminos, movilidad terrestre y exploración con memoria

### Caminos (`src/caminos.ts`)

- **Tránsito:** ir a trabajar lejos, las visitas, las mudanzas, los éxodos y los encuentros
  entre aldeas dejan tránsito en las casillas de tierra que recorren (nunca en el agua).
  El tránsito se guarda en `m.transito` y cada mes se olvida un 20 %.
- **Senderos:** donde el tránsito pasa de 180 queda un sendero (nivel 1 en `m.caminos`); si
  baja de 60, se borra.
- **Caminos construidos:**
  - La técnica nueva `caminos` (requiere `rueda`) desbloquea dos obras de tierra en
    `OBRAS_TIERRA`, con la operación `camino`.
  - **Camino de tierra:** 1 de madera y 1,2 de trabajo por casilla, sobre senderos (nivel 2).
  - **Empedrado:** además requiere `canteria`; 4 de piedra y 2,5 de trabajo por casilla,
    sobre caminos (nivel 3).
  - Cada aldea mejora un tramo seguido (hasta 10 casillas) de sus senderos más transitados
    (`tramo`). El camino avanza casilla a casilla.
- **Duración de los viajes:** `diasEntre` multiplica la distancia en línea recta por el atajo
  de los caminos que hay en la línea del recorrido; un tramo es más rápido (×1,2, ×1,5 o
  ×1,9 según el nivel) solo si sus dos casillas lo son. Sin caminos, la duración es la de
  siempre. Lo calculado se guarda en caché hasta que cambian los caminos (`tocarCaminos`).
  Se aplica a:
  - visitas;
  - mudanzas;
  - éxodos;
  - el tramo a pie hasta el puerto;
  - el alcance de los encuentros y del comercio (`atajo`).
- **Web:** caminos en el terreno 3D (con menos nieve encima), en el minimapa y sin vegetación.

### Exploración

- **Puntos de salida:** `puertos` devuelve hasta 6 puntos de la costa de la aldea.
- **Rutas:** `rutasPosibles` combina cada puerto con 16 rumbos y descarta los que no salen a
  mar abierto.
- **Memoria (`aldea.rutas`):** se apunta al volver la expedición, nunca antes.
  - Una ruta probada no se repite hasta pasados 12 años si no vieron nada, 8 si solo vieron
    costas conocidas y 20 si hallaron tierra.
  - Los rumbos vecinos de una ruta fallida, desde puertos cercanos, también pierden atractivo.
- **Rodear costas conocidas:** si una expedición topa con una tierra ya conocida que no es la
  suya, la rodea y sigue, así que lo que hay detrás también se puede descubrir.
- **Ganas de explorar:** dependen de las rutas aún sin probar, de la falta de sitio en la
  aldea y de la escasez de piedra.

### Resultados

20 años sobre una copia del mundo vivo, frente a la versión anterior:

| | Antes | Ahora |
| --- | --- | --- |
| Tierras nuevas descubiertas | 1 | 7 |
| Masas de ultramar conocidas (partiendo de 1) | 2 | 7 |
| Colonias | — | la primera en el norte frío (Ogor) |
| Senderos / caminos / empedrados (casillas) | — | 633 / 291 / 114 |
| Coste | 6,55 ms/día por cada 100 personas | 7,01 (+7 %) |

Desde los puertos actuales, encadenando descubrimientos, se pueden alcanzar 14 masas de
ultramar; antes, 4. Las pruebas están en `test/movilidad.test.ts`.

### Pendiente para más adelante

- Puentes.
- Que los caminos acerquen también el trabajo diario (el radio de trabajo).
- Rutas comerciales explícitas.

## Hito 3: economías regionales, especialización y comercio real

### Reservas y prioridades (`src/economia.ts`)

- `objetivos()` reúne lo que cada aldea quiere tener de cada material. Antes estaba metido
  dentro de `contexto`; ahora lo usan los precios y el comercio.
- La comida pierde prioridad cuando sobra para más de un año.
- No se siembran campos nuevos con año y medio de comida guardada.
- Los encargos de otras aldeas suben la prioridad de producir, pero solo en la parte que no se
  cubre ya con lo que sobra.
- No hay caducidad nueva ni límites de almacén.

### Comercio (`src/mercaderes.ts`)

- **`balance`:** calcula, para cada aldea, tres cantidades por material:
  - **falta:** lo que no llega a su objetivo, contando las obras pendientes y las aparcadas;
  - **sobra:** lo que pasa de una reserva holgada; en comida, más de 180 días;
  - **hueco:** lo que le cabe hasta completar esa reserva.
- **`tratar`:** solo hay viaje si a una aldea le sobra lo que a otra le falta, la otra puede dar
  a cambio algo que a la primera le quepa, y a las dos les compensa el coste del viaje.
  - El coste depende de los días de camino, que se acortan con caminos.
  - Una aldea hermana o aliada puede llevar comida como ayuda a la que pasa hambre.
- **Mercaderes:** usan el viaje de visita (`p.viaje` con `carga` y `trato`).
  - Al salir, la carga deja la despensa.
  - Al llegar se entrega, y se carga lo convenido sin tocar las reservas del otro.
  - Se quedan unos días hablando, con lo que difunden saberes, y al volver descargan.
  - Si el viaje se tuerce, la carga queda donde está el mercader; si muere, se pierde con él.
- **Encargos:** lo que se necesita y nadie ofrece queda como encargo en las aldeas con las que
  se trata.
- **Lo sustituido:** el antiguo `comerciar`, que pasaba comida al instante, desaparece. El
  trueque de pequeños regalos en los encuentros se mantiene.

### Perfil económico

- Sale de las jornadas reales de cada aldea (`trabajos`, que se van olvidando poco a poco).
- `perfil` cambia con histéresis: otro oficio tiene que superar claramente al actual.
- `balanza` recoge lo exportado e importado en los últimos años.
- La ficha de la aldea muestra las jornadas, lo que vende y lo que compra.
- La crónica (tipo `comercio`) anota rutas nuevas, la primera vez que una aldea vende algo,
  ayudas alimentarias y cambios de perfil.

### Resultados

20 años sobre una copia del mundo vivo:

| | Antes | Ahora |
| --- | --- | --- |
| Viajes de comercio | 0 | 120 (88 por caminos) |
| Máximo acumulado de comida | 4.211 días | 1.391 días |
| Muestras con menos de 30 días de comida | ninguna | ninguna |

- Se comercia sobre todo lana, piedra y minerales.
- Los perfiles son distintos según el entorno: pastores, recolectores, pescadores y cazadores.
- Las pruebas están en `test/comercio.test.ts`.

### Pendiente

- Comercio por mar.
- Bienes elaborados (herramientas, metal fundido).
- Moneda.
- Influencia del comercio en la política.

## Hito 4: diplomacia y primeras guerras

Amplía lo que ya había (relaciones, rencor, alianzas, consejo y su guerra, armas, murallas,
viajes). No sustituye nada.

### Relaciones con memoria (`Relacion` en `src/tipos.ts`)

- Además de `afinidad`, `rencor` y `alianza`, cada pareja de aldeas recuerda:
  - `agravio`: muertos en combate. Se olvida muy despacio (×0,99 al mes) y no deja que el
    rencor baje de la mitad de su valor.
  - `disputa`: vecinas a menos de 16 casillas a las que les falta lo mismo de la tierra (comida,
    madera, piedra) se disputan tierras y recursos. Crece cada mes que dura y se apaga si no.
  - `comercio`: lo intercambiado por los mercaderes, que se va olvidando (×0,9 al mes).
  - `peor`: el peor momento, para reconocer una reconciliación.
- Lo que acerca: comerciar (+0,01 de afinidad por trato), ayudar en el hambre (+0,1 y menos
  rencor), compartir comida entre aliadas (+0,03).
- Lo que separa: asaltos, muertos, disputas, migraciones a una aldea que ya no tiene casas
  ni comida para tantos, y aliados que no acuden a defender.
- Estados que muestra la web: aliados, amistad, neutral, tensión, hostiles, guerra (`trato()`).

### Motivos de conflicto (`quiereAsaltar`, `src/politica.ts`)

- Motivos posibles: tierras (disputa), hambre, codicia, rencor, consejo belicoso y venganza.
- Lo que frena una guerra:
  - la afinidad;
  - el comercio (pelear con un buen socio sale caro);
  - las fuerzas del otro, con sus murallas y sus aliados cercanos;
  - la tregua de 3 años tras una paz.
- No hay un número de guerras fijado: sin motivo no hay guerra.

### Incursiones (`src/guerra.ts`)

- El consejo declara la guerra y salen los guerreros. Es un viaje de verdad (`p.viaje.incursion`
  y `m.incursiones`):
  - van el 30 % de los adultos aptos;
  - cada uno se lleva 2 de madera para las armas (si no hay madera, van menos);
  - llevan comida para ida y vuelta, que sale de la despensa.
- Por el camino comen de sus víveres, y si se acaban pasan hambre.
- Al llegar:
  - si su fuerza es menor que el 45 % de la defensa (murallas, vigías, aliados), se retiran
    sin pelear;
  - si no, pelean (`combatir`). Cuentan los guerreros y su fuerza, las armas, los muros
    (menos con catapultas), los vigías y hasta 3 defensores de cada aliado a menos de
    25 casillas;
  - hay muertos y heridos en los dos bandos (heridas en la salud y en la biografía).
- El botín (35 % de la comida del vencido) viaja con ellos y no entra en su despensa hasta que
  vuelven, junto con la comida que les sobre. Si su aldea desaparece, lo que llevan queda en
  la más cercana. Nada se duplica ni se pierde sin causa.
- Solo puede haber una incursión de A contra B a la vez.
- Si se firma la paz mientras van, se dan la vuelta.

### Paz (`repensarGuerra`)

- Una guerra se acaba por cualquiera de estas causas:
  - dos derrotas;
  - cansancio acumulado (muertos, retiradas, combates);
  - hambre en casa;
  - la mediación de un aliado común;
  - un rencor que se enfría sin asaltos;
  - que el enemigo desaparezca.
- La paz abre 3 años de tregua y deja volver a los mercaderes (en guerra no se comercia).
- El rencor baja, pero el agravio deja poso.
- Con años de trato, dos aldeas que fueron hostiles pueden reconciliarse y llegar a aliarse.

### Observabilidad

- La crónica (Política) cuenta:
  - declaraciones con su motivo;
  - asaltos con bajas, heridos, botín y aliados que acuden;
  - retiradas;
  - paces con su causa;
  - reconciliaciones y alianzas.
- La ficha de la aldea muestra:
  - la guerra con su motivo, los guerreros en camino, las derrotas y el cansancio;
  - para cada vecino, su estado y su memoria (agravios, disputas, comercio, tregua).
- La ficha de un guerrero dice contra quién marcha, por qué y cómo le fue.
- Se valida al cargar: una incursión ilegible o repetida se descarta, sus guerreros vuelven a
  casa y lo que llevaban entra en su despensa (queda registrado en `reparaciones`).

### Correcciones de paso

- Una facción recién escindida que aún iba de camino (65 días) podía asaltar al instante a su
  aldea de origen y llevarse miles de raciones. Ahora una aldea en marcha no lanza incursiones.
- Cuando el consejo cambiaba de prioridad se rehacía sin su guerra, que desaparecía sin paz ni
  crónica. Ahora la guerra se conserva hasta que se firma la paz.

### Resultados

20 años sobre una copia del mundo vivo (582 personas, día 17.043), comparados con la versión
anterior (b2d3015):

| | Antes | Ahora |
| --- | --- | --- |
| Personas al acabar | 928 | 928 |
| Muertes (en combate / de hambre) | 223 (0 / 0) | 223 (0 / 0) |
| Viajes de comercio | 351 | 351 |
| Guerras | 0 | 0 |
| Alianzas nuevas | 19 | 19 |
| Invariantes rotas, anomalías | 0, 0 | 0, 0 |
| ms por día | 61,9 | 62,1 |

- Es un mundo próspero y aliado: sin motivo no hay guerra. La misma copia con el 85 % de la
  comida perdida tampoco entra en guerra: se recupera comerciando y forma 9 alianzas más.
- En mundos nuevos (semillas 11, 23, 37 y 59, de 60 a 100 años) no hay invariantes rotas ni
  anomalías. Las diferencias de población vienen del asalto imposible corregido arriba.
- Un conflicto provocado en el mundo vivo (Jihak contra Heno, por tierras) sigue su curso solo:
  - año 163: se declara la guerra y los guerreros salen dos veces, pero ven las defensas de
    Heno y se retiran sin pelear;
  - año 165: Jihak hace las paces, con tregua;
  - año 170: las dos aldeas se alían.

### Pruebas

`test/guerra.test.ts` (8 pruebas):

- una disputa acaba en conflicto con su motivo;
- sin motivo no hay guerra;
- el combate depende de las fuerzas, las armas, las murallas y los aliados;
- los recursos, el botín, los heridos y los muertos cuadran;
- la derrota, el cansancio o la paz acaban el conflicto, y el comercio vuelve;
- alianza y reconciliación;
- guardar y cargar con incursiones en marcha;
- décadas sin valores imposibles, sin incursiones repetidas y sin guerras eternas.

### Pendiente

- Campañas largas, asedios y conquista.
- Guerra por mar.
- Coaliciones de varias aldeas.
- Tratados con condiciones (tributos, fronteras).
