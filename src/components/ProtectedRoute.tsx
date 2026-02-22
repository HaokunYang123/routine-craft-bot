import { useEffect, useState, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type UserRole = "coach" | "student" | "parent";

// Retry configuration for role fetch (handles race condition after signup)
const MAX_ROLE_RETRIES = 5;
const ROLE_RETRY_DELAY_MS = 400;

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [roleNotFound, setRoleNotFound] = useState(false);
  const retryCountRef = useRef(0);

  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setRoleLoading(false);
        return;
      }

      // Reset retry count on new user
      retryCountRef.current = 0;

      while (retryCountRef.current < MAX_ROLE_RETRIES) {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (data?.role) {
          setRole(data.role as UserRole);
          setRoleLoading(false);
          return;
        }

        // Role is NULL - might be race condition after signup
        retryCountRef.current++;
        if (retryCountRef.current < MAX_ROLE_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, ROLE_RETRY_DELAY_MS));
        }
      }

      // After all retries, role is still NULL
      setRoleNotFound(true);
      setRoleLoading(false);
    }

    if (user) {
      fetchRole();
    } else if (!authLoading) {
      setRoleLoading(false);
    }
  }, [user, authLoading]);

  // Show loading while checking auth or role
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in - redirect to auth
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Role check if required
  if (requiredRole) {
    // If role is still not found after retries, send to onboarding
    if (roleNotFound || role == null) {
      return <Navigate to="/onboarding" replace />;
    }
    // Redirect to appropriate dashboard if role doesn't match
    if (role !== requiredRole) {
      if (role === "student") {
        return <Navigate to="/app" replace />;
      } else if (role === "coach") {
        return <Navigate to="/dashboard" replace />;
      } else if (role === "parent") {
        return <Navigate to="/parent" replace />;
      }
    }
  }

  return <>{children}</>;
}
