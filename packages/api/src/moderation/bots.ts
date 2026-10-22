/**
 * Email domains of the generated "community boost" users (packages/db/prisma/seed.ts,
 * COMMUNITY_EMAIL_DOMAINS). Duplicated here because @gmq/db must not depend on @gmq/api.
 * comment.list hides every author on these domains, so a production database that was
 * never cleaned (`npm run db:seed:community:cleanup -w @gmq/db`) still shows no bot comments.
 */
export const COMMUNITY_EMAIL_DOMAINS = ["@seed.gmq.local", "@community.gmq.local"] as const;

/** Prisma `UserWhereInput` fragment: "not a generated community user". Null emails are real kids. */
export function notBotAuthor() {
  return {
    OR: [
      { email: null },
      { AND: COMMUNITY_EMAIL_DOMAINS.map((domain) => ({ NOT: { email: { endsWith: domain, mode: "insensitive" as const } } })) },
    ],
  };
}
