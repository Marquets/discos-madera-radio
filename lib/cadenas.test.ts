import { describe, expect, it } from "vitest";
import { abiertas, CADENAS, elegirCadena, hoyEnMadrid } from "./cadenas";

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

describe("abiertas", () => {
  const ids = (hoy: string, ver: boolean) => abiertas(CADENAS, hoy, ver).map((c) => c.id);

  it("opens Christmas only in its season, so out of it the switch stays hidden", () => {
    for (const hoy of ["12-01", "12-25", "01-06"]) expect(ids(hoy, false)).toEqual(["normal", "navidad"]);
    for (const hoy of ["11-30", "01-07", "07-15"]) expect(ids(hoy, false)).toEqual(["normal"]);
  });

  it("opens every channel with the preview cookie, without making Christmas the default", () => {
    expect(ids("11-05", true)).toEqual(["normal", "navidad"]);
    expect(elegirCadena(undefined, abiertas(CADENAS, "11-05", true), "11-05")).toBe("normal");
  });

  it("drops an old Christmas pick once the season is over", () => {
    expect(elegirCadena("navidad", abiertas(CADENAS, "02-01", false), "02-01")).toBe("normal");
  });
});

describe("hoyEnMadrid", () => {
  it("is the Spanish date, which is already the next day late on a UTC evening", () => {
    expect(hoyEnMadrid(new Date("2026-11-30T23:30:00Z"))).toBe("12-01");
  });
});
