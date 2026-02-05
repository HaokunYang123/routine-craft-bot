# Excuse + Template Dialog Style Audit (Read-Only)

Date: 2026-02-05  
Scope: excuse action PATCH failure investigation and Template Library edit/preview dialog background styling.

## 1) Excuse function: why PATCH returns 400

### A) Click path traced from UI to Supabase update

1. `src/components/dashboard/StudentDetailSheet.tsx:394`
   - The `Excuse` button click handler runs:
   - `onClick={(e) => { e.stopPropagation(); onExcuse(); }}`

2. `src/components/dashboard/StudentDetailSheet.tsx:271`
   - `TaskCard` receives:
   - `onExcuse={() => handleExcuseTask(task.id)}`

3. `src/components/dashboard/StudentDetailSheet.tsx:146`
   - `handleExcuseTask(taskId)` calls:
   - `excuseTask({ taskId, studentId })`

4. `src/hooks/useAssignments.ts:708`
   - `excuseTaskMutation.mutationFn` sends the Supabase update to `task_instances`.

5. `src/hooks/useAssignments.ts:736`
   - `excuseTask(...)` wrapper checks for authenticated user and runs the mutation.

Note: this flow is wired from `CoachDashboard` via `StudentDetailSheet` (`src/pages/CoachDashboard.tsx:461`). I found no `onExcuse` handler inside `src/pages/GroupDetail.tsx`.

### B) Exact PATCH payload being sent

From `src/hooks/useAssignments.ts:709-716`, the update call is:

- Table: `task_instances`
- Filter: `.eq("id", taskId)`
- Updated columns/values:
  - `status: "excused"`
  - `updated_at: new Date().toISOString()`
  - `updated_by: user?.id`

Effective request shape sent to PostgREST is equivalent to:

- `PATCH /rest/v1/task_instances?id=eq.<taskId>`
- Body:
  - `{ "status": "excused", "updated_at": "<ISO timestamp>", "updated_by": "<coach uuid>" }`

### C) CHECK constraint search for `task_instances.status`

I searched all checked-in SQL migrations and Supabase SQL files for:
- `CREATE TABLE ... task_instances`
- `CHECK (...)` on `task_instances.status`
- `ALTER TABLE task_instances ... CHECK`

Findings:
- No migration in `supabase/migrations` defines the `task_instances` table creation.
- No checked-in migration defines a `CHECK` constraint for `task_instances.status`.
- Therefore, the allowed status set is not explicitly recoverable from this repo’s migration history alone.

### D) Does `"excused"` exist as an allowed status?

From checked-in SQL migrations: **not provable** (no visible `task_instances.status` constraint definition).

From app code signals:
- Existing status union in core update path is only:
  - `"pending" | "completed" | "missed"` (`src/hooks/useAssignments.ts:66`)
- Excuse path writes `"excused"` (`src/hooks/useAssignments.ts:712`)
- Student notification path queries `.eq("status", "excused")` (`src/hooks/useExcusedNotification.ts:47`)

Most likely explanation for a 400 here:
- Production DB likely has a status `CHECK` constraint (or equivalent) that was not updated to include `"excused"`.
- This would produce a PostgREST 400 on PATCH when setting `status = 'excused'`.

### E) If no CHECK: ENUM or RLS possibilities

ENUM:
- Generated types show no public enums (`src/integrations/supabase/types.ts:952-954`).
- `task_instances.status` is typed as plain `string` (`src/integrations/supabase/types.ts:576`).
- So there is no enum evidence in the checked-in type snapshot.

RLS:
- Existing migration policy (`supabase/migrations/20260128224200_add_coach_id_to_task_instances.sql:55-58`):
  - `USING (coach_id = auth.uid())`
  - `WITH CHECK (coach_id = auth.uid())`
- This can block updates when row `coach_id` is null/mismatched, but that usually manifests as an authorization/RLS failure rather than a value-validation 400.

---

## 2) Template Library edit/preview dialog styling audit

### A) Components rendering edit + preview dialogs

Both are inline `Dialog` blocks in:
- `src/pages/Templates.tsx`

Specific blocks:
- Preview dialog: `src/pages/Templates.tsx:387-439`
- Edit dialog: `src/pages/Templates.tsx:441-560`

### B) Classes/styles controlling dialog background

Base background comes from shared dialog component:
- `src/components/ui/dialog.tsx:39`
- `DialogContent` includes class `bg-background` (plus `border`, `shadow-lg`, etc.)

In `Templates.tsx`, both preview/edit dialogs use `DialogContent` with only size/scroll overrides:
- Preview: `className="max-w-2xl max-h-[80vh] overflow-y-auto"` (`src/pages/Templates.tsx:389`)
- Edit: `className="max-w-2xl max-h-[85vh] overflow-y-auto"` (`src/pages/Templates.tsx:443`)

No inline styles are applied for background color on either dialog container.

### C) Background classes used on dialog content containers

Dialog containers:
- Inherited from shared `DialogContent`: `bg-background` (`src/components/ui/dialog.tsx:39`)

Inner preview content backgrounds:
- Task row blocks: `bg-secondary/30` (`src/pages/Templates.tsx:400`)
- Time badges: `bg-blue-100 dark:bg-blue-900/40` (`src/pages/Templates.tsx:413`)
- Time badges: `bg-purple-100 dark:bg-purple-900/40` (`src/pages/Templates.tsx:419`)
- Meta chips: `bg-secondary` (`src/pages/Templates.tsx:427`, `src/pages/Templates.tsx:430`)

Inner edit content backgrounds:
- Task editor rows: `p-3 border rounded-lg` with no explicit `bg-*` (`src/pages/Templates.tsx:481`)
- So rows sit on the dialog container’s `bg-background`.

### D) Why dialog can appear mostly white against dark coach UI

Theme classes (`coach-theme`, `student-theme`) are applied on route wrappers, not on `body`:
- `src/pages/DashboardLayout.tsx:14`

Radix `DialogPortal` mounts dialog content outside that wrapper (portal to document root/body):
- `src/components/ui/dialog.tsx:34`

Because `DialogContent` uses `bg-background`, and the portal is outside `.coach-theme`, the dialog can resolve to root theme tokens (light/cream) instead of coach-theme dark tokens. This matches the “mostly white dialog on dark app” symptom.
