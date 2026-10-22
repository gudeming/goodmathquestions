/** Pure helpers for calendar_grid (E7): a month as a 7-column grid and 3 × 3 windows on it. */

/** Weeks × 7 grid of day numbers (null = blank), weeks starting on Sunday. */
export type MonthGrid = Array<Array<number | null>>;

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Weekday (0 = Sunday) of the 1st of the month. */
export function firstWeekday(year: number, month: number): number {
  return new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
}

/** A real month (`year`, `month` 1..12), or a generic 31-day month starting on Sunday. */
export function monthGrid(year?: number, month?: number): MonthGrid {
  const days = year !== undefined && month !== undefined ? daysInMonth(year, month) : 31;
  const start = year !== undefined && month !== undefined ? firstWeekday(year, month) : 0;
  const weeks = Math.ceil((start + days) / 7);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const day = w * 7 + d - start + 1;
      return day >= 1 && day <= days ? day : null;
    }),
  );
}

/** Day numbers in the size × size window whose top-left cell is (row, col); null if any cell is blank or off the grid. */
export function windowCells(grid: MonthGrid, row: number, col: number, size = 3): number[] | null {
  const out: number[] = [];
  for (let r = row; r < row + size; r++) {
    for (let c = col; c < col + size; c++) {
      const v = grid[r]?.[c];
      if (v === null || v === undefined) return null;
      out.push(v);
    }
  }
  return out;
}

/** Sum of the window (null when the window doesn't fit on dates). */
export function windowSum(grid: MonthGrid, row: number, col: number, size = 3): number | null {
  const cells = windowCells(grid, row, col, size);
  return cells ? cells.reduce((a, b) => a + b, 0) : null;
}

/** The trick: the nine dates add up to 9 × the centre (size² × centre for any odd window). */
export function centreRule(centre: number, size = 3): number {
  return size * size * centre;
}

/** Top-left positions of every window that sits entirely on dates. */
export function validWindows(grid: MonthGrid, size = 3): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let r = 0; r + size <= grid.length; r++) for (let c = 0; c + size <= 7; c++) if (windowCells(grid, r, c, size)) out.push([r, c]);
  return out;
}

/** Top-left of the window centred on `day`, if that window fits. */
export function windowAround(grid: MonthGrid, day: number, size = 3): [number, number] | null {
  const half = (size - 1) / 2;
  for (let r = 0; r < grid.length; r++) {
    const c = grid[r].indexOf(day);
    if (c >= 0) return windowCells(grid, r - half, c - half, size) ? [r - half, c - half] : null;
  }
  return null;
}

/** Opposite pairs around the centre of a window (index pairs into windowCells): each adds to 2 × centre. */
export function symmetricPairs(size = 3): Array<[number, number]> {
  const n = size * size;
  const out: Array<[number, number]> = [];
  for (let i = 0; i < (n - 1) / 2; i++) out.push([i, n - 1 - i]);
  return out;
}
