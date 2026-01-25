# Phase 1: Error Foundation - Research

**Researched:** 2026-01-24
**Domain:** React Error Handling, Toast Notifications, Structured Logging
**Confidence:** HIGH

## Summary

This phase establishes error handling infrastructure for a React 18 + Vite + TypeScript application using react-router-dom v6.30.1. The project already has Sonner v1.7.4 installed and configured with shadcn/ui styling, which is the optimal choice for toast notifications.

The standard approach for React error boundaries in 2025-2026 is to use the `react-error-boundary` library (v5.x) rather than writing class components manually. This library provides hooks for functional components, reset mechanisms, and integrates cleanly with the existing stack.

The project currently has inconsistent error handling - some hooks use try/catch with toast notifications, others only console.error. This phase will standardize the approach with a unified error handling utility.

**Primary recommendation:** Install `react-error-boundary`, configure Sonner with the specified toast behavior (5s duration, 3 visible, close button), and create a centralized `handleError` utility that combines toast + structured logging + optional retry.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-error-boundary | ^5.0.0 | Error boundary components | De facto standard for React error boundaries; provides hooks, reset functionality, TypeScript types; 8M+ weekly downloads |
| sonner | 1.7.4 (installed) | Toast notifications | Already installed; shadcn/ui default; simpler API than Radix toast; supports action buttons |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-toast | 1.2.14 (installed) | Alternative toast | Already present; can be removed or kept as backup |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-error-boundary | Manual class component | Manual approach requires more boilerplate, no hooks support, no built-in reset |
| sonner | react-hot-toast | Both good; sonner already installed and has shadcn integration |
| sonner | Radix toast | Radix requires more setup; sonner simpler for action buttons |

**Installation:**
```bash
npm install react-error-boundary
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── error/                    # NEW: Error handling components
│   │   ├── ErrorBoundary.tsx     # Configured ErrorBoundary with fallback
│   │   ├── ErrorFallback.tsx     # Fallback UI component
│   │   └── RouteErrorBoundary.tsx # Route-level boundary
│   └── ui/
│       └── sonner.tsx            # UPDATE: Configure toast options
├── lib/
│   ├── utils.ts                  # Existing utilities
│   └── error.ts                  # NEW: Error handling utility
└── App.tsx                       # UPDATE: Wrap with ErrorBoundary
```

### Pattern 1: Error Boundary Placement Strategy
**What:** Multi-level error boundaries for granular error containment
**When to use:** Always - prevents single component crash from breaking entire app

**Placement hierarchy:**
1. **App Root** - Catches catastrophic errors, shows full-page recovery UI
2. **Route/Layout Level** - Catches page-level errors, keeps navigation working
3. **Critical Widgets** (optional) - Isolates high-risk components like data fetchers

```typescript
// Source: react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
// App.tsx structure
<ErrorBoundary FallbackComponent={AppErrorFallback}>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/dashboard" element={
            <ErrorBoundary FallbackComponent={RouteErrorFallback}>
              <DashboardLayout />
            </ErrorBoundary>
          }>
            {/* child routes */}
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
</ErrorBoundary>
```

### Pattern 2: Sonner Toast Configuration
**What:** Consistent toast configuration matching user decisions
**When to use:** Global Toaster setup in App.tsx

```typescript
// Source: sonner.emilkowal.ski/
<Sonner
  position="bottom-right"           // Claude's discretion
  duration={5000}                   // User decision: 5 seconds
  visibleToasts={3}                 // User decision: max 3 visible
  closeButton={true}                // User decision: X button for dismiss
  richColors={true}                 // Distinct colors for error/success
  toastOptions={{
    classNames: {
      toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
      error: "group-[.toaster]:bg-destructive group-[.toaster]:text-destructive-foreground",
      success: "group-[.toaster]:bg-success group-[.toaster]:text-success-foreground",
    },
  }}
/>
```

### Pattern 3: Centralized Error Handler
**What:** Single utility for consistent error handling across the app
**When to use:** All catch blocks, error callbacks, API failures

```typescript
// Source: Best practices from dev.to/ghalex/best-practices-react-logging-and-error-handling-23hd
interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  retry?: () => void | Promise<void>;
  silent?: boolean;  // Log only, no toast
}

interface ErrorLog {
  timestamp: string;
  message: string;
  stack?: string;
  context: ErrorContext;
  url: string;
  userAgent: string;
}

function handleError(error: unknown, context: ErrorContext = {}): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  // 1. Structure and log
  const log: ErrorLog = {
    timestamp: new Date().toISOString(),
    message: errorMessage,
    stack: errorStack,
    context,
    url: window.location.href,
    userAgent: navigator.userAgent,
  };
  console.error('[App Error]', log);

  // 2. Show toast (unless silent)
  if (!context.silent) {
    const toastOptions: any = {
      duration: 5000,
      closeButton: true,
    };

    if (context.retry) {
      toastOptions.action = {
        label: 'Retry',
        onClick: context.retry,
      };
    }

    toast.error(getUserFriendlyMessage(errorMessage), toastOptions);
  }
}
```

### Pattern 4: FallbackComponent Interface
**What:** Standard props for error fallback components
**When to use:** All ErrorBoundary fallback components

```typescript
// Source: github.com/bvaughn/react-error-boundary
import { FallbackProps } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center p-8 text-center">
      <h2 className="text-display-sm text-foreground mb-2">Something went wrong</h2>
      <p className="text-body-md text-muted-foreground mb-4">
        We encountered an unexpected error. Please try again.
      </p>
      <Button onClick={resetErrorBoundary}>
        Try Again
      </Button>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Catching and swallowing:** Never `catch (e) {}` - always log and notify
- **Technical messages to users:** Never show stack traces or error codes in UI
- **Global try/catch only:** Use Error Boundaries for render errors, try/catch for async
- **Inconsistent error handling:** Don't mix different toast libraries or patterns
- **Retrying without backoff:** Implement exponential backoff for auto-retry

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Error boundary component | Class component with getDerivedStateFromError | `react-error-boundary` ErrorBoundary | Provides hooks, reset, TypeScript types |
| Toast stacking/queue | Custom toast state management | Sonner built-in | Handles dismissal, stacking, animations |
| Error boundary reset | Manual state clearing | `resetErrorBoundary` + `resetKeys` prop | Built-in, handles edge cases |
| User-friendly messages | Regex on error.message | Simple mapping function | Easier to maintain, predictable |

**Key insight:** Error handling has many edge cases (concurrent errors, unmounting during error, stale closures). Libraries handle these; custom solutions often miss them.

## Common Pitfalls

### Pitfall 1: Error Boundaries Don't Catch Everything
**What goes wrong:** Developers wrap app in ErrorBoundary and assume all errors are caught
**Why it happens:** Error boundaries only catch errors during render, lifecycle methods, and constructors
**How to avoid:** Use try/catch for event handlers, async code, and setTimeout callbacks
**Warning signs:** Uncaught errors in console despite ErrorBoundary present

```typescript
// NOT caught by ErrorBoundary - needs try/catch
const handleClick = async () => {
  try {
    await api.deleteItem(id);
  } catch (error) {
    handleError(error, { component: 'ItemList', action: 'delete' });
  }
};
```

### Pitfall 2: Duplicate Toast Systems
**What goes wrong:** Both Radix Toast and Sonner render, causing visual conflicts
**Why it happens:** Project has both installed; shadcn adds both by default
**How to avoid:** Remove unused Toaster from App.tsx; standardize on Sonner
**Warning signs:** Toasts appearing in multiple positions; inconsistent styling

**Current state:** App.tsx has BOTH `<Toaster />` (Radix) and `<Sonner />`. Choose one.

### Pitfall 3: Memory Leaks from Error Boundary
**What goes wrong:** ErrorBoundary holds reference to error, preventing garbage collection
**Why it happens:** Error state persists after user navigates away
**How to avoid:** Use `resetKeys` prop with route location to auto-reset on navigation
**Warning signs:** Growing memory usage after multiple errors

```typescript
import { useLocation } from 'react-router-dom';

function App() {
  const location = useLocation();
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      resetKeys={[location.pathname]}  // Reset on route change
    >
      {/* ... */}
    </ErrorBoundary>
  );
}
```

### Pitfall 4: onError Callback Exceptions
**What goes wrong:** Exception in onError callback causes error boundary to fail
**Why it happens:** Logging service call throws, or accessing undefined error properties
**How to avoid:** Wrap onError logic in try/catch; use optional chaining
**Warning signs:** "Maximum update depth exceeded" or blank screen

```typescript
<ErrorBoundary
  onError={(error, info) => {
    try {
      // Safe logging - never throw here
      console.error('[ErrorBoundary]', {
        message: error?.message ?? 'Unknown error',
        stack: error?.stack,
        componentStack: info?.componentStack,
      });
    } catch {
      // Silently fail logging rather than crash
    }
  }}
>
```

### Pitfall 5: Toast Action Button Closure Issues
**What goes wrong:** Retry button uses stale state values
**Why it happens:** Closure captures values at toast creation time
**How to avoid:** Pass function that reads current state, or use refs
**Warning signs:** Retry button doesn't use latest data

```typescript
// BAD: Stale closure
const retry = () => {
  toast.error('Failed', {
    action: { label: 'Retry', onClick: () => fetchData(currentPage) }  // currentPage is stale
  });
};

// GOOD: Fresh reference
const retryRef = useRef(() => {});
retryRef.current = () => fetchData(currentPage);

const handleError = () => {
  toast.error('Failed', {
    action: { label: 'Retry', onClick: () => retryRef.current() }
  });
};
```

## Code Examples

Verified patterns from official sources:

### ErrorBoundary with Reset Keys
```typescript
// Source: github.com/bvaughn/react-error-boundary
import { ErrorBoundary } from 'react-error-boundary';
import { useLocation } from 'react-router-dom';

function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, info) => {
        console.error('[AppError]', {
          timestamp: new Date().toISOString(),
          message: error.message,
          stack: error.stack,
          componentStack: info.componentStack,
          url: window.location.href,
        });
      }}
      onReset={() => {
        // Optional: Clear any error-related state
      }}
      resetKeys={[location.pathname]}
    >
      {children}
    </ErrorBoundary>
  );
}
```

### useErrorBoundary Hook for Async Errors
```typescript
// Source: github.com/bvaughn/react-error-boundary
import { useErrorBoundary } from 'react-error-boundary';

function DataFetcher() {
  const { showBoundary } = useErrorBoundary();

  const fetchData = async () => {
    try {
      const response = await api.getData();
      setData(response);
    } catch (error) {
      // This will be caught by the nearest ErrorBoundary
      showBoundary(error);
    }
  };

  return <button onClick={fetchData}>Load Data</button>;
}
```

### Sonner Error Toast with Retry Action
```typescript
// Source: sonner.emilkowal.ski/toast
import { toast } from 'sonner';

function showErrorWithRetry(message: string, retryFn: () => void) {
  toast.error(message, {
    duration: 5000,
    closeButton: true,
    action: {
      label: 'Retry',
      onClick: retryFn,
    },
  });
}

// Usage
try {
  await saveData();
} catch (error) {
  showErrorWithRetry('Failed to save changes', () => saveData());
}
```

### Structured Error Logging Utility
```typescript
// Source: Best practices from blog.openreplay.com/best-practices-error-logging-javascript/
type ErrorSeverity = 'error' | 'warning' | 'info';

interface ErrorLogEntry {
  severity: ErrorSeverity;
  timestamp: string;
  message: string;
  stack?: string;
  context: {
    component?: string;
    action?: string;
    userId?: string;
    route?: string;
    [key: string]: unknown;
  };
  environment: {
    url: string;
    userAgent: string;
    viewport: { width: number; height: number };
  };
}

function logError(
  error: unknown,
  context: ErrorLogEntry['context'] = {},
  severity: ErrorSeverity = 'error'
): void {
  const entry: ErrorLogEntry = {
    severity,
    timestamp: new Date().toISOString(),
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context: {
      ...context,
      route: window.location.pathname,
    },
    environment: {
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    },
  };

  // Structured console output
  console.error('[Error Log]', JSON.stringify(entry, null, 2));

  // TODO: Send to monitoring service (Sentry, LogRocket, etc.)
  // Future phase can add: sendToMonitoringService(entry);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Class-based Error Boundary | `react-error-boundary` library | 2020+ | No need to write class components |
| `componentDidCatch` only | `getDerivedStateFromError` + hooks | React 16.6+ | Better separation of concerns |
| `useErrorHandler` hook | `useErrorBoundary` hook | react-error-boundary v4 | Renamed for clarity |
| Multiple toast libraries | Single toast solution (Sonner) | 2023+ | shadcn/ui standardized on Sonner |
| Unstructured console.log | Structured JSON logging | 2024+ | Better debugging, monitoring integration |

**Deprecated/outdated:**
- `useErrorHandler`: Renamed to `useErrorBoundary` in react-error-boundary v4+
- Manual class ErrorBoundary: Still works but unnecessary boilerplate
- Radix Toast with shadcn: Sonner is now the default in shadcn/ui

## Open Questions

Things that couldn't be fully resolved:

1. **Remove Radix Toast or keep both?**
   - What we know: App currently imports both Toaster (Radix) and Sonner
   - What's unclear: Whether any existing code uses Radix toast
   - Recommendation: Audit existing toast usage, migrate to Sonner, remove Radix

2. **External error monitoring service?**
   - What we know: Structured logging to console is implemented
   - What's unclear: Whether Sentry/LogRocket/similar should be added
   - Recommendation: Defer to future phase; console logging sufficient for MVP

3. **React Query error handling integration?**
   - What we know: Project uses TanStack Query; it has onError options
   - What's unclear: Whether to integrate Query errors with this system
   - Recommendation: Yes, but scope is for next phase (Query has its own patterns)

## Sources

### Primary (HIGH confidence)
- [react-error-boundary GitHub](https://github.com/bvaughn/react-error-boundary) - API documentation, FallbackProps, useErrorBoundary
- [Sonner Official Docs](https://sonner.emilkowal.ski/) - Toast configuration, action buttons, duration
- [shadcn/ui Sonner](https://ui.shadcn.com/docs/components/sonner) - Integration pattern
- [React.dev Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary) - Official React guidance

### Secondary (MEDIUM confidence)
- [React Router Error Boundary Guide](https://reactrouter.com/how-to/error-boundary) - Route-level error handling with React Router v7 (v6 similar)
- [LogRocket React Error Handling](https://blog.logrocket.com/react-error-handling-react-error-boundary/) - Patterns and anti-patterns
- [TatvaSoft Error Boundary Guide](https://www.tatvasoft.com/outsourcing/2025/02/react-error-boundary.html) - 2025 best practices

### Tertiary (LOW confidence)
- [Dev.to React Logging](https://dev.to/ghalex/best-practices-react-logging-and-error-handling-23hd) - Structured logging patterns (community source)
- [OpenReplay Error Logging](https://blog.openreplay.com/best-practices-error-logging-javascript/) - Error context fields (community source)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - react-error-boundary and Sonner are well-documented, widely used
- Architecture: HIGH - Patterns verified against official docs and established practices
- Pitfalls: MEDIUM - Based on community experience and official documentation
- Code examples: HIGH - Adapted from official documentation

**Research date:** 2026-01-24
**Valid until:** 2026-02-24 (30 days - stable domain)

---

## Implementation Notes for Planner

### Key Constraints from CONTEXT.md
- Toast duration: 5 seconds (user decision)
- Toast stacking: Max 3 visible (user decision)
- Toast dismiss: X button required (user decision)
- Recovery: Retry/Refresh button (user decision)
- Auto retry: Opt-in per call (user decision)
- Error details: Hidden from users, console only (user decision)

### Claude's Discretion Areas
- Toast positioning: Recommend `bottom-right` (common convention, doesn't obstruct content)
- Logging structure: Recommend fields documented above (timestamp, message, stack, context, environment)
- Error boundary granularity: Recommend app root + each layout component (DashboardLayout, StudentLayout)
- Fallback UI styling: Use existing Card component, Button component, match app theme

### Files to Create
1. `src/components/error/ErrorFallback.tsx` - Reusable fallback UI
2. `src/components/error/AppErrorBoundary.tsx` - Configured root boundary
3. `src/lib/error.ts` - handleError utility, logError function, getUserFriendlyMessage

### Files to Modify
1. `src/App.tsx` - Wrap with ErrorBoundary, remove Radix Toaster, configure Sonner
2. `src/components/ui/sonner.tsx` - Add configuration props (duration, visibleToasts, closeButton, richColors)

### Existing Code to Audit/Migrate
- `src/hooks/useGroups.ts` - Uses useToast (Radix) - migrate to Sonner
- `src/hooks/useProfile.ts` - Uses useToast (Radix) - migrate to Sonner
- ~50 files with error/catch patterns - will need gradual migration to handleError utility
