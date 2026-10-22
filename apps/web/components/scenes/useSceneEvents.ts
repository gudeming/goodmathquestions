"use client";

import { useEffect, useMemo, useRef } from "react";
import type { SceneEvent } from "@gmq/animation-engine";

/** Contract: `state` events are throttled to <= 2 per second (trailing edge kept). */
const STATE_THROTTLE_MS = 500;

export interface SceneEmitter {
  /** Fires `interact` on the first call only. */
  interact: () => void;
  /** Throttled `state` summary. */
  state: (props: Record<string, unknown>) => void;
  /** Any other event (`completed`, `reveal_done`, ...), unthrottled. */
  emit: (name: string, props?: Record<string, unknown>) => void;
}

export function useSceneEvents(onEvent: (e: SceneEvent) => void): SceneEmitter {
  const onEventRef = useRef(onEvent);
  const interacted = useRef(false);
  const lastStateAt = useRef(0);
  const pending = useRef<Record<string, unknown> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onEventRef.current = onEvent;
  });

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return useMemo<SceneEmitter>(() => {
    const flush = () => {
      timer.current = null;
      if (!pending.current) return;
      lastStateAt.current = Date.now();
      onEventRef.current({ name: "state", props: pending.current });
      pending.current = null;
    };
    return {
      interact: () => {
        if (interacted.current) return;
        interacted.current = true;
        onEventRef.current({ name: "interact" });
      },
      state: (props) => {
        pending.current = props;
        const wait = STATE_THROTTLE_MS - (Date.now() - lastStateAt.current);
        if (wait <= 0) flush();
        else if (!timer.current) timer.current = setTimeout(flush, wait);
      },
      emit: (name, props) => onEventRef.current(props ? { name, props } : { name }),
    };
  }, []);
}
