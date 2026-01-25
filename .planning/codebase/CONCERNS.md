# Codebase Concerns

**Analysis Date:** 2026-01-24

## Security Concerns

**Exposed Environment Variables:**
- Issue: `.env` file is committed to git repository with plaintext API keys
- Files: `/.env`
- Impact: Supabase URL, Publishable Key, and Gemini API Key are publicly accessible if repository is public. Any attacker can make API calls using these credentials.
- Current mitigation: `.gitignore` exists but `.env` is already tracked in history
- Recommendations:
  1. Immediately rotate Supabase publishable key and Gemini API key
  2. Remove `.env` from git history using `git filter-branch` or `bfg`
  3. Add pre-commit hook to prevent `.env` commits
  4. Use Supabase environment variable settings for managing secrets instead
  5. Ensure `.env` is in `.gitignore` and never commit it

**Type Casting to `any` for Untyped Tables:**
- Issue: Multiple Supabase RPC calls and table accesses cast to `any` to bypass TypeScript type checking, masking potential runtime errors
- Files:
  - `src/components/auth/MultiAuthLogin.tsx` - `validate_qr_token as any`
  - `src/components/student/JoinInstructor.tsx` - `accept_invite as any`
  - `src/hooks/useRecurringSchedules.ts` - `recurring_schedules as any`, `generate_recurring_tasks as any`
  - `src/hooks/useTemplates.ts` - Multiple `templates` and `template_tasks as any` casts
  - `src/pages/GroupDetail.tsx` - `notes as any`
  - `src/components/student/InstructorsList.tsx` - `instructor_students as any`
- Impact: Silent failures in development, no compile-time type safety for these critical data operations. Runtime errors only discovered in production.
- Recommendations: Generate proper TypeScript types for all custom tables using Supabase CLI's type generation

**Unsafe HTML Rendering:**
- Issue: `dangerouslySetInnerHTML` used in chart theming
- Files: `src/components/ui/chart.tsx` (lines 70-85)
- Impact: While this specific use is safe (rendering static CSS), it sets a dangerous precedent. If theme values become user-controlled, XSS vulnerability is possible.
- Recommendations: Use style injection via DOM APIs instead of `dangerouslySetInnerHTML`

**User Role Stored in LocalStorage:**
- Issue: User role (`intended_role`) stored in browser's localStorage
- Files:
  - `src/components/auth/CoachAuth.tsx`
  - `src/components/auth/MultiAuthLogin.tsx`
- Impact: Attacker can modify localStorage to switch roles without authentication. Should only be determined server-side.
- Recommendations: Remove localStorage role tracking, use Supabase user metadata or custom claims for role verification

**Check-in State Tracked in LocalStorage:**
- Issue: Daily check-in state cached in localStorage to avoid "JWT errors"
- Files: `src/components/CheckInModal.tsx` (lines 48-56, 69, 107)
- Impact: User can manually set localStorage key to bypass daily check-in requirements. Comments indicate JWT errors being silently ignored rather than properly handled.
- Recommendations: Implement proper JWT refresh logic and error handling instead of relying on localStorage cache

## Tech Debt & Code Quality Issues

**Massive Component Files (>1000 lines):**
- Files with extreme complexity that need refactoring:
  - `src/pages/CoachCalendar.tsx` (1,661 lines) - Calendar UI, task editing, AI interactions
  - `src/pages/Tasks.tsx` (1,037 lines) - Task assignment, templates, scheduling
  - `src/pages/GroupDetail.tsx` (728 lines) - Group management
  - `src/pages/student/StudentHome.tsx` (651 lines) - Home dashboard
  - `src/components/ui/sidebar.tsx` (637 lines) - Navigation sidebar
  - `src/pages/student/StudentSchedule.tsx` (626 lines) - Schedule view
- Impact: Hard to test, maintain, and reason about. Single component handling too many concerns.
- Recommendations: Extract components into smaller, focused modules with single responsibilities. Consider extracting business logic into hooks.

**Missing Test Coverage:**
- Issue: No test files found in codebase
- Impact: High risk for regressions, impossible to refactor safely, no documentation of expected behavior
- Recommendations: Add Jest/Vitest configuration, create test files for:
  - All hooks (useAuth, useAssignments, useAIAssistant, etc.)
  - Critical components (CheckInModal, StudentHome, CoachCalendar)
  - Utility functions (safeParseISO, date parsing)

**Widespread Use of `console.error` without Structured Logging:**
- Issue: 20+ instances of `console.error` throughout codebase with no structured logging framework
- Files: Multiple across hooks and components
- Impact: Production errors go to browser console only, impossible to track/monitor real user issues
- Recommendations: Implement proper error logging service (Sentry, LogRocket, or custom), replace all console.error with structured logging

**Type Casting to `any` for Browser APIs:**
- Issue: Type casting `window as any` to access non-standard browser properties
- Files:
  - `src/components/FloatingAI.tsx` - `window as any` for webkitSpeechRecognition
  - `src/hooks/useDeviceType.tsx` - `window.navigator as any` for standalone detection
- Impact: Loses type safety for browser capabilities checking
- Recommendations: Create proper type definitions for these APIs or use type guards instead of casting

**Unmanaged Memory Leaks:**
- Issue: setInterval in `src/components/SparkyNudge.tsx` (line 42-45) properly cleared, but multiple setTimeout calls don't ensure cleanup in all contexts
- Files:
  - `src/components/ui/sketch.tsx` - setTimeout without cleanup
  - `src/components/MagicScheduleButton.tsx` - setTimeout without visible cleanup
  - `src/pages/student/StudentSchedule.tsx` - setTimeout without cleanup
  - `src/pages/student/StickerBook.tsx` - setTimeout without cleanup
- Impact: Accumulated memory leaks in long-lived pages, especially on mobile
- Recommendations: Wrap all setTimeout/setInterval calls in useEffect with proper cleanup

**Inconsistent Error Handling Patterns:**
- Issue: Try-catch blocks (76 instances) without consistent error recovery strategy
- Pattern observed: Some errors logged with console.error, some silently ignored, some shown to user
- Files: Throughout codebase (useAssignments, CheckInModal, StudentDetailSheet, etc.)
- Impact: Unpredictable user experience, some errors silently fail
- Recommendations: Create error handling utility with consistent patterns (toast + console + optional retry)

**API Type Casting:**
- Issue: RPC calls cast to `unknown` or `any` to bypass TypeScript checks
- Files: `src/hooks/useStickers.ts` - `earnedStickers.data as unknown as UserSticker[]`
- Impact: Runtime type mismatches possible, no compile-time validation
- Recommendations: Add proper type definitions for all RPC responses

## Performance Concerns

**No React Query Usage Despite Installation:**
- Issue: `@tanstack/react-query` installed but not used for data fetching
- Files: Only `useQueryClient` import in `src/pages/People.tsx` suggests incomplete migration
- Impact: No caching, no automatic refetching, no deduplication of requests. Manual state management for every fetch.
- Recommendations: Migrate all Supabase queries to use useQuery/useMutation for better performance and UX

**Direct Supabase Calls in Components:**
- Issue: Database queries scattered directly in component useEffect hooks rather than centralized
- Files: Almost every page file makes direct supabase calls
- Impact: Duplicated queries, no caching, difficult to coordinate updates
- Recommendations: Create query hooks for each data fetch pattern

**No Request Debouncing or Throttling:**
- Issue: Form inputs and API calls have no debouncing for search/filter operations
- Impact: Potential N+1 API queries on rapid user input
- Recommendations: Add debouncing to search/filter inputs using lodash.debounce or custom hook

**Unoptimized Re-renders in Large Lists:**
- Issue: No memo/useMemo on list items in calendar views and task lists
- Files: `src/pages/CoachCalendar.tsx`, `src/pages/Tasks.tsx`
- Impact: O(n) re-renders when calendar state changes
- Recommendations: Wrap list items with React.memo and memoize callbacks with useCallback

## Fragile Areas & Architectural Issues

**Complex Date Handling Without Validation:**
- Issue: Heavy use of date-fns parsing with custom `safeParseISO` utility but inconsistent error handling
- Files: Multiple page files (CoachCalendar, StudentHome, Tasks)
- Impact: Invalid dates can cause silent failures or incorrect rendering
- Recommendations: Add comprehensive date validation with user feedback

**AI Assistant Integration Brittleness:**
- Issue: 20-second timeout with hardcoded error messaging
- Files: `src/hooks/useAIAssistant.ts`
- Current mitigation: Timeout errors suggest reducing request scope, but no automatic retry
- Impact: If Gemini API is slow (common during load), users get timeout errors
- Recommendations:
  - Implement exponential backoff retry logic
  - Add user-facing queue notification for long-running operations
  - Cache AI responses when possible

**Locale/Timezone Issues:**
- Issue: Heavy use of date formatting without timezone awareness
- Files: Throughout codebase - date parsing and display
- Impact: Scheduling tasks in different timezones may show incorrect times
- Recommendations: Store all dates as UTC in database, apply timezone conversion only at display layer

**QR Token Validation Lacks Rate Limiting:**
- Issue: `validate_qr_token` RPC called without rate limiting
- Files: `src/components/auth/StudentAuth.tsx`, `src/components/auth/MultiAuthLogin.tsx`
- Impact: Brute force attacks possible on QR token validation
- Recommendations: Implement rate limiting on RPC call or add Supabase rate limit rules

**Responsive Design Not Fully Implemented:**
- Issue: Many pages have large fixed layouts without mobile optimization
- Files: `src/pages/CoachCalendar.tsx` (1661 lines of desktop-centric code)
- Impact: Poor mobile experience despite PWA claim in README
- Recommendations: Test on actual mobile devices, add mobile breakpoints and touch-optimized interactions

## Database & State Management

**Race Conditions in Task Status Updates:**
- Issue: Task status (pending/completed/missed) can be updated from multiple sources without locking
- Files: `src/pages/CoachCalendar.tsx`, `src/pages/student/StudentHome.tsx`
- Impact: Concurrent updates from coach and student could cause inconsistent state
- Recommendations: Implement optimistic updates with server-side conflict resolution

**No Pagination for Large Datasets:**
- Issue: All queries fetch without pagination/limits
- Example: Student home page fetches all tasks, all groups, all instructors
- Files: Multiple page files
- Impact: O(n) load times and memory usage scales with number of students/tasks
- Recommendations: Add pagination/cursor-based queries with virtual scrolling for lists

**Group Member Fetches Multiple Times:**
- Issue: `getGroupMembers` called independently in multiple places
- Files: `src/pages/Tasks.tsx` (line 98), `src/pages/GroupDetail.tsx`
- Impact: Duplicate API calls for same data
- Recommendations: Cache group members in context or query cache

## Known Issues & Workarounds

**JWT Error Handling as Silent Fallback:**
- Issue: CheckInModal catches JWT errors and silently falls back to localStorage
- Files: `src/components/CheckInModal.tsx` (line 72-74)
- Behavior: "If API fails (e.g. JWT error), we just let them try to log again or ignore"
- Impact: User sees no feedback that their check-in may have failed
- Recommendations: Show explicit message about session issues and prompt re-login

**Recurring Schedules Table Creation Deferred:**
- Issue: Code catches "table not yet created" error
- Files: `src/hooks/useRecurringSchedules.ts`
- Impact: Feature completely broken until manual migration run
- Recommendations: Auto-migrate tables on first access or fail loudly during app initialization

**Templates Table Creation Deferred:**
- Issue: Similar deferred table creation for templates
- Files: `src/hooks/useTemplates.ts`
- Impact: Feature unavailable until manual setup
- Recommendations: Same as recurring schedules - auto-migrate on startup

## Missing Features That Should Exist

**No Offline Support Despite PWA Claim:**
- Issue: README advertises offline support but there's no service worker caching strategy
- Files: vite-plugin-pwa installed but not configured for offline task viewing
- Impact: App claims PWA features it doesn't provide
- Recommendations: Implement proper offline cache or remove PWA claims

**No Error Boundary:**
- Issue: No React Error Boundary component to catch render errors
- Impact: Single component error crashes entire app
- Recommendations: Add Error Boundary wrapper at app root

**No Loading States for Async Operations:**
- Issue: Many async operations don't show loading indicators
- Impact: Users don't know if action succeeded or is still processing
- Recommendations: Add loading state management to all async operations

## Dependency Concerns

**32 `as any` or `as unknown` Casts Found:**
- Issue: Widespread type bypassing defeats TypeScript's safety
- Recommendations: Generate proper types from Supabase schema, use strict tsconfig

**No Version Pinning Strategy:**
- Issue: Dependencies use ^ versioning (allows breaking changes)
- Files: `package.json`
- Impact: Automatic updates could break app silently
- Recommendations: Pin critical dependencies or use `npm ci` with lock files

---

*Concerns audit: 2026-01-24*
