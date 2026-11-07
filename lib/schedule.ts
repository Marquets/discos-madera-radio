import { ENERGY, NOCTURNA_BOOST, SLOTS, type Energy } from "./franjas";

// Used until a player reports the real YouTube length
const FALLBACK_DURATION_SEC = 240;
const DAY_MS = 24 * 60 * 60 * 1000;
// A brand-new song is this many times likelier to come up, fading to normal over NEW_FOR_DAYS
const NEW_BOOST = 2;
const NEW_FOR_DAYS = 30;
// A song can't come back until this share of the songs it competes with have played, so a
// boosted one doesn't come round again within the hour; always leaves at least one to pick
const REPEAT_SHARE = 0.75;

export type ScheduleTrack = { id: string; durationSec?: number; firstSeenAt?: string; energy?: Energy | null; nocturna?: boolean };

/** mulberry32: a seeded random, so every listener draws the same songs */
function seededRandom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The slots follow Spain's clock, summer time included, wherever the listener is
const madrid = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Madrid",
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

/** How far ahead of UTC Spain is at that instant, in ms */
function madridOffset(utcMs: number) {
  const p = Object.fromEntries(madrid.formatToParts(utcMs).map(({ type, value }) => [type, Number(value)]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(utcMs / 1000) * 1000;
}

/** The UTC instant of an hour on a Spanish calendar day; twice round, since the offset can change that day */
function madridHour(dayUtc: number, hour: number) {
  const wall = dayUtc + hour * 3600_000;
  const guess = wall - madridOffset(wall);
  return wall - madridOffset(guess);
}

type Slot = { start: number; end: number; pool: number[]; nocturnas: boolean };
type Play = { index: number; start: number; end: number };

/**
 * One Spanish day of radio: each slot draws from the songs that suit it, the newer ones more
 * often. Weights are fixed at midnight so they hold still all day; every song that starts
 * before a slot ends belongs to it, so the next slot begins when that song finishes.
 */
function daySchedule(tracks: ScheduleTrack[], dayUtc: number): Play[] {
  const dayStart = madridHour(dayUtc, 0);
  const lens = tracks.map((t) => t.durationSec ?? FALLBACK_DURATION_SEC);
  const weights = tracks.map((t) => {
    const ageDays = t.firstSeenAt ? (dayStart - Date.parse(t.firstSeenAt)) / DAY_MS : Infinity;
    return 1 + (NEW_BOOST - 1) * Math.max(0, Math.min(1, 1 - ageDays / NEW_FOR_DAYS));
  });
  const slots: Slot[] = SLOTS.map((s, i) => {
    const fits = (e: Energy | undefined) => !e || s.plays.includes(e);
    const pool = tracks.flatMap((t, index) => (fits(ENERGY[t.id] ?? t.energy ?? undefined) || (s.nocturnas && t.nocturna) ? [index] : []));
    return {
      start: madridHour(dayUtc, s.from),
      end: madridHour(dayUtc, SLOTS[i + 1]?.from ?? 24),
      // A slot nothing suits plays everything rather than going silent
      pool: pool.length ? pool : tracks.map((_, index) => index),
      nocturnas: !!s.nocturnas,
    };
  });

  // A song joins the draw from the moment the radio saw it, never earlier: adding one then
  // leaves the day so far exactly as it was, so a listener who picks up the new list doesn't
  // land on a reshuffled day that has forgotten what they just heard
  const since = tracks.map((t) => (t.firstSeenAt ? Date.parse(t.firstSeenAt) : -Infinity));

  const random = seededRandom(dayUtc / DAY_MS);
  const recent: number[] = [];
  const plays: Play[] = [];
  let t = dayStart;
  for (const slot of slots) {
    while (t < slot.end) {
      const joined = slot.pool.filter((i) => since[i] <= t);
      // A radio whose songs all arrived later today still has to play something
      const pool = joined.length ? joined : slot.pool;
      const gap = Math.min(Math.floor(pool.length * REPEAT_SHARE), pool.length - 1);
      const blocked = gap > 0 ? recent.slice(-gap) : [];
      const candidates = pool.filter((i) => !blocked.includes(i));
      const weight = (i: number) => weights[i] * (slot.nocturnas && tracks[i].nocturna ? NOCTURNA_BOOST : 1);
      let r = random() * candidates.reduce((sum, i) => sum + weight(i), 0);
      const index = candidates.find((i) => (r -= weight(i)) < 0) ?? candidates.at(-1)!;
      plays.push({ index, start: t, end: t + lens[index] * 1000 });
      recent.push(index);
      t += lens[index] * 1000;
    }
  }
  return plays;
}

// The tape deck asks every frame, so keep the day it last worked out
let cached: { key: string; plays: Play[] } | undefined;

/**
 * Every listener computes the same song and second from the clock alone: each Spanish day is
 * drawn from a seed that is the date, so nobody has to tell anyone what is on.
 */
export function nowPlaying(tracks: ScheduleTrack[], nowMs: number) {
  if (!tracks.length) return null;
  const local = nowMs + madridOffset(nowMs);
  // Midnight on today's Spanish date, as if Spain were UTC; the day's first song starts then,
  // cutting short whatever yesterday was still playing
  const dayUtc = local - (((local % DAY_MS) + DAY_MS) % DAY_MS);
  const key = `${dayUtc}|${tracks.map((t) => `${t.id}:${t.durationSec}:${t.firstSeenAt}:${t.energy}:${t.nocturna}`).join()}`;
  if (cached?.key !== key) cached = { key, plays: daySchedule(tracks, dayUtc) };
  const play = cached.plays.find((p) => p.start <= nowMs && nowMs < p.end);
  if (play) return { index: play.index, offsetSec: (nowMs - play.start) / 1000 };
  return { index: 0, offsetSec: 0 };
}
