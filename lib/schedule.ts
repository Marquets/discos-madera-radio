export const RADIO_EPOCH = Date.UTC(2026, 0, 1);
// Used until a player reports the real YouTube length
const FALLBACK_DURATION_SEC = 240;

/** mulberry32: a seeded random, so every listener shuffles the same way */
function seededRandom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(n: number, seed: number) {
  const random = seededRandom(seed);
  const order = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** The order of one pass through the playlist, reshuffled on every pass */
function passOrder(n: number, pass: number) {
  const order = shuffle(n, pass);
  // Swapping the first two leaves the last in place, so the next pass can rely on it
  if (n > 2 && order[0] === shuffle(n, pass - 1).at(-1)) [order[0], order[1]] = [order[1], order[0]];
  return order;
}

/**
 * The radio plays the playlist forever starting at RADIO_EPOCH, each pass in a new
 * random order, so every listener computes the same song and second from the clock alone.
 */
export function nowPlaying(durations: (number | undefined)[], nowMs: number, epochMs = RADIO_EPOCH) {
  if (!durations.length) return null;
  const lens = durations.map((d) => d ?? FALLBACK_DURATION_SEC);
  const total = lens.reduce((a, b) => a + b, 0);
  const elapsed = (nowMs - epochMs) / 1000;
  const pass = Math.floor(elapsed / total);
  let t = elapsed - pass * total;
  for (const index of passOrder(lens.length, pass)) {
    if (t < lens[index]) return { index, offsetSec: t };
    t -= lens[index];
  }
  return { index: 0, offsetSec: 0 };
}
