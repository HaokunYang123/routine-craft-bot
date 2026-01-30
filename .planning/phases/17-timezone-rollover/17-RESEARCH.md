# Phase 17: Timezone & Rollover - Research

**Researched:** 2026-01-30
**Domain:** Timezone handling, date/time display, daily task rollover
**Confidence:** HIGH

## Summary

This phase implements timezone-aware time handling so users see all timestamps in their local time and daily tasks roll over at their local midnight rather than UTC midnight. The approach follows the industry-standard pattern: **store UTC, display local**. PostgreSQL `timestamptz` columns already store UTC; this phase adds the infrastructure to convert to user-local time at display time.

The primary challenge is the "daily rollover" problem - determining what "today's tasks" means for a user in Los Angeles (UTC-8) vs London (UTC+0). Without timezone handling, a task scheduled for "January 30th" appears on January 29th for PST users when the server uses UTC dates. This phase solves this by storing the user's IANA timezone (e.g., "America/Los_Angeles") in their profile and using date-fns-tz to perform all date comparisons and displays in that timezone.

DST transitions require special attention. The spring-forward gap (2:00 AM doesn't exist) and fall-back overlap (2:00 AM happens twice) can cause tasks to skip or duplicate. Using IANA timezone names with date-fns-tz automatically handles these transitions using the browser's Intl API with the IANA time zone database.

**Primary recommendation:** Use `date-fns-tz` (already compatible with installed date-fns v3.6.0) for all timezone conversions, detect user timezone with `Intl.DateTimeFormat().resolvedOptions().timeZone`, and store in profiles table.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| date-fns | 3.6.0 (installed) | Base date utilities | Already in use, immutable, tree-shakeable |
| date-fns-tz | 3.x | Timezone conversions | Companion to date-fns v3, uses Intl API (no bundle bloat) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Intl.DateTimeFormat | Native | Timezone detection | Browser built-in, no install needed |
| Intl.supportedValuesOf | Native | Get IANA timezone list | For timezone selector dropdown |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| date-fns-tz | @date-fns/tz (TZDate) | Newer API for date-fns v4, but requires refactoring existing date-fns usage |
| date-fns-tz | Luxon | More complete timezone API but adds 70KB+ to bundle, different API paradigm |
| date-fns-tz | Moment Timezone | Legacy project, not recommended for new code |
| Native Intl | react-timezone-select | Pre-built component, but simple enough to build with native APIs |

**Installation:**
```bash
npm install date-fns-tz@3
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   └── timezone.ts           # Core timezone utilities (formatInTimeZone, getUserToday, etc.)
├── hooks/
│   └── useTimezone.ts        # Hook providing user timezone context
├── components/
│   └── TimezoneSelect.tsx    # Timezone picker for settings
└── pages/
    └── CoachSettings.tsx     # Add timezone setting section
```

### Pattern 1: Store UTC, Display Local
**What:** All database timestamps stored as UTC (timestamptz), converted to user's local timezone only at display time.
**When to use:** Every timestamp display in the application.
**Example:**
```typescript
// Source: date-fns-tz documentation
import { formatInTimeZone } from 'date-fns-tz';

// Database returns UTC timestamp
const taskCreatedAt = new Date('2026-01-30T15:00:00Z');
const userTimezone = 'America/Los_Angeles';

// Display in user's timezone
const displayTime = formatInTimeZone(
  taskCreatedAt,
  userTimezone,
  'MMM d, h:mm a zzz'
); // "Jan 30, 7:00 AM PST"
```

### Pattern 2: User's Local "Today"
**What:** Determine what date "today" is in the user's timezone for task filtering.
**When to use:** "Today's Tasks" queries, daily rollover logic.
**Example:**
```typescript
// Source: date-fns-tz patterns
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { startOfDay, endOfDay, format } from 'date-fns';

function getUserLocalToday(userTimezone: string): { start: Date; end: Date; dateStr: string } {
  const now = new Date();
  const userNow = toZonedTime(now, userTimezone);

  // Get start/end of day in user's timezone, then convert back to UTC for DB query
  const todayStart = startOfDay(userNow);
  const todayEnd = endOfDay(userNow);

  // Date string for DATE column comparison (YYYY-MM-DD format)
  const dateStr = format(userNow, 'yyyy-MM-dd');

  return { start: todayStart, end: todayEnd, dateStr };
}

// Usage: Query tasks for today
const { dateStr } = getUserLocalToday('America/Los_Angeles');
const { data: todaysTasks } = await supabase
  .from('task_instances')
  .select('*')
  .eq('scheduled_date', dateStr);
```

### Pattern 3: Auto-Detect on First Login
**What:** Detect user's timezone from browser on first login/signup, store in profile.
**When to use:** User signup or when timezone is not yet set in profile.
**Example:**
```typescript
// Source: MDN Intl.DateTimeFormat
function detectBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC'; // Fallback for very old browsers
  }
}

// On signup/first login
async function ensureUserTimezone(userId: string, currentTimezone: string | null) {
  if (!currentTimezone) {
    const detectedTimezone = detectBrowserTimezone();
    await supabase
      .from('profiles')
      .update({ timezone: detectedTimezone })
      .eq('user_id', userId);
  }
}
```

### Pattern 4: Timezone-Aware Date Comparison
**What:** Compare if two timestamps are "same day" in user's timezone.
**When to use:** Task grouping by day, checking if task is overdue.
**Example:**
```typescript
// Source: date-fns-tz patterns
import { toZonedTime } from 'date-fns-tz';
import { isSameDay } from 'date-fns';

function isSameDayInTimezone(date1: Date, date2: Date, timezone: string): boolean {
  return isSameDay(
    toZonedTime(date1, timezone),
    toZonedTime(date2, timezone)
  );
}

// Check if task is "today"
const isTaskToday = isSameDayInTimezone(
  taskScheduledDate,
  new Date(),
  userTimezone
);
```

### Anti-Patterns to Avoid
- **Double conversion:** Converting UTC to local twice (once in JS, once assuming local) results in times off by timezone offset.
- **Using native Date comparisons:** `date.toDateString() === new Date().toDateString()` ignores timezones entirely.
- **Storing local time strings:** Never store "09:00 AM" - always store full UTC timestamps.
- **Using fixed offsets:** "UTC-5" instead of "America/New_York" breaks during DST transitions.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timezone conversion | Manual UTC offset math | `formatInTimeZone(date, tz, fmt)` | DST transitions, historical dates, leap seconds |
| Timezone detection | IP geolocation lookup | `Intl.DateTimeFormat().resolvedOptions().timeZone` | More accurate, no external API, privacy-respecting |
| Timezone list | Hardcoded array of timezones | `Intl.supportedValuesOf('timeZone')` | Always current, updates with browser |
| DST handling | if/else for spring/fall | date-fns-tz with IANA names | IANA database tracks all historical/future DST rules |
| Date-only comparison | String substring of ISO date | `isSameDay(toZonedTime(...))` | Handles edge cases at midnight boundary |

**Key insight:** Timezone math is notoriously error-prone. The IANA time zone database has thousands of rules for historical and future DST changes. Libraries using Intl API get free updates through browser updates.

## Common Pitfalls

### Pitfall 1: Double Timezone Conversion (D1)
**What goes wrong:** Converting timezone twice - PostgreSQL timestamptz is already UTC, then converting again in JavaScript results in times off by exactly the timezone offset.
**Why it happens:** Misunderstanding that timestamptz values are already UTC when retrieved.
**How to avoid:** Use `formatInTimeZone()` directly on the Date object from database. Don't call `utcToZonedTime()` followed by another timezone function.
**Warning signs:** Times off by exactly your timezone offset (e.g., 5 hours); works for UTC users but wrong for everyone else.

### Pitfall 2: Daily Task Rollover at Wrong Time (D2)
**What goes wrong:** Tasks roll over at UTC midnight instead of user's local midnight. Users in PST see "Today's Tasks" roll over at 4 PM.
**Why it happens:** Using `new Date().toDateString()` or comparing dates without timezone context.
**How to avoid:** Always convert both "now" and "task date" to user's timezone before comparison.
**Warning signs:** Tasks appear on wrong day for non-UTC users; rollover happens during user's afternoon.

### Pitfall 3: DST Transition Bugs (D3)
**What goes wrong:** Tasks scheduled during DST gap (2:30 AM spring forward) don't exist; tasks during overlap (1:30 AM fall back) fire twice.
**Why it happens:** Using naive `addDays()` without timezone awareness.
**How to avoid:** Use date-fns-tz which internally uses IANA rules. For recurring tasks, calculate next occurrence in user's timezone, then convert to UTC.
**Warning signs:** Tasks skip once a year in spring; tasks fire twice in fall; different behavior for different DST regions.

### Pitfall 4: Hardcoded Timezone Offset
**What goes wrong:** Using "UTC-5" or "EST" instead of "America/New_York". During DST, EST becomes EDT (UTC-4), but hardcoded offset stays at -5.
**Why it happens:** Using abbreviations seems simpler than IANA names.
**How to avoid:** Always use IANA names ("America/New_York", not "EST"). Store user timezone as IANA name.
**Warning signs:** Wrong times for half the year in DST regions; works correctly only in regions without DST.

### Pitfall 5: Date-Only Fields With Timezone Ambiguity
**What goes wrong:** Database `DATE` column "2026-01-30" is ambiguous - is it January 30th in UTC or user's timezone?
**Why it happens:** The `scheduled_date` column uses `DATE` type which has no timezone information.
**How to avoid:** For `scheduled_date`, interpret it as the date in the user's timezone, not UTC. When querying "today's tasks", calculate what date string matches "today" in the user's timezone.
**Warning signs:** Task scheduled for "today" shows up yesterday or tomorrow for users in different timezones.

## Code Examples

Verified patterns from official sources:

### Centralized Timezone Utilities (lib/timezone.ts)
```typescript
// Source: date-fns-tz documentation patterns
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format, startOfDay, endOfDay, isSameDay } from 'date-fns';

const DEFAULT_TIMEZONE = 'UTC';

/**
 * Get user's browser timezone
 */
export function detectBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/**
 * Format a UTC date for display in user's timezone
 */
export function formatInUserTimezone(
  date: Date | string,
  timezone: string,
  formatStr: string
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(dateObj, timezone, formatStr);
}

/**
 * Get today's date string (YYYY-MM-DD) in user's timezone
 * Used for querying scheduled_date column
 */
export function getUserTodayDateString(timezone: string): string {
  const now = new Date();
  const userNow = toZonedTime(now, timezone);
  return format(userNow, 'yyyy-MM-dd');
}

/**
 * Check if a date matches "today" in user's timezone
 */
export function isDateToday(date: Date | string, timezone: string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  return isSameDay(
    toZonedTime(dateObj, timezone),
    toZonedTime(now, timezone)
  );
}

/**
 * Get all available IANA timezones for selector
 */
export function getAllTimezones(): string[] {
  if (typeof Intl.supportedValuesOf === 'function') {
    return Intl.supportedValuesOf('timeZone');
  }
  // Fallback for older browsers - common timezones only
  return [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Singapore',
    'Australia/Sydney',
  ];
}

/**
 * Get friendly display name for timezone
 */
export function getTimezoneDisplayName(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'long',
    });
    const parts = formatter.formatToParts(now);
    const tzName = parts.find(p => p.type === 'timeZoneName')?.value || timezone;

    // Also get current offset
    const offsetFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    });
    const offsetParts = offsetFormatter.formatToParts(now);
    const offset = offsetParts.find(p => p.type === 'timeZoneName')?.value || '';

    return `${timezone.replace(/_/g, ' ')} (${offset})`;
  } catch {
    return timezone;
  }
}
```

### useTimezone Hook
```typescript
// Source: React Query patterns + date-fns-tz
import { useProfile } from './useProfile';
import { detectBrowserTimezone, getUserTodayDateString, formatInUserTimezone } from '@/lib/timezone';

export function useTimezone() {
  const { profile, loading } = useProfile();

  // User's stored timezone or detected timezone as fallback
  const timezone = profile?.timezone || detectBrowserTimezone();

  // Helper to format any date in user's timezone
  const formatDate = (date: Date | string, formatStr: string) => {
    return formatInUserTimezone(date, timezone, formatStr);
  };

  // Get today's date string for DB queries
  const todayDateString = getUserTodayDateString(timezone);

  return {
    timezone,
    loading,
    formatDate,
    todayDateString,
    isTimezoneSet: !!profile?.timezone,
  };
}
```

### Updated AssigneeDashboard Query
```typescript
// BEFORE: Uses server local date
const today = format(new Date(), "yyyy-MM-dd");

// AFTER: Uses user's local date
import { useTimezone } from '@/hooks/useTimezone';

const { todayDateString } = useTimezone();
const { data: instances } = await supabase
  .from("task_instances")
  .select(`*`)
  .eq("assignee_id", user.id)
  .eq("scheduled_date", todayDateString);
```

### TimezoneSelect Component
```typescript
// Source: Native Intl API + shadcn/ui patterns
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAllTimezones, getTimezoneDisplayName } from '@/lib/timezone';

interface TimezoneSelectProps {
  value: string;
  onChange: (timezone: string) => void;
}

export function TimezoneSelect({ value, onChange }: TimezoneSelectProps) {
  const timezones = getAllTimezones();

  // Group by region for better UX
  const grouped = timezones.reduce((acc, tz) => {
    const [region] = tz.split('/');
    if (!acc[region]) acc[region] = [];
    acc[region].push(tz);
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select timezone" />
      </SelectTrigger>
      <SelectContent className="max-h-80">
        {Object.entries(grouped).map(([region, tzs]) => (
          <div key={region}>
            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
              {region}
            </div>
            {tzs.map((tz) => (
              <SelectItem key={tz} value={tz}>
                {getTimezoneDisplayName(tz)}
              </SelectItem>
            ))}
          </div>
        ))}
      </SelectContent>
    </Select>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Moment Timezone | date-fns-tz / Luxon | 2020 | Moment is legacy; date-fns is tree-shakeable |
| Hardcoded timezone arrays | Intl.supportedValuesOf() | 2022+ | Always current, no maintenance |
| IP geolocation for TZ | Intl.DateTimeFormat detection | Always preferred | More accurate, private, no API calls |
| UTC offset storage | IANA timezone names | Best practice | Handles DST automatically |
| date-fns-tz v2 | date-fns-tz v3 | 2024 | Compatible with date-fns v3, new API names |

**Deprecated/outdated:**
- `utcToZonedTime` / `zonedTimeToUtc`: Renamed to `toZonedTime` / `fromZonedTime` in date-fns-tz v3
- Moment.js and moment-timezone: Legacy project, not recommended for new code
- Manual DST offset calculations: Use IANA timezone database via libraries

## Open Questions

Things that couldn't be fully resolved:

1. **Recurring tasks spanning DST transition**
   - What we know: date-fns-tz handles DST for single conversions correctly
   - What's unclear: Exact behavior when generating multiple recurring task instances that span a DST transition
   - Recommendation: Test thoroughly with edge cases; consider storing recurring rules in user's timezone and generating instances at query time

2. **Coach vs Student timezone mismatch**
   - What we know: Coach assigns task to student; both have different timezones
   - What's unclear: Should task display in coach's timezone, student's timezone, or both?
   - Recommendation: Display in viewer's timezone (student sees their TZ, coach sees their TZ) with option to see original assignment time

3. **Timezone changes for historical data**
   - What we know: If user changes timezone, historical completed_at timestamps stay as UTC
   - What's unclear: Should historical task times be re-displayed in new timezone?
   - Recommendation: Yes - UTC storage means display always converts to current user timezone

## Sources

### Primary (HIGH confidence)
- [date-fns-tz GitHub](https://github.com/marnusw/date-fns-tz) - API documentation, version compatibility
- [MDN Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat) - Timezone detection
- [PostgreSQL Date/Time Types](https://www.postgresql.org/docs/current/datatype-datetime.html) - timestamptz behavior
- Project PITFALLS.md - Documented D1-D5 timezone pitfalls with prevention patterns

### Secondary (MEDIUM confidence)
- [Tinybird: Best practices for timestamps and timezones](https://www.tinybird.co/blog/database-timestamps-timezones) - Store UTC pattern
- [TaskNotes UTC Implementation](https://callumalpass.github.io/tasknotes/TIMEZONE_HANDLING_UTC/) - UTC midnight convention
- [lingo.dev: Get Valid Timezone Identifiers](https://lingo.dev/en/javascript-i18n/get-valid-time-zone-identifiers) - Intl.supportedValuesOf usage

### Tertiary (LOW confidence)
- Various Medium articles on date-fns timezone handling - General patterns, verify with official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - date-fns-tz is the canonical timezone companion for date-fns, already using date-fns v3
- Architecture: HIGH - "Store UTC, display local" is industry standard pattern, well documented
- Pitfalls: HIGH - Pre-documented in project PITFALLS.md with specific prevention patterns
- Code examples: MEDIUM - Based on official API docs, but not tested in this specific codebase

**Research date:** 2026-01-30
**Valid until:** 60 days (timezone handling is stable domain, libraries update infrequently)
