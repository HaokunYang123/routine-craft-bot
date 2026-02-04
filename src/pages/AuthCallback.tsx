import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, RefreshCw, School, GraduationCap } from "lucide-react";
import { detectBrowserTimezone } from "@/lib/timezone";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
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

function normalizeRole(value: string | null | undefined): AuthRole | null {
  if (value === "coach" || value === "student") {
    return value;
  }
  return null;
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const urlIntent = searchParams.get("intent");
  const urlRole = searchParams.get("role");
  const urlCode = searchParams.get("code");

  const [state, setState] = useState<CallbackState>("processing");
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Verifying your sign-in...");
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<AuthRole | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const exchangeAttemptedRef = useRef<string | null>(null);

  const log = (...args: unknown[]) => console.log(LOG_PREFIX, ...args);
  const logError = (...args: unknown[]) => console.error(LOG_PREFIX, ...args);

  const clearPendingAuth = () => {
    localStorage.removeItem("pendingAuthRole");
    localStorage.removeItem("pendingAuthIntent");
  };

  const persistRoleToAuthMetadata = async (role: AuthRole) => {
    if (role !== "coach" && role !== "student") {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      await supabase.auth.updateUser({ data: { role } });
    } catch (err) {
      console.warn(LOG_PREFIX, "auth metadata update failed", err);
    }
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
        log("profile fetch error", { attempt, profileError });
      }

      if (data) {
        profile = data;
        break;
      }

      if (attempt < MAX_PROFILE_RETRIES) {
        log("profile not ready, retrying", { attempt, max: MAX_PROFILE_RETRIES });
        await new Promise((resolve) => setTimeout(resolve, PROFILE_RETRY_DELAY_MS));
      }
    }

    return { profile, error: lastError };
  };

  const createProfileIfMissing = async (uid: string, role: AuthRole | null) => {
    log("profile missing, attempting create", { uid, role });

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
        log("profile already exists, will re-fetch", { uid });
        return { profile: null, error: null };
      }

      return { profile: null, error: createError };
    }

    const createdRole = normalizeRole(data?.role ?? null);
    if (createdRole) {
      await persistRoleToAuthMetadata(createdRole);
    }

    return { profile: data, error: null };
  };

  const redirectToRole = async (role: AuthRole) => {
    clearPendingAuth();
    setState("success");
    setStatusMessage(`Welcome! Redirecting to your ${role} dashboard...`);

    await new Promise((resolve) => setTimeout(resolve, 400));

    navigate(role === "coach" ? "/dashboard" : "/app", { replace: true });
  };

  const attemptRoleUpdate = async (role: AuthRole, uid: string) => {
    setSelectedRole(role);
    setState("setting_role");
    setStatusMessage(`Setting up your ${role} account...`);

    log("attempting role update", { role, uid });

    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update({
        role,
        timezone: detectBrowserTimezone(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", uid)
      .select("role, timezone")
      .maybeSingle();

    if (updateError) {
      logError("role update failed", updateError);
      setError("Could not set your role. Please try again.");
      setErrorDetail(updateError.message ?? "Unknown role update error");
      setState("role_picker");
      return;
    }

    let confirmedRole = normalizeRole(updatedProfile?.role ?? null);

    if (!confirmedRole) {
      log("role update did not confirm, re-fetching profile", { uid });
      const { profile: refreshedProfile } = await fetchProfileWithRetries(uid);
      confirmedRole = normalizeRole(refreshedProfile?.role ?? null);
    }

    log("role after update", { confirmedRole });

    if (!confirmedRole) {
      setError("We couldn’t confirm your role. Please select again.");
      setErrorDetail("Role update did not persist.");
      setState("role_picker");
      return;
    }

    await persistRoleToAuthMetadata(confirmedRole);

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
      setStatusMessage("Verifying your sign-in...");

      const storageRole = localStorage.getItem("pendingAuthRole");
      const storageIntent = localStorage.getItem("pendingAuthIntent");

      if (urlCode) {
        localStorage.setItem(CODE_STORAGE_KEY, urlCode);
      }

      const storedCode = localStorage.getItem(CODE_STORAGE_KEY);
      const codeForExchange = urlCode ?? storedCode;
      const codeSource = urlCode ? "url" : storedCode ? "storage" : "none";

      log("callback start", {
        url: window.location.href,
        intent: urlIntent,
        roleParam: urlRole,
        storageRole,
        storageIntent,
        hasCode: Boolean(urlCode),
      });

      log("code source", { codeSource });

      if (codeForExchange && exchangeAttemptedRef.current !== codeForExchange) {
        exchangeAttemptedRef.current = codeForExchange;
        log("exchange attempt", { codeSource });

        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(codeForExchange);

        if (exchangeError) {
          logError("exchange failed", exchangeError);
          setError("Setup failed: no session");
          setErrorDetail(exchangeError.message ?? "Could not exchange code for session");
          setState("session_error");
          return;
        }

        log("exchange succeeded");
        localStorage.removeItem(CODE_STORAGE_KEY);

        if (urlCode) {
          const cleanedUrl = new URL(window.location.href);
          cleanedUrl.searchParams.delete("code");
          window.history.replaceState({}, "", `${cleanedUrl.pathname}${cleanedUrl.search}${cleanedUrl.hash}`);
        }
      } else {
        log("exchange skipped", { reason: codeForExchange ? "already_exchanged" : "no_code" });
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        logError("getSession error", sessionError);
        setError("Setup failed: no session");
        setErrorDetail(sessionError.message ?? "Could not load session");
        setState("session_error");
        return;
      }

      log("session present", { hasSession: Boolean(session) });

      if (!session) {
        setError("Setup failed: no session");
        setErrorDetail("No session found after OAuth callback.");
        setState("session_error");
        return;
      }

      setUserId(session.user.id);

      setStatusMessage("Loading your profile...");
      const { profile: fetchedProfile, error: profileError } = await fetchProfileWithRetries(session.user.id);

      if (profileError) {
        logError("profile fetch error", profileError);
      }

      let profile = fetchedProfile;

      if (!profile) {
        const intendedForCreate = deriveIntendedRole({
          urlRole,
          storageRole,
          profileRole: null,
        });

        const { profile: createdProfile, error: createError } = await createProfileIfMissing(
          session.user.id,
          intendedForCreate
        );

        if (createError) {
          logError("profile create failed", createError);
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
      const intendedRole = deriveIntendedRole({
        urlRole,
        storageRole,
        profileRole: currentRole,
      });

      log("profile resolved", {
        profileFound: Boolean(profile),
        currentRole,
        intendedRole,
      });

      const decision = decideNextStep({
        hasSession: true,
        currentRole,
        intendedRole,
      });

      if (decision === "redirect" && currentRole) {
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
  }, [navigate, retryNonce, urlCode, urlIntent, urlRole]);

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
                  {error ?? "We couldn’t establish a session after OAuth."}
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
                    : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                }`}
              >
                {selectedRole === "coach" ? "Coach Account" : "Student Account"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
