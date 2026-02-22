# TeachCoachConnect — SECURITY AUDIT Chunk 6 HOTFIX

Date: 2026-02-20  
Project: `TeachCoachConnect` (`vjzaayxeoeojuccbriid`)  
Execution method: Supabase MCP `execute_sql` for all DB reads/writes

## Scope
1. Closed NULL-group student DM leak in notes insert path.
2. Added relationship-scoped coach direct-note insert policy for `group_id IS NULL` use case.
3. Hardened `accept_invite` (`search_path`, NULL-safe role gate, execute grants).
4. Verified behavior with deterministic impersonation tests.

---

## A) BEFORE snapshots (raw outputs)

### A.1 Notes policies
SQL:
```sql
SELECT policyname, cmd, rol, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='notes'
ORDER BY policyname, cmd;
```

Raw output:
```text
{"error":{"name":"HttpException","message":"Failed to run sql query: ERROR:  42703: column \"rol\" does not exist\nLINE 1: SELECT policyname, cmd, rol, qual, with_check\n                                ^\n"}}
```

Fallback snapshot query used (`roles`):
```sql
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='notes'
ORDER BY policyname, cmd;
```

Raw output:
```text
[{"policyname":"Group members can view shared notes","cmd":"SELECT","roles":"{authenticated}","qual":"((from_user_id = auth.uid()) OR (to_user_id = auth.uid()) OR ((visibility = 'shared'::text) AND (EXISTS ( SELECT 1\n   FROM group_members gm\n  WHERE ((gm.group_id = notes.group_id) AND (gm.user_id = auth.uid()))))))","with_check":null},{"policyname":"Users can view notes they sent or received","cmd":"SELECT","roles":"{authenticated}","qual":"((auth.uid() = from_user_id) OR (auth.uid() = to_user_id))","with_check":null},{"policyname":"notes_delete_author_only","cmd":"DELETE","roles":"{authenticated}","qual":"((auth.uid() = from_user_id) AND ((group_id IS NULL) OR (EXISTS ( SELECT 1\n   FROM groups g\n  WHERE ((g.id = notes.group_id) AND (g.coach_id = auth.uid()))))))","with_check":null},{"policyname":"notes_insert_author_only","cmd":"INSERT","roles":"{authenticated}","qual":null,"with_check":"((auth.uid() = from_user_id) AND ((group_id IS NULL) OR (EXISTS ( SELECT 1\n   FROM groups g\n  WHERE ((g.id = notes.group_id) AND (g.coach_id = auth.uid()))))))"},{"policyname":"notes_select_coach_scope","cmd":"SELECT","roles":"{authenticated}","qual":"((from_user_id = auth.uid()) OR ((group_id IS NOT NULL) AND (EXISTS ( SELECT 1\n   FROM groups g\n  WHERE ((g.id = notes.group_id) AND (g.coach_id = auth.uid()))))))","with_check":null},{"policyname":"notes_student_delete_author_member","cmd":"DELETE","roles":"{authenticated}","qual":"((auth.uid() = from_user_id) AND ((group_id IS NULL) OR (EXISTS ( SELECT 1\n   FROM ( SELECT gm.group_id AS member_group_id,\n            gm.user_id\n           FROM group_members gm) m\n  WHERE ((m.member_group_id = notes.group_id) AND (m.user_id = auth.uid()))))))","with_check":null},{"policyname":"notes_student_insert_author_member","cmd":"INSERT","roles":"{authenticated}","qual":null,"with_check":"((auth.uid() = from_user_id) AND ((group_id IS NULL) OR (EXISTS ( SELECT 1\n   FROM ( SELECT gm.group_id AS member_group_id,\n            gm.user_id\n           FROM group_members gm) m\n  WHERE ((m.member_group_id = notes.group_id) AND (m.user_id = auth.uid()))))))"},{"policyname":"notes_student_update_author_member","cmd":"UPDATE","roles":"{authenticated}","qual":"((auth.uid() = from_user_id) AND ((group_id IS NULL) OR (EXISTS ( SELECT 1\n   FROM ( SELECT gm.group_id AS member_group_id,\n            gm.user_id\n           FROM group_members gm) m\n  WHERE ((m.member_group_id = notes.group_id) AND (m.user_id = auth.uid()))))))","with_check":"((auth.uid() = from_user_id) AND ((group_id IS NULL) OR (EXISTS ( SELECT 1\n   FROM ( SELECT gm.group_id AS member_group_id,\n            gm.user_id\n           FROM group_members gm) m\n  WHERE ((m.member_group_id = notes.group_id) AND (m.user_id = auth.uid()))))))"},{"policyname":"notes_update_author_only","cmd":"UPDATE","roles":"{authenticated}","qual":"((auth.uid() = from_user_id) AND ((group_id IS NULL) OR (EXISTS ( SELECT 1\n   FROM groups g\n  WHERE ((g.id = notes.group_id) AND (g.coach_id = auth.uid()))))))","with_check":"((auth.uid() = from_user_id) AND ((group_id IS NULL) OR (EXISTS ( SELECT 1\n   FROM groups g\n  WHERE ((g.id = notes.group_id) AND (g.coach_id = auth.uid()))))))"},{"policyname":"parent_select_notes","cmd":"SELECT","roles":"{authenticated}","qual":"((to_user_id IN ( SELECT get_linked_children(auth.uid()) AS get_linked_children)) OR ((group_id IN ( SELECT group_members.group_id\n   FROM group_members\n  WHERE (group_members.user_id IN ( SELECT get_linked_children(auth.uid()) AS get_linked_children)))) AND (to_user_id IS NULL)))","with_check":null}]
```

### A.2 `accept_invite` signature + definition
SQL:
```sql
SELECT n.nspname AS schema, p.proname,
       pg_get_function_identity_arguments(p.oid) AS args,
       p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public' AND p.proname='accept_invite';
```

Raw output:
```text
[{"schema":"public","proname":"accept_invite","args":"p_join_code text","security_definer":true}]
```

SQL:
```sql
SELECT pg_get_functiondef(p.oid) AS def
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public' AND p.proname='accept_invite';
```

Raw output:
```text
[{"def":"CREATE OR REPLACE FUNCTION public.accept_invite(p_join_code text)\n RETURNS json\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nDECLARE\n  v_session RECORD;\n  v_student_id UUID := auth.uid();\n  v_student_role TEXT;\nBEGIN\n  -- Check if current user is a student\n  SELECT role INTO v_student_role FROM profiles WHERE user_id = v_student_id;\n  IF v_student_role != 'student' THEN\n    RETURN json_build_object('success', false, 'error', 'Only students can join classes');\n  END IF;\n\n  -- Find the class session by join code\n  SELECT * INTO v_session \n  FROM class_sessions \n  WHERE join_code = UPPER(p_join_code) AND is_active = true;\n\n  IF NOT FOUND THEN\n    RETURN json_build_object('success', false, 'error', 'Invalid or expired invite code');\n  END IF;\n\n  -- Check if relationship already exists\n  IF EXISTS (\n    SELECT 1 FROM instructor_students \n    WHERE instructor_id = v_session.coach_id AND student_id = v_student_id\n  ) THEN\n    -- Update the existing record to link to the new class session if it was missing or different?\n    -- For now, let's just return success but maybe update the session_id? \n    -- Let's UPDATE it so they can \"switch\" classes or update their link.\n    UPDATE instructor_students \n    SET class_session_id = v_session.id \n    WHERE instructor_id = v_session.coach_id AND student_id = v_student_id;\n\n    RETURN json_build_object(\n        'success', true, \n        'message', 'Updated class connection',\n        'instructor_id', v_session.coach_id,\n        'class_name', v_session.name\n    );\n  END IF;\n\n  -- Create the relationship\n  INSERT INTO instructor_students (instructor_id, student_id, class_session_id)\n  VALUES (v_session.coach_id, v_student_id, v_session.id);\n\n  RETURN json_build_object(\n    'success', true, \n    'message', 'Successfully joined class',\n    'instructor_id', v_session.coach_id,\n    'class_name', v_session.name\n  );\nEND;\n$function$\n"}]
```

### A.3 `accept_invite` EXECUTE grants
SQL:
```sql
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema='public' AND routine_name='accept_invite'
ORDER BY grantee, privilege_type;
```

Raw output:
```text
[{"grantee":"PUBLIC","privilege_type":"EXECUTE"},{"grantee":"anon","privilege_type":"EXECUTE"},{"grantee":"authenticated","privilege_type":"EXECUTE"},{"grantee":"postgres","privilege_type":"EXECUTE"},{"grantee":"service_role","privilege_type":"EXECUTE"}]
```

### A.4 Chunk 5 coach notes INSERT policy overlap check
SQL:
```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='notes' AND cmd='INSERT'
ORDER BY policyname;
```

Raw output:
```text
[{"policyname":"notes_insert_author_only","cmd":"INSERT","qual":null,"with_check":"((auth.uid() = from_user_id) AND ((group_id IS NULL) OR (EXISTS ( SELECT 1\n   FROM groups g\n  WHERE ((g.id = notes.group_id) AND (g.coach_id = auth.uid()))))))"},{"policyname":"notes_student_insert_author_member","cmd":"INSERT","qual":null,"with_check":"((auth.uid() = from_user_id) AND ((group_id IS NULL) OR (EXISTS ( SELECT 1\n   FROM ( SELECT gm.group_id AS member_group_id,\n            gm.user_id\n           FROM group_members gm) m\n  WHERE ((m.member_group_id = notes.group_id) AND (m.user_id = auth.uid()))))))"}]
```

Overlap finding:
- Existing `notes_insert_author_only` *did* cover `group_id IS NULL` cases pre-hotfix.
- That overlap bypassed the intended student self-scope and coach relationship-scope constraints.

---

## B/C/D) SQL applied

### B) Student notes policies replacement (self-scoped + membership)
```sql
DROP POLICY IF EXISTS notes_student_insert_author_member ON public.notes;
DROP POLICY IF EXISTS notes_student_update_author_member ON public.notes;
DROP POLICY IF EXISTS notes_student_delete_author_member ON public.notes;

CREATE POLICY notes_student_insert_self_scoped
ON public.notes
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'student'
  )
  AND auth.uid() = from_user_id
  AND to_user_id = auth.uid()
  AND (
    group_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = notes.group_id AND gm.user_id = auth.uid()
    )
  )
);

CREATE POLICY notes_student_update_self_scoped
ON public.notes
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'student'
  )
  AND auth.uid() = from_user_id
  AND to_user_id = auth.uid()
  AND (
    group_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = notes.group_id AND gm.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'student'
  )
  AND auth.uid() = from_user_id
  AND to_user_id = auth.uid()
  AND (
    group_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = notes.group_id AND gm.user_id = auth.uid()
    )
  )
);

CREATE POLICY notes_student_delete_self_scoped
ON public.notes
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'student'
  )
  AND auth.uid() = from_user_id
  AND to_user_id = auth.uid()
  AND (
    group_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = notes.group_id AND gm.user_id = auth.uid()
    )
  )
);
```

### C) Coach direct-note INSERT (relationship-scoped)
```sql
DROP POLICY IF EXISTS notes_coach_insert_direct_student ON public.notes;

CREATE POLICY notes_coach_insert_direct_student
ON public.notes
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'coach'
  )
  AND auth.uid() = from_user_id
  AND group_id IS NULL
  AND to_user_id IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.instructor_students ist
      WHERE ist.instructor_id = auth.uid()
        AND ist.student_id = to_user_id
    )
    OR EXISTS (
      SELECT 1 FROM public.groups g
      JOIN public.group_members gm ON gm.group_id = g.id
      WHERE g.coach_id = auth.uid()
        AND gm.user_id = to_user_id
    )
  )
);
```

### Additional overlap correction required by A.4 finding
```sql
DROP POLICY IF EXISTS notes_insert_author_only ON public.notes;

CREATE POLICY notes_insert_author_only
ON public.notes
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'coach'
  )
  AND auth.uid() = from_user_id
  AND group_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = notes.group_id AND g.coach_id = auth.uid()
  )
);
```

### D) `accept_invite` hardening + grants
```sql
CREATE OR REPLACE FUNCTION public.accept_invite(p_join_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_session RECORD;
  v_student_id UUID := auth.uid();
  v_student_role TEXT;
BEGIN
  IF v_student_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
  END IF;

  SELECT p.role INTO v_student_role
  FROM public.profiles p
  WHERE p.user_id = v_student_id;

  IF COALESCE(v_student_role, '') <> 'student' THEN
    RETURN json_build_object('success', false, 'error', 'Only students can join classes');
  END IF;

  SELECT * INTO v_session
  FROM public.class_sessions cs
  WHERE cs.join_code = UPPER(p_join_code)
    AND cs.is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invite code');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.instructor_students ist
    WHERE ist.instructor_id = v_session.coach_id
      AND ist.student_id = v_student_id
  ) THEN
    UPDATE public.instructor_students ist
    SET class_session_id = v_session.id
    WHERE ist.instructor_id = v_session.coach_id
      AND ist.student_id = v_student_id;

    RETURN json_build_object(
      'success', true,
      'message', 'Updated class connection',
      'instructor_id', v_session.coach_id,
      'class_name', v_session.name
    );
  END IF;

  INSERT INTO public.instructor_students (instructor_id, student_id, class_session_id)
  VALUES (v_session.coach_id, v_student_id, v_session.id);

  RETURN json_build_object(
    'success', true,
    'message', 'Successfully joined class',
    'instructor_id', v_session.coach_id,
    'class_name', v_session.name
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.accept_invite(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_invite(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.accept_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invite(text) TO service_role;
```

---

## E) Verification tests (raw outputs + result)

### E.1 Student self-note NULL group (MUST SUCCEED)
Raw output:
```text
[{"id":"69bcfdc7-c657-49dc-9621-1515c1620485"}]
```
Result: PASS

### E.2 Student self-note with member group (MUST SUCCEED)
Raw output:
```text
[{"id":"5a26996f-68fc-430e-b2e6-6bd1721dcef6"}]
```
Result: PASS

### E.3 Student NULL-group note to OTHER user (MUST FAIL)
Raw output:
```text
{"error":{"name":"HttpException","message":"Failed to run sql query: ERROR:  42501: new row violates row-level security policy for table \"notes\"\n"}}
```
Result: PASS (expected failure)

### E.4 Coach direct note to a student they teach (MUST SUCCEED)
Relationship proof (STUDENT_A):
```text
[{"coach_group_link":true,"coach_instructor_link":false}]
```

Insert raw output:
```text
[{"id":"d37d9f97-479d-4528-ba69-5abb5994a101"}]
```
Result: PASS

### E.5 Coach direct note to UNRELATED student (MUST FAIL)
Pre-verify STUDENT_B relationship:
```text
[{"coach_group_link":false,"coach_instructor_link":false}]
```

Insert raw output:
```text
{"error":{"name":"HttpException","message":"Failed to run sql query: ERROR:  42501: new row violates row-level security policy for table \"notes\"\n"}}
```
Result: PASS (expected failure)

### E.6 `accept_invite` grants fixed
Raw output:
```text
[{"grantee":"authenticated","privilege_type":"EXECUTE"},{"grantee":"postgres","privilege_type":"EXECUTE"},{"grantee":"service_role","privilege_type":"EXECUTE"}]
```
Result: PASS

### E.7 `accept_invite` cannot be called by `anon` (MUST FAIL)
Raw output:
```text
{"error":{"name":"HttpException","message":"Failed to run sql query: ERROR:  42501: permission denied for function accept_invite\n"}}
```
Result: PASS (expected failure)

### E.8 `accept_invite` called by coach returns rejection
Raw output:
```text
[{"result":{"success":false,"error":"Only students can join classes"}}]
```
Result: PASS

### E.9 `accept_invite` definition dump (AFTER)
Raw output:
```text
[{"def":"CREATE OR REPLACE FUNCTION public.accept_invite(p_join_code text)\n RETURNS json\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'pg_catalog', 'public'\nAS $function$\nDECLARE\n  v_session RECORD;\n  v_student_id UUID := auth.uid();\n  v_student_role TEXT;\nBEGIN\n  IF v_student_id IS NULL THEN\n    RETURN json_build_object('success', false, 'error', 'Authentication required');\n  END IF;\n\n  SELECT p.role INTO v_student_role\n  FROM public.profiles p\n  WHERE p.user_id = v_student_id;\n\n  IF COALESCE(v_student_role, '') <> 'student' THEN\n    RETURN json_build_object('success', false, 'error', 'Only students can join classes');\n  END IF;\n\n  SELECT * INTO v_session\n  FROM public.class_sessions cs\n  WHERE cs.join_code = UPPER(p_join_code)\n    AND cs.is_active = true;\n\n  IF NOT FOUND THEN\n    RETURN json_build_object('success', false, 'error', 'Invalid or expired invite code');\n  END IF;\n\n  IF EXISTS (\n    SELECT 1 FROM public.instructor_students ist\n    WHERE ist.instructor_id = v_session.coach_id\n      AND ist.student_id = v_student_id\n  ) THEN\n    UPDATE public.instructor_students ist\n    SET class_session_id = v_session.id\n    WHERE ist.instructor_id = v_session.coach_id\n      AND ist.student_id = v_student_id;\n\n    RETURN json_build_object(\n      'success', true,\n      'message', 'Updated class connection',\n      'instructor_id', v_session.coach_id,\n      'class_name', v_session.name\n    );\n  END IF;\n\n  INSERT INTO public.instructor_students (instructor_id, student_id, class_session_id)\n  VALUES (v_session.coach_id, v_student_id, v_session.id);\n\n  RETURN json_build_object(\n    'success', true,\n    'message', 'Successfully joined class',\n    'instructor_id', v_session.coach_id,\n    'class_name', v_session.name\n  );\nEND;\n$function$\n"}]
```
Result: PASS (`search_path`, `COALESCE`, `auth.uid()` NULL guard present)

### E.10 Rollback persistence check
Raw output:
```text
[{"persisted_hotfix_rows":0}]
```
Result: PASS

---

## F) AFTER snapshots (raw outputs)

### F.1 Notes policies
SQL:
```sql
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='notes'
ORDER BY policyname, cmd;
```

Raw output:
```text
[{"policyname":"Group members can view shared notes","cmd":"SELECT","roles":"{authenticated}","qual":"((from_user_id = auth.uid()) OR (to_user_id = auth.uid()) OR ((visibility = 'shared'::text) AND (EXISTS ( SELECT 1\n   FROM group_members gm\n  WHERE ((gm.group_id = notes.group_id) AND (gm.user_id = auth.uid()))))))","with_check":null},{"policyname":"Users can view notes they sent or received","cmd":"SELECT","roles":"{authenticated}","qual":"((auth.uid() = from_user_id) OR (auth.uid() = to_user_id))","with_check":null},{"policyname":"notes_coach_insert_direct_student","cmd":"INSERT","roles":"{authenticated}","qual":null,"with_check":"((EXISTS ( SELECT 1\n   FROM profiles p\n  WHERE ((p.user_id = auth.uid()) AND (p.role = 'coach'::text)))) AND (auth.uid() = from_user_id) AND (group_id IS NULL) AND (to_user_id IS NOT NULL) AND ((EXISTS ( SELECT 1\n   FROM instructor_students ist\n  WHERE ((ist.instructor_id = auth.uid()) AND (ist.student_id = notes.to_user_id)))) OR (EXISTS ( SELECT 1\n   FROM (groups g\n     JOIN group_members gm ON ((gm.group_id = g.id)))\n  WHERE ((g.coach_id = auth.uid()) AND (gm.user_id = notes.to_user_id))))))"},{"policyname":"notes_delete_author_only","cmd":"DELETE","roles":"{authenticated}","qual":"((auth.uid() = from_user_id) AND ((group_id IS NULL) OR (EXISTS ( SELECT 1\n   FROM groups g\n  WHERE ((g.id = notes.group_id) AND (g.coach_id = auth.uid()))))))","with_check":null},{"policyname":"notes_insert_author_only","cmd":"INSERT","roles":"{authenticated}","qual":null,"with_check":"((EXISTS ( SELECT 1\n   FROM profiles p\n  WHERE ((p.user_id = auth.uid()) AND (p.role = 'coach'::text)))) AND (auth.uid() = from_user_id) AND (group_id IS NOT NULL) AND (EXISTS ( SELECT 1\n   FROM groups g\n  WHERE ((g.id = notes.group_id) AND (g.coach_id = auth.uid())))))"},{"policyname":"notes_select_coach_scope","cmd":"SELECT","roles":"{authenticated}","qual":"((from_user_id = auth.uid()) OR ((group_id IS NOT NULL) AND (EXISTS ( SELECT 1\n   FROM groups g\n  WHERE ((g.id = notes.group_id) AND (g.coach_id = auth.uid()))))))","with_check":null},{"policyname":"notes_student_delete_self_scoped","cmd":"DELETE","roles":"{authenticated}","qual":"((EXISTS ( SELECT 1\n   FROM profiles p\n  WHERE ((p.user_id = auth.uid()) AND (p.role = 'student'::text)))) AND (auth.uid() = from_user_id) AND (to_user_id = auth.uid()) AND ((group_id IS NULL) OR (EXISTS ( SELECT 1\n   FROM group_members gm\n  WHERE ((gm.group_id = notes.group_id) AND (gm.user_id = auth.uid()))))))","with_check":null},{"policyname":"notes_student_insert_self_scoped","cmd":"INSERT","roles":"{authenticated}","qual":null,"with_check":"((EXISTS ( SELECT 1\n   FROM profiles p\n  WHERE ((p.user_id = auth.uid()) AND (p.role = 'student'::text)))) AND (auth.uid() = from_user_id) AND (to_user_id = auth.uid()) AND ((group_id IS NULL) OR (EXISTS ( SELECT 1\n   FROM group_members gm\n  WHERE ((gm.group_id = notes.group_id) AND (gm.user_id = auth.uid()))))))"},{"policyname":"notes_student_update_self_scoped","cmd":"UPDATE","roles":"{authenticated}","qual":"((EXISTS ( SELECT 1\n   FROM profiles p\n  WHERE ((p.user_id = auth.uid()) AND (p.role = 'student'::text)))) AND (auth.uid() = from_user_id) AND (to_user_id = auth.uid()) AND ((group_id IS NULL) OR (EXISTS ( SELECT 1\n   FROM group_members gm\n  WHERE ((gm.group_id = notes.group_id) AND (gm.user_id = auth.uid()))))))","with_check":"((EXISTS ( SELECT 1\n   FROM profiles p\n  WHERE ((p.user_id = auth.uid()) AND (p.role = 'student'::text)))) AND (auth.uid() = from_user_id) AND (to_user_id = auth.uid()) AND ((group_id IS NULL) OR (EXISTS ( SELECT 1\n   FROM group_members gm\n  WHERE ((gm.group_id = notes.group_id) AND (gm.user_id = auth.uid()))))))"},{"policyname":"notes_update_author_only","cmd":"UPDATE","roles":"{authenticated}","qual":"((auth.uid() = from_user_id) AND ((group_id IS NULL) OR (EXISTS ( SELECT 1\n   FROM groups g\n  WHERE ((g.id = notes.group_id) AND (g.coach_id = auth.uid()))))))","with_check":"((auth.uid() = from_user_id) AND ((group_id IS NULL) OR (EXISTS ( SELECT 1\n   FROM groups g\n  WHERE ((g.id = notes.group_id) AND (g.coach_id = auth.uid()))))))"},{"policyname":"parent_select_notes","cmd":"SELECT","roles":"{authenticated}","qual":"((to_user_id IN ( SELECT get_linked_children(auth.uid()) AS get_linked_children)) OR ((group_id IN ( SELECT group_members.group_id\n   FROM group_members\n  WHERE (group_members.user_id IN ( SELECT get_linked_children(auth.uid()) AS get_linked_children)))) AND (to_user_id IS NULL)))","with_check":null}]
```

### F.2 Notes policy count
SQL:
```sql
SELECT COUNT(*) AS notes_policy_count
FROM pg_policies
WHERE schemaname='public' AND tablename='notes';
```

Raw output:
```text
[{"notes_policy_count":11}]
```

### F.3 Total policy count
SQL:
```sql
SELECT COUNT(*) AS total_policy_count
FROM pg_policies
WHERE schemaname='public';
```

Raw output:
```text
[{"total_policy_count":74}]
```

Policy diff summary:
- Dropped: `notes_student_insert_author_member`, `notes_student_update_author_member`, `notes_student_delete_author_member`
- Added: `notes_student_insert_self_scoped`, `notes_student_update_self_scoped`, `notes_student_delete_self_scoped`, `notes_coach_insert_direct_student`
- Replaced-in-place (same name): `notes_insert_author_only` (now coach-only + group-only)
- Expected total change from baseline 73: `+1` (actual after count = `74`)

### F.4 `accept_invite` definition + grants
Signature raw output:
```text
[{"schema":"public","proname":"accept_invite","args":"p_join_code text","security_definer":true}]
```

Definition raw output:
```text
[{"def":"CREATE OR REPLACE FUNCTION public.accept_invite(p_join_code text)\n RETURNS json\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'pg_catalog', 'public'\nAS $function$\nDECLARE\n  v_session RECORD;\n  v_student_id UUID := auth.uid();\n  v_student_role TEXT;\nBEGIN\n  IF v_student_id IS NULL THEN\n    RETURN json_build_object('success', false, 'error', 'Authentication required');\n  END IF;\n\n  SELECT p.role INTO v_student_role\n  FROM public.profiles p\n  WHERE p.user_id = v_student_id;\n\n  IF COALESCE(v_student_role, '') <> 'student' THEN\n    RETURN json_build_object('success', false, 'error', 'Only students can join classes');\n  END IF;\n\n  SELECT * INTO v_session\n  FROM public.class_sessions cs\n  WHERE cs.join_code = UPPER(p_join_code)\n    AND cs.is_active = true;\n\n  IF NOT FOUND THEN\n    RETURN json_build_object('success', false, 'error', 'Invalid or expired invite code');\n  END IF;\n\n  IF EXISTS (\n    SELECT 1 FROM public.instructor_students ist\n    WHERE ist.instructor_id = v_session.coach_id\n      AND ist.student_id = v_student_id\n  ) THEN\n    UPDATE public.instructor_students ist\n    SET class_session_id = v_session.id\n    WHERE ist.instructor_id = v_session.coach_id\n      AND ist.student_id = v_student_id;\n\n    RETURN json_build_object(\n      'success', true,\n      'message', 'Updated class connection',\n      'instructor_id', v_session.coach_id,\n      'class_name', v_session.name\n    );\n  END IF;\n\n  INSERT INTO public.instructor_students (instructor_id, student_id, class_session_id)\n  VALUES (v_session.coach_id, v_student_id, v_session.id);\n\n  RETURN json_build_object(\n    'success', true,\n    'message', 'Successfully joined class',\n    'instructor_id', v_session.coach_id,\n    'class_name', v_session.name\n  );\nEND;\n$function$\n"}]
```

Grants raw output:
```text
[{"grantee":"authenticated","privilege_type":"EXECUTE"},{"grantee":"postgres","privilege_type":"EXECUTE"},{"grantee":"service_role","privilege_type":"EXECUTE"}]
```

---

## G) Build regression
Command:
```bash
npm run build
```

Full raw output:
```text
> vite_react_shadcn_ts@0.0.0 build
> vite build

vite v5.4.21 building for production...
transforming...
✓ 2844 modules transformed.
rendering chunks...
computing gzip size...
dist/registerSW.js                            0.13 kB
dist/manifest.webmanifest                     0.49 kB
dist/assets/polyfills-legacy-BoAodCTE.js    155.11 kB │ gzip:  60.92 kB
dist/assets/index-legacy-DRNmtdtN.js      1,438.72 kB │ gzip: 357.24 kB

(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
dist/registerSW.js                     0.13 kB
dist/manifest.webmanifest              0.49 kB
dist/index.html                        3.90 kB │ gzip:   1.41 kB
dist/assets/index-CfJihXv5.css       111.67 kB │ gzip:  18.02 kB
dist/assets/polyfills-YDrhCOtM.js    110.14 kB │ gzip:  44.16 kB
dist/assets/index-CrkmULfX.js      1,140.02 kB │ gzip: 315.94 kB

(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 39.39s

PWA v1.2.0
mode      generateSW
precache  18 entries (3188.94 KiB)
files generated
  dist/sw.js
  dist/workbox-1d305bb8.js
```

Build result: PASS

---

## Chunk 7 / Chunk 8 carry-forwards
- Chunk 7: audit whether `notes_update_author_only` and `notes_delete_author_only` should be role-scoped like insert, to avoid unintended cross-role overlap on legacy rows.
- Chunk 8: convert this execute_sql hotfix into tracked SQL migration files for schema-history reproducibility in CI/prod promotion.

