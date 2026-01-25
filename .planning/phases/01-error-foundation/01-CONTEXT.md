# Phase 1: Error Foundation - Context

**Gathered:** 2026-01-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement React Error Boundary and a consistent error handling utility so users never see a blank screen from uncaught errors. Errors are caught, logged, and presented with recovery options. This establishes the foundation that all other phases build on.

</domain>

<decisions>
## Implementation Decisions

### Toast Behavior
- Display duration: 5 seconds auto-dismiss
- Styling: Distinct colors for error vs success (red for errors, green for success)
- Dismissal: Clickable X button for early dismiss
- Stacking: Up to 3 toasts visible, oldest dismissed first

### Recovery Options
- Primary recovery action: Retry/Refresh button (reload failed component or page)
- Auto retry: Opt-in per call (developer chooses which operations retry automatically)
- Error details: Hidden by default (user-friendly message shown; technical details in console/logs only)
- Fallback screen: Minimal design (simple message + retry button, fits existing app style)

### Claude's Discretion
- Fallback UI exact styling and layout
- Toast positioning (top-right, bottom-right, etc.)
- Logging structure and context fields
- Error boundary placement granularity (app root vs route-level)

</decisions>

<specifics>
## Specific Ideas

No specific requirements - open to standard approaches. User prioritized:
- Keeping UI changes minimal (reliability milestone, not visual redesign)
- Following recommended patterns for React error handling

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: 01-error-foundation*
*Context gathered: 2026-01-24*
