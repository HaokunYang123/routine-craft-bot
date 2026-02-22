#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/run-rls-tests.sh
# Requires DATABASE_URL environment variable

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL not set"
  exit 1
fi

echo "Running RLS regression tests..."

FAILED=$(psql "$DATABASE_URL" -t -A -c "SELECT COUNT(*) FROM public.run_rls_tests() WHERE NOT passed;")

if [ "$FAILED" -gt 0 ]; then
  echo "FAILED: $FAILED test(s) did not pass"
  psql "$DATABASE_URL" -c "SELECT test_name, detail FROM public.run_rls_tests() WHERE NOT passed;"
  exit 1
fi

TOTAL=$(psql "$DATABASE_URL" -t -A -c "SELECT COUNT(*) FROM public.run_rls_tests();")
echo "PASSED: All $TOTAL tests passed"
exit 0
