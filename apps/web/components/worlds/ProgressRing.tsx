interface ProgressRingProps {
  solved: number;
  total: number;
  /** Tailwind text colour class for the filled arc (uses currentColor). */
  colorClass: string;
  /** Accessible text, e.g. "2 of 8 solved". */
  label: string;
  size?: number;
}

const STROKE = 6;

/** Solved x/y as a ring with the fraction in the middle. Purely presentational. */
export function ProgressRing({ solved, total, colorClass, label, size = 64 }: ProgressRingProps) {
  const r = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const ratio = total > 0 ? Math.min(1, Math.max(0, solved / total)) : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={STROKE} className="stroke-gray-200" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          stroke="currentColor"
          className={`${colorClass} transition-[stroke-dashoffset] duration-700`}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
        />
      </svg>
      <span aria-hidden className="absolute inset-0 flex items-center justify-center font-heading text-sm font-bold text-gray-700">
        {solved}/{total}
      </span>
    </div>
  );
}
