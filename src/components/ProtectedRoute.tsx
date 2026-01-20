import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type UserRole = "coach" | "student";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setRoleLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (data?.role) {
        setRole(data.role as UserRole);
      }
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
    // If role is not loaded yet or doesn't exist, redirect to home
    if (!role) {
      return <Navigate to="/" replace />;
    }
    // Redirect to appropriate dashboard if role doesn't match
    if (role !== requiredRole) {
      if (role === "student") {
        return <Navigate to="/app" replace />;
      } else if (role === "coach") {
        return <Navigate to="/dashboard" replace />;
      }
    }
  }

  return <>{children}</>;
}

