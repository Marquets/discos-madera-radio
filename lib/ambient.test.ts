import { describe, expect, it } from "vitest";
import { MODES, degreeHz, touchDegree } from "./ambient";

describe("degreeHz", () => {
  it("tunes the key's root", () => {
    expect(degreeHz(9, MODES.Eólico, 0)).toBeCloseTo(220, 1);
  });

  it("carries on into the next octave", () => {
    expect(degreeHz(0, MODES.Pentatónica, 5)).toBeCloseTo(261.62, 1);
    expect(degreeHz(0, MODES.Dórico, 9)).toBeCloseTo(2 * degreeHz(0, MODES.Dórico, 2), 5);
  });
});

describe("touchDegree", () => {
  it("spans two octaves across the pad without running off either edge", () => {
    expect(touchDegree(0, 7)).toBe(0);
    expect(touchDegree(0.5, 7)).toBe(7);
    expect(touchDegree(1, 7)).toBe(13);
    expect(touchDegree(-0.1, 5)).toBe(0);
  });
});
