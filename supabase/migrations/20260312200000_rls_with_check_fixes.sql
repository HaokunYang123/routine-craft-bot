DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND role = (
      SELECT p.role
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
    )
    AND is_admin = (
      SELECT p.is_admin
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own people" ON public.people;
CREATE POLICY "Users can update their own people"
  ON public.people
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their recurring schedules" ON public.recurring_schedules;
CREATE POLICY "Users can update their recurring schedules"
  ON public.recurring_schedules
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own routines" ON public.routines;
CREATE POLICY "Users can update their own routines"
  ON public.routines
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
