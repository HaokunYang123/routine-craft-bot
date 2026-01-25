import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Detect session expiry (when silent token refresh fails)
        if (event === 'SIGNED_OUT') {
          // Only show modal if this wasn't triggered by explicit signout
          // (explicit signout navigates away, so sessionExpired state won't matter)
          setSessionExpired(true);
        } else if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          // Clear expiry state on successful refresh or sign-in
          setSessionExpired(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    // Navigate first to prevent session expiry modal from showing
    navigate("/");
    await supabase.auth.signOut();
  };

  const clearSessionExpired = () => setSessionExpired(false);

  return { user, session, loading, signOut, sessionExpired, clearSessionExpired };
}
