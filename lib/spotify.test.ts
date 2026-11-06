import { describe, expect, it } from "vitest";
import { trackIdFrom } from "./spotify";

describe("trackIdFrom", () => {
  it("finds the song in a pasted link or URI, and nothing in plain words", () => {
    expect(trackIdFrom("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=abc")).toBe("4uLU6hMCjMI75M1A2tKUQC");
    expect(trackIdFrom("https://open.spotify.com/intl-es/track/4uLU6hMCjMI75M1A2tKUQC")).toBe("4uLU6hMCjMI75M1A2tKUQC");
    expect(trackIdFrom("spotify:track:4uLU6hMCjMI75M1A2tKUQC")).toBe("4uLU6hMCjMI75M1A2tKUQC");
    expect(trackIdFrom("the beatles yesterday")).toBeUndefined();
  });
});
