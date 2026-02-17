import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";

export const commentRouter = createTRPCRouter({
  // Get comments for a question
  list: publicProcedure
    .input(
      z.object({
        questionId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor, questionId } = input;

      const comments = await ctx.db.comment.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: {
          questionId,
          parentId: null, // Only top-level comments
          isApproved: true,
        },
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              level: true,
            },
          },
          replies: {
            where: { isApproved: true },
            orderBy: { createdAt: "asc" },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                  level: true,
                },
              },
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (comments.length > limit) {
        const nextItem = comments.pop();
        nextCursor = nextItem?.id;
      }

      return { comments, nextCursor };
    }),

  // Add a comment
  create: protectedProcedure
    .input(
      z.object({
        questionId: z.string(),
        content: z.string().min(1).max(500),
        parentId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Basic profanity check (in production, use AI moderation)
      const badWords = ["stupid", "dumb", "hate", "kill"];
      const contentLower = input.content.toLowerCase();
      const hasBadWords = badWords.some((w) => contentLower.includes(w));

      const comment = await ctx.db.comment.create({
        data: {
          content: input.content,
          userId: ctx.session.user.id,
          questionId: input.questionId,
          parentId: input.parentId,
          isApproved: !hasBadWords, // Auto-approve clean comments
          isFlagged: hasBadWords,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              level: true,
            },
          },
        },
      });

      return comment;
    }),
});
