# Security Audit Report — Chunk 3: RLS Audit and Enablement
**Date:** 2026-02-18
**Auditor:** Codex
**Scope:** Public schema RLS state, public RLS policies, and listed public RPC function security modes for Supabase project `vjzaayxeoeojuccbriid`

## Section 1: RLS Status Audit (from 3A)

### Full table listing with RLS status

| schemaname | tablename | rowsecurity |
|---|---|---|
| public | assignments | true |
| public | chat_messages | true |
| public | class_members | true |
| public | class_sessions | true |
| public | group_members | true |
| public | groups | true |
| public | instructor_students | true |
| public | notes | true |
| public | parent_children | true |
| public | parent_links | true |
| public | people | true |
| public | profiles | true |
| public | recurring_schedules | true |
| public | routines | true |
| public | stickers | true |
| public | student_logs | true |
| public | task_instances | true |
| public | tasks | true |
| public | template_tasks | true |
| public | templates | true |
| public | user_stickers | true |

### Missing or unexpected tables
- Missing expected tables: none.
- Unexpected tables: none.
- Note: prompt text says "expected 20" tables, but the provided expected-name list contains 21 tables. Actual public schema also contains 21 tables.

## Section 2: Existing Policy Audit (from 3B)

### Full policy listing per table

```json
[
  {
    "tablename": "assignments",
    "policies": [
      {
        "cmd": "SELECT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Assignees can view their assignments",
        "with_check": null,
        "using_expression": "((assignee_id = auth.uid()) OR (group_id IN ( SELECT group_members.group_id\n   FROM group_members\n  WHERE (group_members.user_id = auth.uid()))))"
      },
      {
        "cmd": "ALL",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Coaches can manage assignments",
        "with_check": null,
        "using_expression": "(assigned_by = auth.uid())"
      }
    ]
  },
  {
    "tablename": "chat_messages",
    "policies": [
      {
        "cmd": "INSERT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can create messages",
        "with_check": "(auth.uid() = user_id)",
        "using_expression": null
      },
      {
        "cmd": "DELETE",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can delete their own messages",
        "with_check": null,
        "using_expression": "(auth.uid() = user_id)"
      },
      {
        "cmd": "SELECT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can view their own messages",
        "with_check": null,
        "using_expression": "(auth.uid() = user_id)"
      }
    ]
  },
  {
    "tablename": "class_members",
    "policies": [
      {
        "cmd": "SELECT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Coaches can view class members",
        "with_check": null,
        "using_expression": "(EXISTS ( SELECT 1\n   FROM class_sessions cs\n  WHERE ((cs.id = class_members.class_session_id) AND (cs.coach_id = auth.uid()))))"
      },
      {
        "cmd": "INSERT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can join classes",
        "with_check": "(auth.uid() = user_id)",
        "using_expression": null
      },
      {
        "cmd": "SELECT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can view their memberships",
        "with_check": null,
        "using_expression": "(auth.uid() = user_id)"
      }
    ]
  },
  {
    "tablename": "class_sessions",
    "policies": [
      {
        "cmd": "SELECT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Anyone can lookup active sessions",
        "with_check": null,
        "using_expression": "(is_active = true)"
      },
      {
        "cmd": "INSERT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Coaches can create sessions",
        "with_check": "(auth.uid() = coach_id)",
        "using_expression": null
      },
      {
        "cmd": "UPDATE",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Coaches can update own sessions",
        "with_check": null,
        "using_expression": "(auth.uid() = coach_id)"
      },
      {
        "cmd": "SELECT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Coaches can view own sessions",
        "with_check": null,
        "using_expression": "(auth.uid() = coach_id)"
      }
    ]
  },
  {
    "tablename": "group_members",
    "policies": [
      {
        "cmd": "INSERT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Coaches can add members to their groups",
        "with_check": "(EXISTS ( SELECT 1\n   FROM groups g\n  WHERE ((g.id = group_members.group_id) AND (g.coach_id = auth.uid()))))",
        "using_expression": null
      },
      {
        "cmd": "ALL",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Coaches can manage group members",
        "with_check": null,
        "using_expression": "(group_id IN ( SELECT groups.id\n   FROM groups\n  WHERE (groups.coach_id = auth.uid())))"
      },
      {
        "cmd": "DELETE",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Coaches can remove members from their groups",
        "with_check": null,
        "using_expression": "(EXISTS ( SELECT 1\n   FROM groups g\n  WHERE ((g.id = group_members.group_id) AND (g.coach_id = auth.uid()))))"
      },
      {
        "cmd": "SELECT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "View group members",
        "with_check": null,
        "using_expression": "((EXISTS ( SELECT 1\n   FROM groups g\n  WHERE ((g.id = group_members.group_id) AND (g.coach_id = auth.uid())))) OR (user_id = auth.uid()))"
      }
    ]
  },
  {
    "tablename": "groups",
    "policies": [
      {
        "cmd": "SELECT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Authenticated users can lookup groups by qr_token",
        "with_check": null,
        "using_expression": "(auth.role() = 'authenticated'::text)"
      },
      {
        "cmd": "ALL",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Coaches can manage their groups",
        "with_check": null,
        "using_expression": "(coach_id = auth.uid())"
      },
      {
        "cmd": "SELECT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Members can view their groups",
        "with_check": null,
        "using_expression": "((coach_id = auth.uid()) OR is_group_member(id, auth.uid()))"
      }
    ]
  },
  {
    "tablename": "instructor_students",
    "policies": [
      {
        "cmd": "SELECT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Instructors can view their students",
        "with_check": null,
        "using_expression": "(auth.uid() = instructor_id)"
      },
      {
        "cmd": "SELECT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Students can view their instructors",
        "with_check": null,
        "using_expression": "(auth.uid() = student_id)"
      },
      {
        "cmd": "INSERT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "System can insert relationships",
        "with_check": "(auth.uid() = student_id)",
        "using_expression": null
      }
    ]
  },
  {
    "tablename": "notes",
    "policies": [
      {
        "cmd": "ALL",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Coaches can manage notes for their groups",
        "with_check": null,
        "using_expression": "((EXISTS ( SELECT 1\n   FROM groups g\n  WHERE ((g.id = notes.group_id) AND (g.coach_id = auth.uid())))) OR (from_user_id = auth.uid()))"
      },
      {
        "cmd": "SELECT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Group members can view shared notes",
        "with_check": null,
        "using_expression": "((from_user_id = auth.uid()) OR (to_user_id = auth.uid()) OR ((visibility = 'shared'::text) AND (EXISTS ( SELECT 1\n   FROM group_members gm\n  WHERE ((gm.group_id = notes.group_id) AND (gm.user_id = auth.uid()))))))"
      },
      {
        "cmd": "DELETE",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can delete their own notes",
        "with_check": null,
        "using_expression": "(auth.uid() = from_user_id)"
      },
      {
        "cmd": "INSERT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can insert notes",
        "with_check": "(auth.uid() = from_user_id)",
        "using_expression": null
      },
      {
        "cmd": "SELECT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can view notes they sent or received",
        "with_check": null,
        "using_expression": "((auth.uid() = from_user_id) OR (auth.uid() = to_user_id))"
      },
      {
        "cmd": "SELECT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "parent_select_notes",
        "with_check": null,
        "using_expression": "((to_user_id IN ( SELECT get_linked_children(auth.uid()) AS get_linked_children)) OR ((group_id IN ( SELECT group_members.group_id\n   FROM group_members\n  WHERE (group_members.user_id IN ( SELECT get_linked_children(auth.uid()) AS get_linked_children)))) AND (to_user_id IS NULL)))"
      }
    ]
  },
  {
    "tablename": "parent_children",
    "policies": [
      {
        "cmd": "DELETE",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "parent_delete_parent_children",
        "with_check": null,
        "using_expression": "(parent_id = auth.uid())"
      },
      {
        "cmd": "INSERT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "parent_insert_parent_children",
        "with_check": "(parent_id = auth.uid())",
        "using_expression": null
      },
      {
        "cmd": "SELECT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "parent_select_parent_children",
        "with_check": null,
        "using_expression": "(parent_id = auth.uid())"
      }
    ]
  },
  {
    "tablename": "parent_links",
    "policies": [
      {
        "cmd": "SELECT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Students can view own parent link",
        "with_check": null,
        "using_expression": "(student_id = auth.uid())"
      },
      {
        "cmd": "SELECT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "parent_select_parent_links",
        "with_check": null,
        "using_expression": "true"
      }
    ]
  },
  {
    "tablename": "people",
    "policies": [
      {
        "cmd": "INSERT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can create people",
        "with_check": "(auth.uid() = user_id)",
        "using_expression": null
      },
      {
        "cmd": "DELETE",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can delete their own people",
        "with_check": null,
        "using_expression": "(auth.uid() = user_id)"
      },
      {
        "cmd": "UPDATE",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can update their own people",
        "with_check": null,
        "using_expression": "(auth.uid() = user_id)"
      },
      {
        "cmd": "SELECT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can view their own people",
        "with_check": null,
        "using_expression": "(auth.uid() = user_id)"
      }
    ]
  },
  {
    "tablename": "profiles",
    "policies": [
      {
        "cmd": "SELECT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Coaches can view profiles of their group members",
        "with_check": null,
        "using_expression": "((auth.uid() = user_id) OR (EXISTS ( SELECT 1\n   FROM (groups g\n     JOIN group_members gm ON ((gm.group_id = g.id)))\n  WHERE ((g.coach_id = auth.uid()) AND (gm.user_id = profiles.user_id)))))"
      },
      {
        "cmd": "SELECT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Students can view their coach profiles",
        "with_check": null,
        "using_expression": "((auth.uid() = user_id) OR (EXISTS ( SELECT 1\n   FROM (groups g\n     JOIN group_members gm ON ((gm.group_id = g.id)))\n  WHERE ((gm.user_id = auth.uid()) AND (g.coach_id = profiles.user_id)))))"
      },
      {
        "cmd": "INSERT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can insert their own profile",
        "with_check": "(auth.uid() = user_id)",
        "using_expression": null
      },
      {
        "cmd": "UPDATE",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can update their own profile",
        "with_check": null,
        "using_expression": "(auth.uid() = user_id)"
      },
      {
        "cmd": "SELECT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "parent_select_profiles",
        "with_check": null,
        "using_expression": "(user_id IN ( SELECT get_linked_children(auth.uid()) AS get_linked_children))"
      }
    ]
  },
  {
    "tablename": "recurring_schedules",
    "policies": [
      {
        "cmd": "SELECT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Students can view assigned recurring schedules",
        "with_check": null,
        "using_expression": "(assigned_student_id = auth.uid())"
      },
      {
        "cmd": "INSERT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can create recurring schedules",
        "with_check": "(user_id = auth.uid())",
        "using_expression": null
      },
      {
        "cmd": "DELETE",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can delete their recurring schedules",
        "with_check": null,
        "using_expression": "(user_id = auth.uid())"
      },
      {
        "cmd": "UPDATE",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can update their recurring schedules",
        "with_check": null,
        "using_expression": "(user_id = auth.uid())"
      },
      {
        "cmd": "SELECT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can view their recurring schedules",
        "with_check": null,
        "using_expression": "(user_id = auth.uid())"
      }
    ]
  },
  {
    "tablename": "routines",
    "policies": [
      {
        "cmd": "INSERT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can create routines",
        "with_check": "(auth.uid() = user_id)",
        "using_expression": null
      },
      {
        "cmd": "DELETE",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can delete their own routines",
        "with_check": null,
        "using_expression": "(auth.uid() = user_id)"
      },
      {
        "cmd": "UPDATE",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can update their own routines",
        "with_check": null,
        "using_expression": "(auth.uid() = user_id)"
      },
      {
        "cmd": "SELECT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can view their own routines",
        "with_check": null,
        "using_expression": "(auth.uid() = user_id)"
      }
    ]
  },
  {
    "tablename": "stickers",
    "policies": [
      {
        "cmd": "SELECT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Anyone can view stickers",
        "with_check": null,
        "using_expression": "true"
      }
    ]
  },
  {
    "tablename": "student_logs",
    "policies": [
      {
        "cmd": "INSERT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can create their own logs",
        "with_check": "(auth.uid() = user_id)",
        "using_expression": null
      },
      {
        "cmd": "UPDATE",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can update their own logs",
        "with_check": null,
        "using_expression": "(auth.uid() = user_id)"
      },
      {
        "cmd": "SELECT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can view their own logs",
        "with_check": null,
        "using_expression": "(auth.uid() = user_id)"
      }
    ]
  },
  {
    "tablename": "task_instances",
    "policies": [
      {
        "cmd": "ALL",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Coaches can manage task instances",
        "with_check": "(coach_id = auth.uid())",
        "using_expression": "(coach_id = auth.uid())"
      },
      {
        "cmd": "UPDATE",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Students can complete their tasks",
        "with_check": "(assignee_id = auth.uid())",
        "using_expression": "(assignee_id = auth.uid())"
      },
      {
        "cmd": "SELECT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Students can view and update their task instances",
        "with_check": null,
        "using_expression": "(assignee_id = auth.uid())"
      },
      {
        "cmd": "SELECT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "parent_select_task_instances",
        "with_check": null,
        "using_expression": "(assignee_id IN ( SELECT get_linked_children(auth.uid()) AS get_linked_children))"
      }
    ]
  },
  {
    "tablename": "tasks",
    "policies": [
      {
        "cmd": "INSERT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can create tasks",
        "with_check": "(auth.uid() = user_id)",
        "using_expression": null
      },
      {
        "cmd": "DELETE",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can delete their own tasks",
        "with_check": null,
        "using_expression": "(auth.uid() = user_id)"
      },
      {
        "cmd": "UPDATE",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can update their own tasks",
        "with_check": null,
        "using_expression": "(auth.uid() = user_id)"
      },
      {
        "cmd": "SELECT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can view own tasks or assigned instructor tasks",
        "with_check": null,
        "using_expression": "((auth.uid() = user_id) OR ((EXISTS ( SELECT 1\n   FROM instructor_students\n  WHERE ((instructor_students.instructor_id = tasks.user_id) AND (instructor_students.student_id = auth.uid())))) AND ((assigned_student_id IS NULL) OR (assigned_student_id = auth.uid()))))"
      }
    ]
  },
  {
    "tablename": "template_tasks",
    "policies": [
      {
        "cmd": "INSERT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can create template tasks",
        "with_check": "(template_id IN ( SELECT templates.id\n   FROM templates\n  WHERE (templates.coach_id = auth.uid())))",
        "using_expression": null
      },
      {
        "cmd": "DELETE",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can delete template tasks",
        "with_check": null,
        "using_expression": "(template_id IN ( SELECT templates.id\n   FROM templates\n  WHERE (templates.coach_id = auth.uid())))"
      },
      {
        "cmd": "UPDATE",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can update template tasks",
        "with_check": null,
        "using_expression": "(template_id IN ( SELECT templates.id\n   FROM templates\n  WHERE (templates.coach_id = auth.uid())))"
      },
      {
        "cmd": "SELECT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can view template tasks",
        "with_check": null,
        "using_expression": "(template_id IN ( SELECT templates.id\n   FROM templates\n  WHERE (templates.coach_id = auth.uid())))"
      }
    ]
  },
  {
    "tablename": "templates",
    "policies": [
      {
        "cmd": "INSERT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Coaches can create templates",
        "with_check": "(coach_id = auth.uid())",
        "using_expression": null
      },
      {
        "cmd": "DELETE",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Coaches can delete their templates",
        "with_check": null,
        "using_expression": "(coach_id = auth.uid())"
      },
      {
        "cmd": "UPDATE",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Coaches can update their templates",
        "with_check": null,
        "using_expression": "(coach_id = auth.uid())"
      },
      {
        "cmd": "SELECT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Coaches can view their templates",
        "with_check": null,
        "using_expression": "(coach_id = auth.uid())"
      }
    ]
  },
  {
    "tablename": "user_stickers",
    "policies": [
      {
        "cmd": "INSERT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can earn stickers",
        "with_check": "(auth.uid() = user_id)",
        "using_expression": null
      },
      {
        "cmd": "SELECT",
        "roles": [
          "public"
        ],
        "permissive": "PERMISSIVE",
        "policyname": "Users can view their own stickers",
        "with_check": null,
        "using_expression": "(auth.uid() = user_id)"
      }
    ]
  }
]
```

### Flagged issues
- `USING true` policies found (overly permissive):
  - `public.parent_links` → `parent_select_parent_links` (`SELECT`, `roles={public}`, `using_expression=true`) [HIGH]
  - `public.stickers` → `Anyone can view stickers` (`SELECT`, `roles={public}`, `using_expression=true`) [REVIEW; may be intentional for catalog-like data]
- Policies granting access to `public` role:
  - All policies in `public` schema currently use `roles={public}`. This includes unauthenticated role eligibility and should be reviewed policy-by-policy in Chunks 4-7.
- RLS enabled + zero policy tables:
  - None. Verified with policy-count query; every `public` table has at least 1 policy.

## Section 3: RPC Function Security Audit (from 3C)

### Full function listing with security mode

| function_name | security_mode |
|---|---|
| accept_invite | SECURITY DEFINER |
| assign_task_to_group | SECURITY DEFINER |
| assign_task_to_student | SECURITY DEFINER |
| assign_template_to_student | SECURITY DEFINER |
| delete_class_session | SECURITY DEFINER |
| generate_group_join_code | SECURITY INVOKER |
| generate_join_code | SECURITY INVOKER |
| generate_parent_link_code | SECURITY INVOKER |
| generate_recurring_tasks | SECURITY DEFINER |
| get_group_members_for_user | SECURITY DEFINER |
| get_linked_children | SECURITY DEFINER |
| is_group_member | SECURITY DEFINER |
| join_group_by_code | SECURITY DEFINER |
| remove_student_from_class | SECURITY DEFINER |
| validate_group_join_code | SECURITY DEFINER |
| validate_join_code | SECURITY DEFINER |
| validate_qr_token | SECURITY DEFINER |

### Flagged SECURITY DEFINER functions and assessment
- 14 of 17 listed functions are `SECURITY DEFINER` and therefore run with owner privileges (can bypass normal caller RLS path unless manually constrained).
- Functions with explicit auth checks in body (better but still privileged):
  - `accept_invite`, `assign_task_to_group`, `assign_task_to_student`, `delete_class_session`, `join_group_by_code`, `remove_student_from_class`
- Functions that should be reviewed carefully for least privilege and strict input/path handling:
  - `assign_template_to_student`, `generate_recurring_tasks`, `get_group_members_for_user`, `get_linked_children`, `is_group_member`, `validate_group_join_code`, `validate_join_code`, `validate_qr_token`
- Missing functions from expected list:
  - None.

## Section 4: RLS Enablement Results (from 3D)

### Tables where RLS was newly enabled
- None. Query `SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity=false` returned zero rows.

### Temporary policies added
- None. Since no table had RLS disabled and no table had zero policies, no temporary `temp_authenticated_access` policies were created.

### Verification results
- Re-ran 3A query: all 21 `public` tables have `rowsecurity = true`.
- Re-ran 3B query: policies present across all 21 `public` tables.
- Policy-count verification (table-by-table): all tables have `policy_count >= 1`.
- Build verification: `npm run build` succeeded.

## Section 5: Summary

### Sub-chunk pass/fail
- 3A (RLS status audit): **PASS**
- 3B (policy audit): **PASS with findings**
- 3C (RPC function security audit): **PASS with findings**
- 3D (RLS enablement): **PASS** (no changes required)

### Issues to address in Chunks 4-7
1. Replace overly permissive `USING true` policy on `parent_links` (`parent_select_parent_links`) with strict role/user-scoped access.
2. Confirm whether `stickers` should remain globally readable; if not, tighten policy and/or role scope.
3. Review `roles={public}` across all policies and migrate to `authenticated` where anonymous access is not explicitly required.
4. Review all 14 `SECURITY DEFINER` RPC functions for least privilege, explicit authorization checks, and safe execution context.
5. Validate function-level grants and whether each RPC should be callable by `anon`, `authenticated`, or service roles only.
