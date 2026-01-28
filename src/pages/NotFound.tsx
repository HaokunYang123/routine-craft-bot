import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { handleError } from "@/lib/error";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Home, LogOut } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    handleError(new Error(`404 - Route not found: ${location.pathname}`), {
      component: 'NotFound',
      action: 'navigate to non-existent route',
      silent: true
    });
  }, [location.pathname]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
      // Force navigation even if signOut fails
      navigate("/", { replace: true });
    }
  };

  const handleGoHome = async () => {
    // Check if user is logged in and go to appropriate dashboard
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (profile?.role === "coach") {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/app", { replace: true });
      }
    } else {
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <div className="text-center max-w-md">
        <h1 className="mb-2 text-6xl font-bold text-muted-foreground">404</h1>
        <h2 className="mb-4 text-xl font-semibold text-foreground">Page Not Found</h2>
        <p className="mb-8 text-muted-foreground">
          We couldn't find what you were looking for.
          The page may have moved or doesn't exist.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={handleGoHome} className="gap-2">
            <Home className="w-4 h-4" />
            Go to Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            {isLoggingOut ? "Logging out..." : "Log Out"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
