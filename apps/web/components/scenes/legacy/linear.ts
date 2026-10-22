/**
 * `d3.scaleLinear().domain([d0, d1]).range([r0, r1])` without d3: the same arithmetic
 * (normalise, then `a * (1 - t) + b * t`), including a reversed domain and the range
 * midpoint for an empty domain. The legacy scenes only ever used this one d3 feature,
 * and importing the `d3` umbrella pulled ~18 kB gz (selection, transition, zoom...)
 * into their chunk.
 */
export function linearScale(d0: number, d1: number, r0: number, r1: number): (x: number) => number {
  if (d1 < d0) {
    [d0, d1] = [d1, d0];
    [r0, r1] = [r1, r0];
  }
  const span = d1 - d0;
  return (x) => {
    const t = span ? (x - d0) / span : Number.isNaN(span) ? NaN : 0.5;
    return r0 * (1 - t) + r1 * t;
  };
}
