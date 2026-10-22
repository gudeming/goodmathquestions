/** Pure helpers for clock_overlap (B8). Time is minutes after midnight, 0 <= t < 1440. */

export const MINUTES_PER_DAY = 1440;
/** The minute hand laps the hour hand every 720/11 minutes (1 h 5 min 27 s). */
export const LAP_MINUTES = 720 / 11;

/** Every moment in a day [0, hours·60) when the hands overlap: 22 for a whole day. */
export function overlapTimes(hours = 24): number[] {
  const end = hours * 60;
  const out: number[] = [];
  for (let k = 0; k * LAP_MINUTES < end - 1e-9; k++) out.push(k * LAP_MINUTES);
  return out;
}

/** Hand angles in degrees clockwise from 12. */
export function handAngles(t: number): { minute: number; hour: number } {
  const m = ((t % 60) + 60) % 60;
  const h = ((t % 720) + 720) % 720;
  return { minute: m * 6, hour: h * 0.5 };
}

/** Smallest angle between the hands (0..180). */
export function handGap(t: number): number {
  const { minute, hour } = handAngles(t);
  const d = Math.abs(minute - hour) % 360;
  return d > 180 ? 360 - d : d;
}

/** Indices (into overlapTimes()) of overlaps passed when time moves from `from` to `to` (either way, `to` inclusive). */
export function crossedOverlaps(from: number, to: number, times: readonly number[] = overlapTimes()): number[] {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const eps = 1e-9;
  return times.flatMap((t, i) => {
    const hit = from < to ? t > lo + eps && t <= hi + eps : t >= lo - eps && t < hi - eps;
    return hit || (from === to && Math.abs(t - from) < eps) ? [i] : [];
  });
}

/** Unwrap a drag: new angle of the minute hand (degrees) → minutes moved, taking the short way round. */
export function minutesForDrag(prevAngle: number, nextAngle: number): number {
  let d = nextAngle - prevAngle;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d / 6;
}

/** "1:05:27 am" / "上午 1:05:27" (seconds shown when not on the minute). */
export function formatClock(t: number, locale: "en" | "zh", withSeconds = true): string {
  const total = Math.round((((t % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY) * 60);
  const secs = total % 60;
  const mins = Math.floor(total / 60) % 60;
  const h24 = Math.floor(total / 3600) % 24;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const mm = String(mins).padStart(2, "0");
  const ss = withSeconds && secs ? `:${String(secs).padStart(2, "0")}` : "";
  if (locale === "zh") return `${h24 < 12 ? "上午" : "下午"} ${h12}:${mm}${ss}`;
  return `${h12}:${mm}${ss} ${h24 < 12 ? "am" : "pm"}`;
}
