import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { FallbackProps } from "react-error-boundary";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { RefreshCw, Home, LogOut } from "lucide-react";

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Logout error:", err);
      // Force navigation even if signOut fails
      navigate("/", { replace: true });
    }
  };

  const handleGoHome = () => {
    navigate("/", { replace: true });
  };

  return (
    <div
      role="alert"
      className={cn(
        "flex min-h-[300px] flex-col items-center justify-center gap-6 p-6",
        "rounded-lg bg-background text-foreground shadow-lg"
      )}
    >
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
        <p className="text-muted-foreground">
          We encountered an unexpected error. Please try again or log out to reset.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={resetErrorBoundary} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
        <Button variant="outline" onClick={handleGoHome} className="gap-2">
          <Home className="w-4 h-4" />
          Go Home
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
  );
}
