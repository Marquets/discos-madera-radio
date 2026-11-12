// Las reglas del buzón que también necesita el navegador; aparte de buzon.ts, que lleva el almacén

export const MAX_SEC = 30;
/** Un audio ya grabado que se sube puede durar más: suele venir preparado */
export const MAX_SUBIDA = 60;
/**
 * Si los mensajes esperan a que alguien los apruebe en /buzon antes de sonar. Con false entran
 * directos, y /buzon sirve para escucharlos y borrar el que sobre.
 */
export const REVISAR = false;
/** Sin revisión, el buzón deja de aceptar con tantos mensajes en la semana */
export const MAX_SEMANA = 60;

// Los sonidos de contestador, que hace scripts/buzon-sonidos.mjs: un pitido antes de cada mensaje
// y una voz que dice cuántos hay, con un archivo por número hasta MAX_SEMANA
export const PITIDO = "/buzon/pitido.m4a";
export const tienes = (n: number) => `/buzon/tienes-${Math.max(1, Math.min(n, MAX_SEMANA))}.m4a`;
