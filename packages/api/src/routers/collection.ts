import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@gmq/db";
import { createTRPCRouter, publicProcedure } from "../trpc";

/** Hero questions only: legacy DRILL questions never count towards a world. */
const heroQuestionWhere = {
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
