# 📻 Discos Madera Radio

La música que vamos descubriendo, sonando como una radio en directo. La fuente es una playlist colaborativa de Spotify: cada canción que alguien añade entra en la radio y en el archivo semanal/mensual.

No necesita claves ni Premium: lee la playlist desde el reproductor incrustable público de Spotify y suena con ese mismo reproductor.

## Arrancar

1. `cp .env.example .env.local` y pon el id de la playlist.
2. `npm run dev` → http://127.0.0.1:3000

## Dónde se guardan las canciones

La radio recuerda todo lo que ha visto en la playlist, y eso hay que guardarlo en algún sitio:

- **En Netlify**: en Netlify Blobs (store `radio`, clave `db`). No hay que configurar nada, el contexto lo inyecta Netlify en las funciones. La primera vez que se despliega, el store está vacío y arranca desde el `data/db.json` del repo, así que el histórico no se pierde.
- **En local**: en `data/db.json`, porque fuera de Netlify no hay contexto de Blobs.

Ojo: en una función de Netlify el disco es de **solo lectura**, así que escribir en `data/db.json` allí falla con `EROFS`. Por eso el almacenamiento está detrás de `lib/db.ts` y no se escribe nunca en disco en producción.

## A tener en cuenta

- **100 canciones máximo**: el reproductor incrustable solo enseña las 100 primeras de la playlist. La radio guarda todo lo que ha visto, así que cuando la playlist se acerque a 100 puedes sacar las más antiguas sin perderlas.
- **Fecha = cuándo la vio la radio**, no cuándo se añadió (Spotify no la expone sin API). La portada vuelve a mirar la playlist si ha pasado más de 1 min. Para un cron: `GET /api/sync` con `Authorization: Bearer $CRON_SECRET`.
- **Previews de 30 s** para quien no tenga sesión de Spotify abierta en el navegador.
- **No oficial**: si Spotify cambia su reproductor incrustable, la lectura de la playlist puede romperse.

`npm test` ejecuta los tests.
