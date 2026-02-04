import { describe, it, expect } from 'vitest';
import { deriveIntendedRole, decideNextStep } from './authCallbackHelpers';

describe('deriveIntendedRole', () => {
  it('prefers URL role over storage role', () => {
    const result = deriveIntendedRole({
      urlRole: 'coach',
      storageRole: 'student',
      profileRole: 'student',
    });

    expect(result).toBe('coach');
  });

  it('falls back to storage role when URL role is missing', () => {
    const result = deriveIntendedRole({
      urlRole: null,
      storageRole: 'student',
      profileRole: 'coach',
    });

    expect(result).toBe('student');
  });

  it('falls back to profile role when URL and storage roles are missing', () => {
    const result = deriveIntendedRole({
      urlRole: null,
      storageRole: null,
      profileRole: 'coach',
    });

    expect(result).toBe('coach');
  });
});

describe('decideNextStep', () => {
  it('returns session_error when session is missing', () => {
    const decision = decideNextStep({
      hasSession: false,
      currentRole: null,
      intendedRole: null,
    });

    expect(decision).toBe('session_error');
  });

  it('attempts role update when role missing but intended role exists', () => {
    const decision = decideNextStep({
      hasSession: true,
      currentRole: null,
      intendedRole: 'coach',
    });

    expect(decision).toBe('attempt_role_update');
  });

  it('shows role picker when role update fails', () => {
    const decision = decideNextStep({
      hasSession: true,
      currentRole: null,
      intendedRole: 'coach',
      updateAttempted: true,
      updateSucceeded: false,
    });

    expect(decision).toBe('role_picker');
  });

  it('redirects when role exists', () => {
    const decision = decideNextStep({
      hasSession: true,
      currentRole: 'student',
      intendedRole: null,
    });

    expect(decision).toBe('redirect');
  });
});
