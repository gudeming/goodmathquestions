"use client";

import { useState, type KeyboardEvent } from "react";
import { Reorder, useDragControls, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { MathText } from "@/components/ui/MathText";
import { ChoiceCards } from "./ChoiceCards";
import { ExpressionInput } from "./ExpressionInput";
import { SliderControl, snapToStep } from "./SliderControl";
import { pick, type AnswerDraft, type AnswerType, type Locale, type OptionItem, type PublicQuestion } from "./types";

/** Options for CHOICE / ORDERING: `choices`, else a choice-type guess's options. */
export function answerOptions(question: PublicQuestion, locale: Locale): OptionItem[] {
  if (question.choices && question.choices.length > 0) {
    return question.choices.map((c) => ({ id: c.id, label: pick(c, locale) }));
  }
  if (question.guessConfig?.type === "choice") {
    return question.guessConfig.options.map((o) => ({ id: o.id, label: pick(o, locale) }));
  }
  return [];
}

export function initialDraft(question: PublicQuestion, locale: Locale): AnswerDraft {
  if (question.answerType === "MULTI_VALUE") return [];
  if (question.answerType === "ORDERING") return answerOptions(question, locale).map((o) => o.id);
  return "";
}

/** True when the draft is worth sending. */
export function isDraftReady(answerType: AnswerType, draft: AnswerDraft): boolean {
  if (Array.isArray(draft)) return draft.length > 0 && draft.every((d) => d.trim() !== "");
  void answerType;
  return draft.trim() !== "";
}

/** A value proposed by the scene, as a draft for this answer type (never submitted here). */
export function proposalToDraft(answerType: AnswerType, value: string, current: AnswerDraft): AnswerDraft {
  if (answerType === "MULTI_VALUE") {
    return value
      .split(/\s*(?:,|，|、|;|；|\band\b|和)\s*/)
      .map((v) => v.trim())
      .filter((v) => v !== "")
      .slice(0, 20);
  }
  if (answerType === "ORDERING") {
    const ids = value.split(/[>,，]/).map((v) => v.trim()).filter(Boolean);
    return Array.isArray(current) && ids.length === current.length && ids.every((id) => current.includes(id)) ? ids : current;
  }
  return value;
}

interface AnswerInputProps {
  question: PublicQuestion;
  locale: Locale;
  value: AnswerDraft;
  onChange: (v: AnswerDraft) => void;
  onSubmit: () => void;
  disabled?: boolean;
  /** id of the visible label ("Your answer") */
  labelId: string;
  wrong?: boolean;
}

/** Answer control chosen by `answerType`. Enter submits wherever that is unambiguous. */
export function AnswerInput({ question, locale, value, onChange, onSubmit, disabled, labelId, wrong }: AnswerInputProps) {
  const t = useTranslations("questions");
  const text = typeof value === "string" ? value : "";
  const list = Array.isArray(value) ? value : [];
  const wrongClass = wrong ? "border-fun-red bg-red-50" : "";
  const onEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  };

  switch (question.answerType) {
    case "CHOICE":
      return (
        <ChoiceCards
          options={answerOptions(question, locale)}
          value={text || null}
          onChange={onChange}
          labelledBy={labelId}
          disabled={disabled}
          onConfirm={onSubmit}
        />
      );

    case "ESTIMATE":
      return <EstimateInput question={question} locale={locale} value={text} onChange={onChange} onEnter={onEnter} disabled={disabled} labelId={labelId} wrongClass={wrongClass} />;

    case "MULTI_VALUE":
      return <ChipInput value={list} onChange={onChange} onSubmit={onSubmit} disabled={disabled} labelId={labelId} />;

    case "ORDERING":
      return <OrderingList options={answerOptions(question, locale)} value={list} onChange={onChange} disabled={disabled} />;

    case "EXPRESSION":
      return <ExpressionInput questionId={question.id} value={text} onChange={onChange} onSubmit={onSubmit} disabled={disabled} locale={locale} labelId={labelId} />;

    case "NUMERIC":
      return (
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onEnter}
          disabled={disabled}
          aria-labelledby={labelId}
          placeholder={t("numericPlaceholder")}
          className={`input-fun text-center font-mono text-2xl ${wrongClass}`}
          data-testid="answer-input"
        />
      );

    default:
      return (
        <input
          type="text"
          autoComplete="off"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onEnter}
          disabled={disabled}
          aria-labelledby={labelId}
          placeholder={t("textPlaceholder")}
          className={`input-fun text-center text-xl ${wrongClass}`}
          data-testid="answer-input"
        />
      );
  }
}

function EstimateInput({
  question,
  locale,
  value,
  onChange,
  onEnter,
  disabled,
  labelId,
  wrongClass,
}: {
  question: PublicQuestion;
  locale: Locale;
  value: string;
  onChange: (v: string) => void;
  onEnter: (e: KeyboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  labelId: string;
  wrongClass: string;
}) {
  const t = useTranslations("questions");
  const slider = question.guessConfig?.type === "slider" ? question.guessConfig : null;
  const n = Number(value.replace(/,/g, ""));
  const sliderValue = slider
    ? Number.isFinite(n) && value.trim() !== ""
      ? snapToStep(n, slider.min, slider.max, slider.step)
      : snapToStep((slider.min + slider.max) / 2, slider.min, slider.max, slider.step)
    : 0;

  return (
    <div className="space-y-4">
      {slider && (
        <SliderControl
          min={slider.min}
          max={slider.max}
          step={slider.step}
          logScale={slider.logScale}
          unit={slider.unit}
          value={sliderValue}
          onChange={(v) => onChange(String(v))}
          locale={locale}
          label={t("estimatePlaceholder")}
          disabled={disabled}
        />
      )}
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onEnter}
        disabled={disabled}
        aria-labelledby={labelId}
        placeholder={t("estimatePlaceholder")}
        className={`input-fun text-center font-mono text-2xl ${wrongClass}`}
        data-testid="answer-input"
      />
    </div>
  );
}

function ChipInput({
  value,
  onChange,
  onSubmit,
  disabled,
  labelId,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  onSubmit: () => void;
  disabled?: boolean;
  labelId: string;
}) {
  const t = useTranslations("questions");
  const [pending, setPending] = useState("");

  const add = () => {
    const parts = pending
      .split(/[,，、;；]/)
      .map((p) => p.trim())
      .filter((p) => p !== "");
    if (parts.length === 0) return false;
    onChange([...value, ...parts].slice(0, 20));
    setPending("");
    return true;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Enter adds the typed value; Enter on an empty box checks the answer.
      if (!add() && value.length > 0) onSubmit();
    } else if (e.key === "," || e.key === "，") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && pending === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div>
      <ul className="mb-3 flex min-h-[44px] flex-wrap gap-2" aria-live="polite">
        {value.map((v, i) => (
          <li key={`${v}-${i}`} className="flex items-center gap-1 rounded-full bg-primary-100 pl-4 font-mono text-lg text-primary-800">
            {v}
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              aria-label={t("removeValue", { value: v })}
              className="flex h-11 w-11 items-center justify-center rounded-full text-primary-600 hover:bg-primary-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-fun-cyan/50"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="enter"
          value={pending}
          disabled={disabled}
          onChange={(e) => setPending(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => add()}
          aria-labelledby={labelId}
          aria-describedby={`${labelId}-chip-help`}
          placeholder={t("multiValuePlaceholder")}
          className="input-fun font-mono text-xl"
          data-testid="answer-input"
        />
        <button type="button" onClick={add} disabled={disabled || pending.trim() === ""} className="btn-secondary min-h-[48px] shrink-0 disabled:opacity-50">
          {t("addValue")}
        </button>
      </div>
      <p id={`${labelId}-chip-help`} className="mt-2 text-sm text-gray-500">
        {t("multiValueHelp")}
      </p>
    </div>
  );
}

function OrderingList({
  options,
  value,
  onChange,
  disabled,
}: {
  options: OptionItem[];
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("questions");
  const byId = new Map(options.map((o) => [o.id, o]));
  const ids = value.filter((id) => byId.has(id));

  const move = (from: number, delta: number) => {
    const to = from + delta;
    if (to < 0 || to >= ids.length) return;
    const next = [...ids];
    [next[from], next[to]] = [next[to], next[from]];
    onChange(next);
  };

  return (
    <div>
      <p className="mb-3 text-sm text-gray-500">{t("orderingHelp")}</p>
      <Reorder.Group axis="y" values={ids} onReorder={onChange} className="space-y-2">
        {ids.map((id, i) => (
          <OrderingItem
            key={id}
            id={id}
            label={byId.get(id)?.label ?? id}
            index={i}
            count={ids.length}
            onMove={move}
            disabled={disabled}
          />
        ))}
      </Reorder.Group>
    </div>
  );
}

function OrderingItem({
  id,
  label,
  index,
  count,
  onMove,
  disabled,
}: {
  id: string;
  label: string;
  index: number;
  count: number;
  onMove: (from: number, delta: number) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("questions");
  const controls = useDragControls();
  const reduced = useReducedMotion();
  const arrowClass =
    "flex h-11 w-11 items-center justify-center rounded-full text-lg text-gray-600 hover:bg-primary-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-fun-cyan/50 disabled:opacity-30";

  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={controls}
      layout="position"
      transition={reduced ? { duration: 0 } : undefined}
      className="flex items-center gap-2 rounded-card border-2 border-primary-100 bg-white p-2 shadow-sm"
    >
      <span
        role="img"
        aria-label={t("dragHandle", { item: label })}
        onPointerDown={(e) => !disabled && controls.start(e)}
        className="flex h-11 w-11 shrink-0 cursor-grab touch-none items-center justify-center text-xl text-gray-400 active:cursor-grabbing"
      >
        ⠿
      </span>
      <span className="font-mono text-sm text-gray-400">{index + 1}.</span>
      <MathText className="flex-1 font-heading text-lg text-gray-800" text={label} />
      <button type="button" className={arrowClass} disabled={disabled || index === 0} onClick={() => onMove(index, -1)} aria-label={t("moveUp", { item: label })}>
        ↑
      </button>
      <button type="button" className={arrowClass} disabled={disabled || index === count - 1} onClick={() => onMove(index, 1)} aria-label={t("moveDown", { item: label })}>
        ↓
      </button>
    </Reorder.Item>
  );
}
