-- Runs before every `prisma db push` (packages/db `db:push`, scripts/ec2-deploy.sh).
-- Must stay idempotent and additive.
--
-- Why: adding `@unique` to a column on an existing table makes `db push` warn
-- about possible data loss even when the column is brand new and all NULL, and
-- the production deploy (correctly) refuses to pass --accept-data-loss. Creating
-- the nullable column and Prisma's own unique index here first leaves `db push`
-- with nothing destructive to do. On an empty database this is a no-op.
DO $$
BEGIN
  IF to_regclass('"Question"') IS NOT NULL THEN
    ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "slug" TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS "Question_slug_key" ON "Question"("slug");
  END IF;
END $$;
