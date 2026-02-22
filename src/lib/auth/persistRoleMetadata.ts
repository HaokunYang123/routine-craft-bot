import { supabase } from "@/integrations/supabase/client";

type AuthRole = "coach" | "student";

type PersistRoleSource = "auth-callback" | "onboarding";

type PersistRoleOptions = {
  role: string | null | undefined;
  source: PersistRoleSource;
  timeoutMs?: number;
};

const LOG_PREFIX = "[auth-role-metadata]";
const DEFAULT_TIMEOUT_MS = 1200;
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 200;

function normalizeRole(value: string | null | undefined): AuthRole | null {
  if (value === "coach" || value === "student") {
    return value;
  }
  return null;
}

function isRetryableAuthError(error: unknown) {
  const err = error as { message?: string; status?: number; statusCode?: number } | null;
  const status = err?.status ?? err?.statusCode;
  const message = (err?.message ?? "").toLowerCase();

  if (status === 401 || status === 403) {
    return true;
  }

  return (
    message.includes("unauthorized") ||
    message.includes("jwt") ||
    message.includes("session") ||
    message.includes("token") ||
    message.includes("401")
  );
}

function getErrorMessage(error: unknown) {
  if (!error) return "unknown";
  if (error instanceof Error) return error.message;
  return String(error);
}

function getTelemetryCapture() {
  const win = typeof window !== "undefined"
    ? (window as unknown as {
    analytics?: { track?: (event: string, payload: Record<string, unknown>) => void };
    posthog?: { capture?: (event: string, payload: Record<string, unknown>) => void };
  })
    : undefined;

  return win?.analytics?.track ?? win?.posthog?.capture ?? null;
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeoutId: number | undefined;

  const timeoutPromise = new Promise<{ timedOut: true }>((resolve) => {
    timeoutId = setTimeout(() => resolve({ timedOut: true }), timeoutMs);
  });

  const result = await Promise.race([
    promise.then((value) => ({ timedOut: false as const, value })),
    timeoutPromise,
  ]);

  if (!result.timedOut && timeoutId !== undefined) {
    clearTimeout(timeoutId);
  }

  return result;
}

export async function persistRoleToAuthMetadata({
  role,
  source,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: PersistRoleOptions) {
  const normalizedRole = normalizeRole(role);

  if (!normalizedRole) {
    return;
  }

  const deadline = Date.now() + timeoutMs;
  let lastErrorMessage = "unknown";
  let lastUserId: string | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const remaining = deadline - Date.now();

    if (remaining <= 0) {
      lastErrorMessage = "timeout";
      break;
    }

    const attemptPromise = (async () => {
      const { data, error: userError } = await supabase.auth.getUser();
      const user = data?.user ?? null;

      if (userError) {
        return { ok: false, retryable: isRetryableAuthError(userError), error: userError, userId: null };
      }

      if (!user) {
        return { ok: false, retryable: true, error: "no_user", userId: null };
      }

      lastUserId = user.id ?? null;
      const currentRole = normalizeRole((user.user_metadata as { role?: string } | null)?.role ?? null);

      if (currentRole === normalizedRole) {
        return { ok: true, retryable: false, error: null, userId: lastUserId, skipped: true };
      }

      const { error: updateError } = await supabase.auth.updateUser({ data: { role: normalizedRole } });

      if (updateError) {
        return {
          ok: false,
          retryable: isRetryableAuthError(updateError),
          error: updateError,
          userId: lastUserId,
        };
      }

      return { ok: true, retryable: false, error: null, userId: lastUserId };
    })();

    const result = await withTimeout(attemptPromise, remaining);

    if (result.timedOut) {
      lastErrorMessage = "timeout";
      break;
    }

    if (result.value.ok) {
      return;
    }

    lastErrorMessage = getErrorMessage(result.value.error);

    if (!result.value.retryable || attempt === MAX_ATTEMPTS) {
      break;
    }

    const delayRemaining = Math.min(RETRY_DELAY_MS, Math.max(0, deadline - Date.now()));
    if (delayRemaining > 0) {
      await delay(delayRemaining);
    }
  }

  const payload = {
    source,
    user_id: lastUserId,
    role: normalizedRole,
    error: lastErrorMessage,
  };

  console.error(LOG_PREFIX, "update failed", payload);

  const capture = getTelemetryCapture();
  if (capture) {
    try {
      capture("auth_role_metadata_update_failed", payload);
    } catch (err) {
      console.error(LOG_PREFIX, "telemetry capture failed", err);
    }
  }
}
