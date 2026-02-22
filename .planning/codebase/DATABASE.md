# TeachCoachConnect Database Schema

Generated: 2026-02-18
Supabase Project: vjzaayxeoeojuccbriid

This document is generated from live schema metadata in `public` via Supabase MCP SQL queries.

## Tables

### 1. User Identity

#### `profiles`
Purpose: user profile records linked to auth identity and app role.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | null |
| display_name | text | YES | null |
| avatar_url | text | YES | null |
| role | text | YES | 'student'::text |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| email | text | YES | null |
| timezone | text | YES | 'America/New_York'::text |

Primary key: `profiles_pkey (id)`.

Foreign keys:
- `profiles_user_id_fkey`: `user_id -> (foreign_table NULL in query, foreign_column NULL in query)`.

Notable indexes:
- `profiles_pkey` (unique on `id`)
- `profiles_user_id_key` (unique on `user_id`)

### 2. Coach/Student Relationships

#### `instructor_students`
Purpose: direct instructor-to-student relationship records, optionally tied to class sessions.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| instructor_id | uuid | NO | null |
| student_id | uuid | NO | null |
| created_at | timestamp with time zone | YES | now() |
| class_session_id | uuid | YES | null |

Primary key: `instructor_students_pkey (id)`.

Foreign keys:
- `instructor_students_class_session_id_fkey`: `class_session_id -> class_sessions.id`
- `instructor_students_instructor_id_fkey`: `instructor_id -> (foreign_table NULL in query, foreign_column NULL in query)`
- `instructor_students_student_id_fkey`: `student_id -> (foreign_table NULL in query, foreign_column NULL in query)`

Notable indexes:
- `instructor_students_pkey` (unique on `id`)
- `instructor_students_instructor_id_student_id_key` (unique on `instructor_id, student_id`)

#### `groups`
Purpose: coach-owned groups with join code and QR token.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| name | text | NO | null |
| color | text | NO | '#3B82F6'::text |
| icon | text | YES | 'users'::text |
| coach_id | uuid | NO | null |
| created_at | timestamp with time zone | YES | now() |
| join_code | text | NO | null |
| qr_token | uuid | YES | gen_random_uuid() |

Primary key: `groups_pkey (id)`.

Foreign keys:
- `groups_coach_id_fkey`: `coach_id -> (foreign_table NULL in query, foreign_column NULL in query)`

Notable indexes:
- `groups_pkey` (unique on `id`)
- `groups_join_code_key` (unique on `join_code`)
- `groups_qr_token_key` (unique on `qr_token`)
- `idx_groups_coach` (`coach_id`)

#### `group_members`
Purpose: membership table connecting users to groups with member/admin role.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| group_id | uuid | NO | null |
| user_id | uuid | NO | null |
| role | text | NO | 'member'::text |
| joined_at | timestamp with time zone | YES | now() |

Primary key: `group_members_pkey (id)`.

Foreign keys:
- `group_members_group_id_fkey`: `group_id -> groups.id`
- `group_members_user_id_fkey`: `user_id -> (foreign_table NULL in query, foreign_column NULL in query)`

Notable indexes:
- `group_members_pkey` (unique on `id`)
- `group_members_group_id_user_id_key` (unique on `group_id, user_id`)
- `idx_group_members_group` (`group_id`)
- `idx_group_members_user` (`user_id`)

### 3. Parent Relationships

#### `parent_children`
Purpose: links parent users to child users.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| parent_id | uuid | NO | null |
| child_id | uuid | NO | null |
| created_at | timestamp with time zone | NO | now() |

Primary key: `parent_children_pkey (id)`.

Foreign keys:
- `parent_children_child_id_fkey`: `child_id -> profiles.user_id`
- `parent_children_parent_id_fkey`: `parent_id -> profiles.user_id`

Notable indexes:
- `parent_children_pkey` (unique on `id`)
- `parent_children_parent_id_child_id_key` (unique on `parent_id, child_id`)

#### `parent_links`
Purpose: stores parent link/invite code per student.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| student_id | uuid | NO | null |
| link_code | text | NO | null |
| created_at | timestamp with time zone | NO | now() |

Primary key: `parent_links_pkey (id)`.

Foreign keys:
- `parent_links_student_id_fkey`: `student_id -> profiles.user_id`

Notable indexes:
- `parent_links_pkey` (unique on `id`)
- `parent_links_link_code_key` (unique on `link_code`)
- `parent_links_student_id_key` (unique on `student_id`)
- `idx_parent_links_link_code` (`link_code`)

### 4. Task Pipeline

#### `tasks`
Purpose: task records (standalone, template-generated, or recurring-generated).

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | null |
| routine_id | uuid | YES | null |
| person_id | uuid | YES | null |
| title | text | NO | null |
| description | text | YES | null |
| duration_minutes | integer | YES | null |
| scheduled_time | time without time zone | YES | null |
| is_completed | boolean | YES | false |
| completed_at | timestamp with time zone | YES | null |
| due_date | date | YES | null |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| assigned_student_id | uuid | YES | null |
| batch_id | uuid | YES | null |
| recurring_schedule_id | uuid | YES | null |
| priority | text | YES | 'medium'::text |
| category | text | YES | null |
| scheduled_date | date | YES | null |

Primary key: `tasks_pkey (id)`.

Foreign keys:
- `tasks_assigned_student_id_fkey`: `assigned_student_id -> (foreign_table NULL in query, foreign_column NULL in query)`
- `tasks_person_id_fkey`: `person_id -> people.id`
- `tasks_recurring_schedule_id_fkey`: `recurring_schedule_id -> recurring_schedules.id`
- `tasks_routine_id_fkey`: `routine_id -> routines.id`
- `tasks_user_id_fkey`: `user_id -> (foreign_table NULL in query, foreign_column NULL in query)`

Notable indexes:
- `tasks_pkey` (unique on `id`)
- `idx_tasks_batch_id` (`batch_id`)
- `idx_tasks_recurring_schedule_id` (`recurring_schedule_id`)
- `idx_tasks_scheduled_date` (`scheduled_date`)

#### `templates`
Purpose: coach-owned task plan templates.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| coach_id | uuid | NO | null |
| name | text | NO | null |
| description | text | YES | null |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |
| category | text | YES | 'other'::text |
| duration_weeks | integer | YES | 1 |
| frequency_per_week | integer | YES | 1 |
| tags | ARRAY | YES | '{}'::text[] |
| weeks | jsonb | YES | '[]'::jsonb |
| is_ai_generated | boolean | YES | false |

Primary key: `templates_pkey (id)`.

Foreign keys:
- `templates_coach_id_fkey`: `coach_id -> (foreign_table NULL in query, foreign_column NULL in query)`

Notable indexes:
- `templates_pkey` (unique on `id`)
- `idx_templates_coach_id` (`coach_id`)

#### `template_tasks`
Purpose: tasks belonging to a template, including ordering/timing offsets.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| template_id | uuid | NO | null |
| title | text | NO | null |
| description | text | YES | null |
| duration_minutes | integer | YES | null |
| day_offset | integer | NO | 0 |
| sort_order | integer | YES | 0 |
| created_at | timestamp with time zone | YES | now() |
| start_time | text | YES | null |
| end_time | text | YES | null |
| due_time_offset_minutes | integer | YES | null |

Primary key: `template_tasks_pkey (id)`.

Foreign keys:
- `template_tasks_template_id_fkey`: `template_id -> templates.id`

Notable indexes:
- `template_tasks_pkey` (unique on `id`)
- `idx_template_tasks_template_id` (`template_id`)

#### `assignments`
Purpose: assignment batches from coach to assignees/groups and scheduling metadata.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| template_id | uuid | YES | null |
| group_id | uuid | YES | null |
| assignee_id | uuid | YES | null |
| assigned_by | uuid | NO | null |
| schedule_type | text | NO | 'once'::text |
| schedule_days | ARRAY | YES | '{}'::integer[] |
| start_date | date | NO | CURRENT_DATE |
| end_date | date | YES | null |
| is_active | boolean | YES | true |
| created_at | timestamp with time zone | YES | now() |

Primary key: `assignments_pkey (id)`.

Foreign keys:
- `assignments_assigned_by_fkey`: `assigned_by -> (foreign_table NULL in query, foreign_column NULL in query)`
- `assignments_assignee_id_fkey`: `assignee_id -> (foreign_table NULL in query, foreign_column NULL in query)`
- `assignments_group_id_fkey`: `group_id -> groups.id`
- `assignments_template_id_fkey`: `template_id -> templates.id`

Notable indexes:
- `assignments_pkey` (unique on `id`)
- `idx_assignments_assignee` (`assignee_id`)
- `idx_assignments_group` (`group_id`)

#### `task_instances`
Purpose: concrete task instances for assignees (status/completion/coach edits).

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| assignment_id | uuid | YES | null |
| assignee_id | uuid | NO | null |
| name | text | NO | null |
| description | text | YES | null |
| duration_minutes | integer | YES | null |
| scheduled_date | date | NO | null |
| scheduled_time | time without time zone | YES | null |
| status | text | NO | 'pending'::text |
| completed_at | timestamp with time zone | YES | null |
| student_note | text | YES | null |
| created_at | timestamp with time zone | YES | now() |
| is_customized | boolean | NO | false |
| coach_note | text | YES | null |
| updated_at | timestamp with time zone | YES | null |
| updated_by | uuid | YES | null |
| coach_id | uuid | YES | null |
| start_time | text | YES | null |
| end_time | text | YES | null |
| assign_date | date | YES | null |

Primary key: `task_instances_pkey (id)`.

Foreign keys:
- `task_instances_assignee_id_fkey`: `assignee_id -> (foreign_table NULL in query, foreign_column NULL in query)`
- `task_instances_assignment_id_fkey`: `assignment_id -> assignments.id`
- `task_instances_coach_id_fkey`: `coach_id -> (foreign_table NULL in query, foreign_column NULL in query)`
- `task_instances_updated_by_fkey`: `updated_by -> (foreign_table NULL in query, foreign_column NULL in query)`

Notable indexes:
- `task_instances_pkey` (unique on `id`)
- `idx_task_instances_assign_date` (`assign_date`)
- `idx_task_instances_assignee` (`assignee_id`)
- `idx_task_instances_assignment` (`assignment_id`)
- `idx_task_instances_coach_id` (`coach_id`)
- `idx_task_instances_date` (`scheduled_date`)

#### `recurring_schedules`
Purpose: recurring schedule definitions used to generate tasks.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | null |
| template_id | uuid | YES | null |
| name | text | NO | null |
| description | text | YES | null |
| recurrence_type | text | NO | null |
| days_of_week | ARRAY | YES | ARRAY[]::integer[] |
| custom_interval_days | integer | YES | null |
| start_date | date | NO | CURRENT_DATE |
| end_date | date | YES | null |
| is_active | boolean | YES | true |
| assigned_student_id | uuid | YES | null |
| class_session_id | uuid | YES | null |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

Primary key: `recurring_schedules_pkey (id)`.

Foreign keys:
- `recurring_schedules_assigned_student_id_fkey`: `assigned_student_id -> (foreign_table NULL in query, foreign_column NULL in query)`
- `recurring_schedules_class_session_id_fkey`: `class_session_id -> class_sessions.id`
- `recurring_schedules_template_id_fkey`: `template_id -> templates.id`
- `recurring_schedules_user_id_fkey`: `user_id -> (foreign_table NULL in query, foreign_column NULL in query)`

Notable indexes:
- `recurring_schedules_pkey` (unique on `id`)
- `idx_recurring_schedules_assigned_student` (`assigned_student_id`)
- `idx_recurring_schedules_user_id` (`user_id`)

### 5. Classes

#### `class_sessions`
Purpose: coach-created class/session entities with join code/QR lifecycle.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| coach_id | uuid | NO | null |
| name | text | NO | null |
| join_code | text | NO | null |
| qr_token | uuid | NO | gen_random_uuid() |
| is_active | boolean | YES | true |
| expires_at | timestamp with time zone | YES | null |
| created_at | timestamp with time zone | NO | now() |
| default_template_id | uuid | YES | null |

Primary key: `class_sessions_pkey (id)`.

Foreign keys:
- `class_sessions_coach_id_fkey`: `coach_id -> (foreign_table NULL in query, foreign_column NULL in query)`
- `class_sessions_default_template_id_fkey`: `default_template_id -> templates.id`

Notable indexes:
- `class_sessions_pkey` (unique on `id`)
- `class_sessions_join_code_key` (unique on `join_code`)
- `class_sessions_qr_token_key` (unique on `qr_token`)

#### `class_members`
Purpose: membership table connecting users to class sessions.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| class_session_id | uuid | NO | null |
| user_id | uuid | NO | null |
| display_name | text | YES | null |
| joined_at | timestamp with time zone | NO | now() |

Primary key: `class_members_pkey (id)`.

Foreign keys:
- `class_members_class_session_id_fkey`: `class_session_id -> class_sessions.id`
- `class_members_user_id_fkey`: `user_id -> (foreign_table NULL in query, foreign_column NULL in query)`

Notable indexes:
- `class_members_pkey` (unique on `id`)
- `unique_class_member` (unique on `class_session_id, user_id`)

### 6. Communication

#### `chat_messages`
Purpose: chat/assistant message history per user.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | null |
| role | text | NO | null |
| content | text | NO | null |
| created_at | timestamp with time zone | NO | now() |

Primary key: `chat_messages_pkey (id)`.

Foreign keys:
- `chat_messages_user_id_fkey`: `user_id -> (foreign_table NULL in query, foreign_column NULL in query)`

Notable indexes:
- `chat_messages_pkey` (unique on `id`)

#### `notes`
Purpose: coach/student/group/class notes/messages.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| class_session_id | uuid | YES | null |
| from_user_id | uuid | NO | null |
| to_user_id | uuid | YES | null |
| content | text | NO | null |
| created_at | timestamp with time zone | YES | now() |
| visibility | text | YES | 'shared'::text |
| tags | ARRAY | YES | null |
| title | text | YES | null |
| group_id | uuid | YES | null |

Primary key: `notes_pkey (id)`.

Foreign keys:
- `notes_class_session_id_fkey`: `class_session_id -> class_sessions.id`
- `notes_from_user_id_fkey`: `from_user_id -> (foreign_table NULL in query, foreign_column NULL in query)`
- `notes_group_id_fkey`: `group_id -> groups.id`
- `notes_to_user_id_fkey`: `to_user_id -> (foreign_table NULL in query, foreign_column NULL in query)`

Notable indexes:
- `notes_pkey` (unique on `id`)
- `idx_notes_group_id` (`group_id`)

### 7. Tracking and Rewards

#### `student_logs`
Purpose: periodic student sentiment/log records.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | null |
| log_date | date | NO | CURRENT_DATE |
| sentiment | text | NO | null |
| notes | text | YES | null |
| created_at | timestamp with time zone | NO | now() |

Primary key: `student_logs_pkey (id)`.

Foreign keys:
- `student_logs_user_id_fkey`: `user_id -> (foreign_table NULL in query, foreign_column NULL in query)`

Notable indexes:
- `student_logs_pkey` (unique on `id`)
- `unique_user_log_per_day` (unique on `user_id, log_date`)

#### `stickers`
Purpose: sticker catalog for rewards.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| name | text | NO | null |
| image_url | text | NO | null |
| rarity | text | YES | 'common'::text |
| created_at | timestamp with time zone | NO | now() |

Primary key: `stickers_pkey (id)`.

Foreign keys: none.

Notable indexes:
- `stickers_pkey` (unique on `id`)

#### `user_stickers`
Purpose: user-earned sticker records, optionally linked to tasks.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | null |
| sticker_id | uuid | NO | null |
| earned_at | timestamp with time zone | NO | now() |
| task_id | uuid | YES | null |

Primary key: `user_stickers_pkey (id)`.

Foreign keys:
- `user_stickers_sticker_id_fkey`: `sticker_id -> stickers.id`
- `user_stickers_task_id_fkey`: `task_id -> tasks.id`
- `user_stickers_user_id_fkey`: `user_id -> (foreign_table NULL in query, foreign_column NULL in query)`

Notable indexes:
- `user_stickers_pkey` (unique on `id`)

### 8. Misc

#### `people`
Purpose: user-owned person records (purpose inferred from name/type fields).

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | null |
| name | text | NO | null |
| type | text | NO | null |
| age | integer | YES | null |
| notes | text | YES | null |
| avatar_url | text | YES | null |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |

Primary key: `people_pkey (id)`.

Foreign keys:
- `people_user_id_fkey`: `user_id -> (foreign_table NULL in query, foreign_column NULL in query)`

Notable indexes:
- `people_pkey` (unique on `id`)

#### `routines`
Purpose: user-owned routines, optionally tied to a `people` record.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | null |
| person_id | uuid | YES | null |
| name | text | NO | null |
| description | text | YES | null |
| schedule | text | YES | null |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |

Primary key: `routines_pkey (id)`.

Foreign keys:
- `routines_person_id_fkey`: `person_id -> people.id`
- `routines_user_id_fkey`: `user_id -> (foreign_table NULL in query, foreign_column NULL in query)`

Notable indexes:
- `routines_pkey` (unique on `id`)

## RPC Functions

| Name | Parameters | Return Type | Security Mode | Purpose |
|---|---|---|---|---|
| accept_invite | `p_join_code text` | `json` | SECURITY DEFINER | Accept invite code and create/update class relationship (inferred from name). |
| assign_task_to_group | `p_group_id uuid, p_title text, p_description text DEFAULT NULL::text, p_assign_date date DEFAULT NULL::date, p_due_date date DEFAULT NULL::date, p_start_time text DEFAULT NULL::text, p_end_time text DEFAULT NULL::text` | `integer` | SECURITY DEFINER | Assign one task payload to group members (inferred from name). |
| assign_task_to_student | `p_student_id uuid, p_group_id uuid, p_title text, p_description text DEFAULT NULL::text, p_assign_date date DEFAULT NULL::date, p_due_date date DEFAULT NULL::date, p_start_time text DEFAULT NULL::text, p_end_time text DEFAULT NULL::text` | `integer` | SECURITY DEFINER | Assign one task payload to a single student (inferred from name). |
| assign_template_tasks_on_join | *(none)* | `trigger` | SECURITY DEFINER | Trigger helper to assign template tasks on join (purpose inferred from name). |
| assign_template_to_student | `p_template_id uuid, p_student_id uuid, p_start_date date DEFAULT CURRENT_DATE` | `json` | SECURITY DEFINER | Create student tasks from template (inferred from name). |
| auto_assign_template_on_join | *(none)* | `trigger` | SECURITY DEFINER | Trigger helper for auto-assign on join (inferred from name). |
| clean_up_student_on_group_removal | *(none)* | `trigger` | SECURITY DEFINER | Trigger helper to clean records when group member removed (inferred from name). |
| create_parent_link_for_student | *(none)* | `trigger` | SECURITY DEFINER | Trigger helper to create parent link code for student (inferred from name). |
| delete_class_session | `p_session_id uuid` | `json` | SECURITY DEFINER | Delete class session by id (inferred from name). |
| generate_group_join_code | *(none)* | `text` | SECURITY INVOKER | Generate group join code (inferred from name). |
| generate_join_code | *(none)* | `text` | SECURITY INVOKER | Generate class join code (inferred from name). |
| generate_parent_link_code | *(none)* | `text` | SECURITY INVOKER | Generate parent link code (inferred from name). |
| generate_recurring_tasks | `p_schedule_id uuid, p_from_date date DEFAULT CURRENT_DATE, p_to_date date DEFAULT (CURRENT_DATE + 30)` | `json` | SECURITY DEFINER | Generate task rows from recurring schedule (inferred from name). |
| get_group_members_for_user | `p_group_id uuid` | `TABLE(id uuid, group_id uuid, user_id uuid, role text, joined_at timestamp with time zone)` | SECURITY DEFINER | Return group members for a group with auth gate (inferred from name). |
| get_linked_children | `p_parent_id uuid` | `SETOF uuid` | SECURITY DEFINER | Return child IDs linked to a parent (inferred from name). |
| handle_new_user | *(none)* | `trigger` | SECURITY DEFINER | Trigger helper for new user bootstrap; purpose unclear, needs confirmation. |
| is_group_member | `p_group_id uuid, p_user_id uuid` | `boolean` | SECURITY DEFINER | Check whether user is member of group (inferred from name). |
| join_group_by_code | `p_join_code text` | `json` | SECURITY DEFINER | Join group using join code (inferred from name). |
| remove_student_from_class | `p_connection_id uuid` | `json` | SECURITY DEFINER | Remove student/class relationship by connection id (inferred from name). |
| set_group_join_code | *(none)* | `trigger` | SECURITY INVOKER | Trigger helper to set group join code (inferred from name). |
| set_task_instance_coach_id | *(none)* | `trigger` | SECURITY INVOKER | Trigger helper to set `task_instances.coach_id` (inferred from name). |
| sync_profile_role_from_auth_metadata | *(none)* | `trigger` | SECURITY DEFINER | Trigger helper to sync profile role from auth metadata (inferred from name). |
| update_updated_at_column | *(none)* | `trigger` | SECURITY INVOKER | Generic trigger helper to set `updated_at` columns (inferred from name). |
| validate_group_join_code | `code text` | `TABLE(group_id uuid, group_name text, coach_id uuid)` | SECURITY DEFINER | Validate group join code and return group context (inferred from name). |
| validate_join_code | `code text` | `TABLE(session_id uuid, session_name text, coach_id uuid)` | SECURITY DEFINER | Validate class join code and return session context (inferred from name). |
| validate_qr_token | `token uuid` | `TABLE(session_id uuid, session_name text, coach_id uuid)` | SECURITY DEFINER | Validate class QR token and return session context (inferred from name). |

## Triggers

| Trigger | Event | Table | Action |
|---|---|---|---|
| on_group_member_removal | DELETE | group_members | EXECUTE FUNCTION clean_up_student_on_group_removal() |
| trigger_set_group_join_code | INSERT | groups | EXECUTE FUNCTION set_group_join_code() |
| trigger_auto_assign_template | INSERT | instructor_students | EXECUTE FUNCTION auto_assign_template_on_join() |
| update_people_updated_at | UPDATE | people | EXECUTE FUNCTION update_updated_at_column() |
| create_parent_link_for_student_trigger | INSERT | profiles | EXECUTE FUNCTION create_parent_link_for_student() |
| update_profiles_updated_at | UPDATE | profiles | EXECUTE FUNCTION update_updated_at_column() |
| update_recurring_schedules_updated_at | UPDATE | recurring_schedules | EXECUTE FUNCTION update_updated_at_column() |
| update_routines_updated_at | UPDATE | routines | EXECUTE FUNCTION update_updated_at_column() |
| set_coach_id_trigger | INSERT | task_instances | EXECUTE FUNCTION set_task_instance_coach_id() |
| update_tasks_updated_at | UPDATE | tasks | EXECUTE FUNCTION update_updated_at_column() |
| update_templates_updated_at | UPDATE | templates | EXECUTE FUNCTION update_updated_at_column() |

## Key Relationships

- Coach -> groups -> group_members -> students
  - `groups.id` -> `group_members.group_id`
  - `groups.coach_id` and `group_members.user_id` foreign targets are NULL in the provided constraint query output (cross-schema target likely; needs confirmation).

- Coach -> instructor_students -> students
  - `instructor_students.instructor_id` and `instructor_students.student_id` foreign targets are NULL in the provided constraint query output (needs confirmation).

- Parent -> parent_children -> students
  - `parent_children.parent_id -> profiles.user_id`
  - `parent_children.child_id -> profiles.user_id`

- Coach -> templates -> template_tasks -> assignments -> task_instances
  - `template_tasks.template_id -> templates.id`
  - `assignments.template_id -> templates.id`
  - `task_instances.assignment_id -> assignments.id`

- Coach -> class_sessions -> class_members
  - `class_members.class_session_id -> class_sessions.id`
  - `class_sessions.coach_id` and `class_members.user_id` foreign targets are NULL in the provided constraint query output (needs confirmation).
