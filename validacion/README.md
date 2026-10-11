# Validación a largo plazo

Resultados de `tools/validar.ts` (mismas semillas, mismas condiciones iniciales y misma
medición). Se comparan década a década con `node tools/comparar.ts <semilla> validacion/antes validacion/solo-nan validacion/despues`.

| Carpeta | Código |
| --- | --- |
| `inicial/` | Primera validación (código `cb94fbb`, herramienta de medida anterior). |
| `antes/` | Código antiguo `cb94fbb`, sin corregir. |
| `solo-nan/` | Código antiguo con **solo** el arreglo mínimo del comercio (`sociedad.ts`, 3 líneas): aísla la causa del NaN. |
| `intermedio/` | Código nuevo antes de los arreglos de redondeo (solo semilla 37). |
| `despues/` | Código publicado. |

## Causa raíz del NaN (medida)

En `encuentros`, una boda podía mudar al único habitante de una aldea; después se llamaba a
`comerciar` con población 0 → `comidaTotal / 0` → `NaN`, que el filtro `pasa <= 0` dejaba
pasar y se escribía en la despensa. Desde ahí se contagió por el comercio a todas las aldeas.

| Semilla | Primer valor no finito (código antiguo) | Variante mínima |
| --- | --- | --- |
| 23 | día 15 277 (año 128), aldea Ulu, `comerciar` | 150 años sin ninguno |
| 37 | día 12 442 (año 104), aldea Ofi (0 hab.), `comerciar` | 150 años sin ninguno |
| 59 | día 14 152 (año 118), aldea Ñerok (0 hab.), `comerciar` | 150 años sin ninguno |

El código antiguo y la variante mínima son **idénticos década a década hasta el fallo**.
Desde ese momento, en el antiguo: todas las aldeas con cuentas rotas, adultos descansando
del 1–6 % al 90–97 %, reservas medias de 6,1 a 0, comida que entra de ~400 a ~2 por persona
y año, y salud a la baja. En la variante mínima nada de eso ocurre (descanso 1–4 %, casi
todo de mayores de 65 o con el granero lleno; reservas 6,1; salud 1). **El exceso de
descanso era un síntoma del NaN.**

## Código publicado (semillas 37 y 59, 150 años)

| | 37 antes | 37 después | 59 antes | 59 después |
| --- | --- | --- | --- | --- |
| Población final | 150 | 640 | 326 | 483 |
| Aldeas con cuentas rotas al final | 6 de 6 | 0 | 10 de 10 | 0 |
| Adultos descansando (peor década) | 97 % | 2 % | 91 % | 4 % |
| Salud media (peor década) | 0,93 | 0,98 | 0,92 | 0,97 |
| Mudanzas / vueltas a una aldea ya dejada | 1727 / 1464 | 420 / 189 | 161 / 15 | 307 / 67 |
| Anomalías / invariantes rotas al final | – / 47 | 0 / 0 | – / 66 | 0 / 0 |

## Pendiente (no compromete la integridad)

- Vueltas a la aldea de origen: bajan mucho, pero siguen (189 de 420 en la semilla 37).
- Opiniones: en aldeas pequeñas todos acaban opinando lo mismo (acuerdo al azar 0,8–0,9).
- Abundancia: nadie pasa hambre en estas semillas (reservas mínimas medias 6,0); la escasez
  apenas aparece y las despensas acumulan mucho (piedra, hueso, hierbas).
- Convergencia tecnológica: casi todas las aldeas acaban sabiendo casi todo.
