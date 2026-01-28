# Roadmap: Routine Craft Bot

## Milestones

- v1 Reliability Hardening — Phases 1-8 (shipped 2026-01-25)
- v2.0 Performance — Phases 9-14 (shipped 2026-01-28)

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

---

*Roadmap created: 2026-01-24*
*v2.0 Performance: Shipped 2026-01-28*
