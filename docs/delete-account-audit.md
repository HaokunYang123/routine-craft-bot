# Delete Account Audit (Read-Only)

Date: 2026-02-05  
Scope: user-referencing dependencies for coach/student account deletion, based on:
- `src/integrations/supabase/types.ts`
- all files in `supabase/migrations/`

## Method and Limits

- This repo does **not** include create-table migrations for some core tables (`groups`, `group_members`, `assignments`, `notes`, `recurring_schedules`, base `task_instances`).
- For those tables, user-reference columns are visible in generated types, but FK action (`CASCADE`/`SET NULL`/`NO ACTION`) is not fully provable from repo migrations.
- Where DDL is visible, behavior below is marked **Confirmed**.
- Where only generated types show the column, behavior is marked **Unknown from repo**.

---

## 1) Full FK/User Dependency Map

### A) Confirmed user FKs from migrations

| Table | Column | References | FK constraint name (visible?) | ON DELETE | Nullable |
|---|---|---|---|---|---|
| `profiles` | `user_id` | `auth.users(id)` | Not explicitly named in migration (auto-generated) | `CASCADE` | No |
| `people` | `user_id` | `auth.users(id)` | Not explicitly named | `CASCADE` | No |
| `routines` | `user_id` | `auth.users(id)` | Not explicitly named | `CASCADE` | No |
| `tasks` | `user_id` | `auth.users(id)` | Not explicitly named | `CASCADE` | No |
| `tasks` | `assigned_student_id` | `auth.users(id)` | Not explicitly named | `CASCADE` | Yes |
| `chat_messages` | `user_id` | `auth.users(id)` | Not explicitly named | `CASCADE` | No |
| `user_stickers` | `user_id` | `auth.users(id)` | Not explicitly named | `CASCADE` | No |
| `student_logs` | `user_id` | `auth.users(id)` | Not explicitly named | `CASCADE` | No |
| `class_sessions` | `coach_id` | `auth.users(id)` | Not explicitly named | `CASCADE` | No |
| `class_members` | `user_id` | `auth.users(id)` | Not explicitly named | `CASCADE` | No |
| `instructor_students` | `instructor_id` | `auth.users(id)` | Not explicitly named | `CASCADE` | No |
| `instructor_students` | `student_id` | `auth.users(id)` | Not explicitly named | `CASCADE` | No |
| `templates` | `coach_id` | `auth.users(id)` | Not explicitly named | `CASCADE` | No |
| `task_instances` | `coach_id` | `auth.users(id)` | Not explicitly named | **No action specified** (Postgres default `NO ACTION`) | Yes |

### B) User-reference columns visible in `types.ts` but FK behavior unknown from repo migrations

| Table | Column | Likely user reference | FK constraint name (visible?) | ON DELETE | Nullable |
|---|---|---|---|---|---|
| `assignments` | `assigned_by` | coach user id | Not visible in `types.ts` Relationships | Unknown from repo | No |
| `assignments` | `assignee_id` | student user id | Not visible | Unknown | Yes |
| `groups` | `coach_id` | coach user id | Not visible | Unknown | No |
| `group_members` | `user_id` | member user id | Not visible | Unknown | No |
| `notes` | `from_user_id` | sender user id | Not visible | Unknown | No |
| `notes` | `to_user_id` | recipient user id | Not visible | Unknown | Yes |
| `recurring_schedules` | `user_id` | owner user id | Not visible | Unknown | No |
| `recurring_schedules` | `assigned_student_id` | student user id | Not visible | Unknown | Yes |
| `task_instances` | `assignee_id` | student user id | Not visible | Unknown | No |
| `task_instances` | `updated_by` | user id of editor | Not visible | Unknown | Yes |

### C) References to `profiles.user_id`

- No FK in checked-in migrations references `profiles.user_id` directly.
- `profiles.user_id` itself references `auth.users(id)` with `ON DELETE CASCADE`.

### D) Non-user FK edges that matter for delete ordering

- `assignments.group_id -> groups.id` (`assignments_group_id_fkey` in types)
- `assignments.template_id -> templates.id` (`assignments_template_id_fkey`)
- `task_instances.assignment_id -> assignments.id` (`task_instances_assignment_id_fkey`)
- `template_tasks.template_id -> templates.id` (`template_tasks_template_id_fkey`)
- `class_members.class_session_id -> class_sessions.id` (`class_members_class_session_id_fkey`)
- `instructor_students.class_session_id -> class_sessions.id` (`instructor_students_class_session_id_fkey`)
- `class_sessions.default_template_id -> templates.id` (added with `ON DELETE SET NULL` in migration)
- `user_stickers.task_id -> tasks.id` (`ON DELETE SET NULL`)

---

## 2) Coach Deletion Dependency Chain

Below is a safe explicit order (children first), designed to avoid `NO ACTION` blockers and unknown legacy FK behavior.

| Order | Table | Filter condition | Action | Dependent rows impacted |
|---|---|---|---|---|
| 1 | `task_instances` | `coach_id = :coach_user_id` OR `assignment_id IN (coach-owned assignments)` | `DELETE` | Removes potential `task_instances.coach_id` `NO ACTION` blocker |
| 2 | `assignments` | `assigned_by = :coach_user_id` OR `group_id IN (coach groups)` | `DELETE` | Parent of `task_instances.assignment_id` |
| 3 | `group_members` | `group_id IN (SELECT id FROM groups WHERE coach_id = :coach_user_id)` | `DELETE` | Child of coach-owned groups |
| 4 | `notes` | `from_user_id = :coach_user_id` | `DELETE` | Prevent sender-user FK blocker if enforced |
| 5 | `notes` | `to_user_id = :coach_user_id` | `SET NULL` (or `DELETE`) | Avoid recipient FK blocker while preserving shared notes |
| 6 | `recurring_schedules` | `user_id = :coach_user_id` | `DELETE` | Parent of tasks via `tasks.recurring_schedule_id` |
| 7 | `tasks` | `user_id = :coach_user_id` | `DELETE` | Child rows in `user_stickers` may set null on `task_id` |
| 8 | `routines` | `user_id = :coach_user_id` | `DELETE` | Tasks may already be deleted; FK also cascades from routines |
| 9 | `people` | `user_id = :coach_user_id` | `DELETE` | Parent of routines (`ON DELETE CASCADE`) |
| 10 | `user_stickers` | `user_id = :coach_user_id` | `DELETE` | Direct user-owned gamification rows |
| 11 | `student_logs` | `user_id = :coach_user_id` | `DELETE` | Direct user-owned rows |
| 12 | `chat_messages` | `user_id = :coach_user_id` | `DELETE` | Direct user-owned rows |
| 13 | `template_tasks` | `template_id IN (SELECT id FROM templates WHERE coach_id = :coach_user_id)` | `DELETE` | Child of templates |
| 14 | `templates` | `coach_id = :coach_user_id` | `DELETE` | `class_sessions.default_template_id` becomes null where FK is `SET NULL` |
| 15 | `class_members` | `class_session_id IN (SELECT id FROM class_sessions WHERE coach_id = :coach_user_id)` | `DELETE` | Child of coach sessions |
| 16 | `instructor_students` | `instructor_id = :coach_user_id` OR `class_session_id IN (coach sessions)` | `DELETE` | Child linkage records |
| 17 | `class_sessions` | `coach_id = :coach_user_id` | `DELETE` | Parent for class members/instructor links |
| 18 | `groups` | `coach_id = :coach_user_id` | `DELETE` | Parent for group_members, assignments, notes(group_id) |
| 19 | `profiles` | `user_id = :coach_user_id` | `DELETE` (optional pre-step) | Usually cascades from auth delete |
| 20 | `auth.users` | `id = :coach_user_id` | `DELETE` (admin API) | Final auth record removal |

Notes:
- If you rely on `auth.users` cascade only, unresolved unknown FKs in older tables may still block deletion.
- Explicit purging is safer until full live constraint introspection is done.

---

## 3) Student Deletion Dependency Chain

Safe explicit order (children first):

| Order | Table | Filter condition | Action | Dependent rows impacted |
|---|---|---|---|---|
| 1 | `task_instances` | `assignee_id = :student_user_id` OR `updated_by = :student_user_id` | `DELETE` (or `SET NULL` for `updated_by`) | Avoid unknown FK blockers on task audit columns |
| 2 | `assignments` | `assignee_id = :student_user_id` | `DELETE` | Parent of student task instances |
| 3 | `group_members` | `user_id = :student_user_id` | `DELETE` | Student membership cleanup |
| 4 | `class_members` | `user_id = :student_user_id` | `DELETE` | Student class membership cleanup |
| 5 | `instructor_students` | `student_id = :student_user_id` | `DELETE` | Coach-student relationship cleanup |
| 6 | `notes` | `from_user_id = :student_user_id` | `DELETE` | Remove authored notes |
| 7 | `notes` | `to_user_id = :student_user_id` | `SET NULL` (or `DELETE`) | Preserve group notes if desired |
| 8 | `recurring_schedules` | `assigned_student_id = :student_user_id` | `SET NULL` (preferred) or `DELETE` | Preserves coach schedules while removing dead assignee refs |
| 9 | `tasks` | `assigned_student_id = :student_user_id` | `SET NULL` or `DELETE` by policy | Depends on product decision for historical tasks |
| 10 | `tasks` | `user_id = :student_user_id` | `DELETE` | Student-owned legacy tasks |
| 11 | `routines` | `user_id = :student_user_id` | `DELETE` | Student-owned routines |
| 12 | `people` | `user_id = :student_user_id` | `DELETE` | Student-owned people records |
| 13 | `user_stickers` | `user_id = :student_user_id` | `DELETE` | Student rewards |
| 14 | `student_logs` | `user_id = :student_user_id` | `DELETE` | Wellness logs |
| 15 | `chat_messages` | `user_id = :student_user_id` | `DELETE` | Student AI/chat history |
| 16 | `profiles` | `user_id = :student_user_id` | `DELETE` (optional pre-step) | Usually cascades from auth delete |
| 17 | `auth.users` | `id = :student_user_id` | `DELETE` (admin API) | Final auth record removal |

---

## 4) Auth Layer Findings

### A) Supabase user deletion API

- Supabase provides admin deletion via `supabase.auth.admin.deleteUser(userId)` (and soft-delete option in current docs).
- This is an **admin** operation and should be performed server-side with service-role credentials.

### B) Can end users delete themselves from client SDK?

- There is no normal client-side self-delete method for authenticated users using anon keys.
- Practical pattern: client calls secure backend/Edge function, backend verifies user intent, backend calls admin delete with service role.

### C) Signup trigger and re-signup behavior

- `handle_new_user` trigger exists and is redefined in `20260128034942_create_handle_new_user_trigger.sql`.
- It inserts into `profiles` on `auth.users` insert and uses `ON CONFLICT (user_id) DO NOTHING`.
- If a new auth user row is created later (new `auth.users.id`), a fresh `profiles` row is created for that new `user_id`.

---

## 5) Edge Cases / Risks to Flag

### 1) What happens to groups owned by a deleted coach?

- `groups.coach_id` appears in types but FK action is not visible in checked-in migrations.
- If FK is `CASCADE`, deleting coach deletes groups and students lose membership/access to those groups.
- If FK is `NO ACTION`, coach delete may fail until groups are reassigned/deleted.

### 2) What happens to `task_instances` if coach is deleted but student remains?

- `task_instances.coach_id` FK was added without `ON DELETE` clause (`NO ACTION` default), nullable column.
- If rows still point to deleted coach, auth-user delete can be blocked unless you delete those rows or null the coach_id first.

### 3) Any RESTRICT/NO ACTION blockers?

- No explicit `RESTRICT` found in migrations.
- At least one likely blocker exists: `task_instances.coach_id -> auth.users` with default `NO ACTION` behavior.
- Additional blockers may exist in legacy tables whose DDL is not in repo.

### 4) RLS interference risk

- If deletion is done through normal user session/client, RLS likely blocks many cleanup steps (some tables have no delete policy in migrations).
- If deletion is done through service-role/admin path, RLS is bypassed for backend cleanup.

---

## Recommended Pre-Implementation Validation (SQL to run in Supabase)

Before shipping delete-account, run live introspection in production/staging DB:

1. Find all FKs to `auth.users` and their delete action:
- query `pg_constraint`, `pg_class`, `pg_namespace`, `pg_attribute`, `pg_get_constraintdef(...)`

2. Find all FKs to `profiles`:
- same query filtered to `profiles`

3. Confirm RLS delete capability table-by-table for self-service paths:
- query `pg_policies` for `cmd IN ('DELETE','ALL')`

This should be treated as required because core table DDL is partially missing from repo history.
