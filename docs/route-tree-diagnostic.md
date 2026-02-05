# Route Tree Diagnostic (from src/App.tsx)

## Routes
- `/` → `Index`
- `/login` → `Index`
- `/login/coach` → `Index`
- `/login/student` → `Index`
- `/auth/callback` → `AuthCallback`
- `/onboarding` → `Onboarding`

- `/dashboard` → `DashboardLayout` (wrapped in `RouteErrorBoundary`)
  - index → `CoachDashboard`
  - `calendar` → `CoachCalendar`
  - `people` → `People`
  - `templates` → `Templates`
  - `recurring` → `RecurringSchedules`
  - `settings` → `CoachSettings`
  - `tasks` → `Tasks`
  - `assistant` → `Assistant`
  - `progress` → `Progress`

- `/groups` → `DashboardLayout` (wrapped in `RouteErrorBoundary`)
  - `:groupId` → `GroupDetail`

- `/assigner-dashboard` → `DashboardLayout` (wrapped in `RouteErrorBoundary`)
  - index → `AssignerDashboard`

- `/app` → `StudentLayout` (wrapped in `RouteErrorBoundary`)
  - index → `StudentHome`
  - `calendar` → `StudentCalendar`
  - `settings` → `StudentSettings`
  - `help` → `StudentHelp`

- `/assignee-dashboard` → `StudentLayout` (wrapped in `RouteErrorBoundary`)
  - index → `AssigneeDashboard`

- `/ui` → `PolygonShowcase`
- `*` → `NotFound`

## Notes
- `/dashboard` and `/groups/:groupId` are sibling routes that both use `DashboardLayout` as their route element.
- `CoachDashboard` is only rendered as the index child of `/dashboard`.
