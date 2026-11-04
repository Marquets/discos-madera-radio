import { describe, expect, it } from "vitest";
import { CADENAS, elegirCadena, hoyEnMadrid } from "./cadenas";

describe("elegirCadena", () => {
  it("keeps the channel the visitor picked", () => {
    expect(elegirCadena("normal", CADENAS, "12-15")).toBe("normal");
    expect(elegirCadena("navidad", CADENAS, "07-15")).toBe("navidad");
  });

  it("plays Christmas by default in its season, round New Year too", () => {
    for (const hoy of ["12-01", "12-25", "01-01", "01-06"]) expect(elegirCadena(undefined, CADENAS, hoy)).toBe("navidad");
    for (const hoy of ["11-30", "01-07", "07-15"]) expect(elegirCadena(undefined, CADENAS, hoy)).toBe("normal");
  });

  it("ignores a pick that isn't on air any more", () => {
    const soloNormal = CADENAS.filter((c) => c.id === "normal");
    expect(elegirCadena("navidad", soloNormal, "12-25")).toBe("normal");
    expect(elegirCadena("borrada", CADENAS, "07-15")).toBe("normal");
  });
});

describe("hoyEnMadrid", () => {
  it("is the Spanish date, which is already the next day late on a UTC evening", () => {
    expect(hoyEnMadrid(new Date("2026-11-30T23:30:00Z"))).toBe("12-01");
  });
});
