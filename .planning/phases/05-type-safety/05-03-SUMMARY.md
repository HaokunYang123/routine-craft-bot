---
phase: "05"
plan: "03"
subsystem: "type-safety"
tags: ["typescript", "supabase", "type-casts", "pages", "components"]
depends_on:
  requires: ["05-01"]
  provides: ["type-safe-ui-layer"]
  affects: ["05-04"]
tech-stack:
  added: []
  patterns: ["typed-supabase-queries", "browser-api-declarations"]
key-files:
  created:
    - "src/types/browser.d.ts"
  modified:
    - "src/pages/People.tsx"
    - "src/pages/GroupDetail.tsx"
    - "src/pages/RecurringSchedules.tsx"
    - "src/pages/Assistant.tsx"
    - "src/pages/Tasks.tsx"
    - "src/components/student/InstructorsList.tsx"
    - "src/components/FloatingAI.tsx"
decisions:
  - key: "browser-d-ts-global-types"
    choice: "Central browser.d.ts for non-standard browser APIs"
    reason: "Avoid duplicate global declarations across files; provides single source of truth for webkitSpeechRecognition and navigator.standalone"
  - key: "note-interface-relaxation"
    choice: "Update Note interface to match database schema"
    reason: "Database returns string|null for visibility, not strict union type"
  - key: "schedule-type-union-cast"
    choice: "Cast to union type instead of any"
    reason: "Preserves type safety while handling Select component's string return"
metrics:
  duration: "4min"
  completed: "2026-01-25"
---

# Phase 05 Plan 03: Remove Type Casts from Pages/Components Summary

Zero `as any` casts remain in targeted page and component files; UI layer now uses regenerated Supabase types directly.

## What Changed

### Task 1: People.tsx (6 casts removed)
- Removed casts from `class_sessions` queries (2)
- Removed casts from `instructor_students` query (1)
- Removed casts from RPC calls: `generate_join_code`, `delete_class_session`, `remove_student_from_class` (3)
- Replaced `insertData: any` with properly typed inline object

### Task 2: Page Components (6 casts removed)
**GroupDetail.tsx (2 casts):**
- Removed casts from `notes` table queries
- Updated Note interface to match database schema (visibility: string|null)
- Removed `: any` annotations from map callbacks

**RecurringSchedules.tsx (2 casts):**
- Removed casts from `class_sessions` and `instructor_students` queries

**Assistant.tsx (1 cast):**
- Removed cast from `class_sessions` query
- Removed duplicate global Window declaration (now in browser.d.ts)

**Tasks.tsx (1 cast):**
- Replaced `v as any` with proper union type `"once" | "daily" | "weekly" | "custom"`

### Task 3: Component Files (2 casts removed)
**InstructorsList.tsx (1 cast):**
- Removed cast from `instructor_students` query

**FloatingAI.tsx (1 cast):**
- Replaced `(window as any).webkitSpeechRecognition` with typed API detection
- Uses `window.SpeechRecognition || window.webkitSpeechRecognition` pattern

**src/types/browser.d.ts (new file):**
- Declares `Window.webkitSpeechRecognition` for Safari/older Chrome
- Declares `Window.SpeechRecognition` for standard API
- Declares `Navigator.standalone` for iOS web app detection

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed duplicate global Window declaration in Assistant.tsx**
- **Found during:** Task 3 verification
- **Issue:** Assistant.tsx had its own `declare global { interface Window { ... } }` that conflicted with browser.d.ts
- **Fix:** Removed the duplicate declaration; browser.d.ts now serves as single source of truth
- **Files modified:** src/pages/Assistant.tsx
- **Commit:** fb324f2 (amended)

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Browser API types location | Central browser.d.ts | Avoids duplicate declarations, single source of truth |
| Note interface types | Match database schema | Database returns `string \| null` for visibility, interface was too strict |
| Schedule type handling | Cast to union type | Preserves type safety while handling Select component |

## Verification Results

```
People.tsx as any: 0
GroupDetail.tsx as any: 0
RecurringSchedules.tsx as any: 0
Assistant.tsx as any: 0
Tasks.tsx as any: 0
InstructorsList.tsx as any: 0
FloatingAI.tsx as any: 0
```

All targeted files have zero `as any` casts.

## Commits

| Hash | Description |
|------|-------------|
| 15b3909 | fix(05-03): remove as any casts from People.tsx |
| 3f17aaa | fix(05-03): remove as any casts from page components |
| fb324f2 | fix(05-03): remove as any casts from component files |

## Remaining Work

Two files outside plan scope still have `as any` casts:
- `src/components/auth/MultiAuthLogin.tsx` - validate_qr_token RPC
- `src/components/student/JoinInstructor.tsx` - accept_invite RPC

Both RPCs exist in types.ts; these should be addressed in 05-04 or a follow-up plan.

## Next Phase Readiness

**Ready for 05-04:** All page and component files in scope are now type-safe. The remaining casts in hooks (05-02) and components (above) complete the full type safety sweep.
