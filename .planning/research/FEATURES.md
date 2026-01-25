# Feature Landscape: React + Supabase Reliability

**Domain:** Production reliability hardening for React + Supabase application
**Researched:** 2026-01-24
**Overall Confidence:** HIGH (based on established patterns and codebase audit)

## Table Stakes

Features users expect in a production app. Missing = crashes, data loss, or unprofessional experience.

| Feature | Why Expected | Complexity | Current State | Notes |
|---------|--------------|------------|---------------|-------|
| **Error Boundary** | Prevents full-app crash from single component error | Low | Missing | React 18 standard; wrap at app root + route level |
| **Consistent Error Handling** | Users need to know when something fails | Medium | 76 inconsistent try-catch blocks | Create utility: toast + log + optional retry |
| **Loading States** | Users need feedback during async operations | Low | Partially missing | Button spinners, skeleton loaders, disabled states |
| **Auth Session Management** | JWT expiry must be handled gracefully | Medium | Silent failures | Supabase auto-refresh exists but errors ignored |
| **Memory Leak Prevention** | Long-lived apps must clean up resources | Medium | Several setTimeout leaks | useEffect cleanup for all timers/subscriptions |
| **Type Safety** | Runtime errors should be caught at build time | High | 32 `as any` casts | Generate Supabase types, eliminate casts |
| **Structured Logging** | Production errors must be trackable | Medium | console.error only | Replace with logging service (Sentry/custom) |
| **Request Timeout Handling** | Slow APIs must not hang indefinitely | Medium | 20s timeout, no retry | Add retry with exponential backoff |
| **Form Validation Feedback** | Invalid input must be clearly communicated | Low | Partial | Zod + react-hook-form already installed |
| **Optimistic Updates with Rollback** | Failed mutations must revert UI state | Medium | Not implemented | Especially for task status updates |

## Differentiators

Features that improve reliability beyond baseline expectations. Not required, but signal quality.

| Feature | Value Proposition | Complexity | Priority | Notes |
|---------|-------------------|------------|----------|-------|
| **React Query Integration** | Caching, deduplication, background refetch | Medium | High | Already installed but unused |
| **Offline Detection** | Warn user when actions will fail | Low | Medium | Navigator.onLine + visual indicator |
| **Request Deduplication** | Prevent double-submission | Low | High | Especially for task creation |
| **Retry UI** | "Try Again" buttons on failed operations | Low | Medium | Better than silent failure |
| **Stale-While-Revalidate** | Show cached data while fetching fresh | Medium | Medium | React Query provides this |
| **Health Check Endpoint** | Monitor backend availability | Low | Low | Supabase has built-in status |
| **Client-Side Rate Limiting** | Prevent user from hammering API | Low | Medium | Especially for AI assistant |
| **Error Recovery Hints** | Guide user on how to fix errors | Low | Medium | "Please refresh" vs "Please wait" |
| **Graceful Degradation** | App works with reduced functionality when API down | High | Low | Complex; defer unless critical |
| **Performance Monitoring** | Track slow renders, long API calls | Medium | Low | React DevTools, custom metrics |

## Anti-Features

Features to deliberately NOT build. Common mistakes or over-engineering traps.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Global Error Toast** | Every API call showing toast = noise | Only toast for user-initiated actions; log background errors |
| **Retry Everything** | Some errors (401, 403) should not retry | Categorize errors: retry transient, prompt for auth, fail fast for permissions |
| **Complex Offline Sync** | PWA offline sync is a project unto itself | Simple offline detection + "you're offline" banner; no queue |
| **Custom Logging Framework** | Reinventing wheel when mature options exist | Use Sentry, LogRocket, or Supabase's built-in logging |
| **Circuit Breaker Pattern** | Over-engineering for a client app | Simple retry with max attempts is sufficient |
| **Comprehensive Telemetry** | Privacy concerns, complexity, maintenance | Focus on error tracking only; defer analytics |
| **Error Codes Everywhere** | Users don't care about "ERR_AUTH_001" | Human-readable messages; codes in logs only |
| **Automatic Session Refresh UI** | Modal interrupting user = bad UX | Silent refresh; only prompt when truly expired |
| **100% Test Coverage** | Diminishing returns past critical paths | Focus on hooks, utilities, critical flows; ~60-70% is realistic |
| **E2E Tests for Everything** | Slow, flaky, high maintenance | Unit/integration for logic; E2E for 3-5 critical paths only |

## Feature Dependencies

Features must be implemented in dependency order to avoid rework.

```
1. Error Boundary (foundation - catches everything else)
   |
   +-> 2. Consistent Error Handling Utility (standardizes error processing)
   |       |
   |       +-> 3. Loading States (uses same pattern)
   |       |
   |       +-> 4. Auth Session Management (uses error utility)
   |       |
   |       +-> 5. Request Timeout + Retry (uses error utility)
   |
   +-> 6. Structured Logging (integrates with error boundary)

7. Type Safety (independent, can run in parallel)

8. Memory Leak Prevention (independent, can run in parallel)

9. React Query Migration (after error handling is consistent)
   |
   +-> 10. Optimistic Updates (uses React Query)
```

### Dependency Rationale

1. **Error Boundary first**: Without it, errors in any subsequent feature crash the app
2. **Error utility before specific handling**: Ensures all error handling uses same pattern
3. **React Query after error utility**: Query error handlers should use the standard utility
4. **Optimistic updates after React Query**: Built on React Query's mutation hooks

## MVP Recommendation

For this reliability milestone, prioritize in this order:

### Phase 1: Foundation (Must Have)
1. **Error Boundary** - Low complexity, high impact (prevents crashes)
2. **Consistent Error Handling Utility** - Medium complexity, enables everything else
3. **Structured Logging** - Medium complexity, enables production debugging

### Phase 2: User Experience (Should Have)
4. **Loading States** - Low complexity, visible improvement
5. **Auth Session Management** - Medium complexity, fixes silent JWT failures
6. **Request Timeout + Retry** - Medium complexity, fixes AI assistant issues

### Phase 3: Code Quality (Should Have)
7. **Type Safety** - High complexity, but prevents future bugs
8. **Memory Leak Prevention** - Medium complexity, prevents performance degradation

### Phase 4: Performance (Nice to Have)
9. **React Query Migration** - Medium complexity, enables caching
10. **Optimistic Updates** - Medium complexity, improves perceived performance

### Defer to Post-Milestone:
- **Offline Detection**: Nice but not critical for reliability
- **Performance Monitoring**: Optimization is separate from reliability
- **Graceful Degradation**: High complexity, low immediate value

## Complexity Assessment

| Complexity | Estimate | Examples |
|------------|----------|----------|
| **Low** | 1-2 hours | Error Boundary, Loading States, Offline Detection |
| **Medium** | 4-8 hours | Error Utility, Auth Management, Retry Logic, Logging |
| **High** | 1-2 days | Type Safety (all 32 casts), React Query Migration |

## Specific Recommendations for This Codebase

Based on CONCERNS.md audit:

### Error Boundary Implementation
```
Location: src/components/ErrorBoundary.tsx
Wrap: <App> in main.tsx, individual routes in router
Fallback UI: "Something went wrong" with refresh button
Logging: Report to structured logging service
```

### Error Handling Utility Pattern
```typescript
// src/lib/errorHandling.ts
export function handleError(error: Error, context: string, options?: {
  showToast?: boolean;  // default: true for user actions
  retry?: () => Promise<void>;
  silent?: boolean;  // default: false
}) {
  // 1. Log to service (always)
  // 2. Show toast if appropriate
  // 3. Return retry function if transient error
}
```

### Error Categories for This App
| Category | Examples | Action |
|----------|----------|--------|
| **Transient** | 504 timeout, network error | Retry with backoff |
| **Auth** | 401 unauthorized, JWT expired | Prompt re-login |
| **Permission** | 403 forbidden | Show "no access" message |
| **Validation** | 400 bad request | Show form errors |
| **Server** | 500 internal error | Log + generic message |
| **Not Found** | 404 | Show "not found" UI |

### Critical Hooks Needing Tests
Priority order based on complexity and usage:
1. `useAuth` - Foundation for all authenticated actions
2. `useAssignments` - Complex scheduling logic (570 lines)
3. `useGroups` - Core data management
4. `useAIAssistant` - Error-prone, timeout handling
5. `useTemplates` - Deferred table creation issue

### Memory Leak Locations to Fix
From CONCERNS.md:
- `src/components/ui/sketch.tsx` - setTimeout
- `src/components/MagicScheduleButton.tsx` - setTimeout
- `src/pages/student/StudentSchedule.tsx` - setTimeout
- `src/pages/student/StickerBook.tsx` - setTimeout

Pattern: Wrap in useEffect with cleanup return.

## Testing Strategy Recommendation

| Layer | Coverage Target | Focus |
|-------|-----------------|-------|
| **Unit (Utilities)** | 90% | safeParseISO, date utils, cn |
| **Unit (Hooks)** | 70% | useAuth, useAssignments, useGroups |
| **Component** | 50% | Critical flows: login, task create, task complete |
| **E2E** | 5 flows | Coach creates task, Student completes task, Login/logout |

### Test Framework Setup
- Vitest (already Vite-based project)
- React Testing Library
- MSW for API mocking (optional but recommended)

## Sources

| Source | Confidence | Notes |
|--------|------------|-------|
| Codebase audit (CONCERNS.md) | HIGH | Direct analysis of existing code |
| PROJECT.md requirements | HIGH | Explicit scope definition |
| React Error Boundary docs | HIGH | Official React documentation pattern |
| Supabase JS client docs | HIGH | Official error handling patterns |
| TanStack Query docs | HIGH | Installed but unused in codebase |

---

*Feature landscape analysis: 2026-01-24*
