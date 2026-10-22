"use client";

import { useId } from "react";
import { formatNumber, pick, type Bi, type Locale } from "./types";

const LOG_STEPS = 1000;

interface SliderControlProps {
  min: number;
  max: number;
  step: number;
  logScale?: boolean;
  unit?: Bi;
  value: number;
  onChange: (v: number) => void;
  locale: Locale;
  label: string;
  disabled?: boolean;
}

/** Snaps v to the slider grid (min + k·step) inside [min, max], without float noise. */
export function snapToStep(v: number, min: number, max: number, step: number): number {
  const k = Math.round((v - min) / step);
  const decimals = (String(step).split(".")[1] ?? "").length;
  const snapped = Number((min + k * step).toFixed(decimals));
  return Math.min(max, Math.max(min, snapped));
}

export function sliderMidpoint(min: number, max: number, step: number, logScale = false): number {
  const mid = logScale && min > 0 ? Math.sqrt(min * max) : (min + max) / 2;
  return snapToStep(mid, min, max, step);
}

/** Native range input (keyboard + screen reader support for free) with a big live value. */
export function SliderControl({ min, max, step, logScale, unit, value, onChange, locale, label, disabled }: SliderControlProps) {
  const id = useId();
  const useLog = logScale === true && min > 0;
  const lo = useLog ? Math.log10(min) : 0;
  const hi = useLog ? Math.log10(max) : 0;
  const position = useLog ? Math.round(((Math.log10(value) - lo) / (hi - lo)) * LOG_STEPS) : value;
  const unitText = pick(unit ?? null, locale);
  const valueText = `${formatNumber(value, locale)}${unitText ? ` ${unitText}` : ""}`;

  const fromPosition = (p: number) => (useLog ? snapToStep(10 ** (lo + (p / LOG_STEPS) * (hi - lo)), min, max, step) : p);

  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <output htmlFor={id} aria-live="polite" className="mb-3 block text-center font-heading text-4xl font-bold text-primary-700">
        {valueText}
      </output>
      <input
        id={id}
        type="range"
        min={useLog ? 0 : min}
        max={useLog ? LOG_STEPS : max}
        step={useLog ? 1 : step}
        value={position}
        aria-valuetext={valueText}
        disabled={disabled}
        onChange={(e) => onChange(fromPosition(Number(e.target.value)))}
        className="h-11 w-full cursor-pointer accent-primary-500 disabled:cursor-not-allowed"
      />
      <div aria-hidden className="mt-1 flex justify-between text-sm text-gray-500">
        <span>{formatNumber(min, locale)}</span>
        <span>
          {formatNumber(max, locale)}
          {unitText ? ` ${unitText}` : ""}
        </span>
      </div>
    </div>
  );
}
