# Phase 15: Authentication Rebuild - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can securely access their accounts via Google OAuth with role-based routing. This includes:
- Role selection landing page ("I am a Coach" / "I am a Student")
- Google OAuth only (removing email/password and login-via-code)
- Database trigger for atomic profile creation
- Role-based routing from database (not localStorage)
- Emergency logout from error pages

</domain>

<decisions>
## Implementation Decisions

### Role Selection UX
- Two large cards side by side (Coach left, Student right)
- Each card contains: icon + title + brief tagline (e.g., "I am a Coach" / "Manage students and assignments")
- App logo + welcome text above the cards ("Welcome to Routine Craft")
- Clicking a card immediately triggers Google OAuth popup (no intermediate screen)

### OAuth Flow Experience
- While OAuth popup is open: subtle loading indicator on the selected card, page stays visible
- If user closes popup without completing: silent reset to role selection (no error message)
- If auth fails (network error, account issue): inline error message below cards with retry option
- Include "trouble signing in?" link with common troubleshooting tips (popup blocker, try different browser)

### Post-Auth Routing
- Between auth completion and dashboard: full-screen loading with message ("Setting up your account..." or "Taking you to your dashboard...")
- First-time users: no onboarding, straight to dashboard
- Returning users visiting role selection: auto-redirect to their dashboard (detect existing session)
- Unauthenticated access to protected pages: redirect to role selection (no return-to-original-page behavior)

### Error Page Behavior
- 404 page: friendly and helpful tone, suggest dashboard, include logout option
- Logout button placement: prominent, near main action (equally visible as "Go to Dashboard")
- Crash error page: no technical details shown, keep it simple for users
- Include prominent "Try Again" (refresh) button alongside go-home and logout options

### Claude's Discretion
- Exact icon/illustration choices for role cards
- Specific wording for loading messages and error text
- Animation/transition details
- Exact styling within existing design system

</decisions>

<specifics>
## Specific Ideas

No specific references mentioned — open to standard approaches that match the existing app design language.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 15-authentication-rebuild*
*Context gathered: 2026-01-28*
