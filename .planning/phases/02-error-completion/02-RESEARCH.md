# Phase 2: Error Completion - Research

**Researched:** 2026-01-25
**Domain:** Loading states, JWT session handling, retry logic with exponential backoff
**Confidence:** HIGH

## Summary

This phase implements loading state indicators for async operations, JWT session expiry handling with modal prompts, and retry logic with exponential backoff for AI assistant requests. The codebase already has foundational patterns in place: Lucide's `Loader2` icon with `animate-spin` for buttons, basic loading state management via `useState`, and a skeleton component from shadcn/ui.

The standard approach uses the existing UI primitives (Button with disabled state + Loader2, Skeleton component, AlertDialog) combined with Supabase's built-in auth events (`onAuthStateChange`) for JWT handling. For AI retry logic, a simple custom implementation using recursive promises with exponential backoff is recommended over adding a new dependency, given the project's specific requirements (AbortController support, UI feedback integration).

**Primary recommendation:** Leverage existing codebase patterns (Loader2 spinner, Skeleton, AlertDialog) rather than introducing new libraries. Implement retry logic inline in useAIAssistant hook with configurable backoff delays (1s, 2s, 4s) and AbortController for cancellation.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| lucide-react | ^0.462.0 | Loader2 spinner icon | Already used throughout codebase |
| @radix-ui/react-alert-dialog | ^1.1.14 | Session expiry modal | Already installed via shadcn/ui |
| @supabase/supabase-js | ^2.90.1 | Auth state events (SIGNED_OUT, TOKEN_REFRESHED) | Built-in JWT refresh + event system |
| sonner | ^1.7.4 | Toast notifications | Already used for error display |

### Supporting (Already in Project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Skeleton component | shadcn/ui | Data loading placeholders | Data fetching states |
| class-variance-authority | ^0.7.1 | Button variant styling | Disabled state styling |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom retry logic | exponential-backoff npm | Adds dependency; custom gives AbortController integration |
| AlertDialog for session | Dialog component | AlertDialog better for blocking, non-dismissible modal |
| Manual loading state | React Query mutations | Overkill for simple button loading; project uses useState pattern |

**Installation:**
```bash
# No new installations needed - all dependencies already present
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── ui/
│   │   ├── loading-button.tsx    # NEW: Button with integrated loading state
│   │   └── skeleton.tsx          # EXISTS: Already has basic skeleton
│   └── auth/
│       └── SessionExpiredModal.tsx  # NEW: Non-dismissible session modal
├── hooks/
│   └── useAIAssistant.ts         # MODIFY: Add retry logic with backoff
├── lib/
│   └── error.ts                  # EXISTS: Phase 1 handleError utility
└── contexts/
    └── AuthContext.tsx           # NEW or MODIFY: Session expiry state
```

### Pattern 1: Loading Button Component
**What:** Reusable button that accepts `isLoading` prop, shows spinner while keeping text visible
**When to use:** All form submissions and async button actions
**Example:**
```typescript
// Source: Existing codebase pattern from CoachAuth.tsx lines 147-149, 190-193
interface LoadingButtonProps extends ButtonProps {
  isLoading?: boolean;
  children: React.ReactNode;
}

function LoadingButton({ isLoading, children, disabled, ...props }: LoadingButtonProps) {
  return (
    <Button disabled={disabled || isLoading} {...props}>
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </Button>
  );
}
```

### Pattern 2: Skeleton Placeholders for Data Fetching
**What:** Skeleton components that mimic content layout during data loading
**When to use:** Initial page loads, data refetching
**Example:**
```typescript
// Source: shadcn/ui Skeleton component (src/components/ui/skeleton.tsx)
function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}
```

### Pattern 3: Non-Dismissible Session Modal
**What:** AlertDialog that cannot be closed via escape or clicking outside
**When to use:** Session expired requiring re-login
**Example:**
```typescript
// Source: Radix UI AlertDialog documentation
<AlertDialog open={sessionExpired}>
  <AlertDialogContent
    onEscapeKeyDown={(e) => e.preventDefault()}
    onPointerDownOutside={(e) => e.preventDefault()}
  >
    <AlertDialogHeader>
      <AlertDialogTitle>Session Expired</AlertDialogTitle>
      <AlertDialogDescription>
        Your session has expired. Please sign in again to continue.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogAction onClick={handleReLogin}>
        Sign In Again
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Pattern 4: Exponential Backoff with AbortController
**What:** Retry failed requests with increasing delays, supporting cancellation
**When to use:** AI assistant API calls
**Example:**
```typescript
// Source: Best practices from multiple sources
async function retryWithBackoff<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  options: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    signal?: AbortSignal;
  }
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 4000, signal } = options;

  let lastError: Error;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (signal?.aborted) throw new Error('Cancelled');
      return await fn(signal!);
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError!;
}
```

### Anti-Patterns to Avoid
- **Disabling entire forms during submission:** Only disable the submit button, not input fields
- **Optimistic updates for critical actions:** Wait for server confirmation for task completion
- **Retrying on all errors:** Only retry transient errors (timeout, 5xx), not auth errors (401) or validation (4xx)
- **Showing retry attempts to users:** Keep retries silent; user only sees loading indicator
- **Using setTimeout for retry without AbortController:** Must support cancellation

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Spinner animation | Custom CSS keyframes | Lucide Loader2 + `animate-spin` | Consistent with codebase, accessible |
| Skeleton styling | Custom pulse animation | shadcn/ui Skeleton | Uses `animate-pulse`, theme-aware |
| Modal blocking | Custom backdrop handling | AlertDialog + event prevention | Handles focus trap, accessibility |
| Auth state detection | Polling getSession() | onAuthStateChange listener | Supabase recommends; fires on TOKEN_REFRESHED and SIGNED_OUT |
| Toast with action | Custom component | sonner toast with action button | Already integrated, consistent styling |

**Key insight:** The codebase already has all UI primitives needed. The work is composing them correctly and adding the retry logic wrapper.

## Common Pitfalls

### Pitfall 1: Missing Token Refresh Detection
**What goes wrong:** App doesn't detect when Supabase's automatic token refresh fails
**Why it happens:** Relying only on API error responses instead of auth state events
**How to avoid:** Listen to `onAuthStateChange` for `SIGNED_OUT` event which fires when refresh fails
**Warning signs:** Users report random logouts, 401 errors without modal appearing

### Pitfall 2: Infinite Retry Loops
**What goes wrong:** Retries continue forever on permanent errors
**Why it happens:** Not distinguishing transient errors from permanent ones
**How to avoid:** Only retry on timeout/5xx; stop immediately on 401/403/4xx
**Warning signs:** Users see loading spinner indefinitely

### Pitfall 3: Race Conditions with Session State
**What goes wrong:** Multiple components trigger re-login simultaneously
**Why it happens:** No centralized session expiry state
**How to avoid:** Use React context to track `sessionExpired` state; modal managed by one component
**Warning signs:** Multiple modals appearing, navigation issues after re-login

### Pitfall 4: Abort Controller Memory Leaks
**What goes wrong:** Ongoing retries continue after user cancels or navigates away
**Why it happens:** Not properly aborting pending operations on unmount
**How to avoid:** Create AbortController in useEffect, abort on cleanup
**Warning signs:** Console errors after navigation, state updates on unmounted components

### Pitfall 5: Loading State Flash
**What goes wrong:** Brief loading flash for fast responses
**Why it happens:** Loading state shown immediately, removed too quickly
**How to avoid:** For very fast operations, consider not showing loading; for data fetch, use skeleton that renders immediately
**Warning signs:** UI flickers, jarring experience on fast connections

## Code Examples

Verified patterns from official sources and existing codebase:

### Supabase Auth State Listener
```typescript
// Source: https://supabase.com/docs/reference/javascript/auth-onauthstatechange
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (event === 'SIGNED_OUT') {
        // Session expired or user signed out
        // Check if this was unexpected (not explicit signout)
        setSessionExpired(true);
      } else if (event === 'TOKEN_REFRESHED') {
        // Silent refresh succeeded
        setSessionExpired(false);
      }
    }
  );
  return () => subscription.unsubscribe();
}, []);
```

### Button Loading Pattern (Existing in Codebase)
```typescript
// Source: src/components/auth/CoachAuth.tsx lines 190-193
<Button type="submit" className="w-full" disabled={isLoading}>
  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
  {isLogin ? "Sign In" : "Create Account"}
</Button>
```

### AI Assistant Retry with Backoff
```typescript
// Source: Adapted from exponential-backoff best practices
const callAIAssistantWithRetry = useCallback(async <T>(
  body: Record<string, any>,
  signal?: AbortSignal
): Promise<AIResponse<T>> => {
  const maxRetries = 3;
  const delays = [1000, 2000, 4000]; // 1s, 2s, 4s

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (signal?.aborted) {
      return { success: false, error: 'Request cancelled' };
    }

    try {
      const result = await callAIAssistant<T>(body);
      if (result.success) return result;

      // Check if error is retryable (timeout, 5xx)
      const isRetryable = result.error?.includes('timeout') ||
                          result.error?.includes('timed out') ||
                          result.error?.includes('service error');

      if (!isRetryable) return result; // Don't retry auth or validation errors

      lastError = new Error(result.error);
    } catch (error) {
      lastError = error as Error;
    }

    // Wait before next attempt (unless last attempt)
    if (attempt < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, delays[attempt]));
    }
  }

  // All retries failed - return timeout-specific message
  return {
    success: false,
    error: "Request timed out. Try asking for less information at once."
  };
}, [callAIAssistant]);
```

### Non-Dismissible Alert Dialog
```typescript
// Source: Radix UI documentation + shadcn/ui AlertDialog
import { AlertDialog, AlertDialogContent, AlertDialogHeader,
         AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
         AlertDialogAction } from "@/components/ui/alert-dialog";

function SessionExpiredModal({ open, onReLogin }: {
  open: boolean;
  onReLogin: () => void;
}) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Session Expired</AlertDialogTitle>
          <AlertDialogDescription>
            Your session has expired. Please sign in again to continue where you left off.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onReLogin}>
            Sign In Again
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### Skeleton Card Pattern
```typescript
// Source: shadcn/ui Skeleton + existing Card usage in codebase
function DashboardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="bg-card shadow-card border-0 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-12 mb-2" />
            <Skeleton className="h-3 w-28" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling getSession() | onAuthStateChange listener | Supabase v2 | More efficient, event-driven |
| CSS spinner | Tailwind animate-spin + Lucide | Established | Consistent animation timing |
| Custom modal for blocking | Radix AlertDialog | Radix v1+ | Built-in focus trap, a11y |
| Immediate loading display | Skeleton placeholders | UX best practice | Perceived performance improvement |

**Deprecated/outdated:**
- Manual token refresh timing: Supabase handles automatically via `autoRefreshToken: true`
- Separate auth-js package: Archived Oct 2025, now part of supabase-js

## Open Questions

Things that couldn't be fully resolved:

1. **Silent refresh failure edge cases**
   - What we know: Supabase fires SIGNED_OUT when refresh fails; autoRefreshToken handles most cases
   - What's unclear: Exact timing of when SIGNED_OUT fires vs when API calls start failing
   - Recommendation: Listen to SIGNED_OUT for modal; also catch 401 errors as fallback

2. **AbortController support in Supabase functions.invoke**
   - What we know: functions.invoke doesn't directly accept AbortSignal
   - What's unclear: Whether abort propagates through the underlying fetch
   - Recommendation: Implement timeout via Promise.race with abort check; test in implementation

## Sources

### Primary (HIGH confidence)
- [Supabase Auth Sessions Documentation](https://supabase.com/docs/guides/auth/sessions) - Session management, token refresh
- [Supabase onAuthStateChange Reference](https://supabase.com/docs/reference/javascript/auth-onauthstatechange) - Auth events (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED)
- [Supabase refreshSession Reference](https://supabase.com/docs/reference/javascript/auth-refreshsession) - Manual refresh API
- [Radix UI AlertDialog](https://www.radix-ui.com/primitives/docs/components/alert-dialog) - onEscapeKeyDown, onPointerDownOutside props
- Existing codebase patterns: `src/components/auth/CoachAuth.tsx`, `src/components/ai/AIPlanBuilder.tsx`

### Secondary (MEDIUM confidence)
- [shadcn/ui AlertDialog](https://ui.shadcn.com/docs/components/alert-dialog) - Component structure, shadcn wrapper
- [exponential-backoff GitHub](https://github.com/coveooss/exponential-backoff) - Best practices for backoff options
- [React Loading Button Patterns](https://www.shadcn.io/patterns/spinner-button-1) - Button loading state patterns

### Tertiary (LOW confidence)
- Web search results for retry patterns - General guidance, verified against official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in package.json, patterns verified in codebase
- Architecture: HIGH - Patterns match existing codebase structure and shadcn/ui conventions
- Pitfalls: MEDIUM - Based on Supabase docs and general React patterns; some edge cases unclear
- JWT handling: HIGH - Supabase documentation explicit about auth events

**Research date:** 2026-01-25
**Valid until:** 60 days (stable patterns, all dependencies already locked)
