import { MAX_SEC, MAX_SUBIDA, REVISAR } from "@/lib/buzon-reglas";

// Solo lo nuevo de estas semanas; lo de siempre (los mensajes escritos, las cortinillas) no
const QUE = [
  { titulo: "Buzón de voz", texto: `Con el micro de abajo a la derecha grabas un mensaje de hasta ${MAX_SEC} segundos para la radio, o subes uno ya grabado de hasta ${MAX_SUBIDA}.${REVISAR ? " Lo escuchamos antes de publicarlo." : ""} Se borra a la semana.` },
  { titulo: "Escucha el buzón", texto: "Los cascos ponen los mensajes de la semana. Si la radio sonaba, se pausa y vuelve al terminar. Cada mensaje suena además una vez en antena, después de una cortinilla." },
  { titulo: "Pon un tema", texto: "Busca una canción y añádela a la playlist desde la web, con tu nombre si quieres. Entra en la radio enseguida." },
  { titulo: "¿Quién la trajo?", texto: "De vez en cuando se abre un ojo en el cabezal del magnetófono: pasa el ratón o tócalo y te dice quién subió la canción." },
  { titulo: "Suena según la hora", texto: "Cada franja del día pone las canciones que le van, y de noche entran las más tranquilas y de piano." },
  { titulo: "Salvapantallas", texto: "Si dejas la radio puesta sin tocar nada, a los 30 segundos la portada se queda en el logo, el magnetófono y el reproductor." },
];

/**
 * El botón "i" de la cabecera, a la derecha y a la altura del menú: cuenta lo que se puede hacer.
 * Es un popover del navegador, así que se abre, y se cierra con Esc o tocando fuera, sin nada de
 * JavaScript.
 */
export function Info() {
  return (
    <>
      <button
        popoverTarget="info-radio"
        aria-label="Qué se puede hacer aquí"
        title="Qué se puede hacer aquí"
        className="info-radio -m-2 grid size-10 place-items-center justify-self-end transition-colors hover:text-white"
      >
        {/* Un círculo fino alrededor; el botón es más grande que él para pulsarlo bien con el dedo */}
        <span aria-hidden className="grid size-6 place-items-center rounded-full border border-current">
          <svg viewBox="0 0 16 16" className="size-3" fill="currentColor">
            <circle cx="8" cy="3.5" r="1.6" />
            <path d="M5.5 6.5h3.5v6h1.5v1.5h-5v-1.5h1.5v-4.5h-1.5z" />
          </svg>
        </span>
      </button>
      <div
        id="info-radio"
        popover="auto"
        // El popover vive en la capa de arriba; se coloca a mano debajo del botón
        className="fixed inset-auto top-24 right-4 m-0 max-h-[calc(100svh-7rem)] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto bg-black p-5 text-left font-mono text-xs text-accent normal-case shadow-[0_0_0_2px_var(--color-accent)] backdrop:bg-black/40 sm:right-8"
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 className="font-display text-2xl uppercase leading-none">Lo nuevo</h2>
          <button popoverTarget="info-radio" popoverTargetAction="hide" aria-label="Cerrar" className="text-base leading-none hover:text-white">
            ×
          </button>
        </div>
        <dl className="flex flex-col gap-3">
          {QUE.map((q) => (
            <div key={q.titulo}>
              <dt className="font-bold uppercase">{q.titulo}</dt>
              <dd className="mt-0.5 leading-relaxed">{q.texto}</dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  );
}
