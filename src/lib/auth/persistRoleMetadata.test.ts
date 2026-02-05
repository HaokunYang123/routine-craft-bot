import { beforeEach, describe, expect, it, vi } from "vitest";
import { persistRoleToAuthMetadata } from "./persistRoleMetadata";
import { getMockSupabase, resetMockSupabase } from "@/test/mocks/supabase";

vi.mock("@/integrations/supabase/client", async () => {
  const { mockSupabaseModule } = await import("@/test/mocks/supabase");
  return mockSupabaseModule;
});

describe("persistRoleToAuthMetadata", () => {
  beforeEach(() => {
    resetMockSupabase();
    vi.clearAllMocks();
  });

  it("skips invalid roles", async () => {
    await persistRoleToAuthMetadata({ role: "admin", source: "onboarding", timeoutMs: 20 });

    expect(getMockSupabase().auth.getUser).not.toHaveBeenCalled();
  });

  it("skips when metadata already matches", async () => {
    getMockSupabase().auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1", user_metadata: { role: "coach" } } },
      error: null,
    });

    await persistRoleToAuthMetadata({ role: "coach", source: "auth-callback", timeoutMs: 20 });

    expect(getMockSupabase().auth.updateUser).not.toHaveBeenCalled();
  });

  it("updates metadata when role differs", async () => {
    getMockSupabase().auth.getUser.mockResolvedValue({
      data: { user: { id: "user-2", user_metadata: { role: "student" } } },
      error: null,
    });

    await persistRoleToAuthMetadata({ role: "coach", source: "auth-callback", timeoutMs: 20 });

    expect(getMockSupabase().auth.updateUser).toHaveBeenCalledWith({
      data: { role: "coach" },
    });
  });
});
