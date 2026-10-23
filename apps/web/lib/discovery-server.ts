import { cache } from "react";
import { TRPCError } from "@trpc/server";
import { appRouter, createCallerFactory, createTRPCContext } from "@gmq/api";
import type { TodayPuzzle, WorldInfo, WorldQuestionCard } from "@/components/worlds/types";

/**
 * Server-side reads for the landing, home and world pages. Anonymous context
 * only (public procedures); per-user progress is fetched on the client.
 * Results are plain JSON (no Dates) so they can be passed to client components.
 */
const createCaller = createCallerFactory(appRouter);
const anonCaller = () => createCaller(createTRPCContext({ session: null, anonId: null }));

/** Today's puzzle as a card, or null (no hero questions yet, or the DB is down). */
export const getTodayPuzzleCard = cache(async (): Promise<TodayPuzzle | null> => {
  try {
    const q = await anonCaller().daily.today();
    if (!q) return null;
    return {
      id: q.id,
      slug: q.slug,
      titleEn: q.titleEn,
      titleZh: q.titleZh,
      hookEn: q.hookEn,
      hookZh: q.hookZh,
      animationConfig: q.animationConfig ?? null,
      guessCount: q.guessCount,
    };
  } catch (err) {
    console.error("[discovery] daily.today failed:", err instanceof Error ? err.message : err);
    return null;
  }
});

/** One world and its published hero questions in path order, or null for an unknown slug. */
export const getWorld = cache(
  async (slug: string): Promise<{ world: WorldInfo; questions: WorldQuestionCard[] } | null> => {
    const caller = anonCaller();
    try {
      const [world, list] = await Promise.all([
        caller.collection.bySlug({ slug }),
        caller.question.listByCollection({ slug }),
      ]);
      const questions = list.questions
        .filter((q) => q.kind !== "DRILL")
        .map((q) => ({
          id: q.id,
          slug: q.slug,
          titleEn: q.titleEn,
          titleZh: q.titleZh,
          variantCount: q.variantCount,
          hookEn: q.hookEn,
          hookZh: q.hookZh,
          ageGroup: q.ageGroup,
        }));
      return { world, questions };
    } catch (err) {
      if (err instanceof TRPCError && (err.code === "NOT_FOUND" || err.code === "BAD_REQUEST")) return null;
      throw err;
    }
  }
);

/** Worlds with at least one published hero question, for the sitemap. */
export async function listLiveWorldSlugs(): Promise<string[]> {
  const worlds = await anonCaller().collection.list();
  return worlds.filter((w) => w.questionCount > 0).map((w) => w.slug);
}
