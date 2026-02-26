import { test, expect, Page, BrowserContext } from '@playwright/test';
import { injectSession, mockUsers, getMockProfile } from './utils/auth-fixture';

const SUPABASE_PROJECT_ID = 'vjzaayxeoeojuccbriid';
const AUTH_STORAGE_KEY = `sb-${SUPABASE_PROJECT_ID}-auth-token`;

/**
 * Sets up mock API routes for Supabase auth and profile endpoints
 */
async function setupSupabaseMocks(
  page: Page,
  options: {
    userType: 'coach' | 'student' | 'newUser';
    hasProfile?: boolean;
  }
) {
  const { userType, hasProfile = true } = options;
  const user = mockUsers[userType] ?? mockUsers.student;
  const profile = hasProfile ? getMockProfile(userType) : null;

  // Mock Supabase auth session endpoint
  await page.route('**/auth/v1/token**', async (route) => {
    const session = createSessionResponse(user);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session),
    });
  });

  // Mock Supabase auth user endpoint
  await page.route('**/auth/v1/user', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: user.id,
        email: user.email,
        app_metadata: { provider: 'google' },
        user_metadata: { role: user.role },
      }),
    });
  });

  // Mock profiles table queries
  await page.route('**/rest/v1/profiles**', async (route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(profile ? [profile] : []),
      });
    } else if (method === 'PATCH' || method === 'POST') {
      // Profile update/creation
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(profile),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Creates a mock session response
 */
function createSessionResponse(user: typeof mockUsers.coach) {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: `mock-token-${user.id}`,
    refresh_token: `mock-refresh-${user.id}`,
    expires_in: 3600,
    expires_at: now + 3600,
    token_type: 'bearer',
    user: {
      id: user.id,
      email: user.email,
      app_metadata: { provider: 'google' },
      user_metadata: { role: user.role },
    },
  };
}

test.describe('Authentication Flow', () => {
  test.describe('Scenario A: New User Sign-Up Flow', () => {
    test('Student sign-up redirects to /app after OAuth callback', async ({
      page,
      context,
    }) => {
      // Start without a session
      await page.goto('/');

      // Verify we're on the auth page
      await expect(page).toHaveURL('/');

      // Look for sign-up tab and student option
      const signUpTab = page.getByRole('tab', { name: /sign up/i });
      if (await signUpTab.isVisible()) {
        await signUpTab.click();
      }

      // Verify student sign-up button exists (exact match to avoid "students" in coach button)
      const studentButton = page.getByRole('button', { name: /^Student/i });
      await expect(studentButton.first()).toBeVisible();

      // Now simulate the OAuth callback with a student session
      await injectSession(context, 'student');
      await setupSupabaseMocks(page, { userType: 'student' });

      // Navigate to the callback URL as if returning from Google OAuth
      await page.goto('/auth/callback?intent=signup&role=student');

      // Should redirect to student dashboard
      await expect(page).toHaveURL('/app', { timeout: 10000 });
    });

    test('Coach sign-up redirects to /dashboard after OAuth callback', async ({
      page,
      context,
    }) => {
      await page.goto('/');

      // Look for sign-up tab and coach option
      const signUpTab = page.getByRole('tab', { name: /sign up/i });
      if (await signUpTab.isVisible()) {
        await signUpTab.click();
      }

      // Verify coach sign-up button exists
      const coachButton = page.getByRole('button', { name: /^Coach/i });
      await expect(coachButton.first()).toBeVisible();

      // Simulate OAuth callback with coach session
      await injectSession(context, 'coach');
      await setupSupabaseMocks(page, { userType: 'coach' });

      await page.goto('/auth/callback?intent=signup&role=coach');

      // Should redirect to coach dashboard
      await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
    });
  });

  test.describe('Scenario B: Returning User Login', () => {
    test('Returning coach is redirected to /dashboard', async ({
      page,
      context,
    }) => {
      // Inject coach session before navigating
      await injectSession(context, 'coach');
      await setupSupabaseMocks(page, { userType: 'coach' });

      // Navigate to login - should redirect to dashboard
      await page.goto('/auth/callback?intent=login');

      await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
    });

    test('Returning student is redirected to /app', async ({
      page,
      context,
    }) => {
      // Inject student session before navigating
      await injectSession(context, 'student');
      await setupSupabaseMocks(page, { userType: 'student' });

      // Navigate to login callback
      await page.goto('/auth/callback?intent=login');

      await expect(page).toHaveURL('/app', { timeout: 10000 });
    });

    test('Login button is visible on auth page', async ({ page }) => {
      await page.goto('/');

      // Verify login tab exists
      const loginTab = page.getByRole('tab', { name: /log in/i });
      await expect(loginTab).toBeVisible();
    });
  });

  test.describe('Scenario C: Route Protection & Redirects', () => {
    test('Student cannot access /dashboard (coach route)', async ({
      page,
      context,
    }) => {
      // Inject student session
      await injectSession(context, 'student');
      await setupSupabaseMocks(page, { userType: 'student' });

      // Try to access coach dashboard
      await page.goto('/dashboard');

      // Should be redirected away from /dashboard
      // Either to /app (student dashboard) or / (auth page)
      await page.waitForURL((url) => {
        const path = url.pathname;
        return path === '/app' || path === '/' || path.startsWith('/app/');
      }, { timeout: 10000 });

      // Verify not on coach dashboard
      expect(page.url()).not.toContain('/dashboard');
    });

    test('Coach cannot access /app (student route)', async ({
      page,
      context,
    }) => {
      // Inject coach session
      await injectSession(context, 'coach');
      await setupSupabaseMocks(page, { userType: 'coach' });

      // Try to access student app
      await page.goto('/app');

      // Should be redirected away from /app
      await page.waitForURL((url) => {
        const path = url.pathname;
        return path === '/dashboard' || path === '/' || path.startsWith('/dashboard/');
      }, { timeout: 10000 });

      // Verify not on student app
      expect(page.url()).not.toContain('/app');
    });

    test('Unauthenticated user is redirected from protected routes', async ({
      page,
    }) => {
      // No session injected

      // Try to access coach dashboard
      await page.goto('/dashboard');

      // Should be redirected to auth page
      await expect(page).toHaveURL('/', { timeout: 10000 });
    });

    test('Unauthenticated user is redirected from student app', async ({
      page,
    }) => {
      // No session injected

      // Try to access student app
      await page.goto('/app');

      // Should be redirected to auth page
      await expect(page).toHaveURL('/', { timeout: 10000 });
    });
  });
});

test.describe('Auth Page UI', () => {
  test('Auth page shows login and signup tabs', async ({ page }) => {
    await page.goto('/');

    // Check for tab structure
    const loginTab = page.getByRole('tab', { name: /log in/i });
    const signUpTab = page.getByRole('tab', { name: /sign up/i });

    await expect(loginTab).toBeVisible();
    await expect(signUpTab).toBeVisible();
  });

  test('Sign-up tab shows role selection (Coach/Student)', async ({ page }) => {
    await page.goto('/');

    // Click sign-up tab
    const signUpTab = page.getByRole('tab', { name: /sign up/i });
    await signUpTab.click();

    // Verify role buttons are visible (use exact match to avoid "students" text)
    const coachButton = page.getByRole('button', { name: /^Coach/i });
    const studentButton = page.getByRole('button', { name: /^Student/i });

    await expect(coachButton.first()).toBeVisible();
    await expect(studentButton.first()).toBeVisible();
  });

  test('Login tab shows Google sign-in button', async ({ page }) => {
    await page.goto('/');

    // Click login tab
    const loginTab = page.getByRole('tab', { name: /log in/i });
    await loginTab.click();

    // Verify Google sign-in button exists
    const googleButton = page.getByRole('button', { name: /google/i });
    await expect(googleButton).toBeVisible();
  });
});
