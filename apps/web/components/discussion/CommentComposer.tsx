"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { TagChips } from "./TagChips";
import { errorKey, type SolutionTag } from "./shared";

const MIN_COMMENT = 2;
const MAX_COMMENT = 500;
const XP_TOAST_MS = 3200;

type Status =
  | { kind: "idle" }
  | { kind: "posted" }
  | { kind: "pending"; reason: string | null }
  | { kind: "error"; key: ReturnType<typeof errorKey> };

interface CommentComposerProps {
  questionId: string;
  /** Placeholder (the question's discussion prompt for top-level posts). */
  placeholder: string;
  /** Chips to pick from; omitted for replies. */
  tags?: readonly SolutionTag[];
  guessValue?: string | null;
  parentId?: string;
  onPosted?: (content: string) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}

const PENDING_REASON_KEYS = new Set(["url", "contact", "profanity"]);

/** Textarea + method chips + post. Says plainly when a post waits for a grown-up. */
export function CommentComposer({ questionId, placeholder, tags, guessValue, parentId, onPosted, onCancel, autoFocus }: CommentComposerProps) {
  const t = useTranslations("discussion");
  const reduced = useReducedMotion();
  const inputId = useId();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [tag, setTag] = useState<SolutionTag | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [xpToast, setXpToast] = useState(0);
  const utils = trpc.useUtils();

  useEffect(() => {
    if (autoFocus) textRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (xpToast <= 0) return;
    const timer = setTimeout(() => setXpToast(0), XP_TOAST_MS);
    return () => clearTimeout(timer);
  }, [xpToast]);

  const create = trpc.comment.create.useMutation({
    onSuccess: (res, vars) => {
      setText("");
      setTag(null);
      setStatus(res.status === "published" ? { kind: "posted" } : { kind: "pending", reason: res.reason });
      if (res.xpAwarded > 0) setXpToast(res.xpAwarded);
      onPosted?.(vars.content);
      void utils.comment.list.invalidate({ questionId });
    },
    onError: (err) => setStatus({ kind: "error", key: errorKey(err) }),
  });

  const length = [...text.trim()].length;
  const canPost = length >= MIN_COMMENT && length <= MAX_COMMENT && !create.isPending;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPost) return;
    create.mutate({
      questionId,
      content: text.trim(),
      ...(parentId ? { parentId } : {}),
      ...(tag ? { solutionTag: tag } : {}),
      ...(guessValue && !parentId ? { guessValue } : {}),
    });
  };

  const statusText =
    status.kind === "posted"
      ? t("posted")
      : status.kind === "pending"
        ? `${t("pendingNote")}${status.reason && PENDING_REASON_KEYS.has(status.reason) ? ` ${t(`pendingReason.${status.reason}`)}` : ""}`
        : status.kind === "error"
          ? t(status.key)
          : null;

  return (
    <form onSubmit={submit} className="relative" data-testid={parentId ? "reply-composer" : "comment-composer"}>
      <label htmlFor={inputId} className="sr-only">
        {placeholder}
      </label>
      <textarea
        id={inputId}
        ref={textRef}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (status.kind !== "idle") setStatus({ kind: "idle" });
        }}
        className="input-fun resize-none text-base"
        rows={parentId ? 2 : 3}
        placeholder={placeholder}
        maxLength={MAX_COMMENT}
        disabled={create.isPending}
      />

      {tags && tags.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 font-heading text-sm font-semibold text-gray-600">{t("pickTag")}</p>
          <TagChips tags={tags} value={tag} onChange={setTag} label={t("pickTag")} disabled={create.isPending} size="sm" />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p
          aria-live="polite"
          className={`min-h-[1.25rem] flex-1 text-sm ${status.kind === "error" ? "text-red-600" : status.kind === "pending" ? "text-amber-700" : status.kind === "posted" ? "text-green-700" : "text-gray-500"}`}
          data-testid="composer-status"
        >
          {statusText ?? t("charCount", { count: [...text].length, max: MAX_COMMENT })}
        </p>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="min-h-[44px] px-3 font-heading text-sm font-semibold text-gray-500 hover:text-gray-700">
              {t("cancel")}
            </button>
          )}
          <button type="submit" disabled={!canPost} className="btn-primary min-h-[44px] px-5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50">
            {create.isPending ? t("posting") : parentId ? t("reply") : t("post")} 💬
          </button>
        </div>
      </div>

      <AnimatePresence>
        {xpToast > 0 && (
          <motion.div
            role="status"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="badge-xp absolute -top-3 right-2"
            data-testid="comment-xp-toast"
          >
            {t("xpToast", { xp: xpToast })}
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
