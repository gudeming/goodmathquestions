"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { IllustrationConfig, SceneProps } from "@gmq/animation-engine";
import { SceneFrame, SceneMessage, bi } from "./primitives";
import { useSceneEvents } from "./useSceneEvents";

/** Static SVG assets live in apps/web/public/scenes/<asset>.svg (names are kebab-case, checked by the schema). */
export const illustrationSrc = (asset: string) => `/scenes/${asset}.svg`;

/**
 * Fallback scene (catalog §4): a picture and a caption. The reveal swaps to `revealAsset`
 * (and `revealCaption`) when given. There is nothing to play, so `reveal_done` fires at once.
 */
export default function IllustrationScene({ config, phase, locale, reducedMotion, onEvent }: SceneProps<IllustrationConfig>) {
  const events = useSceneEvents(onEvent);
  const doneFor = useRef<string | null>(null);
  const revealing = phase === "reveal";
  const asset = revealing && config.revealAsset ? config.revealAsset : config.asset;
  const caption = bi(locale, revealing && config.revealCaption ? config.revealCaption : config.caption);

  useEffect(() => {
    if (!revealing) {
      doneFor.current = null;
      return;
    }
    if (doneFor.current === asset) return;
    doneFor.current = asset;
    events.emit("reveal_done");
  }, [revealing, asset, events]);

  return (
    <SceneFrame label={caption} inert={phase === "hook"}>
      <figure className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1">
        <motion.div
          key={asset}
          className="flex min-h-0 w-full flex-1 items-center justify-center"
          initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reducedMotion ? 0.2 : 0.4 }}
        >
          {/* Plain <img>: tiny local SVGs need no next/image optimisation. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={illustrationSrc(asset)} alt={caption} className="max-h-full max-w-full rounded-xl object-contain" draggable={false} />
        </motion.div>
        <figcaption>
          <SceneMessage>{caption}</SceneMessage>
        </figcaption>
      </figure>
    </SceneFrame>
  );
}
