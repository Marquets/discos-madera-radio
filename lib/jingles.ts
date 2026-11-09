// Cortinillas: paths of the files in public/cortinillas/, e.g. "/cortinillas/hola.mp3".
// They play in this order, starting over after the last one.
// While the list is empty the radio goes straight from song to song.
// All brought to the same loudness, the loudest one's (about -15.7 LUFS), with no peak over -1 dBFS
export const JINGLES: string[] = [
  "/cortinillas/cortinilla2.m4a",
  "/cortinillas/cortinilla1.m4a",
  "/cortinillas/cortinilla3.m4a",
  "/cortinillas/cortinilla4.m4a",
  "/cortinillas/cortinilla5.m4a",
  "/cortinillas/cortinilla6.m4a",
];

/** A jingle plays after every this many songs */
export const JINGLE_EVERY = 3;

/**
 * La cortinilla que presenta los mensajes del buzón de voz (MensajeBuzon.tsx), en antena y al
 * escucharlos desde la portada; null mientras no haya, y entonces suenan sin presentación.
 */
export const BUZON_INTRO: string | null = null;
