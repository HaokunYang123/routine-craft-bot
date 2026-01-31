# Phase 20: Task Rollover Logic - Research

**Researched:** 2026-01-31
**Domain:** Daily task visibility, timezone-aware rollover, overdue task management
**Confidence:** HIGH

## Summary

This phase implements task rollover logic for the student task view, handling day boundaries, overdue accumulation, and yesterday's completed task display. The research investigated timezone-aware midnight detection, session-scoped state persistence, collapsible UI patterns, and real-time update strategies.

The codebase already has strong foundations:
- **date-fns v3.6.0** and **date-fns-tz v3.2.0** with timezone utilities in `src/lib/timezone.ts`
- **useTimezone hook** providing `todayDateString` for timezone-aware queries
- **useAssignments hook** with `getTaskInstances` method supporting date filtering
- **useRealtimeSubscription** for Supabase postgres_changes
- **useVisibilityRefetch** for tab-focus recovery
- **Radix UI Collapsible** component already installed

The primary challenge is implementing midnight detection that works reliably across browser throttling, sleep states, and timezone changes. The standard approach is polling with absolute time comparison, not incremental counters.

**Primary recommendation:** Use a 60-second polling interval with absolute time comparison (`toZonedTime(new Date(), timezone)`) to detect day changes, triggering cache invalidation and UI state transitions.

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| date-fns | 3.6.0 | Date manipulation | Tree-shakeable, immutable, TypeScript-first |
| date-fns-tz | 3.2.0 | Timezone conversion | Uses Intl API, no bundle bloat |
| @tanstack/react-query | 5.83.0 | Server state management | Optimistic updates, cache invalidation |
| @radix-ui/react-collapsible | 1.1.11 | Collapsible sections | Accessible, unstyled, composable |
| @radix-ui/react-toast | 1.2.14 | Toast notifications | Already configured with duration support |

### Supporting (Already Available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sessionStorage (Web API) | N/A | Session-scoped dismissal | Yesterday dismissed state (per CONTEXT.md) |
| BroadcastChannel (Web API) | N/A | Cross-tab sync | Sync dismissal across tabs in same session |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Polling for midnight | setTimeout to exact midnight | setTimeout doesn't survive browser throttling/sleep |
| sessionStorage | localStorage | localStorage persists across sessions (wrong per spec) |
| BroadcastChannel | storage event | storage event requires localStorage write |

**Installation:**
```bash
# No new packages needed - all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── hooks/
│   ├── useDayBoundary.ts       # Midnight detection + day change events
│   ├── useTaskRollover.ts      # Task categorization (today/overdue/yesterday)
│   └── useSessionDismissal.ts  # Session-scoped dismissal with cross-tab sync
├── lib/
│   └── timezone.ts             # Existing - add getYesterdayDateString()
└── pages/student/
    └── StudentHome.tsx         # Integrate task sections
```

### Pattern 1: Polling-Based Day Boundary Detection
**What:** Use setInterval with absolute time comparison to detect midnight crossing
**When to use:** When app is open across midnight (real-time transition requirement)
**Why not setTimeout:** Browser throttles inactive tabs; CPU timers pause during sleep

**Example:**
```typescript
// Source: React timer patterns + date-fns-tz official docs
export function useDayBoundary(timezone: string) {
  const [currentDateString, setCurrentDateString] = useState(() =>
    getUserTodayDateString(timezone)
  );
  const previousDateRef = useRef(currentDateString);

  useEffect(() => {
    // Poll every 60 seconds - frequent enough for real-time feel,
    // infrequent enough to not impact performance
    const interval = setInterval(() => {
      const newDateString = getUserTodayDateString(timezone);
      if (newDateString !== previousDateRef.current) {
        console.log('[DayBoundary] Day changed:', previousDateRef.current, '->', newDateString);
        previousDateRef.current = newDateString;
        setCurrentDateString(newDateString);
      }
    }, 60_000); // 60 seconds

    return () => clearInterval(interval);
  }, [timezone]);

  return { currentDateString };
}
```

### Pattern 2: Task Section Categorization
**What:** Derive today/overdue/yesterday sections from flat task list
**When to use:** Organizing tasks for display based on scheduled_date

**Example:**
```typescript
// Source: CONTEXT.md decisions + existing useAssignments pattern
interface CategorizedTasks {
  today: TaskInstance[];           // scheduled_date === today, any status
  overdue: TaskInstance[];         // scheduled_date < today, status === 'pending'
  yesterdayCompleted: TaskInstance[]; // scheduled_date === yesterday, status === 'completed'
}

function categorizeTasks(
  tasks: TaskInstance[],
  todayStr: string,
  yesterdayStr: string
): CategorizedTasks {
  const today: TaskInstance[] = [];
  const overdue: TaskInstance[] = [];
  const yesterdayCompleted: TaskInstance[] = [];

  for (const task of tasks) {
    if (task.scheduled_date === todayStr) {
      today.push(task);
    } else if (task.scheduled_date < todayStr && task.status === 'pending') {
      overdue.push(task);
    } else if (task.scheduled_date === yesterdayStr && task.status === 'completed') {
      yesterdayCompleted.push(task);
    }
  }

  // Sort per CONTEXT.md: today by creation order, overdue newest-first
  today.sort((a, b) =>
    new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
  );
  overdue.sort((a, b) =>
    new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime()
  );

  return { today, overdue, yesterdayCompleted };
}
```

### Pattern 3: Session-Scoped Dismissal with Cross-Tab Sync
**What:** Persist "dismissed" state in sessionStorage, sync via BroadcastChannel
**When to use:** Yesterday's completed section dismissal (per CONTEXT.md)

**Example:**
```typescript
// Source: MDN sessionStorage + BroadcastChannel docs
const YESTERDAY_DISMISSED_KEY = 'yesterday-tasks-dismissed';
const BROADCAST_CHANNEL_NAME = 'task-rollover-sync';

export function useSessionDismissal() {
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(YESTERDAY_DISMISSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // Cross-tab sync via BroadcastChannel
    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);

    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'YESTERDAY_DISMISSED') {
        setIsDismissed(true);
        sessionStorage.setItem(YESTERDAY_DISMISSED_KEY, 'true');
      }
    };

    channel.addEventListener('message', handleMessage);
    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, []);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    sessionStorage.setItem(YESTERDAY_DISMISSED_KEY, 'true');

    // Notify other tabs
    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    channel.postMessage({ type: 'YESTERDAY_DISMISSED' });
    channel.close();
  }, []);

  return { isDismissed, dismiss };
}
```

### Pattern 4: Overdue Badge Color Escalation
**What:** Color coding based on overdue count thresholds
**When to use:** Coach student list view

**Example:**
```typescript
// Source: CONTEXT.md decisions
type BadgeVariant = 'warning' | 'orange' | 'destructive';

function getOverdueBadgeVariant(count: number): BadgeVariant {
  if (count >= 6) return 'destructive'; // red
  if (count >= 3) return 'orange';      // orange
  return 'warning';                      // yellow
}

// Usage in Badge component
<Badge variant={getOverdueBadgeVariant(overdueCount)}>
  {overdueCount}
</Badge>
```

### Anti-Patterns to Avoid
- **setTimeout to exact midnight:** Browser throttles timers in background tabs; doesn't survive sleep mode
- **Incrementing counters:** Timer drift accumulates (2.66 min/day); use absolute time comparison instead
- **localStorage for session state:** Persists across sessions; use sessionStorage per CONTEXT.md
- **Deriving overdue from task status:** Always check scheduled_date vs today; don't rely on missed status alone

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timezone-aware date strings | Custom Date formatting | `getUserTodayDateString(timezone)` from `lib/timezone.ts` | Already handles DST, edge cases |
| Cross-tab state sync | Custom postMessage | BroadcastChannel API | Native API, cleaner API |
| Optimistic task updates | Manual state reconciliation | `useMutation` onMutate pattern | Already in useAssignments |
| Collapsible animation | Custom CSS transitions | Radix Collapsible with data-state | Handles height: auto, accessible |
| Toast notifications | Custom notification system | Existing `useToast` hook | Already has duration, variants |

**Key insight:** The existing codebase has most building blocks. This phase is integration and orchestration, not building new primitives.

## Common Pitfalls

### Pitfall 1: Timer Drift in Long-Running Sessions
**What goes wrong:** Using `setInterval(() => counter++, 1000)` to track time
**Why it happens:** JavaScript timers drift ~1s per 10 minutes of execution
**How to avoid:** Always compare against `Date.now()` or `getUserTodayDateString()`
**Warning signs:** Tasks appearing in wrong sections after app open for hours

### Pitfall 2: Timezone Changes Breaking State
**What goes wrong:** Student travels, device timezone changes, tasks miscategorized
**Why it happens:** Caching `todayDateString` at component mount
**How to avoid:** Poll timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone` periodically; or recalculate on each check
**Warning signs:** QA reports of tasks in wrong sections during travel scenarios

### Pitfall 3: sessionStorage Not Persisting Across Tabs
**What goes wrong:** Dismissing yesterday section in one tab, still visible in another
**Why it happens:** sessionStorage is partitioned by tab
**How to avoid:** Use BroadcastChannel to sync state across tabs in same session
**Warning signs:** Inconsistent UI across multiple open tabs

### Pitfall 4: Missing Excused Task Toast
**What goes wrong:** Coach excuses task, student never sees notification
**Why it happens:** Toast shown during page load before user attention
**How to avoid:** Store pending notifications in localStorage with expiry; show on first interaction
**Warning signs:** Students unaware of excused tasks

### Pitfall 5: Stale UI After Day Change
**What goes wrong:** Midnight crosses but UI shows yesterday's view
**Why it happens:** Cache not invalidated; components not re-rendering
**How to avoid:** On day boundary change, invalidate `queryKeys.assignments.all`; trigger refetch
**Warning signs:** Tasks stuck in wrong section until manual refresh

### Pitfall 6: Race Condition on Task Completion at Midnight
**What goes wrong:** Task completed at 11:59:59 PM, server receives at 12:00:01 AM next day
**Why it happens:** Network latency across day boundary
**How to avoid:** Use client timestamp for `completed_at`; server validates but doesn't overwrite
**Warning signs:** Tasks incorrectly marked as overdue immediately after completion

## Code Examples

### Example 1: Task Query with Date Range
```typescript
// Source: Existing useAssignments pattern
async function fetchStudentTasks(
  assigneeId: string,
  todayStr: string,
  yesterdayStr: string
): Promise<TaskInstance[]> {
  const { data, error } = await supabase
    .from('task_instances')
    .select('*')
    .eq('assignee_id', assigneeId)
    .or(`scheduled_date.eq.${todayStr},scheduled_date.eq.${yesterdayStr},and(scheduled_date.lt.${todayStr},status.eq.pending)`)
    .order('scheduled_date', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}
```

### Example 2: Yesterday Date String Helper
```typescript
// Add to src/lib/timezone.ts
export function getYesterdayDateString(timezone: string): string {
  const now = new Date();
  const userNow = toZonedTime(now, timezone || 'UTC');
  const yesterday = subDays(userNow, 1);
  return format(yesterday, 'yyyy-MM-dd');
}
```

### Example 3: Collapsible Overdue Section with Show More
```typescript
// Source: Radix UI Collapsible pattern + CONTEXT.md (collapse after 5)
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

const MAX_VISIBLE_OVERDUE = 5;

function OverdueSection({ tasks }: { tasks: TaskInstance[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const visibleTasks = tasks.slice(0, MAX_VISIBLE_OVERDUE);
  const hiddenTasks = tasks.slice(MAX_VISIBLE_OVERDUE);
  const hasMore = hiddenTasks.length > 0;

  return (
    <section>
      <h2 className="text-lg font-semibold mb-2">Overdue</h2>

      {visibleTasks.map(task => (
        <TaskCard key={task.id} task={task} isOverdue />
      ))}

      {hasMore && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground">
            <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
            {isOpen ? 'Show less' : `and ${hiddenTasks.length} more overdue...`}
          </CollapsibleTrigger>
          <CollapsibleContent>
            {hiddenTasks.map(task => (
              <TaskCard key={task.id} task={task} isOverdue />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </section>
  );
}
```

### Example 4: Excused Tasks Toast Notification
```typescript
// Source: CONTEXT.md decisions + existing useToast pattern
const EXCUSED_NOTIFICATION_KEY = 'pending-excused-notification';

function useExcusedTasksNotification() {
  const { toast } = useToast();
  const hasShownRef = useRef(false);

  useEffect(() => {
    if (hasShownRef.current) return;

    try {
      const stored = localStorage.getItem(EXCUSED_NOTIFICATION_KEY);
      if (!stored) return;

      const { count, timestamp } = JSON.parse(stored);
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

      // Only show if less than 1 day old (per CONTEXT.md)
      if (timestamp > oneDayAgo && count > 0) {
        hasShownRef.current = true;
        toast({
          title: 'Tasks Excused',
          description: `${count} task${count > 1 ? 's were' : ' was'} excused by your coach`,
        });
        localStorage.removeItem(EXCUSED_NOTIFICATION_KEY);
      }
    } catch {
      // Silently fail - notification is non-critical
    }
  }, [toast]);
}
```

### Example 5: Real-time Task Updates Subscription
```typescript
// Source: Existing useRealtimeSubscription pattern
function useStudentTaskRealtime(assigneeId: string) {
  const queryClient = useQueryClient();

  useRealtimeSubscription({
    channelName: `student-tasks-${assigneeId}`,
    table: 'task_instances',
    filter: `assignee_id=eq.${assigneeId}`,
    event: '*',
    queryKeysToInvalidate: [queryKeys.assignments.all],
    enabled: !!assigneeId,
  });

  // Also refetch on tab visibility change (fallback for missed events)
  useVisibilityRefetch([queryKeys.assignments.all]);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| date-fns-tz v2 API (`utcToZonedTime`) | date-fns-tz v3 API (`toZonedTime`) | v3.0.0 (2024) | Function renamed; same behavior |
| localStorage events for cross-tab | BroadcastChannel API | Widely supported since 2020 | Cleaner API, works with sessionStorage |
| Manual interval cleanup | useEffect cleanup return | React 16+ | Standard React pattern |

**Deprecated/outdated:**
- `utcToZonedTime`: Renamed to `toZonedTime` in date-fns-tz v3
- `zonedTimeToUtc`: Renamed to `fromZonedTime` in date-fns-tz v3
- Direct `setInterval` without cleanup: Must use useEffect return for cleanup

## Open Questions

1. **Offline completion queue**
   - What we know: CONTEXT.md says "completions require online connection (no offline sync)"
   - What's unclear: Should we queue completions during brief disconnects (<5s)?
   - Recommendation: Keep simple per CONTEXT.md; show error toast immediately on network failure

2. **Coach notification storage location**
   - What we know: Excused tasks need to trigger student notification
   - What's unclear: Should notification data be stored in DB or localStorage?
   - Recommendation: Use localStorage with timestamp; DB adds complexity for simple notification

3. **Reset of yesterday dismissed state at midnight**
   - What we know: Dismissed state persists for browser session
   - What's unclear: Should it auto-reset when day changes (new yesterday)?
   - Recommendation: Clear `YESTERDAY_DISMISSED_KEY` when day boundary crosses; new "yesterday" = new section

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/lib/timezone.ts`, `src/hooks/useTimezone.ts`, `src/hooks/useAssignments.ts`
- Existing codebase: `src/hooks/useRealtimeSubscription.ts`, `src/hooks/useVisibilityRefetch.ts`
- [MDN sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage)
- [date-fns-tz GitHub](https://github.com/date-fns/tz)

### Secondary (MEDIUM confidence)
- [Radix UI Collapsible](https://www.radix-ui.com/primitives/docs/components/collapsible)
- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Cross-Tab State Synchronization in React](https://medium.com/@vinaykumarbr07/cross-tab-state-synchronization-in-react-using-the-browser-storage-event-14b6f1a97ea6)

### Tertiary (LOW confidence)
- [React timer patterns](https://medium.com/@bsalwiczek/building-timer-in-react-its-not-as-simple-as-you-may-think-80e5f2648f9b) - timer drift analysis
- [react-native-midnight](https://github.com/ravnhq/react-native-midnight) - inspiration for day change detection (React Native specific)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in package.json; APIs verified in codebase
- Architecture: HIGH - Patterns based on existing codebase conventions
- Pitfalls: HIGH - Timer drift and cross-tab issues are well-documented problems

**Research date:** 2026-01-31
**Valid until:** 2026-02-28 (30 days - stable domain, no major library changes expected)
