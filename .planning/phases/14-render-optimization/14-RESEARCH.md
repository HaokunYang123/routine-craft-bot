# Phase 14: Render Optimization - Research

**Researched:** 2026-01-27
**Domain:** React performance optimization (skeletons, loading states, memoization, profiling)
**Confidence:** HIGH

## Summary

This phase focuses on improving perceived and actual render performance through skeleton loading states, button loading indicators during mutations, React DevTools profiling, and selective memoization of the CoachCalendar component.

The project already has foundational infrastructure in place:
- Skeleton component with `animate-pulse` animation (Tailwind)
- `DashboardSkeleton` and `TaskListSkeleton` already implemented
- `LoadingButton` component with spinner via Lucide's `Loader2`
- React Query v5 with `isPending` for mutation states
- Some `useMemo` usage in `OverviewWidgets.tsx`

**Primary recommendation:** Use existing infrastructure. Add shimmer animation to Skeleton component, create skeletons for remaining pages (People, Templates, Schedules, CoachCalendar), wire `LoadingButton` + `isPending` to all mutation buttons, profile with React DevTools to identify bottlenecks, and apply `React.memo` to CoachCalendar's sub-components.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.3.1 | Component framework | Industry standard |
| @tanstack/react-query | 5.83.0 | Data fetching with `isPending` | Mutation loading states built-in |
| Tailwind CSS | 3.4.17 | Utility-first styling | `animate-pulse` for skeletons |
| tailwindcss-animate | 1.0.7 | Extended animations | Shimmer keyframes |
| Lucide React | 0.462.0 | Icons | `Loader2` spinner |

### Supporting (No Installation Needed)

| Tool | Purpose | When to Use |
|------|---------|-------------|
| React DevTools Profiler | Performance analysis | Identify render bottlenecks |
| Chrome DevTools Performance | Browser-level profiling | Measure actual paint times |
| React 19 Performance Tracks | Timeline visualization | If upgrading to React 19.2+ |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom shimmer CSS | react-loading-skeleton library | Adds dependency; custom CSS is simpler for existing Skeleton component |
| Manual isPending | useMutationState | More complex; isPending is sufficient for per-button states |
| React Compiler | Manual memo | React Compiler v1.0 is production-ready but requires React 19 upgrade |

**Installation:** None required - all tools already installed.

## Architecture Patterns

### Recommended Project Structure

Already in place:
```
src/
├── components/
│   ├── skeletons/           # Page-level skeleton components
│   │   ├── DashboardSkeleton.tsx
│   │   ├── TaskListSkeleton.tsx
│   │   ├── PeopleSkeleton.tsx     # NEW
│   │   ├── TemplatesSkeleton.tsx  # NEW
│   │   └── CalendarSkeleton.tsx   # NEW
│   └── ui/
│       ├── skeleton.tsx     # Base Skeleton primitive (enhance with shimmer)
│       └── loading-button.tsx  # Already implemented
└── pages/
    └── CoachCalendar.tsx    # Apply React.memo to sub-components
```

### Pattern 1: Skeleton with Shimmer Animation

**What:** Replace `animate-pulse` with shimmer gradient animation for more polished loading feel.
**When to use:** All skeleton loading states.

```typescript
// tailwind.config.ts - add shimmer keyframes
keyframes: {
  shimmer: {
    '0%': { backgroundPosition: '-200% 0' },
    '100%': { backgroundPosition: '200% 0' },
  },
},
animation: {
  shimmer: 'shimmer 1.5s ease-in-out infinite',
},

// skeleton.tsx - update base component
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md bg-gradient-to-r from-muted via-muted/60 to-muted bg-[length:200%_100%] animate-shimmer",
        className
      )}
      {...props}
    />
  );
}
```

### Pattern 2: Content-Shaped Skeletons

**What:** Skeleton layouts that match actual content structure to prevent layout shift.
**When to use:** Every data-loading page.

```typescript
// Example: PeopleSkeleton.tsx
function GroupCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-5 w-32" />  {/* Group name */}
        <Skeleton className="h-4 w-4" />   {/* Chevron */}
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-24 mb-2" />  {/* Member count */}
        <div className="space-y-2">
          {/* Student rows */}
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Pattern 3: Mutation Loading States with isPending

**What:** Use React Query's `isPending` to show loading state on mutation buttons.
**When to use:** All buttons that trigger mutations (Create, Save, Delete, Update).

```typescript
// Source: TanStack Query v5 docs
// Hook exposes isPending from mutation
const { createGroupMutation } = useGroups();

// In component
<LoadingButton
  isLoading={createGroupMutation.isPending}
  onClick={() => createGroupMutation.mutate(formData)}
>
  Create Group
</LoadingButton>
```

### Pattern 4: React.memo for Expensive Sub-Components

**What:** Wrap pure components in `React.memo` to skip re-renders when props unchanged.
**When to use:** Components receiving stable props from frequently-updating parents.

```typescript
// Source: https://react.dev/reference/react/memo
// CoachCalendar sub-components
const DayCell = React.memo(function DayCell({
  date,
  tasks,
  onDateClick
}: DayCellProps) {
  // Only re-renders when date, tasks, or onDateClick changes
  return (/* ... */);
});

// Parent must use useCallback for handlers
const handleDateClick = useCallback((date: Date) => {
  setSelectedDate(date);
  setSheetOpen(true);
}, []);
```

### Pattern 5: useMemo for Expensive Computations

**What:** Cache derived data that's expensive to compute.
**When to use:** Filtering, sorting, grouping large arrays.

```typescript
// Already used in OverviewWidgets.tsx
const { needsAttention, onTrack, moderate } = useMemo(() => {
  const needsAttention = students.filter((s) => s.completionRate < 50);
  const onTrack = students.filter((s) => s.completionRate >= 80);
  const moderate = students.filter(
    (s) => s.completionRate >= 50 && s.completionRate < 80
  );
  return { needsAttention, onTrack, moderate };
}, [students]);
```

### Pattern 6: useCallback for Stable Handler References

**What:** Memoize callbacks to maintain referential equality.
**When to use:** Passing handlers to memoized child components.

```typescript
// CoachCalendar handlers
const navigatePeriod = useCallback((direction: number) => {
  if (viewMode === "month") {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  } else if (viewMode === "week") {
    setCurrentDate(direction > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
  } else {
    setCurrentDate(addDays(currentDate, direction));
  }
}, [viewMode, currentDate]);

const handleDateClick = useCallback((date: Date) => {
  setSelectedDate(date);
  setSheetOpen(true);
}, []);
```

### Anti-Patterns to Avoid

- **Over-memoization:** Don't wrap everything in `React.memo`; adds overhead when props change frequently. Profile first.
- **Object/function props without memoization:** `React.memo` is useless if parent creates new object/function references each render.
- **Deep equality comparisons:** Custom `arePropsEqual` with deep equality is expensive; restructure props instead.
- **Ignoring profiler data:** Don't guess at bottlenecks; use React DevTools Profiler to measure actual render times.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Shimmer animation | Manual CSS keyframes from scratch | Extend Tailwind config with `tailwindcss-animate` | Consistent animation timing, DRY |
| Loading button state | Custom useState for each button | `LoadingButton` + `isPending` from mutation | Already implemented, consistent UX |
| Skeleton components | Raw divs with bg-muted | `Skeleton` primitive component | Consistent styling, single source |
| Performance profiling | Console.log timers | React DevTools Profiler | Accurate measurements, flamegraphs |
| Component memoization | Manual shouldComponentUpdate | `React.memo` | Built-in, less error-prone |

**Key insight:** React and React Query already provide the primitives. Focus on correct usage patterns, not custom implementations.

## Common Pitfalls

### Pitfall 1: Premature Optimization

**What goes wrong:** Wrapping components in `React.memo` without measuring, adding complexity with no benefit.
**Why it happens:** Assumption that memoization always helps.
**How to avoid:** Profile first using React DevTools Profiler. Only memoize components where profiling shows expensive re-renders.
**Warning signs:** Adding `React.memo` to components that render < 1ms or receive new props every render.

### Pitfall 2: Breaking Referential Equality

**What goes wrong:** `React.memo` child still re-renders because parent creates new object/function each render.
**Why it happens:** Missing `useMemo`/`useCallback` in parent.

```typescript
// BAD - creates new object every render
<MemoizedChild options={{ darkMode: true, count }} />

// GOOD - memoized reference
const options = useMemo(() => ({ darkMode: true, count }), [count]);
<MemoizedChild options={options} />
```

**How to avoid:** Pass primitives when possible; memoize objects/arrays/functions.
**Warning signs:** Memoized component re-rendering despite "same" props.

### Pitfall 3: Wrong isPending Scope

**What goes wrong:** Using `isLoading` instead of `isPending` for mutations, or sharing isPending across multiple mutations.
**Why it happens:** Confusion between query and mutation loading states.

```typescript
// BAD - queries use isLoading, mutations use isPending
const { isLoading } = useMutation(...);  // isLoading was removed in v5

// GOOD - v5 uses isPending for mutations
const { isPending } = useMutation(...);
```

**How to avoid:** Each mutation has its own `isPending`; don't reuse across unrelated mutations.
**Warning signs:** Wrong button shows loading, or loading state doesn't clear.

### Pitfall 4: Missing Skeleton for Cached Data

**What goes wrong:** Showing skeleton even when data is already cached, causing flicker.
**Why it happens:** Using `isLoading` instead of `isPending` (initial load only).

```typescript
// React Query v5 terminology:
// isPending = fetching + no data yet (show skeleton)
// isFetching = any fetch in progress (show subtle indicator)
// isLoading = isPending (v4 name, still works)

// Show skeleton only for initial load
if (isPending) return <DashboardSkeleton />;

// For background refetches, show subtle indicator instead
{isFetching && !isPending && <Loader2 className="animate-spin" />}
```

**How to avoid:** Use `isPending` for skeletons, `isFetching` for subtle refresh indicators.
**Warning signs:** Skeleton flashes on page revisit when data is cached.

### Pitfall 5: Skeleton Layout Shift

**What goes wrong:** Page layout jumps when real content replaces skeleton.
**Why it happens:** Skeleton dimensions don't match real content.
**How to avoid:** Match skeleton dimensions to actual content (cards, text lines, avatars).
**Warning signs:** Visible content jumping during load transition.

### Pitfall 6: Not Measuring Baseline

**What goes wrong:** Can't prove optimization worked; may have made things worse.
**Why it happens:** No before/after measurements.
**How to avoid:** Document baseline render times from React DevTools Profiler before and after changes.
**Warning signs:** "Feels faster" without data to support it.

## Code Examples

Verified patterns from official sources and codebase:

### Shimmer Animation (Tailwind Extension)

```typescript
// tailwind.config.ts
// Source: LogRocket Blog - React Loading Skeleton best practices
keyframes: {
  shimmer: {
    '0%': { backgroundPosition: '-200% 0' },
    '100%': { backgroundPosition: '200% 0' },
  },
  // ... existing keyframes
},
animation: {
  shimmer: 'shimmer 1.5s ease-in-out infinite',
  // ... existing animations
},
```

### Enhanced Skeleton Component

```typescript
// src/components/ui/skeleton.tsx
// Source: Material UI Skeleton, adapted for Tailwind
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'shimmer' | 'pulse';
}

function Skeleton({ className, variant = 'shimmer', ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md",
        variant === 'shimmer'
          ? "bg-gradient-to-r from-muted via-muted/60 to-muted bg-[length:200%_100%] animate-shimmer"
          : "bg-muted animate-pulse",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
```

### LoadingButton with Extended Timeout Text

```typescript
// src/components/ui/loading-button.tsx
// User decision: After 2+ seconds, show "Still working..."
import { useState, useEffect } from "react";

export interface LoadingButtonProps extends ButtonProps {
  isLoading?: boolean;
}

const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ isLoading, disabled, children, className, ...props }, ref) => {
    const [showExtended, setShowExtended] = useState(false);

    useEffect(() => {
      if (!isLoading) {
        setShowExtended(false);
        return;
      }
      const timer = setTimeout(() => setShowExtended(true), 2000);
      return () => clearTimeout(timer);
    }, [isLoading]);

    return (
      <Button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {isLoading && showExtended ? "Still working..." : children}
      </Button>
    );
  }
);
```

### Exposing isPending from Mutation Hooks

```typescript
// Example: src/hooks/useGroups.ts
// Already uses useMutation; expose isPending for button loading

export function useGroups() {
  // ... existing code

  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string; color: string; icon: string }) => {
      // ... existing mutation logic
    },
    onSuccess: /* ... */,
    onError: /* ... */,
  });

  return {
    groups: groups ?? [],
    isPending,
    createGroup: createGroupMutation.mutate,
    createGroupPending: createGroupMutation.isPending, // Expose for LoadingButton
    updateGroup: updateGroupMutation.mutate,
    updateGroupPending: updateGroupMutation.isPending,
    deleteGroup: deleteGroupMutation.mutate,
    deleteGroupPending: deleteGroupMutation.isPending,
    // ... rest
  };
}
```

### React.memo with useCallback for CoachCalendar

```typescript
// src/pages/CoachCalendar.tsx sub-components
// Source: https://react.dev/reference/react/memo

interface DayCellProps {
  date: Date;
  tasks: ScheduledTask[];
  groupColors: string[];
  isToday: boolean;
  isSelected: boolean;
  onDateClick: (date: Date) => void;
}

const DayCell = React.memo(function DayCell({
  date,
  tasks,
  groupColors,
  isToday,
  isSelected,
  onDateClick,
}: DayCellProps) {
  return (
    <button
      onClick={() => onDateClick(date)}
      className={cn(/* ... */)}
    >
      {/* Cell content */}
    </button>
  );
});

// In parent, memoize the handler
const handleDateClick = useCallback((date: Date) => {
  setSelectedDate(date);
  setSheetOpen(true);
}, []);

// Memoize tasks-per-date to avoid new array each render
const tasksByDate = useMemo(() => {
  const map = new Map<string, ScheduledTask[]>();
  tasks.forEach(task => {
    const key = task.scheduledDate;
    const existing = map.get(key) || [];
    map.set(key, [...existing, task]);
  });
  return map;
}, [tasks]);
```

### React DevTools Profiler Workflow

```typescript
// 1. Open React DevTools > Profiler tab
// 2. Enable "Record why each component rendered while profiling" in settings
// 3. Click Record, perform interaction, click Stop
// 4. Analyze flamegraph for expensive components (>50ms threshold per user decision)
// 5. Look for:
//    - Components re-rendering unnecessarily (same props)
//    - Deep component trees re-rendering
//    - Expensive computations on each render

// For programmatic profiling:
import { Profiler } from 'react';

function onRenderCallback(
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number,
  baseDuration: number,
) {
  if (actualDuration > 50) {
    console.warn(`[Perf] ${id} ${phase} took ${actualDuration.toFixed(2)}ms`);
  }
}

<Profiler id="CoachCalendar" onRender={onRenderCallback}>
  <CoachCalendar />
</Profiler>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `isLoading` for mutations | `isPending` | React Query v5 (2023) | Clearer naming; `isLoading` removed from mutations |
| Manual memoization required | React Compiler auto-memoization | React 19 / Compiler v1.0 (Oct 2025) | Optional; manual memo still works |
| `animate-pulse` skeletons | Shimmer gradient animation | 2024+ best practice | More polished UX |
| Component profiling only | React Performance Tracks | React 19.2 (2025) | Chrome DevTools integration |

**Deprecated/outdated:**
- `isLoading` on mutations: Removed in React Query v5; use `isPending`
- `isInitialLoading`: Renamed to `isLoading` in v5 (for queries)
- Heavy reliance on `shouldComponentUpdate`: Use `React.memo` instead

## Open Questions

Things that couldn't be fully resolved:

1. **Vitest Benchmarking for Automated Performance Regression**
   - What we know: Vitest has experimental `bench` function via Tinybench
   - What's unclear: Best approach for React component render time benchmarks that fail CI
   - Recommendation: Start with manual React DevTools profiling; defer automated benchmarks to Phase 15 if needed

2. **React 19 Compiler Upgrade Path**
   - What we know: React Compiler v1.0 is production-ready; eliminates need for manual `useMemo`/`useCallback`/`React.memo`
   - What's unclear: Migration effort and compatibility with current React 18.3.1 stack
   - Recommendation: Out of scope for this phase; manual memoization is sufficient. Consider for future milestone.

## Sources

### Primary (HIGH confidence)

- [React.memo official docs](https://react.dev/reference/react/memo) - Memoization patterns, when to use, combining with useMemo/useCallback
- [React Profiler official docs](https://react.dev/reference/react/Profiler) - Profiling API, onRender callback, baseDuration vs actualDuration
- [TanStack Query v5 useMutation docs](https://tanstack.com/query/v5/docs/react/reference/useMutation) - isPending, mutation lifecycle
- [TanStack Query v5 Migration Guide](https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5) - isLoading renamed to isPending for mutations

### Secondary (MEDIUM confidence)

- [LogRocket - React Loading Skeleton best practices](https://blog.logrocket.com/handling-react-loading-states-react-loading-skeleton/) - Shimmer animation, layout stability
- [DebugBear - React useMemo and useCallback](https://www.debugbear.com/blog/react-usememo-usecallback) - When to use, cost/benefit analysis
- [Kent C. Dodds - When to useMemo and useCallback](https://kentcdodds.com/blog/usememo-and-usecallback) - Profile first, avoid premature optimization
- [React Compiler v1.0 announcement](https://react.dev/blog/2025/10/07/react-compiler-1) - Production status, performance gains

### Tertiary (LOW confidence)

- [Vitest benchmarking discussion](https://github.com/vitest-dev/vitest/discussions/7850) - Experimental status, known issues
- Various DEV.to articles on React performance - Community patterns, cross-verified with official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All tools already installed and used in codebase
- Architecture patterns: HIGH - Based on React official docs and existing codebase patterns
- Pitfalls: HIGH - Documented in official React Query migration guide and React memo docs
- Profiling: MEDIUM - React DevTools well-documented; automated benchmarking less mature

**Research date:** 2026-01-27
**Valid until:** 2026-02-27 (stable domain, patterns unlikely to change)
