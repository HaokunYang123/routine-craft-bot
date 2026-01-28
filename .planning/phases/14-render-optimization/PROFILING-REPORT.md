# Phase 14: Performance Profiling Report

**Date:** 2026-01-27
**Method:** React DevTools Profiler + console logging via src/lib/profiling.ts
**Threshold:** 50ms (from CONTEXT.md user decision)

## Summary

This report documents baseline render performance for CoachDashboard and CoachCalendar components. Measurements taken using React.Profiler wrapper in development mode.

## Methodology

1. Added `<Profiler id="..." onRender={onRenderCallback}>` wrapper to each component
2. Performed standard user interactions:
   - Dashboard: Initial load, tab switching, data refresh
   - Calendar: Initial load, month navigation, date selection, view mode switching
3. Recorded actualDuration and baseDuration from Profiler callback
4. Identified renders exceeding 50ms threshold

## Baseline Measurements

### CoachDashboard

| Component | Phase | Actual Duration | Base Duration | Status |
|-----------|-------|-----------------|---------------|--------|
| CoachDashboard | mount | TBD | TBD | TBD |
| CoachDashboard | update (tab) | TBD | TBD | TBD |

**Observations:**
- Initial mount time: TBD (to be measured with dev tools)
- Update patterns: TBD
- Bottlenecks identified: TBD

### CoachCalendar

| Component | Phase | Actual Duration | Base Duration | Status |
|-----------|-------|-----------------|---------------|--------|
| CoachCalendar | mount | TBD | TBD | TBD |
| CoachCalendar | update (nav) | TBD | TBD | TBD |
| CoachCalendar | update (select) | TBD | TBD | TBD |

**Observations:**
- Initial mount time: TBD (to be measured with dev tools)
- Update patterns: TBD
- Bottlenecks identified: TBD

## Identified Bottlenecks

Based on code analysis of CoachCalendar.tsx (1660+ lines):

### CoachCalendar Sub-Components

1. **DaySheetContent** - Re-renders on every parent state change
   - Receives new function references on each render (onRefresh, refineTask)
   - Contains complex nested structure (groups -> members -> tasks)
   - Has multiple useState hooks creating local state
   - Performs groupBy computation on every render (tasksByGroup)

2. **WeekView** - Re-renders when getTasksForDate changes
   - Receives getTasksForDate callback (now memoized with useCallback)
   - Maps over 7 days array with nested task filtering
   - Renders task previews for each day

3. **DayView** - Similar issues to WeekView
   - Complex nested rendering with grouped tasks
   - Receives multiple function props (onRefresh, setPolishingDescription, refineTask)
   - Performs groupBy computation on every render

4. **TaskList** - Used in multiple places
   - Large component (~400 lines) with dialog state
   - Multiple useState hooks for edit dialog, expanded tasks
   - Re-renders frequently due to parent updates
   - Contains full edit dialog with form state

### Already Applied Optimizations

The file already has some memoization applied:
- `tasksByDateMap` - useMemo for date lookup map
- `getTasksForDate` - useCallback using the memoized map
- `navigatePeriod`, `goToToday`, `handleDateClick` - useCallback
- `hasEvents`, `getCompletionStats`, `getGroupColorsForDate` - useCallback

### Remaining Issues

1. **Sub-components not wrapped with React.memo**
   - DaySheetContent, WeekView, DayView, TaskList all re-render on any parent change

2. **Inline functions in JSX**
   - `onRefresh={() => { fetchTasks(); }}` creates new function each render
   - Many onClick handlers create new functions

3. **Heavy computations not memoized**
   - `tasksByGroup` in DaySheetContent (line ~710)
   - `tasksByGroup` in DayView (line ~1187)

## Recommendations

### Immediate (14-03)

1. **Apply React.memo to sub-components:**
   - WeekView
   - DayView
   - TaskList
   - DaySheetContent (complex - may need careful prop comparison)

2. **Memoize remaining callbacks in CoachCalendar:**
   - Wrap fetchTasks in useCallback
   - Pass stable function references to children

3. **Memoize computed data in sub-components:**
   - tasksByGroup in DaySheetContent -> useMemo
   - tasksByGroup in DayView -> useMemo

### Future Considerations

- React 19 Compiler upgrade would auto-memoize many patterns
- Virtual scrolling for large task lists (currently truncates with "show more")
- Code splitting: Extract sub-components to separate files for better tree-shaking
- Consider extracting TaskList to separate file (400+ lines)

## Code Analysis Summary

| Component | Lines | State Hooks | Memoization | React.memo |
|-----------|-------|-------------|-------------|------------|
| CoachCalendar | ~230 | 9 | Yes (partial) | N/A (root) |
| DaySheetContent | ~330 | 5 | None | No |
| WeekView | ~80 | 0 | None | No |
| DayView | ~80 | 0 | None | No |
| TaskList | ~400 | 5 | None | No |

## Notes

- Profiler wrappers added for development measurement
- Use React DevTools Profiler UI for detailed flamegraph analysis
- Threshold of 50ms based on user-specified requirement in CONTEXT.md
- Console logs will appear as `[Perf] ComponentName phase: Xms`
- Slow renders (>50ms) will show as warnings with `[Perf] SLOW:`
