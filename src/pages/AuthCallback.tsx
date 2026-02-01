import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, RefreshCw, UserPlus } from "lucide-react";
import { detectBrowserTimezone } from "@/lib/timezone";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type CallbackState =
  | "processing"        // Initial state - exchanging code, fetching profile
  | "setting_role"      // Updating profile with role (signup flow)
  | "success"           // Role confirmed, redirecting
  | "needs_role"        // User logged in but has no role (new user via login)
  | "error";            // Something went wrong

const MAX_PROFILE_RETRIES = 5;
const PROFILE_RETRY_DELAY_MS = 500;

export default function AuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Get intent and role from URL params
  const intent = searchParams.get('intent') as 'signup' | 'login' | null;
  const role = searchParams.get('role') as 'coach' | 'student' | null;

  const [state, setState] = useState<CallbackState>("processing");
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Verifying your sign-in...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Step 1: Get the session (Supabase auto-exchanges the OAuth code)
        console.log("🔑 Callback: Getting session...");
        console.log("🔑 Callback: Intent:", intent, "Role:", role);
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

        // Step 2: Wait for profile to exist (trigger creates it)
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

        // Step 3: Handle based on profile role and intent

        // CASE A: User has a role -> Redirect to appropriate dashboard
        if (profile.role === "coach" || profile.role === "student") {
          // Update timezone if needed
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
            console.log("🔑 Callback: Existing coach, redirecting to dashboard");
            navigate("/dashboard", { replace: true });
          } else {
            console.log("🔑 Callback: Existing student, redirecting to app");
            navigate("/app", { replace: true });
          }
          return;
        }

        // CASE B: Role is NULL - behavior depends on intent

        // B1: Signup intent with role -> Set the role (trigger should have done this, but backup)
        if (intent === "signup" && role) {
          setState("setting_role");
          setStatusMessage(`Setting up your ${role} account...`);
          console.log(`🔑 Callback: Signup intent, setting role to "${role}"...`);

          const { error: updateError } = await supabase
            .from("profiles")
            .update({
              role: role,
              timezone: detectBrowserTimezone(),
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", session.user.id);

          if (updateError) {
            console.error("🔑 Callback: Role update failed:", updateError);
            throw new Error(`Could not set account type to "${role}". Please try again.`);
          }

          console.log("🔑 Callback: Role successfully set to:", role);

          setState("success");
          setStatusMessage(`Welcome! Redirecting to your ${role} dashboard...`);
          await new Promise(resolve => setTimeout(resolve, 300));

          if (role === "coach") {
            navigate("/dashboard", { replace: true });
          } else {
            navigate("/app", { replace: true });
          }
          return;
        }

        // B2: Login intent (or no intent) with NULL role -> New user tried to login
        // Redirect to auth page with a toast message
        console.log("🔑 Callback: Login intent but no role - new user needs to sign up");
        setState("needs_role");

        // Show toast and redirect to auth page
        toast({
          title: "Account Created!",
          description: "Please select if you are a Student or Coach to finish setup.",
          duration: 6000,
        });

        // Small delay so state is visible, then redirect
        await new Promise(resolve => setTimeout(resolve, 500));
        navigate("/", { replace: true });

      } catch (err: unknown) {
        console.error("🔑 Callback: Error:", err);
        setState("error");
        setError(err instanceof Error ? err.message : "Authentication failed. Please try again.");
      }
    };

    handleCallback();
  }, [navigate, intent, role, toast]);

  // Retry handler
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
              <div className="pt-4 space-y-3">
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

  // Needs role state (new user via login)
  if (state === "needs_role") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-elevated border border-border p-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <UserPlus className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Almost Done!</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Your account was created. Redirecting you to select your role...
                </p>
              </div>
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
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
            {role && state === "setting_role" && (
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                role === "coach"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
              }`}>
                {role === "coach" ? "Coach Account" : "Student Account"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
