import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap } from "lucide-react";
import { RoleSelection } from "@/components/auth/RoleSelection";
import { CoachAuth } from "@/components/auth/CoachAuth";
import { StudentAuth } from "@/components/auth/StudentAuth";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if valid session exists on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      // If session exists, we should verify role and redirect (the previous logic handles this globally mostly)
      // But let's check profile to be safe and redirect if already logged in
      if (session) {
        const checkProfile = async () => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("user_id", session.user.id)
            .single();

          if (profile?.role === "coach") navigate("/dashboard");
          else if (profile?.role === "student") navigate("/app");
        };
        checkProfile();
      }
    });
  }, [navigate]);

  const renderContent = () => {
    if (location.pathname === "/login/coach") {
      return <CoachAuth />;
    }
    if (location.pathname === "/login/student") {
      return <StudentAuth />;
    }
    return <RoleSelection />;
  };

  return (
    <div className="min-h-screen gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-elevated border border-border p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center shadow-soft">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <span className="text-2xl font-semibold text-foreground block">TeachCoachConnect</span>
              <span className="text-xs text-muted-foreground">Task Management for Students & Coaches</span>
            </div>
          </div>

          {/* Auth Content */}
          {renderContent()}
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
