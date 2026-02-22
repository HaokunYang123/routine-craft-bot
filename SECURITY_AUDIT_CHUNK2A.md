# Security Audit Report — Chunk 2A: Move Gemini API Calls to Server-Side

## Files Changed
- `src/lib/gemini.ts`
- `supabase/functions/ai-chat/index.ts`
- `supabase/functions/ai-assistant/index.ts`
- `.env`

## What Changed
- Refactored `src/lib/gemini.ts` to stop calling Google Gemini directly from the browser.
- `callGemini` now sends authenticated requests to existing Supabase Edge Function endpoint `/functions/v1/ai-chat`.
- Added explicit auth-token forwarding from frontend (`Authorization: Bearer <session_token>` + `apikey`) in `src/lib/gemini.ts`.
- Added auth verification in `ai-chat` and `ai-assistant` edge functions using `supabase.auth.getUser()`.
- Added `chat` action support in `ai-assistant` for compatibility with `useAIAssistant().chat`.
- Removed `VITE_GEMINI_API_KEY` from `.env`.

## Before/After (Key Refactors)

### 1) Client Gemini transport (`src/lib/gemini.ts`)
Before:
```ts
const apiKey = env.VITE_GEMINI_API_KEY;
await fetch(`${GEMINI_API_URL}?key=${apiKey}`, { ... })
```

After:
```ts
const { data } = await supabase.auth.getSession();
await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${data.session?.access_token}`,
    apikey: SUPABASE_ANON_KEY,
  },
  body: JSON.stringify({ systemPrompt, temperature, messages }),
})
```

### 2) Edge auth gate (`supabase/functions/ai-chat/index.ts`)
Before:
```ts
const { messages, systemPrompt } = await req.json();
// no auth verification
```

After:
```ts
const authHeader = req.headers.get("Authorization");
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { Authorization: authHeader } },
});
const { data: { user } } = await supabase.auth.getUser();
if (!user) return 401;
```

### 3) Edge auth gate (`supabase/functions/ai-assistant/index.ts`)
Before:
```ts
const body = await req.json();
// no auth verification
```

After:
```ts
const authHeader = req.headers.get("Authorization");
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { Authorization: authHeader } },
});
const { data: { user } } = await supabase.auth.getUser();
if (!user) return 401;
```

## Verification Results

1. `src/lib/gemini.ts` no longer references `VITE_GEMINI_API_KEY`
- Command: `rg -n "VITE_GEMINI_API_KEY" src/lib/gemini.ts`
- Result: no matches
- Status: **PASS**

2. `grep -r "VITE_GEMINI" src/` shows zero results
- Command: `grep -r "VITE_GEMINI" src/`
- Result: no output (exit 1)
- Status: **PASS**

3. AI plan builder works end-to-end (create test plan)
- Result: end-to-end UI validation is not executable in this CLI-only session without an authenticated browser session + live edge-function runtime wiring.
- Status: **BLOCKED**

4. Other AI chat/assistant features still work
- Command: `npx vitest run src/hooks/useAIAssistant.test.ts`
- Result: `13 passed`
- Status: **PASS (hook-level regression coverage)**

5. App builds without errors
- Command: `npm run build`
- Result: build completed successfully
- Status: **PASS**

6. Built bundle contains no Gemini API key (`AIza`)
- Command: `grep -r "AIza" dist/`
- Result: no output (exit 1)
- Status: **PASS**

## Overall Status
- Chunk 2A implementation: **PASS with one blocked manual e2e check**
