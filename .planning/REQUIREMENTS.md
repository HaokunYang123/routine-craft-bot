# Requirements: Routine Craft Bot v3.0

**Defined:** 2026-01-28
**Core Value:** Users can reliably complete their daily workflows with instant feedback and smooth performance.

## v3.0 Requirements

Requirements for Auth & Realtime milestone. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: Landing page displays "I am a Coach" and "I am a Student" role selection before any auth
- [ ] **AUTH-02**: User authenticates via Google OAuth only (email/password removed)
- [ ] **AUTH-03**: Database trigger `handle_new_user` creates profile row atomically when auth.users row is inserted
- [ ] **AUTH-04**: Role is passed via query parameter in OAuth redirect URL (workaround for OAuth metadata limitation)
- [ ] **AUTH-05**: Role-based routing queries database for actual role (not local state or localStorage)
- [ ] **AUTH-06**: onAuthStateChange subscription is properly cleaned up to prevent memory leaks
- [ ] **AUTH-07**: NotFound and ErrorFallback pages include prominent "Log Out" button as emergency exit
- [ ] **AUTH-08**: useProfile returns loading state (not crash) if profile is null immediately after auth, with retry logic
- [ ] **AUTH-09**: Profile is available with zero latency after OAuth completion (trigger creates instantly)
- [ ] **AUTH-10**: Role is immutable once assigned (trigger only runs on INSERT, not UPDATE)

### Realtime

- [ ] **REAL-01**: Task completion by student is visible to coach instantly via Supabase Realtime
- [ ] **REAL-02**: New assignments created by coach appear for students without page refresh
- [ ] **REAL-03**: Realtime subscriptions are properly cleaned up on component unmount (no memory leaks)
- [ ] **REAL-04**: Realtime events invalidate React Query cache (not bypass it)
- [ ] **REAL-05**: Optimistic updates are confirmed by realtime events (belt and suspenders)
- [ ] **REAL-06**: Subscriptions are filtered by user_id to reduce unnecessary traffic

### Timezone

- [ ] **TIME-01**: All timestamps are stored as UTC in database (timestamptz)
- [ ] **TIME-02**: All timestamps are displayed in user's local timezone
- [ ] **TIME-03**: Daily task rollover occurs at user's local midnight (not UTC midnight)
- [ ] **TIME-04**: User timezone is auto-detected from browser on first login
- [ ] **TIME-05**: User timezone is stored in profiles table (IANA format)
- [ ] **TIME-06**: DST transitions are handled correctly (no skipped or duplicate tasks)
- [ ] **TIME-07**: User can change timezone in settings

### Cleanup (Removals)

- [ ] **CLEAN-01**: Email/password authentication is removed from UI
- [ ] **CLEAN-02**: Login-via-code authentication is removed (keep QR/code for class joining only)
- [ ] **CLEAN-03**: localStorage role tracking is removed (database is source of truth)

## Future Requirements

Deferred to later milestones. Tracked but not in v3.0 roadmap.

### Advanced Realtime

- **REAL-F01**: Presence indicators ("User X is online")
- **REAL-F02**: Typing indicators for chat/comments

### Advanced Timezone

- **TIME-F01**: Multi-timezone classroom support (coach views student times in student's timezone)
- **TIME-F02**: Server-side rollover job (currently client-side calculation)

### Security

- **SEC-F01**: Custom OAuth domain branding (show TeachCoachConnect.com instead of Supabase URL)
- **SEC-F02**: Rate limiting for QR code validation

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| One user with multiple roles | Will never happen per user requirement |
| Offline support | Complex, defer to dedicated milestone |
| Email/password as alternative | Simplifies auth to Google only |
| Server-side daily rollover | Client-side calculation is simpler, no cron needed |
| Custom OAuth branding | GoDaddy access pending, defer to later |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | TBD | Pending |
| AUTH-02 | TBD | Pending |
| AUTH-03 | TBD | Pending |
| AUTH-04 | TBD | Pending |
| AUTH-05 | TBD | Pending |
| AUTH-06 | TBD | Pending |
| AUTH-07 | TBD | Pending |
| AUTH-08 | TBD | Pending |
| AUTH-09 | TBD | Pending |
| AUTH-10 | TBD | Pending |
| REAL-01 | TBD | Pending |
| REAL-02 | TBD | Pending |
| REAL-03 | TBD | Pending |
| REAL-04 | TBD | Pending |
| REAL-05 | TBD | Pending |
| REAL-06 | TBD | Pending |
| TIME-01 | TBD | Pending |
| TIME-02 | TBD | Pending |
| TIME-03 | TBD | Pending |
| TIME-04 | TBD | Pending |
| TIME-05 | TBD | Pending |
| TIME-06 | TBD | Pending |
| TIME-07 | TBD | Pending |
| CLEAN-01 | TBD | Pending |
| CLEAN-02 | TBD | Pending |
| CLEAN-03 | TBD | Pending |

**Coverage:**
- v3.0 requirements: 26 total
- Mapped to phases: 0 (pending roadmap creation)
- Unmapped: 26 ⚠️

---
*Requirements defined: 2026-01-28*
*Last updated: 2026-01-28 after initial definition*
