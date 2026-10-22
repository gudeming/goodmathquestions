import type { TRPCContext } from "../trpc";

/**
 * Who is calling. A signed-in session always wins over the anonymous id.
 * `key` is the raw id, used for Redis keys (cuid and UUID v4 cannot collide).
 */
export type Identity =
  | { kind: "user"; userId: string; key: string }
  | { kind: "anon"; anonId: string; key: string };

type IdentityContext = Pick<TRPCContext, "session" | "anonId">;
type DbContext = Pick<TRPCContext, "session" | "anonId" | "db">;

function sessionUser(ctx: IdentityContext): { id: string; email: string | null } | null {
  const user = ctx.session?.user as { id?: unknown; email?: string | null } | undefined;
  return typeof user?.id === "string" && user.id !== "" ? { id: user.id, email: user.email ?? null } : null;
}

/** Cheap identity from the context alone (no DB). Use for rate limits and analytics. */
export function identityFromContext(ctx: IdentityContext): Identity | null {
  const user = sessionUser(ctx);
  if (user) return { kind: "user", userId: user.id, key: user.id };
  if (ctx.anonId) return { kind: "anon", anonId: ctx.anonId, key: ctx.anonId };
  return null;
}

/**
 * Identity whose userId is known to exist (needed before writing a row with a
 * foreign key to User). A stale session falls back to the email lookup, as
 * resolveSessionUserId does, and then to the anonymous id.
 */
export async function resolveIdentity(ctx: DbContext): Promise<Identity | null> {
  const user = sessionUser(ctx);
  if (user) {
    const byId = await ctx.db.user.findUnique({ where: { id: user.id }, select: { id: true } });
    const found =
      byId ??
      (user.email
        ? await ctx.db.user.findUnique({ where: { email: user.email }, select: { id: true } })
        : null);
    if (found) return { kind: "user", userId: found.id, key: found.id };
  }
  if (ctx.anonId) return { kind: "anon", anonId: ctx.anonId, key: ctx.anonId };
  return null;
}
