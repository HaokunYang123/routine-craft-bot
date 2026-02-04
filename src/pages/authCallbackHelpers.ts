export type AuthRole = 'coach' | 'student';

function normalizeRole(value: string | null | undefined): AuthRole | null {
  if (value === 'coach' || value === 'student') {
    return value;
  }
  return null;
}

export function deriveIntendedRole(input: {
  urlRole?: string | null;
  storageRole?: string | null;
  profileRole?: string | null;
}): AuthRole | null {
  const urlRole = normalizeRole(input.urlRole ?? null);
  const storageRole = normalizeRole(input.storageRole ?? null);
  const profileRole = normalizeRole(input.profileRole ?? null);

  return urlRole ?? storageRole ?? profileRole ?? null;
}

export type CallbackDecision =
  | 'session_error'
  | 'attempt_role_update'
  | 'role_picker'
  | 'redirect';

export function decideNextStep(input: {
  hasSession: boolean;
  currentRole: AuthRole | null;
  intendedRole: AuthRole | null;
  updateAttempted?: boolean;
  updateSucceeded?: boolean;
}): CallbackDecision {
  if (!input.hasSession) {
    return 'session_error';
  }

  if (input.currentRole) {
    return 'redirect';
  }

  if (input.updateAttempted) {
    return input.updateSucceeded ? 'redirect' : 'role_picker';
  }

  if (input.intendedRole) {
    return 'attempt_role_update';
  }

  return 'role_picker';
}
