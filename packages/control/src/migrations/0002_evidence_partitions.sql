-- This month and next month, so a fresh database can take evidence immediately.
-- Later months are created on demand by ensurePartition; old ones are dropped by an ops job,
-- which is how evidence expires (docs/architecture.md §6).
DO $$
DECLARE
  start_month date := date_trunc('month', now())::date;
  m date;
  part text;
BEGIN
  FOREACH m IN ARRAY ARRAY[start_month, (start_month + interval '1 month')::date] LOOP
    part := 'evidence_rows_' || to_char(m, 'YYYY_MM');
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF evidence_rows FOR VALUES FROM (%L) TO (%L)',
      part, m, (m + interval '1 month')::date
    );
  END LOOP;
END $$;
