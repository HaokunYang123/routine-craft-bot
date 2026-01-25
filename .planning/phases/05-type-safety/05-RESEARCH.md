# Phase 5: Type Safety - Research

**Researched:** 2026-01-25
**Domain:** Supabase TypeScript Types & Type-safe Database Queries
**Confidence:** HIGH

## Summary

This phase addresses a significant type safety gap in the codebase. The current Supabase types file (`src/integrations/supabase/types.ts`) only defines 8 tables, but the actual database schema includes at least 12 tables plus 7+ RPC functions. This mismatch causes 32 `as any` casts throughout the codebase, bypassing TypeScript's compile-time error detection.

The solution is straightforward: regenerate Supabase types from the live database using `npx supabase gen types typescript`, then systematically replace all `as any` casts with the proper generated types. The tsconfig.app.json currently has strict mode disabled (`"strict": false`, `"noImplicitAny": false`), which must be enabled as part of this phase.

**Primary recommendation:** Regenerate Supabase types first, then fix `as any` casts file-by-file starting with hooks, then components, while progressively tightening TypeScript strict mode.

## Current State Analysis

### Existing Supabase Types (8 tables defined)
| Table | Status |
|-------|--------|
| chat_messages | Defined |
| people | Defined |
| profiles | Defined |
| routines | Defined |
| tasks | Defined (missing `assigned_student_id` column) |
| stickers | Defined |
| user_stickers | Defined |
| student_logs | Defined |

### Missing from Types (tables used but not typed)
| Table | Used In | Migration Source |
|-------|---------|------------------|
| class_sessions | People.tsx, RecurringSchedules.tsx, Assistant.tsx | 20260113_class_sessions.sql |
| instructor_students | People.tsx, InstructorsList.tsx, RecurringSchedules.tsx | 20260113_instructor_students.sql |
| templates | useTemplates.ts, useRecurringSchedules.ts | 20260119_template_preassignment.sql |
| template_tasks | useTemplates.ts | 20260119_template_preassignment.sql |
| notes | GroupDetail.tsx | Referenced but NO migration exists |
| groups | GroupDetail.tsx | Referenced but NO migration exists |
| group_members | GroupDetail.tsx | Referenced but NO migration exists |
| task_instances | GroupDetail.tsx | Referenced but NO migration exists |
| recurring_schedules | useRecurringSchedules.ts | Referenced but NO migration exists |

### Missing RPC Functions (Functions section is empty `[_ in never]: never`)
| Function | Used In | Signature |
|----------|---------|-----------|
| validate_qr_token | MultiAuthLogin.tsx | `(token: UUID) => {session_id, session_name, coach_id}[]` |
| accept_invite | JoinInstructor.tsx | `(p_join_code: TEXT) => JSON {success, message, class_name}` |
| generate_recurring_tasks | useRecurringSchedules.ts | `(p_schedule_id, p_from_date, p_to_date) => {success, task_count, message}` |
| generate_join_code | People.tsx | `() => TEXT` |
| delete_class_session | People.tsx | `(p_session_id: UUID) => JSON {success, error?}` |
| remove_student_from_class | People.tsx | `(p_connection_id: UUID) => JSON {success, error?}` |

### TypeScript Configuration Issue
```json
// tsconfig.app.json (CURRENT - NOT STRICT)
{
  "strict": false,
  "noUnusedLocals": false,
  "noUnusedParameters": false,
  "noImplicitAny": false
}

// tsconfig.json (STRICT - but not used by Vite)
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true
}
```

The root `tsconfig.json` has strict mode enabled, but Vite uses `tsconfig.app.json` which has all strict checks disabled. This explains why `tsc --noEmit` passes (it probably uses the root config via `references`).

## Inventory of `as any` Casts

### Category 1: Missing Table Types in Hooks (15 casts)

**File: `src/hooks/useRecurringSchedules.ts`**
```typescript
// Line 53: .from("recurring_schedules" as never)  // alternative to as any
// Line 80: .from("templates" as never)
// Line 112: .from("class_sessions" as never)
// Line 152: .from("recurring_schedules" as any)
// Line 196: .from("recurring_schedules" as any)
// Line 223: .from("recurring_schedules" as any)
// Line 253: supabase.rpc("generate_recurring_tasks" as any, {...})
```
**Issue:** `recurring_schedules`, `templates`, `class_sessions` tables not in types

**File: `src/hooks/useTemplates.ts`**
```typescript
// Lines 43, 63, 99, 122, 163, 175, 193, 232: .from("templates" as any)
// Lines 63, 122, 175, 193: .from("template_tasks" as any)
```
**Issue:** `templates`, `template_tasks` tables not in types

### Category 2: Missing Table Types in Components (12 casts)

**File: `src/pages/People.tsx`**
```typescript
// Line 90: .from("class_sessions" as any)
// Line 102: .from("instructor_students" as any)
// Line 147: supabase.rpc('generate_join_code' as any)
// Line 161: supabase.from("class_sessions" as any).insert(...)
// Line 189: supabase.rpc("delete_class_session" as any, {...})
// Line 214: supabase.rpc("remove_student_from_class" as any, {...})
```

**File: `src/pages/GroupDetail.tsx`**
```typescript
// Line 209: .from("notes" as any)
// Line 255: supabase.from("notes" as any).insert({...})
```
**Issue:** `notes` table used but doesn't exist in migrations

**File: `src/pages/RecurringSchedules.tsx`**
```typescript
// Line 109: .from("class_sessions" as any)
// Line 117: .from("instructor_students" as any)
```

**File: `src/pages/Assistant.tsx`**
```typescript
// Line 158: .from("class_sessions" as any)
```

**File: `src/components/student/InstructorsList.tsx`**
```typescript
// Line 35: .from("instructor_students" as any)
```

### Category 3: Missing RPC Function Types (6 casts)

**File: `src/components/auth/MultiAuthLogin.tsx`**
```typescript
// Line 88: supabase.rpc("validate_qr_token" as any, {token})
```

**File: `src/components/student/JoinInstructor.tsx`**
```typescript
// Line 30: supabase.rpc("accept_invite" as any, {p_join_code})
```

### Category 4: Browser API Types (3 casts)

**File: `src/components/FloatingAI.tsx`**
```typescript
// Line 59: (window as any).webkitSpeechRecognition
```
**Fix:** Use proper WebkitSpeechRecognition type declaration

**File: `src/hooks/useDeviceType.tsx`**
```typescript
// Lines 15, 40: (window.navigator as any).standalone
```
**Fix:** Extend Navigator interface with `standalone?: boolean`

### Category 5: Union Type Coercion (1 cast)

**File: `src/pages/Tasks.tsx`**
```typescript
// Line 914: setScheduleType(v as any)
```
**Fix:** Type the state setter properly with the union type

### Category 6: Script File (1 cast - out of scope)

**File: `scripts/seed_data.ts`**
```typescript
// Line 97: (coachAuth as any) = { user: existingCoach }
```
**Note:** Seed script, not production code - may be acceptable or fixable separately

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | 2.90.1 | Database client with TypeScript generics | Already installed, provides type-safe queries when types are generated |
| supabase CLI (npx) | 2.72.8 | Type generation from database schema | `npx supabase gen types typescript` generates accurate types |
| TypeScript | 5.8.3 | Static type checking | Already installed |

### Type Generation Command
```bash
# Generate types from remote Supabase project
npx supabase gen types typescript --project-id yklffwiyrfwcqkcnvetu > src/integrations/supabase/types.ts

# Or with linked project
npx supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

## Architecture Patterns

### Pattern 1: Typed Supabase Client
**What:** The client is already typed with `createClient<Database>()`. Once types are regenerated, all queries become type-checked.

**Current (types.ts):**
```typescript
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY);
```

**After regeneration:**
```typescript
// All table queries become type-safe automatically
const { data, error } = await supabase
  .from("class_sessions")  // No cast needed
  .select("*")
  .eq("coach_id", user.id);

// data is now typed as Database["public"]["Tables"]["class_sessions"]["Row"][]
```

### Pattern 2: Type Helper Usage
**What:** Use the generated helper types for insert/update operations

```typescript
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

// Row type (for reading)
type ClassSession = Tables<"class_sessions">;

// Insert type (for creating)
type NewClassSession = TablesInsert<"class_sessions">;

// Update type (for patching)
type ClassSessionUpdate = TablesUpdate<"class_sessions">;
```

### Pattern 3: RPC Function Typing
**What:** RPC functions need explicit typing in the generated schema

**After regeneration, types.ts will include:**
```typescript
Functions: {
  accept_invite: {
    Args: { p_join_code: string }
    Returns: Json
  }
  validate_qr_token: {
    Args: { token: string }
    Returns: { session_id: string; session_name: string; coach_id: string }[]
  }
  // etc.
}
```

**Usage becomes type-safe:**
```typescript
const { data, error } = await supabase.rpc("accept_invite", {
  p_join_code: code  // TypeScript validates parameter name and type
});
```

### Pattern 4: Browser API Extensions
**What:** Extend global types for non-standard APIs

```typescript
// src/types/browser.d.ts
interface Navigator {
  standalone?: boolean;  // iOS Safari-specific
}

interface Window {
  webkitSpeechRecognition?: typeof SpeechRecognition;
}
```

### Anti-Patterns to Avoid
- **Casting to `any` then back:** `(data as any) as MyType` - fix the source type instead
- **Ignoring null returns:** Supabase always returns `data | null`, handle both
- **Using `as never`:** Same problem as `as any`, just hides the type error

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Supabase type definitions | Manual TypeScript interfaces | `npx supabase gen types typescript` | Types drift from schema, RPC types impossible to maintain manually |
| Response type guards | Custom type checking functions | Generated types + TypeScript narrowing | Type generation is authoritative |
| Error type handling | Custom error interfaces | Supabase's `PostgrestError` type | Already typed correctly |

**Key insight:** The Supabase types file is meant to be auto-generated, not hand-written. The current types.ts appears to be a mix of generated and manual additions, which is why it's incomplete.

## Common Pitfalls

### Pitfall 1: Schema Drift
**What goes wrong:** Types generated at one point, database changed later, types not regenerated
**Why it happens:** No CI/CD step to validate types match schema
**How to avoid:** Add `npx supabase gen types typescript --local` to pre-commit or CI
**Warning signs:** New `as any` casts appearing, runtime errors on database calls

### Pitfall 2: Missing Tables in Types
**What goes wrong:** Code references tables that exist in database but not in types file
**Why it happens:** Types were generated before migrations were applied, or migrations applied directly without regenerating types
**How to avoid:** Regenerate types after every schema change
**Detection:** Current issue - 4+ tables missing

### Pitfall 3: RPC Functions Not Typed
**What goes wrong:** RPC calls require `as any` cast on function name
**Why it happens:** Functions section empty in types, functions defined in database but not picked up
**How to avoid:** Ensure `supabase gen types` runs against database with all functions deployed
**Detection:** `supabase.rpc("name" as any)` pattern

### Pitfall 4: Strict Mode Conflicts
**What goes wrong:** Enabling strict mode breaks compilation with hundreds of errors
**Why it happens:** Enabling all strict checks at once on a codebase with existing issues
**How to avoid:** Progressive tightening:
1. First regenerate types and fix `as any`
2. Then enable `noImplicitAny`
3. Then enable `strictNullChecks`
4. Finally enable full `strict: true`
**Warning signs:** Trying to enable strict mode before fixing underlying type issues

### Pitfall 5: Tables That Don't Exist
**What goes wrong:** Code uses tables that aren't in any migration
**Why it happens:** Incomplete feature development, or tables created manually in dashboard
**Detection:** GroupDetail.tsx references `notes`, `groups`, `group_members`, `task_instances` - NONE exist in migrations
**How to avoid:** Either create migrations for these tables, or remove the code referencing them

## Code Examples

### Regenerating Types
```bash
# From project root with Supabase CLI
npx supabase gen types typescript --project-id yklffwiyrfwcqkcnvetu > src/integrations/supabase/types.ts

# Verify the output
head -100 src/integrations/supabase/types.ts
```

### Replacing Table Casts
**Before:**
```typescript
const { data } = await supabase
  .from("class_sessions" as any)
  .select("*")
  .eq("coach_id", user.id);
```

**After:**
```typescript
const { data } = await supabase
  .from("class_sessions")
  .select("*")
  .eq("coach_id", user.id);
// data is typed as Tables<"class_sessions">[] | null
```

### Replacing RPC Casts
**Before:**
```typescript
const { data, error } = await supabase.rpc("accept_invite" as any, {
  p_join_code: code.toUpperCase().trim(),
});
const result = data as JoinResult;
```

**After:**
```typescript
const { data, error } = await supabase.rpc("accept_invite", {
  p_join_code: code.toUpperCase().trim(),
});
// data is typed per the generated Function type
// May need interface for complex return types
```

### Browser API Type Extensions
```typescript
// src/types/browser.d.ts
declare global {
  interface Navigator {
    standalone?: boolean;
  }

  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

export {};
```

**Usage in component:**
```typescript
// Before
const recognition = new (window as any).webkitSpeechRecognition();

// After
if (window.webkitSpeechRecognition) {
  const recognition = new window.webkitSpeechRecognition();
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual type definitions | `supabase gen types typescript` | Supabase JS v2 (2022) | Automatic, accurate types |
| Separate type file per table | Single generated types.ts with helpers | Supabase JS v2 | Single source of truth |
| Cast to any for RPC | Full RPC function typing in generated schema | Supabase CLI 1.50+ | Type-safe RPC calls |

**Deprecated/outdated:**
- Manually writing Supabase types: Use CLI generation instead
- Using `as never` instead of `as any`: Both are type safety escape hatches, neither is acceptable

## Critical Finding: Missing Database Tables

The following tables are referenced in code but have **NO migration files**:
1. `notes` - used in GroupDetail.tsx
2. `groups` - used in GroupDetail.tsx
3. `group_members` - used in GroupDetail.tsx
4. `task_instances` - used in GroupDetail.tsx
5. `recurring_schedules` - used in useRecurringSchedules.ts

**Options:**
1. Create migrations for these tables (if they exist in production database but not in migration files)
2. Remove code referencing these tables (if features are incomplete/unused)
3. Run `supabase db pull` to extract existing schema from remote database

This is a **blocking issue** - types cannot be generated for tables that don't exist.

## Open Questions

1. **Do the missing tables exist in production?**
   - What we know: Tables referenced in code, no migration files
   - What's unclear: Whether tables were created directly in Supabase dashboard
   - Recommendation: Run `npx supabase db pull --schema public` to check actual schema

2. **Which tsconfig controls Vite builds?**
   - What we know: tsconfig.app.json has strict=false, root has strict=true
   - What's unclear: Why root has strict but app doesn't
   - Recommendation: Progressively enable strict checks in tsconfig.app.json

3. **Is GroupDetail.tsx a dead feature?**
   - What we know: Uses 4 tables that don't exist in migrations
   - What's unclear: Whether this is WIP or abandoned code
   - Recommendation: Check if tables exist in prod; if not, consider removing feature

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis: `src/integrations/supabase/types.ts` (8 tables defined)
- Direct codebase analysis: `supabase/migrations/*.sql` (schema definition)
- Direct codebase analysis: `grep -r "as any"` (32 casts found)
- Direct codebase analysis: `tsconfig.json` and `tsconfig.app.json`

### Secondary (MEDIUM confidence)
- Supabase documentation on type generation
- Supabase JS v2 TypeScript support

## Metadata

**Confidence breakdown:**
- Type inventory: HIGH - direct grep and file analysis
- Missing tables: HIGH - compared migrations to code usage
- Fix approach: HIGH - standard Supabase type generation
- Missing table existence: MEDIUM - need to verify against live database

**Research date:** 2026-01-25
**Valid until:** 30 days (types.ts regeneration pattern is stable)

## Summary of Work Required

### TYPE-01: Regenerate Supabase Types
- Investigate missing tables (notes, groups, etc.) - may need migrations or code removal
- Run `npx supabase gen types typescript`
- Verify all 12+ tables and 7+ RPC functions are included

### TYPE-02: Fix Hook File Casts (15 casts)
- `useRecurringSchedules.ts`: 7 casts
- `useTemplates.ts`: 8 casts

### TYPE-03: Fix Component File Casts (14 casts)
- `People.tsx`: 6 casts
- `GroupDetail.tsx`: 2 casts (may need table creation first)
- `RecurringSchedules.tsx`: 2 casts
- `Assistant.tsx`: 1 cast
- `InstructorsList.tsx`: 1 cast
- `MultiAuthLogin.tsx`: 1 cast
- `JoinInstructor.tsx`: 1 cast

### TYPE-04: Fix Remaining Casts (3 casts)
- `FloatingAI.tsx`: Browser API type extension
- `useDeviceType.tsx`: Navigator.standalone type extension
- `Tasks.tsx`: Union type coercion fix

### Enable Strict Mode
- Update tsconfig.app.json to enable strict mode progressively
- Verify `tsc --noEmit` passes with no errors
