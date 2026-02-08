import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, Loader2, RefreshCw } from "lucide-react";
import { AuthTabs } from "@/components/auth/AuthTabs";
import { Button } from "@/components/ui/button";

type AuthState =
  | "checking"           // Initial session check
  | "no_session"         // No user logged in - show auth tabs
  | "waiting_for_role"   // Session exists but role is NULL - poll/wait
  | "needs_role_setup";  // User logged in but has no role - show message

const MAX_POLL_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 1000;

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [pollAttempt, setPollAttempt] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const isPasswordResetMode = searchParams.get("mode") === "reset";

  // Function to fetch profile and check role
  const checkProfileRole = useCallback(async (uid: string): Promise<"coach" | "student" | "parent" | null> => {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", uid)
      .maybeSingle();

    if (error) {
      console.error("🔐 Auth: Profile fetch error:", error);
      return null;
    }

    return profile?.role as "coach" | "student" | "parent" | null;
  }, []);

  // Main session check effect
  useEffect(() => {
    const checkSession = async () => {
      if (isPasswordResetMode) {
        setAuthState("no_session");
        return;
      }

      console.log("🔐 Auth: Starting session check...");

      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error("🔐 Auth: Session error:", error);
        setAuthState("no_session");
        return;
      }

      if (!session) {
        console.log("🔐 Auth: No session found");
        setAuthState("no_session");
        return;
      }

      console.log("🔐 Auth: Session found for:", session.user.email);
      setUserId(session.user.id);

      const role = await checkProfileRole(session.user.id);

      if (role === "coach") {
        console.log("🔐 Auth: Role is coach, redirecting...");
        navigate("/dashboard", { replace: true });
      } else if (role === "student") {
        console.log("🔐 Auth: Role is student, redirecting...");
        navigate("/app", { replace: true });
      } else if (role === "parent") {
        console.log("🔐 Auth: Role is parent, redirecting...");
        navigate("/parent", { replace: true });
      } else {
        // Role is NULL - user might be mid-setup (AuthCallback running)
        console.log("🔐 Auth: Role is NULL, entering wait state...");
        setAuthState("waiting_for_role");
        setPollAttempt(1);
      }
    };

    checkSession();
  }, [isPasswordResetMode, navigate, checkProfileRole]);

  // Polling effect for waiting_for_role state
  useEffect(() => {
    if (authState !== "waiting_for_role" || !userId || pollAttempt === 0) {
      return;
    }

    if (pollAttempt > MAX_POLL_ATTEMPTS) {
      console.log("🔐 Auth: Max poll attempts reached, showing role setup prompt");
      setAuthState("needs_role_setup");
      return;
    }

    console.log(`🔐 Auth: Polling attempt ${pollAttempt}/${MAX_POLL_ATTEMPTS}...`);

    const pollTimer = setTimeout(async () => {
      const role = await checkProfileRole(userId);

      if (role === "coach") {
        console.log("🔐 Auth: Poll found coach role, redirecting...");
        navigate("/dashboard", { replace: true });
      } else if (role === "student") {
        console.log("🔐 Auth: Poll found student role, redirecting...");
        navigate("/app", { replace: true });
      } else if (role === "parent") {
        console.log("🔐 Auth: Poll found parent role, redirecting...");
        navigate("/parent", { replace: true });
      } else {
        // Still NULL, try again
        setPollAttempt(prev => prev + 1);
      }
    }, POLL_INTERVAL_MS);

    return () => clearTimeout(pollTimer);
  }, [authState, userId, pollAttempt, navigate, checkProfileRole]);

  // Manual retry function
  const handleManualRetry = () => {
    if (!userId) return;
    console.log("🔐 Auth: Manual retry triggered");
    setPollAttempt(1);
    setAuthState("waiting_for_role");
  };

  // Show loading while checking initial session
  if (authState === "checking") {
    return (
      <div className="min-h-screen gradient-subtle flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show "Finishing Setup" while waiting for role to be set by AuthCallback
  if (authState === "waiting_for_role") {
    return (
      <div className="min-h-screen gradient-subtle flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-elevated border border-border p-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center shadow-soft">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
            <div className="text-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              <div>
                <h2 className="text-xl font-semibold text-foreground">Finishing Setup...</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Please wait while we complete your account setup.
                </p>
              </div>
              {pollAttempt > 3 && (
                <div className="pt-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Taking longer than expected?
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManualRetry}
                    className="gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show role setup prompt for users who logged in without a role
  if (authState === "needs_role_setup") {
    return (
      <div className="min-h-screen gradient-subtle flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-elevated border border-border p-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center shadow-soft">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
            <div className="text-center space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Almost There!</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Your account was created, but we need to know your role.
                  Please sign up as a Student or Coach to complete setup.
                </p>
              </div>
              <div className="pt-2">
                <AuthTabs forceResetMode={isPasswordResetMode} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Normal auth page - show Sign Up / Log In tabs
  return (
    <div className="min-h-screen gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-elevated border border-border p-8">
          {/* Logo and Welcome */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center shadow-soft">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-foreground">TeachCoachConnect</h1>
            <p className="text-sm text-muted-foreground mt-1">Task Management for Students & Coaches</p>
          </div>

          {/* Auth Tabs */}
          <AuthTabs forceResetMode={isPasswordResetMode} />
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default Auth;
