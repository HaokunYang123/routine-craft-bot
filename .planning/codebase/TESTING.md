# Testing Patterns

**Analysis Date:** 2026-01-24

## Test Framework

**Runner:**
- Not detected
- No test runner configured in `package.json` (no vitest, jest, or cypress dependencies)
- No test scripts available (`npm test` not defined)

**Assertion Library:**
- None installed

**Run Commands:**
```bash
# No test commands configured
npm test              # Not available
npm run test          # Not available
npm run test:watch   # Not available
npm run test:coverage # Not available
```

## Test File Organization

**Location:**
- No test files found in source code (`src/` directory)
- All `.test.ts` and `.spec.tsx` files are in `node_modules/` from dependency packages (zod, react-day-picker, pg-protocol, etc.)

**Naming:**
- Standard pattern would be `*.test.ts` or `*.spec.tsx` but none implemented

**Structure:**
- Not applicable - no tests in codebase

## Test Structure

**Suite Organization:**
- Not implemented

**Patterns:**
- No setup/teardown hooks
- No test suites or describe blocks
- No before/after hooks

## Mocking

**Framework:**
- Not configured

**Patterns:**
- No mocking library installed (no @testing-library/react, jest, or vitest)
- Supabase client used directly in components without mocking infrastructure

**What to Mock:**
- N/A - recommend mocking: Supabase client calls, async API operations, React Router navigation

**What NOT to Mock:**
- N/A - recommend testing: utility functions (`cn()`, `safeParseISO()`, `safeFormatDate()`)

## Fixtures and Factories

**Test Data:**
- No test data factories detected
- Data appears to be sourced live from Supabase in components during development

**Location:**
- N/A - would typically be in `src/__fixtures__/` or `src/__mocks__/`

## Coverage

**Requirements:**
- None enforced
- No coverage config detected

**View Coverage:**
```bash
# No coverage reporting available
```

## Test Types

**Unit Tests:**
- Not implemented
- Candidates: utility functions in `src/lib/utils.ts`, custom hooks
- Example test candidates:
  - `cn()` function - style merging utility
  - `safeParseISO()` - date parsing with null handling
  - `safeFormatDate()` - date formatting with fallback

**Integration Tests:**
- Not implemented
- Candidates: custom hooks that interact with Supabase (e.g., `useAuth.tsx`, `useGroups.ts`)

**E2E Tests:**
- Not implemented
- Not configured

## Testing Recommendations

**Immediate Needs:**

1. **Set up test infrastructure:**
   - Install Vitest or Jest: `npm install -D vitest @testing-library/react @testing-library/jest-dom`
   - Add test script to `package.json`
   - Create `vitest.config.ts` or `jest.config.ts`

2. **Mock Supabase:**
   - Create `src/__mocks__/supabase.ts` for mocking the Supabase client
   - Pattern: mock `supabase.auth`, `supabase.from()`, `supabase.functions.invoke()`
   - Example fixture location: `src/__fixtures__/supabase-responses.ts`

3. **Start with utilities:**
   - Test `src/lib/utils.ts` functions first (highest ROI, no mocking needed)
   - Example test structure:
     ```typescript
     import { describe, it, expect } from 'vitest';
     import { cn, safeParseISO, safeFormatDate } from '@/lib/utils';

     describe('cn()', () => {
       it('merges class names correctly', () => {
         const result = cn('px-4 py-2', 'px-8');
         expect(result).toContain('px-8'); // tailwind-merge winner
       });
     });
     ```

4. **Hook testing:**
   - Install `@testing-library/react-hooks`
   - Test custom hooks in `src/hooks/` with mocked Supabase
   - Pattern: render hook with mock provider

5. **Component testing:**
   - Use `@testing-library/react` for component snapshots and interaction tests
   - Mock heavy dependencies (Supabase, Router)
   - Start with simple, presentational components (e.g., button variants)

## Current Testing Gap

The codebase currently has **zero test coverage**:
- No unit tests for utilities
- No component tests for React components
- No integration tests for API interactions
- No e2e tests for user flows

**Risk Areas (untested):**
- Supabase client interactions and error handling
- Custom hooks state management
- Component render logic with async data
- Date parsing/formatting edge cases
- Auth state management (`useAuth.tsx`)
- Group/assignment queries and mutations (`useGroups.ts`, `useAssignments.ts`)

## Performance Testing

**Not configured:**
- No performance benchmarks
- No Lighthouse CI
- No bundle analysis

---

*Testing analysis: 2026-01-24*
