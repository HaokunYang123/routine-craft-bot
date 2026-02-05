## Current Architecture Decision
- All task assignment functionality lives inside GroupDetail.tsx Tasks tab
- Top-level Tasks page is being deprecated
- GroupDetail has three tabs: Overview | Tasks | Notes
- AssignTaskModal handles both group and individual assignment modes
- "Assign to Group" button is page-level and always visible
- Overview tab is read-only (no per-student actions)
- Tasks tab contains per-student assignment actions
- Navigation: Dashboard group cards → /groups/:groupId (Overview), Tasks page → /groups/:groupId?tab=tasks
