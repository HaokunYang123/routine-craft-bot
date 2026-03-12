-- Admin Recent Activity RPC
CREATE OR REPLACE FUNCTION public.admin_recent_activity(
  p_limit integer DEFAULT 50,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  event_type text,
  metadata jsonb,
  created_at timestamptz,
  user_email text,
  user_role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ae.id,
    ae.user_id,
    ae.event_type,
    ae.metadata,
    ae.created_at,
    au.email::text AS user_email,
    p.role::text AS user_role
  FROM activity_events ae
  LEFT JOIN auth.users au ON au.id = ae.user_id
  LEFT JOIN profiles p ON p.user_id = ae.user_id
  WHERE (p_start_date IS NULL OR ae.created_at >= p_start_date)
    AND (p_end_date IS NULL OR ae.created_at <= p_end_date)
  ORDER BY ae.created_at DESC
  LIMIT GREATEST(COALESCE(p_limit, 50), 0);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_recent_activity(integer, timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_recent_activity(integer, timestamptz, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_recent_activity(integer, timestamptz, timestamptz) TO authenticated;
