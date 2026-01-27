# Roadmap: Routine Craft Bot

## Milestones

- [x] **v1 Reliability Hardening** - Phases 1-8 (shipped 2026-01-25)
- [ ] **v2.0 Performance** - Phases 9-14 (in progress)

## Phases

<details>
<summary>v1 Reliability Hardening (Phases 1-8) - SHIPPED 2026-01-25</summary>

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

---

## v2.0 Performance (In Progress)

**Milestone Goal:** Optimize data fetching, rendering, and large dataset handling for faster, smoother user experience.

### Phase 9: React Query Foundation
**Goal**: Establish query infrastructure without changing hook interfaces.
**Depends on**: Phase 8 (v1 complete)
**Requirements**: RQ-01 (caching), RQ-04 (background refetch), RQ-05 (deduplication)
**Success Criteria** (what must be TRUE):
  1. QueryClient has production-ready defaults (staleTime, gcTime, retry logic)
  2. Query key factory exists with hierarchical keys for all entities
  3. Global error handler prevents duplicate error toasts
  4. Existing tests pass unchanged
**Plans**: 1 plan

Plans:
- [x] 09-01-PLAN.md — Query key factory + QueryClient configuration

### Phase 10: Simple Hook Migration
**Goal**: Migrate low-complexity hooks to React Query pattern.
**Depends on**: Phase 9
**Requirements**: RQ-02 (loading states), RQ-03 (error states)
**Success Criteria** (what must be TRUE):
  1. User sees loading indicator when useProfile fetches
  2. User sees error message when useGroups fetch fails
  3. User sees cached group data instantly on navigation (no spinner within 5min)
  4. Component interfaces unchanged (backward compatible)
**Plans**: 3 plans (3 waves)

Plans:
- [x] 10-01-PLAN.md — useProfile migration + tests
- [x] 10-02-PLAN.md — useGroups migration + test updates
- [x] 10-03-PLAN.md — useTemplates migration + tests

### Phase 11: Complex Hook Migration
**Goal**: Migrate high-complexity hooks with nested queries.
**Depends on**: Phase 10
**Requirements**: RQ-02 (loading states), RQ-03 (error states)
**Success Criteria** (what must be TRUE):
  1. User sees loading indicator when useAssignments fetches
  2. User sees cached assignment data instantly on navigation
  3. User sees error message when useRecurringSchedules fails
  4. Multiple components sharing same data make single request
**Plans**: 3 plans (1 wave)

Plans:
- [x] 11-01-PLAN.md — useAssignments migration (utility pattern + fetchQuery)
- [x] 11-02-PLAN.md — useRecurringSchedules migration (useQuery + parallel enrichment)
- [x] 11-03-PLAN.md — useStickers migration (useQueries + combine)

### Phase 12: Mutations & Optimistic Updates
**Goal**: Add mutation patterns with query invalidation and optimistic updates.
**Depends on**: Phase 11
**Requirements**: RQ-06 (mutation feedback), RQ-07 (query invalidation), RQ-08 (optimistic updates)
**Success Criteria** (what must be TRUE):
  1. User sees confirmation toast after creating/updating/deleting any item
  2. User sees list update immediately after create/edit/delete (no manual refresh)
  3. User sees instant task completion feedback (checkbox updates before server responds)
  4. User sees rollback if task completion fails (checkbox reverts)
**Plans**: 4 plans (3 waves)

Plans:
- [x] 12-01-PLAN.md — Toast duration + useGroups useMutation migration
- [x] 12-02-PLAN.md — useTemplates + useProfile useMutation migration
- [x] 12-03-PLAN.md — useAssignments optimistic updates (task completion)
- [x] 12-04-PLAN.md — Student components integration

### Phase 13: Pagination
**Goal**: Add cursor-based pagination and infinite scroll for large datasets.
**Depends on**: Phase 12
**Requirements**: PAG-01 (page size), PAG-02 (loading indicator), PAG-03 (end indicator), PAG-04 (cursor pagination), PAG-05 (infinite scroll)
**Success Criteria** (what must be TRUE):
  1. User can select page size (10/25/50) for client list
  2. User sees loading indicator when loading next page
  3. User sees "End of list" when all items loaded
  4. User can scroll to load more items continuously
  5. Large datasets (500+ items) paginate without performance degradation
**Plans**: 3 plans (2 waves)

Plans:
- [x] 13-01-PLAN.md — Query key factory + useInfiniteClients hook + useLocalStorage (Wave 1)
- [x] 13-02-PLAN.md — Pagination UI components (Wave 1, parallel with 13-01)
- [x] 13-03-PLAN.md — People.tsx integration (Wave 2)

### Phase 14: Render Optimization
**Goal**: Profile and optimize render performance with selective memoization.
**Depends on**: Phase 13
**Requirements**: OPT-01 (skeleton/spinner), OPT-02 (responsive mutations), OPT-03 (profiling), OPT-04 (CoachCalendar memo)
**Success Criteria** (what must be TRUE):
  1. User sees skeleton UI during data load (not blank screens)
  2. User sees button loading states during mutations
  3. Developer has profiling data identifying render bottlenecks
  4. CoachCalendar re-renders only when relevant data changes
**Plans**: TBD

Plans:
- [ ] 14-01: Loading State Audit
- [ ] 14-02: Performance Profiling
- [ ] 14-03: CoachCalendar Memoization

---

## Progress

**Execution Order:**
Phases execute in numeric order: 9 -> 10 -> 11 -> 12 -> 13 -> 14

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
| 14. Render Optimization | v2.0 | 0/3 | Not started | - |

---

*Roadmap created: 2026-01-26*
*Milestone v2.0 Performance: 6 phases, 17 requirements*
