# Chunk 2 Report: Structured Schemas + Allowlists

## First Principles Analysis
The requirements solve real reliability and security issues: malformed model JSON and untrusted client-controlled prompt inputs. The simpler robust approach was to make the edge function the source of truth for both prompt construction and schema enforcement, instead of trusting frontend prompt text. I adapted implementation to structured payload transport so allowlisting is meaningful and enforceable.

## What Changed
- `supabase/functions/ai-chat/index.ts`: Added action allowlist, per-action payload sanitizers, server-side prompt builders, Gemini `responseMimeType` + `responseSchema`, and unknown-action `400` handling.
- `src/lib/gemini.ts`: Added `payload` request support, updated edge request body, and kept legacy prompt fields optional for compatibility.
- `src/components/ai/AIPlanBuilder.tsx`: Switched `generate_plan` call to structured payload (`userInput`).
- `src/components/ai/PersonalizeDialog.tsx`: Switched `personalize` call to structured payload (`template`, `modifier`).
- `src/components/ai/WeeklySummary.tsx`: Switched `weekly_summary` call to structured payload (`groupName`, `summaryData`).
- `src/components/ui/PolishButton.tsx`: Switched `polish` call to structured payload (`roughText`).
- `src/components/dashboard/StudentDetailSheet.tsx`: Switched `student_recap` call to structured payload (student stats + recent tasks).

## Decisions Made
- Kept frontend normalization/parsing logic as defense-in-depth rather than loosening it after adding backend schemas.
- Added nested payload sanitization (not just top-level key filtering) for `template`, `summaryData`, and `recentTasks` to prevent hidden prompt-channel fields.
- Kept legacy `systemPrompt`/`userMessage` fields optional in `callGemini()` for compatibility, while edge now ignores them for supported actions.

## Verification
| Check | Expected | Actual | Pass? |
|-------|----------|--------|-------|
| `responseMimeType` wired | present in `ai-chat` call | line 628: `responseMimeType: "application/json"` | yes |
| `responseSchema` wired | present in `ai-chat` call | line 629: `responseSchema: RESPONSE_SCHEMAS[action]` | yes |
| Payload allowlist exists | allowlist constant + usage | lines 30 and 262 (`ALLOWED_FIELDS` declaration and read) | yes |
| Frontend build | succeeds | `npm run build` completed, SW/workbox files generated | yes |
| Diff footprint | expected multi-file changes | 7 files changed, 847 insertions, 111 deletions | yes |

## Concerns / Next Chunk Notes
- Edge prompt templates are now duplicated from frontend prompt helper files; consider deleting or repurposing frontend prompt builders to avoid drift.
- `responseSchema` guarantees shape, but semantic quality still depends on prompt quality and model behavior.
