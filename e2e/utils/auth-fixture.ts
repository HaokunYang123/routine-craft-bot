import { test as base, BrowserContext } from '@playwright/test';

/**
 * Supabase project ID for localStorage key
 */
const SUPABASE_PROJECT_ID = 'vjzaayxeoeojuccbriid';
const AUTH_STORAGE_KEY = `sb-${SUPABASE_PROJECT_ID}-auth-token`;

/**
 * Mock user profiles for testing different roles
 */
export const mockUsers = {
  coach: {
    id: 'test-coach-user-id-123',
    email: 'coach@test.com',
    role: 'coach' as const,
  },
  student: {
    id: 'test-student-user-id-456',
    email: 'student@test.com',
    role: 'student' as const,
  },
  newUser: {
    id: 'test-new-user-id-789',
    email: 'newuser@test.com',
    role: null,
  },
};

type UserRole = 'coach' | 'student';
type MockUserType = keyof typeof mockUsers;

/**
 * Creates a mock Supabase session token structure
 * This mimics the format Supabase stores in localStorage
 */
function createMockSession(user: typeof mockUsers.coach | typeof mockUsers.student) {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 3600; // 1 hour

  return {
    access_token: `mock-access-token-${user.id}`,
    refresh_token: `mock-refresh-token-${user.id}`,
    expires_in: expiresIn,
    expires_at: now + expiresIn,
    token_type: 'bearer',
    user: {
      id: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: user.email,
      email_confirmed_at: new Date().toISOString(),
      phone: '',
      confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: {
        provider: 'google',
        providers: ['google'],
      },
      user_metadata: {
        avatar_url: 'https://example.com/avatar.jpg',
        email: user.email,
        email_verified: true,
        full_name: user.email.split('@')[0],
        iss: 'https://accounts.google.com',
        name: user.email.split('@')[0],
        picture: 'https://example.com/avatar.jpg',
        provider_id: '123456789',
        sub: '123456789',
        role: user.role,
      },
      identities: [
        {
          id: '123456789',
          user_id: user.id,
          identity_data: {
            email: user.email,
            email_verified: true,
            phone_verified: false,
            sub: '123456789',
          },
          provider: 'google',
          last_sign_in_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

/**
 * Injects a mock Supabase session into browser localStorage
 */
export async function injectSession(
  context: BrowserContext,
  userType: MockUserType
): Promise<void> {
  const user = mockUsers[userType];

  if (userType === 'newUser') {
    // For new users, we don't inject a session - they need to go through auth flow
    return;
  }

  const session = createMockSession(user as typeof mockUsers.coach);

  await context.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    { key: AUTH_STORAGE_KEY, value: session }
  );
}

/**
 * Clears the Supabase session from localStorage
 */
export async function clearSession(context: BrowserContext): Promise<void> {
  await context.addInitScript(
    ({ key }) => {
      window.localStorage.removeItem(key);
    },
    { key: AUTH_STORAGE_KEY }
  );
}

/**
 * Mock profile data that would be returned from Supabase profiles table
 */
export function getMockProfile(userType: MockUserType) {
  const user = mockUsers[userType];

  if (userType === 'newUser') {
    return null;
  }

  return {
    user_id: user.id,
    email: user.email,
    role: user.role,
    display_name: user.email.split('@')[0],
    timezone: 'America/New_York',
    avatar_url: 'https://example.com/avatar.jpg',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Extended test fixture with auth helpers
 */
export const test = base.extend<{
  authenticatedContext: BrowserContext;
  userRole: UserRole;
}>({
  userRole: ['coach', { option: true }],
  authenticatedContext: async ({ browser, userRole }, use) => {
    const context = await browser.newContext();
    await injectSession(context, userRole);
    await use(context);
    await context.close();
  },
});

export { expect } from '@playwright/test';
