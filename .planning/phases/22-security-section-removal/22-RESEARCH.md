# Phase 22: Security Section Removal - Research

**Researched:** 2026-01-31
**Domain:** Code removal, dead code cleanup, test mock maintenance
**Confidence:** HIGH

## Summary

Phase 22 is a cleanup phase focused on removing password/2FA/data-export UI that no longer applies after v3.0's Google OAuth migration. The research reveals that most security UI has already been removed in prior phases, but there are significant **dead code artifacts** that should be cleaned up.

**Key findings from codebase investigation:**

1. **StudentSettings.tsx has NO security section** - Already clean. No Delete Account, Password, or 2FA UI exists.

2. **CoachSettings.tsx has NO security section** - The Privacy & Security card mentioned in Phase 19 research has already been removed. Current file is clean.

3. **StudentPrivacy.tsx is staged for deletion** (in git working changes) - The file and its route have been removed from App.tsx. This is the only pending security-related work.

4. **Dead code discovered** - The v3.0 OAuth migration left unused components that should be cleaned up:
   - `MultiAuthLogin.tsx` - Old login component with email/password, NOT imported anywhere
   - `useGoogleAuth.ts` - Only imported by dead MultiAuthLogin.tsx
   - `QRScanner.tsx` - Only imported by dead MultiAuthLogin.tsx
   - `ClassCodeForm.tsx` - Only imported by dead MultiAuthLogin.tsx
   - `useQRScanner.ts` - Only imported by QRScanner.tsx
   - Test mock has unused `signInWithPassword` and `resetPasswordForEmail` mocks

**Primary recommendation:** Commit the pending StudentPrivacy deletion, then remove all dead auth code artifacts. This phase is primarily dead code cleanup rather than feature removal.

## Standard Stack

No new libraries needed - this is a deletion phase.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| N/A | N/A | Code removal only | No new dependencies |

### Supporting
N/A

### Alternatives Considered
N/A

**Installation:**
```bash
# No installation needed - deletion only
```

## Architecture Patterns

### Recommended Approach: Safe Deletion Protocol
```
1. Verify component is not imported (grep for imports)
2. Delete the component file
3. Run tests to confirm no breaks
4. Run TypeScript compiler to catch type errors
5. Commit with clear message
```

### Pattern 1: Dead Code Identification
**What:** Systematically verify a component is unused before deletion
**When to use:** Before any file deletion
**Example:**
```bash
# Verify no imports exist for MultiAuthLogin
grep -r "import.*MultiAuthLogin\|from.*MultiAuthLogin" src/
# Returns empty = safe to delete
```

### Pattern 2: Test Mock Cleanup
**What:** Remove unused mock methods to prevent confusion
**When to use:** After removing production code that mocks depend on
**Example:**
```typescript
// Before: Mock has unused methods
interface MockAuth {
  signInWithPassword: ReturnType<typeof vi.fn>; // unused
  resetPasswordForEmail: ReturnType<typeof vi.fn>; // unused
  signInWithOAuth: ReturnType<typeof vi.fn>; // used
}

// After: Remove unused methods
interface MockAuth {
  signInWithOAuth: ReturnType<typeof vi.fn>; // used
}
```

### Anti-Patterns to Avoid
- **Deleting without verification:** Always grep for imports first
- **Leaving test mocks for deleted code:** Causes confusion and maintenance burden
- **Large multi-file deletions in one commit:** Split for clearer history

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Finding unused code | Manual review | `grep -r` for imports | Systematic, complete |
| Verifying deletion safety | Hoping tests catch it | TypeScript compiler | Catches type breaks |

**Key insight:** The TypeScript compiler is the best verification tool for safe deletion. If `tsc --noEmit` passes after deletion, the code was truly unused.

## Common Pitfalls

### Pitfall 1: Forgetting Test Mocks
**What goes wrong:** Production code deleted but test mocks remain
**Why it happens:** Mocks aren't directly imported, easy to miss
**How to avoid:** Always check `src/test/mocks/` when deleting auth-related code
**Warning signs:** Mock interface has methods that don't exist in production

### Pitfall 2: Cascade Deletion Misses
**What goes wrong:** Delete A, but A imported B which is now orphaned
**Why it happens:** Only checked if A was imported, not what A imported
**How to avoid:** Trace dependency tree: A uses B, B uses C - check all
**Warning signs:** Components with single consumers

### Pitfall 3: Breaking Class Join Flow
**What goes wrong:** Deleting QR/ClassCode code breaks student class joining
**Why it happens:** Confusing "class code for auth" vs "class code for joining"
**How to avoid:** Verify QRScanner/ClassCodeForm are ONLY in MultiAuthLogin, not in student join flow
**Warning signs:** QRScanner used in StudentLayout or student pages

## Code Examples

### Verified Dead Code (Safe to Delete)

```typescript
// MultiAuthLogin.tsx - NOT imported anywhere
// Last grep result: No imports found
export function MultiAuthLogin({ onEmailAuth }: MultiAuthLoginProps) {
  // Contains email/password auth - obsolete after v3.0
  const { signInWithGoogle, loading: googleLoading, error: googleError } = useGoogleAuth();
  // ...
}
```

```typescript
// useGoogleAuth.ts - Only imported by MultiAuthLogin.tsx
// Dead: its only consumer is dead
import { supabase } from "@/integrations/supabase/client";

export function useGoogleAuth() {
  // Partially duplicated by AuthTabs inline OAuth
}
```

### Test Mock Methods to Remove

```typescript
// src/test/mocks/supabase.ts - Lines 43, 48, 133-135, 149-151
// These mock email/password methods that no longer exist in production

// REMOVE from interface (line 43):
signInWithPassword: ReturnType<typeof vi.fn>;

// REMOVE from interface (line 48):
resetPasswordForEmail: ReturnType<typeof vi.fn>;

// REMOVE mock implementation (lines 133-135):
signInWithPassword: vi.fn().mockResolvedValue({
  data: { user: null, session: null },
  error: null,
}),

// REMOVE mock implementation (lines 149-151):
resetPasswordForEmail: vi.fn().mockResolvedValue({
  data: {},
  error: null,
}),
```

### Pending Git Changes (Already Done)

```bash
# Current git status shows these changes:
# D src/pages/student/StudentPrivacy.tsx  (deleted)
# M src/App.tsx (route removed)
# M src/pages/student/StudentSettings.tsx (privacy link removed)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Email/password + OAuth | Google OAuth only | v3.0 | MultiAuthLogin dead |
| QR/ClassCode for auth | QR/ClassCode for class join only | v3.0 | Components in wrong file |

**Deprecated/outdated:**
- `MultiAuthLogin.tsx` - Entire component obsolete
- `useGoogleAuth.ts` - Replaced by inline OAuth in AuthTabs
- Password-related test mocks - No production code to test

## Code Inventory (Critical for Planning)

### Files to Delete (Dead Code)

| File | Why Dead | Verification |
|------|----------|--------------|
| `src/components/auth/MultiAuthLogin.tsx` | Not imported | `grep -r "MultiAuthLogin" src/` = empty |
| `src/hooks/useGoogleAuth.ts` | Only consumer (MultiAuthLogin) is dead | Single import in dead file |
| `src/components/auth/QRScanner.tsx` | Only in MultiAuthLogin | Grep confirms |
| `src/components/auth/ClassCodeForm.tsx` | Only in MultiAuthLogin | Grep confirms |
| `src/hooks/useQRScanner.ts` | Only in QRScanner | Single import |

### Files to Modify

| File | Change Required | Lines Affected |
|------|-----------------|----------------|
| `src/test/mocks/supabase.ts` | Remove password/reset mocks | Lines 43, 48, 133-135, 149-151 |

### Files Already Changed (Pending Commit)

| File | Status | Notes |
|------|--------|-------|
| `src/pages/student/StudentPrivacy.tsx` | Deleted | In git working changes |
| `src/App.tsx` | Modified | Privacy route removed |
| `src/pages/student/StudentSettings.tsx` | Modified | Privacy link removed |

### Files That Are Already Clean

| File | Why No Change |
|------|---------------|
| `src/pages/student/StudentSettings.tsx` | No Delete Account, Password, 2FA (was never there) |
| `src/pages/CoachSettings.tsx` | Security section already removed |

## Open Questions

Things that couldn't be fully resolved:

1. **QR/ClassCode for class joining**
   - What we know: These components are only in MultiAuthLogin, not in student join flow
   - What's unclear: Is class joining via QR/code still a feature requirement?
   - Recommendation: Check if QR/ClassCode functionality exists elsewhere for class joining. If not and it's needed, keep components but move them out of dead auth file. If not needed, delete all.

2. **useGoogleAuth vs AuthTabs inline OAuth**
   - What we know: AuthTabs has inline OAuth, useGoogleAuth is separate
   - What's unclear: Should useGoogleAuth be kept and AuthTabs refactored to use it?
   - Recommendation: Delete useGoogleAuth for now. AuthTabs inline OAuth works. Refactoring can be future cleanup if needed.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `src/pages/student/StudentSettings.tsx` - Confirmed no security section
- Codebase inspection: `src/pages/CoachSettings.tsx` - Confirmed security section removed
- Codebase inspection: `git status` - Confirmed pending deletions
- Codebase inspection: `grep -r "MultiAuthLogin"` - Confirmed no imports
- Codebase inspection: `src/test/mocks/supabase.ts` - Identified unused mocks

### Secondary (MEDIUM confidence)
- PROJECT.md tech debt notes - Confirms MultiAuthLogin unused

### Tertiary (LOW confidence)
- N/A

## Metadata

**Confidence breakdown:**
- Dead code identification: HIGH - Grep verification is definitive
- Test mock cleanup: HIGH - Direct code inspection
- QR/ClassCode scope: MEDIUM - May need product clarification on class joining

**Research date:** 2026-01-31
**Valid until:** 30 days (stable codebase, no external dependencies)
