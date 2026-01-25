import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, screen, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import userEvent from '@testing-library/user-event';

/**
 * Creates a fresh QueryClient for each test to avoid cache pollution.
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Don't retry in tests
        gcTime: 0, // Garbage collect immediately
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface WrapperProps {
  children: ReactNode;
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /**
   * Initial route for MemoryRouter. Default: '/'
   */
  initialRoute?: string;
  /**
   * Pre-configured QueryClient. Default: fresh client per test.
   */
  queryClient?: QueryClient;
}

interface CustomRenderResult extends ReturnType<typeof render> {
  /**
   * userEvent instance configured for this render.
   */
  user: ReturnType<typeof userEvent.setup>;
}

/**
 * Custom render function that wraps components with all necessary providers.
 *
 * @example
 * ```tsx
 * import { render, screen } from '@/test/test-utils';
 *
 * test('renders button', async () => {
 *   const { user } = render(<Button onClick={fn}>Click</Button>);
 *   await user.click(screen.getByRole('button'));
 *   expect(fn).toHaveBeenCalled();
 * });
 * ```
 */
function customRender(
  ui: ReactElement,
  options?: CustomRenderOptions
): CustomRenderResult {
  const {
    initialRoute = '/',
    queryClient = createTestQueryClient(),
    ...renderOptions
  } = options || {};

  function AllProviders({ children }: WrapperProps) {
    return (
      <MemoryRouter initialEntries={[initialRoute]}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider delayDuration={0}>
            {children}
          </TooltipProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );
  }

  const user = userEvent.setup();

  return {
    user,
    ...render(ui, { wrapper: AllProviders, ...renderOptions }),
  };
}

// Re-export everything from testing-library
export * from '@testing-library/react';

// Override render with custom version
export { customRender as render };

// Export utilities
export { userEvent, screen, within, waitFor };
export { createTestQueryClient };
