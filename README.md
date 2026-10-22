# 📻 Discos Madera Radio

La música que vamos descubriendo, sonando como una radio en directo. La fuente es una playlist colaborativa de Spotify: cada canción que alguien añade entra en la radio y en el archivo semanal/mensual.

No necesita claves ni Premium: lee la playlist desde el reproductor incrustable público de Spotify y suena con ese mismo reproductor.

## Arrancar

1. `cp .env.example .env.local` y pon el id de la playlist.
2. `npm run dev` → http://127.0.0.1:3000

## A tener en cuenta

- **100 canciones máximo**: el reproductor incrustable solo enseña las 100 primeras de la playlist. La radio guarda todo lo que ha visto, así que cuando la playlist se acerque a 100 puedes sacar las más antiguas sin perderlas.
- **Fecha = cuándo la vio la radio**, no cuándo se añadió (Spotify no la expone sin API). La portada vuelve a mirar la playlist si ha pasado más de 1 min. Para un cron: `GET /api/sync` con `Authorization: Bearer $CRON_SECRET`.
- **Previews de 30 s** para quien no tenga sesión de Spotify abierta en el navegador.
- **No oficial**: si Spotify cambia su reproductor incrustable, la lectura de la playlist puede romperse.

Los datos se guardan en `data/db.json` (solo vale en local; para desplegar hay que pasar a una base de datos real).

`npm test` ejecuta los tests.
