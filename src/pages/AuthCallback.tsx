import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') as 'coach' | 'student' | null;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase handles the OAuth code exchange automatically
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          // Auth failed - redirect to home
          navigate('/', { replace: true });
          return;
        }

        // Set role from URL on the profile created by trigger (which has role=null)
        // This is the ONLY place role gets set - supports AUTH-10 immutability
        // (role cannot be CHANGED once set, but CAN be SET once from null)
        if (role) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ role })
            .eq('user_id', session.user.id)
            .is('role', null);  // Only set if null (not already set)

          if (updateError) {
            console.warn('Role update failed (may already be set):', updateError);
          }
        }

        // Fetch profile to determine where to route
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        if (profileError || !profile) {
          // Profile doesn't exist yet - retry once after short delay
          await new Promise(resolve => setTimeout(resolve, 500));
          const { data: retryProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', session.user.id)
            .single();

          if (!retryProfile) {
            setError('Profile setup failed. Please try again.');
            return;
          }

          // Route based on retried profile
          if (retryProfile.role === 'coach') {
            navigate('/dashboard', { replace: true });
          } else {
            navigate('/app', { replace: true });
          }
          return;
        }

        // Route based on role
        if (profile.role === 'coach') {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/app', { replace: true });
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('Authentication failed. Please try again.');
      }
    };

    handleCallback();
  }, [navigate, role]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error}</p>
          <a href="/" className="text-primary underline">Return to Home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Setting up your account...</p>
      </div>
    </div>
  );
}
