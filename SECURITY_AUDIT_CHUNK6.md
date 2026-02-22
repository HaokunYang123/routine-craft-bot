# Security Audit Report — Chunk 6: Student Role RLS Hardening
**Date:** 2026-02-19  
**Auditor:** Codex  
**Project:** TeachCoachConnect (`vjzaayxeoeojuccbriid`)  
**Scope:** Student role access hardening (6A/6B/6C)

All database reads/writes in this report were executed via Supabase MCP `execute_sql`.

## Summary
- Added student author/membership write policies for `notes`.
- Removed unsafe student self-link insert path on `instructor_students`.
- Kept `class_sessions` student direct `SELECT` denied (no student direct table-read need found in frontend).
- Kept `assignments` visibility as assignee-or-group-membership to preserve student task joins.
- Verified student cross-tenant isolation with JWT claim impersonation.

## 6A — Audit: Student-effective Access

### 6A.1 BEFORE policy snapshots + counts
BEFORE snapshot query (full row snapshot):
```sql
WITH before_snapshot AS (
  SELECT tablename, policyname, cmd, roles, qual, with_check
  FROM pg_policies
  WHERE schemaname='public'
    AND policyname NOT LIKE 'notes_student_%'
  UNION ALL
  SELECT
    'instructor_students'::text AS tablename,
    'System can insert relationships'::text AS policyname,
    'INSERT'::text AS cmd,
    ARRAY['authenticated']::name[] AS roles,
    NULL::text AS qual,
    '(auth.uid() = student_id)'::text AS with_check
)
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM before_snapshot
ORDER BY tablename, policyname, cmd;
```

BEFORE counts:
```sql
WITH before_snapshot AS (
  SELECT tablename, policyname
  FROM pg_policies
  WHERE schemaname='public'
    AND policyname NOT LIKE 'notes_student_%'
  UNION ALL
  SELECT 'instructor_students'::text AS tablename, 'System can insert relationships'::text AS policyname
)
SELECT tablename, COUNT(*) AS policy_count
FROM before_snapshot
GROUP BY tablename
ORDER BY tablename;
```

```text
[
  {"tablename":"assignments","policy_count":2},
  {"tablename":"chat_messages","policy_count":3},
  {"tablename":"class_members","policy_count":3},
  {"tablename":"class_sessions","policy_count":3},
  {"tablename":"group_members","policy_count":4},
  {"tablename":"groups","policy_count":2},
  {"tablename":"instructor_students","policy_count":3},
  {"tablename":"notes","policy_count":7},
  {"tablename":"parent_children","policy_count":3},
  {"tablename":"parent_links","policy_count":1},
  {"tablename":"people","policy_count":4},
  {"tablename":"profiles","policy_count":5},
  {"tablename":"recurring_schedules","policy_count":5},
  {"tablename":"routines","policy_count":4},
  {"tablename":"stickers","policy_count":1},
  {"tablename":"student_logs","policy_count":3},
  {"tablename":"task_instances","policy_count":4},
  {"tablename":"tasks","policy_count":4},
  {"tablename":"template_tasks","policy_count":4},
  {"tablename":"templates","policy_count":4},
  {"tablename":"user_stickers","policy_count":2}
]
```

```sql
WITH before_snapshot AS (
  SELECT tablename, policyname
  FROM pg_policies
  WHERE schemaname='public'
    AND policyname NOT LIKE 'notes_student_%'
  UNION ALL
  SELECT 'instructor_students'::text AS tablename, 'System can insert relationships'::text AS policyname
)
SELECT COUNT(*) AS total_policy_count_before_reconstructed
FROM before_snapshot;
```

```text
[{"total_policy_count_before_reconstructed":71}]
```

### 6A.2 Broad SELECT scan (student risk surface)
```sql
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public'
  AND cmd='SELECT'
  AND (
    qual ILIKE '%auth.role()%authenticated%'
    OR qual='true'
    OR qual ILIKE '%is_active = true%'
  )
ORDER BY tablename, policyname;
```

```text
[{"tablename":"stickers","policyname":"Anyone can view stickers","cmd":"SELECT","roles":"{authenticated}","qual":"(auth.role() = 'authenticated'::text)","with_check":null}]
```

### 6A.3 Frontend grep — student flows
Commands run:
```bash
rg -n "from\(['\"]class_sessions['\"]\)" src -g '*.ts' -g '*.tsx' || true
rg -n "from\(['\"]class_members['\"]\)" src -g '*.ts' -g '*.tsx' || true
rg -n "from\(['\"]instructor_students['\"]\)" src -g '*.ts' -g '*.tsx' || true
rg -n "from\(['\"]notes['\"]\)" src -g '*.ts' -g '*.tsx' || true
rg -n "from\(['\"]assignments['\"]\)" src -g '*.ts' -g '*.tsx' || true
rg -n "from\(['\"]task_instances['\"]\)" src -g '*.ts' -g '*.tsx' || true
rg -n "rpc\(['\"](validate_join_code|join_group_by_code|accept_invite|l_parent_code)['\"]\)" src -g '*.ts' -g '*.tsx' || true
```

Key matches:
```text
class_sessions:
- src/pages/People.tsx:159
- src/pages/RecurringSchedules.tsx:113
- src/pages/Assistant.tsx:153
- src/hooks/useRecurringSchedules.ts:70
- src/hooks/useInfiniteClients.ts:43

class_members:
- src/hooks/useClassCode.ts:63

instructor_students:
- src/pages/People.tsx:108
- src/pages/RecurringSchedules.tsx:121
- src/pages/AssignerDashboard.tsx:193
- src/components/student/InstructorsList.tsx:35

notes:
- src/pages/AssigneeDashboard.tsx:136,148
- src/pages/student/StudentHome.tsx:292,304
- src/pages/GroupDetail.tsx:275,387,460
- src/pages/AssignerDashboard.tsx:345
- src/pages/ParentDashboard.tsx:286,310
- src/hooks/useGroups.ts:166

assignments:
- src/pages/GroupDetail.tsx:438
- src/components/assignments/AssignTaskModal.tsx:343,351,478,517
- src/hooks/useAssignments.ts:124,355,614,672
- src/hooks/useGroups.ts:143,159

task_instances:
- student pages: src/pages/student/StudentHome.tsx, src/pages/student/StudentCalendar.tsx, src/pages/student/StudentSchedule.tsx, src/pages/AssigneeDashboard.tsx
- coach/other pages: src/pages/CoachCalendar.tsx, src/pages/GroupDetail.tsx, src/pages/AssignerDashboard.tsx, hooks/components

rpc(...) exact-pattern output:
- no matches (pattern requires immediate closing parenthesis form)
```

Supplemental RPC evidence:
```bash
rg -n "join_group_by_code|validate_join_code|accept_invite|link_child_by_parent_code" src -g '*.ts' -g '*.tsx' || true
```

```text
src/hooks/useClassCode.ts:26: .rpc("validate_join_code", ...)
src/components/student/JoinInstructor.tsx:30: .rpc("accept_invite", ...)
src/pages/JoinGroup.tsx:65: .rpc("join_group_by_code", ...)
src/pages/student/StudentHome.tsx:390: .rpc("join_group_by_code", ...)
src/pages/ParentDashboard.tsx:436: "link_child_by_parent_code"
```

Student-context vs coach-context labeling:
- Student-context: `useClassCode.ts` (`class_members` insert), `components/student/InstructorsList.tsx` (`instructor_students` select), `student/*` + `AssigneeDashboard.tsx` note/task reads.
- Coach-context: `People.tsx`, `RecurringSchedules.tsx`, `Assistant.tsx`, `useInfiniteClients.ts`, `GroupDetail.tsx`, `AssignTaskModal.tsx`, `useAssignments.ts`.
- Parent-context: `ParentDashboard.tsx`.

### 6A.4 Test identities
Prompt query for student/coach pairs via `instructor_students`:
```sql
SELECT p.user_id AS student_id,
       ist.instructor_id AS coach_id
FROM public.profiles p
JOIN public.instructor_students ist ON ist.student_id = p.user_id
WHERE p.role='student'
LIMIT 8;
```

```text
[]
```

Fallback (real memberships via `group_members -> groups`):
```sql
SELECT DISTINCT gm.user_id AS student_id, g.coach_id
FROM public.group_members gm
JOIN public.groups g ON g.id = gm.group_id
JOIN public.profiles p ON p.user_id = gm.user_id
WHERE p.role = 'student'
ORDER BY g.coach_id, gm.user_id
LIMIT 20;
```

```text
[
  {"student_id":"7a25bc24-1867-4678-a6b7-1b94cb6683a5","coach_id":"47f98af9-68c4-49c6-a034-2064694daaca"},
  {"student_id":"1870b97b-362c-4258-8878-d31aca20f983","coach_id":"67dc4cb8-626e-4e4b-a6b5-0f81b7207e6f"}
]
```

Chosen identities:
- `STUDENT_A = 7a25bc24-1867-4678-a6b7-1b94cb6683a5`
- `STUDENT_B = 1870b97b-362c-4258-8878-d31aca20f983`

Group IDs for tests:
```sql
SELECT gm.group_id
FROM public.group_members gm
WHERE gm.user_id = '7a25bc24-1867-4678-a6b7-1b94cb6683a5'
LIMIT 1;
```
```text
[{"group_id":"b3ca3a8c-9d64-4954-bf88-6dfe87d1f728"}]
```

```sql
SELECT g.id
FROM public.groups g
WHERE NOT EXISTS (
  SELECT 1 FROM public.group_members gm
  WHERE gm.group_id = g.id AND gm.user_id = '7a25bc24-1867-4678-a6b7-1b94cb6683a5'
)
LIMIT 1;
```
```text
[{"id":"2455fa68-55f9-4962-987d-295fe76d227d"}]
```

Optional `class_members` probe:
```sql
SELECT cm.user_id, cm.class_session_id
FROM public.class_members cm
LIMIT 1;
```
```text
[]
```

### 6A.5 Audit table: every policy categorized
Query used:
```sql
SELECT tablename,
       policyname,
       cmd,
       CASE
         WHEN cmd='SELECT' AND (
           COALESCE(qual,'') ILIKE '%auth.role()%' OR COALESCE(qual,'')='true' OR COALESCE(qual,'') ILIKE '%is_active = true%'
         ) THEN 'Broad'
         WHEN (COALESCE(qual,'') || ' ' || COALESCE(with_check,'')) ~* '(group_members|class_members|instructor_students|parent_children|get_linked_children|is_group_member)' THEN 'Membership-scoped'
         WHEN (COALESCE(qual,'') || ' ' || COALESCE(with_check,'')) ~* '(coach_id|instructor_id|assigned_by|templates\.coach_id|groups\.coach_id)' THEN 'Coach-owned'
         WHEN (COALESCE(qual,'') || ' ' || COALESCE(with_check,'')) ~* '(auth\.uid\(\) = user_id|user_id = auth\.uid\(\)|auth\.uid\(\) = student_id|student_id = auth\.uid\(\)|auth\.uid\(\) = assignee_id|assignee_id = auth\.uid\(\)|auth\.uid\(\) = from_user_id|from_user_id = auth\.uid\(\)|auth\.uid\(\) = to_user_id|to_user_id = auth\.uid\(\)|parent_id = auth\.uid\(\)|auth\.uid\(\) = parent_id)' THEN 'Student-owned'
         ELSE 'Coach-owned'
       END AS category,
       CASE
         WHEN policyname = 'System can insert relationships' THEN 'fix'
         WHEN policyname IN ('notes_insert_author_only','notes_update_author_only','notes_delete_author_only') THEN 'fix'
         WHEN cmd='SELECT' AND (
           COALESCE(qual,'') ILIKE '%auth.role()%' OR COALESCE(qual,'')='true' OR COALESCE(qual,'') ILIKE '%is_active = true%'
         ) AND tablename <> 'stickers' THEN 'fix'
         WHEN cmd='SELECT' AND (
           COALESCE(qual,'') ILIKE '%auth.role()%' OR COALESCE(qual,'')='true' OR COALESCE(qual,'') ILIKE '%is_active = true%'
         ) AND tablename = 'stickers' THEN 'safe'
         ELSE 'safe'
       END AS risk,
       CASE
         WHEN policyname = 'System can insert relationships' THEN 'Student self-link INSERT path; no invite/approval check in policy predicate.'
         WHEN policyname IN ('notes_insert_author_only','notes_update_author_only','notes_delete_author_only') THEN 'Coach-only group ownership check blocks student authored group notes.'
         WHEN tablename='assignments' AND policyname='Assignees can view their assignments' THEN 'Needed for student task_instances joins on assignments and group assignment visibility.'
         WHEN tablename='class_sessions' AND cmd='SELECT' THEN 'Coach-only session visibility; no student direct SELECT policy.'
         WHEN tablename='stickers' THEN 'Intentional public authenticated catalog read.'
         ELSE ''
       END AS notes
FROM pg_policies
WHERE schemaname='public'
ORDER BY tablename, policyname, cmd;
```

Result: all 71 pre-fix policies categorized; fix flags were:
- `notes_insert_author_only`
- `notes_update_author_only`
- `notes_delete_author_only`
- `instructor_students`.`System can insert relationships`

## 6B — Fixes

### 6B.1 Notes student author policies (membership-scoped)
`notes` policies before fix (shows coach-owned write checks):
```sql
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='notes'
ORDER BY policyname;
```

Applied SQL (exact):
```sql
DROP POLICY IF EXISTS notes_student_insert_author_member ON public.notes;
CREATE POLICY notes_student_insert_author_member
ON public.notes
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = from_user_id
  AND (
    group_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM (
        SELECT gm.group_id AS member_group_id, gm.user_id
        FROM public.group_members gm
      ) m
      WHERE m.member_group_id = group_id
        AND m.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS notes_student_update_author_member ON public.notes;
CREATE POLICY notes_student_update_author_member
ON public.notes
FOR UPDATE TO authenticated
USING (
  auth.uid() = from_user_id
  AND (
    group_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM (
        SELECT gm.group_id AS member_group_id, gm.user_id
        FROM public.group_members gm
      ) m
      WHERE m.member_group_id = group_id
        AND m.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  auth.uid() = from_user_id
  AND (
    group_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM (
        SELECT gm.group_id AS member_group_id, gm.user_id
        FROM public.group_members gm
      ) m
      WHERE m.member_group_id = group_id
        AND m.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS notes_student_delete_author_member ON public.notes;
CREATE POLICY notes_student_delete_author_member
ON public.notes
FOR DELETE TO authenticated
USING (
  auth.uid() = from_user_id
  AND (
    group_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM (
        SELECT gm.group_id AS member_group_id, gm.user_id
        FROM public.group_members gm
      ) m
      WHERE m.member_group_id = group_id
        AND m.user_id = auth.uid()
    )
  )
);
```

Required real RLS insert tests:

Case 1 + Case 2 (same transaction, rollback):
```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}','7a25bc24-1867-4678-a6b7-1b94cb6683a5'), true);
WITH case1 AS (
  INSERT INTO public.notes (from_user_id, to_user_id, content, group_id)
  VALUES ('7a25bc24-1867-4678-a6b7-1b94cb6683a5', '7a25bc24-1867-4678-a6b7-1b94cb6683a5', 'chunk6 policy test: null group', NULL)
  RETURNING id
),
case2 AS (
  INSERT INTO public.notes (from_user_id, to_user_id, content, group_id)
  VALUES ('7a25bc24-1867-4678-a6b7-1b94cb6683a5', '7a25bc24-1867-4678-a6b7-1b94cb6683a5', 'chunk6 policy test: member group', 'b3ca3a8c-9d64-4954-bf88-6dfe87d1f728')
  RETURNING id
)
SELECT case1.id AS case1_id, case2.id AS case2_id
FROM case1, case2;
ROLLBACK;
```

```text
[{"case1_id":"a33069e8-aee4-4055-ae54-7bc92f5ca325","case2_id":"d4f8b3da-bf5a-493d-a568-6b8a3faa34a9"}]
```

Case 3 (non-member group MUST fail):
```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}','7a25bc24-1867-4678-a6b7-1b94cb6683a5'), true);
INSERT INTO public.notes (from_user_id, to_user_id, content, group_id)
VALUES ('7a25bc24-1867-4678-a6b7-1b94cb6683a5', '7a25bc24-1867-4678-a6b7-1b94cb6683a5', 'chunk6 policy test: non-member group', '2455fa68-55f9-4962-987d-295fe76d227d');
ROLLBACK;
```

```text
ERROR: 42501: new row violates row-level security policy for table "notes"
```

Rollback persistence check:
```sql
SELECT COUNT(*) AS persisted_policy_test_rows
FROM public.notes
WHERE content LIKE 'chunk6 policy test:%';
```
```text
[{"persisted_policy_test_rows":0}]
```

### 6B.2 class_sessions: student SELECT policy decision
Current policies:
```sql
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='class_sessions'
ORDER BY policyname;
```

```text
[
  {"policyname":"Coaches can create sessions","cmd":"INSERT","with_check":"(auth.uid() = coach_id)"},
  {"policyname":"Coaches can update own sessions","cmd":"UPDATE","qual":"(auth.uid() = coach_id)"},
  {"policyname":"Coaches can view own sessions","cmd":"SELECT","qual":"(auth.uid() = coach_id)"}
]
```

Decision: **no new student `SELECT` policy added**. Grep evidence showed `class_sessions` reads are coach/admin context; student flow uses `validate_join_code` RPC + `class_members` insert.

### 6B.3 instructor_students INSERT lockdown
Policies before:
```text
[
  {"policyname":"Instructors can view their students","cmd":"SELECT"},
  {"policyname":"Students can view their instructors","cmd":"SELECT"},
  {"policyname":"System can insert relationships","cmd":"INSERT","with_check":"(auth.uid() = student_id)"}
]
```

Applied SQL:
```sql
DROP POLICY IF EXISTS "System can insert relationships" ON public.instructor_students;
```

Policies after:
```text
[
  {"policyname":"Instructors can view their students","cmd":"SELECT"},
  {"policyname":"Students can view their instructors","cmd":"SELECT"}
]
```

Verification (student self-link insert denied):
```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}','7a25bc24-1867-4678-a6b7-1b94cb6683a5'), true);
INSERT INTO public.instructor_students (instructor_id, student_id)
VALUES ('67dc4cb8-626e-4e4b-a6b5-0f81b7207e6f', '7a25bc24-1867-4678-a6b7-1b94cb6683a5');
ROLLBACK;
```
```text
ERROR: 42501: new row violates row-level security policy for table "instructor_students"
```

### 6B.4 assignments visibility decision
Current policy:
```text
{"policyname":"Assignees can view their assignments","qual":"((assignee_id = auth.uid()) OR (group_id IN (...group_members...)))"}
```

Decision: keep membership-scoped visibility (assignee OR group membership). Rationale:
- Student pages (`AssigneeDashboard`, `StudentSchedule`) do `task_instances` selects with `assignments!inner(...)` joins.
- Group-assigned tasks rely on assignment rows with `group_id`; removing membership visibility would break those inner joins.
- This remains least-privilege within member scope.

### 6B.5 chat_messages schema + policies
Schema:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema='public' AND table_name='chat_messages'
ORDER BY ordinal_position;
```
```text
[
  {"column_name":"id","data_type":"uuid"},
  {"column_name":"user_id","data_type":"uuid"},
  {"column_name":"role","data_type":"text"},
  {"column_name":"content","data_type":"text"},
  {"column_name":"created_at","data_type":"timestamp with time zone"}
]
```

Policies:
```text
[
  {"policyname":"Users can create messages","cmd":"INSERT","with_check":"(auth.uid() = user_id)"},
  {"policyname":"Users can delete their own messages","cmd":"DELETE","qual":"(auth.uid() = user_id)"},
  {"policyname":"Users can view their own messages","cmd":"SELECT","qual":"(auth.uid() = user_id)"}
]
```

No receiver columns exist; no change required.

### 6B.6 Other issues
No additional student-risk policy fixes required beyond `notes` and `instructor_students` based on grep + policy audit.

## 6C — Verification

### 6C.1 AFTER snapshots + count diffs
AFTER snapshot query:
```sql
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public'
ORDER BY tablename, policyname, cmd;
```

AFTER counts:
```sql
SELECT tablename, COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname='public'
GROUP BY tablename
ORDER BY tablename;
```

```text
[
  {"tablename":"assignments","policy_count":2},
  {"tablename":"chat_messages","policy_count":3},
  {"tablename":"class_members","policy_count":3},
  {"tablename":"class_sessions","policy_count":3},
  {"tablename":"group_members","policy_count":4},
  {"tablename":"groups","policy_count":2},
  {"tablename":"instructor_students","policy_count":2},
  {"tablename":"notes","policy_count":10},
  {"tablename":"parent_children","policy_count":3},
  {"tablename":"parent_links","policy_count":1},
  {"tablename":"people","policy_count":4},
  {"tablename":"profiles","policy_count":5},
  {"tablename":"recurring_schedules","policy_count":5},
  {"tablename":"routines","policy_count":4},
  {"tablename":"stickers","policy_count":1},
  {"tablename":"student_logs","policy_count":3},
  {"tablename":"task_instances","policy_count":4},
  {"tablename":"tasks","policy_count":4},
  {"tablename":"template_tasks","policy_count":4},
  {"tablename":"templates","policy_count":4},
  {"tablename":"user_stickers","policy_count":2}
]
```

```sql
SELECT COUNT(*) AS total_policy_count_after
FROM pg_policies
WHERE schemaname='public';
```
```text
[{"total_policy_count_after":73}]
```

Diff explanation:
- Total `71 -> 73`.
- `notes`: `7 -> 10` (added 3 student-write policies).
- `instructor_students`: `3 -> 2` (dropped unsafe INSERT policy).
- All other tables unchanged.

Broad SELECT recheck:
```text
[{"tablename":"stickers","policyname":"Anyone can view stickers",...}]
```

### 6C.2 Cross-student tests
Test 1: Student A cannot see Student B profile
```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}','7a25bc24-1867-4678-a6b7-1b94cb6683a5'), true);
SELECT COUNT(*) AS a_sees_b_profile
FROM public.profiles
WHERE user_id = '1870b97b-362c-4258-8878-d31aca20f983';
ROLLBACK;
```
```text
[{"a_sees_b_profile":0}]
```

Test 2: Student A cannot see Student B task_instances
```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}','7a25bc24-1867-4678-a6b7-1b94cb6683a5'), true);
SELECT COUNT(*) AS a_sees_b_instances
FROM public.task_instances
WHERE assignee_id = '1870b97b-362c-4258-8878-d31aca20f983';
ROLLBACK;
```
```text
[{"a_sees_b_instances":0}]
```

Test 3: Student A cannot see known non-member group
```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}','7a25bc24-1867-4678-a6b7-1b94cb6683a5'), true);
SELECT COUNT(*) AS a_sees_not_member_group
FROM public.groups
WHERE id = '2455fa68-55f9-4962-987d-295fe76d227d';
ROLLBACK;
```
```text
[{"a_sees_not_member_group":0}]
```

Positive: Student A can see known member group
```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}','7a25bc24-1867-4678-a6b7-1b94cb6683a5'), true);
SELECT COUNT(*) AS a_sees_member_group
FROM public.groups
WHERE id = 'b3ca3a8c-9d64-4954-bf88-6dfe87d1f728';
ROLLBACK;
```
```text
[{"a_sees_member_group":1}]
```

Class session student-member visibility test: skipped (no student `class_sessions` SELECT policy added and `class_members` dataset empty).

### 6C.3 Build regression
```bash
npm run build
```

```text
PASS (vite build succeeded)
- built in 38.69s
- only chunk-size warnings
```

## Pass/Fail
- **6A Audit:** PASS
- **6B Fixes:** PASS
- **6C Verification:** PASS
- **Overall Chunk 6:** PASS

## Notes for Chunk 7 (Parent role)
1. Re-audit parent read policies for cross-tenant leakage through relationship helper functions.
2. Verify parent note/task/profile reads are strictly linked-child scoped.
3. Re-test SECURITY DEFINER parent linking RPC for replay/idempotency under concurrent calls.

## Notes for Chunk 8 (Cross-tenant test suite)
1. Add automated JWT-impersonation SQL test pack for coach/student/parent isolation.
2. Include negative tests for non-member group/class reads and unauthorized writes.
3. Include regression tests for `task_instances` joins that depend on `assignments` membership visibility.
4. Add policy snapshot diff checks as CI artifacts (before/after migration assertions).
