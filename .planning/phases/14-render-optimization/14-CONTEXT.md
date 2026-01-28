# Phase 14: Render Optimization - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Profile and optimize render performance with selective memoization. Users should see skeleton loading states instead of blank screens, buttons should show loading states during mutations, and components should only re-render when their relevant data changes. CoachCalendar is a known optimization target.

</domain>

<decisions>
## Implementation Decisions

### Skeleton Design
- Shimmer animation style (animated gradient moving across placeholders)
- Content-shaped skeletons that match actual layout (card shapes, text lines, avatars)
- Apply to all data screens (Dashboard, People, Templates, Assignments)
- Show skeletons only for fresh fetches — cached data displays immediately

### Button Loading States
- Spinner inside button (replaces or sits next to button text)
- Always disable buttons during mutations (prevent double-clicks)
- Apply to all mutation buttons (Save, Create, Delete, Update)
- After 2+ seconds, show progress text ("Still working...")

### Performance Targets
- 50ms render threshold — flag interactions that feel sluggish
- Profile Dashboard first (entry point, most visited)
- Document with both markdown report and inline code comments
- Add automated performance benchmarks that fail if thresholds exceeded

### Memoization Scope
- Profile-driven approach — only memoize what profiling shows as problematic (except CoachCalendar which is already flagged)
- Apply useMemo/useCallback aggressively for expensive computations and callbacks
- Apply React.memo selectively — only for components receiving frequently-changing parents
- CoachCalendar: prevent re-renders from parent state changes (known issue)

### Claude's Discretion
- Exact shimmer animation implementation (CSS vs library)
- Spinner component choice/design
- Specific benchmark implementation approach
- Which components need React.memo after profiling

</decisions>

<specifics>
## Specific Ideas

- Skeletons should match the actual content layout closely (like Facebook/LinkedIn loading states)
- Dashboard is the first impression — optimize that experience first
- CoachCalendar re-renders when parent state changes — this is the known issue to fix

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-render-optimization*
*Context gathered: 2026-01-27*
