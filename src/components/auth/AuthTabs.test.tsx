import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@/test/test-utils";
import {
  getMockSupabase,
  resetMockSupabase,
} from "@/test/mocks/supabase";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...(actual as object), useNavigate: () => mockNavigate };
});

vi.mock("@/integrations/supabase/client", async () => {
  const { getMockSupabase: getSupabase } = await import("@/test/mocks/supabase");
  return {
    supabase: new Proxy(
      {},
      {
        get: (_target: unknown, prop: string) => {
          const mock = getSupabase();
          return (mock?.client as Record<string, unknown>)?.[prop];
        },
      }
    ),
  };
});

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { AuthTabs } from "./AuthTabs";

describe("AuthTabs", () => {
  beforeEach(() => {
    resetMockSupabase();
    mockNavigate.mockClear();
    window.history.replaceState({}, "", "/");
  });

  it("sends password reset emails to a recovery-typed callback url", async () => {
    const mock = getMockSupabase();
    const { user } = render(<AuthTabs />, { initialRoute: "/auth" });

    await user.click(screen.getByRole("button", { name: /forgot password\?/i }));
    await user.type(screen.getByLabelText(/email/i), "teacher@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(mock.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        "teacher@example.com",
        { redirectTo: `${window.location.origin}/auth/callback?type=recovery` }
      );
    });
  });
});
