import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, Loader2 } from "lucide-react";
import { RoleSelection } from "@/components/auth/RoleSelection";

const Auth = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if user is already logged in and redirect to their dashboard
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // Fetch profile to determine role
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", session.user.id)
          .single();

        if (profile?.role === "coach") {
          navigate("/dashboard", { replace: true });
        } else if (profile?.role === "student") {
          navigate("/app", { replace: true });
        }
      }
      setChecking(false);
    };

    checkSession();
  }, [navigate]);

  // Show loading while checking session
  if (checking) {
    return (
      <div className="min-h-screen gradient-subtle flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
            <h1 className="text-2xl font-semibold text-foreground">Welcome to TeachCoachConnect</h1>
            <p className="text-sm text-muted-foreground mt-1">Task Management for Students & Coaches</p>
          </div>

          {/* Role Selection */}
          <RoleSelection />
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
