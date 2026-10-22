import { describe, expect, it } from "vitest";
import { nowPlaying } from "./schedule";

const epoch = 0;
const at = (sec: number) => sec * 1000;

describe("nowPlaying", () => {
  it("returns null for an empty radio", () => {
    expect(nowPlaying([], at(10), epoch)).toBeNull();
  });

  it("finds the song and offset inside the loop", () => {
    expect(nowPlaying([100, 200, 50], at(0), epoch)).toEqual({ index: 0, offsetSec: 0 });
    expect(nowPlaying([100, 200, 50], at(150), epoch)).toEqual({ index: 1, offsetSec: 50 });
    expect(nowPlaying([100, 200, 50], at(320), epoch)).toEqual({ index: 2, offsetSec: 20 });
  });

  it("wraps around after the last song", () => {
    expect(nowPlaying([100, 200, 50], at(350 * 3 + 120), epoch)).toEqual({ index: 1, offsetSec: 20 });
  });

  it("uses a fallback length for unknown durations", () => {
    expect(nowPlaying([undefined, 100], at(250), epoch)).toEqual({ index: 1, offsetSec: 10 });
  });
});
