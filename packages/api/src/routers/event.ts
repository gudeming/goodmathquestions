import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { identityFromContext } from "../lib/identity";
import { RATE_LIMITS, consumeRateLimit } from "../lib/rate-limit";
import { touchStreak } from "../lib/streak";

export const EVENT_NAMES = [
  "question_view",
  "guess_made",
  "scene_interact",
  "answer_submit",
  "reveal_seen",
  "extension_open",
  "comment_post",
  "hint_reveal",
] as const;
export type EventName = (typeof EVENT_NAMES)[number];

/** Events that count as "thinking" for the daily streak (guesses count via guess.submit). */
const STREAK_EVENTS: ReadonlySet<EventName> = new Set<EventName>(["scene_interact"]);

export const MAX_EVENT_PROPS_BYTES = 2048;

export const eventRateLimitKey = (identityKey: string) => `rl:event:${identityKey}`;

const PropsSchema = z
  .record(z.string().min(1).max(64), z.union([z.string().max(500), z.number().finite(), z.boolean()]))
  .refine((p) => Object.keys(p).length <= 32, { message: "too many props" })
  .refine((p) => Buffer.byteLength(JSON.stringify(p), "utf8") <= MAX_EVENT_PROPS_BYTES, {
    message: `props must be at most ${MAX_EVENT_PROPS_BYTES} bytes of JSON`,
  });

export const eventRouter = createTRPCRouter({
  /**
   * Lightweight analytics. Fire-and-forget: once the input validates this always
   * returns { ok: true }, even when the event is dropped (no identity, rate limited,
   * DB error). Callers must not depend on it being stored.
   */
  track: publicProcedure
    .input(
      z.object({
        name: z.enum(EVENT_NAMES),
        questionId: z.string().min(1).max(64).optional(),
        props: PropsSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const who = identityFromContext(ctx);
      if (!who) return { ok: true as const };
      if (!(await consumeRateLimit(eventRateLimitKey(who.key), RATE_LIMITS.event()))) {
        return { ok: true as const };
      }
      try {
        await ctx.db.event.create({
          data: {
            name: input.name,
            questionId: input.questionId ?? null,
            userId: who.kind === "user" ? who.userId : null,
            anonId: who.kind === "anon" ? who.anonId : null,
            props: input.props ?? {},
          },
        });
      } catch (err) {
        console.error("[event] failed to record", input.name, err instanceof Error ? err.message : err);
      }
      if (who.kind === "user" && STREAK_EVENTS.has(input.name)) await touchStreak(ctx.db, who.userId);
      return { ok: true as const };
    }),
});
