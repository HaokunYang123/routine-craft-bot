# TCC AI Features: Progress Log

## Chunk 1: Rate Limiting + Role Gating ✅
Atomic rate limiter shipped via Postgres upsert with coach-only enforcement in database functions. Edge returns `429` with retry metadata and the frontend cooldown flow is active across all five AI features. Baseline after rollout: 79 policies and 31/31 RLS tests passing.

## Chunk 2: Structured Schemas + Allowlists ✅
`ai-chat` now enforces Gemini `responseMimeType` and per-action `responseSchema` for all actions. Payload allowlists with nested sanitization are applied before model prompt construction. Server-side prompt builders are the source of truth; frontend response parsing remains as defense-in-depth.

## Chunk 3: Plan Builder Structured Form ✅
`AIPlanBuilder` moved from free text to a structured form with subject, age group, skill level, focus-area chips, and duration. Subject is required; other fields have sensible defaults so generation works with minimal input. Backend `generate_plan` allowlist/prompt now uses the structured fields directly.

## Chunk 4: Personalize Structured Form ✅
`PersonalizeDialog` now uses structured controls for difficulty, pacing, learning-style chips, accommodations, and additional notes instead of a single modifier input. Generation works with zero optional changes selected by relying on defaults (`Keep Same`, `Standard`) and optional empty fields. `ai-chat` personalize allowlist/sanitizer/prompt were updated to consume these structured fields and build a stronger server-side personalization prompt.

### Verification
| Check | Expected | Actual | Pass? |
|-------|----------|--------|-------|
| Structured personalize fields in UI | `difficulty`, `pacing`, `learningStyle`, `accommodations` present | States, controls, and payload mapping present in `PersonalizeDialog.tsx` | yes |
| Backend allowlist still enforced | `ALLOWED_FIELDS` referenced in `ai-chat` | `ALLOWED_FIELDS` declaration and use confirmed by grep | yes |
| Build | succeeds | `npm run build` completed; `dist/sw.js` + `dist/workbox-1d305bb8.js` generated | yes |
| Diff scope | only chunk-4 related changes | 2 files changed (`PersonalizeDialog.tsx`, `ai-chat/index.ts`) | yes |

### Concerns
- `personalize` allowlist keeps a `modifier` fallback for backward compatibility with any older clients that still send it.

## Analytics Prompt 2: RPC Aggregation + Platform Health Tab

**Date:** 2026-03-09
**Status:** Complete

### What was built
- 5 SECURITY DEFINER RPC functions for platform health metrics
- `useAdminAnalytics.ts` hook for data fetching
- Platform Health tab with live Recharts visualizations (stat cards, line chart, pie chart, stacked bar chart, churn table)

### Verification
| Check | Result |
|-------|--------|
| RPCs return data for admin | ✅ Verified via Supabase MCP for signup curve, active users, role distribution, and churn candidates; AI usage trend function verified and returned empty in current dataset |
| RPCs return empty for non-admin | ✅ Verified via Supabase MCP with authenticated non-admin JWT claims (`admin_active_users()` returned 0 rows) |
| No PUBLIC/anon grants | ✅ Verified via `information_schema.role_routine_grants` and direct `SET ROLE anon` permission check |
| lint passes | ✅ `npm run lint` passed with existing repo warnings only; no new errors |
| build passes | ✅ `npm run build` succeeded |
| Charts render | Skipped per instruction: no browser-based UI verification |
| Mobile responsive | Skipped per instruction: no browser-based UI verification |

### Concerns
- Browser-based rendering and mobile layout verification were intentionally skipped per instruction, so chart rendering was validated through build success and code inspection rather than a live UI session.

## Chunk 5: Weekly Summary Enhancements + Polish/Recap Verification

**Summary:** Added a weekly summary date range picker using native HTML date inputs (default today minus 7 days through today), with validation for required dates, start/end ordering, and a 90-day max window. Added a tone toggle (Encouraging/Direct/Detailed) and wired `start_date`, `end_date`, and `tone` through the frontend payload and `ai-chat` weekly_summary allowlist/sanitization/prompt builder. Verified Polish and Student Recap call chains remain intact after the chunked AI pipeline restructuring.

**Verification:**

| Check | Status |
|-------|--------|
| Date range picker renders with defaults | ✅ (default state seeded from `getSevenDayRange()`) |
| Tone toggle renders with Encouraging selected | ✅ |
| Generate disabled without valid inputs | ✅ (group required + dateRangeError gate) |
| Edge function accepts new weekly_summary fields | ✅ (`ALLOWED_FIELDS` + sanitizer updated) |
| Tone instruction injected into prompt | ✅ (tone-specific system instruction branches) |
| Raw stats fallback intact | ✅ (existing fallback path preserved) |
| Polish call chain verified | ✅ (action/allowlist/schema/prompt builder all present) |
| Recap call chain verified | ✅ (action/allowlist/schema/prompt builder all present) |
| npm run lint | ⚠️ existing unrelated lint error in `src/pages/ParentDashboard.tsx:437` (`no-explicit-any`); no new Chunk 5 lint errors detected |
| npm run build | ✅ |

**Concerns:** Existing pre-existing lint error in `src/pages/ParentDashboard.tsx` causes `npm run lint` to exit non-zero.

### Mobile Fix Batch 1: Critical Fixes + Pull-to-Refresh

**Summary:** Removed viewport zoom restrictions (maximum-scale, user-scalable=no) from index.html for WCAG compliance. Added max-h-[85vh] overflow-y-auto to DialogContent base class so long dialogs scroll on small screens. Fixed Parent Dashboard PTR to call imperative data loaders (loadChildren, loadSelectedChildContent) instead of only invalidating query keys. Fixed Coach Dashboard PTR to ensure group card data refreshes reliably on pull gesture.

**Verification:**

| Check | Status |
|-------|--------|
| Viewport zoom restriction removed | |
| Dialogs scroll on small screens | |
| Short dialogs unaffected | |
| Parent Dashboard PTR refreshes data | |
| Coach Dashboard PTR refreshes data | |
| PTR error handling (no stuck spinner) | |
| npm run lint | |
| npm run build | |

**Concerns:** None

### Mobile Fix Batch 2: Scroll Containers + Layout Overflow

**Summary:** Collapsed Group Detail notes pane and Student Calendar task list from fixed-height internal scroll to natural page flow on mobile (responsive breakpoints, desktop unchanged). Fixed Templates tab strip overflow with horizontal scroll or responsive labels. Fixed Templates card action row overflow with flex-wrap. Reduced Coach Settings emoji grid from 8 to 6 columns on mobile.

**Verification:**

| Check | Status |
|-------|--------|
| Group Detail notes: no nested scroll on mobile | ✅ |
| Student Calendar: no nested scroll on mobile | ✅ |
| Templates tab strip fits 375px | ✅ |
| Templates card actions wrap at 375px | ✅ |
| Emoji grid fits 375px | ✅ |
| Desktop layouts unchanged | ✅ |
| npm run lint | ✅ (0 errors, existing warnings only) |
| npm run build | ✅ |

**Concerns:** None

### Analytics Prompt 1: Schema + Access Control + Admin Route

**Summary:** Added `is_admin` boolean flag to profiles table with protection against client-side modification. Created `activity_events` append-only table for coach action telemetry with admin-only SELECT, authenticated INSERT via SECURITY DEFINER RPC, and no UPDATE/DELETE. Added `/admin/analytics` route with admin auth guard, role-based redirect for non-admins, placeholder tab layout, and admin-only sidebar navigation link.

**Verification:**

| Check | Status |
|-------|--------|
| is_admin column exists and protected | ✅ |
| activity_events table, indexes, RLS | ✅ |
| log_activity_event RPC works | ✅ |
| activity_events SELECT admin-only | ✅ |
| /admin/analytics renders for admin | ✅ (implemented and built; requires manual `is_admin` SQL flip to exercise live) |
| Non-admin redirected | ✅ |
| Sidebar link admin-only | ✅ |
| No regressions | ✅ |
| npm run lint | ✅ (0 errors, existing warnings only) |
| npm run build | ✅ |

**Concerns:** Admin-specific UI was not manually exercised in a browser session because no user was marked `is_admin` during this task, by design.
