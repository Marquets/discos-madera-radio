import { describe, expect, it } from "vitest";
import { nowPlaying } from "./schedule";

const epoch = 0;
const at = (sec: number) => sec * 1000;
const lens = [100, 200, 50, 120, 90];
const total = 560;

/** Walks one pass song by song and returns the order it played them in */
function playedInPass(pass: number, durations: (number | undefined)[] = lens, length = total) {
  const order: number[] = [];
  for (let t = pass * length; t < (pass + 1) * length; ) {
    const np = nowPlaying(durations, at(t), epoch)!;
    expect(np.offsetSec).toBe(0);
    order.push(np.index);
    t += durations[np.index] ?? 240;
  }
  return order;
}

describe("nowPlaying", () => {
  it("returns null for an empty radio", () => {
    expect(nowPlaying([], at(10), epoch)).toBeNull();
  });

  it("plays every song exactly once per pass", () => {
    for (const pass of [0, 1, 7, 1000]) {
      expect(playedInPass(pass).toSorted()).toEqual([0, 1, 2, 3, 4]);
    }
  });

  it("reports the offset inside the current song", () => {
    const [first] = playedInPass(3);
    expect(nowPlaying(lens, at(3 * total + 30), epoch)).toEqual({ index: first, offsetSec: 30 });
  });

  it("shuffles each pass differently", () => {
    const orders = new Set([0, 1, 2, 3, 4, 5].map((p) => playedInPass(p).join()));
    expect(orders.size).toBeGreaterThan(1);
  });

  it("never plays the same song twice in a row across passes", () => {
    for (let pass = 0; pass < 200; pass++) {
      expect(playedInPass(pass + 1)[0]).not.toBe(playedInPass(pass).at(-1));
    }
  });

  it("uses a fallback length for unknown durations", () => {
    expect(playedInPass(0, [undefined, 100], 340).toSorted()).toEqual([0, 1]);
  });
});
