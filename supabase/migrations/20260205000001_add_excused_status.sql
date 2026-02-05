-- Migration: Allow "excused" task status on task_instances
-- Purpose: Fix coach Excuse action failing with 400 when setting status='excused'

-- If status uses an enum type, add the new enum value.
DO $$
DECLARE
  enum_schema text;
  enum_name text;
BEGIN
  SELECT tns.nspname, t.typname
  INTO enum_schema, enum_name
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace cns ON cns.oid = c.relnamespace
  JOIN pg_type t ON t.oid = a.atttypid
  JOIN pg_namespace tns ON tns.oid = t.typnamespace
  WHERE cns.nspname = 'public'
    AND c.relname = 'task_instances'
    AND a.attname = 'status'
    AND a.attnum > 0
    AND NOT a.attisdropped
    AND t.typtype = 'e'
  LIMIT 1;

  IF enum_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TYPE %I.%I ADD VALUE IF NOT EXISTS %L',
      enum_schema,
      enum_name,
      'excused'
    );
  END IF;
END $$;

-- Drop any existing CHECK constraints that reference task_instances.status.
DO $$
DECLARE
  status_check record;
BEGIN
  FOR status_check IN
    SELECT DISTINCT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN pg_attribute att ON att.attrelid = con.conrelid
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'task_instances'
      AND con.contype = 'c'
      AND att.attname = 'status'
      AND att.attnum = ANY(con.conkey)
  LOOP
    EXECUTE format('ALTER TABLE public.task_instances DROP CONSTRAINT %I', status_check.conname);
  END LOOP;
END $$;

-- Recreate canonical status constraint including "excused".
ALTER TABLE public.task_instances
ADD CONSTRAINT task_instances_status_check
CHECK (status::text IN ('pending', 'completed', 'missed', 'excused'));
