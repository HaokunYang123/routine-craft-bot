# Requirements: v4.0 Bug Fixes & Polish

**Defined:** 2026-01-31
**Core Value:** Users can reliably complete their daily workflows without UI inconsistencies or confusing behavior

## v4.0 Requirements

### Coach Dashboard

- [ ] **COACH-01**: Color picker in Create Group modal shows single color dot (not two)
- [ ] **COACH-02**: Remove "No group yet" empty state button, use only top-right "New Group" button

### Student Dashboard

- [ ] **STUDENT-01**: Remove "Delete Account" option from student settings
- [ ] **STUDENT-02**: Three-box layout always visible (My Group, Tasks to Do, Coach's Notes) regardless of task state
- [ ] **STUDENT-03**: Boxes are color-coded consistently

### Task Behavior

- [ ] **TASK-01**: Completed tasks disappear the next day (not visible in "today's tasks")
- [ ] **TASK-02**: Each day shows that day's tasks with correct completion state

### Task Assignment

- [ ] **ASSIGN-01**: Remove duplicate start/due date fields in custom task form
- [ ] **ASSIGN-02**: Keep recurring schedule functionality intact

### Security Removal

- [ ] **SEC-01**: Remove Change Password UI and backend
- [ ] **SEC-02**: Remove Two-Factor Authentication UI and backend
- [ ] **SEC-03**: Remove Download My Data UI and backend

### Infrastructure

- [ ] **INFRA-01**: Supabase scalability audit confirms support for 100+ concurrent users
- [ ] **INFRA-02**: E2E tests with Playwright for critical user flows

## Out of Scope

| Feature | Reason |
|---------|--------|
| New features | This milestone is bug fixes only |
| Mobile-specific fixes | PWA works, no mobile app |
| Performance optimization | v2.0 covered this |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| COACH-01 | 18 | Pending |
| COACH-02 | 18 | Pending |
| STUDENT-01 | 19 | Pending |
| STUDENT-02 | 19 | Pending |
| STUDENT-03 | 19 | Pending |
| TASK-01 | 20 | Pending |
| TASK-02 | 20 | Pending |
| ASSIGN-01 | 21 | Pending |
| ASSIGN-02 | 21 | Pending |
| SEC-01 | 22 | Pending |
| SEC-02 | 22 | Pending |
| SEC-03 | 22 | Pending |
| INFRA-01 | 23 | Pending |
| INFRA-02 | 23 | Pending |

**Coverage:**
- v4.0 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-31*
