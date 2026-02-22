-- RLS Regression Test Runner
-- Usage: psql $DATABASE_URL -f scripts/run-rls-tests.sql

\echo '=== RLS Regression Test Suite ==='
\echo ''

SELECT test_name, passed, detail FROM public.run_rls_tests();

\echo ''
SELECT
  COUNT(*) FILTER (WHERE passed) AS passed,
  COUNT(*) FILTER (WHERE NOT passed) AS failed,
  COUNT(*) AS total
FROM public.run_rls_tests();
