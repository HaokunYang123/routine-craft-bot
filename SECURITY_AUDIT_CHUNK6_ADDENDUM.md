# SECURITY AUDIT CHUNK 6 ADDENDUM

Project: `TeachCoachConnect`  
Supabase project: `vjzaayxeoeojuccbriid`  
Date: 2026-02-19

Scope in this addendum:
- Prove `instructor_students` `INSERT` policy remains removed.
- Prove frontend has no direct `instructor_students` writes.
- Prove current `notes` NULL-group semantics behavior with real RLS test.
- Audit `accept_invite` RPC trust boundary.
- Re-check `class_sessions` visibility.

No policy/function changes were applied in this addendum.

## A) `instructor_students` INSERT is gone

### A.1 Policy list
SQL:
```sql
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='instructor_students'
ORDER BY cmd, policyname;
```

Raw output:
```text
[{"tablename":"instructor_students","policyname":"Instructors can view their students","cmd":"SELECT","roles":"{authenticated}","qual":"(auth.uid() = instructor_id)","with_check":null},{"tablename":"instructor_students","policyname":"Students can view their instructors","cmd":"SELECT","roles":"{authenticated}","qual":"(auth.uid() = student_id)","with_check":null}]
```

### A.2 INSERT policy count
SQL:
```sql
SELECT COUNT(*) AS insert_policies
FROM pg_policies
WHERE schemaname='public' AND tablename='instructor_students' AND cmd='INSERT';
```

Raw output:
```text
[{"insert_policies":0}]
```

Result: PASS (`INSERT` policies = 0).

## B) Frontend proof: no direct `instructor_students` writes

Command:
```bash
rg -n "from\\(['\"]instructor_students['\"]\\)\\.(insert|upsert|update|delete)" src -g '*.ts' -g '*.tsx' || true
```

Raw output:
```text

```

Command:
```bash
rg -n "instructor_students.*\\.(insert|upsert|update|delete)" src -g '*.ts' -g '*.tsx' || true
```

Raw output:
```text

```

Result: PASS (no direct write callsites found).

## C) `notes` NULL-group semantics verification

### C.1 Frontend evidence: notes write callsites
Command:
```bash
rg -n "from\\(['\"]notes['\"]\\)\\.(insert|upsert|update|delete)" src -g '*.ts' -g '*.tsx' || true
```

Raw output:
```text
src/pages/AssignerDashboard.tsx:345:      const { error } = await supabase.from("notes").insert({
src/pages/GroupDetail.tsx:387:            const { error } = await supabase.from("notes").insert({
```

Excerpt (`src/pages/AssignerDashboard.tsx`, ±15 lines):
```text

    if (result !== null) {
      // Success - close dialog and reset form
      setAssignDialogOpen(false);
      resetAssignForm();
      // Refresh dashboard data
      fetchDashboardData();
    }
  };

  const sendNote = async () => {
    if (!selectedStudent || !noteContent.trim() || !user) return;
    setSendingNote(true);

    try {
      const { error } = await supabase.from("notes").insert({
        from_user_id: user.id,
        to_user_id: selectedStudent.id,
        content: noteContent.trim(),
        visibility: "shared",
      });

      if (error) throw error;

      toast({
        title: "Note Sent",
        description: `Your note has been sent to ${selectedStudent.name}`,
      });

      setNoteDialogOpen(false);
      setNoteContent("");
```

Excerpt (`src/pages/GroupDetail.tsx`, ±15 lines):
```text
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [groupId]);

    const handleSendNote = async () => {
        if (!newNote.trim() || !user || !groupId) return;
        setSendingNote(true);

        try {
            const targetStudentId = noteTargetStudent === "all" ? null : noteTargetStudent;
            const { error } = await supabase.from("notes").insert({
                group_id: groupId,
                from_user_id: user.id,
                to_user_id: targetStudentId,
                content: newNote.trim(),
                title: newNoteTitle.trim() || null,
                visibility: "shared" // Always shared, targeting handled by to_user_id
            });

            if (error) throw error;

            const targetName = targetStudentId
                ? students.find(s => s.student_id === targetStudentId)?.display_name || "student"
                : "all students";
            toast({ title: "Note Posted", description: `Your note has been sent to ${targetName}.` });
            setNewNote("");
```

### C.2 DB negative test: student NULL-group note to another user
SQL:
```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', '7a25bc24-1867-4678-a6b7-1b94cb6683a5'), true);

-- Attempt: NULL group note to another user
INSERT INTO public.notes (from_user_id, to_user_id, content, group_id)
VALUES ('7a25bc24-1867-4678-a6b7-1b94cb6683a5',
        '1870b97b-362c-4258-8878-d31aca20f983',
        'chunk6 addendum test: null group to other user',
        NULL);
ROLLBACK;
```

Raw output:
```text
[{"set_config":"{\"sub\":\"7a25bc24-1867-4678-a6b7-1b94cb6683a5\",\"role\":\"authenticated\"}"}]
```

Observed behavior: SUCCEEDS (no RLS error thrown).

Additional proof with `RETURNING id`:
```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', '7a25bc24-1867-4678-a6b7-1b94cb6683a5'), true);
INSERT INTO public.notes (from_user_id, to_user_id, content, group_id)
VALUES ('7a25bc24-1867-4678-a6b7-1b94cb6683a5',
        '1870b97b-362c-4258-8878-d31aca20f983',
        'chunk6 addendum test: null group to other user (returning)',
        NULL)
RETURNING id;
ROLLBACK;
```

Raw output:
```text
[{"id":"82f2db8f-0397-43f1-9578-176ed047be06"}]
```

Persistence check:
```sql
SELECT COUNT(*) AS persisted_rows
FROM public.notes
WHERE content LIKE 'chunk6 addendum test:%';
```

Raw output:
```text
[{"persisted_rows":0}]
```

Assessment:
- This is a least-privilege risk if students are not intended to DM arbitrary users via NULL-group notes.
- Frontend evidence shows NULL-group note sends exist (`AssignerDashboard`), but those callsites are coach-context.
- No student note-write callsite was found in this addendum’s grep.

## D) `accept_invite` RPC trust-boundary audit

### D.1 Signature
SQL:
```sql
SELECT n.nspname AS schema, p.proname, pg_get_function_identity_arguments(p.oid) AS args,
       p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public' AND p.proname='accept_invite';
```

Raw output:
```text
[{"schema":"public","proname":"accept_invite","args":"p_join_code text","security_definer":true}]
```

### D.2 Definition
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

### D.3 EXECUTE privileges
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

### D.4 Negative call test under STUDENT_A
Baseline count:
```sql
SELECT COUNT(*) AS rows_created
FROM public.instructor_students
WHERE student_id = '7a25bc24-1867-4678-a6b7-1b94cb6683a5';
```

Raw output:
```text
[{"rows_created":0}]
```

Call test:
```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}','7a25bc24-1867-4678-a6b7-1b94cb6683a5'), true);
SELECT public.accept_invite('invalid') AS result;
ROLLBACK;
```

Raw output:
```text
[{"result":{"success":false,"error":"Invalid or expired invite code"}}]
```

Post-check:
```sql
SELECT COUNT(*) AS rows_created
FROM public.instructor_students
WHERE student_id = '7a25bc24-1867-4678-a6b7-1b94cb6683a5';
```

Raw output:
```text
[{"rows_created":0}]
```

Assessment:
- Invalid input path is safe in this test (no row created).
- Trust-boundary hardening still needed: `PUBLIC`/`anon` execute grants are present on a `SECURITY DEFINER` function.

## E) `class_sessions` explicit negative check

Step 1 SQL:
```sql
SELECT id FROM public.class_sessions LIMIT 1;
```

Raw output:
```text
[]
```

Dataset check SQL:
```sql
SELECT COUNT(*) AS class_session_rows FROM public.class_sessions;
```

Raw output:
```text
[{"class_session_rows":0}]
```

Result:
- No `class_sessions` rows exist, so the exact “known id invisibility” test cannot be executed in this environment.
- With zero rows, student visibility remains effectively default-deny for this table in current data state.

## F) Conclusions

1. `instructor_students` insert-policy removal remains in effect and frontend has no direct writes: non-breaking based on current code evidence.
2. `accept_invite` invalid-input behavior is safe in tested path, but least-privilege hardening is still recommended because `EXECUTE` is granted to `PUBLIC` and `anon` on `SECURITY DEFINER`.
3. NULL-group notes to another user are currently allowed under student auth context; this is a least-privilege violation unless explicitly intended.
4. Minimal tightening proposal (for next hotfix) if product confirms students should not DM arbitrary users:
- Update student notes insert/update/delete policies so `group_id IS NULL` requires relationship scope (for example `instructor_students`, `parent_children`, or same-user self-note only), instead of unrestricted recipient targeting.
- Keep coach workflows intact by scoping changes to student-specific policies only.

Overall addendum status: REVIEW REQUIRED (not full PASS) due to items 2 and 3.
