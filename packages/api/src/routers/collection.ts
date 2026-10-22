import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@gmq/db";
import { createTRPCRouter, publicProcedure } from "../trpc";

/** Hero questions only: legacy DRILL questions never count towards a world. */
export const heroQuestionWhere = {
  isPublished: true,
  kind: { not: "DRILL" },
} satisfies Prisma.QuestionWhereInput;

const collectionSelect = {
  id: true,
  slug: true,
  titleEn: true,
  titleZh: true,
  descEn: true,
  descZh: true,
  emoji: true,
  colorToken: true,
  sortOrder: true,
  _count: { select: { questions: { where: heroQuestionWhere } } },
} satisfies Prisma.CollectionSelect;

type CollectionRow = Prisma.CollectionGetPayload<{ select: typeof collectionSelect }>;

/**
 * What a hero question card shows on home / world pages: the hook, never the
 * prompt or anything that gives the answer away.
 */
export const heroCardSelect = {
  id: true,
  slug: true,
  kind: true,
  titleEn: true,
  titleZh: true,
  hookEn: true,
  hookZh: true,
  ageGroup: true,
  collectionId: true,
  sortOrder: true,
} satisfies Prisma.QuestionSelect;

export type HeroCard = Prisma.QuestionGetPayload<{ select: typeof heroCardSelect }>;

function toPublicCollection({ _count, ...rest }: CollectionRow) {
  return { ...rest, questionCount: _count.questions };
}

export const collectionRouter = createTRPCRouter({
  /** All worlds in display order, with their published hero question counts. */
  list: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.collection.findMany({
      orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
      select: collectionSelect,
    });
    return rows.map(toPublicCollection);
  }),

  /** One world's metadata. Its questions come from question.listByCollection. */
  bySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(120) }))
    .query(async ({ ctx, input }) => {
      const row = await ctx.db.collection.findUnique({
        where: { slug: input.slug },
        select: collectionSelect,
      });
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Collection not found" });
      }
      return toPublicCollection(row);
    }),
});
