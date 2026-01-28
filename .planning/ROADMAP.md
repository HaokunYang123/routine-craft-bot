# Roadmap: TeachCoachConnect

## Milestones

- v1 Reliability Hardening — Phases 1-8 (shipped 2026-01-25)
- v2.0 Performance — Phases 9-14 (shipped 2026-01-28)
- v3.0 Auth & Realtime — Phases 15-17 (in progress)

## Phases

<details>
<summary>v1 Reliability Hardening (Phases 1-8) — SHIPPED 2026-01-25</summary>

### Phase 1: Error Handling Foundation
**Goal**: Establish error boundaries and consistent error handling patterns.
**Plans**: 3 plans

Plans:
- [x] 01-01: React Error Boundary
- [x] 01-02: Error Handling Utility
- [x] 01-03: Structured Logging

### Phase 2: Testing Infrastructure
**Goal**: Set up Vitest + React Testing Library with proper mocking.
**Plans**: 3 plans

Plans:
- [x] 02-01: Vitest Configuration
- [x] 02-02: Supabase Mock Factory
- [x] 02-03: Test Utilities Setup

### Phase 3: Type Safety Hardening
**Goal**: Eliminate `as any` casts and generate proper Supabase types.
**Plans**: 3 plans

Plans:
- [x] 03-01: Supabase Type Generation
- [x] 03-02: Type Cast Elimination
- [x] 03-03: RPC Type Definitions

### Phase 4: Utility Tests
**Goal**: Test pure utility functions (date helpers, formatters, cn).
**Plans**: 3 plans

Plans:
- [x] 04-01: Date Utility Tests
- [x] 04-02: Format Utility Tests
- [x] 04-03: Class Name Utility Tests

### Phase 5: Hook Tests - Auth
**Goal**: Test authentication hooks (useAuth, useGoogleAuth).
**Plans**: 3 plans

Plans:
- [x] 05-01: useAuth Core Tests
- [x] 05-02: Auth Edge Cases
- [x] 05-03: Session Management Tests

### Phase 6: Hook Tests - Data
**Goal**: Test data fetching hooks (useAssignments, useGroups, useTemplates).
**Plans**: 3 plans

Plans:
- [x] 06-01: useAssignments Tests
- [x] 06-02: useGroups Tests
- [x] 06-03: useTemplates Tests

### Phase 7: Hook Tests - AI & Memory
**Goal**: Test AI assistant and memory leak prevention.
**Plans**: 3 plans

Plans:
- [x] 07-01: useAIAssistant Tests
- [x] 07-02: Timeout Cleanup Tests
- [x] 07-03: Subscription Cleanup Tests

### Phase 8: Component Tests
**Goal**: Test key UI components (ProtectedRoute, CheckInModal, Dashboard).
**Plans**: 3 plans

Plans:
- [x] 08-01: ProtectedRoute Tests
- [x] 08-02: CheckInModal Tests
- [x] 08-03: Dashboard Tests

</details>

<details>
<summary>v2.0 Performance (Phases 9-14) — SHIPPED 2026-01-28</summary>

### Phase 9: React Query Foundation
**Goal**: Establish query infrastructure without changing hook interfaces.
**Plans**: 1 plan

Plans:
- [x] 09-01: Query key factory + QueryClient configuration

### Phase 10: Simple Hook Migration
**Goal**: Migrate low-complexity hooks to React Query pattern.
**Plans**: 3 plans

Plans:
- [x] 10-01: useProfile migration + tests
- [x] 10-02: useGroups migration + test updates
- [x] 10-03: useTemplates migration + tests

### Phase 11: Complex Hook Migration
**Goal**: Migrate high-complexity hooks with nested queries.
**Plans**: 3 plans

Plans:
- [x] 11-01: useAssignments migration (utility pattern + fetchQuery)
- [x] 11-02: useRecurringSchedules migration (useQuery + parallel enrichment)
- [x] 11-03: useStickers migration (useQueries + combine)

### Phase 12: Mutations & Optimistic Updates
**Goal**: Add mutation patterns with query invalidation and optimistic updates.
**Plans**: 4 plans

Plans:
- [x] 12-01: Toast duration + useGroups useMutation migration
- [x] 12-02: useTemplates + useProfile useMutation migration
- [x] 12-03: useAssignments optimistic updates (task completion)
- [x] 12-04: Student components integration

### Phase 13: Pagination
**Goal**: Add cursor-based pagination and infinite scroll for large datasets.
**Plans**: 3 plans

Plans:
- [x] 13-01: Query key factory + useInfiniteClients hook + useLocalStorage
- [x] 13-02: Pagination UI components
- [x] 13-03: People.tsx integration

### Phase 14: Render Optimization
**Goal**: Profile and optimize render performance with selective memoization.
**Plans**: 3 plans

Plans:
- [x] 14-01: Shimmer animation + page skeletons + LoadingButton timeout
- [x] 14-02: Performance profiling utilities + baseline documentation
- [x] 14-03: CoachCalendar memoization (React.memo + useCallback)

</details>

<details open>
<summary>v3.0 Auth & Realtime (Phases 15-17) — IN PROGRESS</summary>

### Phase 15: Authentication Rebuild
**Goal**: Users can securely access their accounts via Google OAuth with role-based routing.

**Dependencies**: None (foundation for v3.0)

**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, AUTH-09, AUTH-10, CLEAN-01, CLEAN-02, CLEAN-03

**Success Criteria**:
1. User lands on role selection page showing "I am a Coach" and "I am a Student" before any authentication
2. User can sign up/sign in via Google OAuth only (no email/password option visible)
3. User profile exists with correct role immediately after OAuth completion (zero latency)
4. User is routed to correct dashboard based on role from database (not localStorage)
5. User can log out from error pages (NotFound, ErrorFallback) as emergency exit

**Plans**: 6 plans in 3 waves

Plans:
- [x] 15-01-PLAN.md — Database trigger + useGoogleAuth role parameter (Wave 1)
- [x] 15-02-PLAN.md — AuthCallback page for OAuth redirect handling (Wave 1)
- [x] 15-03-PLAN.md — Role selection UI with direct OAuth trigger (Wave 2)
- [x] 15-04-PLAN.md — Error pages with logout buttons (Wave 2)
- [x] 15-05-PLAN.md — useProfile retry + cleanup email/password auth (Wave 3)
- [x] 15-06-PLAN.md — End-to-end verification checkpoint (Wave 3)

### Phase 16: Realtime Subscriptions
**Goal**: Data changes sync instantly between coach and student views.

**Dependencies**: Phase 15 (profile required for user_id filtering)

**Requirements**: REAL-01, REAL-02, REAL-03, REAL-04, REAL-05, REAL-06

**Success Criteria**:
1. Student marking task complete is visible to coach instantly without page refresh
2. Coach creating new assignment appears for student instantly without page refresh
3. Browser memory remains stable after navigating between pages 10+ times (no WebSocket leaks)
4. Realtime updates appear in React Query DevTools as cache invalidations (not bypassing cache)

**Plans**: 4 plans in 3 waves

Plans:
- [ ] 16-01-PLAN.md — Realtime infrastructure (hook + channels + visibility) (Wave 1)
- [ ] 16-02-PLAN.md — Coach views integration (Dashboard + Calendar) (Wave 2)
- [ ] 16-03-PLAN.md — Student views integration (Home + Calendar) (Wave 2)
- [ ] 16-04-PLAN.md — End-to-end verification checkpoint (Wave 3)

### Phase 17: Timezone & Rollover
**Goal**: Time displays respect user's local timezone with correct daily task boundaries.

**Dependencies**: Phase 15 (profile.timezone column required)

**Requirements**: TIME-01, TIME-02, TIME-03, TIME-04, TIME-05, TIME-06, TIME-07

**Success Criteria**:
1. User in different timezone sees times displayed in their local time (not UTC)
2. "Today's tasks" reflects user's local date, not server date
3. Daily tasks roll over at user's local midnight (not UTC midnight)
4. User can view and change their timezone in settings
5. Historical task times display correctly even after DST transitions

Plans: TBD

</details>

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Error Handling | v1 | 3/3 | Complete | 2026-01-24 |
| 2. Testing Infrastructure | v1 | 3/3 | Complete | 2026-01-24 |
| 3. Type Safety | v1 | 3/3 | Complete | 2026-01-24 |
| 4. Utility Tests | v1 | 3/3 | Complete | 2026-01-24 |
| 5. Auth Hook Tests | v1 | 3/3 | Complete | 2026-01-24 |
| 6. Data Hook Tests | v1 | 3/3 | Complete | 2026-01-24 |
| 7. AI & Memory Tests | v1 | 3/3 | Complete | 2026-01-24 |
| 8. Component Tests | v1 | 3/3 | Complete | 2026-01-25 |
| 9. React Query Foundation | v2.0 | 1/1 | Complete | 2026-01-26 |
| 10. Simple Hook Migration | v2.0 | 3/3 | Complete | 2026-01-26 |
| 11. Complex Hook Migration | v2.0 | 3/3 | Complete | 2026-01-26 |
| 12. Mutations & Optimistic | v2.0 | 4/4 | Complete | 2026-01-27 |
| 13. Pagination | v2.0 | 3/3 | Complete | 2026-01-27 |
| 14. Render Optimization | v2.0 | 3/3 | Complete | 2026-01-28 |
| 15. Authentication Rebuild | v3.0 | 6/6 | Complete | 2026-01-28 |
| 16. Realtime Subscriptions | v3.0 | 0/4 | Pending | — |
| 17. Timezone & Rollover | v3.0 | 0/? | Pending | — |

---

*Roadmap created: 2026-01-24*
*v2.0 Performance: Shipped 2026-01-28*
*v3.0 Auth & Realtime: Started 2026-01-28*
