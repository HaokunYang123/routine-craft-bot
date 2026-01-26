---
phase: 06-code-quality
plan: 02
subsystem: error-handling
tags: [handleError, console.error, error-logging, code-quality]
dependency_graph:
  requires:
    - 01-01 (error utility created)
  provides:
    - Structured error logging across all hooks, pages, and components
  affects:
    - Future debugging and error tracking
tech_stack:
  added: []
  patterns:
    - handleError with component/action context
    - silent mode for background operations
key_files:
  created: []
  modified:
    - src/hooks/useRecurringSchedules.ts
    - src/hooks/useGroups.ts
    - src/hooks/useProfile.ts
    - src/hooks/useTemplates.ts
    - src/hooks/useAssignments.ts
    - src/hooks/useStickers.ts
    - src/pages/Tasks.tsx
    - src/pages/People.tsx
    - src/pages/CoachDashboard.tsx
    - src/pages/NotFound.tsx
    - src/pages/AssignerDashboard.tsx
    - src/pages/AssigneeDashboard.tsx
    - src/pages/GroupDetail.tsx
    - src/pages/CoachCalendar.tsx
    - src/pages/Assistant.tsx
    - src/pages/student/StudentHome.tsx
    - src/pages/student/StudentSchedule.tsx
    - src/pages/student/StudentCalendar.tsx
    - src/pages/student/StudentSettings.tsx
    - src/components/CheckInModal.tsx
    - src/components/auth/QRScanner.tsx
    - src/components/auth/StudentAuth.tsx
    - src/components/dashboard/StudentDetailSheet.tsx
decisions:
  - Use silent mode for background fetch operations that shouldn't interrupt user
  - Keep error boundaries with console.error (appropriate for debugging)
  - Keep AI retry loop logging (specialized format for retry tracking)
metrics:
  duration: 4min
  completed: 2026-01-25
---

# Phase 6 Plan 2: Standardize Error Logging Summary

**One-liner:** Migrated 53 console.error calls to handleError utility with component/action context for structured error logging and automatic toast notifications.

## What Was Done

### Task 1: Hooks Migration (18 calls in 6 files)
Migrated all console.error calls in hook files to use handleError:

| Hook | Calls | Actions |
|------|-------|---------|
| useRecurringSchedules.ts | 5 | fetch, create, update, delete, toggle schedules |
| useGroups.ts | 3 | fetch, create groups, fetch members (silent) |
| useProfile.ts | 2 | fetch (silent), update profile |
| useTemplates.ts | 4 | fetch, create, update, delete templates |
| useAssignments.ts | 3 | create, fetch instances (silent), get progress (silent) |
| useStickers.ts | 1 | award sticker (silent) |

Note: useAssignments.ts line 142 is a debug log before throwing, not in catch block - left as-is.

### Task 2: Pages Migration (30 calls in 13 files)
Migrated all console.error calls in page files to use handleError:

| Page | Calls | Actions |
|------|-------|---------|
| Tasks.tsx | 5 | fetch templates/groups (silent), enhance with AI, assign |
| CoachCalendar.tsx | 5 | fetch tasks (silent), update/toggle tasks in DayView/Sidebar |
| People.tsx | 3 | fetch data (silent), delete group, remove student |
| Assistant.tsx | 3 | speech recognition, start speech, send chat |
| StudentSettings.tsx | 3 | fetch profile (silent), sign out (silent), delete account |
| StudentHome.tsx | 2 | fetch groups (silent), fetch tasks |
| CoachDashboard.tsx | 2 | load stats (silent), generate summary |
| GroupDetail.tsx | 1 | fetch group |
| StudentSchedule.tsx | 1 | fetch schedule |
| StudentCalendar.tsx | 1 | fetch tasks (silent) |
| AssignerDashboard.tsx | 1 | fetch dashboard data |
| AssigneeDashboard.tsx | 1 | fetch dashboard data |
| NotFound.tsx | 1 | navigation (silent) - 404 logging |

### Task 3: Components Migration (6 calls in 4 files)
Migrated all console.error calls in component files to use handleError:

| Component | Calls | Actions |
|-----------|-------|---------|
| CheckInModal.tsx | 2 | check today log (silent), submit check-in |
| StudentDetailSheet.tsx | 2 | fetch tasks (silent), generate AI summary |
| QRScanner.tsx | 1 | scan QR code (silent) |
| StudentAuth.tsx | 1 | process QR code |

## Key Patterns Applied

### Standard Pattern
```typescript
// Before
} catch (error) {
  console.error("Error message:", error);
  toast({ title: "Error", description: "Message", variant: "destructive" });
}

// After
} catch (error) {
  handleError(error, { component: 'ComponentName', action: 'action description' });
}
```

### Silent Mode Pattern (background operations)
```typescript
handleError(error, { component: 'Name', action: 'fetch data', silent: true });
```

## Files Excluded (as planned)
- `src/components/FloatingAI.tsx` - AI retry loop with specialized logging
- `src/hooks/useAIAssistant.ts` - AI retry loop with specialized logging
- `src/components/error/AppErrorBoundary.tsx` - Error boundary needs console.error
- `src/components/error/RouteErrorBoundary.tsx` - Error boundary needs console.error
- `src/lib/error.ts` - The utility itself

## Verification Results

1. **console.error in converted files:** 0 remaining (excluding error boundaries and error.ts)
2. **handleError imports:** 23 files now import handleError
3. **handleError calls with context:** 53 calls with component/action context
4. **Build status:** `npm run build` succeeds

## Deviations from Plan

### File Path Corrections
- Plan listed `src/pages/coach/CoachCalendar.tsx` but file is at `src/pages/CoachCalendar.tsx`
- Plan listed `src/pages/coach/Assistant.tsx` but file is at `src/pages/Assistant.tsx`
- Plan listed `src/pages/coach/CoachDashboard.tsx` but file is at `src/pages/CoachDashboard.tsx`
- Plan listed `src/components/QRScanner.tsx` but file is at `src/components/auth/QRScanner.tsx`
- Plan listed `src/components/StudentAuth.tsx` but file is at `src/components/auth/StudentAuth.tsx`
- Plan listed `src/components/StudentDetailSheet.tsx` but file is at `src/components/dashboard/StudentDetailSheet.tsx`

### Call Count Differences
- Plan estimated 59 calls, actual was 53 after excluding:
  - useAssignments.ts line 142 (debug log, not catch block)
  - Some console.error removed in prior phases
  - Removed duplicate console.error+toast patterns count differently

## Commits

| Hash | Description |
|------|-------------|
| (from prior session) | feat(06-02): migrate console.error to handleError in hook files |
| bc87141 | feat(06-02): migrate console.error to handleError in page files |
| bd747a7 | feat(06-02): migrate console.error to handleError in component files |

## Next Phase Readiness

Phase 6 Code Quality is ready to continue:
- Plan 06-01 (ESLint) already complete
- Plan 06-02 (Error logging) now complete
- Codebase has consistent error handling throughout

## Requirement Satisfied

**QUAL-05:** Console.log/error audit - Structured logging via handleError utility now used across all hooks, pages, and components (excluding appropriate exceptions like error boundaries and AI retry loops).
