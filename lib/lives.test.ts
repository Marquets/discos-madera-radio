import { describe, expect, it } from "vitest";
import { isoSeconds } from "./lives";

describe("lives", () => {
  it("reads the Data API's durations", () => {
    expect(isoSeconds("PT1H2M3S")).toBe(3723);
    expect(isoSeconds("PT45M")).toBe(2700);
    expect(isoSeconds("PT59S")).toBe(59);
    expect(isoSeconds("P1DT2H")).toBe(93600);
    expect(isoSeconds("P0D")).toBe(0);
  });
});
