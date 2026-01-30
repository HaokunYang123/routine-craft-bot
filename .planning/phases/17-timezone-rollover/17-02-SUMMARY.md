---
phase: 17
plan: 02
subsystem: timezone
tags: [react-hooks, ui-components, user-preferences, date-fns-tz]

dependency-graph:
  requires: [17-01]
  provides: [useTimezone-hook, TimezoneSelect-component, timezone-settings-ui]
  affects: [17-03]

tech-stack:
  added: []
  patterns: [hook-with-computed-values, controlled-select-component]

key-files:
  created:
    - src/hooks/useTimezone.ts
    - src/components/TimezoneSelect.tsx
  modified:
    - src/hooks/useProfile.ts
    - src/pages/CoachSettings.tsx
    - src/pages/student/StudentSettings.tsx
    - src/pages/AuthCallback.tsx

decisions:
  - id: TIME-08
    choice: "Browser timezone detection as fallback"
    rationale: "Always have a valid timezone, never null in hook return"
  - id: TIME-09
    choice: "Grouped timezone selector by region"
    rationale: "Makes browsing 400+ timezones manageable for users"
  - id: TIME-10
    choice: "Separate save button in StudentSettings"
    rationale: "StudentSettings uses direct Supabase calls, not useProfile hook"

metrics:
  duration: 3m 29s
  completed: 2026-01-30
---

# Phase 17 Plan 02: Timezone Hook and UI Summary

**One-liner:** useTimezone hook for app-wide timezone context with TimezoneSelect picker in settings

## What Was Built

### useTimezone Hook (`src/hooks/useTimezone.ts`)

React hook providing:
- `timezone` - User's IANA timezone name (from profile or browser-detected fallback)
- `formatDate(date, formatStr)` - Format dates in user's timezone
- `todayDateString` - Today's date string (YYYY-MM-DD) for scheduled_date queries
- `isDateToday(date)` - Check if date is today in user's timezone
- `loading` - Profile loading state
- `isTimezoneSet` - Whether timezone was explicitly set (vs auto-detected)

### TimezoneSelect Component (`src/components/TimezoneSelect.tsx`)

Dropdown picker featuring:
- Groups timezones by region (America, Europe, Asia, etc.)
- Shows friendly names with current offset (e.g., "New York (GMT-5)")
- Priority ordering: common regions first, then alphabetical
- Scrollable max-height for long list

### Settings Integration

- **CoachSettings**: Timezone card between Profile and Privacy sections
- **StudentSettings**: Timezone card with separate save button
- Both show "auto-detected from browser" hint when not explicitly set

### AuthCallback Auto-Detection

New users get timezone auto-detected via `detectBrowserTimezone()` during OAuth callback. Stored alongside role assignment for efficiency.

## Task Breakdown

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create useTimezone hook | 353d82a | useTimezone.ts, useProfile.ts |
| 2 | Create TimezoneSelect component | b83723d | TimezoneSelect.tsx |
| 3 | Add timezone to settings and AuthCallback | b212f11 | CoachSettings.tsx, StudentSettings.tsx, AuthCallback.tsx |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] useProfile timezone type**
- **Found during:** Task 1
- **Issue:** Profile interface in useProfile.ts didn't have timezone field
- **Fix:** Added `timezone: string | null` to Profile interface
- **Files modified:** src/hooks/useProfile.ts
- **Commit:** 353d82a

**2. [Rule 2 - Missing Critical] AuthCallback routing with new role**
- **Found during:** Task 3
- **Issue:** After setting role via URL param, routing still used old profile.role (null)
- **Fix:** Use effectiveRole that considers URL param when profile.role was null
- **Files modified:** src/pages/AuthCallback.tsx
- **Commit:** b212f11

## API Surface

### useTimezone Hook
```typescript
function useTimezone(): {
  timezone: string;           // Never null, falls back to browser detection
  loading: boolean;
  isTimezoneSet: boolean;
  formatDate: (date: Date | string, formatStr: string) => string;
  todayDateString: string;    // YYYY-MM-DD in user's timezone
  isDateToday: (date: Date | string) => boolean;
}
```

### TimezoneSelect Component
```typescript
interface TimezoneSelectProps {
  value: string;
  onChange: (timezone: string) => void;
  disabled?: boolean;
}
```

## Verification Results

- [x] TypeScript: No errors
- [x] Build: Successful
- [x] useTimezone returns timezone, formatDate, todayDateString
- [x] TimezoneSelect renders with grouped regions
- [x] Settings pages show timezone picker
- [x] AuthCallback auto-detects timezone (TIME-04)
- [x] Timezone persists to profiles.timezone (TIME-05)

## Next Phase Readiness

**Ready for:** 17-03 UTC storage conversion
- useTimezone provides todayDateString for scheduled_date queries
- formatDate helper ready for displaying UTC timestamps
- All components can access user's timezone via useTimezone hook

## Technical Notes

- TimezoneSelect uses `getAllTimezones()` which returns 400+ IANA names via Intl API
- Offset display updates automatically with DST changes (computed at render time)
- StudentSettings uses direct Supabase calls (legacy pattern) - timezone has separate save
- CoachSettings uses useProfile hook - timezone saves with other profile changes
