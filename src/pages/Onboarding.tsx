import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { detectBrowserTimezone } from "@/lib/timezone";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, GraduationCap, School, RefreshCw } from "lucide-react";
import { persistRoleToAuthMetadata } from "@/lib/auth/persistRoleMetadata";

type AuthRole = "coach" | "student";

type OnboardingState = "loading" | "role_picker" | "updating" | "error";

function normalizeRole(value: string | null | undefined): AuthRole | null {
  if (value === "coach" || value === "student") {
    return value;
  }
  return null;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [state, setState] = useState<OnboardingState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const handleRetry = () => {
    setRetryNonce((prev) => prev + 1);
  };

  const redirectForRole = (role: AuthRole) => {
    navigate(role === "coach" ? "/dashboard" : "/app", { replace: true });
  };

  useEffect(() => {
    const loadRole = async () => {
      if (!user) {
        setState("loading");
        return;
      }

      setError(null);
      setErrorDetail(null);
      setState("loading");

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) {
        setError("We couldn’t load your profile.");
        setErrorDetail(profileError.message ?? "Profile fetch failed.");
        setState("error");
        return;
      }

      const role = normalizeRole(data?.role ?? null);

      if (role) {
        redirectForRole(role);
        return;
      }

      setState("role_picker");
    };

    if (!authLoading && user) {
      void loadRole();
    }
  }, [authLoading, user, navigate, retryNonce]);

  const handleRoleSelection = async (role: AuthRole) => {
    if (!user) {
      return;
    }

    setError(null);
    setErrorDetail(null);
    setState("updating");

    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update({
        role,
        timezone: detectBrowserTimezone(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .select("role")
      .maybeSingle();

    if (updateError) {
      setError("We couldn’t set your role.");
      setErrorDetail(updateError.message ?? "Profile update failed.");
      setState("error");
      return;
    }

    let confirmedRole = normalizeRole(updatedProfile?.role ?? null);

    if (!confirmedRole) {
      const { data: insertedProfile, error: insertError } = await supabase
        .from("profiles")
        .insert({
          user_id: user.id,
          role,
          timezone: detectBrowserTimezone(),
        })
        .select("role")
        .maybeSingle();

      if (insertError) {
        setError("We couldn’t set your role.");
        setErrorDetail(insertError.message ?? "Profile insert failed.");
        setState("error");
        return;
      }

      confirmedRole = normalizeRole(insertedProfile?.role ?? null);
    }

    if (!confirmedRole) {
      const { data: refreshedProfile, error: refreshError } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (refreshError) {
        setError("We couldn’t confirm your role.");
        setErrorDetail(refreshError.message ?? "Profile re-fetch failed.");
        setState("error");
        return;
      }

      confirmedRole = normalizeRole(refreshedProfile?.role ?? null);
    }

    if (!confirmedRole) {
      setError("We couldn’t confirm your role.");
      setErrorDetail("Role update did not persist.");
      setState("error");
      return;
    }

    await persistRoleToAuthMetadata({ role: confirmedRole, source: "onboarding" });

    redirectForRole(confirmedRole);
  };

  if (!authLoading && !user) {
    return <Navigate to="/" replace />;
  }

  if (authLoading || state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
                <h2 className="text-xl font-semibold text-foreground">Setup needs attention</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  {error ?? "We couldn’t complete setup. Please try again."}
                </p>
              </div>
              {errorDetail && (
                <details className="text-left text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                  <summary className="cursor-pointer font-medium text-foreground">Error details</summary>
                  <p className="mt-2 break-words">{errorDetail}</p>
                </details>
              )}
              <div className="pt-2">
                <Button onClick={handleRetry} className="w-full gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Retry
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
          <div className="text-center space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Finish setup</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Select your role to continue.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-32 flex flex-col items-center justify-center gap-3 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                onClick={() => handleRoleSelection("coach")}
                disabled={state === "updating"}
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
                disabled={state === "updating"}
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
            {state === "updating" && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving your role...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
