export const RADIO_EPOCH = Date.UTC(2026, 0, 1);
// Used until a player reports the real YouTube length
const FALLBACK_DURATION_SEC = 240;

/**
 * The radio loops the playlist forever starting at RADIO_EPOCH, so every listener
 * computes the same song and second from the clock alone.
 */
export function nowPlaying(durations: (number | undefined)[], nowMs: number, epochMs = RADIO_EPOCH) {
  if (!durations.length) return null;
  const lens = durations.map((d) => d ?? FALLBACK_DURATION_SEC);
  const total = lens.reduce((a, b) => a + b, 0);
  let t = (((nowMs - epochMs) / 1000) % total + total) % total;
  for (let index = 0; index < lens.length; index++) {
    if (t < lens[index]) return { index, offsetSec: t };
    t -= lens[index];
  }
  return { index: 0, offsetSec: 0 };
}
