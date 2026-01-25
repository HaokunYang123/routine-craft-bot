# Codebase Structure

**Analysis Date:** 2026-01-24

## Directory Layout

```
routine-craft-bot/
├── src/                       # Main source directory
│   ├── components/            # Reusable UI components
│   │   ├── ui/               # Primitive shadcn/ui components
│   │   ├── auth/             # Authentication components
│   │   ├── dashboard/        # Dashboard-specific components
│   │   ├── student/          # Student-specific components
│   │   ├── groups/           # Group management components
│   │   ├── people/           # People/team components
│   │   ├── templates/        # Template builder components
│   │   ├── ai/               # AI assistant components
│   │   ├── ProtectedRoute.tsx # Role-based route protection
│   │   ├── CheckInModal.tsx  # Task check-in modal
│   │   ├── FloatingAI.tsx    # Floating AI assistant UI
│   │   └── [Feature].tsx     # Feature-specific components
│   │
│   ├── pages/                 # Full-page components and layouts
│   │   ├── student/          # Student app pages
│   │   │   ├── StudentLayout.tsx
│   │   │   ├── StudentHome.tsx
│   │   │   ├── StudentCalendar.tsx
│   │   │   ├── StudentSettings.tsx
│   │   │   └── [StudentPage].tsx
│   │   ├── DashboardLayout.tsx    # Coach dashboard wrapper
│   │   ├── CoachDashboard.tsx     # Coach home dashboard
│   │   ├── Index.tsx              # Login/auth page
│   │   ├── Auth.tsx               # Auth routing
│   │   ├── Tasks.tsx              # Task management page
│   │   ├── People.tsx             # People management
│   │   ├── Templates.tsx          # Template builder
│   │   └── [Page].tsx             # Other pages (Progress, Assistant, etc.)
│   │
│   ├── hooks/                 # Custom React hooks (state + logic)
│   │   ├── useAuth.tsx       # Auth state management
│   │   ├── useProfile.ts     # User profile state
│   │   ├── useAssignments.ts # Assignment/task CRUD
│   │   ├── useGroups.ts      # Group management
│   │   ├── useTemplates.ts   # Template management
│   │   ├── useStickers.ts    # Sticker/reward system
│   │   ├── useRecurringSchedules.ts
│   │   ├── useClassCode.ts   # Class code generation/validation
│   │   ├── useAIAssistant.ts # AI integration
│   │   ├── use-toast.ts      # Toast notifications
│   │   └── [Feature]Hook.ts  # Other domain hooks
│   │
│   ├── integrations/         # External service integrations
│   │   └── supabase/        # Supabase client & types
│   │       ├── client.ts    # Supabase client initialization
│   │       └── types.ts     # Auto-generated TypeScript types
│   │
│   ├── lib/                  # Utilities and helpers
│   │   └── utils.ts         # cn(), date helpers (safeParseISO, safeFormatDate)
│   │
│   ├── App.tsx              # Main app with route definitions
│   ├── main.tsx             # React DOM mount point
│   ├── index.css            # Global styles + Tailwind imports
│   └── vite-env.d.ts        # Vite environment types
│
├── public/                   # Static assets
│   ├── favicon.ico
│   ├── pwa-192x192.png      # PWA icons
│   └── [asset]
│
├── .planning/                # GSD planning documents (generated)
│   └── codebase/            # Architecture & structure docs
│
├── vite.config.ts           # Vite build config + PWA plugin
├── tsconfig.json            # TypeScript configuration
├── package.json             # Dependencies + scripts
├── tailwind.config.ts       # Tailwind CSS theme
├── eslint.config.js         # ESLint rules
└── .env.example             # Environment variable template
```

## Directory Purposes

**src/components/ui/:**
- Purpose: Base primitives from shadcn/ui (Button, Dialog, Form, Input, etc.)
- Contains: Wrapper components around Radix UI primitives with Tailwind styling
- Key files: `button.tsx`, `dialog.tsx`, `form.tsx`, `input.tsx`, `card.tsx`, `sidebar.tsx`

**src/components/auth/:**
- Purpose: Authentication-related components (login, registration, role selection)
- Contains: CoachAuth, StudentAuth, MultiAuthLogin, QRScanner, ClassCodeForm, RoleSelection
- Key files: `MultiAuthLogin.tsx` (entry point), `QRScanner.tsx` (group joining), `StudentAuth.tsx`, `CoachAuth.tsx`

**src/components/dashboard/:**
- Purpose: Coach dashboard layout and widgets
- Contains: CoachSidebar, OverviewWidgets, StudentDetailSheet
- Key files: `CoachSidebar.tsx` (navigation), `OverviewWidgets.tsx` (dashboard stats)

**src/components/student/:**
- Purpose: Student-specific UI components
- Contains: InstructorsList, JoinInstructor
- Key files: `JoinInstructor.tsx` (class code entry)

**src/components/groups/:**
- Purpose: Group visualization and management
- Contains: GroupReviewCard (displays group with member stats)
- Key files: `GroupReviewCard.tsx`

**src/components/people/:**
- Purpose: User/team management components
- Contains: InviteTools
- Key files: `InviteTools.tsx`

**src/components/templates/:**
- Purpose: Task template builder
- Contains: ManualTemplateBuilder
- Key files: `ManualTemplateBuilder.tsx`

**src/components/ai/:**
- Purpose: AI assistant features
- Contains: AIPlanBuilder, InputWithMagicWand, FloatingAI
- Key files: `AIPlanBuilder.tsx` (AI task generation), `InputWithMagicWand.tsx` (AI prompt input)

**src/pages/:**
- Purpose: Full-page/route components
- Contains: Layouts (DashboardLayout, StudentLayout), page views (CoachDashboard, Tasks, Progress, etc.)
- Key files: `DashboardLayout.tsx` (coach wrapper), `StudentLayout.tsx` (student wrapper), `Index.tsx` (auth entry)

**src/pages/student/:**
- Purpose: Student-facing pages and layouts
- Contains: StudentLayout (navigation + outlet), StudentHome, StudentCalendar, StudentSettings, StudentSchedule, StudentTasks
- Key files: `StudentLayout.tsx`, `StudentHome.tsx` (main task view)

**src/hooks/:**
- Purpose: Encapsulate domain logic and state management
- Contains: Custom React hooks for auth, profiles, data CRUD operations
- Key files: `useAuth.tsx` (auth state), `useAssignments.ts` (task/assignment CRUD), `useGroups.ts` (group CRUD), `useProfile.ts` (user data)
- Pattern: Each hook returns object with state + callback functions; uses Supabase client directly

**src/integrations/supabase/:**
- Purpose: Backend integration layer
- Contains: Supabase client configuration, auto-generated TypeScript types
- Key files: `client.ts` (initialized client with auto token refresh), `types.ts` (database schema types)

**src/lib/:**
- Purpose: Shared utilities
- Contains: Helper functions for classNames, date parsing/formatting
- Key files: `utils.ts` (cn(), safeParseISO, safeFormatDate)

## Key File Locations

**Entry Points:**
- `src/main.tsx`: React DOM mount, imports App
- `src/App.tsx`: Route definitions, global providers (QueryClientProvider, TooltipProvider)
- `src/pages/Index.tsx`: Auth entry point (redirects to role selection or dashboard)

**Authentication & Authorization:**
- `src/hooks/useAuth.tsx`: Auth state subscription, signOut function
- `src/hooks/useProfile.ts`: Profile fetch/update, auto-creation on first login
- `src/components/ProtectedRoute.tsx`: Role-based access control wrapper
- `src/components/auth/MultiAuthLogin.tsx`: Coach/student login UI

**Core Data Hooks:**
- `src/hooks/useAssignments.ts`: Assignment CRUD, task scheduling, progress calculation (570 lines, complex logic)
- `src/hooks/useGroups.ts`: Group CRUD, member management
- `src/hooks/useTemplates.ts`: Template CRUD
- `src/hooks/useProfile.ts`: User profile state

**Coach Dashboard:**
- `src/pages/DashboardLayout.tsx`: Layout wrapper with header, sidebar
- `src/pages/CoachDashboard.tsx`: Main coach view (group cards, quick stats)
- `src/pages/Tasks.tsx`: Task/assignment management
- `src/pages/Templates.tsx`: Template builder
- `src/pages/People.tsx`: Student/team management
- `src/components/dashboard/CoachSidebar.tsx`: Navigation menu

**Student App:**
- `src/pages/student/StudentLayout.tsx`: Layout with bottom nav
- `src/pages/student/StudentHome.tsx`: Main student task view
- `src/pages/student/StudentCalendar.tsx`: Calendar view of tasks
- `src/pages/student/StudentSettings.tsx`: User settings

**Configuration:**
- `vite.config.ts`: Build config, PWA plugin, path aliases
- `tsconfig.json`: TypeScript strict mode, path aliases (@/*)
- `tailwind.config.ts`: Theme colors, typography, spacing
- `eslint.config.js`: Linting rules

**Supabase Integration:**
- `src/integrations/supabase/client.ts`: Client initialization with env vars
- `src/integrations/supabase/types.ts`: Auto-generated types from Supabase schema

## Naming Conventions

**Files:**
- Components: PascalCase (e.g., `CoachDashboard.tsx`, `StudentHome.tsx`)
- Hooks: camelCase starting with "use" (e.g., `useAuth.tsx`, `useAssignments.ts`)
- Utils/lib: camelCase (e.g., `utils.ts`, `client.ts`)
- UI primitives: kebab-case (e.g., `alert-dialog.tsx`, `form.tsx`)

**Directories:**
- Components: kebab-case or PascalCase for feature groups (e.g., `components/auth/`, `components/dashboard/`)
- Pages: PascalCase matching component exports (e.g., `pages/CoachDashboard.tsx`, `pages/student/StudentHome.tsx`)
- Hooks: `hooks/` directory with camelCase files

**Functions & Variables:**
- React components: PascalCase (export default function CoachDashboard)
- Hook functions: camelCase (fetchGroups, createAssignment)
- State variables: camelCase (groups, loading, groupsWithStats)
- Types/Interfaces: PascalCase (Group, Assignment, TaskInstance, Profile)
- Constants: UPPER_SNAKE_CASE (GROUP_COLORS, DEFAULT_TIMEOUT)

**CSS Classes:**
- BEM pattern mixed with Tailwind utility classes
- Custom CSS variables: --primary, --destructive, --muted, --cta-primary (defined in index.css)
- Theme classes: coach-theme, student-theme (applied to layout divs)

## Where to Add New Code

**New Feature (e.g., "Rewards System"):**
- Primary code: `src/hooks/useRewards.ts` (state + CRUD)
- Components: `src/components/rewards/RewardCard.tsx`, `src/components/rewards/RewardBadge.tsx`
- Page: `src/pages/Rewards.tsx` (if a full page view needed)
- Route: Add to routes in `src/App.tsx`

**New Component/Module:**
- Shared component (used by multiple features): `src/components/[FeatureName]/[ComponentName].tsx`
- Feature-specific component: Create subdirectory under `src/components/` (e.g., `src/components/notifications/`)
- UI primitive (new shadcn component): Add to `src/components/ui/[component].tsx`

**Utilities & Helpers:**
- Shared helpers: `src/lib/utils.ts` (append functions)
- Domain-specific helpers: Create hook or util file in feature directory (e.g., `src/hooks/useAssignmentsHelper.ts`)

**Data Hooks:**
- New domain entity: Create `src/hooks/use[Entity].ts` file
- Pattern: Follow useGroups or useAssignments structure
  - Export interfaces for the entity (Assignment, Group, etc.)
  - Use useCallback for async operations
  - Integrate with supabase client for queries/mutations
  - Use toast for user feedback
  - Return object with state + functions

**Pages:**
- New page route: Create file in `src/pages/[PageName].tsx`
- Coach-specific page: Create in `src/pages/` and add route to DashboardLayout in App.tsx
- Student-specific page: Create in `src/pages/student/` and add route to StudentLayout in App.tsx

**Route additions:**
- Edit `src/App.tsx` Routes section
- Protected routes wrap with `<ProtectedRoute requiredRole="coach">` or `requiredRole="student"`
- Use nested route structure for layouts (DashboardLayout, StudentLayout)

## Special Directories

**src/integrations/:**
- Purpose: External service clients and configurations
- Generated: types.ts is auto-generated from Supabase schema
- Committed: Yes, both client.ts and types.ts committed to version control
- Update types.ts by running Supabase CLI when database schema changes

**node_modules/:**
- Purpose: Installed dependencies
- Generated: Yes (from package.json + package-lock.json)
- Committed: No
- Manage with npm/yarn commands

**.planning/codebase/:**
- Purpose: GSD (Get Stuff Done) codebase analysis documents
- Generated: Yes (by mapper agent)
- Committed: No (temporary analysis docs)

**public/:**
- Purpose: Static assets served at build time
- Generated: No (manual additions)
- Committed: Yes (except pwa-*.png icons which are generated)

---

*Structure analysis: 2026-01-24*
