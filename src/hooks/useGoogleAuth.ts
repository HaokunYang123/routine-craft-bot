import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useGoogleAuth() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const signInWithGoogle = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const { data, error: authError } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    // No hd parameter = allow any Google account (personal or business)
                    scopes: "profile email",
                    redirectTo: `${window.location.origin}`,
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
