import { cache } from "react";
import { TRPCError } from "@trpc/server";
import { appRouter, createCallerFactory, createTRPCContext } from "@gmq/api";
import { db } from "@gmq/db";

/**
 * Server-side question lookup for the question page (metadata, redirects, 404).
 * Anonymous context: only public procedures, never the caller's session.
 */
const createCaller = createCallerFactory(appRouter);

export type ResolvedQuestion = Awaited<ReturnType<ReturnType<typeof createCaller>["question"]["resolve"]>>;

/** Resolves an id or slug to a published question, or null. Deduped per request. */
export const resolveQuestion = cache(async (idOrSlug: string): Promise<ResolvedQuestion | null> => {
  const caller = createCaller(createTRPCContext({ session: null, anonId: null }));
  try {
    return await caller.question.resolve({ idOrSlug });
  } catch (err) {
    if (err instanceof TRPCError && (err.code === "NOT_FOUND" || err.code === "BAD_REQUEST")) return null;
    throw err;
  }
});

/** Published hero questions (kind != DRILL) that have a slug, for the sitemap. */
export async function listHeroSlugs(): Promise<Array<{ slug: string; updatedAt: Date }>> {
  const rows = await db.question.findMany({
    where: { isPublished: true, kind: { not: "DRILL" }, slug: { not: null } },
    select: { slug: true, updatedAt: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  return rows.flatMap((r) => (r.slug ? [{ slug: r.slug, updatedAt: r.updatedAt }] : []));
}
