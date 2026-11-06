import { describe, expect, it } from "vitest";
import { quienLoTrajo, recentContributors } from "./contributors";

describe("recentContributors", () => {
  it("names the newest adders once each, with the Spotify id for someone not listed", () => {
    const tracks = [{ addedBy: "nachosevillano" }, { addedBy: "sirmarcaca" }, {}, { addedBy: "alguien_nuevo" }, { addedBy: "sirmarcaca" }];
    expect(recentContributors(tracks)).toEqual(["Marco González Pérez", "alguien_nuevo", "Nacho Sevillano"]);
  });
});

describe("quienLoTrajo", () => {
  it("prefers whoever picked it in /pon-un-tema over the Spotify account that added it", () => {
    expect(quienLoTrajo({ addedBy: "sirmarcaca", cortesia: "Babi Bensusan" })).toBe("Babi Bensusan");
    expect(quienLoTrajo({ addedBy: "sirmarcaca" })).toBe("Marco González Pérez");
    expect(quienLoTrajo({})).toBeUndefined();
    expect(quienLoTrajo({ addedBy: "sirmarcaca", cortesia: "" })).toBe("");
  });
});
