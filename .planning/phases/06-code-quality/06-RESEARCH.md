# Phase 6: Code Quality - Research

**Researched:** 2026-01-25
**Domain:** React memory leak prevention, structured logging patterns
**Confidence:** HIGH

## Summary

Phase 6 focuses on two distinct code quality improvements: (1) fixing memory leaks from setTimeout calls without cleanup, and (2) replacing console.error calls with structured logging via the existing handleError utility.

The codebase has **4 files with setTimeout memory leaks** that need useEffect cleanup patterns added. Additionally, there are **66 console.error calls** across 30 files that should migrate to the structured handleError utility established in Phase 1.

**Primary recommendation:** Add useEffect cleanup for all setTimeout calls, then systematically replace console.error with handleError using appropriate context.

## Memory Leak Analysis

### Files with setTimeout Issues (4 files identified)

| File | Line | Current Pattern | Issue |
|------|------|-----------------|-------|
| `src/components/ui/sketch.tsx` | 393 | `setTimeout(() => setAnimating(false), 300)` in event handler | No cleanup if unmount |
| `src/components/MagicScheduleButton.tsx` | 42-46 | `setTimeout(() => {...}, 800)` in event handler | No cleanup if unmount |
| `src/pages/student/StudentSchedule.tsx` | 215-221 | `setTimeout(() => {...}, 1000)` in handler | No cleanup if unmount |
| `src/pages/student/StickerBook.tsx` | 202 | `setTimeout(() => setShowPop(false), 300)` in handler | No cleanup if unmount |

### Other setTimeout Usage (Already Safe or Different Context)

| File | Line | Pattern | Status |
|------|------|---------|--------|
| `src/hooks/useAIAssistant.ts` | 110, 143, 160, 201 | Retry delays in async functions | SAFE - controlled async flow |
| `src/components/FloatingAI.tsx` | 140 | Retry delay in async function | SAFE - controlled async flow |
| `src/components/TaskBreakdown.tsx` | 68, 135 | Animation delays in async | SAFE - controlled async |
| `src/hooks/use-toast.ts` | 53, 60 | Toast timeout management | SAFE - has own cleanup |
| `src/pages/GroupDetail.tsx` | 338 | Copy button feedback | SAFE - very short duration |

### Detailed Analysis of Problematic Files

#### 1. sketch.tsx (SketchCheckbox component) - Line 393

```typescript
// CURRENT (problematic)
const handleClick = () => {
  if (onChange && !disabled) {
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);  // Memory leak potential
    onChange();
  }
};
```

**Risk:** If component unmounts during 300ms animation, `setAnimating(false)` is called on unmounted component.

**Fix Pattern:** Use useEffect with ref to track timeout.

#### 2. MagicScheduleButton.tsx - Lines 42-46

```typescript
// CURRENT (problematic)
const handleClick = () => {
  setIsAnimating(true);
  // ... create sparkles ...

  setTimeout(() => {
    setIsAnimating(false);
    setSparkles([]);
    onMagicPlan?.();
  }, 800);  // Memory leak potential
};
```

**Risk:** 800ms is long enough for user to navigate away before callback fires.

**Fix Pattern:** Store timeout ID in ref, clear on unmount via useEffect cleanup.

#### 3. StudentSchedule.tsx - Lines 215-221

```typescript
// CURRENT (problematic)
if (completed) {
  setFadingTasks(prev => new Set(prev).add(taskId));
  toast({...});

  setTimeout(() => {
    setFadingTasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(taskId);
      return newSet;
    });
  }, 1000);  // Memory leak potential
}
```

**Risk:** 1000ms fade-out animation has ample time for unmount. Multiple concurrent timeouts possible.

**Fix Pattern:** Track multiple timeout IDs in Map, clear all on unmount.

#### 4. StickerBook.tsx (StickerCard component) - Line 202

```typescript
// CURRENT (problematic)
const handleClick = () => {
  if (!isLocked) {
    setShowPop(true);
    setTimeout(() => setShowPop(false), 300);  // Memory leak potential
  }
  onClick?.();
};
```

**Risk:** Same pattern as sketch.tsx - state update on potentially unmounted component.

**Fix Pattern:** Use useEffect with ref to track timeout.

## Console.error Audit

### Total Count: 66 console.error calls across 30 files

### Breakdown by Category

#### Error Boundaries (2 calls - KEEP)
These should remain as they are part of the structured logging system:

| File | Line | Context |
|------|------|---------|
| `src/components/error/AppErrorBoundary.tsx` | 22, 25 | Internal logging with structured format |
| `src/components/error/RouteErrorBoundary.tsx` | 24, 27 | Internal logging with structured format |

#### handleError Utility (2 calls - KEEP)
These are the fallback logs inside the utility itself:

| File | Line | Context |
|------|------|---------|
| `src/lib/error.ts` | 120, 154 | Internal structured logging |

#### AI/Chat Retry Loops (3 calls - REVIEW)
These log during retry attempts - may want structured format:

| File | Line | Current Pattern |
|------|------|-----------------|
| `src/components/FloatingAI.tsx` | 127 | `console.error(\`AI Chat error (attempt ${attempt + 1}/${MAX_RETRIES}):\`, err)` |
| `src/hooks/useAIAssistant.ts` | 185 | `console.error(\`AI Assistant Error (attempt ${attempt + 1}/${MAX_RETRIES}):\`, err)` |

#### Standard Error Handling (59 calls - CONVERT)
These should migrate to handleError:

**Hooks (24 calls):**
- `useRecurringSchedules.ts`: 5 calls (lines 124, 174, 204, 231, 267)
- `useGroups.ts`: 3 calls (lines 63, 110, 258)
- `useProfile.ts`: 2 calls (lines 62, 96)
- `useTemplates.ts`: 4 calls (lines 87, 151, 228, 254)
- `useAssignments.ts`: 4 calls (lines 141, 333, 385, 489)
- `useStickers.ts`: 1 call (line 130)

**Pages (26 calls):**
- `GroupDetail.tsx`: 1 call (line 245)
- `CoachCalendar.tsx`: 4 calls (lines 232, 695, 747, 1356, 1380)
- `Assistant.tsx`: 3 calls (lines 96, 187, 239)
- `StudentSchedule.tsx`: 1 call (line 166)
- `StudentCalendar.tsx`: 1 call (line 75)
- `StudentSettings.tsx`: 3 calls (lines 70, 115, 127)
- `StudentHome.tsx`: 2 calls (lines 126, 253)
- `AssignerDashboard.tsx`: 1 call (line 159)
- `Tasks.tsx`: 6 calls (lines 177, 202, 252, 311, 317, 323, 340, 442)
- `People.tsx`: 3 calls (lines 135, 202, 236)
- `CoachDashboard.tsx`: 2 calls (lines 108, 158)
- `NotFound.tsx`: 1 call (line 8)
- `AssigneeDashboard.tsx`: 1 call (line 183)

**Components (9 calls):**
- `CheckInModal.tsx`: 2 calls (lines 73, 95)
- `QRScanner.tsx`: 1 call (line 25)
- `StudentAuth.tsx`: 1 call (line 43)
- `StudentDetailSheet.tsx`: 2 calls (lines 97, 135)

## Existing handleError Utility

### Current Capabilities (from src/lib/error.ts)

```typescript
interface ErrorContext {
  component?: string;   // Component name where error occurred
  action?: string;      // User action that triggered error
  userId?: string;      // Current user ID if available
  retry?: () => void | Promise<void>;  // Optional retry function
  silent?: boolean;     // Log only, no toast
}
```

**Features:**
- User-friendly message mapping (network, timeout, auth, validation errors)
- Structured log entries with timestamp, stack, route, environment
- Toast integration with optional retry button
- Silent mode for background operations

### Usage Pattern for Migration

```typescript
// BEFORE
try {
  await fetchData();
} catch (error) {
  console.error("Error fetching data:", error);
  toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
}

// AFTER
try {
  await fetchData();
} catch (error) {
  handleError(error, { component: 'ComponentName', action: 'fetch' });
}
```

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | Component framework | Already installed |
| Sonner | 1.x | Toast notifications | Already integrated with handleError |

### No Additional Dependencies Needed

This phase uses React patterns only - no new libraries required.

## Architecture Patterns

### Pattern 1: useEffect Cleanup for Event Handler Timeouts

**What:** Store timeout IDs in refs, clear them on unmount
**When to use:** When setTimeout is called in event handlers (onClick, etc.)

```typescript
// Source: React documentation best practices
import { useRef, useEffect } from 'react';

function ComponentWithTimeout() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleClick = () => {
    setAnimating(true);
    // Clear any pending timeout before setting new one
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setAnimating(false);
    }, 300);
  };
}
```

### Pattern 2: Multiple Timeout Tracking with Map

**What:** Track multiple concurrent timeouts using a Map
**When to use:** When multiple items can have active timeouts (like fade-out animations per task)

```typescript
// Source: React patterns for concurrent animations
function ComponentWithMultipleTimeouts() {
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    return () => {
      // Clear all pending timeouts on unmount
      timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      timeoutsRef.current.clear();
    };
  }, []);

  const handleItemAction = (itemId: string) => {
    // Clear existing timeout for this item
    const existing = timeoutsRef.current.get(itemId);
    if (existing) clearTimeout(existing);

    const timeout = setTimeout(() => {
      // ... update state ...
      timeoutsRef.current.delete(itemId);
    }, 1000);

    timeoutsRef.current.set(itemId, timeout);
  };
}
```

### Pattern 3: handleError with Context

**What:** Replace console.error with structured handleError calls
**When to use:** All catch blocks that need user feedback

```typescript
// Component example
const fetchData = async () => {
  try {
    const data = await supabase.from('table').select();
    if (data.error) throw data.error;
  } catch (error) {
    handleError(error, {
      component: 'ComponentName',
      action: 'fetch',
      userId: user?.id  // Include when available
    });
  }
};

// Hook example (silent mode for non-UI operations)
const internalOperation = async () => {
  try {
    await operation();
  } catch (error) {
    handleError(error, {
      component: 'useHookName',
      action: 'internal',
      silent: true  // No toast, just log
    });
  }
};
```

### Anti-Patterns to Avoid

- **Double error handling:** Don't call both console.error AND handleError (handleError logs internally)
- **Missing context:** Always include component and action for debugging
- **Untracked timeouts:** Never use setTimeout in event handlers without ref tracking
- **Cleanup race conditions:** Always check if timeout ref exists before clearing

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Error logging | Custom console.error wrapper | handleError from src/lib/error.ts | Already has structured logging, user-friendly messages |
| Toast with retry | Custom retry logic | handleError with retry option | Built-in retry button support |
| Timeout cleanup | Ad-hoc cleanup logic | useRef + useEffect pattern | React standard pattern |

## Common Pitfalls

### Pitfall 1: Forgetting to Clear Previous Timeout

**What goes wrong:** Multiple rapid clicks create multiple pending timeouts, causing erratic behavior
**Why it happens:** Each click creates a new timeout without canceling the previous one
**How to avoid:** Always clear existing timeout before setting new one
**Warning signs:** Animation state toggles unexpectedly, state updates after unmount warnings

### Pitfall 2: Using useState for Timeout ID

**What goes wrong:** Using useState to store timeout ID causes re-render on every timeout
**Why it happens:** State updates trigger re-renders even for non-visual data
**How to avoid:** Use useRef for timeout IDs - refs don't cause re-renders
**Warning signs:** Unnecessary re-renders, performance issues with frequent timeouts

### Pitfall 3: Missing Context in handleError

**What goes wrong:** Errors logged without component/action context are hard to debug
**Why it happens:** Developers forget to add context when converting from console.error
**How to avoid:** Always include at minimum: component and action
**Warning signs:** Error logs that say "Something went wrong" with no traceable origin

### Pitfall 4: Double Toast on Error

**What goes wrong:** Both handleError toast AND manual toast.error show simultaneously
**Why it happens:** Forgetting that handleError already shows a toast
**How to avoid:** Remove manual toast calls when using handleError (unless silent mode)
**Warning signs:** Two toasts appearing for single error

## Code Examples

### Example 1: SketchCheckbox Fix (sketch.tsx)

```typescript
// Source: React useRef pattern
import { useRef, useEffect } from 'react';

export const SketchCheckbox = ({ checked, onChange, postponed, disabled, className }: SketchCheckboxProps) => {
  const [animating, setAnimating] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleClick = () => {
    if (onChange && !disabled) {
      setAnimating(true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => setAnimating(false), 300);
      onChange();
    }
  };

  // ... rest unchanged
};
```

### Example 2: StudentSchedule Fix (multiple timeouts)

```typescript
// Source: Map-based timeout tracking pattern
const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

useEffect(() => {
  return () => {
    timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    timeoutsRef.current.clear();
  };
}, []);

const handleToggleComplete = async (taskId: string, completed: boolean) => {
  // ... existing logic ...

  if (completed) {
    setFadingTasks(prev => new Set(prev).add(taskId));
    toast({...});

    // Clear any existing timeout for this task
    const existing = timeoutsRef.current.get(taskId);
    if (existing) clearTimeout(existing);

    const timeout = setTimeout(() => {
      setFadingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
      timeoutsRef.current.delete(taskId);
    }, 1000);

    timeoutsRef.current.set(taskId, timeout);
  }
};
```

### Example 3: console.error to handleError Migration

```typescript
// BEFORE (StudentSchedule.tsx line 166)
} catch (error) {
  console.error("Error fetching schedule:", error);
  toast({
    title: "Error",
    description: "Failed to load your schedule.",
    variant: "destructive",
  });
}

// AFTER
import { handleError } from "@/lib/error";

} catch (error) {
  handleError(error, {
    component: "StudentSchedule",
    action: "fetch schedule",
    userId: user?.id
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| console.error for logging | Structured logging utilities | React 18 era | Better debugging, monitoring |
| No cleanup in event handlers | useRef + useEffect cleanup | Always recommended | Prevents memory leaks |
| Manual toast after error | Centralized handleError | Phase 1 (01-02) | Consistent UX |

## Open Questions

1. **AI retry loop logging**
   - What we know: AI retry loops have specialized logging format showing attempt counts
   - What's unclear: Should these use handleError with silent mode, or keep specialized format?
   - Recommendation: Keep current format in FloatingAI.tsx and useAIAssistant.ts as they show retry progress

2. **NotFound.tsx logging**
   - What we know: Line 8 logs 404 navigation attempts
   - What's unclear: Is this intentional tracking or should it use handleError?
   - Recommendation: Convert to handleError with silent mode for consistency

## Sources

### Primary (HIGH confidence)
- Codebase analysis: Direct file reading and grep patterns
- src/lib/error.ts: handleError implementation review
- React documentation: useRef and useEffect cleanup patterns

### Secondary (MEDIUM confidence)
- React best practices for timeout cleanup in event handlers

## Metadata

**Confidence breakdown:**
- setTimeout locations: HIGH - Direct codebase grep and file reading
- console.error count: HIGH - Exhaustive grep search
- handleError capabilities: HIGH - Direct source code review
- Fix patterns: HIGH - Standard React patterns

**Research date:** 2026-01-25
**Valid until:** 2026-02-25 (stable patterns, codebase-specific)

## Implementation Summary

### Plan 1: Memory Leak Fixes (QUAL-01 to QUAL-04)
- 4 files need setTimeout cleanup
- Use useRef + useEffect cleanup pattern
- sketch.tsx, MagicScheduleButton.tsx, StudentSchedule.tsx, StickerBook.tsx

### Plan 2: Structured Logging Migration (QUAL-05)
- 59 console.error calls to convert (excluding error boundaries and internal logging)
- Replace with handleError calls including component and action context
- Remove redundant toast.error calls (handleError provides toast)
