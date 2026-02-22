# Security Audit Report — Chunk 5: Coach Role RLS Hardening
**Date:** 2026-02-18  
**Auditor:** Codex  
**Project:** TeachCoachConnect (`vjzaayxeoeojuccbriid`)  
**Scope:** Chunk 5A/5B/5C (coach cross-tenant isolation + broad policy removal + join-flow safety)

All database reads/writes in this report were executed via Supabase MCP `execute_sql`.

## Summary of Changes
1. Removed broad authenticated `SELECT` policies from `groups`, `class_sessions`, and `parent_links`.
2. Replaced risky `notes` `FOR ALL` policy with split least-privilege policies for `SELECT/INSERT/UPDATE/DELETE`.
3. Added a new SECURITY DEFINER RPC `link_child_by_parent_code(p_link_code text)` and moved parent link-code lookup off direct table reads.
4. Refactored group join UI flow to use RPC-based join by code (`join_group_by_code`) and changed generated join URLs to `/join?code=...`.
5. Verified via impersonation tests (with `SET LOCAL ROLE authenticated`) that Coach A cannot see Coach B rows.

---

## 5A — Audit (Before Changes)

### 5A.1 BEFORE policy snapshots

**Policy count by table (before):**

| table | policy_count |
|---|---:|
| assignments | 2 |
| chat_messages | 3 |
| class_members | 3 |
| class_sessions | 4 |
| group_members | 4 |
| groups | 3 |
| instructor_students | 3 |
| notes | 6 |
| parent_children | 3 |
| parent_links | 2 |
| people | 4 |
| profiles | 5 |
| recurring_schedules | 5 |
| routines | 4 |
| stickers | 1 |
| student_logs | 3 |
| task_instances | 4 |
| tasks | 4 |
| template_tasks | 4 |
| templates | 4 |
| user_stickers | 2 |

Total policies before: **73**.

### 5A.2 Broad authenticated policy risk query (before)

Query matched 4 broad policies:
- `class_sessions` → `Anyone can lookup active sessions` (`qual = (is_active = true)`)
- `groups` → `Authenticated users can lookup groups by qr_token` (`qual = auth.role() = authenticated`)
- `parent_links` → `parent_select_parent_links` (`qual = auth.role() = authenticated`)
- `stickers` → `Anyone can view stickers` (`qual = auth.role() = authenticated`)

### 5A.3 Frontend usage check (before)

Commands run:
- `rg -n "from\\(['\" ]groups['\"]\\)" src || true`
- `rg -n "from\\(['\" ]class_sessions['\"]\\)" src || true`
- `rg -n "from\\(['\" ]parent_links['\"]\\)" src || true`
- `rg -n "\\.rpc\\(['\"](validate_group_join_code|validate_qr_token|join_group_by_code|validate_join_code|accept_invite)['\"]\\)" src || true`

Key findings:
- `groups` was directly selected in multiple files, including `src/pages/JoinGroup.tsx` by `qr_token`.
- `class_sessions` direct reads exist, but existing client code shown was coach-scoped or class-management scoped.
- `parent_links` direct read by code existed in `src/pages/ParentDashboard.tsx` (lookup by `link_code`).
- RPC usage existed for join flows (`join_group_by_code`, `validate_join_code`, `accept_invite`) but `JoinGroup` QR-token path still depended on direct `groups` table read.

### 5A.4 Test identities / ownership context

Initial prompt query returned `profiles.id`, but RLS auth context uses `profiles.user_id` (`auth.uid()`).

Selected coaches:
- **COACH_A (`auth_user_id`)**: `110b5ab4-f3bc-4745-8e5c-57ea82a15655`
- **COACH_B (`auth_user_id`)**: `67dc4cb8-626e-4e4b-a6b5-0f81b7207e6f`

Ownership sample:
- `groups` for these coaches:
  - `1d8f7d70-0186-445e-9d33-b426e3edffb9` (coach A)
  - `2455fa68-55f9-4962-987d-295fe76d227d` (coach B)
  - `f4a6e03d-c080-488f-982e-b9d5a14a5704` (coach B)
- `class_sessions` rows for these coaches: none (`[]`)

**5A Status: PASS (with actionable findings).**

---

## 5B — Remediation

### 5B.1 `groups`: removed broad authenticated lookup policy

Executed:
```sql
DROP POLICY IF EXISTS "Authenticated users can lookup groups by qr_token" ON public.groups;
```

Result:
- Removed broad `SELECT` path that allowed authenticated-wide enumeration.
- Remaining `groups` policies are coach-owned/membership-scoped.

### 5B.2 `class_sessions`: removed broad active-session lookup policy

Executed:
```sql
DROP POLICY IF EXISTS "Anyone can lookup active sessions" ON public.class_sessions;
```

Result:
- Removed `is_active = true` broad read policy.
- Remaining `class_sessions` access is coach-owned for direct table reads.

### 5B.3 `parent_links`: removed broad authenticated lookup policy and moved flow to RPC

Executed:
```sql
DROP POLICY IF EXISTS parent_select_parent_links ON public.parent_links;
```

Kept:
- `Students can view own parent link` (`student_id = auth.uid()`) unchanged.

Because no existing RPC safely handled `parent_links.link_code` lookup + insert, added safe server-side path:

```sql
CREATE OR REPLACE FUNCTION public.link_child_by_parent_code(p_link_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
-- validates parent role, resolves link code, inserts parent_children with ON CONFLICT DO NOTHING
$function$;

REVOKE ALL ON FUNCTION public.link_child_by_parent_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_child_by_parent_code(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.link_child_by_parent_code(text) FROM anon;
```

Function metadata verification:
- `function_name`: `link_child_by_parent_code`
- `args`: `p_link_code text`
- `security_mode`: `SECURITY DEFINER`
- execute grantees: `authenticated`, `service_role`, `postgres` (no `anon`).

### 5B.4 `notes`: replaced risky `FOR ALL` policy with split least-privilege policies

Dropped:
- `Coaches can manage notes for their groups` (`ALL`, `qual: group owned OR from_user_id = auth.uid()`, `with_check: NULL`)
- `Users can insert notes`
- `Users can delete their own notes`

Added:
- `notes_select_coach_scope` (`SELECT`)
- `notes_insert_author_only` (`INSERT` + strict `with_check`)
- `notes_update_author_only` (`UPDATE` + `using` and `with_check`)
- `notes_delete_author_only` (`DELETE` + strict `using`)

All write policies now require `auth.uid() = from_user_id` and if `group_id` is present, require group ownership by the caller (`groups.coach_id = auth.uid()`).

### 5B.5 Other broad policy decisions

- `stickers` broad authenticated `SELECT` policy remains:
  - `Anyone can view stickers` with `auth.role() = 'authenticated'`
  - kept as non-sensitive catalog-style data (SELECT-only).

### Frontend changes made to support policy tightening

1. `src/pages/JoinGroup.tsx`
- Replaced direct `.from("groups").eq("qr_token", ...)` logic with RPC call to `join_group_by_code`.
- `/join` now prioritizes `?code=` and stores `pending_join_code` for login round-trip.

2. `src/pages/GroupDetail.tsx`
- Updated generated QR/link URL from `/join?token=<qr_token>` to `/join?code=<join_code>`.

3. `src/pages/AuthCallback.tsx`
- Added `pending_join_code` handling so post-auth redirect returns to `/join?code=...`.

4. `src/components/auth/AuthTabs.tsx`
- Added `pending_join_code` handling in email login redirect path.

5. `src/pages/ParentDashboard.tsx`
- Replaced direct `parent_links` lookup/insert flow with RPC: `link_child_by_parent_code`.

**5B Status: PASS.**

---

## 5C — Verification

### 5C.1 AFTER policy scans

**Policy count by table (after):**

| table | policy_count |
|---|---:|
| assignments | 2 |
| chat_messages | 3 |
| class_members | 3 |
| class_sessions | 3 |
| group_members | 4 |
| groups | 2 |
| instructor_students | 3 |
| notes | 7 |
| parent_children | 3 |
| parent_links | 1 |
| people | 4 |
| profiles | 5 |
| recurring_schedules | 5 |
| routines | 4 |
| stickers | 1 |
| student_logs | 3 |
| task_instances | 4 |
| tasks | 4 |
| template_tasks | 4 |
| templates | 4 |
| user_stickers | 2 |

Total policies after: **71**.

Broad `SELECT` scan (`auth.role()=authenticated` or `true` or `is_active=true`) now returns only:
- `stickers` → `Anyone can view stickers`.

`roles={public}` policies remaining:
- none (`0` rows).

All public tables still have RLS enabled:
- yes (21/21 `rowsecurity=true`).

### 5C.2 Coach impersonation tests (RLS-enforced)

To avoid MCP elevated-role bypass, tests were run inside transaction with:
- `SET LOCAL ROLE authenticated`
- `set_config('request.jwt.claims', '{"sub":"<coach>","role":"authenticated"}', true)`

Results:
- `coach_a_sees_coach_b_groups` = **0**
- `coach_a_sees_coach_b_sessions` = **0**
- `coach_a_sees_coach_b_students` = **0**
- Additional reverse check: `coach_b_sees_coach_a_groups` = **0**

### 5C.3 Build regression

Command:
```bash
npm run build
```

Result:
- **PASS** (`vite build` completed successfully)
- Only non-blocking chunk-size warnings.

**5C Status: PASS.**

---

## Dropped/Replaced Policy Matrix

| Table | Old policy | Old qual/behavior | New policy/behavior | Rationale |
|---|---|---|---|---|
| groups | Authenticated users can lookup groups by qr_token | `auth.role() = authenticated` (broad SELECT) | **Dropped**; join now via RPC (`join_group_by_code`) | Remove cross-tenant enumeration path |
| class_sessions | Anyone can lookup active sessions | `is_active = true` (broad SELECT) | **Dropped**; direct reads remain coach-owned | Prevent global active-session visibility |
| parent_links | parent_select_parent_links | `auth.role() = authenticated` (broad SELECT) | **Dropped**; linking now via `link_child_by_parent_code` RPC; student self-read policy kept | Remove link-code table enumeration |
| notes | Coaches can manage notes for their groups (`ALL`) | `(group owned) OR (from_user_id = auth.uid())`, `with_check NULL` | Replaced with `notes_select_coach_scope`, `notes_insert_author_only`, `notes_update_author_only`, `notes_delete_author_only` | Least-privilege writes + explicit checks |

---

## Pass/Fail
- **5A Audit:** PASS (found and mapped broad-risk policies + frontend dependencies)
- **5B Fixes:** PASS (policy hardening + RPC-backed flow updates implemented)
- **5C Verification:** PASS (RLS checks, impersonation isolation, and build succeeded)

## Notes to Carry Into Chunk 6+
1. `stickers` remains intentionally broad to authenticated users; revisit only if sticker catalog becomes sensitive.
2. Legacy `/join?token=` links are preserved only as fallback routing; active generation now uses `/join?code=`.
3. Class-session cross-tenant test dataset currently has zero class session rows for selected coaches; policy logic still verified under enforced role context.

---

## Addendum — Verification + SECURITY DEFINER Hardening (2026-02-18)

### A) SECURITY DEFINER RPC auditability + search_path hardening

Function definition dump (`pg_get_functiondef`):

```sql
SELECT p.proname,
       pg_get_functiondef(p.oid) AS fn_def
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public'
  AND p.proname='link_child_by_parent_code';
```

```text
[
  {
    "proname":"link_child_by_parent_code",
    "fn_def":"CREATE OR REPLACE FUNCTION public.link_child_by_parent_code(p_link_code text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog, public'
AS $function$
DECLARE
  v_parent_id uuid := auth.uid();
  v_parent_role text;
  v_student_id uuid;
  v_row_count integer := 0;
BEGIN
  IF v_parent_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
  END IF;

  SELECT role INTO v_parent_role
  FROM public.profiles
  WHERE user_id = v_parent_id;

  IF v_parent_role IS DISTINCT FROM 'parent' THEN
    RETURN json_build_object('success', false, 'error', 'Only parent accounts can use this code');
  END IF;

  SELECT pl.student_id INTO v_student_id
  FROM public.parent_links pl
  WHERE UPPER(pl.link_code) = UPPER(TRIM(p_link_code));

  IF v_student_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid code. Please check with your child.');
  END IF;

  INSERT INTO public.parent_children (parent_id, child_id)
  VALUES (v_parent_id, v_student_id)
  ON CONFLICT (parent_id, child_id) DO NOTHING;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'student_id', v_student_id,
    'already_linked', (v_row_count = 0)
  );
END;
$function$
"
  }
]
```

Owner/security/config dump:

```sql
SELECT p.proname,
       r.rolname AS owner,
       p.prosecdef AS security_definer,
       p.proconfig
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
JOIN pg_roles r ON r.oid=p.proowner
WHERE n.nspname='public'
  AND p.proname='link_child_by_parent_code';
```

```text
[
  {
    "proname":"link_child_by_parent_code",
    "owner":"postgres",
    "security_definer":true,
    "proconfig":["search_path=\"pg_catalog, public\""]
  }
]
```

EXECUTE privilege verification:

```sql
SELECT routine_schema, routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema='public'
  AND routine_name='link_child_by_parent_code'
ORDER BY grantee, privilege_type;
```

```text
[
  {"routine_schema":"public","routine_name":"link_child_by_parent_code","grantee":"authenticated","privilege_type":"EXECUTE"},
  {"routine_schema":"public","routine_name":"link_child_by_parent_code","grantee":"postgres","privilege_type":"EXECUTE"},
  {"routine_schema":"public","routine_name":"link_child_by_parent_code","grantee":"service_role","privilege_type":"EXECUTE"}
]
```

SQL change made (hardening only; logic unchanged):

```sql
CREATE OR REPLACE FUNCTION public.link_child_by_parent_code(p_link_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog, public'
AS $function$
DECLARE
  v_parent_id uuid := auth.uid();
  v_parent_role text;
  v_student_id uuid;
  v_row_count integer := 0;
BEGIN
  IF v_parent_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
  END IF;

  SELECT role INTO v_parent_role
  FROM public.profiles
  WHERE user_id = v_parent_id;

  IF v_parent_role IS DISTINCT FROM 'parent' THEN
    RETURN json_build_object('success', false, 'error', 'Only parent accounts can use this code');
  END IF;

  SELECT pl.student_id INTO v_student_id
  FROM public.parent_links pl
  WHERE UPPER(pl.link_code) = UPPER(TRIM(p_link_code));

  IF v_student_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid code. Please check with your child.');
  END IF;

  INSERT INTO public.parent_children (parent_id, child_id)
  VALUES (v_parent_id, v_student_id)
  ON CONFLICT (parent_id, child_id) DO NOTHING;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'student_id', v_student_id,
    'already_linked', (v_row_count = 0)
  );
END;
$function$;
```

RLS definitions snapshot for new/changed Chunk 5 policies:

```sql
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname='public'
  AND (
    (tablename='class_sessions' AND policyname IN (
      'Coaches can create sessions',
      'Coaches can update own sessions',
      'Coaches can view own sessions'
    ))
    OR (tablename='groups' AND policyname IN (
      'Coaches can manage their groups',
      'Members can view their groups'
    ))
    OR (tablename='parent_links' AND policyname IN (
      'Students can view own parent link'
    ))
    OR (tablename='notes' AND policyname IN (
      'notes_delete_author_only',
      'notes_insert_author_only',
      'notes_select_coach_scope',
      'notes_update_author_only'
    ))
  )
ORDER BY tablename, policyname;
```

```text
[
  {"tablename":"class_sessions","policyname":"Coaches can create sessions","cmd":"INSERT","qual":null,"with_check":"(auth.uid() = coach_id)"},
  {"tablename":"class_sessions","policyname":"Coaches can update own sessions","cmd":"UPDATE","qual":"(auth.uid() = coach_id)","with_check":null},
  {"tablename":"class_sessions","policyname":"Coaches can view own sessions","cmd":"SELECT","qual":"(auth.uid() = coach_id)","with_check":null},
  {"tablename":"groups","policyname":"Coaches can manage their groups","cmd":"ALL","qual":"(coach_id = auth.uid())","with_check":null},
  {"tablename":"groups","policyname":"Members can view their groups","cmd":"SELECT","qual":"((coach_id = auth.uid()) OR is_group_member(id, auth.uid()))","with_check":null},
  {"tablename":"notes","policyname":"notes_delete_author_only","cmd":"DELETE","qual":"((auth.uid() = from_user_id) AND ((group_id IS NULL) OR (EXISTS ( SELECT 1 FROM groups g WHERE ((g.id = notes.group_id) AND (g.coach_id = auth.uid()))))))","with_check":null},
  {"tablename":"notes","policyname":"notes_insert_author_only","cmd":"INSERT","qual":null,"with_check":"((auth.uid() = from_user_id) AND ((group_id IS NULL) OR (EXISTS ( SELECT 1 FROM groups g WHERE ((g.id = notes.group_id) AND (g.coach_id = auth.uid()))))))"},
  {"tablename":"notes","policyname":"notes_select_coach_scope","cmd":"SELECT","qual":"((from_user_id = auth.uid()) OR ((group_id IS NOT NULL) AND (EXISTS ( SELECT 1 FROM groups g WHERE ((g.id = notes.group_id) AND (g.coach_id = auth.uid()))))))","with_check":null},
  {"tablename":"notes","policyname":"notes_update_author_only","cmd":"UPDATE","qual":"((auth.uid() = from_user_id) AND ((group_id IS NULL) OR (EXISTS ( SELECT 1 FROM groups g WHERE ((g.id = notes.group_id) AND (g.coach_id = auth.uid()))))))","with_check":"((auth.uid() = from_user_id) AND ((group_id IS NULL) OR (EXISTS ( SELECT 1 FROM groups g WHERE ((g.id = notes.group_id) AND (g.coach_id = auth.uid()))))))"},
  {"tablename":"parent_links","policyname":"Students can view own parent link","cmd":"SELECT","qual":"(student_id = auth.uid())","with_check":null}
]
```

### B) SECURITY DEFINER invariants (explicit validation)

Invariant checks from function body:
- `auth.uid()` null rejection: present (`Authentication required`).
- Caller role must be `parent`: present (`Only parent accounts can use this code`).
- Link code resolves to one student: enforced by unique constraint on `parent_links.link_code`; function resolves one `student_id`.
- Business rule: code is reusable (not single-use). `parent_links` has no `used_at`; uniqueness is per student/code.
- Parent-child insertion idempotent: present (`ON CONFLICT (parent_id, child_id) DO NOTHING`).
- Return JSON leakage: minimal (`success`, `student_id`, `already_linked` or `error` only).

Schema check proving no `used_at` column (single-use token model not implemented):

```sql
SELECT link_code, student_id, used_at
FROM public.parent_links
WHERE link_code IS NOT NULL
ORDER BY created_at DESC NULLS LAST
LIMIT 1;
```

```text
ERROR: column "used_at" does not exist
```

Real-row parent/link selection (code redacted):

```sql
SELECT user_id FROM public.profiles WHERE role='parent' LIMIT 1;
SELECT link_code, student_id, created_at
FROM public.parent_links
WHERE link_code IS NOT NULL
ORDER BY created_at DESC NULLS LAST
LIMIT 1;
```

```text
[{"user_id":"18f2595b-8d65-4de3-86c1-12909344410b"}]
[{"link_code":"<REDACTED_CODE>","student_id":"1870b97b-362c-4258-8878-d31aca20f983","created_at":"2026-02-09 01:05:15.616227+00"}]
```

Parent-authenticated RPC call test:

```sql
BEGIN;
SELECT set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}','18f2595b-8d65-4de3-86c1-12909344410b'), true);
SET LOCAL ROLE authenticated;
SELECT public.link_child_by_parent_code('<REDACTED_CODE>') AS result;
ROLLBACK;
```

```text
[{"result":{"success":true,"student_id":"1870b97b-362c-4258-8878-d31aca20f983","already_linked":false}}]
```

Additional explicit behavior tests:

```text
No auth uid -> [{"result":{"success":false,"error":"Authentication required"}}]
Non-parent uid -> [{"result":{"success":false,"error":"Only parent accounts can use this code"}}]
Invalid code -> [{"result":{"success":false,"error":"Invalid code. Please check with your child."}}]
Two calls in same tx -> first_result.already_linked=false, second_result.already_linked=true
```

### C) class_sessions cross-tenant test with real rows

Initial dataset check:

```sql
SELECT coach_id, COUNT(*) AS n
FROM public.class_sessions
GROUP BY coach_id
HAVING COUNT(*) > 0
ORDER BY n DESC
LIMIT 2;
```

```text
[]
```

Created two temporary real rows under authenticated role context:

```sql
-- coach A
BEGIN;
SELECT set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}','110b5ab4-f3bc-4745-8e5c-57ea82a15655'), true);
SET LOCAL ROLE authenticated;
INSERT INTO public.class_sessions (coach_id, name, join_code, is_active)
VALUES ('110b5ab4-f3bc-4745-8e5c-57ea82a15655','Security Audit Session A','AUDA755E',true)
RETURNING id, coach_id, name, join_code, is_active;
COMMIT;

-- coach B
BEGIN;
SELECT set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}','67dc4cb8-626e-4e4b-a6b5-0f81b7207e6f'), true);
SET LOCAL ROLE authenticated;
INSERT INTO public.class_sessions (coach_id, name, join_code, is_active)
VALUES ('67dc4cb8-626e-4e4b-a6b5-0f81b7207e6f','Security Audit Session B','AUDB1BAA',true)
RETURNING id, coach_id, name, join_code, is_active;
COMMIT;
```

```text
[{"id":"21c2e716-d2e7-4957-96cd-302d6d19ff67","coach_id":"110b5ab4-f3bc-4745-8e5c-57ea82a15655","name":"Security Audit Session A","join_code":"AUDA755E","is_active":true}]
[{"id":"a844770f-5f98-4b5a-9977-f0d31546dea3","coach_id":"67dc4cb8-626e-4e4b-a6b5-0f81b7207e6f","name":"Security Audit Session B","join_code":"AUDB1BAA","is_active":true}]
```

Cross-tenant isolation test with those rows:

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}','110b5ab4-f3bc-4745-8e5c-57ea82a15655'), true);
SELECT COUNT(*) AS coach_a_sees_coach_b_sessions
FROM public.class_sessions
WHERE coach_id = '67dc4cb8-626e-4e4b-a6b5-0f81b7207e6f';
ROLLBACK;
```

```text
[{"coach_a_sees_coach_b_sessions":0}]
```

Reverse check:

```text
[{"coach_b_sees_coach_a_sessions":0}]
```

Audit-row cleanup after test:

```sql
DELETE FROM public.class_sessions
WHERE id IN ('21c2e716-d2e7-4957-96cd-302d6d19ff67','a844770f-5f98-4b5a-9977-f0d31546dea3')
RETURNING id, coach_id, name;
SELECT id, coach_id, name
FROM public.class_sessions
WHERE id IN ('21c2e716-d2e7-4957-96cd-302d6d19ff67','a844770f-5f98-4b5a-9977-f0d31546dea3');
```

```text
[{"id":"21c2e716-d2e7-4957-96cd-302d6d19ff67","coach_id":"110b5ab4-f3bc-4745-8e5c-57ea82a15655","name":"Security Audit Session A"},{"id":"a844770f-5f98-4b5a-9977-f0d31546dea3","coach_id":"67dc4cb8-626e-4e4b-a6b5-0f81b7207e6f","name":"Security Audit Session B"}]
[]
```

### D) Frontend proof: no fallback direct table reads

Required grep outputs:

```bash
rg -n "from\(['\"]groups['\"]\)" src || true
```

```text
src/pages/AssignerDashboard.tsx:172:        .from("groups")
src/pages/GroupDetail.tsx:183:                .from("groups")
src/pages/student/StudentSchedule.tsx:173:                    .from("groups")
src/pages/student/StudentHome.tsx:201:        .from("groups")
src/pages/student/StudentHome.tsx:351:          .from("groups")
src/pages/student/StudentHome.tsx:490:          .from("groups")
src/hooks/useGroups.ts:31:    .from("groups")
src/hooks/useGroups.ts:82:        .from("groups")
src/hooks/useGroups.ts:112:        .from("groups")
src/hooks/useGroups.ts:180:        .from("groups")
src/components/ai/WeeklySummary.tsx:159:        .from("groups")
```

```bash
rg -n "qr_token" src || true
```

```text
src/pages/GroupDetail.tsx:85:    qr_token: string | null;
src/pages/GroupDetail.tsx:184:                .select("id, name, color, join_code, qr_token")
src/hooks/useGroups.ts:16:  qr_token: string | null;
src/integrations/supabase/types.ts:140:          qr_token: string
src/integrations/supabase/types.ts:151:          qr_token?: string
src/integrations/supabase/types.ts:162:          qr_token?: string
src/integrations/supabase/types.ts:215:          qr_token: string | null
src/integrations/supabase/types.ts:225:          qr_token?: string | null
src/integrations/supabase/types.ts:235:          qr_token?: string | null
src/integrations/supabase/types.ts:943:      validate_qr_token: {
```

```bash
rg -n "from\(['\"]parent_links['\"]\)" src || true
```

```text
src/pages/student/StudentHome.tsx:240:        .from("parent_links")
```

```bash
rg -n "link_child_by_parent_code" src || true
```

```text
src/pages/ParentDashboard.tsx:436:      "link_child_by_parent_code",
```

```bash
rg -n "join_group_by_code" src || true
```

```text
src/pages/student/StudentHome.tsx:390:      const { data, error } = await supabase.rpc("join_group_by_code", {
src/pages/JoinGroup.tsx:65:        const { data, error: joinError } = await supabase.rpc("join_group_by_code", {
src/integrations/supabase/types.ts:922:      join_group_by_code: { Args: { p_join_code: string }; Returns: Json }
```

Relevant code-shape confirmation:
- No `.eq("qr_token", ...)` matches in `src`.
- No `.eq("link_code", ...)` on `parent_links` matches in `src`.
- `parent_links` direct read in `src/pages/student/StudentHome.tsx` is own-student lookup by `.eq("student_id", user.id)` only.
- Parent linking flow in `src/pages/ParentDashboard.tsx` uses `link_child_by_parent_code` RPC.

### E) Stickers proof: SELECT-only

```sql
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname='public'
  AND tablename='stickers'
ORDER BY policyname;
```

```text
[{"tablename":"stickers","policyname":"Anyone can view stickers","cmd":"SELECT","qual":"(auth.role() = 'authenticated'::text)","with_check":null}]
```

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname='public'
  AND tablename='stickers'
  AND cmd <> 'SELECT';
```

```text
[]
```

### Addendum Pass/Fail
- A) SECURITY DEFINER hardening + privilege audit: **PASS**
- B) SECURITY DEFINER invariants + behavior tests: **PASS**
- C) class_sessions cross-tenant isolation with real rows: **PASS**
- D) Frontend fallback-read regression check: **PASS**
- E) stickers SELECT-only proof: **PASS**
- Overall Addendum: **PASS**
