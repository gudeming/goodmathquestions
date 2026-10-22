"use client";

import { useCallback } from "react";
import { trpc } from "@/lib/trpc";
import type { EventName, EventProps } from "./types";

/** Fire-and-forget analytics for one question. Never throws, never blocks the UI. */
export function useTrack(questionId: string) {
  const { mutate } = trpc.event.track.useMutation({ retry: false });
  return useCallback(
    (name: EventName, props?: EventProps) => {
      try {
        mutate({ name, questionId, ...(props ? { props } : {}) }, { onError: () => undefined });
      } catch {
        // Analytics must never break the question.
      }
    },
    [mutate, questionId]
  );
}

export type Track = ReturnType<typeof useTrack>;
