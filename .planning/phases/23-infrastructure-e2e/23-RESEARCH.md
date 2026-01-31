# Phase 23: Infrastructure & E2E Testing - Research

**Researched:** 2026-01-31
**Domain:** Supabase Scalability Audit + Playwright E2E Testing
**Confidence:** HIGH

## Summary

This phase covers two distinct requirements: (1) validating Supabase can handle 100+ concurrent users and (2) implementing E2E tests with Playwright for critical user flows.

**For Supabase scalability (INFRA-01):** The project is on a hosted Supabase tier with connection pooling via Supavisor. For 100 concurrent users, Supabase easily handles this load - their free tier supports 500 connections with pooling, and production systems have handled 100,000+ concurrent sessions. The primary concern is RLS policy performance, which can cause dramatic slowdowns (11,000ms to 10ms difference with proper optimization). A documented audit with specific RLS optimizations and EXPLAIN ANALYZE results provides the required verification.

**For E2E testing (INFRA-02):** The project already has Playwright configured with auth mocking patterns in place. The existing `e2e/auth.spec.ts` demonstrates the session injection and API mocking approach needed for Google OAuth testing. The critical user flow (Coach login -> create group -> assign task -> Student login -> complete task) requires extending this pattern with Page Objects and proper test fixtures.

**Primary recommendation:** Focus the scalability audit on RLS policy analysis using EXPLAIN ANALYZE, and extend existing Playwright infrastructure with Page Objects covering the critical cross-role user flow.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @playwright/test | ^1.58.1 | E2E testing framework | Already installed, official Microsoft solution, best-in-class auto-waiting |
| Supabase Supavisor | Built-in | Connection pooling | Automatic with hosted Supabase, handles 1M+ connections |
| PostgreSQL EXPLAIN | Built-in | Query analysis | Standard for RLS performance audit |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | ^4.0.18 | Unit tests | Already configured in vite.config.ts |
| @testing-library/react | ^16.3.2 | Component testing | Already in use for unit tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Playwright | Cypress | Playwright has better multi-tab, cross-browser support; project already has Playwright |
| Manual RLS audit | pg_stat_statements | pg_stat_statements requires extension; EXPLAIN ANALYZE is sufficient for 100 users |

**No additional installation required** - Playwright is already configured.

## Architecture Patterns

### Existing E2E Structure (Preserve)
```
e2e/
├── auth.spec.ts           # Existing auth flow tests
├── utils/
│   └── auth-fixture.ts    # Session injection utilities
├── pages/                  # NEW: Page Objects
│   ├── auth.page.ts
│   ├── coach-dashboard.page.ts
│   ├── group-detail.page.ts
│   └── student-home.page.ts
└── flows/                  # NEW: Critical flow tests
    └── coach-student-task.spec.ts
```

### Pattern 1: Page Object Model (Playwright Official)
**What:** Encapsulate page interactions in reusable classes
**When to use:** Any page with multiple interactions or reused across tests
**Example:**
```typescript
// Source: https://playwright.dev/docs/pom
import { type Locator, type Page } from '@playwright/test';

export class CoachDashboardPage {
  readonly page: Page;
  readonly createGroupButton: Locator;
  readonly groupNameInput: Locator;
  readonly groupsList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createGroupButton = page.getByRole('button', { name: /create group/i });
    this.groupNameInput = page.getByLabel(/group name/i);
    this.groupsList = page.locator('[data-testid="groups-list"]');
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async createGroup(name: string) {
    await this.createGroupButton.click();
    await this.groupNameInput.fill(name);
    await this.page.getByRole('button', { name: /save|create/i }).click();
  }
}
```

### Pattern 2: Session Injection for OAuth (Already Implemented)
**What:** Inject mock Supabase session via localStorage before navigation
**When to use:** All authenticated E2E tests (Google OAuth cannot be automated)
**Example (from existing codebase):**
```typescript
// Source: e2e/utils/auth-fixture.ts (existing)
export async function injectSession(
  context: BrowserContext,
  userType: MockUserType
): Promise<void> {
  const user = mockUsers[userType];
  const session = createMockSession(user);

  await context.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    { key: AUTH_STORAGE_KEY, value: session }
  );
}
```

### Pattern 3: API Route Mocking for Supabase
**What:** Intercept Supabase REST API calls to control test data
**When to use:** Testing flows without hitting real database
**Example:**
```typescript
// Mock groups API response
await page.route('**/rest/v1/groups**', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{ id: 'test-group', name: 'Test Group', coach_id: 'coach-123' }]),
  });
});
```

### Pattern 4: RLS Performance Testing with EXPLAIN ANALYZE
**What:** Analyze query execution plans with RLS policies applied
**When to use:** Scalability audit to verify RLS performance
**Example:**
```sql
-- Source: https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv
SET session role authenticated;
SET request.jwt.claims TO '{"role":"authenticated", "sub":"test-user-uuid"}';
EXPLAIN ANALYZE SELECT * FROM task_instances WHERE assignee_id = 'test-user-uuid';
SET session role postgres;
```

### Anti-Patterns to Avoid
- **Real Google OAuth in tests:** Cannot be automated reliably; use session injection
- **Testing against production Supabase:** Use mocked API routes for E2E
- **Complex RLS without indexes:** Always index columns used in RLS policies
- **RLS with row-dependent subqueries:** Use `(SELECT auth.uid())` wrapper pattern

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth state for tests | Custom localStorage setup | Existing `auth-fixture.ts` | Already handles session format, roles |
| Connection pooling | Manual connection management | Supavisor (built-in) | Automatic with Supabase hosted |
| Query plan analysis | Custom metrics | EXPLAIN ANALYZE | PostgreSQL built-in, shows actual execution |
| Browser automation | Custom scripts | Playwright's auto-waiting | Handles async DOM updates automatically |
| CI workflow | Custom scripts | Playwright's official CI config | Tested, handles artifacts/reports |

**Key insight:** Playwright's auto-waiting eliminates most flaky test issues. Never add manual `sleep()` or `waitFor()` when Playwright actions already wait for elements.

## Common Pitfalls

### Pitfall 1: RLS Performance Degradation
**What goes wrong:** Queries slow from <1ms to 11+ seconds with poorly designed RLS
**Why it happens:** RLS policies run on every row; joins/subqueries multiply cost
**How to avoid:**
1. Wrap `auth.uid()` in SELECT: `(SELECT auth.uid()) = user_id`
2. Add indexes on RLS columns: `CREATE INDEX ON table (user_id)`
3. Use security definer functions for cross-table lookups
4. Add explicit filters in application code, not just RLS
**Warning signs:** Query times >100ms on tables with <10K rows

### Pitfall 2: OAuth Testing Approach
**What goes wrong:** Tests flake or get blocked by CAPTCHA/2FA
**Why it happens:** Google detects automated browsers
**How to avoid:**
1. Never automate real Google OAuth
2. Use session injection via localStorage (existing pattern)
3. Mock Supabase auth endpoints for token refresh
**Warning signs:** "Unusual activity" errors from Google

### Pitfall 3: Playwright Test Isolation
**What goes wrong:** Tests pass locally, fail in CI
**Why it happens:** Tests share state or depend on execution order
**How to avoid:**
1. Use fresh browser context per test (default)
2. Mock all API responses - don't rely on real data
3. Use unique test data identifiers per test
**Warning signs:** Tests fail only when run in parallel

### Pitfall 4: Missing Indexes on RLS Columns
**What goes wrong:** Full table scans on every authenticated query
**Why it happens:** RLS conditions checked for every row without index
**How to avoid:**
1. Audit all RLS policies for column references
2. Create indexes: `user_id`, `coach_id`, `group_id`, `assignee_id`
3. Use EXPLAIN ANALYZE to verify index usage
**Warning signs:** "Seq Scan" in query plans for filtered queries

### Pitfall 5: Supavisor Pool Size Misconfiguration
**What goes wrong:** Connection errors under load
**Why it happens:** Pool exhausted by long-running connections
**How to avoid:**
1. Use transaction mode (default) for short queries
2. Allocate 40% pool if using PostgREST heavily, 80% otherwise
3. Monitor `pg_stat_activity` for idle connections
**Warning signs:** "too many connections" errors

## Code Examples

Verified patterns from official sources:

### GitHub Actions CI Workflow
```yaml
# Source: https://playwright.dev/docs/ci-intro
# .github/workflows/playwright.yml
name: Playwright Tests
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: lts/*
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps
      - name: Run Playwright tests
        run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

### Critical Flow Test Structure
```typescript
// e2e/flows/coach-student-task.spec.ts
import { test, expect } from '@playwright/test';
import { injectSession, setupSupabaseMocks } from '../utils/auth-fixture';
import { CoachDashboardPage } from '../pages/coach-dashboard.page';
import { StudentHomePage } from '../pages/student-home.page';

test.describe('Coach-Student Task Flow', () => {
  test('Coach creates group, assigns task; Student completes task', async ({ browser }) => {
    // Coach actions in first context
    const coachContext = await browser.newContext();
    const coachPage = await coachContext.newPage();
    await injectSession(coachContext, 'coach');
    // ... setup mocks for coach APIs

    const coachDashboard = new CoachDashboardPage(coachPage);
    await coachDashboard.goto();
    await coachDashboard.createGroup('Test Class');
    // ... assign task

    // Student actions in second context
    const studentContext = await browser.newContext();
    const studentPage = await studentContext.newPage();
    await injectSession(studentContext, 'student');
    // ... setup mocks for student APIs

    const studentHome = new StudentHomePage(studentPage);
    await studentHome.goto();
    await studentHome.completeTask('Assigned Task');

    // Verify task completion visible to both roles
    await expect(studentHome.completedBadge).toBeVisible();
  });
});
```

### RLS Performance Optimization Example
```sql
-- Source: https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv

-- BEFORE (slow - function called per row)
CREATE POLICY "Users see own tasks" ON task_instances
  FOR SELECT USING (auth.uid() = assignee_id);

-- AFTER (fast - function cached via initPlan)
CREATE POLICY "Users see own tasks" ON task_instances
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = assignee_id);

-- Required index for performance
CREATE INDEX IF NOT EXISTS idx_task_instances_assignee
  ON task_instances (assignee_id);
```

### Scalability Audit Document Template
```markdown
# Supabase Scalability Audit

## Executive Summary
- Target: 100+ concurrent users
- Result: [PASS/CONDITIONAL/FAIL]
- Date: YYYY-MM-DD

## Connection Pooling
- Supavisor: Enabled (default)
- Pool mode: Transaction (default)
- Pool size: [X]% of max connections
- Max connections: [N] (from plan tier)

## RLS Policy Analysis

### task_instances table
| Policy | Before | After | Index |
|--------|--------|-------|-------|
| Users see own tasks | Xms | Yms | idx_task_instances_assignee |

### groups table
| Policy | Before | After | Index |
|--------|--------|-------|-------|
| ... | ... | ... | ... |

## Query Performance (EXPLAIN ANALYZE)
[Include actual EXPLAIN ANALYZE output for critical queries]

## Recommendations
1. [Specific recommendation]
2. [Specific recommendation]

## Conclusion
Supabase can handle 100+ concurrent users with current configuration because:
- Connection pooling provides [N] effective connections
- RLS policies execute in <[X]ms after optimization
- Critical tables have proper indexes
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| PgBouncer | Supavisor | 2024 | Built-in, simpler config, scales to 1M connections |
| playwright-github-action | CLI `npx playwright install --with-deps` | 2023 | Better version matching, official recommendation |
| Puppeteer stealth | Session injection | 2023 | Stealth plugins unmaintained; session injection reliable |
| Manual waitForSelector | Playwright auto-waiting | Built-in | Eliminates most flaky tests |

**Deprecated/outdated:**
- `puppeteer-extra-plugin-stealth`: Maintenance stopped March 2023
- `playwright-github-action`: Replaced by CLI approach per official docs
- PgBouncer manual setup: Supavisor is now automatic

## Open Questions

Things that couldn't be fully resolved:

1. **Exact Supabase plan connection limits**
   - What we know: Free tier has 500 connections with pooling
   - What's unclear: Project's exact tier and current connection count
   - Recommendation: Check Supabase dashboard during audit, document actual limits

2. **RLS policy review scope**
   - What we know: task_instances, groups, profiles are critical tables
   - What's unclear: All existing RLS policies and their current performance
   - Recommendation: Query `pg_policies` to enumerate all policies for audit

3. **CI environment secrets**
   - What we know: GitHub Actions needs SUPABASE_URL and SUPABASE_KEY
   - What's unclear: Whether these should use mock values or test project
   - Recommendation: Use mocked API routes; no real Supabase needed in CI

## Sources

### Primary (HIGH confidence)
- [Playwright Official Auth Docs](https://playwright.dev/docs/auth) - Session management patterns
- [Playwright CI Setup](https://playwright.dev/docs/ci-intro) - GitHub Actions workflow
- [Playwright Page Object Model](https://playwright.dev/docs/pom) - POM pattern examples
- [Supabase RLS Performance](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) - RLS optimization patterns
- [Supabase Connection Management](https://supabase.com/docs/guides/database/connection-management) - Pool size recommendations
- [Supabase Performance Tuning](https://supabase.com/docs/guides/platform/performance) - General optimization

### Secondary (MEDIUM confidence)
- [Supabase Supavisor 1M Connections](https://supabase.com/blog/supavisor-1-million) - Scalability benchmarks
- [Supabase GitHub Discussion #32670](https://github.com/orgs/supabase/discussions/32670) - Real-world concurrency experiences
- [Medium: Page Object Model Best Practices](https://medium.com/@anandpak108/page-object-model-in-playwright-with-typescript-best-practices-133fb349c462) - POM patterns

### Tertiary (LOW confidence - for validation)
- WebSearch results on Playwright React patterns - verify against official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Playwright already installed, Supabase docs comprehensive
- Architecture: HIGH - Existing e2e patterns in codebase, official Playwright patterns
- Pitfalls: HIGH - Official Supabase docs on RLS performance, Playwright CI docs

**Research date:** 2026-01-31
**Valid until:** 2026-03-01 (Supabase/Playwright APIs stable)
