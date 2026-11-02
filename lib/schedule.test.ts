import { describe, expect, it } from "vitest";
import { ENERGY, type Energy } from "./franjas";
import { nowPlaying, type ScheduleTrack } from "./schedule";

const DAY = 24 * 3600_000;
const ids = (e: Energy) => Object.keys(ENERGY).filter((id) => ENERGY[id] === e);
const OLD = "2025-01-01T00:00:00Z";
const song = (id: string, durationSec = 200, firstSeenAt = OLD): ScheduleTrack => ({ id, durationSec, firstSeenAt });
const tracks = [...ids("tranquila").slice(0, 8), ...ids("media").slice(0, 8), ...ids("animada").slice(0, 8)].map((id, i) => song(id, 150 + i * 10));

// 2026-06-10 00:00 in Spain (summer time, UTC+2)
const JUNE_10 = Date.UTC(2026, 5, 9, 22);

/** Walks from one instant to another song by song, as a listener who never stops would */
function walk(list: ScheduleTrack[], from: number, to: number) {
  const played: { index: number; at: number }[] = [];
  let t = from;
  const first = nowPlaying(list, t)!;
  t += (list[first.index].durationSec! - first.offsetSec) * 1000;
  while (t < to) {
    const np = nowPlaying(list, t)!;
    played.push({ index: np.index, at: t });
    t += (list[np.index].durationSec! - np.offsetSec) * 1000;
  }
  return played;
}

/** Hour of the day in Spain */
const hourInSpain = (ms: number) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", hour: "numeric", hourCycle: "h23" }).format(ms));

describe("nowPlaying", () => {
  it("returns null for an empty radio", () => {
    expect(nowPlaying([], JUNE_10)).toBeNull();
  });

  it("is the same for everyone at the same instant", () => {
    const at = JUNE_10 + 5 * 3600_000 + 12_345;
    expect(nowPlaying(tracks, at)).toEqual(nowPlaying([...tracks], at));
  });

  it("starts the next song right where the last one ends", () => {
    for (const { at } of walk(tracks, JUNE_10, JUNE_10 + DAY - 3600_000)) {
      expect(nowPlaying(tracks, at)!.offsetSec).toBe(0);
    }
  });

  it("plays each slot's songs in it", () => {
    const allowed: Record<number, Energy[]> = { 3: ["tranquila"], 10: ["tranquila", "media"], 22: ["media", "animada"] };
    for (const { index, at } of walk(tracks, JUNE_10, JUNE_10 + DAY - 3600_000)) {
      // A song belongs to the slot it starts in, even if it runs on into the next
      const hour = hourInSpain(at);
      const slot = hour < 8 ? 3 : hour < 13 ? 10 : hour >= 20 ? 22 : null;
      if (slot !== null) expect(allowed[slot]).toContain(ENERGY[tracks[index].id]);
    }
  });

  it("plays a song with no energy in every slot", () => {
    const withNew = [...tracks, song("sin-etiqueta", 180)];
    const hours = new Set(walk(withNew, JUNE_10, JUNE_10 + 7 * DAY).filter((p) => p.index === withNew.length - 1).map((p) => hourInSpain(p.at)));
    expect([...hours].some((h) => h < 8)).toBe(true);
    expect([...hours].some((h) => h >= 20)).toBe(true);
  });

  it("never repeats a song soon after it played", () => {
    const played = walk(tracks, JUNE_10, JUNE_10 + 3 * DAY);
    for (let i = 1; i < played.length; i++) expect(played[i].index).not.toBe(played[i - 1].index);
  });

  it("plays new songs more often than old ones", () => {
    const fresh = tracks.map((t, i) => (i === 12 || i === 13 ? { ...t, firstSeenAt: new Date(JUNE_10).toISOString() } : t));
    const played = walk(fresh, JUNE_10, JUNE_10 + 3 * DAY);
    const count = (i: number) => played.filter((p) => p.index === i).length;
    expect(count(12) + count(13)).toBeGreaterThan(count(10) + count(11));
  });

  it("keeps going across the change of clocks", () => {
    // Spain went back from summer time on 2026-10-25, a 25-hour day
    const oct25 = Date.UTC(2026, 9, 24, 22);
    const played = walk(tracks, oct25, oct25 + 2 * DAY);
    expect(played.length).toBeGreaterThan(500);
  });

  it("uses a fallback length for unknown durations", () => {
    expect(nowPlaying([{ id: "a" }, { id: "b" }], JUNE_10 + 1000)).not.toBeNull();
  });
});
