# Security Audit Report — Chunk 1: Environment Variables & Secrets
**Date:** February 15, 2026
**Auditor:** Codex
**Scope:** Full codebase + git history

## Executive Summary
Secrets management posture is mixed: server-side env usage is mostly structured, but there are multiple credential exposures in local config/docs and historical commits. I found **4 critical issues**, **4 warnings**, and several clean checks from the required grep/history commands. The highest-risk item is a client-exposed Gemini key path (`VITE_GEMINI_API_KEY`) plus historical committed `.env` secrets.

## Critical Findings
- **CRITICAL:** Client-side Gemini API key is present and used from browser code.
  - `.env:7` -> `VITE_GEMINI_API_KEY="<redacted>"`
  - `src/lib/gemini.ts:33` reads `import.meta.env.VITE_GEMINI_API_KEY`
- **CRITICAL:** Hardcoded database credential and service-role JWT in local project config.
  - `.claude/settings.local.json:6` contains Postgres password `<redacted>`
  - `.claude/settings.local.json:8` contains `SERVICE_KEY="<redacted>"`
- **CRITICAL:** Tracked documentation includes a hardcoded Gemini key.
  - `.planning/codebase/INTEGRATIONS.md:117` -> `GEMINI_API_KEY="<redacted>"`
- **CRITICAL:** Git history contains previously committed `.env` secrets (including Gemini key and Supabase publishable JWTs).
  - `0e1bbdeab739c1e0f54482e641e972db6ad9e8fe` (Jan 11, 2026): `.env` added with Supabase publishable key
  - `ba2319e6391b7dc66f6fc675f6b006b76cd0e643` (Jan 20, 2026): `.env` updated, adds `GEMINI_API_KEY="<redacted>"`
  - `9da04b7168424e12e3586b8a374a2fdb76614222` (Jan 20, 2026): `.env` removed from tracking

## Warnings
- **REVIEW:** `scripts/seed_data.ts:15` hardcodes fallback Supabase URL (`https://vjzaayxeoeojuccbriid.supabase.co`) if env not set.
- **REVIEW:** `scripts/seed_data.ts:35`, `scripts/seed_data.ts:43-45` include static test passwords (`TestCoach123!`, `Student123!`).
- **REVIEW:** `.claude/settings.local.json` is protected by a **global** gitignore (`/Users/haokunyang/.config/git/ignore`) not repo `.gitignore`; portability risk across machines.
- **REVIEW:** `VITE_SUPABASE_PROJECT_ID` exists in `.env` but no runtime usage was found in application code.

## Detailed Findings

### Hardcoded Secrets Scan
Required search patterns and outcomes:

- `grep -rn "service_role" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.json" --include="*.env*" .`
  - Result: matches in `node_modules` docs/comments only; no first-party direct secret literal found by this pattern.
- `grep -rn "sk-" .`
  - Result: large false-positive set (primarily `task-*`, lockfiles, docs); no OpenAI key-shaped value found after boundary validation.
- `grep -rn "sk-ant-" .`
  - Result: Clean (no matches).
- `grep -rn "eyJ" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" .`
  - Result: Clean (no matches in JS/TS files).
- `grep -rn "supabase" --include="*.env*" .`
  - Result:
    - `.env:3` -> `VITE_SUPABASE_URL="https://vjzaayxeoeojuccbriid.supabase.co"`

Additional full-repo audit findings (outside the strict grep set):
- `.env:4` -> `VITE_SUPABASE_PUBLISHABLE_KEY="<redacted>"`
- `.env:7` -> `VITE_GEMINI_API_KEY="<redacted>"`
- `.planning/codebase/INTEGRATIONS.md:117` -> `GEMINI_API_KEY="<redacted>"`
- `.claude/settings.local.json:6` includes Postgres password literal: `<redacted>`
- `.claude/settings.local.json:8` includes service JWT: `<redacted>`

### Git History Scan
Required commands and outcomes:

- `git log -p --all -S "service_role" --diff-filter=A`
  - Result: no additions found.
- `git log -p --all -S "supabase_service" --diff-filter=A`
  - Result: no additions found.
- `git log -p --all -S "sk-" --diff-filter=A`
  - Result: high-noise matches; no key-shaped OpenAI/Anthropic token identified.
- `git log -p --all -S "password" --diff-filter=A`
  - Result: additions include test-password literals in `scripts/seed_data.ts`.
- `git log --all --full-history -- "*.env*"`
  - Result: `.env` was committed and later removed.

Confirmed historical secret commits:
- **Jan 11, 2026** (`0e1bbdeab739c1e0f54482e641e972db6ad9e8fe`): `.env` added with
  - `VITE_SUPABASE_PROJECT_ID="yklffwiyrfwcqkcnvetu"`
  - `VITE_SUPABASE_PUBLISHABLE_KEY="<redacted>"`
  - `VITE_SUPABASE_URL="https://yklffwiyrfwcqkcnvetu.supabase.co"`
- **Jan 20, 2026** (`ba2319e6391b7dc66f6fc675f6b006b76cd0e643`): `.env` modified with
  - `VITE_SUPABASE_PUBLISHABLE_KEY="<redacted>"`
  - `GEMINI_API_KEY="<redacted>"`
- **Jan 20, 2026** (`9da04b7168424e12e3586b8a374a2fdb76614222`): `.env` deleted from tracking; commit message acknowledges accidental exposure.
- **Jan 24, 2026** (`55788fbf6650c721b958f8c2abc954f67c47bd57`): `.planning/codebase/INTEGRATIONS.md` added with hardcoded `GEMINI_API_KEY="<redacted>"`.

### Environment Variable Inventory
| Variable Name | Files Using It | NEXT_PUBLIC_ | Should Be Client-Side | Risk Level |
|---|---|---|---|---|
| `VITE_SUPABASE_PROJECT_ID` | `.env`, `.planning/codebase/INTEGRATIONS.md`, `.planning/codebase/STACK.md` | No | Yes (if needed in client metadata) | REVIEW |
| `VITE_SUPABASE_URL` | `.env`, `src/integrations/supabase/client.ts`, `README.md` | No | Yes | SAFE |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env`, `src/integrations/supabase/client.ts`, `README.md` | No | Yes (public anon/publishable key) | SAFE |
| `VITE_GEMINI_API_KEY` | `.env`, `src/lib/gemini.ts`, `docs/teachcoachconnect-dev-log.md` | No | **No** | **CRITICAL** |
| `GEMINI_API_KEY` | `supabase/functions/ai-assistant/index.ts`, `supabase/functions/ai-chat/index.ts`, `README.md`, `.planning/codebase/INTEGRATIONS.md` | No | No (server/edge only) | REVIEW |
| `SUPABASE_URL` | `scripts/seed_data.ts`, `supabase/functions/mark-missed-tasks/index.ts`, `supabase/functions/delete-account/index.ts`, `README.md` | No | No (server/script only) | SAFE |
| `SUPABASE_SERVICE_ROLE_KEY` | `scripts/seed_data.ts`, `supabase/functions/mark-missed-tasks/index.ts`, `supabase/functions/delete-account/index.ts`, `README.md` | No | No (server/script only) | REVIEW |
| `SUPABASE_ANON_KEY` | `supabase/functions/delete-account/index.ts` | No | Usually client/public; server use also valid | SAFE |
| `NODE_ENV` | `src/lib/profiling.ts` | No | Build/runtime internal | SAFE |
| `CI` | `playwright.config.ts` | No | CI runtime only | SAFE |

### .gitignore Status
- `.gitignore` includes all requested entries:
  - `.env` (`.gitignore:31`)
  - `.env.local` (`.gitignore:32`)
  - `.env.development` (`.gitignore:33`)
  - `.env.production` (`.gitignore:34`)
  - `.env*.local` (`.gitignore:35`)
- Existing env files in repo tree:
  - `./.env` only
- `.env` is currently ignored and not tracked (`git check-ignore -v .env` confirms).
- Gap: `.claude/settings.local.json` is ignored via global ignore, not repository `.gitignore`.

### Client Bundle Exposure
- `NEXT_PUBLIC_` variables: **None found**.
- Equivalent client-exposed vars in this Vite app (`VITE_`):
  - `VITE_SUPABASE_URL` -> acceptable client-side.
  - `VITE_SUPABASE_PUBLISHABLE_KEY` -> acceptable client-side (publishable key).
  - `VITE_GEMINI_API_KEY` -> **should not be client-side**; this exposes a billable API key in browser bundles and network calls.

## Recommendations
1. Rotate exposed credentials immediately: `VITE_GEMINI_API_KEY` (`<redacted>`), historical `GEMINI_API_KEY` (`<redacted>`), documented `GEMINI_API_KEY` (`<redacted>`), local DB password (`<redacted>`), and local service JWT (`...cXKAHoKPzOntVMeb_IW3RZIXuZRMQomO_M4sQaV2l24`).
2. Remove hardcoded secrets from tracked docs/config (`.planning/codebase/INTEGRATIONS.md`, any local config templates).
3. Eliminate browser direct Gemini calls (`src/lib/gemini.ts`) and move all Gemini access behind server/edge functions using server-only `GEMINI_API_KEY`.
4. Perform git history remediation for committed secrets (`.env` and docs key commit), then force-push cleaned history if repository policy requires it.
5. Add repo-level guardrails: include `.claude/settings.local.json` in `.gitignore`, add pre-commit/CI secret scanning (e.g., gitleaks/trufflehog), and block secret patterns.
6. Keep `SUPABASE_SERVICE_ROLE_KEY` strictly server-only and never in client-prefixed env vars.

## Next Steps
1. Complete key rotation and revocation in provider dashboards, then validate no stale keys still authenticate.
2. Implement server-only Gemini architecture and remove `VITE_GEMINI_API_KEY` from local/project docs.
3. Confirm clean secret scan and history policy compliance before starting Chunk 2.
