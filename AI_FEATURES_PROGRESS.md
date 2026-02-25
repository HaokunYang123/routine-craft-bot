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
