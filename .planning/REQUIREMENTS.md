# Requirements: v2.0 Performance

**Milestone:** v2.0 Performance
**Created:** 2026-01-26
**Status:** Scoped

---

## v2.0 Requirements

### React Query Migration

- [ ] **RQ-01**: User experiences fast navigation with automatic data caching (no re-fetch within 5min)
- [ ] **RQ-02**: User sees loading states via `isPending` for all data fetches
- [ ] **RQ-03**: User sees error states via `isError` with clear feedback
- [ ] **RQ-04**: User sees fresh data when returning to app (background refetch on window focus)
- [ ] **RQ-05**: User experiences no duplicate network calls when multiple components request same data
- [ ] **RQ-06**: User receives confirmation feedback for all mutations (create/update/delete)
- [ ] **RQ-07**: User sees lists update immediately after create/edit/delete (query invalidation)
- [ ] **RQ-08**: User experiences instant task completion feedback (optimistic updates with rollback)

### Pagination

- [ ] **PAG-01**: User can control page size for large lists (clients, check-ins, task history)
- [ ] **PAG-02**: User sees loading indicator when changing pages
- [ ] **PAG-03**: User sees clear "end of list" indicator when no more data
- [ ] **PAG-04**: User experiences fast pagination on large datasets (cursor-based, not offset)
- [ ] **PAG-05**: User can scroll continuously to load more items (infinite scroll)

### Render Optimization

- [ ] **OPT-01**: User sees skeleton/spinner during data load, not blank screens
- [ ] **OPT-02**: User experiences responsive UI during mutations (button loading states)
- [ ] **OPT-03**: Developer has profiling data for render performance bottlenecks
- [ ] **OPT-04**: User experiences smoother CoachCalendar interactions (selective memoization)

---

## Future Requirements (Deferred)

### React Query Advanced (v2.1+)

- [ ] Prefetching on hover (near-instant navigation)
- [ ] Suspense integration (cleaner loading states)
- [ ] Parallel query optimization

### Pagination Advanced (v2.1+)

- [ ] Page prefetching (next page loads in background)
- [ ] Virtualized lists for 1000+ items

### Render Optimization Advanced (v2.1+)

- [ ] Code-splitting heavy components (lazy loading)
- [ ] useCallback optimization across components

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Offline support | Complex, not needed for current user base |
| Service worker caching | Adds complexity, defer to PWA milestone |
| useAuth migration to React Query | Uses Supabase auth subscriptions, not query pattern |
| useAIAssistant migration | Has custom retry logic, keep as-is |
| Global state management | React Query handles server state; no need for Redux/Zustand |
| 100% memo coverage | Diminishing returns; profile-driven optimization only |

---

## Traceability

*Populated by roadmapper after phase creation*

| Requirement | Phase | Status |
|-------------|-------|--------|
| RQ-01 | — | Pending |
| RQ-02 | — | Pending |
| RQ-03 | — | Pending |
| RQ-04 | — | Pending |
| RQ-05 | — | Pending |
| RQ-06 | — | Pending |
| RQ-07 | — | Pending |
| RQ-08 | — | Pending |
| PAG-01 | — | Pending |
| PAG-02 | — | Pending |
| PAG-03 | — | Pending |
| PAG-04 | — | Pending |
| PAG-05 | — | Pending |
| OPT-01 | — | Pending |
| OPT-02 | — | Pending |
| OPT-03 | — | Pending |
| OPT-04 | — | Pending |

---

*Requirements scoped: 2026-01-26*
