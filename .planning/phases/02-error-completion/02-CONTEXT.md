# Phase 2: Error Completion - Context

**Gathered:** 2026-01-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Add loading states to all async operations, handle JWT session expiry with explicit user messaging, and implement retry logic with exponential backoff for AI assistant. Builds on Phase 1's handleError utility and error boundaries.

</domain>

<decisions>
## Implementation Decisions

### Loading Indicators
- Buttons: Spinner icon + disabled state during async operations (text stays visible)
- Data fetching: Skeleton placeholders that mimic content layout
- Form submission: Only disable submit button, not entire form
- Task completion: Wait for server confirmation (no optimistic updates)

### JWT Session Handling
- Expiry behavior: Show modal explaining session expired with re-login button
- Token refresh: Try silent refresh in background first, only show modal if refresh fails
- Post re-login: Stay on current page (user can retry their action)
- Modal dismissal: Non-dismissible (must complete re-login to close)

### AI Retry Behavior
- Retry count: 3 retries with exponential backoff before showing error
- Retry visibility: Silent (user sees loading indicator, doesn't know about retries)
- Timeout message: "Request timed out. Try asking for less information at once."
- Cancel option: Show cancel button so user can stop waiting

### Claude's Discretion
- Skeleton placeholder exact designs (match existing UI patterns)
- Exponential backoff timing (e.g., 1s, 2s, 4s)
- Session expiry modal styling and copy
- Cancel button placement in AI UI

</decisions>

<specifics>
## Specific Ideas

No specific requirements - open to standard approaches. Key constraints:
- Uses Phase 1's handleError utility for error display
- Must work with existing Supabase auth flow
- AI assistant is Gemini-based (src/hooks/useAIAssistant.ts)

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: 02-error-completion*
*Context gathered: 2026-01-24*
