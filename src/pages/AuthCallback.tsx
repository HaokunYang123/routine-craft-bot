import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { detectBrowserTimezone } from "@/lib/timezone";

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

        // Fetch profile to check current state (role and timezone)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, timezone')
          .eq('user_id', session.user.id)
          .single();

        if (profile) {
          // Build update object for new users (only set fields that are null)
          const updates: { role?: string; timezone?: string } = {};

          // Set role from URL if not already set (AUTH-10 immutability)
          if (role && !profile.role) {
            updates.role = role;
          }

          // Auto-detect and set timezone for new users (TIME-04)
          if (!profile.timezone) {
            updates.timezone = detectBrowserTimezone();
          }

          // Apply updates if any
          if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase
              .from('profiles')
              .update(updates)
              .eq('user_id', session.user.id);

            if (updateError) {
              console.warn('Profile update failed:', updateError);
            }
          }
        }

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

          // Also set timezone on retry if needed
          if (!retryProfile.role || !(retryProfile as any).timezone) {
            const updates: { role?: string; timezone?: string } = {};
            if (role && !retryProfile.role) updates.role = role;
            updates.timezone = detectBrowserTimezone();
            await supabase.from('profiles').update(updates).eq('user_id', session.user.id);
          }

          // Route based on role (use URL role if set, else profile role)
          const effectiveRole = role || retryProfile.role;
          if (effectiveRole === 'coach') {
            navigate('/dashboard', { replace: true });
          } else {
            navigate('/app', { replace: true });
          }
          return;
        }

        // Route based on role (use URL role if we just set it, else existing profile role)
        const effectiveRole = (role && !profile.role) ? role : profile.role;
        if (effectiveRole === 'coach') {
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
