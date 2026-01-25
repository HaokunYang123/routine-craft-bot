# Coding Conventions

**Analysis Date:** 2026-01-24

## Naming Patterns

**Files:**
- React components use PascalCase: `FloatingAI.tsx`, `CheckInModal.tsx`, `ProtectedRoute.tsx`
- Custom hooks use camelCase with `use` prefix: `useAuth.tsx`, `useGroups.ts`, `useAIAssistant.ts`
- Utility files use camelCase: `utils.ts`, `client.ts`
- UI component files use kebab-case or PascalCase: `alert-dialog.tsx`, `use-toast.ts`
- Pages use PascalCase: `CoachDashboard.tsx`, `StudentHome.tsx`

**Functions:**
- React components exported as default or named: `export default function CoachDashboard()`, `export function FloatingAI()`
- Custom hooks use camelCase: `export function useAuth()`, `export function useGroups()`
- Utility functions use camelCase: `export function cn()`, `export function safeParseISO()`
- Helper types prefixed with capital letters: `type ViewMode = "month" | "week" | "day"`, `type Sentiment = "great" | "okay" | "tired" | "sore"`

**Variables:**
- State variables use camelCase: `const [isOpen, setIsOpen] = useState(false)`
- Constants at module level use UPPER_SNAKE_CASE or camelCase: `const DAYS = ["Sun", "Mon", ...]`, `const queryClient = new QueryClient()`
- Interface properties use snake_case in database types, camelCase in TypeScript: `coach_id` (from DB), `groupId` (in TS types)
- Event handlers prefixed with `handle`: `handleSubmit`, `handleOpenChange`, `toggleListening`

**Types:**
- Interfaces use PascalCase: `interface CheckInModalProps`, `interface Group`, `interface ScheduledTask`
- Type aliases use PascalCase or descriptive names: `type UserRole = "coach" | "student"`, `type Sentiment = "great" | "okay" | "tired" | "sore"`
- Props interfaces end with `Props`: `CheckInModalProps`, `FloatingAIProps`

## Code Style

**Formatting:**
- No linter-specific config detected for Prettier
- Code appears loosely formatted with some long lines: `FloatingAI.tsx` has lines exceeding 120 characters
- Imports grouped but not strictly ordered

**Linting:**
- ESLint configured via `eslint.config.js` using flat config format
- Key rules:
  - `@typescript-eslint/no-unused-vars`: turned OFF (rule disabled)
  - `react-refresh/only-export-components`: WARN with `allowConstantExport: true`
  - `react-hooks/exhaustive-deps`: enforced (from recommended config)
- TypeScript strict mode enabled: `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, `strictNullChecks: true`

## Import Organization

**Order:**
1. External dependencies (React, hooks from libraries): `import { useState, useEffect } from "react"`
2. Internal hooks: `import { useAuth } from "@/hooks/useAuth"`
3. Supabase client: `import { supabase } from "@/integrations/supabase/client"`
4. UI components: `import { Button } from "@/components/ui/button"`
5. Feature components: `import { FloatingButton } from "@/components/ui/doodle"`
6. Icons/libraries: `import { MessageCircle, Send, Mic } from "lucide-react"`
7. Utility functions: `import { cn } from "@/lib/utils"`
8. Date utilities: `import { format, parseISO } from "date-fns"`

**Path Aliases:**
- `@/*` maps to `./src/*` (configured in `tsconfig.json`)
- All internal imports use `@/` prefix: `@/hooks/`, `@/components/`, `@/integrations/`, `@/lib/`, `@/pages/`

## Error Handling

**Patterns:**
- Try-catch with error logging: `console.error("Error message:", error)`
- Toast notifications for user-facing errors:
  ```typescript
  catch (error: any) {
    console.error("AI Chat error:", err);
    setMessages(prev => [...prev, { role: "assistant", content: err.message || "Fallback message" }]);
  }
  ```
- Supabase errors checked explicitly:
  ```typescript
  const { data, error } = await supabase...
  if (error) throw error;
  ```
- JWT-specific error handling: `if (error.message.includes("JWT")) { ... }`
- Type assertion with `as` for error handling: `catch (err: any)` then type assertion
- Null coalescing for undefined values: `session?.user ?? null`

## Logging

**Framework:** `console.error()` and `console.log()` - native browser console

**Patterns:**
- Error logging includes context: `console.error("Error fetching groups:", error)`
- Background operation errors logged but not shown to user: `console.error("Check-in check failed:", error)` with comment explaining why
- No toast shown for background checks to avoid user disruption
- Logging used for debugging JWT errors, API failures, and async state issues

## Comments

**When to Comment:**
- Explain complex logic or non-obvious behavior
- Document edge cases (e.g., JWT error handling, local storage sync)
- Explain why, not what (code should be self-documenting)
- Example from `CheckInModal.tsx`: `// If not in local storage, check DB (in case they logged in from another device)`

**JSDoc/TSDoc:**
- Limited use observed
- `safeParseISO` and `safeFormatDate` in `utils.ts` include JSDoc comments:
  ```typescript
  /**
   * Safely parse an ISO date string. Returns null if invalid.
   */
  export function safeParseISO(dateString: string | null | undefined): Date | null
  ```
- Not systematically applied across codebase

## Function Design

**Size:** Functions are concise, typically 20-60 lines. Complex logic split into smaller functions or hooks.

**Parameters:**
- Props interfaces for component parameters: `export function FloatingAI({ context = "...", placeholder = "..." }: FloatingAIProps)`
- Destructuring used consistently
- Default parameters provided: `placeholder = "Ask me anything..."`
- No required parameters without defaults in UI components

**Return Values:**
- React components return JSX.Element
- Hooks return objects with state and functions: `return { user, session, loading, signOut }`
- Utility functions return typed values: `Date | null`, `string`
- Async functions return Promise: `async function handleSubmit(): Promise<void>`
- Early returns used for guard clauses: `if (!user) return`

## Module Design

**Exports:**
- Named exports for custom hooks: `export function useAuth()`
- Default exports for page components: `export default function CoachDashboard()`
- Named exports for utility components: `export function FloatingAI()`, `export function TaskBreakdownButton()`
- Exported interfaces alongside implementations: `export interface Group { ... }`

**Barrel Files:**
- UI components have barrel file pattern with shadcn components
- Not observed in main feature code
- Each component typically exported individually

## String/Literal Handling

- Constants defined at module level: `const DAYS = ["Sun", "Mon", "Tue", ...]`
- Sentinel values as const arrays rather than inline magic strings
- Template literals used for dynamic content: `toast({ description: `"${name}" has been created` })`

## Type Safety Practices

- TypeScript strict mode enabled
- Type assertions with `as` when unavoidable: `setRole(data.role as UserRole)`
- Optional chaining: `session?.user ?? null`
- Discriminated unions: `type Sentiment = "great" | "okay" | "tired" | "sore"`
- Type-safe Supabase client with generated types: `import type { Database } from './types'`

---

*Convention analysis: 2026-01-24*
