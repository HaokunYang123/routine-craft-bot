import { vi } from 'vitest';

/**
 * Response shape for Supabase queries
 */
export type SupabaseResponse<T> = {
  data: T | null;
  error: { message: string; code?: string } | null;
};

/**
 * Mock query builder interface matching Supabase's chainable API
 */
export interface MockQueryBuilder {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  gt: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lt: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  then: ReturnType<typeof vi.fn>;
}

/**
 * Mock auth interface
 */
export interface MockAuth {
  getSession: ReturnType<typeof vi.fn>;
  getUser: ReturnType<typeof vi.fn>;
  signInWithPassword: ReturnType<typeof vi.fn>;
  signInWithOAuth: ReturnType<typeof vi.fn>;
  signUp: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
  onAuthStateChange: ReturnType<typeof vi.fn>;
  resetPasswordForEmail: ReturnType<typeof vi.fn>;
}

/**
 * Creates a mock Supabase client with chainable query builder.
 *
 * @example
 * const { client, setResponse } = createMockSupabaseClient();
 *
 * // Mock a successful query
 * setResponse({ data: [{ id: 1, name: 'Test' }], error: null });
 *
 * // Now supabase.from('table').select().eq('id', 1) returns mocked data
 */
export function createMockSupabaseClient<T = unknown>(
  defaultResponse: SupabaseResponse<T> = { data: null, error: null }
) {
  // Create the query builder with all chainable methods
  const mockQueryBuilder: MockQueryBuilder = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    gt: vi.fn(),
    gte: vi.fn(),
    lt: vi.fn(),
    lte: vi.fn(),
    in: vi.fn(),
    is: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    range: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    then: vi.fn(),
  };

  // Make all intermediate methods return the builder for chaining
  const chainableMethods = [
    'select',
    'insert',
    'update',
    'delete',
    'upsert',
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'in',
    'is',
    'or',
    'order',
    'limit',
    'range',
  ] as const;

  chainableMethods.forEach((method) => {
    mockQueryBuilder[method].mockReturnValue(mockQueryBuilder);
  });

  // Terminal methods resolve with the default response
  mockQueryBuilder.single.mockResolvedValue(defaultResponse);
  mockQueryBuilder.maybeSingle.mockResolvedValue(defaultResponse);

  // Support for direct await on query (without single/maybeSingle)
  mockQueryBuilder.then.mockImplementation((resolve) => {
    return Promise.resolve(defaultResponse).then(resolve);
  });

  // Create auth mock
  const mockAuth: MockAuth = {
    getSession: vi.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    }),
    getUser: vi.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    }),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    }),
    signInWithOAuth: vi.fn().mockResolvedValue({
      data: { provider: 'google', url: 'https://example.com' },
      error: null,
    }),
    signUp: vi.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
    resetPasswordForEmail: vi.fn().mockResolvedValue({
      data: {},
      error: null,
    }),
  };

  // Assemble the mock client
  const mockClient = {
    from: vi.fn(() => mockQueryBuilder),
    auth: mockAuth,
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test.jpg' }, error: null }),
        download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/test.jpg' } })),
      })),
    },
  };

  return {
    /** The mock Supabase client */
    client: mockClient,
    /** Direct access to query builder for assertions */
    queryBuilder: mockQueryBuilder,
    /** Direct access to auth mock for assertions */
    auth: mockAuth,

    /**
     * Set response for next single() or maybeSingle() call.
     * @param response The response to return
     */
    setResponse: (response: SupabaseResponse<T>) => {
      mockQueryBuilder.single.mockResolvedValueOnce(response);
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce(response);
    },

    /**
     * Set response for next select() call (array response without single).
     * @param response The array response to return
     */
    setArrayResponse: (response: SupabaseResponse<T[]>) => {
      // Override then to return array response once
      mockQueryBuilder.then.mockImplementationOnce((resolve) => {
        return Promise.resolve(response).then(resolve);
      });
    },

    /**
     * Set error response for next query.
     * @param message Error message
     * @param code Optional error code
     */
    setError: (message: string, code?: string) => {
      const errorResponse = { data: null, error: { message, code } };
      mockQueryBuilder.single.mockResolvedValueOnce(errorResponse);
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce(errorResponse);
    },

    /**
     * Reset all mocks to default state.
     */
    reset: () => {
      vi.clearAllMocks();
      chainableMethods.forEach((method) => {
        mockQueryBuilder[method].mockReturnValue(mockQueryBuilder);
      });
      mockQueryBuilder.single.mockResolvedValue(defaultResponse);
      mockQueryBuilder.maybeSingle.mockResolvedValue(defaultResponse);
    },
  };
}

/**
 * Creates a mock authenticated session for testing protected routes.
 */
export function createMockSession(overrides?: {
  userId?: string;
  email?: string;
  role?: 'teacher' | 'student';
}) {
  const userId = overrides?.userId ?? 'test-user-id';
  const email = overrides?.email ?? 'test@example.com';
  const role = overrides?.role ?? 'teacher';

  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: {
      id: userId,
      email,
      app_metadata: { role },
      user_metadata: { role },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    },
  };
}

/**
 * Pre-configured mock for vi.mock('@/integrations/supabase/client').
 *
 * Usage in tests:
 * ```typescript
 * import { mockSupabaseModule, getMockSupabase } from '@/test/mocks/supabase';
 *
 * vi.mock('@/integrations/supabase/client', () => mockSupabaseModule);
 *
 * test('example', async () => {
 *   const { setResponse } = getMockSupabase();
 *   setResponse({ data: [...], error: null });
 *   // ... test code
 * });
 * ```
 */
let _mockInstance: ReturnType<typeof createMockSupabaseClient> | null = null;

export function getMockSupabase<T = unknown>() {
  if (!_mockInstance) {
    _mockInstance = createMockSupabaseClient<T>();
  }
  return _mockInstance;
}

export function resetMockSupabase() {
  if (_mockInstance) {
    _mockInstance.reset();
  }
  _mockInstance = null;
}

export const mockSupabaseModule = {
  supabase: new Proxy(
    {},
    {
      get: (_target, prop) => {
        const mock = getMockSupabase();
        return (mock.client as Record<string, unknown>)[prop as string];
      },
    }
  ),
};
