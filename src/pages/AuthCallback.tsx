import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, RefreshCw, School, GraduationCap } from "lucide-react";
import { detectBrowserTimezone } from "@/lib/timezone";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { persistRoleToAuthMetadata } from "@/lib/auth/persistRoleMetadata";
import { decideNextStep, deriveIntendedRole, type AuthRole } from "./authCallbackHelpers";

type CallbackState =
  | "processing"
  | "role_picker"
  | "setting_role"
  | "success"
  | "session_error";

const LOG_PREFIX = "[auth-callback]";
const MAX_PROFILE_RETRIES = 5;
const PROFILE_RETRY_DELAY_MS = 500;
const CODE_STORAGE_KEY = "authCallbackCode";
const PENDING_JOIN_TOKEN_KEY = "pending_join_token";
const PKCE_RETRY_DELAY_MS = 400;
const PROFILE_FETCH_TIMEOUT_MS = 8000;
const PROFILE_CREATE_TIMEOUT_MS = 8000;
const ROLE_UPDATE_TIMEOUT_MS = 8000;

function normalizeRole(value: string | null | undefined): AuthRole | null {
  if (value === "coach" || value === "student" || value === "parent") {
    return value;
  }
  return null;
}

function isFlowStateNotFound(message: string | null | undefined) {
  const value = message?.toLowerCase() ?? "";
  return value.includes("flow_state_not_found") || value.includes("flow state not found");
}

function isPkceVerifierMissing(message: string | null | undefined) {
  const value = message?.toLowerCase() ?? "";
  return (
    value.includes("pkce") && value.includes("verifier")
  ) || value.includes("code_verifier") || value.includes("code verifier");
}

type TimeoutResult<T> = { timedOut: true } | { timedOut: false; value: T };

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<TimeoutResult<T>> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<TimeoutResult<T>>((resolve) => {
    timeoutId = globalThis.setTimeout(() => resolve({ timedOut: true }), ms);
  });

  const result = await Promise.race([
    promise.then((value) => ({ timedOut: false, value })),
    timeoutPromise,
  ]);

  if (timeoutId) {
    globalThis.clearTimeout(timeoutId);
  }

  return result;
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const urlIntent = searchParams.get("intent");
  const urlRole = searchParams.get("role");
  const urlCode = searchParams.get("code");
  const urlType = searchParams.get("type");
  const urlError = searchParams.get("error");
  const urlErrorDescription = searchParams.get("error_description");
  const urlErrorCode = searchParams.get("error_code");

  const [state, setState] = useState<CallbackState>("processing");
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Verifying your sign-in...");
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<AuthRole | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const exchangeAttemptedRef = useRef<string | null>(null);
  const pkceRetryAttemptRef = useRef<string | null>(null);
  const fragmentSessionHandledRef = useRef(false);

  const log = (message: string, uid?: string | null) => {
    if (uid) {
      console.log(LOG_PREFIX, message, { userId: uid });
    } else {
      console.log(LOG_PREFIX, message);
    }
  };
  const logError = (message: string, uid?: string | null) => {
    if (uid) {
      console.error(LOG_PREFIX, message, { userId: uid });
    } else {
      console.error(LOG_PREFIX, message);
    }
  };

  const clearPendingAuth = () => {
    localStorage.removeItem("pendingAuthRole");
    localStorage.removeItem("pendingAuthIntent");
  };

  const fetchProfileWithRetries = async (uid: string) => {
    let profile: { role: string | null; timezone: string | null } | null = null;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= MAX_PROFILE_RETRIES; attempt += 1) {
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("role, timezone")
        .eq("user_id", uid)
        .maybeSingle();

      if (profileError) {
        lastError = profileError;
        log(`profile fetch error (attempt ${attempt}/${MAX_PROFILE_RETRIES})`, uid);
      }

      if (data) {
        profile = data;
        break;
      }

      if (attempt < MAX_PROFILE_RETRIES) {
        log(`profile not ready, retrying (${attempt}/${MAX_PROFILE_RETRIES})`, uid);
        await new Promise((resolve) => setTimeout(resolve, PROFILE_RETRY_DELAY_MS));
      }
    }

    return { profile, error: lastError };
  };

  const createProfileIfMissing = async (uid: string, role: AuthRole | null) => {
    log("profile missing, attempting create", uid);

    const { data, error: createError } = await supabase
      .from("profiles")
      .insert({
        user_id: uid,
        role: role ?? null,
        timezone: detectBrowserTimezone(),
      })
      .select("role, timezone")
      .single();

    if (createError) {
      if (createError.code === "23505") {
        log("profile already exists, will re-fetch", uid);
        return { profile: null, error: null };
      }

      return { profile: null, error: createError };
    }

    const createdRole = normalizeRole(data?.role ?? null);
    if (createdRole) {
      await persistRoleToAuthMetadata({ role: createdRole, source: "auth-callback" });
    }

    return { profile: data, error: null };
  };

  const redirectToRole = async (role: AuthRole) => {
    clearPendingAuth();
    setState("success");
    setStatusMessage(`Welcome! Redirecting to your ${role} dashboard...`);

    await new Promise((resolve) => setTimeout(resolve, 400));

    const pendingJoinToken = sessionStorage.getItem(PENDING_JOIN_TOKEN_KEY);
    if (pendingJoinToken) {
      sessionStorage.removeItem(PENDING_JOIN_TOKEN_KEY);
      navigate(`/join?token=${encodeURIComponent(pendingJoinToken)}`, { replace: true });
      return;
    }

    if (role === "coach") {
      navigate("/dashboard", { replace: true });
      return;
    }
    if (role === "student") {
      navigate("/app", { replace: true });
      return;
    }
    navigate("/parent", { replace: true });
  };

  const attemptRoleUpdate = async (role: AuthRole, uid: string) => {
    setSelectedRole(role);
    setState("setting_role");
    setStatusMessage(`Setting up your ${role} account...`);

    log("attempting role update", uid);

    const updateResult = await withTimeout(
      supabase
        .from("profiles")
        .update({
          role,
          timezone: detectBrowserTimezone(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", uid)
        .select("role, timezone")
        .maybeSingle(),
      ROLE_UPDATE_TIMEOUT_MS
    );

    if (updateResult.timedOut) {
      setError("We couldn’t set your role in time. Please try again.");
      setErrorDetail("Role update timed out.");
      setState("role_picker");
      return;
    }

    const { data: updatedProfile, error: updateError } = updateResult.value;

    if (updateError) {
      logError("role update failed", uid);
      setError("Could not set your role. Please try again.");
      setErrorDetail(updateError.message ?? "Unknown role update error");
      setState("role_picker");
      return;
    }

    let confirmedRole = normalizeRole(updatedProfile?.role ?? null);

    if (!confirmedRole) {
      log("role update did not confirm, re-fetching profile", uid);
      const { profile: refreshedProfile } = await fetchProfileWithRetries(uid);
      confirmedRole = normalizeRole(refreshedProfile?.role ?? null);
    }

    log("role updated", uid);

    if (!confirmedRole) {
      setError("We couldn’t confirm your role. Please select again.");
      setErrorDetail("Role update did not persist.");
      setState("role_picker");
      return;
    }

    await persistRoleToAuthMetadata({ role: confirmedRole, source: "auth-callback" });

    toast({
      title: "Account Ready!",
      description: `Your ${confirmedRole} account has been set up.`,
    });

    await redirectToRole(confirmedRole);
  };

  useEffect(() => {
    const runCallback = async () => {
      setError(null);
      setErrorDetail(null);
      setSelectedRole(null);
      setState("processing");
      setStatusMessage(
        urlType === "signup"
          ? "Confirming your email..."
          : urlType === "recovery"
            ? "Verifying your reset link..."
            : "Verifying your sign-in..."
      );

      const storageRole = localStorage.getItem("pendingAuthRole");
      const storageIntent = localStorage.getItem("pendingAuthIntent");

      if (urlError || urlErrorDescription) {
        log("oauth error param detected");
        setError("Authentication failed. Please try again.");
        setErrorDetail(
          urlErrorDescription ??
            (urlErrorCode ? `${urlError} (${urlErrorCode})` : urlError) ??
            "OAuth provider returned an error."
        );
        setState("session_error");
        return;
      }

      if (!fragmentSessionHandledRef.current) {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const fragmentAccessToken = hashParams.get("access_token");
        const fragmentRefreshToken = hashParams.get("refresh_token");

        if (fragmentAccessToken) {
          fragmentSessionHandledRef.current = true;
          const cleanedUrl = new URL(window.location.href);
          cleanedUrl.hash = "";
          window.history.replaceState({}, "", `${cleanedUrl.pathname}${cleanedUrl.search}`);
          if (!fragmentRefreshToken) {
            logError("fragment token missing refresh");
            setError("Setup failed: no session");
            setErrorDetail("Missing refresh token in callback.");
            setState("session_error");
            return;
          }

          log("fragment tokens detected, setting session");
          const { error: fragmentError } = await supabase.auth.setSession({
            access_token: fragmentAccessToken,
            refresh_token: fragmentRefreshToken,
          });

          if (fragmentError) {
            logError("setSession from fragment failed");
            setError("Setup failed: no session");
            setErrorDetail(fragmentError.message ?? "Could not set session from callback.");
            setState("session_error");
            return;
          }
        }
      }

      if (urlCode) {
        localStorage.setItem(CODE_STORAGE_KEY, urlCode);
      }

      const storedCode = localStorage.getItem(CODE_STORAGE_KEY);
      const codeForExchange = urlCode ?? storedCode;
      const codeSource = urlCode ? "url" : storedCode ? "storage" : "none";

      log("callback start");

      const { data: { session: preSession }, error: preSessionError } = await supabase.auth.getSession();

      if (preSessionError) {
        logError("getSession pre-check error");
      }

      let session = preSession ?? null;

      if (session) {
        log("session already present, skipping exchange", session.user.id);
      } else if (codeForExchange && exchangeAttemptedRef.current !== codeForExchange) {
        exchangeAttemptedRef.current = codeForExchange;
        log("exchange attempt");

        let { error: exchangeError } = await supabase.auth.exchangeCodeForSession(codeForExchange);

        if (exchangeError) {
          const message = exchangeError.message ?? "";
          const flowStateNotFound = isFlowStateNotFound(message);
          const pkceVerifierMissing = isPkceVerifierMissing(message);

          if (
            pkceVerifierMissing &&
            codeSource === "storage" &&
            pkceRetryAttemptRef.current !== codeForExchange
          ) {
            pkceRetryAttemptRef.current = codeForExchange;
            log("pkce verifier missing, retrying exchange once");
            await new Promise((resolve) => setTimeout(resolve, PKCE_RETRY_DELAY_MS));
            const { error: retryError } = await supabase.auth.exchangeCodeForSession(codeForExchange);
            exchangeError = retryError ?? null;
          }

          if (exchangeError) {
            const retryMessage = exchangeError.message ?? "";
            const retryFlowStateNotFound = isFlowStateNotFound(retryMessage);
            const retryPkceVerifierMissing = isPkceVerifierMissing(retryMessage);

            logError("exchange failed");

            const { data: { session: fallbackSession }, error: fallbackError } =
              await supabase.auth.getSession();

            if (fallbackError) {
              logError("getSession fallback error");
            }

            if (fallbackSession) {
              session = fallbackSession;
              log("session recovered after exchange error", fallbackSession.user.id);
            } else {
              exchangeAttemptedRef.current = null;
              if (retryFlowStateNotFound) {
                setError("Your sign-in link expired or was already used. Please try again.");
              } else if (retryPkceVerifierMissing) {
                setError("We couldn’t verify your sign-in. Please try again.");
              } else {
                setError("Setup failed: no session");
              }
              setErrorDetail(retryMessage || "Could not exchange code for session");
              setState("session_error");
              return;
            }
          }
        }

        if (!exchangeError) {
          log("exchange succeeded");
          localStorage.removeItem(CODE_STORAGE_KEY);

          if (urlCode) {
            const cleanedUrl = new URL(window.location.href);
            cleanedUrl.searchParams.delete("code");
            window.history.replaceState({}, "", `${cleanedUrl.pathname}${cleanedUrl.search}${cleanedUrl.hash}`);
          }

          const { data: { session: exchangedSession }, error: sessionError } =
            await supabase.auth.getSession();

          if (sessionError) {
            logError("getSession error");
            setError("Setup failed: no session");
            setErrorDetail(sessionError.message ?? "Could not load session");
            setState("session_error");
            return;
          }

          session = exchangedSession ?? null;
        } else if (session) {
          localStorage.removeItem(CODE_STORAGE_KEY);
          if (urlCode) {
            const cleanedUrl = new URL(window.location.href);
            cleanedUrl.searchParams.delete("code");
            window.history.replaceState({}, "", `${cleanedUrl.pathname}${cleanedUrl.search}${cleanedUrl.hash}`);
          }
        }
      } else {
        log("exchange skipped");
      }

      if (session) {
        log("session present", session.user.id);
      } else {
        log("session missing");
      }

      if (!session) {
        setError("Setup failed: no session");
        setErrorDetail("No session found after auth callback.");
        setState("session_error");
        return;
      }

      if (urlType === "recovery") {
        log("password recovery callback detected", session.user.id);
        clearPendingAuth();
        localStorage.removeItem(CODE_STORAGE_KEY);
        navigate("/login?mode=reset", { replace: true });
        return;
      }

      const rawMetadataRole = normalizeRole(
        (
          session.user as {
            raw_user_meta_data?: { role?: string | null } | null;
          }
        ).raw_user_meta_data?.role ?? null
      );
      const userMetadataRole = normalizeRole(
        (session.user.user_metadata as { role?: string | null } | undefined)?.role ?? null
      );
      const signupMetadataRole = urlType === "signup" ? rawMetadataRole ?? userMetadataRole : null;

      setUserId(session.user.id);

      setStatusMessage("Loading your profile...");
      const profileResult = await withTimeout(
        fetchProfileWithRetries(session.user.id),
        PROFILE_FETCH_TIMEOUT_MS
      );

      if (profileResult.timedOut) {
        setError("We couldn’t load your profile in time.");
        setErrorDetail("Profile fetch timed out.");
        setState("role_picker");
        return;
      }

      const { profile: fetchedProfile, error: profileError } = profileResult.value;

      if (profileError) {
        logError("profile fetch error", session.user.id);
      }

      let profile = fetchedProfile;

      if (!profile) {
        const intendedForCreate = signupMetadataRole ?? deriveIntendedRole({
          urlRole,
          storageRole,
          profileRole: null,
        });

        const createResult = await withTimeout(
          createProfileIfMissing(session.user.id, intendedForCreate),
          PROFILE_CREATE_TIMEOUT_MS
        );

        if (createResult.timedOut) {
          setError("We couldn’t create your profile in time.");
          setErrorDetail("Profile create timed out.");
          setState("role_picker");
          return;
        }

        const { profile: createdProfile, error: createError } = createResult.value;

        if (createError) {
          logError("profile create failed", session.user.id);
          setError("We couldn’t create your profile.");
          setErrorDetail(createError.message ?? "Profile create failed");
          setState("role_picker");
          return;
        }

        if (createdProfile) {
          profile = createdProfile;
        } else {
          const { profile: refreshedProfile } = await fetchProfileWithRetries(session.user.id);
          profile = refreshedProfile;
        }
      }

      const currentRole = normalizeRole(profile?.role ?? null);
      const intendedRole = signupMetadataRole ?? deriveIntendedRole({
        urlRole,
        storageRole,
        profileRole: currentRole,
      });

      log("profile resolved", session.user.id);

      const intentMismatch = Boolean(urlIntent && storageIntent && urlIntent !== storageIntent);

      if (!currentRole && !intendedRole) {
        if (intentMismatch) {
          setError("We couldn’t confirm your role from this sign-in. Please select one to continue.");
          setErrorDetail(null);
        } else if (profileError) {
          setError("We couldn’t read your role.");
          setErrorDetail("Profile role is missing or unreadable.");
        } else {
          setError(null);
          setErrorDetail(null);
        }
        setState("role_picker");
        return;
      }

      if (urlType === "signup" && signupMetadataRole && currentRole !== signupMetadataRole) {
        log("signup metadata role differs from profile role, applying metadata role", session.user.id);
        await attemptRoleUpdate(signupMetadataRole, session.user.id);
        return;
      }

      const decision = decideNextStep({
        hasSession: true,
        currentRole,
        intendedRole,
      });

      if (decision === "redirect" && currentRole) {
        await persistRoleToAuthMetadata({ role: currentRole, source: "auth-callback" });
        await redirectToRole(currentRole);
        return;
      }

      if (decision === "attempt_role_update" && intendedRole) {
        await attemptRoleUpdate(intendedRole, session.user.id);
        return;
      }

      if (decision === "role_picker") {
        if (!currentRole) {
          setError(profileError ? "We couldn’t read your role." : null);
          setErrorDetail(profileError ? "Profile role is missing or unreadable." : null);
        }
        setState("role_picker");
        return;
      }

      setError("Setup failed: no session");
      setErrorDetail("Unable to determine next step.");
      setState("session_error");
    };

    void runCallback();
  }, [navigate, retryNonce, urlCode, urlIntent, urlRole, urlType]);

  const handleRetry = () => {
    setRetryNonce((prev) => prev + 1);
  };

  const handleBackToLogin = () => {
    navigate("/", { replace: true });
  };

  const handleRoleSelection = async (role: AuthRole) => {
    if (!userId) {
      setError("No session found. Please try again.");
      setErrorDetail("Missing user id during role selection.");
      setState("session_error");
      return;
    }

    await attemptRoleUpdate(role, userId);
  };

  if (state === "session_error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-elevated border border-border p-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Setup failed: no session</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  {error ?? "We couldn’t establish a session after sign-in."}
                </p>
              </div>
              {errorDetail && (
                <details className="text-left text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                  <summary className="cursor-pointer font-medium text-foreground">Error details</summary>
                  <p className="mt-2 break-words">{errorDetail}</p>
                </details>
              )}
              <div className="pt-2 space-y-3">
                <Button onClick={handleRetry} className="w-full gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </Button>
                <Button variant="outline" onClick={handleBackToLogin} className="w-full">
                  Back to login
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state === "role_picker") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-elevated border border-border p-8">
            <div className="text-center space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">Finish setup</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Select your role to complete your account setup.
                </p>
                {error && (
                  <p className="text-sm text-destructive mt-3">{error}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-32 flex flex-col items-center justify-center gap-3 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                  onClick={() => handleRoleSelection("coach")}
                >
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <School className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <span className="font-medium text-foreground block">I'm a Coach</span>
                    <span className="text-xs text-muted-foreground">Manage students</span>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-32 flex flex-col items-center justify-center gap-3 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
                  onClick={() => handleRoleSelection("student")}
                >
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <span className="font-medium text-foreground block">I'm a Student</span>
                    <span className="text-xs text-muted-foreground">Complete tasks</span>
                  </div>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-elevated border border-border p-8">
          <div className="text-center space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {state === "success" ? "Success!" : "Setting Up Your Account"}
              </h2>
              <p className="text-sm text-muted-foreground mt-2">{statusMessage}</p>
            </div>
            {selectedRole && state === "setting_role" && (
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                  selectedRole === "coach"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    : selectedRole === "student"
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                }`}
              >
                {selectedRole === "coach"
                  ? "Coach Account"
                  : selectedRole === "student"
                    ? "Student Account"
                    : "Parent Account"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
