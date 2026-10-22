/** Pure helpers for trains_fly (F11): two trains closing in, a fly bouncing between them. */

export interface TrainsLike {
  distanceKm: number;
  trainSpeed: number;
  flySpeed: number;
}

/** Hours until two trains `distance` apart, each at `speed`, meet: distance / (2 · speed). */
export function meetingTime(distance: number, speed: number): number {
  return distance / (2 * speed);
}

/** The short way: the fly flies the whole time. */
export function flyTotal(c: TrainsLike): number {
  return c.flySpeed * meetingTime(c.distanceKm, c.trainSpeed);
}

export interface FlyLeg {
  /** Train the fly leaves: A starts on the left. */
  from: "A" | "B";
  start: number;
  end: number;
  /** km flown on this leg. */
  km: number;
}

/**
 * The first `n` legs of the long way (each a fixed fraction (f − v)/(f + v) of the one before):
 * 100 km, 50 & 75 km/h → 60, 12, 2.4, 0.48, … km, adding up to 75.
 */
export function flyLegs(n: number, c: TrainsLike): FlyLeg[] {
  const { distanceKm: d, trainSpeed: v, flySpeed: f } = c;
  const legs: FlyLeg[] = [];
  let t = 0;
  let gap = d;
  for (let i = 0; i < n && gap > 1e-12; i++) {
    const dt = gap / (f + v);
    legs.push({ from: i % 2 === 0 ? "A" : "B", start: t, end: t + dt, km: f * dt });
    t += dt;
    gap -= 2 * v * dt;
  }
  return legs;
}

/** Where everything is at time t (km from A's start): trains and the fly. */
export function trainsAt(t: number, c: TrainsLike): { a: number; b: number; fly: number; flown: number; legsDone: number } {
  const T = meetingTime(c.distanceKm, c.trainSpeed);
  const time = Math.max(0, Math.min(T, t));
  const a = c.trainSpeed * time;
  const b = c.distanceKm - c.trainSpeed * time;
  if (time >= T - 1e-12) return { a, b, fly: a, flown: flyTotal(c), legsDone: Infinity };
  let legsDone = 0;
  let fly = 0;
  for (const leg of flyLegs(200, c)) {
    if (time < leg.end) {
      const dir = leg.from === "A" ? 1 : -1;
      const startPos = leg.from === "A" ? c.trainSpeed * leg.start : c.distanceKm - c.trainSpeed * leg.start;
      fly = startPos + dir * c.flySpeed * (time - leg.start);
      break;
    }
    legsDone++;
    fly = leg.from === "A" ? c.distanceKm - c.trainSpeed * leg.end : c.trainSpeed * leg.end;
  }
  return { a, b, fly, flown: c.flySpeed * time, legsDone };
}
