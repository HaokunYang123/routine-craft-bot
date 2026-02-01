import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, RefreshCw, School, GraduationCap } from "lucide-react";
import { detectBrowserTimezone } from "@/lib/timezone";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type CallbackState =
  | "processing"        // Initial state - exchanging code, fetching profile
  | "select_role"       // User needs to select a role
  | "setting_role"      // Updating profile with role
  | "success"           // Role confirmed, redirecting
  | "error";            // Something went wrong

const MAX_PROFILE_RETRIES = 5;
const PROFILE_RETRY_DELAY_MS = 500;

export default function AuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Get intent and role from URL params, with localStorage fallback
  const urlIntent = searchParams.get('intent');
  const urlRole = searchParams.get('role');

  const intent = (urlIntent || localStorage.getItem('pendingAuthIntent')) as 'signup' | 'login' | null;
  const initialRole = (urlRole || localStorage.getItem('pendingAuthRole')) as 'coach' | 'student' | null;

  const [state, setState] = useState<CallbackState>("processing");
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Verifying your sign-in...");
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'coach' | 'student' | null>(null);

  // Function to set role and redirect
  const handleRoleSelection = async (role: 'coach' | 'student') => {
    if (!userId) return;

    setSelectedRole(role);
    setState("setting_role");
    setStatusMessage(`Setting up your ${role} account...`);

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          role: role,
          timezone: detectBrowserTimezone(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) {
        console.error("🔑 Callback: Role update failed:", updateError);
        throw new Error(`Could not set account type. Please try again.`);
      }

      console.log("🔑 Callback: Role successfully set to:", role);

      // Clear pending auth data
      localStorage.removeItem('pendingAuthRole');
      localStorage.removeItem('pendingAuthIntent');

      setState("success");
      setStatusMessage(`Welcome! Redirecting to your ${role} dashboard...`);

      toast({
        title: "Account Ready!",
        description: `Your ${role} account has been set up.`,
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      if (role === "coach") {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/app", { replace: true });
      }
    } catch (err: unknown) {
      console.error("🔑 Callback: Error setting role:", err);
      setState("error");
      setError(err instanceof Error ? err.message : "Failed to set role. Please try again.");
    }
  };

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("🔑 Callback: Getting session...");
        console.log("🔑 Callback: Intent:", intent, "Role:", initialRole);
        setStatusMessage("Verifying your sign-in...");

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("🔑 Callback: Session error:", sessionError);
          throw new Error("Sign-in verification failed. Please try again.");
        }

        if (!session) {
          console.error("🔑 Callback: No session found");
          throw new Error("No session found. Please sign in again.");
        }

        console.log("🔑 Callback: Session verified for:", session.user.email);
        setUserId(session.user.id);

        // Wait for profile to exist
        setStatusMessage("Loading your profile...");
        let profile = null;
        let profileRetries = 0;

        while (!profile && profileRetries < MAX_PROFILE_RETRIES) {
          const { data, error: profileError } = await supabase
            .from("profiles")
            .select("role, timezone")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (profileError) {
            console.warn(`🔑 Callback: Profile fetch attempt ${profileRetries + 1} error:`, profileError);
          }

          if (data) {
            profile = data;
            break;
          }

          profileRetries++;
          if (profileRetries < MAX_PROFILE_RETRIES) {
            console.log(`🔑 Callback: Profile not ready, retry ${profileRetries}/${MAX_PROFILE_RETRIES}...`);
            await new Promise(resolve => setTimeout(resolve, PROFILE_RETRY_DELAY_MS));
          }
        }

        if (!profile) {
          console.error("🔑 Callback: Profile not found after retries");
          throw new Error("Account setup incomplete. Please try signing in again.");
        }

        console.log("🔑 Callback: Profile found, current role:", profile.role);

        // CASE A: User already has a role -> Redirect to dashboard
        if (profile.role === "coach" || profile.role === "student") {
          localStorage.removeItem('pendingAuthRole');
          localStorage.removeItem('pendingAuthIntent');

          if (!profile.timezone) {
            await supabase
              .from("profiles")
              .update({
                timezone: detectBrowserTimezone(),
                updated_at: new Date().toISOString()
              })
              .eq("user_id", session.user.id);
          }

          setState("success");
          setStatusMessage(`Welcome back! Redirecting...`);

          await new Promise(resolve => setTimeout(resolve, 300));

          if (profile.role === "coach") {
            navigate("/dashboard", { replace: true });
          } else {
            navigate("/app", { replace: true });
          }
          return;
        }

        // CASE B: Role is NULL - try to set from URL/localStorage params
        if (initialRole) {
          console.log(`🔑 Callback: Setting role from params: ${initialRole}`);
          await handleRoleSelection(initialRole);
          return;
        }

        // CASE C: No role and no params - show role selection UI
        console.log("🔑 Callback: No role found, showing role selection");
        setState("select_role");

      } catch (err: unknown) {
        console.error("🔑 Callback: Error:", err);
        localStorage.removeItem('pendingAuthRole');
        localStorage.removeItem('pendingAuthIntent');
        setState("error");
        setError(err instanceof Error ? err.message : "Authentication failed. Please try again.");
      }
    };

    handleCallback();
  }, [navigate, intent, initialRole, toast]);

  const handleRetry = () => {
    navigate("/", { replace: true });
  };

  // Error state
  if (state === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-elevated border border-border p-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Setup Failed</h2>
                <p className="text-sm text-muted-foreground mt-2">{error}</p>
              </div>
              <div className="pt-4">
                <Button onClick={handleRetry} className="w-full gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Role selection state - show buttons directly
  if (state === "select_role") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-elevated border border-border p-8">
            <div className="text-center space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">One More Step!</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Select your role to complete setup
                </p>
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
                    <span className="font-medium text-foreground block">Coach</span>
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
                    <span className="font-medium text-foreground block">Student</span>
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

  // Processing/Setting role state
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
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                selectedRole === "coach"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
              }`}>
                {selectedRole === "coach" ? "Coach Account" : "Student Account"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
