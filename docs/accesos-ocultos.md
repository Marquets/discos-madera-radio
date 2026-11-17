# Chuleta: páginas y modos ocultos

Todo cuelga del dominio de la radio (en local, `http://127.0.0.1:3000`). Aquí no hay ninguna clave: las claves viven en las variables de Netlify (y en `.env.local` para local).

## Páginas con clave
| Dirección | Qué es | Cómo se entra |
|---|---|---|
| `/buzon` | Cola del buzón de voz: escuchar, aprobar y borrar audios | Clave `BUZON_CLAVE` |
| `/lo-mejor-2026/revisar` | Aprobar o borrar los top 10 que manda la gente | La misma `BUZON_CLAVE`; si ya entraste al buzón en ese navegador, ya estás dentro |

- La clave se queda guardada en el navegador. Para quitarla, pulsa "Salir" al final de cualquiera de las dos páginas.
- En `npm run dev` sin `BUZON_CLAVE` vale cualquier clave.
- Ninguna de las dos sale en buscadores (`noindex`).

## Páginas sin enlace en el menú
| Dirección | Cómo se llega normalmente |
|---|---|
| `/archivo` (y `/archivo?vista=mes` para la vista mensual) | "Ver el archivo →" en la portada |
| `/lo-mejor-2026` | La pegatina "Best of 2026!!" junto al logo |
| `/privacidad` | Enlace del pie |

## Trucos en la dirección (para probar)
Se añaden a cualquier página, por ejemplo `/?cortinilla`.

| Parámetro | Qué hace |
|---|---|
| `?cortinilla` | Al sintonizar suena una cortinilla en el momento, sin esperar |
| `?cortinilla=<animación>` | Igual, pero con esa animación del logo: `baile`, `ondas`, `cinta`, `neon`, `glitch`, `dibujo` o `dibus` |
| `?buzon` | Al sintonizar pone el último mensaje del buzón, como en antena |
| `?paseo=taxi` / `?paseo=caracol` / `?paseo=juntos` | Saca ese paseo por el hero en el momento |
| `?cadenas=ver` | Abre todas las cadenas fuera de temporada (p. ej. Navidad antes del 1 de diciembre). Se queda guardado un año en una cookie |
| `?cadenas=no` | Quita lo anterior |

Sin parámetro, el salvapantallas sale solo tras 30 s sin tocar nada.

## Para máquinas
- `GET /api/sync` con la cabecera `Authorization: Bearer <CRON_SECRET>` fuerza a leer la playlist (para un cron).
