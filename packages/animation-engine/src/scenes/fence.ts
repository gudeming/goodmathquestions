/** Pure helpers for fence_shaper (B4): fixed perimeter, maximise the rectangle. */

export interface FenceLike {
  perimeter: number;
  integerOnly?: boolean;
  /** One long side is a wall: the fence covers width + length + width. */
  wallSide?: boolean;
}

/** Length of the other side for a given width. Without a wall: P/2 - w. With a wall: P - 2w. */
export function lengthFor(width: number, config: FenceLike): number {
  return config.wallSide ? config.perimeter - 2 * width : config.perimeter / 2 - width;
}

/** Area for a given width (0 outside the valid range). */
export function areaFor(width: number, config: FenceLike): number {
  const length = lengthFor(width, config);
  return width > 0 && length > 0 ? width * length : 0;
}

/** Slider range for the width. */
export function widthRange(config: FenceLike): { min: number; max: number; step: number } {
  const integer = config.integerOnly ?? true;
  const limit = config.wallSide ? config.perimeter / 2 : config.perimeter / 2;
  const step = integer ? 1 : 0.5;
  return { min: step, max: limit - step, step };
}

/** Width with the largest area: P/4 either way (with a wall: P/4 wide, P/2 long). Integers: nearest best. */
export function bestWidth(config: FenceLike): number {
  const exact = config.perimeter / 4;
  if (!(config.integerOnly ?? true) || Number.isInteger(exact)) return exact;
  const lo = Math.floor(exact);
  const hi = Math.ceil(exact);
  return areaFor(hi, config) > areaFor(lo, config) ? hi : lo;
}

export function maxArea(config: FenceLike): number {
  return areaFor(bestWidth(config), config);
}
