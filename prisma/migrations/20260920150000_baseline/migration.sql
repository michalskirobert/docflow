-- DocFlow baseline marker.
-- Existing databases must mark this migration as applied with:
--   yarn prisma migrate resolve --applied 20260920150000_baseline
-- before running `yarn prisma migrate dev`.
--
-- New development databases should be initialized once from schema.prisma with
-- `yarn prisma db push`, then mark this baseline as applied. Subsequent schema
-- changes belong in normal Prisma migrations.
SELECT 1;
