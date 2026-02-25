# AI Features: Current State Assessment

## 1. Current AI Implementation Summary

### AI features that exist today
- **AI Plan Builder** (`src/components/ai/AIPlanBuilder.tsx`): coach enters a free-text request, AI returns a structured template draft, coach edits, then saves to `templates` + `template_tasks`.
- **Personalize a Plan** (`src/components/ai/PersonalizeDialog.tsx`): coach opens an existing template, enters one modifier sentence, AI returns a modified full template + optional `ai_note`, coach edits and saves as a new template.
- **Weekly Summary** (`src/components/ai/WeeklySummary.tsx`): coach selects a group, app aggregates last 7 days of `task_instances`, AI generates summary/highlights/concerns/stats, with raw-stats fallback.
- **Task Writing Helper (Polish)** (`src/components/ui/PolishButton.tsx`): rewrites rough task descriptions. Used in manual builder, AI builder preview, personalize preview, assign modal, and coach calendar edit flows.
- **Student Week Recap** (`src/components/dashboard/StudentDetailSheet.tsx`): AI recap for one student’s past-week completion/missed stats.
- **Legacy AI chat surfaces**:
  - `/dashboard/assistant` page (`src/pages/Assistant.tsx`)
  - `FloatingAI` component (`src/components/FloatingAI.tsx`, currently not mounted anywhere)

### AI call chain (frontend -> edge function -> Gemini)
- **Primary path (newer structured AI flows)**
  1. Frontend builds strict JSON prompt (`templatePrompt`, `personalizePrompt`, `summaryPrompt`, `polishPrompt`).
  2. Frontend calls `callGemini()` (`src/lib/gemini.ts`).
  3. `callGemini()` posts to Supabase Edge Function `ai-chat` (`/functions/v1/ai-chat`) with JWT.
  4. `ai-chat` verifies user via `supabase.auth.getUser()`, calls Gemini model `gemini-2.5-flash-preview-05-20`.
  5. Frontend parses JSON; if parse fails, retries once with a JSON-only suffix.

- **Secondary path (legacy action-based assistant)**
  1. Frontend hook `useAIAssistant` calls Edge Function `ai-assistant` with `action` + `payload`.
  2. `ai-assistant` switches prompt by action (`generate_plan`, `refine_task`, `weekly_summary`, `student_recap`, etc.), then calls Gemini directly.

### Current coach UX
- **Primary coach UX is template-centric, not chat-centric**:
  - AI Builder and Personalize are in **Templates** page.
  - Weekly Summary is toggled from **Coach Dashboard**.
  - Polish buttons are embedded in task/plan forms.
- **Coach sidebar has no Assistant nav item** (`CoachSidebar`), so chat is effectively not part of normal coach flow.
- **Two AI backend patterns coexist** (`ai-chat` + `ai-assistant`), which increases maintenance drift risk.

---

## 2. Rate Limiting Status

### Is there rate limiting today?
- **No true rate limiting.**
- What exists today:
  - Retry/backoff logic in frontend hooks/components (`useAIAssistant`, `FloatingAI`, `callGemini`).
  - Timeout handling and error messaging.
  - Handling for 429-style messages in UI.
- What does **not** exist:
  - No per-user/per-action request cap in `ai-chat` or `ai-assistant`.
  - No quota table.
  - No token/usage tracking table.

### Risk if left unaddressed
- **Risk level: High**
- Primary risks:
  - Unbounded cost exposure from repeated AI calls.
  - Abuse/spam from authenticated users.
  - Shared service degradation (slow/failing AI UX for normal users).
  - No observability for who/what is driving spend.

### Simplest recommended rate limiting approach
- Add a **server-side limiter at edge-function entry** for both `ai-chat` and `ai-assistant`.
- Use a small Postgres-backed RPC + table, e.g. `ai_rate_limits`:
  - key: `user_id`, `action`, `window_start`
  - counter increment atomically
  - return `allowed`, `remaining`, `retry_after_seconds`
- If over limit: return HTTP **429** with structured JSON.
- Keep frontend behavior simple: show retry-after message and disable submit briefly.

---

## 3. Current State per Feature

### A. Plan/Template Builder (multi-week structured template)
- **Exists**:
  - AI returns template JSON with `name`, `description`, `duration_weeks`, `frequency_per_week`, and task array.
  - Save path writes to `templates` and `template_tasks`, marks `is_ai_generated=true`.
  - Coach can edit generated output before saving.
- **Missing**:
  - Input is still a single free-text request (not structured form fields).
  - No explicit per-field constraints at input time (goal, level, constraints, days, session length).
  - No usage/rate guardrails.

### B. Personalize a Plan (modify template for a specific student)
- **Exists**:
  - Can personalize a saved template via one modifier input.
  - AI returns full revised template + optional `ai_note`.
  - Coach can edit and save as a new template.
- **Missing**:
  - Not truly student-specific in data model (no required student context in form or DB linkage).
  - No lineage metadata (source template id, personalized-for student id).
  - No diff/change summary UI.

### C. Weekly Summaries (auto-generated stats + highlights)
- **Exists**:
  - On-demand generation from group selector and 7-day aggregate stats.
  - AI summary/highlights/concerns + stat cards.
  - Graceful fallback to raw stats if AI fails.
- **Missing**:
  - Not automatic/scheduled; user must click generate.
  - No persisted summary history table.
  - No delivery channel (in-app feed/email) for recurring summaries.

### D. Task Writing Helper (polish rough notes)
- **Exists**:
  - Works today through `PolishButton`; rewrites to clearer actionable description.
  - Reused across multiple coach authoring surfaces.
  - Undo support (short window).
- **Missing**:
  - No structured helper inputs (audience, tone, length, constraints).
  - No batch mode.
  - No usage governance or telemetry.

---

## 4. Data Model Readiness

### Do `templates` and `template_tasks` support what we need?
- **Yes for MVP of Plan Builder + Personalize**.
- Current schema already supports:
  - Template-level metadata (`name`, `description`, `duration_weeks`, `frequency_per_week`, `tags`, `weeks`, `is_ai_generated`).
  - Task-level sequencing and scheduling (`day_offset`, `duration_minutes`, `sort_order`, `start_time`, `end_time`, `due_time_offset_minutes`).

### Required schema changes?
- **For MVP (structured forms + current AI features): none required.**
- **Recommended additions** (quality/traceability):
  - `templates.source_template_id uuid null` (personalization lineage).
  - `templates.personalized_for_student_id uuid null` (if student-specific personalization is a product requirement).
  - `ai_usage_events` (request metadata for monitoring/quotas).
  - Optional `weekly_group_summaries` if summaries need persistence/history.

### AI output -> existing DB mapping
- Plan/Personalize AI output already maps cleanly:
  - `templates` row: name/description/duration/frequency/is_ai_generated/weeks.
  - `template_tasks` rows: title/description/day_offset/duration/start_time/end_time/sort_order.
- Assignment path uses template task structure (`day_offset`) in `useAssignments.createAssignment`; however, current GroupDetail assign-modal flow is mostly one-task scheduling with template prefill behavior, not full multi-task template expansion.

---

## 5. Recommended Implementation Strategy

### A. Plan/Template Builder
- **Form fields (structured, no chatbot)**:
  - `goal` (textarea, required, 20-500 chars)
  - `duration_weeks` (number, required, 1-12, default 4)
  - `sessions_per_week` (number, required, 1-7, default 3)
  - `session_minutes` (number, required, 10-180, default 30)
  - `skill_level` (select: beginner/intermediate/advanced, default beginner)
  - `focus_areas` (multi-select, required >=1)
  - `constraints` (textarea, optional)
  - `preferred_days` (multi-select weekdays, optional)
- **Where AI call happens**:
  - Client component in Templates page via `callGemini()` -> `ai-chat`.
- **AI return + mapping**:
  - Return strict template JSON (template metadata + ordered tasks).
  - Normalize and write to `templates` + `template_tasks`.
- **Failure handling**:
  - Zod/shape validation before preview.
  - On parse/model failure: keep form values, show actionable error, allow retry.
  - On DB partial failure: rollback template row (already done).
- **Complexity**: **Medium**.

### B. Personalize a Plan
- **Form fields (structured)**:
  - `base_template_id` (required)
  - `student_id` (optional for MVP, required if true per-student feature)
  - `change_type` (select: easier/harder/shorter/longer/frequency)
  - `target_sessions_per_week` (optional number)
  - `injury_or_constraints` (optional textarea)
  - `special_focus` (optional multi-select)
- **Where AI call happens**:
  - Personalize dialog submit -> `callGemini()` -> `ai-chat`.
- **AI return + mapping**:
  - Return full revised template JSON + optional `ai_note` + optional `change_summary`.
  - Save as new template; add lineage metadata if schema is extended.
- **Failure handling**:
  - If AI fails, keep original template loaded and form state intact.
  - Offer manual edit fallback in same dialog.
- **Complexity**: **Medium**.

### C. Weekly Summaries
- **Form fields (structured)**:
  - `group_id` (required)
  - `date_range` (required, default last 7 days)
  - `tone` (select: concise/coaching-detailed)
  - `include_pending` (bool, default true)
- **Where AI call happens**:
  - Dashboard summary panel after local aggregation -> `callGemini()` -> `ai-chat`.
- **AI return + mapping**:
  - Return `{summary, highlights[], concerns[], stats}`.
  - MVP: render directly (no DB write).
  - Optional v2: persist in `weekly_group_summaries`.
- **Failure handling**:
  - Keep existing fallback-to-raw-stats behavior.
  - Cache last successful summary per group/date range client-side.
- **Complexity**:
  - **Small** for improved on-demand flow.
  - **Medium** if adding scheduled auto-generation + persistence.

### D. Task Writing Helper
- **Form fields (structured)**:
  - `rough_text` (required)
  - `audience_level` (optional select)
  - `tone` (optional select: encouraging/direct)
  - `max_sentences` (optional number, default 3)
- **Where AI call happens**:
  - Inline button near description fields -> `callGemini()` -> `ai-chat`.
- **AI return + mapping**:
  - Return `{polished: string}` and write to current form state only.
- **Failure handling**:
  - Keep original text untouched.
  - Show inline error + preserve undo path.
- **Complexity**: **Small**.

---

## 6. Recommended Build Order

1. **Rate limiting + usage telemetry foundation**
   - Highest risk reduction (cost/abuse) and supports every AI feature.
2. **Plan Builder structured form (replace free-text prompting at input layer)**
   - Highest product value and provides canonical AI output contract.
3. **Personalize Plan structured v2 (student-aware + lineage-ready)**
   - Reuses Plan Builder output contract and improves real coaching relevance.
4. **Task Writing Helper structured options**
   - Quick UX win with low complexity; reuses same AI transport and guardrails.
5. **Weekly Summaries automation/persistence**
   - Current on-demand feature already works; schedule/history can follow after core generation surfaces are hardened.

---

## 7. Plan Builder Form Spec

### Field spec

| Field | Type | Validation | Default |
|---|---|---|---|
| `goal` | textarea | required, 20-500 chars | `""` |
| `duration_weeks` | number | required, integer 1-12 | `4` |
| `sessions_per_week` | number | required, integer 1-7 | `3` |
| `session_minutes` | number | required, integer 10-180 | `30` |
| `skill_level` | select | required: `beginner/intermediate/advanced` | `beginner` |
| `focus_areas` | multiselect | required, >=1 value | `[]` |
| `constraints` | textarea | optional, <=500 chars | `""` |
| `preferred_days` | multiselect | optional, values 0-6 | `[]` |
| `plan_name_override` | text | optional, <=80 chars | `""` |

### AI output contract
- Return JSON only:
  - `name: string`
  - `description: string`
  - `duration_weeks: number`
  - `frequency_per_week: number`
  - `tasks: [{ title, description, day_offset, duration_minutes, start_time, end_time }]`

### Mapping to `templates` + `template_tasks`
- `templates` insert:
  - `coach_id = auth user`
  - `name = plan_name_override || ai.name`
  - `description = ai.description`
  - `duration_weeks = ai.duration_weeks` (clamped 1-12)
  - `frequency_per_week = ai.frequency_per_week` (clamped 1-7)
  - `is_ai_generated = true`
  - `tags = focus_areas` (optional)
  - `weeks = derived from task list grouped by week/day`
- `template_tasks` bulk insert for each task:
  - `template_id`, `title`, `description`, `day_offset`, `duration_minutes`, `start_time`, `end_time`, `sort_order`

### Example flow
- Coach submits:
  - goal = "Improve beginner basketball footwork"
  - duration_weeks = 4
  - sessions_per_week = 3
  - session_minutes = 35
  - skill_level = beginner
  - focus_areas = ["footwork", "conditioning"]
- AI returns structured template JSON with 12 tasks spread across day offsets.
- App normalizes and saves:
  - 1 row in `templates`
  - 12 rows in `template_tasks`
- Result: template is immediately assignable through existing template-based assignment paths.
