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
