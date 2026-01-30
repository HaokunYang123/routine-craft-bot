import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, Loader2 } from "lucide-react";
import { RoleSelection } from "@/components/auth/RoleSelection";
import { LoginOptions } from "@/components/auth/LoginOptions";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  // Determine which view to show based on path
  const path = location.pathname;
  const isCoachLogin = path === "/login/coach";
  const isStudentLogin = path === "/login/student";
  const showLoginOptions = isCoachLogin || isStudentLogin;

  useEffect(() => {
    const checkSession = async () => {
      console.log("🕵️ STAFF DEBUG: Starting Session Check...");

      // 1. Check raw session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) console.error("🕵️ STAFF DEBUG: Auth Error", error);

      if (session) {
        console.log("🕵️ STAFF DEBUG: Session FOUND for User ID:", session.user.id);
        console.log("🕵️ STAFF DEBUG: Email:", session.user.email);

        // 2. Check what the DB actually has for this user
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle(); // Use maybeSingle to avoid 406 errors if empty

        console.log("🕵️ STAFF DEBUG: DB Profile Result:", profile);

        if (profileError) {
             console.error("🕵️ STAFF DEBUG: DB Error:", profileError);
        }

        if (profile?.role === "coach") {
          console.log("🕵️ STAFF DEBUG: Redirecting to Coach...");
          navigate("/dashboard", { replace: true });
        } else if (profile?.role === "student") {
          console.log("🕵️ STAFF DEBUG: Redirecting to Student...");
          navigate("/app", { replace: true });
        } else {
           console.log("🕵️ STAFF DEBUG: No Role found (Clean State). Staying on Auth page.");
        }
      } else {
        console.log("🕵️ STAFF DEBUG: No Session found. Staying on Auth page.");
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
          {/* Logo and Welcome - only show on role selection */}
          {!showLoginOptions && (
            <>
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center shadow-soft">
                  <GraduationCap className="w-6 h-6 text-primary-foreground" />
                </div>
              </div>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-semibold text-foreground">Welcome to TeachCoachConnect</h1>
                <p className="text-sm text-muted-foreground mt-1">Task Management for Students & Coaches</p>
              </div>
            </>
          )}

          {/* Render based on path */}
          {isCoachLogin ? (
            <LoginOptions role="coach" />
          ) : isStudentLogin ? (
            <LoginOptions role="student" />
          ) : (
            <RoleSelection />
          )}
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
