const PASSWORD_RESET_PENDING_KEY = "tcc_password_reset_pending";

export function markPasswordResetPending() {
  try {
    sessionStorage.setItem(PASSWORD_RESET_PENDING_KEY, "true");
  } catch {
    // Ignore storage failures and fall back to query-param driven reset mode.
  }
}

export function clearPasswordResetPending() {
  try {
    sessionStorage.removeItem(PASSWORD_RESET_PENDING_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function hasPasswordResetPending() {
  try {
    return sessionStorage.getItem(PASSWORD_RESET_PENDING_KEY) === "true";
  } catch {
    return false;
  }
}

export function isPasswordRecoveryRedirectType(value: string | null | undefined) {
  const normalized = value?.toLowerCase();
  return normalized === "recovery" || normalized === "password_recovery";
}

export function getRedirectTypeFromExchangeData(data: unknown) {
  if (!data || typeof data !== "object") {
    return null;
  }

  const redirectType = (data as { redirectType?: unknown }).redirectType;
  return typeof redirectType === "string" ? redirectType : null;
}
