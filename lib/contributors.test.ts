import { describe, expect, it } from "vitest";
import { recentContributors } from "./contributors";

describe("recentContributors", () => {
  it("names the newest adders once each, with the Spotify id for someone not listed", () => {
    const tracks = [{ addedBy: "nachosevillano" }, { addedBy: "sirmarcaca" }, {}, { addedBy: "alguien_nuevo" }, { addedBy: "sirmarcaca" }];
    expect(recentContributors(tracks)).toEqual(["Marco González Pérez", "alguien_nuevo", "Nacho Sevillano"]);
  });
});
