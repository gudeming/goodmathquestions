import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { Session } from "next-auth";
import { db } from "@gmq/db";

export interface CreateContextOptions {
  session: Session | null;
}

export const createTRPCContext = (opts: CreateContextOptions) => {
  return {
    session: opts.session,
    db,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

// Public procedure - no auth required
export const publicProcedure = t.procedure;

// Protected procedure - requires authentication
const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user || !(ctx.session.user as { id?: string }).id) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: {
        ...ctx.session,
        user: {
          ...ctx.session.user,
          id: (ctx.session.user as { id: string }).id,
        },
      },
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceAuth);

// Admin procedure - requires the caller's `isAdmin` flag to be set.
// The flag is read from the database on every call rather than from the JWT so
// that revoking admin takes effect immediately instead of at token expiry.
const enforceAdmin = t.middleware(async ({ ctx, next }) => {
  const userId = (ctx.session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const user = await ctx.db.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }

  return next();
});

export const adminProcedure = protectedProcedure.use(enforceAdmin);
