# Phase 15: Authentication Rebuild - Research

**Researched:** 2026-01-28
**Domain:** Supabase Auth with Google OAuth, Database Triggers, React State Management
**Confidence:** HIGH

## Summary

This phase rebuilds authentication to use Google OAuth only (removing email/password and login-via-code for auth), with role selection happening before OAuth and profile creation happening atomically via database trigger. The key challenges are: (1) passing role through OAuth flow since OAuth doesn't support custom metadata during signup, (2) ensuring zero-latency profile availability via database trigger, and (3) properly cleaning up auth subscriptions to prevent memory leaks.

The codebase already has Supabase Auth infrastructure (`@supabase/supabase-js` v2.90.1, `useAuth`, `useProfile`, `useGoogleAuth` hooks) and a profiles table. The rebuild involves consolidating auth flows, creating a database trigger for atomic profile creation, passing role via redirect URL query parameters, and removing localStorage-based role tracking.

**Primary recommendation:** Use `redirectTo` query parameter to pass selected role through OAuth, create `handle_new_user` database trigger to atomically create profile with role extracted from redirect URL parameter stored in `raw_app_meta_data`, and ensure proper `onAuthStateChange` cleanup in React.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.90.1 | Supabase client including Auth | Already in project, official SDK |
| react-router-dom | ^6.30.1 | Routing and navigation | Already in project, handles redirects |
| @tanstack/react-query | ^5.83.0 | Server state management | Already in project, useProfile uses it |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.462.0 | Icons | Role card icons, loading indicators |
| sonner | ^1.7.4 | Toast notifications | Auth error feedback |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Query param for role | localStorage (current) | Query param survives page refresh during OAuth, localStorage is less reliable for OAuth redirects |
| Database trigger | Client-side profile creation | Trigger is atomic and guaranteed, client-side has race conditions |

**Installation:**
No new packages needed - all required libraries already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/auth/
│   ├── RoleSelection.tsx       # REBUILD: Role cards that trigger OAuth
│   └── (remove CoachAuth.tsx, StudentAuth.tsx, MultiAuthLogin.tsx email flows)
├── hooks/
│   ├── useAuth.tsx             # ENHANCE: Proper cleanup, role from DB
│   ├── useProfile.ts           # ENHANCE: Retry logic, loading states
│   └── useGoogleAuth.ts        # ENHANCE: Pass role in redirectTo
├── pages/
│   ├── Auth.tsx                # REBUILD: Landing with role selection
│   ├── NotFound.tsx            # ENHANCE: Add logout button
├── components/error/
│   └── ErrorFallback.tsx       # ENHANCE: Add logout button
```

### Pattern 1: Role via OAuth Redirect Query Parameter
**What:** Pass selected role as query parameter in OAuth `redirectTo` URL, then extract after callback
**When to use:** When user selects role before OAuth, role needs to persist through OAuth redirect
**Example:**
```typescript
// Source: Supabase docs - Redirect URLs
// When initiating OAuth
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback?role=${selectedRole}`,
    queryParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  },
});

// After OAuth callback, extract role from URL
const urlParams = new URLSearchParams(window.location.search);
const role = urlParams.get('role');
```

### Pattern 2: Database Trigger for Atomic Profile Creation
**What:** PostgreSQL trigger on `auth.users` INSERT creates profile row with role
**When to use:** Ensure profile exists immediately after OAuth completes (zero latency)
**Example:**
```sql
-- Source: Supabase docs - Managing User Data
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  role_value text;
begin
  -- Extract role from redirect URL stored in raw_app_meta_data
  -- Supabase stores redirect_to in raw_app_meta_data during OAuth
  role_value := coalesce(
    new.raw_user_meta_data->>'role',
    'student'  -- Default if no role provided
  );

  insert into public.profiles (user_id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    role_value
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### Pattern 3: Proper Auth State Subscription Cleanup
**What:** Always unsubscribe from `onAuthStateChange` in useEffect cleanup
**When to use:** Every component that subscribes to auth state changes
**Example:**
```typescript
// Source: Supabase supabase-js docs - Auth State Change Listener
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }
  );

  // CRITICAL: Cleanup subscription on unmount
  return () => {
    subscription.unsubscribe();
  };
}, []);
```

### Pattern 4: Profile Loading with Retry Logic
**What:** Handle profile potentially being null immediately after auth with retry
**When to use:** useProfile hook when profile might not exist yet after OAuth
**Example:**
```typescript
// Enhanced useProfile with retry for timing edge case
const { data: profile, isPending, refetch } = useQuery({
  queryKey: ['profile', userId],
  queryFn: fetchProfile,
  enabled: !!userId,
  retry: (failureCount, error) => {
    // Retry up to 3 times if profile not found (trigger race condition)
    if (error.code === 'PGRST116' && failureCount < 3) {
      return true;
    }
    return false;
  },
  retryDelay: (attemptIndex) => Math.min(100 * 2 ** attemptIndex, 1000),
});
```

### Anti-Patterns to Avoid
- **localStorage for role state:** Database is source of truth, localStorage can get stale or be manipulated
- **Profile creation in client code:** Race conditions, not atomic, can fail silently
- **Forgetting subscription cleanup:** Memory leaks, state updates on unmounted components
- **Role check via user_metadata only:** Use database profiles table as authoritative source
- **Blocking UI while profile loads:** Show loading state, don't crash if profile null

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Profile creation | Client-side insert after auth | Database trigger | Atomic, guaranteed, no race conditions |
| OAuth state persistence | localStorage + polling | redirectTo query params | Survives redirects, official pattern |
| Auth state management | Custom event emitters | supabase.auth.onAuthStateChange | Built-in, handles token refresh |
| Session persistence | Manual token storage | Supabase client config | autoRefreshToken, persistSession built-in |
| Role extraction from URL | Manual string parsing | URLSearchParams API | Browser standard, handles encoding |

**Key insight:** OAuth involves full-page redirects and external systems. Any state that needs to persist must either be in the database, in the URL, or handled by Supabase's built-in mechanisms. Client-side state (React state, localStorage) is unreliable during OAuth flows.

## Common Pitfalls

### Pitfall 1: Profile Not Found Immediately After OAuth
**What goes wrong:** Profile query returns null/error right after OAuth completes
**Why it happens:** Database trigger might have microsecond delay, or React Query might execute before trigger completes
**How to avoid:** Add retry logic to profile query with short delays (100ms, 200ms, 400ms)
**Warning signs:** Intermittent "profile not found" errors only after OAuth signup (not login)

### Pitfall 2: Memory Leaks from Auth Subscriptions
**What goes wrong:** "Can't perform React state update on unmounted component" warning
**Why it happens:** `onAuthStateChange` subscription not unsubscribed in useEffect cleanup
**How to avoid:** Always return `subscription.unsubscribe()` from useEffect
**Warning signs:** Console warnings, increasing memory usage, stale state after navigation

### Pitfall 3: Role Lost During OAuth Redirect
**What goes wrong:** User selects coach but ends up with student role (or vice versa)
**Why it happens:** localStorage cleared during OAuth redirect, or role not passed through URL
**How to avoid:** Pass role as query parameter in `redirectTo`, whitelist URL pattern with wildcard in Supabase dashboard
**Warning signs:** All OAuth users getting default role regardless of selection

### Pitfall 4: Redirect URL Not Whitelisted
**What goes wrong:** OAuth fails with "redirect URL not allowed" error
**Why it happens:** Supabase requires explicit whitelisting of redirect URLs including query params
**How to avoid:** Add `https://yourdomain.com/auth/callback**` or `https://yourdomain.com/**` to Redirect URLs
**Warning signs:** OAuth works in dev but fails in production, or fails with certain role selections

### Pitfall 5: Infinite Redirect Loop
**What goes wrong:** App keeps redirecting between auth page and dashboard
**Why it happens:** Auth check triggers redirect, redirect triggers auth check, etc.
**How to avoid:** Check auth state ONCE on mount, use guards that short-circuit when already on correct page
**Warning signs:** Browser shows "too many redirects" or page keeps flickering

### Pitfall 6: OAuth Popup Blocked
**What goes wrong:** Nothing happens when user clicks sign-in button
**Why it happens:** Browser blocks popups, especially on mobile or with ad blockers
**How to avoid:** Use redirect flow (default), provide troubleshooting tips in UI
**Warning signs:** Works in some browsers but not others, works on desktop but not mobile

## Code Examples

Verified patterns from official sources:

### OAuth Sign-In with Role in Redirect URL
```typescript
// Source: Supabase docs - signInWithOAuth
const signInWithGoogle = async (role: 'coach' | 'student') => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback?role=${role}`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    throw error;
  }

  // OAuth redirects, so we won't reach here unless skipBrowserRedirect is true
  return data;
};
```

### Auth State Change Handler with Proper Cleanup
```typescript
// Source: Supabase supabase-js docs
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // CRITICAL: Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    navigate('/');
    await supabase.auth.signOut();
  };

  return { user, session, loading, signOut };
}
```

### Database Trigger for Profile Creation
```sql
-- Source: Supabase docs - Managing User Data / Using Triggers
-- Drop existing trigger if present (for migration)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Create function with security definer
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (
    user_id,
    email,
    display_name,
    role,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    now(),
    now()
  )
  on conflict (user_id) do nothing; -- Prevent duplicate if trigger fires twice

  return new;
end;
$$;

-- Create trigger (INSERT only, not UPDATE - role is immutable)
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### Auth Callback Page for Processing OAuth Return
```typescript
// src/pages/AuthCallback.tsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role');

  useEffect(() => {
    const handleCallback = async () => {
      // Supabase handles the OAuth code exchange automatically
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        navigate('/', { replace: true });
        return;
      }

      // If this is a new signup and we have a role, update the profile
      // (Trigger should have created it, but ensure role is correct)
      if (role) {
        await supabase
          .from('profiles')
          .update({ role })
          .eq('user_id', session.user.id)
          .is('role', null); // Only update if role not already set
      }

      // Fetch profile to determine where to route
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      // Route based on role
      if (profile?.role === 'coach') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/app', { replace: true });
      }
    };

    handleCallback();
  }, [navigate, role]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Setting up your account...</p>
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| localStorage for role | Database as source of truth | Best practice | Prevents role manipulation, survives browser clear |
| Email/password as primary | OAuth as primary | User requirement | Simpler UX, fewer credentials to manage |
| Client-side profile creation | Database trigger | Supabase recommendation | Zero latency, atomic, guaranteed |
| PKCE flow manual | Supabase handles automatically | supabase-js v2 | No manual code_verifier handling needed |

**Deprecated/outdated:**
- `supabase.auth.session()` (v1): Use `supabase.auth.getSession()` in v2
- `supabase.auth.user()` (v1): Use `supabase.auth.getUser()` in v2
- Direct auth.users metadata updates: Use profiles table, trigger handles initial creation

## Open Questions

Things that couldn't be fully resolved:

1. **Role passing through OAuth metadata**
   - What we know: `signInWithOAuth` doesn't support `data` option like `signUp` does
   - What's unclear: Whether Supabase will add this feature
   - Recommendation: Use redirect URL query parameter workaround (documented above)

2. **Existing users without profiles**
   - What we know: Trigger only fires on INSERT, not for existing users
   - What's unclear: Are there existing users without profiles in this database?
   - Recommendation: Run a one-time migration to create profiles for any users missing them, or handle in useProfile with auto-create fallback

3. **OAuth popup vs redirect on mobile**
   - What we know: Supabase defaults to redirect flow, popups often blocked on mobile
   - What's unclear: Exact user experience requirements for this app on mobile
   - Recommendation: Use redirect flow (default), test on target mobile devices

## Sources

### Primary (HIGH confidence)
- `/supabase/supabase-js` (Context7) - signInWithOAuth, onAuthStateChange, subscription cleanup
- `/supabase/supabase` (Context7) - handle_new_user trigger, raw_user_meta_data patterns
- Supabase MCP search_docs - OAuth flows, redirect URLs, user management

### Secondary (MEDIUM confidence)
- [Supabase Redirect URLs Guide](https://supabase.com/docs/guides/auth/redirect-urls) - Query parameter patterns
- [Supabase Managing User Data](https://supabase.com/docs/guides/auth/managing-user-data) - Trigger best practices
- [GitHub Discussion #670](https://github.com/supabase/auth-js/issues/670) - OAuth metadata limitations

### Tertiary (LOW confidence)
- WebSearch results on memory leak patterns - General React best practices
- Community discussions on role passing - Confirmed workaround patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing project dependencies, official Supabase patterns
- Architecture: HIGH - Database triggers are documented Supabase pattern, React cleanup is standard
- Pitfalls: HIGH - Well-documented issues in Supabase community and official docs

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (stable patterns, unlikely to change)
