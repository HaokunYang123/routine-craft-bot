import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useGoogleAuth() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const signInWithGoogle = useCallback(async (role: 'coach' | 'student') => {
        setLoading(true);
        setError(null);

        try {
            // CRITICAL: Pass role in data so database trigger can read it from raw_user_meta_data
            const { data, error: authError } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    // Pass role in data for database trigger
                    data: {
                        role: role,
                    },
                    // No hd parameter = allow any Google account (personal or business)
                    scopes: "profile email",
                    redirectTo: `${window.location.origin}/auth/callback?role=${role}`,
                    queryParams: {
                        access_type: "offline",
                        prompt: "consent",
                    },
                },
            });

            if (authError) {
                throw new Error(authError.message);
            }

            // OAuth redirects, so we won't get here unless something went wrong
            return data;
        } catch (err: any) {
            const errorMessage = err.message || "Google sign-in failed";
            setError(errorMessage);
            setLoading(false);
            return null;
        }
    }, []);

    return {
        loading,
        error,
        signInWithGoogle,
        clearError: () => setError(null),
    };
}
