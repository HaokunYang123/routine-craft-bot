# External Integrations

**Analysis Date:** 2026-01-24

## APIs & External Services

**AI & LLM:**
- Google Gemini API - Natural language task generation and planning
  - SDK/Client: Called via Supabase edge functions
  - Auth: `GEMINI_API_KEY` environment variable
  - Used for: Task generation, plan personalization, progress summaries, task refinement, weekly summaries, chat assistance
  - Implementation: `src/hooks/useAIAssistant.ts` - Invokes `ai-assistant` Supabase function with action-based payloads

**Authentication:**
- Google OAuth - Multi-user login via Google accounts
  - Provider: Supabase Auth integration
  - Implementation: `src/hooks/useGoogleAuth.ts`
  - Scopes: profile, email
  - Options: offline access, consent prompt, OIDC redirect

## Data Storage

**Primary Database:**
- Supabase (PostgreSQL) - Backend-as-a-Service
  - Connection: Supabase JS SDK via `@supabase/supabase-js`
  - Client: `src/integrations/supabase/client.ts`
  - Auth: Public anon key (RLS enforced on database)
  - Environment:
    - Project ID: `VITE_SUPABASE_PROJECT_ID`
    - URL: `VITE_SUPABASE_URL`
    - Key: `VITE_SUPABASE_PUBLISHABLE_KEY`

**Database Tables:**
- `profiles` - User profile data (user_id, role, display_name, avatar_url)
- `people` - Managed individuals (coaches manage students, teachers manage athletes)
  - Fields: id, user_id, type, name, age, avatar_url, notes
- `routines` - Routine/plan definitions
  - Fields: id, user_id, person_id, name, description, schedule
- `tasks` - Individual tasks within routines or standalone
  - Fields: id, user_id, person_id, routine_id, title, description, due_date, scheduled_time, duration_minutes, is_completed, completed_at
- `chat_messages` - AI assistant conversation history
  - Fields: id, user_id, role (user/assistant), content, created_at
- `stickers` - Reward stickers for gamification
  - Fields: id, name, image_url, rarity, created_at
- `user_stickers` - User sticker collection (earned rewards)
  - Fields: id, user_id, sticker_id, task_id, earned_at
- `student_logs` - Student sentiment/mood tracking
  - Fields: id, user_id, log_date, sentiment, notes, created_at
- `recurring_schedules` - Template-based recurring task patterns (inferred)

**File Storage:**
- Supabase Storage implied for avatar URLs - Not explicitly configured in code
- Local filesystem fallback for avatar uploads

**Caching:**
- Browser Cache via PWA Service Worker (Workbox)
  - Caches: JS, CSS, HTML, images, SVG, WOFF2 fonts
  - Google Fonts: CacheFirst strategy with 1-year TTL

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (custom + OAuth)
  - Implementation: `src/hooks/useAuth.tsx`
  - Email/password sign-up and login (custom)
  - Google OAuth sign-in
  - Session persistence: localStorage
  - Auto token refresh enabled
  - Post-login role validation: Strict role checking on coach/student signup

**Authentication Flow:**
- Coach sign-up: Email/password or Google OAuth → creates profile with role="coach"
- Student sign-up: Email/password or Google OAuth → creates profile with role="student" or via class code
- Role validation on login via database profiles table

**Session Management:**
- Managed by Supabase Auth
- Stored in localStorage with auto-refresh
- Subscription-based auth state changes in React hooks

## Monitoring & Observability

**Error Tracking:**
- Not detected (no Sentry/DataDog/LogRocket)
- Console logging via browser console.error in `useAIAssistant.ts`

**Logs:**
- Browser console logs (development and production)
- Client-side error handling in AI assistant with timeout detection (20s limit)

## CI/CD & Deployment

**Hosting:**
- Static hosting (SPA) implied - Vite builds to `dist/`
- Supabase serves backend (functions, database, auth)

**CI Pipeline:**
- Not explicitly configured in codebase
- Build command: `vite build` (production) or `vite build --mode development`

**PWA Deployment:**
- Service worker auto-registration via `vite-plugin-pwa`
- Manifest auto-update on deployment
- Workbox precaching for app shell

## Environment Configuration

**Required env vars (in `.env`):**

```
# Supabase Configuration
VITE_SUPABASE_PROJECT_ID="vjzaayxeoeojuccbriid"
VITE_SUPABASE_URL="https://vjzaayxeoeojuccbriid.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# AI/LLM
GEMINI_API_KEY="AIzaSyCGSjA4V5jr0m-BhYt13j8Uikaw4WjCJP8"
```

**Secrets location:**
- `.env` file (not committed to git, contains sensitive keys)
- Supabase dashboard for row-level security policies and function secrets

**Development:**
- Dev server: `localhost:8080` (Vite server)
- Database: Live Supabase project (not local)
- API: Live Supabase project

## Webhooks & Callbacks

**Incoming:**
- Supabase OAuth redirect callback: `${window.location.origin}` (dynamic, set in `useGoogleAuth.ts`)
- Supabase Auth state changes: Handled via `onAuthStateChange` subscription

**Outgoing:**
- AI function invokes: `supabase.functions.invoke("ai-assistant", {...})`
  - Timeout: 20 seconds
  - Action-based dispatch: generate_plan, personalize_plan, modify_plan, summarize_progress, refine_task, weekly_summary, chat

**Real-time Updates:**
- Not explicitly configured
- Supabase Realtime could be used but not visible in current codebase

## Integration Patterns

**Supabase Client Usage:**
- Centralized in `src/integrations/supabase/client.ts`
- Database queries via `.from("table").select()` or similar Postgrest API
- Auth methods: `signInWithPassword()`, `signInWithOAuth()`, `signOut()`, `onAuthStateChange()`
- Edge Functions via `.functions.invoke("function-name", { body: {...} })`

**Type Safety:**
- Supabase types auto-generated: `src/integrations/supabase/types.ts`
- Database types exported as `Database` type for TypeScript integration
- Generic response patterns in AI assistant hook

**Error Handling:**
- AI requests: Detailed error classification (timeout, rate limit, auth, server, config)
- Auth: Try/catch with role validation post-login
- Database: Error propagation to React hooks with toast notifications

---

*Integration audit: 2026-01-24*
