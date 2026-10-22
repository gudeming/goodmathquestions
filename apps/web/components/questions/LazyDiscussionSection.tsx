"use client";

import { Suspense, lazy, type ComponentProps } from "react";
import type { DiscussionSection } from "./DiscussionSection";

const loadDiscussionSection = () => import("./DiscussionSection");
const DiscussionSectionChunk = lazy(() => loadDiscussionSection().then((mod) => ({ default: mod.DiscussionSection })));

/**
 * The discussion (comments, composer, guess split, report flow) as its own chunk. It
 * only appears after a question is answered, so the question page does not ship it
 * up front; the chunk is requested when the reveal (or answered drill) renders.
 */
export function LazyDiscussionSection(props: ComponentProps<typeof DiscussionSection>) {
  return (
    <Suspense fallback={null}>
      <DiscussionSectionChunk {...props} />
    </Suspense>
  );
}
