# Group Detail Page Restructure Plan

## Current State
- Dashboard has group cards
- Tasks tab exists at top level
- Tabbed Group Detail page built with ?tab= routing (Overview, Tasks, Notes)
- Overview tab: read-only student list + join code + group stats
- Tasks tab: grouped task view with status filter + per-student assignment
- Notes tab: migrated existing content

## Target Architecture

### Dashboard (top level)
- Collapsible group cards (name, member count, join code, progress summary)
- Click group → /groups/:groupId (lands on Overview tab)

### Tasks tab (top level)
- Lists all groups (task-focused view)
- Click group → /groups/:groupId?tab=tasks

### Group Detail Page (route: /groups/:groupId)
Three internal tabs via ?tab= query param:

#### Overview Tab (default)
- Student list with progress (task count, completion %, on-track status)
- Join code display + QR code
- Read-only (no per-student actions)
- Delete group action via page-level settings menu

#### Tasks Tab
- "Assign to group" button at page level (header)
- Per-student assign buttons
- Template dropdown in assign modal
- Grouped task list by task name with inline expand/collapse
- Status filter: All | Active | Overdue | Completed
- Edit/revoke actions (future)

#### Notes Tab
- Compose note with audience dropdown (all students or individual)
- Note history

## Key Principle
Dashboard = "How are my students doing?" (read-only overview)
Tasks = "What do I want students to do?" (actions)
Notes = Communication
No duplication between views.

## Build Progress
- [x] Tabs shell + Overview tab
- [x] Tasks tab (assign modal integration, task list)
- [x] Notes tab (compose + history)
- [x] QR code for join code
- [x] Progress stats (completion %, on-track status)
