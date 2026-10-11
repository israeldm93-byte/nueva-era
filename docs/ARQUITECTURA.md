# Arquitectura evolutiva: hacia una civilización autónoma

Plan para que Nueva Era genere historias propias sin intervención, apoyado en lo que
ya existe (ver [AUDITORIA.md](AUDITORIA.md)). Principio: **pocos sistemas nuevos, bien
conectados**, cada uno en su módulo y con datos acotados.

## 1. Cuatro niveles conectados

```
 individuo  ──forma──▶  familia / red social  ──forma──▶  aldea  ──forma──▶  mundo
    ▲  rasgos, necesidades,      lazos, reputación,        economía, consejo,      relaciones, comercio,
    │  metas, recuerdos,         parentesco                cultura, edad           migraciones, guerras
    └──────────── las oportunidades y sucesos de cada nivel cambian las decisiones del de abajo ◀───────
```

- El **individuo** decide a dos plazos:
  - **Inmediato**, cada día: qué trabajo hacer. Es el sistema actual de utilidad más red
    neuronal, que se conserva y al que la meta y la personalidad dan un sesgo.
  - **Medio y largo plazo**: una **meta**, revisada de forma escalonada (cada persona cada
    10 días) o cuando ocurre algo importante.
- **Red social dispersa**: cada persona guarda como mucho 10 **lazos** (afecto o rencor
  hacia alguien concreto), que nacen de hechos: enseñar, compartir ideas, casarse, rivalizar
  por el consejo, defender juntos la aldea. Los lazos deciden con quién se habla (y, por
  tanto, de quién se aprende), a quién se apoya en el consejo, a quién se sigue al irse y
  adónde se emigra.
- **Recuerdos**: como mucho 8 por persona, ponderados por importancia y antigüedad
  (hambre, ataques, muertes de seres queridos, agravios de otra aldea, migraciones). Pesan en
  las opiniones, en las metas (irse, vengarse) y en la prudencia.
- **Aldea**: su economía, consejo y cultura se calculan a partir de su gente y de su
  memoria colectiva (lo que les pasó), no de etiquetas.

## 2. Módulos nuevos (y qué tocan)

| Módulo | Responsabilidad | Usa / modifica |
| --- | --- | --- |
| `individuo.ts` | Rasgos (con herencia), necesidades calculadas, **metas** y su revisión, sesgo de las metas sobre el trabajo diario, oficio y pericia. | `economia.elegirActividad` (sesgo), `mundo.nuevaPersona` (rasgos). |
| `memoria.ts` | Recuerdos acotados, **lazos** sociales, fama y **biografía** (hitos de la vida). | `sociedad.conversar`, `politica.asaltar`, `simulacion.sepultar`, `saber.descubrir`. |
| `migracion.ts` | Mudanzas de familias a otra aldea conocida por oportunidades, parentesco, seguridad o huida; consecuencias en origen y destino. | `sociedad`, crónica. |
| (más adelante) `comercio.ts` | Rutas y comerciantes con memoria y riesgo; especialización por excedentes. | `economia`, `politica`. |
| (más adelante) `gobierno.ts` | Instituciones (cabecilla, consejo de ancianos, asamblea, linaje), legitimidad y sucesión. | `politica.noche`. |
| (más adelante) `cultura.ts` | Valores colectivos que nacen de la memoria compartida (hambrunas, guerras, comercio) y se transmiten o se pierden. | `politica`, `economia`. |
| (más adelante) `sucesos.ts` | Sucesos con causa, actores y consecuencias enlazados; la crónica se escribe a partir de ellos. | `cronica`. |

Los sistemas existentes (saberes, lengua, fauna, mapa, 3D) se mantienen; se conectan a
lo nuevo por funciones pequeñas.

## 3. Datos y persistencia

- **Versión de estado 5**. La migración da a cada persona viva los rasgos nuevos (con
  azar sembrado, así que es reproducible), una meta vacía, sin recuerdos ni lazos, y una
  biografía que empieza en su nacimiento.
- Por persona, siempre acotado:
  - `genes`: 5 rasgos más (ambición, prudencia, generosidad, lealtad, paciencia),
    heredables como los demás.
  - `meta`: tipo, desde cuándo, motivo legible y referencia (saber, aldea o persona).
  - `recuerdos`: 8 como máximo, en forma de tuplas `[día, tipo, referencia, peso]`.
  - `lazos`: 10 como máximo, como pares `[id, valor]`. Al morir alguien, se borra de las
    listas de los demás de forma perezosa.
  - `vida`: hasta 16 hitos (se conservan los 4 primeros y los 12 últimos).
  - `practica`: días de práctica por oficio, que se olvida poco a poco.
- Crecimiento esperado del guardado: unos 400 bytes por persona viva. Los muertos no
  guardan nada más que su tumba.

## 4. Coste computacional

- Las metas se revisan de forma escalonada: en cada día, solo las personas cuyo
  `id % 10` coincide con `día % 10`.
- Los lazos y recuerdos se actualizan solo cuando ocurre algo (por eventos), sin bucles
  sobre todos los pares de personas.
- Las migraciones se evalúan solo para quien tiene la meta de irse.
- La búsqueda de casillas de trabajo (27 % de la CPU) se podrá agregar por aldea y día en
  el bloque de optimización.

## 5. Hoja de ruta

Estado: ✅ hecho y verificado · 🟡 parcial · ⏳ pendiente.

| # | Bloque | Estado |
| --- | --- | --- |
| 1 | Individuo: rasgos, necesidades, metas, oficio y pericia | ✅ |
| 2 | Memoria, lazos, reputación y biografía | ✅ |
| 3 | Migración de familias entre aldeas con causas | 🟡 funciona y está probada; en el mundo vivo aún es rara (las aldeas quedan lejos) |
| 4 | Economía de aldea: especialización, uso de excedentes y escasez de verdad | ⏳ |
| 5 | Comercio con rutas y comerciantes; diplomacia (tributos, pactos, embargos) | ⏳ |
| 6 | Gobierno: tipos de institución, legitimidad, sucesión y golpes | ⏳ |
| 7 | Cultura emergente desde la memoria colectiva | ⏳ |
| 8 | Sucesos con cadena causal y crónica narrativa; vista de acontecimientos destacados | ⏳ |
| 9 | Optimización: búsqueda de casillas agregada, caché de técnicas aprendibles | 🟡 búsqueda agregada hecha; caché de técnicas pendiente |
| 10 | Interfaz: biografía, personalidad, metas y lazos en Gente; comparativas en Gráficas | 🟡 ficha de persona hecha; gráficas sociales y árbol de parentesco pendientes |

## 6. Criterios de aceptación (pruebas)

- **Autonomía individual**: en las mismas condiciones, los curiosos experimentan más que los
  prudentes. Las metas cambian con las circunstancias: con hambre y hacinamiento aparecen
  «irse» o «fundar»; en la abundancia, «aprender», «prosperar» o «formar familia».
- **Consecuencias**: una migración cambia la población de origen y de destino, y se lleva
  saberes. La muerte en un asalto deja recuerdos de agravio que pesan en la opinión.
- **Reproducibilidad**: misma semilla, misma historia. Con semillas distintas, historias
  distintas.
- **Estabilidad**: sin recursos negativos ni ids duplicados; nadie vive en una aldea
  inexistente; memorias y lazos dentro de su tamaño máximo.
- **Rendimiento**: `tools/medir.ts` antes y después; el coste por persona-día no debe
  dispararse.

## 7. Estado actual

### Hecho y verificado (bloques 1–3, versión de estado 5)

- **Rasgos nuevos heredables** (ambición, prudencia, generosidad, lealtad, paciencia), con
  mutación. La variación se mantiene entre generaciones: la herencia es la media de los
  padres más ruido, y hay migración desde la versión 4.
- **Sesgo del carácter y de la meta en el trabajo diario.** La red neuronal sigue
  mandando; el sesgo es un ±10–50 %. Ejemplos: el prudente caza la mitad cuando rondan
  fieras; quien sobrevivió a los lobos, menos aún; el paciente aguanta en el campo.
- **Metas** que nacen de necesidades calculadas (hambre, seguridad, vivienda, pertenencia,
  reconocimiento, hacinamiento): sobrevivir, aprender un saber concreto de alguien que lo
  sabe, hacerse con un oficio, formar familia, hacerse un nombre, irse a otra aldea, fundar
  un pueblo, vengarse de una aldea y hacer las paces. Se revisan de forma escalonada y con
  histéresis, y cada una lleva un **motivo** legible sacado de los datos. Efectos reales:
  - con quién se habla y qué se enseña;
  - la probabilidad de emparejarse;
  - quién encabeza una división y a quién se lleva;
  - las opiniones y la decisión de asaltar.
- **Recuerdos** (como mucho 8, ponderados por importancia y antigüedad): hambre, asaltos,
  fieras, duelo, agravio de una aldea concreta, mudanzas. Pesan en las opiniones, las metas
  y el sesgo.
- **Lazos** (como mucho 10, con saturación y enfriamiento): nacen al enseñar, compartir
  ideas, convencer, casarse, defender juntos la aldea y quedarse fuera del consejo por otro.
  También al discutir quienes piensan distinto, que es de donde salen los rivales. Pesan en
  la persuasión, la enseñanza, las parejas, quién sigue a quién y el destino de una mudanza.
- **Fama**: descubrir, fundar, defender, encabezar una facción o ganar un asalto. Pesa en el
  respeto y, por tanto, en el consejo.
- **Oficio y pericia**: la práctica da hasta un 30 % más de rendimiento y se olvida poco a
  poco. Inventor solo es quien ha descubierto algo de verdad.
- **Biografía** (16 hitos: los 4 primeros y los 12 últimos) en la ficha de cada persona,
  junto a su meta y su motivo, sus recuerdos y su gente.
- **Mudanzas de familias** a otra aldea conocida y alcanzable, cuando es claramente mejor
  (comida, casas, seguridad, parientes o amigos allí). Viajan andando, se llevan sus saberes
  y la aldea de origen puede perderlos. La crónica lo cuenta con el motivo.
- **Rendimiento**: la búsqueda de casillas de trabajo se hace una vez por aldea, oficio y
  día. El coste bajó de unos 92 µs a unos **52 µs por persona-día**. En el mundo vivo con
  unas 160 personas, de 15 a 7,6 ms por día simulado. El guardado crece unos 0,3 KB por
  persona.
- **Pruebas** (`test/vida.test.ts`, 6 pruebas nuevas; 17 en total, todas en verde):
  - el carácter cambia las decisiones;
  - las metas cambian con las circunstancias (con hambre, sobrevivir; con abundancia,
    variadas);
  - quien no cabe y pasa hambre elige irse a una aldea mejor conocida, y origen y destino
    cambian;
  - la muerte en un asalto deja agravio y lleva a la venganza;
  - tras 60 años, memorias y lazos acotados, ningún recurso negativo, ningún id repetido y
    nadie en una aldea inexistente;
  - un mundo de la versión 4 migra bien.

### Limitaciones conocidas

- Las mudanzas son raras en el mundo vivo: las aldeas nacidas de cismas quedan a 40–90
  casillas y apenas tienen trato. Aparecerán más con el comercio (bloque 5).
- Los oficios dan pericia pero no productos distintos: no hay todavía artesanía, ni
  intercambio entre especialistas (bloque 4).
- El gobierno sigue siendo el consejo de los más respetados; la legitimidad y la sucesión
  están pendientes (bloque 6).
- Las familias que se mudan usan en 3D el mismo dibujo que las caravanas (columna por la
  puerta); no se ha comprobado visualmente.

### Estabilidad e integridad (versión publicada)

- **Causa raíz del NaN** corregida en `comerciar`/`encuentros` (aldea vaciada por una boda).
  Ver [validacion/README.md](../validacion/README.md): el exceso de descanso y el hundimiento
  de la economía de las semillas 23, 37 y 59 eran consecuencia de ese NaN.
- **Escrituras validadas**: toda escritura en una despensa pasa por `apuntar` (rechaza y
  registra cuentas rotas; solo un negativo de redondeo se da por cero). `comprobar`
  (`src/invariantes.ts`) verifica el mundo en pruebas y al cargar.
- **Reparación de guardados** (`reparar` en `src/migrar.ts`): cada arreglo queda en
  `m.reparaciones` con ruta, valor anterior, valor nuevo, criterio y si era recuperable. Lo
  perdido de una persona se estima con su aldea o sus padres; lo almacenado perdido se da
  por vacío; en una mente solo se anulan los pesos rotos. Si al cargar se repara algo, el
  estado original se guarda como `antes-de-reparar-<día>.json` en la rama `estado`.
- **Redondeos corregidos** (pasos pequeños que se perdían con centésimas): animales de
  corrales y gallineros ahora enteros con la cría en camino acumulada sin redondear (dos
  vacas sin granja no llegaban nunca a tres); amenaza de la aldea (se quedaba en 0,5 para
  siempre); afinidad entre aldeas; lazos fuertes; medias de recompensa y de lo que rinde
  cada trabajo; avance de las obras; práctica que no llegaba a olvidarse.
- **Remedios**: cada enfermo curado gasta una dosis de hierbas; sin hierbas, no hay remedio.
- Pruebas: `test/estabilidad.test.ts` (con `LARGO=1`, las semillas 23, 37 y 59 más allá de
  su día de fallo) y `test/limites.test.ts` (casos límite y cada redondeo corregido).

### Viajes entre aldeas lejanas (`src/viajes.ts`)

Las aldeas nacidas de un cisma suelen quedar a 60–100 casillas, fuera del alcance de los
encuentros de siempre (unas 18–30). Para que no queden incomunicadas para siempre:

- **Quién y cuándo**: cada día, desde una aldea con al menos 6 adultos y comida para 60
  días o más, puede salir un adulto (18–55 años, sano y bien comido) hacia una aldea
  emparentada (madre o hija) o ya visitada, a entre 24 y 150 casillas y sin enemistad
  grave. Como mucho un viaje cada tres años en las mejores condiciones, y menos cuanto
  más lejos (×50/distancia). Nunca en invierno. Va con más probabilidad quien tiene allí
  familia, y el curioso o el ambicioso.
- **Coste**: a pie, 1,5 casillas al día (a caballo, 3); ida, 5 días de estancia y vuelta.
  Mientras tanto no trabaja para su aldea.
- **Estancia**: dos charlas al día con gente de allí (mejor sus parientes o amigos), con
  las mismas reglas que las visitas entre vecinos: palabras, saberes, ideas, lazos,
  persuasión y bodas. Lo que enseña se queda allí; lo que aprende lo lleva «en la
  mochila» y no llega a su aldea hasta que vuelve. Lleva y trae un poco de lo que a la
  otra aldea le falta.
- **Consecuencias**: el contacto queda registrado (y con él, la posibilidad de mudarse
  allí aunque esté a más de 70 casillas, pagando la distancia); la relación entre las
  aldeas mejora si se llevaron bien y empeora si hubo roces; una boda hace que uno de los
  dos se mude andando.
- Pruebas: `test/convivencia.test.ts`.
