# Architecture

**Analysis Date:** 2026-01-24

## Pattern Overview

**Overall:** Component-Driven SPA with Hooks-Based State Management and Supabase Data Layer

**Key Characteristics:**
- Client-side React application using React Router for navigation
- Custom React hooks for domain logic encapsulation (useAuth, useProfile, useAssignments, useGroups)
- Supabase as backend (authentication + database + real-time subscriptions)
- TanStack React Query (React Query v5) for async state management
- Role-based access control (coach/student) via ProtectedRoute wrapper
- Dual application modes within single codebase: Coach Dashboard + Student PWA

## Layers

**Presentation Layer:**
- Purpose: UI rendering and user interaction handling
- Location: `src/components/` and `src/pages/`
- Contains: React components using shadcn/ui + Radix UI primitives, page layouts, feature-specific dialogs/modals
- Depends on: Custom hooks (data fetching/auth), UI libraries, utilities
- Used by: Route definitions in `src/App.tsx`

**Data Access Layer:**
- Purpose: Direct Supabase client integration, query building, mutation execution
- Location: `src/integrations/supabase/client.ts`
- Contains: Supabase client initialization with auto-refresh token, type-safe schema via generated types.ts
- Depends on: @supabase/supabase-js SDK
- Used by: Custom hooks for all data operations

**State Management Layer:**
- Purpose: Manage auth state, profile data, domain entity state (assignments, groups, tasks)
- Location: `src/hooks/`
- Contains: Custom hooks (useAuth, useProfile, useAssignments, useGroups, useTemplates, useStickers, useRecurringSchedules, useClassCode)
- Depends on: Supabase client, toast notifications, React Query for caching
- Used by: Page components directly via useState/useCallback patterns

**Route/Layout Layer:**
- Purpose: Navigation structure, layout composition, role-based access control
- Location: `src/App.tsx` (route definitions), `src/pages/*Layout.tsx` files
- Contains: Router configuration, layout components (DashboardLayout, StudentLayout), ProtectedRoute wrapper
- Depends on: React Router, auth/profile hooks
- Used by: Main App component

**Utility Layer:**
- Purpose: Shared helper functions and utilities
- Location: `src/lib/utils.ts`
- Contains: cn() for className merging, date parsing/formatting helpers (safeParseISO, safeFormatDate)
- Depends on: clsx, tailwind-merge, date-fns
- Used by: Components and hooks throughout

## Data Flow

**Authentication Flow:**

1. User lands on `/` (Index page) or specific login routes
2. `useAuth()` hook subscribes to Supabase auth state changes via `onAuthStateChange()`
3. Auth state (user, session) available to all protected pages via `useAuth()` hook
4. `ProtectedRoute` component checks user existence and role from profile table
5. Role mismatch redirects to appropriate dashboard (`/dashboard` for coach, `/app` for student)

**Assignment Creation Flow:**

1. Coach creates assignment via dialog in `CoachDashboard.tsx`
2. Dialog calls `createAssignment()` from `useAssignments()` hook
3. Hook creates: assignment record → fetches assignees from group_members or direct assignment
4. Calculates scheduled dates based on schedule_type (once/daily/weekly/custom)
5. Generates task_instance rows (one per assignee × date combination)
6. Inserts all instances to Supabase in batch
7. Toast notification on success/failure

**Task Completion Flow:**

1. Student views tasks in `/app` (StudentHome.tsx)
2. Checks task checkbox or clicks "Complete"
3. Calls `updateTaskStatus()` from `useAssignments()`
4. Updates task_instances record: sets status='completed', completed_at=now
5. Local state updates, UI reflects completion
6. Toast confirmation shown to student

**Group Management Flow:**

1. Coach creates/manages groups via `CoachDashboard.tsx`
2. `useGroups()` hook handles CRUD operations on groups table
3. Students join groups via class code (QRScanner or manual entry in StudentAuth.tsx)
4. Joining creates group_members record linking student to group
5. Groups fetched with member counts via separate count queries

## Key Abstractions

**Profile:**
- Purpose: Represents user identity and role (coach/student)
- Examples: `src/hooks/useProfile.ts`
- Pattern: Fetched from profiles table on auth state change, cached in hook state, auto-created on first login

**Assignment:**
- Purpose: Represents a scheduled task or routine to be completed by assignee(s)
- Examples: `src/hooks/useAssignments.ts` (Assignment interface)
- Pattern: Created with template_id or custom tasks, specifies scheduling (once/daily/weekly/custom), spawns task_instances

**TaskInstance:**
- Purpose: Individual task scheduled for a specific assignee on a specific date
- Examples: `src/hooks/useAssignments.ts` (TaskInstance interface)
- Pattern: Immutable once created, status tracked (pending/completed/missed), can be updated by assignee

**Group:**
- Purpose: Collection of students managed by a coach
- Examples: `src/hooks/useGroups.ts` (Group interface)
- Pattern: Created by coach, students join via code, used for bulk task assignment

**Template:**
- Purpose: Reusable task sequence with day_offset values for scheduling
- Examples: `src/hooks/useTemplates.ts`
- Pattern: Contains template_tasks with day_offset (relative scheduling), can be cloned to create assignments

## Entry Points

**Application Entry:**
- Location: `src/main.tsx`
- Triggers: Page load
- Responsibilities: Mount React app to DOM root element

**App Component:**
- Location: `src/App.tsx`
- Triggers: After React mount
- Responsibilities: Set up route definitions, global providers (QueryClientProvider, TooltipProvider, auth/toast UI)

**Index/Auth Page:**
- Location: `src/pages/Index.tsx`
- Triggers: Navigation to `/` or login routes
- Responsibilities: Display role selection (coach/student), delegate to CoachAuth or StudentAuth components

**Coach Dashboard:**
- Location: `src/pages/DashboardLayout.tsx` + `src/pages/CoachDashboard.tsx`
- Triggers: Navigation to `/dashboard` with coach role
- Responsibilities: Display groups, create assignments, view progress, manage templates/people/settings

**Student App:**
- Location: `src/pages/student/StudentLayout.tsx` + `src/pages/student/StudentHome.tsx`
- Triggers: Navigation to `/app` with student role
- Responsibilities: Display assigned tasks, track completion, manage group connections

## Error Handling

**Strategy:** Try-catch at hook level + user feedback via toast notifications + console logging for debugging

**Patterns:**
- Supabase errors caught in try-catch blocks within hook functions
- Validation occurs before database operations (profile existence, user authentication)
- Toast notifications (via sonner/react-hot-toast) for success and error messages
- Fallback values used for data presentation (e.g., email prefix as display name if profile missing)
- Role-based redirects in ProtectedRoute prevent unauthorized access

Example error pattern from `useProfile.ts`:
```typescript
try {
  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
  if (error) {
    if (error.code === "PGRST116") {
      // Profile doesn't exist - auto-create with default values
      const newProfile = { user_id: user.id, display_name: user.email?.split("@")[0], ... };
      // Insert and handle
    } else {
      throw error;
    }
  }
} catch (error) {
  console.error("Error fetching profile:", error);
  // UI remains functional with fallbacks
}
```

## Cross-Cutting Concerns

**Logging:**
- Console.log/error used throughout hooks for debugging (particularly verbose in useAssignments.ts for task scheduling logic)
- No structured logging framework; debugging relies on browser console

**Validation:**
- Zod used for form validation in components (react-hook-form + @hookform/resolvers integration)
- Database schema constraints enforced at Supabase level
- Client-side validation via form components before submission

**Authentication:**
- Supabase Auth handles user sessions with auto token refresh
- localStorage persists sessions across page reloads
- useAuth hook subscribes to auth state changes globally
- ProtectedRoute enforces role-based access at route level

**Date Handling:**
- date-fns library for all date manipulation
- ISO 8601 strings ("YYYY-MM-DD") used for scheduled_date in database
- safeParseISO() and safeFormatDate() utilities handle invalid dates gracefully
- Timezone: assumes local browser timezone (dates parsed as local, not UTC)

**UI Consistency:**
- shadcn/ui components with Radix UI primitives (buttons, dialogs, forms, etc.)
- Tailwind CSS for styling with custom theme variables (--primary, --destructive, --muted, etc.)
- Two theme modes: coach-theme and student-theme (applied via CSS classes on layout divs)
- Dark mode support via next-themes integration

---

*Architecture analysis: 2026-01-24*
