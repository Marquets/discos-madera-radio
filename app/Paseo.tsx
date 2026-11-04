"use client";

import { useEffect, useRef } from "react";


// Adri's snail: 14750 × 8934 in the drawing
const SNAIL = { width: 120, height: (120 * 8934) / 14750, speed: 26, stride: 1.8 };
const SAID_KEY = "caracol-burb"; // the day it last said "BURB" on its own

// The lady hailing a taxi: eleven frames of 186 × 300 side by side in public/dibus/taxi.webp.
// 0 to 7 are a walk cycle, two steps; 8 is her stopped with her hand up and legs crossed,
// just as Adri drew her; 9 the same with the arm back down; 10 sitting astride.
// Her speed matches her stride, so the standing foot doesn't skate.
const LADY = { width: (150 * 186) / 300, height: 150, speed: 37, step: 0.55, shout: 3.3 };
// Seconds into her stop when she shouts the second time: the first take lasts 0.96s,
// then a short breath
const SECOND_SHOUT = 1.35;
const FRAMES = 11;
const WALK = [0, 1, 2, 3, 4, 5, 6, 7];
const STILL = { "hand up": 8, "arm down": 9, astride: 10 };
const HIPS = { x: 0.316, up: 0.507 }; // where her hips are in a frame, from the left and the bottom
// Once she's shouted both times, the arm comes down
const ARM_DOWN_AT = SECOND_SHOUT + 0.9;

// Once a week the snail is her taxi: she hails it, it comes for her, says "BURB" and off
// they go with her riding on its shell
const TOGETHER_KEY = "paseo-juntos"; // the week they last went off together
const TOGETHER_ODDS = 1 / 3; // the chance any turn is it, until it's happened that week
const HURRY = 2.3; // the snail coming for her, faster than its usual crawl
// The top of its shell, where she sits: from the left of the snail facing left as drawn,
// and from the right once it has turned round
const SHELL = { x: 74, top: SNAIL.height * 0.85 };

const today = () => new Date().toDateString();
// Weeks counted from Monday, in the visitor's own time
const thisWeek = () => String(Math.floor((Date.now() / 86_400_000 - new Date().getTimezoneOffset() / 1440 + 3) / 7));

const remembered = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const remember = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {}
};

/**
 * Adri's characters taking turns along the bottom of the hero, never two at once: one crosses
 * each time a jingle ends, as long as the hero is in view:
 * - the snail crawls right to left in pushes, stretching as it surges. It says "BURB", in
 *   Adri's handwriting and a recorded voice, once a day on its own and whenever clicked.
 * - the lady walks left to right, stops halfway to raise her hand and shout "TAXI!" twice, in
 *   recorded voices and a speech bubble each time, and walks on. Click her and she stops
 *   to hail one there and then.
 *   Her frames swap like a gif: Adri's body and skirt over legs drawn to walk, the arm
 *   only coming out when she hails. All in one strip that slides along, as swapping
 *   images could blink her out for a moment.
 * - once a week, together: she hails, the snail comes for her and says "BURB", turns round
 *   the way she was going, she hops on astride its shell and off they go.
 * None of it on phones: Safari can take a sound from the page for another player and
 * pause the radio's YouTube video.
 */
export function Paseo() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const strip = ref.current;
    const snail = strip?.querySelector<HTMLElement>("[data-snail]");
    const lady = strip?.querySelector<HTMLElement>("[data-lady]");
    // Phones are a touch screen, or one as narrow as the mobile layout, as RadioPlayer tells them apart
    if (!strip || !snail || !lady || matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse), (max-width: 639px)").matches) return;

    let frame = 0;
    let walking = false;
    // Runs one crossing: step(dt, t) moves them and says whether they're still on their way
    const cross = (els: HTMLElement[], step: (dt: number, t: number) => boolean) => {
      for (const el of els) el.hidden = false;
      let then = performance.now();
      let t = 0;
      const tick = (now: number) => {
        // A hidden tab hands back a big gap; don't let it leap across the screen
        const dt = Math.min(now - then, 100) / 1000;
        then = now;
        t += dt;
        if (step(dt, t)) return (frame = requestAnimationFrame(tick));
        for (const el of els) el.hidden = true;
        walking = false;
      };
      frame = requestAnimationFrame(tick);
    };

    // A word from one of them, popping up from where they are
    const speak = (className: string, left: number, bottom: number) => {
      strip.querySelector(`.${className}`)?.remove();
      const word = document.createElement("div");
      word.className = className;
      word.style.left = `${left}px`;
      word.style.bottom = `${bottom}px`;
      word.addEventListener("animationend", () => word.remove());
      strip.append(word);
    };

    // At the radio's volume, and not at all with the radio muted
    const play = (sound: HTMLAudioElement) => {
      let volume = 100;
      try {
        volume = Number(localStorage.getItem("radio-volume") ?? 100) || 0;
      } catch {}
      if (document.documentElement.hasAttribute("data-silencio") || volume === 0) return;
      sound.volume = Math.min(1, volume / 100);
      sound.currentTime = 0;
      // Unprompted, before the visitor has touched the page, the browser may say no
      sound.play().catch(() => {});
    };

    let snailX = 0;
    const voice = new Audio("/dibus/burb.m4a");
    const burb = () => {
      play(voice);
      // Up and to the left of its head, where it is in the drawing
      speak("burb", snailX - 30, SNAIL.height - 8);
    };
    // 1 faces left as drawn, -1 the other way; in between, it's turning round
    let facing = 1;
    const showSnail = (stretch = 1) => {
      snail.style.transform = `translateX(${snailX}px) scale(${facing * stretch}, ${2 - stretch})`;
    };
    // A push of the foot: fast in the middle of each stride, nearly still between
    const crawl = (dt: number, t: number, speed = 1) => {
      const push = Math.sin((Math.PI * t) / SNAIL.stride) ** 2;
      snailX -= Math.sign(facing) * SNAIL.speed * speed * 2 * push * dt;
      showSnail(1 + 0.03 * push);
    };
    const crossSnail = () => {
      facing = 1;
      snailX = strip.clientWidth;
      // Where along this crossing it says "BURB" unprompted; null if it has today already
      let sayAt: number | null = remembered(SAID_KEY) === today() ? null : snailX * (0.3 + Math.random() * 0.4);
      cross([snail], (dt, t) => {
        crawl(dt, t);
        if (sayAt !== null && snailX < sayAt) {
          sayAt = null;
          burb();
          remember(SAID_KEY, today());
        }
        return snailX > -SNAIL.width * 1.2;
      });
    };

    const shouts = [new Audio("/dibus/taxi-1.m4a"), new Audio("/dibus/taxi-2.m4a")];
    let stopNow = false;
    const stopLady = () => (stopNow = true);
    const crossLady = () => {
      let x = -LADY.width;
      let shouted = 0;
      stopNow = false;
      const stopAt = strip.clientWidth * (0.4 + Math.random() * 0.25);
      // When her current stop began, null while she walks
      let stoppedAt: number | null = null;
      let stoppedHalfway = false;
      let walked = 0;
      cross([lady], (dt, t) => {
        if (stoppedAt !== null && t - stoppedAt >= LADY.shout) stoppedAt = null;
        // Halfway, and again wherever she's clicked, as long as she isn't stopped already
        if (stoppedAt === null && ((!stoppedHalfway && x >= stopAt) || stopNow)) {
          stoppedAt = t;
          stoppedHalfway = true;
          shouted = 0;
        }
        stopNow = false;
        const standing = stoppedAt !== null;
        if (stoppedAt !== null && shouted < 2 && t - stoppedAt >= [0, SECOND_SHOUT][shouted]) hail(x, shouted++);
        if (!standing) {
          x += LADY.speed * dt;
          walked += dt;
        }
        pose(x, 0, stoppedAt === null ? walked : t - stoppedAt < ARM_DOWN_AT ? "hand up" : "arm down");
        return x < strip.clientWidth + LADY.width * 0.2;
      });
    };

    // Twice, a bubble out of her raised hand each time, the second a little higher
    const hail = (x: number, take: number) => {
      play(shouts[take]);
      speak("grito", x + LADY.width * 0.7, LADY.height - 30 + take * 10);
    };
    // Where she is, and either how far she's walked or how she's keeping still
    const pose = (x: number, up: number, how: number | keyof typeof STILL) => {
      const walked = typeof how === "number" ? how : null;
      // Each step lifts her a little and sways her from one foot to the other
      const phase = (Math.PI * (walked ?? 0)) / LADY.step;
      const lift = walked === null ? 0 : Math.abs(Math.sin(phase)) * 3;
      const sway = walked === null ? 0 : Math.sin(phase) * 1.5;
      lady.style.transform = `translate(${x}px, ${-up - lift}px) rotate(${sway}deg)`;
      // The walk cycle spans two steps
      const n = walked === null ? STILL[how as keyof typeof STILL] : WALK[Math.floor((walked / (2 * LADY.step)) * WALK.length) % WALK.length];
      lady.style.setProperty("--frame", String(n / (FRAMES - 1)));
    };

    const crossTogether = () => {
      remember(TOGETHER_KEY, thisWeek());
      const width = strip.clientWidth;
      let x = -LADY.width;
      let walked = 0;
      facing = 1;
      snailX = width + SNAIL.width * 0.2;
      showSnail();
      // Turned round, its shell's top is this far from its left
      const shell = SNAIL.width - SHELL.x;
      // Sitting, her hips on the shell's top
      const seat = { x: () => snailX + shell - LADY.width * HIPS.x, up: SHELL.top - LADY.height * HIPS.up };
      // What's happened so far, by when it did
      let stoppedAt: number | null = null;
      let shouted = 0;
      let arrivedAt: number | null = null;
      let snailT = 0;
      cross([lady, snail], (dt, t) => {
        // She walks in and hails it
        if (stoppedAt === null) {
          x += LADY.speed * dt;
          walked += dt;
          pose(x, 0, walked);
          if (x >= width * 0.5) stoppedAt = t;
          return true;
        }
        if (shouted < 2 && t - stoppedAt >= [0, SECOND_SHOUT][shouted]) hail(x, shouted++);
        const waiting = t - stoppedAt < ARM_DOWN_AT ? "hand up" : "arm down";
        // It comes for her until, once turned round, its shell will be right under her, and
        // says so
        if (arrivedAt === null) {
          pose(x, 0, waiting);
          snailT += dt;
          crawl(dt, snailT, HURRY);
          const pickUp = x + LADY.width * HIPS.x - shell;
          if (snailX <= pickUp) {
            snailX = pickUp;
            arrivedAt = t;
            burb();
          }
          return true;
        }
        const since = t - arrivedAt;
        // Then turns round to face the way she was going
        if (since < 1.3) {
          facing = Math.cos(Math.PI * Math.min(1, Math.max(0, (since - 0.6) / 0.5)));
          showSnail();
          pose(x, 0, "arm down");
          return true;
        }
        facing = -1;
        // She hops up astride its shell
        if (since < 2) {
          const hop = (since - 1.3) / 0.7;
          pose(x + (seat.x() - x) * hop, seat.up * hop + Math.sin(Math.PI * hop) * 35, hop < 0.5 ? "arm down" : "astride");
          return true;
        }
        // And off they go together, the way she was walking
        snailT += dt;
        crawl(dt, snailT, 1.5);
        pose(seat.x(), seat.up, "astride");
        return snailX < width + SNAIL.width * 0.5;
      });
    };

    // Taking turns, starting with either. ?paseo=taxi, ?paseo=caracol or ?paseo=juntos in
    // the address sends that out straight away, to try it
    const tryOut = new URLSearchParams(location.search).get("paseo");
    let snailNext = tryOut ? tryOut === "caracol" : Math.random() < 0.5;
    const walk = (together: boolean) => {
      walking = true;
      if (together) return crossTogether();
      if (snailNext) crossSnail();
      else crossLady();
      snailNext = !snailNext;
    };

    let heroSeen = false;
    const inView = new IntersectionObserver(([e]) => (heroSeen = e.isIntersecting));
    inView.observe(strip);
    const afterJingle = () => {
      if (walking || !heroSeen || document.hidden) return;
      walk(remembered(TOGETHER_KEY) !== thisWeek() && Math.random() < TOGETHER_ODDS);
    };
    window.addEventListener("radio:cortinilla", afterJingle);
    const trying = tryOut ? setTimeout(() => walk(tryOut === "juntos"), 500) : undefined;

    snail.addEventListener("click", burb);
    lady.addEventListener("click", stopLady);
    return () => {
      clearTimeout(trying);
      window.removeEventListener("radio:cortinilla", afterJingle);
      inView.disconnect();
      cancelAnimationFrame(frame);
      snail.removeEventListener("click", burb);
      lady.removeEventListener("click", stopLady);
    };
  }, []);

  return (
    // Tall enough for the lady and what they say above them
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-64 overflow-hidden">
      <div data-snail hidden className="caracol pointer-events-auto absolute bottom-0 left-0 origin-bottom cursor-pointer" style={{ width: SNAIL.width, height: SNAIL.height }} />
      <div data-lady hidden className="taxi pointer-events-auto absolute bottom-0 left-0 origin-bottom cursor-pointer" style={{ width: LADY.width, height: LADY.height }} />
    </div>
  );
}
